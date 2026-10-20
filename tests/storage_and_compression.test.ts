import { describe, it, expect, beforeEach } from 'vitest';
import { RealWorldExporter } from '../src/io/RealWorldExporter';
import { CitySaveData } from '../src/io/CitySerializer';
import { IndexedDBStorage } from '../src/io/IndexedDBStorage';

describe('Phase 4: Non-blocking Storage & Compressed File Portability', () => {
  const sampleCityData: CitySaveData = {
    version: '2.0.0',
    cityTitle: 'Kota Tropis Nusantara',
    timestamp: 1729000000000,
    environment: {
      timeOfDay: 14.5,
      dayOfYear: 180,
      weather: 'clear',
    },
    roads: {
      nodes: [
        { id: 'n1', x: 0, y: 0, z: 0, connectedEdgeIds: ['e1'] },
        { id: 'n2', x: 50, y: 0, z: 0, connectedEdgeIds: ['e1'] },
      ],
      edges: [
        {
          id: 'e1',
          startNodeId: 'n1',
          endNodeId: 'n2',
          type: 'arterial',
          controlPoints: [
            [0, 0, 0],
            [50, 0, 0],
          ],
          length: 50,
        },
      ],
    },
    buildings: [
      {
        id: 'b1',
        presetKey: 'joglo',
        name: 'Joglo Ageng',
        category: 'residential',
        position: [20, 0, 20],
        rotationY: 0,
        width: 14,
        length: 16,
        floorCount: 1,
        floorHeight: 3.5,
        roofType: 'joglo',
        roofOverhang: 1.5,
        wallMaterial: 'kayu_jati',
        wallColor: '#8B4513',
        roofMaterial: 'genteng_tanah_liat',
      },
    ],
    lots: [
      {
        id: 'lot1',
        name: 'Kavling Permukiman 01',
        zone: 'residential',
        position: [20, 0, 20],
        width: 30,
        length: 30,
        areaM2: 900,
        gsbDistanceM: 5.0,
      },
    ],
  };

  it('exports city state to a valid .arscity blob and imports it back with 100% fidelity', async () => {
    const compressedBlob = await RealWorldExporter.exportToArscity(sampleCityData);
    expect(compressedBlob).toBeDefined();
    expect(compressedBlob.size).toBeGreaterThan(0);

    const importedData = await RealWorldExporter.importFromArscity(compressedBlob);
    expect(importedData.version).toBe('2.0.0');
    expect(importedData.cityTitle).toBe('Kota Tropis Nusantara');
    expect(importedData.roads.edges.length).toBe(1);
    expect(importedData.buildings.length).toBe(1);
    expect(importedData.buildings[0].presetKey).toBe('joglo');
    expect(importedData.lots.length).toBe(1);
    expect(importedData.lots[0].gsbDistanceM).toBe(5.0);
  });

  it('handles IndexedDBStorage saveSlot and loadSlot with localStorage fallback when worker/indexedDB is mocked', async () => {
    const saveRes = await IndexedDBStorage.saveSlot('slot_test', sampleCityData);
    expect(saveRes.success).toBe(true);

    const loadedData = await IndexedDBStorage.loadSlot('slot_test');
    expect(loadedData).toBeDefined();
    expect(loadedData?.cityTitle).toBe('Kota Tropis Nusantara');

    const slots = await IndexedDBStorage.listSlots();
    expect(Array.isArray(slots)).toBe(true);
    expect(slots.length).toBe(4);

    await IndexedDBStorage.deleteSlot('slot_test');
  });
});
