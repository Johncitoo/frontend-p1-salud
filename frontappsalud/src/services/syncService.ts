import { db, LocalVisita, LocalPlantilla, LocalMedicamentoCatalogo, SyncQueueItem } from '../database/offlineDb';
import * as FileSystem from 'expo-file-system/legacy';
import { getCurrentAccessToken } from './keycloakAuth';

// backend-p1-salud (el backend oficial, con auth/auditoría). Se lee de la variable
// de entorno EXPO_PUBLIC_API_URL (ver .env / .env.example) en vez de hardcodearse,
// para poder cambiar de emulador a dispositivo físico sin tocar código.
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

// Modo de autenticación contra backend-p1-salud: 'mock' o 'keycloak' (debe coincidir
// con AUTH_MODE del backend). Ver .env / .env.example.
export const AUTH_MODE = process.env.EXPO_PUBLIC_AUTH_MODE ?? 'mock';

// Identidad de modo mock (AUTH_MODE=mock en backend-p1-salud). Debe coincidir con el
// identity_user_id que crea `npm run seed` (ver backend-p1-salud/src/database/seed.ts).
// Esto NO es login real: reemplazar por Keycloak cuando se implemente el login de la app.
export const MOCK_IDENTITY_USER_ID = process.env.EXPO_PUBLIC_MOCK_IDENTITY_USER_ID ?? 'seed-profesional-terreno-01';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  if (AUTH_MODE === 'keycloak') {
    const token = getCurrentAccessToken();
    if (!token) {
      throw new Error(
        'EXPO_PUBLIC_AUTH_MODE=keycloak pero no hay una sesión activa (no se ha hecho login todavía).'
      );
    }
    return {
      Authorization: `Bearer ${token}`,
      ...extra,
    };
  }

  return {
    'x-identity-user-id': MOCK_IDENTITY_USER_ID,
    ...extra,
  };
}

