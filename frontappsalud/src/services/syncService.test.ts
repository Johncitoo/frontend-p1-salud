/**
 * Cubre el fix del bug: un ítem de la cola offline que siempre falla (dato inválido,
 * archivo corrupto) bloqueaba TODA la cola para siempre (el catch general hacía
 * `break`, y como el ítem nunca se borraba, la siguiente pasada volvía a romper en
 * el mismo punto). Ver syncService.ts: registrarFalloItem, esErrorDeRed, y el
 * cambio de `break` a `continue` en el catch de sincronizarRegistrosPendientes.
 */

jest.mock('expo-file-system/legacy', () => ({
  uploadAsync: jest.fn(),
  FileSystemUploadType: { MULTIPART: 'multipart' },
}));

import '../database/indexedDbPolyfill';
import { db } from '../database/offlineDb';
import { syncService, API_BASE_URL } from './syncService';

const okResponse = (body: unknown = {}) =>
  ({ ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }) as Response;

const errorResponse = (status: number, body = 'error') =>
  ({ ok: false, status, json: async () => ({ message: body }), text: async () => body }) as Response;

describe('syncService.sincronizarRegistrosPendientes — cola con ítems atascados', () => {
  beforeEach(async () => {
    await db.syncQueue.clear();
    (global as any).fetch = jest.fn();
  });

  it('un ítem con datos corruptos (excepción, no HTTP error) ya NO bloquea al resto de la cola', async () => {
    const idRoto = await db.syncQueue.add({
      tipo: 'EN_CAMINO',
      visita_id: 'visita-rota',
      data: {},
      timestamp: 1,
    });
    const idSano = await db.syncQueue.add({
      tipo: 'EN_CAMINO',
      visita_id: 'visita-sana',
      data: {},
      timestamp: 2,
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('visita-rota')) {
        // Simula un fallo que no es de red (p.ej. un bug real al armar el body,
        // o un dato corrupto) — antes, esto hacía `break` y mataba el resto del loop.
        throw new TypeError("Cannot read properties of undefined (reading 'toISOString')");
      }
      return Promise.resolve(okResponse());
    });

    const resultado = await syncService.sincronizarRegistrosPendientes();

    expect(resultado.procesados).toBe(1);
    expect(resultado.fallidos).toBe(1);

    // El ítem sano SÍ se subió y se borró de la cola.
    expect(await db.syncQueue.get(idSano)).toBeUndefined();

    // El ítem roto sigue en la cola (para reintentar), con su primer intento registrado.
    const itemRoto = await db.syncQueue.get(idRoto);
    expect(itemRoto?.intentos).toBe(1);
    expect(itemRoto?.requiereRevision).toBeFalsy();
  });

  it('tras 3 fallos seguidos, el ítem se saca de la cola activa (requiereRevision) y deja de reintentarse solo', async () => {
    const id = await db.syncQueue.add({
      tipo: 'EN_CAMINO',
      visita_id: 'visita-siempre-falla',
      data: {},
      timestamp: 1,
    });

    (global.fetch as jest.Mock).mockResolvedValue(errorResponse(500, 'fecha invalida'));

    await syncService.sincronizarRegistrosPendientes();
    await syncService.sincronizarRegistrosPendientes();
    let item = await db.syncQueue.get(id);
    expect(item?.intentos).toBe(2);
    expect(item?.requiereRevision).toBeFalsy();

    await syncService.sincronizarRegistrosPendientes();
    item = await db.syncQueue.get(id);
    expect(item?.intentos).toBe(3);
    expect(item?.requiereRevision).toBe(true);
    expect(item?.ultimoError).toContain('500');

    // Una cuarta pasada NO debe volver a intentar este ítem (ya está en cuarentena).
    (global.fetch as jest.Mock).mockClear();
    const resultado = await syncService.sincronizarRegistrosPendientes();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(resultado.procesados).toBe(0);
    expect(resultado.fallidos).toBe(0);
  });

  it('un corte de señal real (error de red) no consume el presupuesto de intentos del ítem', async () => {
    const id = await db.syncQueue.add({
      tipo: 'EN_CAMINO',
      visita_id: 'visita-sin-señal',
      data: {},
      timestamp: 1,
    });

    (global.fetch as jest.Mock).mockRejectedValue(new TypeError('Network request failed'));

    await syncService.sincronizarRegistrosPendientes();

    const item = await db.syncQueue.get(id);
    expect(item?.intentos ?? 0).toBe(0);
    expect(item?.requiereRevision).toBeFalsy();
  });

  it('sigue vigente el manejo de 409 (duplicado) ya existente: se descarta sin marcar fallo', async () => {
    const id = await db.syncQueue.add({
      tipo: 'CHECK_IN',
      visita_id: 'visita-duplicada',
      data: {},
      timestamp: 1,
    });

    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/visita-checkpoints')) return Promise.resolve(errorResponse(409));
      return Promise.resolve(okResponse());
    });

    const resultado = await syncService.sincronizarRegistrosPendientes();

    expect(resultado.procesados).toBe(1);
    expect(resultado.fallidos).toBe(0);
    expect(await db.syncQueue.get(id)).toBeUndefined();
  });

  it('API_BASE_URL sigue disponible para el resto de la app (sanity check del módulo)', () => {
    expect(typeof API_BASE_URL).toBe('string');
  });
});
