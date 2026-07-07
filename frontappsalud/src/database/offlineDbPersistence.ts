import * as FileSystem from 'expo-file-system/legacy';
import { db, LocalVisita, LocalPlantilla, SyncQueueItem } from './offlineDb';

// =========================================================
// Bug: fake-indexeddb (usado por indexedDbPolyfill.ts porque React Native no
// tiene IndexedDB real) guarda todo en memoria del proceso JS — no persiste en
// disco. Cualquier reinicio de la app (crash, force-stop, Fast Refresh de Metro
// en dev) borra silenciosamente toda la cola offline sin avisar al usuario.
//
// Flujo donde ocurre: cualquier dato guardado vía syncService.guardarAtencionLocal
// (check-in/out, ficha clínica, solicitud de continuidad) o descargarDatosDelDia
// (visitas/plantillas del día) vive únicamente en `db` (Dexie sobre fake-indexeddb).
// Si el proceso muere antes de sincronizar, ese trabajo clínico se pierde.
//
// Solución: en vez de reemplazar fake-indexeddb (cambio grande, Dexie se usa en
// syncService/App.tsx/SettingsScreen/VisitDetailScreen), reflejamos el contenido
// de las 3 tablas a un archivo JSON en disco (expo-file-system, ya usado en el
// proyecto) cada vez que algo cambia, y lo restauramos al arrancar, antes de que
// cualquier pantalla lea la base de datos.
// =========================================================

const SNAPSHOT_PATH = `${FileSystem.documentDirectory}offline-db-snapshot.json`;

type Snapshot = {
  visitas: LocalVisita[];
  plantillas: LocalPlantilla[];
  syncQueue: SyncQueueItem[];
};

let persistTimer: ReturnType<typeof setTimeout> | null = null;

async function writeSnapshot(): Promise<void> {
  const [visitas, plantillas, syncQueue] = await Promise.all([
    db.visitas.toArray(),
    db.plantillas.toArray(),
    db.syncQueue.toArray(),
  ]);
  const snapshot: Snapshot = { visitas, plantillas, syncQueue };
  await FileSystem.writeAsStringAsync(SNAPSHOT_PATH, JSON.stringify(snapshot));
}

// Debounced: bulkPut/bulkAdd disparan el hook una vez POR FILA (ej. 8 visitas al
// descargar el itinerario del día = 8 llamadas), y no queremos escribir el archivo
// 8 veces seguidas. Se guarda un solo snapshot ~300ms después de la última escritura.
function schedulePersist(): void {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    writeSnapshot().catch(err => console.error('Error guardando snapshot offline:', err));
  }, 300);
}

for (const table of [db.visitas, db.plantillas, db.syncQueue]) {
  table.hook('creating', () => schedulePersist());
  table.hook('updating', () => schedulePersist());
  table.hook('deleting', () => schedulePersist());
}

// Se llama una vez al arrancar la app, antes de que cualquier pantalla lea `db`.
export async function hydrateFromSnapshot(): Promise<void> {
  try {
    const info = await FileSystem.getInfoAsync(SNAPSHOT_PATH);
    if (!info.exists) return;

    const raw = await FileSystem.readAsStringAsync(SNAPSHOT_PATH);
    const snapshot: Snapshot = JSON.parse(raw);

    if (snapshot.visitas?.length) await db.visitas.bulkPut(snapshot.visitas);
    if (snapshot.plantillas?.length) await db.plantillas.bulkPut(snapshot.plantillas);
    if (snapshot.syncQueue?.length) await db.syncQueue.bulkPut(snapshot.syncQueue);

    console.log(
      `Snapshot offline restaurado: ${snapshot.visitas?.length ?? 0} visitas, ` +
      `${snapshot.plantillas?.length ?? 0} plantillas, ${snapshot.syncQueue?.length ?? 0} item(s) en cola.`,
    );
  } catch (err) {
    console.error('Error restaurando snapshot offline:', err);
  }
}

// `Table.clear()` no dispara los hooks 'deleting' (limitación documentada de Dexie:
// hace un IDBObjectStore.clear() directo). Por eso "Limpiar Almacenamiento Local"
// en SettingsScreen tiene que llamar esto explícitamente, o el snapshot viejo
// resucitaría los datos "borrados" en el próximo arranque.
export async function clearSnapshot(): Promise<void> {
  try {
    await FileSystem.deleteAsync(SNAPSHOT_PATH, { idempotent: true });
  } catch (err) {
    console.error('Error borrando snapshot offline:', err);
  }
}
