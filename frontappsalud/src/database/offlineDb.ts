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
  }>;
}

export interface SyncQueueItem {
  id?: number;
  tipo: 'EN_CAMINO' | 'CHECK_IN' | 'CHECK_OUT' | 'FICHA_CLINICA' | 'SOLICITUD_CONTINUIDAD';
  visita_id: string;
  data: any;
  timestamp: number;
}

class ClinicaOfflineDB extends Dexie {
  visitas!: Table<LocalVisita>;
  plantillas!: Table<LocalPlantilla>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('ClinicaOfflineDB');
    this.version(1).stores({
      visitas: 'id, hora, estado',
      plantillas: 'id, codigo',
      syncQueue: '++id, tipo, visita_id, timestamp'
    });
  }
}

export const db = new ClinicaOfflineDB();
export default db;
