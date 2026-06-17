// Polyfill para IndexedDB en entornos nativos de React Native (donde no hay IndexedDB global)
if (typeof globalThis !== 'undefined' && !globalThis.indexedDB) {
  try {
    const { indexedDB, IDBKeyRange } = require('fake-indexeddb');
    (globalThis as any).indexedDB = indexedDB;
    (globalThis as any).IDBKeyRange = IDBKeyRange;
    console.log("IndexedDB polyfilled successfully at startup.");
  } catch (e) {
    console.error("Fallo al aplicar polyfill de fake-indexeddb en inicio:", e);
  }
}