function hoyISO(): string {
  // OJO: no usar toISOString() aquí, devuelve la fecha en UTC. Cerca de
  // medianoche eso hace que "hoy" salte al día siguiente antes de tiempo
  // según la zona horaria del dispositivo, y la app deja de mostrar
  // visitas que sí son de hoy en hora local.
  const ahora = new Date();
  const anio = ahora.getFullYear();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const dia = String(ahora.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

// Aplana la fila de GET /visitas/calendario (nombres de paciente sueltos, dirección
// concatenada) al shape LocalVisita que usa el resto de la app.
function mapVisitaCalendario(row: any): LocalVisita {
  return {
    id: row.id,
    pacienteId: row.pacienteId,
    hora: row.horaProgramada,
    estado: row.estado,
    prioridad: row.prioridad,
    paciente: {
      nombres: row.pacienteNombres ?? '',
      apellidos: row.pacienteApellidos ?? '',
      rut: row.pacienteRut ?? '',
    },
    direccion: {
      calle: row.direccionDetallada ?? row.pacienteDireccion ?? '',
      numero: '',
      comuna: '',
    },
    // GET /visitas/calendario nunca manda un campo `prestacion` singular (solo
    // el array `prestaciones`, ver backend-p1-salud/src/visitas/visitas.service.ts)
    // — antes esto quedaba siempre vacío ("") en mensajes como el de continuidad.
    prestacion: Array.isArray(row.prestaciones)
      ? row.prestaciones.map((p: any) => p?.nombre).filter(Boolean).join(', ')
      : '',
    fichaClinicaId: row.fichaClinicaId ?? undefined,
  };
}

type TipoCampoLocal = LocalPlantilla['campos'][number]['tipo'];

const TIPO_CAMPO_MAP: Record<string, TipoCampoLocal> = {
  TEXTO_LIBRE: 'TEXTO_LIBRE',
  NUMERO_LIBRE: 'NUMERO_LIBRE',
  BOOLEANO: 'BOOLEANO',
  SELECT: 'SELECT',
  MULTISELECT: 'SELECT',
};

// backend-p1-salud no aplana el tipo de campo para el cliente móvil (a diferencia de
// appBack), así que replicamos ese aplanado acá: resolvemos VARIABLE_CLINICA contra el
// catálogo de variables clínicas, y colapsamos MULTISELECT -> SELECT.
function resolverTipoCampo(campo: any, variablesPorId: Map<string, any>): TipoCampoLocal {
  if (campo.tipoCampo === 'VARIABLE_CLINICA') {
    const variable = campo.variableClinicaId ? variablesPorId.get(campo.variableClinicaId) : undefined;
    if (variable?.tipoDato === 'NUMERO') return 'NUMERO_LIBRE';
    if (variable?.tipoDato === 'BOOLEANO') return 'BOOLEANO';
    return 'TEXTO_LIBRE';
  }
  return TIPO_CAMPO_MAP[campo.tipoCampo] ?? 'TEXTO_LIBRE';
}

function opcionesComoArray(opciones?: Record<string, unknown> | null): string[] | undefined {
  if (!opciones) return undefined;
  const valores = Object.values(opciones).map(v => String(v ?? '').trim()).filter(Boolean);
  return valores.length > 0 ? valores : undefined;
}

// Evita que dos llamadas a sincronizarRegistrosPendientes corran en paralelo (puede
// pasar porque App.tsx la dispara tanto al encolar un registro nuevo como en un
// intervalo periódico): sin este guard, dos pasadas superpuestas pueden leer la misma
// cola antes de que la primera borre sus items, y la segunda manda un duplicado que
// el backend rechaza con 409 y queda pegado reintentando para siempre.
let sincronizacionEnCurso = false;

// Tras este número de fallos consecutivos, un ítem se saca de la cola activa
// (requiereRevision = true) en vez de seguir reintentándose para siempre.
const MAX_INTENTOS_SYNC = 3;

// Registra un fallo de sincronización en el ítem (no lo borra: solo lo deja listo
// para reintentar en la próxima pasada, o en cuarentena si ya agotó sus intentos).
// El sync corre cada 20s (ver App.tsx) mientras haya cola pendiente: un corte real
// de señal a mitad de una pasada no es culpa del ítem (todos fallarían igual), así
// que no debe consumir su presupuesto de intentos ni quedar marcado como corrupto.
function esErrorDeRed(error: unknown): boolean {
  const mensaje = error instanceof Error ? error.message : String(error);
  return /network|fetch|conexi[oó]n|internet/i.test(mensaje);
}

async function registrarFalloItem(item: SyncQueueItem, motivo: string): Promise<void> {
  const intentos = (item.intentos ?? 0) + 1;
  const requiereRevision = intentos >= MAX_INTENTOS_SYNC;
  await db.syncQueue.update(item.id!, { intentos, requiereRevision, ultimoError: motivo });
  if (requiereRevision) {
    console.error(
      `[SYNC] Ítem ${item.id} (${item.tipo}, visita ${item.visita_id}) alcanzó ${intentos} intentos fallidos ` +
      `y se saca de la cola activa (requiere revisión manual). Último error: ${motivo}`
    );
  }
}

export const syncService = {

  /**
   * 1. Descarga el itinerario de hoy y las plantillas de fichas desde backend-p1-salud
   * y las guarda en la base de datos local (IndexedDB).
   */
  descargarDatosDelDia: async (): Promise<{ visitas: number; plantillas: number; catalogoMedicamentos: number; profesional: { nombres: string; apellidos: string } | null }> => {
    try {
      const fecha = hoyISO();

      // El backend auto-filtra por el profesional autenticado (rol PROFESIONAL), no
      // hace falta pasar profesionalId.
      const responseVisitas = await fetch(`${API_BASE_URL}/visitas/calendario?desde=${fecha}&hasta=${fecha}`, {
        headers: authHeaders(),
      });
      if (!responseVisitas.ok) throw new Error('Error al descargar visitas del servidor');
      // El endpoint /visitas/calendario devuelve todos los estados (lo necesita
      // la agenda web para mostrar canceladas). Para el itinerario del
      // profesional en terreno no tiene sentido bajar visitas canceladas: no son
      // trabajo pendiente ni hecho, solo ensuciarían la lista.
      const filasVisitas: any[] = (await responseVisitas.json()).filter(
        (row: any) => row.estado !== 'CANCELADA',
      );
      const apiVisitas: LocalVisita[] = filasVisitas.map(mapVisitaCalendario);

      // El nombre del profesional logueado viene gratis en cada fila del itinerario
      // (todas comparten el mismo profesional); no hace falta un endpoint aparte.
      const profesional = filasVisitas[0]
        ? { nombres: filasVisitas[0].profesionalNombres ?? '', apellidos: filasVisitas[0].profesionalApellidos ?? '' }
        : null;

      const responsePlantillas = await fetch(`${API_BASE_URL}/plantillas-ficha`, { headers: authHeaders() });
      if (!responsePlantillas.ok) throw new Error('Error al descargar plantillas de fichas');
      const plantillasBase: any[] = await responsePlantillas.json();

      // Catálogo de variables clínicas, para resolver campos tipo VARIABLE_CLINICA.
      const responseVariables = await fetch(`${API_BASE_URL}/variables-clinicas`, { headers: authHeaders() });
      const variables: any[] = responseVariables.ok ? await responseVariables.json() : [];
      const variablesPorId = new Map(variables.map(v => [v.id, v]));

      const apiPlantillas: LocalPlantilla[] = await Promise.all(
        plantillasBase.map(async (p) => {
          const detalle = await fetch(`${API_BASE_URL}/plantillas-ficha/${p.id}`, { headers: authHeaders() });
          const conCampos = detalle.ok ? await detalle.json() : { ...p, campos: [] };
          const campos = (conCampos.campos ?? [])
            .filter((c: any) => c.activo !== false)
            .sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))
            .map((c: any) => ({
              codigo: c.codigoCampo,
              etiqueta: c.etiqueta,
              tipo: resolverTipoCampo(c, variablesPorId),
              obligatorio: !!c.obligatorio,
              placeholder: c.ayudaTexto ?? undefined,
              opciones: opcionesComoArray(c.opciones),
              variableCodigo: c.tipoCampo === 'VARIABLE_CLINICA'
                ? variablesPorId.get(c.variableClinicaId)?.codigo
                : undefined,
            }));
          return { id: p.id, codigo: p.codigo, nombre: p.nombre, campos };
        }),
      );

      // Catálogo de medicamentos, para el selector de la pestaña Historial.
      const responseCatalogo = await fetch(`${API_BASE_URL}/medicamentos/catalogo`, { headers: authHeaders() });
      const catalogoBase: any[] = responseCatalogo.ok ? await responseCatalogo.json() : [];
      const apiCatalogoMedicamentos: LocalMedicamentoCatalogo[] = catalogoBase.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        presentacion: c.presentacion ?? null,
      }));

      // Guardar en base de datos local (Sobrescribe / Actualiza registros)
      await db.visitas.clear();
      await db.visitas.bulkPut(apiVisitas);

      await db.plantillas.clear();
      await db.plantillas.bulkPut(apiPlantillas);

      if (apiCatalogoMedicamentos.length > 0) {
        await db.catalogoMedicamentos.clear();
        await db.catalogoMedicamentos.bulkPut(apiCatalogoMedicamentos);
      }

      return {
        visitas: apiVisitas.length,
        plantillas: apiPlantillas.length,
        catalogoMedicamentos: apiCatalogoMedicamentos.length,
        profesional,
      };
    } catch (error) {
      console.error('Error en descargarDatosDelDia:', error);
      throw error; // Propaga el error para que la UI le avise al usuario
    }
  },

  /**
   * Detalle real de un paciente para la ficha de atención: dirección principal
   * (con referencia de llegada), contacto/cuidador, plan de cuidado vigente e
   * historial de mediciones clínicas. Todo viene de endpoints reales de
   * backend-p1-salud (no hay mock de por medio); si algún dato no existe en el
   * backend para ese paciente, se devuelve null/[] y la UI debe mostrarlo como
   * "no disponible" en vez de inventar un valor.
   */
  obtenerDetallePaciente: async (pacienteId: string) => {
    const [pacienteRes, direccionesRes, contactosRes, planesRes, medicionesRes, variablesRes] = await Promise.all([
      fetch(`${API_BASE_URL}/pacientes/${pacienteId}`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/pacientes/${pacienteId}/direcciones`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/pacientes/${pacienteId}/contactos`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/pacientes/${pacienteId}/planes`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/mediciones-clinicas?pacienteId=${pacienteId}`, { headers: authHeaders() }),
      fetch(`${API_BASE_URL}/variables-clinicas`, { headers: authHeaders() }),
    ]);

    const paciente = pacienteRes.ok ? await pacienteRes.json() : null;
    const direcciones = direccionesRes.ok ? await direccionesRes.json() : [];
    const contactos = contactosRes.ok ? await contactosRes.json() : [];
    const planes = planesRes.ok ? await planesRes.json() : [];
    const mediciones = medicionesRes.ok ? await medicionesRes.json() : [];
    const variables = variablesRes.ok ? await variablesRes.json() : [];
    const variablesPorId = new Map(variables.map((v: any) => [v.id, v]));

    const direccionPrincipal = direcciones.find((d: any) => d.esPrincipal) ?? direcciones[0] ?? null;
    const cuidador = contactos.find((c: any) => c.esEmergencia) ?? contactos[0] ?? null;
    const planCuidado = planes[0] ?? null; // findPlanes ya ordena por createdAt DESC

    const historial = mediciones
      .map((m: any) => {
        const variable: any = variablesPorId.get(m.variableClinicaId);
        const valor = m.valorNumero ?? m.valorTexto ?? (m.valorBoolean !== null && m.valorBoolean !== undefined ? String(m.valorBoolean) : null);
        return {
          fecha: m.fechaMedicion,
          variable: variable?.nombre ?? 'Medición',
          valor: valor !== null ? `${valor}${m.unidad ? ` ${m.unidad}` : ''}` : 'N/A',
        };
      })
      .sort((a: any, b: any) => (a.fecha < b.fecha ? 1 : -1));

    return { paciente, direccionPrincipal, cuidador, planCuidado, historial };
  },

  /**
   * Reclama el kit portátil de sensores IoT (Proyecto 8) para este paciente,
   * y devuelve la última lectura de cada sensor mapeada a códigos de variable
   * clínica (misma convención que IOT_VARIABLE_MAP en el backend), lista para
   * auto-completar los campos de la ficha. Best-effort: si el paciente no
   * tiene conexión o el servicio IoT falla, devuelve {} en vez de lanzar,
   * para no bloquear el flujo de check-in.
   */
  obtenerSignosVitalesIoT: async (pacienteId: string): Promise<Record<string, number>> => {
    try {
      await fetch(`${API_BASE_URL}/iot/paciente-sensores/${pacienteId}/reclamar-kit`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const response = await fetch(`${API_BASE_URL}/iot/paciente-sensores/${pacienteId}/signos-vitales`, {
        headers: authHeaders(),
      });
      if (!response.ok) return {};
      return await response.json();
    } catch (error) {
      console.warn('No se pudieron obtener signos vitales IoT:', error);
      return {};
    }
  },

  /**
   * 2. Guarda el borrador o registro clínico en la base de datos local
   * Si está offline, se encola en la cola de sincronización.
   */
  guardarAtencionLocal: async (tipo: SyncQueueItem['tipo'], visitaId: string, data: any) => {
    try {
      // 1. Guardar en la cola local para sincronizarse después
      await db.syncQueue.add({
        tipo,
        visita_id: visitaId,
        data,
        timestamp: Date.now()
      });

      // 2. Modificar el estado de la visita localmente en IndexedDB para reflejar el cambio en la lista
      const visitaLocal = await db.visitas.get(visitaId);
      if (visitaLocal) {
        let nuevoEstado = visitaLocal.estado;
        if (tipo === 'CHECK_IN') nuevoEstado = 'EN_ATENCION';
        if (tipo === 'CHECK_OUT') nuevoEstado = 'REALIZADA';

        await db.visitas.update(visitaId, { estado: nuevoEstado });
      }
    } catch (error) {
      console.error('Error al guardar atención localmente:', error);
      throw error;
    }
  },

  /**
   * 3. Sube todos los registros encolados a backend-p1-salud.
   * Se ejecuta automáticamente al recuperar conexión a internet.
   */
  sincronizarRegistrosPendientes: async (): Promise<{ procesados: number; fallidos: number }> => {
    if (sincronizacionEnCurso) {
      return { procesados: 0, fallidos: 0 };
    }
    sincronizacionEnCurso = true;

    try {
    // Los ítems en cuarentena (requiereRevision) no se reintentan automáticamente:
    // ya agotaron sus intentos y quedan esperando revisión manual (ver SettingsScreen).
    const queue = (await db.syncQueue.toArray()).filter((item) => !item.requiereRevision);
    let procesados = 0;
    let fallidos = 0;

    for (const item of queue) {
      try {
        if (item.tipo === 'CHECK_IN' || item.tipo === 'CHECK_OUT') {
          // El checkpoint solo deja el registro geo/horario; no mueve el estado de la
          // visita por sí solo, hay que encadenar el PATCH de estado correspondiente.
          const checkpointRes = await fetch(`${API_BASE_URL}/visita-checkpoints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              visitaId: item.visita_id,
              tipo: item.tipo,
              latitud: item.data?.latitud,
              longitud: item.data?.longitud,
              precisionMetros: item.data?.precisionMetros,
              origen: 'OFFLINE_SYNC',
            }),
          });
          if (!checkpointRes.ok) {
            if (checkpointRes.status === 409) {
              // Duplicado: el servidor ya tiene este checkpoint (típicamente por una
              // sincronización concurrente previa). Se trata como ya procesado en vez
              // de reintentarlo para siempre.
              console.warn(`[SYNC] checkpoint ${item.tipo} ya existía en el servidor (409), se descarta el duplicado local.`);
              await db.syncQueue.delete(item.id!);
              procesados++;
              continue;
            }
            const texto = await checkpointRes.text();
            console.error(`[SYNC DEBUG] checkpoint ${item.tipo} falló`, checkpointRes.status, texto);
            fallidos++; await registrarFalloItem(item, `checkpoint ${item.tipo}: HTTP ${checkpointRes.status} ${texto}`); continue;
          }

          const estadoRes = item.tipo === 'CHECK_IN'
            ? await fetch(`${API_BASE_URL}/visitas/${item.visita_id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({ estado: 'EN_ATENCION' }),
              })
            : await fetch(`${API_BASE_URL}/visitas/${item.visita_id}/completar`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders() },
                body: JSON.stringify({}),
              });
          if (!estadoRes.ok) {
            const texto = await estadoRes.text();
            console.error(`[SYNC DEBUG] PATCH estado/completar falló`, estadoRes.status, texto);
            fallidos++; await registrarFalloItem(item, `PATCH estado/completar: HTTP ${estadoRes.status} ${texto}`); continue;
          }
        } else if (item.tipo === 'EN_CAMINO') {
          // Dispara la notificación al paciente de "profesional en camino" (ver
          // VisitasService.cambiarEstado en el backend). No requiere checkpoint.
          const enCaminoRes = await fetch(`${API_BASE_URL}/visitas/${item.visita_id}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({ estado: 'EN_CAMINO' }),
          });
          if (!enCaminoRes.ok) {
            const texto = await enCaminoRes.text();
            console.error(`[SYNC DEBUG] PATCH estado EN_CAMINO falló`, enCaminoRes.status, texto);
            fallidos++; await registrarFalloItem(item, `PATCH estado EN_CAMINO: HTTP ${enCaminoRes.status} ${texto}`); continue;
          }
        } else if (item.tipo === 'FICHA_CLINICA') {
          const fichaRes = await fetch(`${API_BASE_URL}/fichas-clinicas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              visitaId: item.visita_id,
              plantillaFichaId: item.data?.plantillaFichaId,
              contenido: {
                ...item.data?.contenido,
                observaciones: item.data?.observaciones,
                prestacionesRealizadas: item.data?.prestacionesRealizadas,
                conformidad: item.data?.conformidad,
              },
            }),
          });
          let fichaCreada: any;
          if (!fichaRes.ok) {
            if (fichaRes.status === 409) {
              // Duplicado: la visita ya tiene una ficha (típicamente por una
              // sincronización concurrente previa). Recuperamos su id para poder
              // seguir subiendo la foto adjunta en vez de perderla.
              console.warn(`[SYNC] La ficha ya existía para la visita ${item.visita_id} (409), recuperando su id.`);
              const existentesRes = await fetch(`${API_BASE_URL}/fichas-clinicas?visitaId=${item.visita_id}`, { headers: authHeaders() });
              const existentes = existentesRes.ok ? await existentesRes.json() : [];
              if (!existentes[0]) {
                console.error(`[SYNC DEBUG] No se pudo recuperar la ficha existente tras 409 para visita ${item.visita_id}`);
                fallidos++; await registrarFalloItem(item, `409 en /fichas-clinicas pero no se pudo recuperar la ficha existente de la visita ${item.visita_id}`); continue;
              }
              fichaCreada = existentes[0];
            } else {
              const texto = await fichaRes.text();
              console.error(`[SYNC DEBUG] POST /fichas-clinicas falló`, fichaRes.status, texto);
              fallidos++; await registrarFalloItem(item, `POST /fichas-clinicas: HTTP ${fichaRes.status} ${texto}`); continue;
            }
          } else {
            fichaCreada = await fichaRes.json();
          }

          console.warn(`[SYNC DEBUG] Ficha lista para adjuntar foto: id=${fichaCreada?.id} visita=${item.visita_id} tieneFoto=${!!item.data?.fotoLocalUri}`);

          // La foto se sube recién ahora, referenciando la ficha ya creada (a
          // diferencia de appBack, que primero subía la foto y luego la embebía como
          // URL en la ficha).
          if (item.data?.fotoLocalUri) {
            const mimeType: string = item.data?.fotoMimeType || 'image/jpeg';
            // Expo SDK 56 reemplazó el fetch global por su propio runtime ("winter"),
            // que no soporta el patrón clásico de RN `formData.append('file', {uri,...})`
            // para archivos locales (lanza "Unsupported FormDataPart implementation").
            // expo-file-system/legacy hace el multipart de forma nativa, evitando el problema.
            const uploadResult = await FileSystem.uploadAsync(
              `${API_BASE_URL}/documentos-adjuntos`,
              item.data.fotoLocalUri,
              {
                httpMethod: 'POST',
                uploadType: FileSystem.FileSystemUploadType.MULTIPART,
                fieldName: 'file',
                mimeType,
                parameters: {
                  fichaClinicaId: fichaCreada.id,
                  categoria: 'FOTO_CLINICA',
                },
                headers: authHeaders(),
              }
            );
            if (uploadResult.status < 200 || uploadResult.status >= 300) {
              console.error(`[SYNC DEBUG] POST /documentos-adjuntos falló`, uploadResult.status, uploadResult.body);
              fallidos++; await registrarFalloItem(item, `POST /documentos-adjuntos: HTTP ${uploadResult.status} ${uploadResult.body}`); continue;
            }
          }
        } else if (item.tipo === 'SOLICITUD_CONTINUIDAD') {
          const alertaRes = await fetch(`${API_BASE_URL}/alertas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              pacienteId: item.data?.pacienteId,
              visitaId: item.visita_id,
              tipo: 'CONTINUIDAD',
              mensaje: item.data?.mensaje ?? 'Solicitud de continuidad de atención (paciente frágil).',
              prioridad: 'ALTA',
            }),
          });
          if (!alertaRes.ok) {
            const texto = await alertaRes.text();
            console.error(`[SYNC DEBUG] POST /alertas falló`, alertaRes.status, texto);
            fallidos++; await registrarFalloItem(item, `POST /alertas: HTTP ${alertaRes.status} ${texto}`); continue;
          }
        } else if (item.tipo === 'DIAGNOSTICO') {
          // Una visita admite múltiples diagnósticos (a diferencia de la ficha
          // clínica, que backend-p1-salud limita a una por visita).
          const diagnosticoRes = await fetch(`${API_BASE_URL}/diagnosticos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              visitaId: item.visita_id,
              descripcion: item.data?.descripcion,
            }),
          });
          if (!diagnosticoRes.ok) {
            const texto = await diagnosticoRes.text();
            console.error(`[SYNC DEBUG] POST /diagnosticos falló`, diagnosticoRes.status, texto);
            fallidos++; await registrarFalloItem(item, `POST /diagnosticos: HTTP ${diagnosticoRes.status} ${texto}`); continue;
          }
        } else if (item.tipo === 'MEDICAMENTO') {
          const medicamentoRes = await fetch(`${API_BASE_URL}/medicamentos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...authHeaders() },
            body: JSON.stringify({
              visitaId: item.visita_id,
              medicamentoCatalogoId: item.data?.medicamentoCatalogoId,
              cantidadCajas: item.data?.cantidadCajas,
            }),
          });
          if (!medicamentoRes.ok) {
            const texto = await medicamentoRes.text();
            console.error(`[SYNC DEBUG] POST /medicamentos falló`, medicamentoRes.status, texto);
            fallidos++; await registrarFalloItem(item, `POST /medicamentos: HTTP ${medicamentoRes.status} ${texto}`); continue;
          }
        }

        // Si el servidor confirma la recepción, lo eliminamos de la cola local
        await db.syncQueue.delete(item.id!);
        procesados++;
      } catch (error) {
        console.error(`Fallo al intentar sincronizar registro id: ${item.id}`, error);
        fallidos++;
        if (esErrorDeRed(error)) {
          // No es culpa del ítem: no cuenta intento, y seguimos con el resto de la
          // cola (si de verdad no hay señal, las siguientes fallarán rápido igual).
          continue;
        }
        // Dato corrupto del ítem (fecha inválida, archivo ilegible, etc.): cuenta
        // como intento fallido, pero nunca bloquea al resto de la cola detrás de él.
        await registrarFalloItem(item, error instanceof Error ? error.message : String(error));
      }
    }

    return { procesados, fallidos };
    } finally {
      sincronizacionEnCurso = false;
    }
  }
};
export default syncService;
