import { Engine } from '../core/engine/Engine';
import { CitySerializer, CitySaveData } from './CitySerializer';
import { IndexedDBStorage, StorageSlotInfo } from './IndexedDBStorage';

export type SlotMetadata = StorageSlotInfo;

export class LocalStorageManager {
  public static async listSlots(): Promise<SlotMetadata[]> {
    return await IndexedDBStorage.listSlots();
  }

  public static async getSlotMetadata(slotId: string): Promise<SlotMetadata> {
    const slots = await IndexedDBStorage.listSlots();
    return (
      slots.find((s) => s.slotId === slotId) || {
        slotId,
        name: slotId === 'autosave' ? 'Simpan Otomatis' : `Slot Penyimpanan #${slotId.split('_')[1]}`,
        timestamp: 0,
        buildingCount: 0,
        roadCount: 0,
        lotCount: 0,
        isEmpty: true,
        version: '2.0.0',
      }
    );
  }

  public static async saveToSlot(
    slotId: string,
    engine: Engine,
    title?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const name = title || (slotId === 'autosave' ? 'Simpan Otomatis' : `Kota #${slotId.split('_')[1]}`);
      const data = CitySerializer.serialize(engine, name);
      return await IndexedDBStorage.saveSlot(slotId, data);
    } catch (err: any) {
      console.error('Gagal menyimpan kota:', err);
      return { success: false, error: err?.message || 'Gagal menyimpan kota.' };
    }
  }

  public static async loadFromSlot(
    slotId: string,
    engine: Engine
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const data = await IndexedDBStorage.loadSlot(slotId);
      if (!data) {
        return { success: false, error: `Slot "${slotId}" kosong atau tidak ditemukan.` };
      }
      return CitySerializer.deserialize(engine, data);
    } catch (err: any) {
      console.error('Gagal memuat kota:', err);
      return { success: false, error: err?.message || 'Gagal memuat kota.' };
    }
  }

  public static async deleteSlot(slotId: string): Promise<void> {
    await IndexedDBStorage.deleteSlot(slotId);
  }
}
