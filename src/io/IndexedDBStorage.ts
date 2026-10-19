import { CitySaveData } from './CitySerializer';

export interface StorageSlotInfo {
  slotId: string;
  name: string;
  timestamp: number;
  buildingCount: number;
  roadCount: number;
  lotCount: number;
  isEmpty: boolean;
  version: string;
}

export interface SavedMapMeta {
  id: string;
  name: string;
  updatedAt: number;
  buildingCount: number;
  roadCount: number;
  lotCount?: number;
  isPresetFork?: boolean;
}

/**
 * IndexedDBStorage - Robust persistent storage manager for Arscity.
 *
 * Implements Milestone T1.4 & Phase 4:
 * - Uses Web Worker (`storage.worker.ts`) for off-thread serialization, JSON schema validation, and IndexedDB operations.
 * - Robust fallback to main-thread IndexedDB and localStorage if Worker is unavailable.
 * - Handles QuotaExceededError with actionable Indonesian messages.
 * - Provides debounced non-blocking autosave capability (1500ms).
 */
export class IndexedDBStorage {
  private static readonly DB_NAME = 'ArscityDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'saves';
  private static readonly STORAGE_PREFIX = 'arscity_save_';

  private static dbPromise: Promise<IDBDatabase | null> | null = null;
  private static autosaveTimeout: any = null;

  private static worker: Worker | null = null;
  private static workerFailed: boolean = false;
  private static nextRequestId: number = 1;
  private static pendingRequests = new Map<string, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private static memoryFallback = new Map<string, string>();

