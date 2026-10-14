import { Engine } from '../core/engine/Engine';
import { CitySerializer, CitySaveData, DeserializationResult } from './CitySerializer';

export class JsonExporter {
  public static exportCityToJson(engine: Engine, customFilename?: string): void {
    const data = CitySerializer.serialize(engine);
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const filename = customFilename || `arscity_layout_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public static async importCityFromJson(file: File, engine: Engine): Promise<DeserializationResult> {
    try {
      const text = await file.text();
      let raw: unknown;
      try {
        raw = JSON.parse(text);
      } catch (parseErr: any) {
        return {
          success: false,
          error: `Berkas bukan format JSON yang sah: ${parseErr?.message || 'Kesalahan sintaks'}`,
        };
      }

      return CitySerializer.deserialize(engine, raw);
    } catch (err: any) {
      console.error('Gagal membaca berkas kota:', err);
      return {
        success: false,
        error: `Gagal membaca berkas: ${err?.message || 'Error tidak diketahui'}`,
      };
    }
  }
}
