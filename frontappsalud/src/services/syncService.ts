import { db, LocalVisita, LocalPlantilla, SyncQueueItem } from '../database/offlineDb';

// backend-p1-salud (el backend oficial, con auth/auditoría). 10.0.2.2 es el loopback
// al localhost del host desde el emulador de Android; para dispositivo físico o iOS
// hay que apuntarlo a la IP real de la máquina que corre el backend.
export const API_BASE_URL = 'http://10.0.2.2:3000';

// Identidad de modo mock (AUTH_MODE=mock en backend-p1-salud). Debe coincidir con el
// identity_user_id que crea `npm run seed` (ver backend-p1-salud/src/database/seed.ts).
// Esto NO es login real: reemplazar por Keycloak cuando se implemente el login de la app.
export const MOCK_IDENTITY_USER_ID = 'seed-profesional-terreno-01';

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    'x-identity-user-id': MOCK_IDENTITY_USER_ID,
    ...extra,
  };
}

function hoyISO(): string {
  return new Date().toISOString().slice(0, 10);
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
    prestacion: row.prestacion ?? '',
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

export const syncService = {

  /**
   * 1. Descarga el itinerario de hoy y las plantillas de fichas desde backend-p1-salud
   * y las guarda en la base de datos local (IndexedDB).
   */
  descargarDatosDelDia: async (): Promise<{ visitas: number; plantillas: number; profesional: { nombres: string; apellidos: string } | null }> => {
    try {
      const fecha = hoyISO();

      // El backend auto-filtra por el profesional autenticado (rol PROFESIONAL), no
      // hace falta pasar profesionalId.
      const responseVisitas = await fetch(`${API_BASE_URL}/visitas/calendario?desde=${fecha}&hasta=${fecha}`, {
        headers: authHeaders(),
      });
      if (!responseVisitas.ok) throw new Error('Error al descargar visitas del servidor');
      const filasVisitas: any[] = await responseVisitas.json();
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
            }));
          return { id: p.id, codigo: p.codigo, nombre: p.nombre, campos };
        }),
      );

      // Guardar en base de datos local (Sobrescribe / Actualiza registros)
      await db.visitas.clear();
      await db.visitas.bulkPut(apiVisitas);

      await db.plantillas.clear();
      await db.plantillas.bulkPut(apiPlantillas);

      return {
        visitas: apiVisitas.length,
        plantillas: apiPlantillas.length,
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
    const queue = await db.syncQueue.toArray();
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
          if (!checkpointRes.ok) { fallidos++; continue; }

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
          if (!estadoRes.ok) { fallidos++; continue; }
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
          if (!fichaRes.ok) { fallidos++; continue; }
          const fichaCreada = await fichaRes.json();

          // La foto se sube recién ahora, referenciando la ficha ya creada (a
          // diferencia de appBack, que primero subía la foto y luego la embebía como
          // URL en la ficha).
          if (item.data?.fotoLocalUri) {
            const mimeType: string = item.data?.fotoMimeType || 'image/jpeg';
            const extension = mimeType.split('/')[1] || 'jpg';
            const formDataObj = new FormData();
            formDataObj.append('fichaClinicaId', fichaCreada.id);
            formDataObj.append('categoria', 'FOTO_CLINICA');
            formDataObj.append('file', {
              uri: item.data.fotoLocalUri,
              name: `photo-${Date.now()}.${extension}`,
              type: mimeType,
            } as any);

            const adjuntoRes = await fetch(`${API_BASE_URL}/documentos-adjuntos`, {
              method: 'POST',
              headers: authHeaders(),
              body: formDataObj,
            });
            if (!adjuntoRes.ok) { fallidos++; continue; }
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
          if (!alertaRes.ok) { fallidos++; continue; }
        }

        // Si el servidor confirma la recepción, lo eliminamos de la cola local
        await db.syncQueue.delete(item.id!);
        procesados++;
      } catch (error) {
        console.error(`Fallo de red al intentar sincronizar registro id: ${item.id}`, error);
        fallidos++;
        // Si hay un fallo de red general, rompemos el ciclo para evitar reintentar en bucle inútilmente
        break;
      }
    }

    return { procesados, fallidos };
  }
};
export default syncService;
