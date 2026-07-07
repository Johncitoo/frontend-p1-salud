/**
 * Reproduce y verifica el fix del bug: fake-indexeddb (usado en indexedDbPolyfill.ts
 * porque React Native no tiene IndexedDB real) guarda todo en memoria del proceso —
 * un reinicio de la app (crash, force-stop, Fast Refresh) pierde silenciosamente
 * toda la cola offline (fichas clínicas, check-in/out sin sincronizar).
 *
 * Simula un "reinicio real": jest.resetModules() + borrar globalThis.indexedDB
 * fuerza una instancia de fake-indexeddb totalmente nueva y vacía (igual que un
 * proceso de app nuevo), mientras que el "disco" (mockFileStore, reemplazando a
 * expo-file-system) sí sobrevive — igual que en un dispositivo real.
 */

// mockFileStore: el prefijo "mock" es obligatorio para que el hoist de Jest permita
// referenciar esta variable de módulo dentro del factory de jest.mock().
let mockFileStore: Record<string, string> = {};

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///fake-docs/',
  writeAsStringAsync: jest.fn(async (path: string, content: string) => {
    mockFileStore[path] = content;
  }),
  readAsStringAsync: jest.fn(async (path: string) => {
    if (!(path in mockFileStore)) throw new Error(`ENOENT: ${path}`);
    return mockFileStore[path];
  }),
  getInfoAsync: jest.fn(async (path: string) => ({ exists: path in mockFileStore })),
  deleteAsync: jest.fn(async (path: string) => {
    delete mockFileStore[path];
  }),
}));

function bootApp() {
  require('./indexedDbPolyfill');
  const { db } = require('./offlineDb');
  const persistence = require('./offlineDbPersistence');
  return { db, hydrateFromSnapshot: persistence.hydrateFromSnapshot, clearSnapshot: persistence.clearSnapshot };
}

function simulateAppRestart() {
  jest.resetModules();
  delete (globalThis as any).indexedDB;
  delete (globalThis as any).IDBKeyRange;
}

const waitForDebouncedPersist = () => new Promise(resolve => setTimeout(resolve, 400));

const visitaDePrueba = {
  id: 'v1',
  pacienteId: 'p1',
  hora: '09:00',
  estado: 'EN_ATENCION',
  prioridad: 'NORMAL',
  paciente: { nombres: 'Pedro', apellidos: 'Marmol', rut: '19000001-K' },
  direccion: { calle: 'Los Aromos', numero: '123', comuna: 'Ñuñoa' },
  prestacion: 'Control general',
};

describe('persistencia offline de fake-indexeddb', () => {
  beforeEach(() => {
    mockFileStore = {};
    simulateAppRestart();
  });

  it('reproduce el bug: sin el fix, "reiniciar la app" pierde la cola offline', async () => {
    const { db } = bootApp();

    await db.syncQueue.add({ tipo: 'CHECK_IN', visita_id: 'v1', data: {}, timestamp: Date.now() });
    expect(await db.syncQueue.count()).toBe(1);

    // "Reiniciar la app": nueva instancia de fake-indexeddb (vacía), SIN restaurar snapshot.
    simulateAppRestart();
    const { db: dbTrasReinicio } = bootApp();

    expect(await dbTrasReinicio.syncQueue.count()).toBe(0);
  });

  it('con el fix: hydrateFromSnapshot restaura la cola completa tras un reinicio', async () => {
    const { db } = bootApp();

    await db.visitas.put(visitaDePrueba);
    await db.syncQueue.add({
      tipo: 'FICHA_CLINICA',
      visita_id: 'v1',
      data: { observaciones: 'Paciente estable', fotoLocalUri: 'file:///foto.jpg' },
      timestamp: 12345,
    });

    await waitForDebouncedPersist();

    simulateAppRestart();
    const { db: dbTrasReinicio, hydrateFromSnapshot } = bootApp();

    // Recién arrancado, antes de hidratar: vacío (fake-indexeddb fresco).
    expect(await dbTrasReinicio.syncQueue.count()).toBe(0);
    expect(await dbTrasReinicio.visitas.count()).toBe(0);

    await hydrateFromSnapshot();

    const colaRestaurada = await dbTrasReinicio.syncQueue.toArray();
    expect(colaRestaurada).toHaveLength(1);
    expect(colaRestaurada[0]).toMatchObject({
      tipo: 'FICHA_CLINICA',
      visita_id: 'v1',
      data: { observaciones: 'Paciente estable', fotoLocalUri: 'file:///foto.jpg' },
    });

    const visitaRestaurada = await dbTrasReinicio.visitas.get('v1');
    expect(visitaRestaurada?.estado).toBe('EN_ATENCION');
    expect(visitaRestaurada?.paciente.nombres).toBe('Pedro');
  });

  it('sobrevive múltiples reinicios seguidos (no solo el primero)', async () => {
    const { db } = bootApp();
    await db.syncQueue.add({ tipo: 'CHECK_IN', visita_id: 'v1', data: {}, timestamp: 1 });
    await waitForDebouncedPersist();

    simulateAppRestart();
    let { db: dbActual, hydrateFromSnapshot } = bootApp();
    await hydrateFromSnapshot();
    expect(await dbActual.syncQueue.count()).toBe(1);

    // Un segundo reinicio (ej. dos crashes seguidos) también debe restaurar bien.
    simulateAppRestart();
    ({ db: dbActual, hydrateFromSnapshot } = bootApp());
    await hydrateFromSnapshot();
    expect(await dbActual.syncQueue.count()).toBe(1);
  });

  it('clearSnapshot evita que "Limpiar Almacenamiento Local" resucite datos ya borrados', async () => {
    const { db, clearSnapshot } = bootApp();
    await db.syncQueue.add({ tipo: 'CHECK_IN', visita_id: 'v1', data: {}, timestamp: 1 });
    await waitForDebouncedPersist();

    // Replica el flujo real de SettingsScreen.handleClearDatabase: Table.clear() no
    // dispara los hooks de persistencia, así que hace falta el clearSnapshot() explícito.
    await db.syncQueue.clear();
    await clearSnapshot();

    simulateAppRestart();
    const { db: dbTrasReinicio, hydrateFromSnapshot } = bootApp();
    await hydrateFromSnapshot();

    expect(await dbTrasReinicio.syncQueue.count()).toBe(0);
  });

  it('sin clearSnapshot, un Table.clear() suelto SÍ resucita datos borrados (regresión a evitar)', async () => {
    const { db } = bootApp();
    await db.syncQueue.add({ tipo: 'CHECK_IN', visita_id: 'v1', data: {}, timestamp: 1 });
    await waitForDebouncedPersist();

    // Deliberadamente NO se llama a clearSnapshot() acá, para documentar por qué es necesario.
    await db.syncQueue.clear();

    simulateAppRestart();
    const { db: dbTrasReinicio, hydrateFromSnapshot } = bootApp();
    await hydrateFromSnapshot();

    expect(await dbTrasReinicio.syncQueue.count()).toBe(1); // el snapshot viejo "resucita" el dato
  });
});
