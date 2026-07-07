import Dexie, { type Table } from 'dexie';

export interface LocalVisita {
  id: string;
  pacienteId: string;
  hora: string;
  estado: string;
  prioridad: string;
  paciente: {
    nombres: string;
    apellidos: string;
    rut: string;
  };
  direccion: {
    calle: string;
    numero: string;
    comuna: string;
  };
  prestacion: string;
  fichaClinicaId?: string;
}

export interface LocalPlantilla {
  id: string;
  codigo: string;
  nombre: string;
  campos: Array<{
    codigo: string;
    etiqueta: string;
    tipo: 'TEXTO_LIBRE' | 'NUMERO_LIBRE' | 'BOOLEANO' | 'SELECT';
    obligatorio: boolean;
    placeholder?: string;
    opciones?: string[];
    // Código de la variable clínica subyacente (solo si el campo es tipo
    // VARIABLE_CLINICA). Permite mapear el campo a una lectura de sensor IoT
    // (ver IOT_VARIABLE_MAP en el backend) sin depender del código local del
    // campo, que puede ser arbitrario según cómo lo configuró el coordinador.
    variableCodigo?: string;
  }>;
}

export interface LocalMedicamentoCatalogo {
  id: string;
  nombre: string;
  presentacion?: string | null;
}

export interface SyncQueueItem {
  id?: number;
  tipo: 'EN_CAMINO' | 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA' | 'SOLICITUD_CONTINUIDAD' | 'DIAGNOSTICO' | 'MEDICAMENTO';
  visita_id: string;
  data: any;
  timestamp: number;
}

class ClinicaOfflineDB extends Dexie {
  visitas!: Table<LocalVisita>;
  plantillas!: Table<LocalPlantilla>;
  syncQueue!: Table<SyncQueueItem>;
  catalogoMedicamentos!: Table<LocalMedicamentoCatalogo>;

  constructor() {
    super('ClinicaOfflineDB');
    this.version(1).stores({
      visitas: 'id, hora, estado',
      plantillas: 'id, codigo',
      syncQueue: '++id, tipo, visita_id, timestamp'
    });
    // v2: catálogo de medicamentos (para el selector de la pestaña Historial),
    // descargado junto con el resto de datos del día y usado offline-first.
    this.version(2).stores({
      visitas: 'id, hora, estado',
      plantillas: 'id, codigo',
      syncQueue: '++id, tipo, visita_id, timestamp',
      catalogoMedicamentos: 'id, nombre',
    });
  }
}

export const db = new ClinicaOfflineDB();
export default db;
