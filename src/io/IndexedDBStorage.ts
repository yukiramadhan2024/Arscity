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

/**
 * IndexedDBStorage - Robust persistent storage manager for Arscity.
 *
 * Implements Milestone T1.4:
 * - Uses IndexedDB as primary storage with localStorage fallback
 * - Handles QuotaExceededError with actionable Indonesian messages
 * - Provides debounced autosave capability
 * - Supports slot listing, saving, loading, and deletion
 */
export class IndexedDBStorage {
  private static readonly DB_NAME = 'ArscityDB';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'saves';
  private static readonly STORAGE_PREFIX = 'arscity_save_';

  private static dbPromise: Promise<IDBDatabase | null> | null = null;
  private static autosaveTimeout: any = null;

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
   * Save a city data object to an IndexedDB or localStorage slot
   */
  public static async saveSlot(slotId: string, data: CitySaveData): Promise<{ success: boolean; error?: string }> {
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
        // Also keep a lightweight mirror in localStorage for slot metadata listing
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
          localStorage.setItem(metaKey, JSON.stringify(meta));
        } catch {}

        return { success: true };
      }

      // Fallback: localStorage
      const json = JSON.stringify(data);
      localStorage.setItem(`${this.STORAGE_PREFIX}${slotId}`, json);
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
   * Load city data from slot
   */
  public static async loadSlot(slotId: string): Promise<CitySaveData | null> {
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

      // Fallback: localStorage
      const raw = localStorage.getItem(`${this.STORAGE_PREFIX}${slotId}`);
      if (!raw) return null;
      return JSON.parse(raw) as CitySaveData;
    } catch (err) {
      console.error('[IndexedDBStorage] Failed to load slot:', err);
      // Try raw localStorage fallback
      try {
        const raw = localStorage.getItem(`${this.STORAGE_PREFIX}${slotId}`);
        if (raw) return JSON.parse(raw);
      } catch {}
      return null;
    }
  }

  /**
   * Delete slot
   */
  public static async deleteSlot(slotId: string): Promise<void> {
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
      localStorage.removeItem(`${this.STORAGE_PREFIX}${slotId}`);
      localStorage.removeItem(`${this.STORAGE_PREFIX}${slotId}_meta`);
    } catch {}
  }

  /**
   * List slot metadata for all standard slots
   */
  public static async listSlots(): Promise<StorageSlotInfo[]> {
    const slotIds = ['autosave', 'slot_1', 'slot_2', 'slot_3'];
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

  /**
   * Schedule debounced autosave (default 1500ms delay)
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
}
