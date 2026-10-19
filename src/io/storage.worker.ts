/**
 * storage.worker.ts - Web Worker for off-thread serialization, JSON schema validation, and IndexedDB operations.
 * Eliminates main-thread micro-stutters during periodic autosaves (1500ms debounce).
 */

export interface StorageWorkerRequest {
  id: string;
  action: 'SAVE_SLOT' | 'LOAD_SLOT' | 'DELETE_SLOT' | 'LIST_SLOTS' | 'LIST_ALL_MAPS' | 'VALIDATE_SCHEMA';
  payload: any;
}

export interface StorageWorkerResponse {
  id: string;
  action: string;
  success: boolean;
  data?: any;
  error?: string;
  meta?: any;
}

const DB_NAME = 'ArscityDB';
const DB_VERSION = 1;
const STORE_NAME = 'saves';

let dbInstance: IDBDatabase | null = null;

function getWorkerDB(): Promise<IDBDatabase | null> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (typeof self === 'undefined' || !self.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = self.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'slotId' });
        }
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('[StorageWorker] IndexedDB open error in worker:', err);
        resolve(null);
      };
    } catch (err) {
      console.warn('[StorageWorker] IndexedDB init error in worker:', err);
      resolve(null);
    }
  });
}

function validateSchemaV2(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['Data is not a valid JSON object.'] };
  }

  if (!data.roads || typeof data.roads !== 'object') {
    errors.push('Missing roads structure.');
  } else {
    if (!Array.isArray(data.roads.nodes)) errors.push('roads.nodes must be an array.');
    if (!Array.isArray(data.roads.edges)) errors.push('roads.edges must be an array.');
  }

  if (!Array.isArray(data.buildings)) errors.push('buildings must be an array.');
  if (!Array.isArray(data.lots)) errors.push('lots must be an array.');

  return { valid: errors.length === 0, errors };
}