  private static setFallbackItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {}
    }
    this.memoryFallback.set(key, value);
  }

  private static getFallbackItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val !== null) return val;
      } catch {}
    }
    return this.memoryFallback.get(key) || null;
  }

  private static removeFallbackItem(key: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch {}
    }
    this.memoryFallback.delete(key);
  }

  /**
   * Lazily instantiate and maintain reference to dedicated storage Web Worker
   */
  private static getWorker(): Worker | null {
    if (this.workerFailed) return null;
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }

    if (!this.worker) {
      try {
        this.worker = new Worker(new URL('./storage.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent<any>) => {
          const { id, success, data, error, meta } = event.data;
          const pending = this.pendingRequests.get(id);
          if (pending) {
            this.pendingRequests.delete(id);
            if (success) {
              pending.resolve({ success, data, meta });
            } else {
              pending.reject(new Error(error || 'Worker storage operation failed'));
            }
          }
        };
        this.worker.onerror = (err) => {
          console.warn('[IndexedDBStorage] Web Worker encountered error, falling back to main-thread storage:', err);
          this.workerFailed = true;
          this.worker?.terminate();
          this.worker = null;
          for (const req of this.pendingRequests.values()) {
            req.reject(new Error('Worker terminated'));
          }
          this.pendingRequests.clear();
        };
      } catch (err) {
        console.warn('[IndexedDBStorage] Web Worker initialization failed, using main-thread storage:', err);
        this.workerFailed = true;
        return null;
      }
    }
    return this.worker;
  }

  /**
   * Send a command message to the storage worker with timeout
   */
  private static async postToWorker(action: string, payload: any, timeoutMs: number = 4000): Promise<any> {
    const worker = this.getWorker();
    if (!worker) return null;

    const id = `req_${this.nextRequestId++}_${Date.now()}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Storage worker operation timed out'));
        }
      }, timeoutMs);

      this.pendingRequests.set(id, {
        resolve: (val) => {
          clearTimeout(timer);
          resolve(val);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        }
      });

      worker.postMessage({ id, action, payload });
    });
  }

  private static async getDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return null;
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve) => {
        try {
          const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(this.STORE_NAME)) {
              db.createObjectStore(this.STORE_NAME, { keyPath: 'slotId' });
            }
          };

          request.onsuccess = () => {
            resolve(request.result);
          };

          request.onerror = (err) => {
            console.warn('[IndexedDBStorage] IndexedDB open error, falling back to localStorage:', err);
            resolve(null);
          };
        } catch (err) {
          console.warn('[IndexedDBStorage] IndexedDB initialization error:', err);
          resolve(null);
        }
      });
    }

    return this.dbPromise;
  }

  /**
   * Save a city data object via Worker (or main thread fallback)
   */
  public static async saveSlot(slotId: string, data: CitySaveData): Promise<{ success: boolean; error?: string }> {
    // Attempt non-blocking worker execution first
    const worker = this.getWorker();
    if (worker) {
      try {
        const res = await this.postToWorker('SAVE_SLOT', { slotId, data });
        if (res && res.success) {
          try {
            const metaKey = `${this.STORAGE_PREFIX}${slotId}_meta`;
            if (res.meta) {
              this.setFallbackItem(metaKey, JSON.stringify(res.meta));
            }
          } catch {}
          return { success: true };
        }
      } catch (workerErr: any) {
        console.warn('[IndexedDBStorage] Worker save failed, executing main-thread fallback:', workerErr);
      }
    }

    // Main thread fallback
    try {
      const record = {
        slotId,
        data,
        updatedAt: Date.now(),
      };

      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          try {
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put(record);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            transaction.onerror = () => reject(transaction.error);
          } catch (e) {
            reject(e);
          }
        });

        try {
          const metaKey = `${this.STORAGE_PREFIX}${slotId}_meta`;
          const meta: StorageSlotInfo = {
            slotId,
            name: data.cityTitle || slotId,
            timestamp: data.timestamp,
            buildingCount: (data.buildings?.length || 0) + (data.customBuildings?.length || 0),
            roadCount: data.roads?.edges?.length || 0,
            lotCount: data.lots?.length || 0,
            isEmpty: false,
            version: data.version || '2.0.0',
          };
          this.setFallbackItem(metaKey, JSON.stringify(meta));
        } catch {}

        return { success: true };
      }

      // Final fallback: fallback storage
      const json = JSON.stringify(data);
      this.setFallbackItem(`${this.STORAGE_PREFIX}${slotId}`, json);
      return { success: true };
    } catch (err: any) {
      if (err?.name === 'QuotaExceededError' || err?.code === 22 || err?.message?.includes('quota')) {
        return {
          success: false,
          error: 'Kapasitas penyimpanan peramban penuh. Harap hapus slot kota lama atau ekspor berkas JSON untuk mengosongkan ruang.',
        };
      }
      return {
        success: false,
        error: `Gagal menyimpan kota: ${err?.message || 'Kesalahan sistem penyimpanan.'}`,
      };
    }
  }

  /**
   * Load city data from slot (Worker or main thread)
   */
  public static async loadSlot(slotId: string): Promise<CitySaveData | null> {
    const worker = this.getWorker();
    if (worker) {
      try {
        const res = await this.postToWorker('LOAD_SLOT', { slotId });
        if (res && res.success && res.data) {
          return res.data as CitySaveData;
        }
      } catch (workerErr) {
        console.warn('[IndexedDBStorage] Worker load failed, executing main-thread fallback:', workerErr);
      }
    }

    try {
      const db = await this.getDB();
      if (db) {
        const record = await new Promise<any>((resolve, reject) => {
          try {
            const transaction = db.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(slotId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          } catch (e) {
            reject(e);
          }
        });

        if (record && record.data) {
          return record.data as CitySaveData;
        }
      }

      // Fallback: storage item
      const raw = this.getFallbackItem(`${this.STORAGE_PREFIX}${slotId}`);
      if (!raw) return null;
      return JSON.parse(raw) as CitySaveData;
    } catch (err) {
      console.error('[IndexedDBStorage] Failed to load slot:', err);
      try {
        const raw = this.getFallbackItem(`${this.STORAGE_PREFIX}${slotId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    }
  }

  /**
   * Delete slot
   */
  public static async deleteSlot(slotId: string): Promise<void> {
    const worker = this.getWorker();
    if (worker) {
      try {
        await this.postToWorker('DELETE_SLOT', { slotId });
      } catch {}
    }

    try {
      const db = await this.getDB();
      if (db) {
        await new Promise<void>((resolve, reject) => {
          try {
            const transaction = db.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(slotId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          } catch (e) {
            reject(e);
          }
        });
      }
    } catch {}

    try {
      this.removeFallbackItem(`${this.STORAGE_PREFIX}${slotId}`);
      this.removeFallbackItem(`${this.STORAGE_PREFIX}${slotId}_meta`);
    } catch {}
  }

  /**
   * List slot metadata for all standard slots
   */
  public static async listSlots(): Promise<StorageSlotInfo[]> {
    const slotIds = ['autosave', 'slot_1', 'slot_2', 'slot_3'];

    const worker = this.getWorker();
    if (worker) {
      try {
        const res = await this.postToWorker('LIST_SLOTS', { slotIds });
        if (res && res.success && Array.isArray(res.data)) {
          return res.data;
        }
      } catch (workerErr) {
        console.warn('[IndexedDBStorage] Worker list failed, fallback to main thread:', workerErr);
      }
    }

    const results: StorageSlotInfo[] = [];
    for (const slotId of slotIds) {
      let data: CitySaveData | null = null;
      try {
        data = await this.loadSlot(slotId);
      } catch {}

      if (!data) {
        results.push({
          slotId,
          name: slotId === 'autosave' ? 'Simpan Otomatis' : `Slot Penyimpanan #${slotId.split('_')[1]}`,
          timestamp: 0,
          buildingCount: 0,
          roadCount: 0,
          lotCount: 0,
          isEmpty: true,
          version: '2.0.0',
        });
      } else {
        results.push({
          slotId,
          name: data.cityTitle || slotId,
          timestamp: data.timestamp || 0,
          buildingCount: (data.buildings?.length || 0) + (data.customBuildings?.length || 0),
          roadCount: data.roads?.edges?.length || 0,
          lotCount: data.lots?.length || 0,
          isEmpty: false,
          version: data.version || '1.0.0',
        });
      }
    }

    return results;
  }

  private static readonly MAPS_INDEX_KEY = 'arscity_map_ids_index';

  private static getKnownMapIds(): string[] {
    const raw = this.getFallbackItem(this.MAPS_INDEX_KEY);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  private static addKnownMapId(id: string): void {
    const list = this.getKnownMapIds();
    if (!list.includes(id)) {
      list.push(id);
      this.setFallbackItem(this.MAPS_INDEX_KEY, JSON.stringify(list));
    }
  }

  private static removeKnownMapId(id: string): void {
    const list = this.getKnownMapIds().filter((item) => item !== id);
    this.setFallbackItem(this.MAPS_INDEX_KEY, JSON.stringify(list));
  }

  /**
   * Schedule debounced non-blocking autosave (default 1500ms delay)
   */
  public static scheduleDebouncedAutosave(
    saveFn: () => CitySaveData,
    delayMs: number = 1500,
    onComplete?: (res: { success: boolean; error?: string }) => void
  ): void {
    if (this.autosaveTimeout) {
      clearTimeout(this.autosaveTimeout);
    }

    this.autosaveTimeout = setTimeout(async () => {
      try {
        const data = saveFn();
        const res = await this.saveSlot('autosave', data);
        if (onComplete) onComplete(res);
      } catch (err: any) {
        if (onComplete) {
          onComplete({ success: false, error: err?.message || 'Gagal autosave' });
        }
      }
    }, delayMs);
  }

  /**
   * List all saved maps with metadata across IndexedDB and fallback storage
   */
  public static async listSavedMaps(): Promise<SavedMapMeta[]> {
    const worker = this.getWorker();
    if (worker) {
      try {
        const res = await this.postToWorker('LIST_ALL_MAPS', {});
        if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
          return (res.data as SavedMapMeta[]).sort((a, b) => b.updatedAt - a.updatedAt);
        }
      } catch (workerErr) {
        console.warn('[IndexedDBStorage] Worker list maps failed, fallback to main thread:', workerErr);
      }
    }

    const mapsMap = new Map<string, SavedMapMeta>();

    // 1. Check main thread IndexedDB
    try {
      const db = await this.getDB();
      if (db) {
        const records = await new Promise<any[]>((resolve) => {
          try {
            const tx = db.transaction([this.STORE_NAME], 'readonly');
            const store = tx.objectStore(this.STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = () => resolve([]);
          } catch {
            resolve([]);
          }
        });

        for (const r of records) {
          if (r && r.data) {
            const d = r.data;
            mapsMap.set(r.slotId, {
              id: r.slotId,
              name: d.cityTitle || r.slotId,
              updatedAt: r.updatedAt || d.timestamp || Date.now(),
              buildingCount: (d.buildings?.length || 0) + (d.customBuildings?.length || 0),
              roadCount: d.roads?.edges?.length || 0,
              lotCount: d.lots?.length || 0,
              isPresetFork: Boolean(d.isPresetFork || (typeof r.slotId === 'string' && r.slotId.includes('malioboro'))),
            });
          }
        }
      }
    } catch {}

    // 2. Check fallback storage items
    const fallbackIds = Array.from(new Set([
      ...this.getKnownMapIds(),
      'autosave',
      'slot_1',
      'slot_2',
      'slot_3',
    ]));

    for (const id of fallbackIds) {
      if (mapsMap.has(id)) continue;
      const raw = this.getFallbackItem(`${this.STORAGE_PREFIX}${id}`);
      if (raw) {
        try {
          const d = JSON.parse(raw);
          if (d && (d.roads || d.buildings)) {
            mapsMap.set(id, {
              id,
              name: d.cityTitle || id,
              updatedAt: d.timestamp || Date.now(),
              buildingCount: (d.buildings?.length || 0) + (d.customBuildings?.length || 0),
              roadCount: d.roads?.edges?.length || 0,
              lotCount: d.lots?.length || 0,
              isPresetFork: Boolean(d.isPresetFork || id.includes('malioboro')),
            });
          }
        } catch {}
      }
    }

    return Array.from(mapsMap.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public static async loadMapById(id: string): Promise<CitySaveData | null> {
    return this.loadSlot(id);
  }

  public static async saveMapById(
    id: string,
    name: string,
    state: CitySaveData
  ): Promise<{ success: boolean; error?: string }> {
    state.cityTitle = name;
    state.timestamp = Date.now();
    this.addKnownMapId(id);
    return this.saveSlot(id, state);
  }

  public static async deleteMapById(id: string): Promise<void> {
    this.removeKnownMapId(id);
    return this.deleteSlot(id);
  }

  public static async createNewEmptyMap(name: string = 'Kota Baru'): Promise<{ id: string; state: CitySaveData }> {
    const id = `map_${Date.now()}`;
    const state: CitySaveData = {
      version: '2.0.0',
      cityTitle: name,
      timestamp: Date.now(),
      environment: {
        timeOfDay: 9.0,
        dayOfYear: 172,
        weather: 'clear',
      },
      roads: { nodes: [], edges: [] },
      buildings: [],
      customBuildings: [],
      lots: [],
      landscape: [],
      displaySettings: {},
    };
    await this.saveMapById(id, name, state);
    return { id, state };
  }
}
