import { db, LocalVisita, LocalPlantilla } from '../database/offlineDb';

const API_BASE_URL = 'http://192.168.1.13:3000';

export const syncService = {
  
  /**
   * 1. Descarga los datos desde el Backend y los guarda en la base de datos local (IndexedDB)
   * Este proceso se realiza al inicio del día con internet disponible.
   */
  descargarDatosDelDia: async (profesionalId: string): Promise<{ visitas: number; plantillas: number }> => {
    try {
      // Descargar visitas del día para el profesional
      const responseVisitas = await fetch(`${API_BASE_URL}/visitas?profesionalId=${profesionalId}`);
      if (!responseVisitas.ok) throw new Error('Error al descargar visitas del servidor');
      const apiVisitas: LocalVisita[] = await responseVisitas.json();

      // Descargar plantillas de fichas clínicas configuradas en el back
      const responsePlantillas = await fetch(`${API_BASE_URL}/plantillas-ficha`);
      if (!responsePlantillas.ok) throw new Error('Error al descargar plantillas de fichas');
      const apiPlantillas: LocalPlantilla[] = await responsePlantillas.json();

      // Guardar en base de datos local (Sobrescribe / Actualiza registros)
      await db.visitas.clear();
      await db.visitas.bulkPut(apiVisitas);

      await db.plantillas.clear();
      await db.plantillas.bulkPut(apiPlantillas);

      return {
        visitas: apiVisitas.length,
        plantillas: apiPlantillas.length
      };
    } catch (error) {
      console.error('Error en descargarDatosDelDia:', error);
      throw error; // Propaga el error para que la UI le avise al usuario
    }
  },

  /**
   * 2. Guarda el borrador o registro clínico en la base de datos local
   * Si está offline, se encola en la cola de sincronización.
   */
  guardarAtencionLocal: async (tipo: 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA', visitaId: string, data: any) => {
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
   * 3. Sube todos los registros encolados al backend REST API
   * Se ejecuta automáticamente al recuperar conexión a internet.
   */
  sincronizarRegistrosPendientes: async (): Promise<{ procesados: number; fallidos: number }> => {
    const queue = await db.syncQueue.toArray();
    let procesados = 0;
    let fallidos = 0;

    for (const item of queue) {
      try {
        let endpoint = '';
        if (item.tipo === 'CHECK_IN' || item.tipo === 'CHECK_OUT') {
          endpoint = `${API_BASE_URL}/visitas/checkpoint`;
        } else if (item.tipo === 'FICHA_CLINICA') {
          endpoint = `${API_BASE_URL}/fichas-clinicas`;
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            visita_id: item.visita_id,
            tipo: item.tipo,
            data: item.data,
            timestamp: item.timestamp
          }),
        });

        if (response.ok) {
          // Si el servidor confirma la recepción, lo eliminamos de la cola local
          await db.syncQueue.delete(item.id!);
          procesados++;
        } else {
          // El servidor retornó un error (ej. 400, 500), se mantiene en la cola para reintentar
          fallidos++;
        }
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