self.onmessage = async (e: MessageEvent<StorageWorkerRequest>) => {
  const { id, action, payload } = e.data;

  try {
    switch (action) {
      case 'VALIDATE_SCHEMA': {
        const result = validateSchemaV2(payload?.data);
        const res: StorageWorkerResponse = {
          id,
          action,
          success: result.valid,
          data: result,
          error: result.valid ? undefined : result.errors.join('; ')
        };
        self.postMessage(res);
        break;
      }

      case 'SAVE_SLOT': {
        const { slotId, data } = payload;
        const validation = validateSchemaV2(data);
        if (!validation.valid) {
          self.postMessage({
            id,
            action,
            success: false,
            error: `Integritas skema JSON v2.0.0 tidak valid: ${validation.errors.join(', ')}`
          } as StorageWorkerResponse);
          return;
        }

        const db = await getWorkerDB();
        if (!db) {
          self.postMessage({
            id,
            action,
            success: false,
            error: 'IndexedDB tidak tersedia di lingkungan worker.'
          } as StorageWorkerResponse);
          return;
        }

        const record = {
          slotId,
          data,
          updatedAt: Date.now()
        };

        await new Promise<void>((resolve, reject) => {
          try {
            const tx = db.transaction([STORE_NAME], 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put(record);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
            tx.onerror = () => reject(tx.error);
          } catch (err) {
            reject(err);
          }
        });

        const meta = {
          slotId,
          name: data.cityTitle || slotId,
          timestamp: data.timestamp || Date.now(),
          buildingCount: (data.buildings?.length || 0) + (data.customBuildings?.length || 0),
          roadCount: data.roads?.edges?.length || 0,
          lotCount: data.lots?.length || 0,
          isEmpty: false,
          version: data.version || '2.0.0'
        };

        self.postMessage({
          id,
          action,
          success: true,
          meta
        } as StorageWorkerResponse);
        break;
      }

      case 'LOAD_SLOT': {
        const { slotId } = payload;
        const db = await getWorkerDB();
        if (!db) {
          self.postMessage({
            id,
            action,
            success: false,
            error: 'IndexedDB tidak tersedia di worker.'
          } as StorageWorkerResponse);
          return;
        }

        const record = await new Promise<any>((resolve, reject) => {
          try {
            const tx = db.transaction([STORE_NAME], 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(slotId);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
          } catch (err) {
            reject(err);
          }
        });

        self.postMessage({
          id,
          action,
          success: true,
          data: record ? record.data : null
        } as StorageWorkerResponse);
        break;
      }

      case 'DELETE_SLOT': {
        const { slotId } = payload;
        const db = await getWorkerDB();
        if (db) {
          await new Promise<void>((resolve, reject) => {
            try {
              const tx = db.transaction([STORE_NAME], 'readwrite');
              const store = tx.objectStore(STORE_NAME);
              const req = store.delete(slotId);
              req.onsuccess = () => resolve();
              req.onerror = () => reject(req.error);
            } catch (err) {
              reject(err);
            }
          });
        }
        self.postMessage({
          id,
          action,
          success: true
        } as StorageWorkerResponse);
        break;
      }

      case 'LIST_SLOTS': {
        const slotIds: string[] = payload?.slotIds || ['autosave', 'slot_1', 'slot_2', 'slot_3'];
        const db = await getWorkerDB();
        const results: any[] = [];

        for (const slotId of slotIds) {
          let record: any = null;
          if (db) {
            try {
              record = await new Promise<any>((resolve) => {
                const tx = db.transaction([STORE_NAME], 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get(slotId);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => resolve(null);
              });
            } catch {
              record = null;
            }
          }

          if (!record || !record.data) {
            results.push({
              slotId,
              name: slotId === 'autosave' ? 'Simpan Otomatis' : `Slot Penyimpanan #${slotId.split('_')[1] || slotId}`,
              timestamp: 0,
              buildingCount: 0,
              roadCount: 0,
              lotCount: 0,
              isEmpty: true,
              version: '2.0.0'
            });
          } else {
            const d = record.data;
            results.push({
              slotId,
              name: d.cityTitle || slotId,
              timestamp: d.timestamp || record.updatedAt || 0,
              buildingCount: (d.buildings?.length || 0) + (d.customBuildings?.length || 0),
              roadCount: d.roads?.edges?.length || 0,
              lotCount: d.lots?.length || 0,
              isEmpty: false,
              version: d.version || '2.0.0'
            });
          }
        }

        self.postMessage({
          id,
          action,
          success: true,
          data: results
        } as StorageWorkerResponse);
        break;
      }

      case 'LIST_ALL_MAPS': {
        const db = await getWorkerDB();
        let records: any[] = [];
        if (db) {
          records = await new Promise<any[]>((resolve) => {
            try {
              const tx = db.transaction([STORE_NAME], 'readonly');
              const store = tx.objectStore(STORE_NAME);
              const req = store.getAll();
              req.onsuccess = () => resolve(req.result || []);
              req.onerror = () => resolve([]);
            } catch {
              resolve([]);
            }
          });
        }
        const results = records
          .filter((r) => r && r.data)
          .map((r) => {
            const d = r.data;
            return {
              id: r.slotId,
              name: d.cityTitle || r.slotId,
              updatedAt: r.updatedAt || d.timestamp || Date.now(),
              buildingCount: (d.buildings?.length || 0) + (d.customBuildings?.length || 0),
              roadCount: d.roads?.edges?.length || 0,
              lotCount: d.lots?.length || 0,
              isPresetFork: Boolean(d.isPresetFork || (typeof r.slotId === 'string' && r.slotId.includes('malioboro'))),
            };
          });

        self.postMessage({
          id,
          action,
          success: true,
          data: results
        } as StorageWorkerResponse);
        break;
      }

      default:
        self.postMessage({
          id,
          action,
          success: false,
          error: `Aksi tidak dikenal: ${action}`
        } as StorageWorkerResponse);
    }
  } catch (err: any) {
    self.postMessage({
      id,
      action,
      success: false,
      error: err?.message || 'Kesalahan internal storage worker.'
    } as StorageWorkerResponse);
  }
};
