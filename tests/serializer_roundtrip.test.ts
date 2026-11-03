import { describe, it, expect } from 'vitest';
import { CitySerializer, CitySaveData } from '../src/io/CitySerializer';

describe('CitySerializer - Validation, Migrations & Roundtrip Safety', () => {
  const validCityData: CitySaveData = {
    version: '2.0.0',
    cityTitle: 'Kota Tropis Mandiri',
    timestamp: 1720000000000,
    environment: {
      timeOfDay: 11.6,
      dayOfYear: 172,
      weather: 'clear',
    },
    roads: {
      nodes: [
        { id: 'node_1', x: 0, y: 0, z: 0, connectedEdgeIds: ['edge_1'] },
        { id: 'node_2', x: 50, y: 0, z: 0, connectedEdgeIds: ['edge_1'] },
      ],
      edges: [
        {
          id: 'edge_1',
          startNodeId: 'node_1',
          endNodeId: 'node_2',
          type: 'arterial',
          controlPoints: [
            [0, 0, 0],
            [50, 0, 0],
          ],
          length: 50,
          customProfile: { hasTrees: true, hasStreetLights: true },
        },
      ],
    },
    buildings: [
      {
        id: 'bld_1',
        presetKey: 'house_36',
        name: 'Rumah Tipe 36',
        category: 'residential',
        position: [10, 0, 10],
        rotationY: 0,
        width: 6,
        length: 6,
        floorCount: 1,
        floorHeight: 3.2,
        roofType: 'gable',
        roofOverhang: 1.2,
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
        roofMaterial: 'clay_tile',
        lotId: 'lot_1',
      },
    ],
    customBuildings: [
      {
        id: 'custom_bld_1',
        name: 'Rumah Tropis Kustom',
        position: [25, 0, 15],
        rotationY: 0,
        plinthHeight: 0.35,
        floors: [
          {
            floorIndex: 0,
            height: 3.2,
            footprint: [
              [-4, -4],
              [4, -4],
              [4, 4],
              [-4, 4],
            ],
            walls: [],
          },
        ],
        roof: {
          type: 'hip',
          pitchAngle: 30,
          overhang: 1.2,
          material: 'clay_tile',
        },
        wallMaterial: 'plaster',
        wallColor: '#f8fafc',
      },
    ],
    lots: [
      {
        id: 'lot_1',
        name: 'Kavling #1',
        zone: 'residential',
        position: [10, 0, 10],
        width: 10,
        length: 15,
        areaM2: 150,
        gsbDistanceM: 3.5,
      },
    ],
    landscape: [],
    displaySettings: {},
  };

  it('validates a correct CitySaveData structure', () => {
    const val = CitySerializer.validateCityData(validCityData);
    expect(val.valid).toBe(true);
    expect(val.errors.length).toBe(0);
  });

  it('detects missing or invalid road edge node references', () => {
    const brokenData = JSON.parse(JSON.stringify(validCityData));
    brokenData.roads.edges[0].startNodeId = 'non_existent_node';

    const val = CitySerializer.validateCityData(brokenData);
    expect(val.valid).toBe(false);
    expect(val.errors.some((e: string) => e.includes('non_existent_node'))).toBe(true);
  });

  it('detects invalid coordinate data (NaN or Infinity)', () => {
    const corruptData = JSON.parse(JSON.stringify(validCityData));
    corruptData.roads.nodes[0].x = 'invalid' as any;

    const val = CitySerializer.validateCityData(corruptData);
    expect(val.valid).toBe(false);
  });

  it('successfully migrates v1.0.0 format to v2.0.0 format', () => {
    const oldV1Data = {
      version: '1.0.0',
      cityTitle: 'Kota Lama',
      timestamp: 1600000000000,
      roads: validCityData.roads,
      buildings: validCityData.buildings,
      lots: [
        {
          id: 'lot_legacy',
          name: 'Kavling Legacy',
          zone: 'residential',
          position: [0, 0, 0],
          width: 10,
          length: 12,
          areaM2: 120,
        },
      ],
    };

    const migrated = CitySerializer.migrateCityData(oldV1Data);
    expect(migrated.version).toBe('2.1.0');
    expect(migrated.customBuildings).toBeDefined();
    expect(migrated.lots[0].gsbDistanceM).toBe(3.5);
    expect(migrated.environment).toBeDefined();
  });

  it('roundtrip serialization maintains structural integrity', () => {
    // Simulating save -> load -> save cycle
    const migrated = CitySerializer.migrateCityData(validCityData);
    const jsonStr = JSON.stringify(migrated);
    const reloaded = JSON.parse(jsonStr);

    const val = CitySerializer.validateCityData(reloaded);
    expect(val.valid).toBe(true);
    expect(reloaded.buildings.length).toBe(validCityData.buildings.length);
    expect(reloaded.customBuildings?.length).toBe(validCityData.customBuildings?.length);
    expect(reloaded.roads.edges.length).toBe(validCityData.roads.edges.length);
    expect(reloaded.lots.length).toBe(validCityData.lots.length);
  });

  it('serializes and preserves all v3.3.0 architectural CAD custom building properties', () => {
    const cadCityData: CitySaveData = {
      ...validCityData,
      customBuildings: [
        {
          id: 'custom_bld_cad',
          name: 'Villa L-Shape Modern',
          position: [30, 0, 20],
          rotationY: 1.57,
          plinthHeight: 0.35,
          floors: [
            {
              floorIndex: 0,
              height: 3.2,
              footprint: [
                [-5, -6],
                [5, -6],
                [5, 0],
                [0, 0],
                [0, 6],
                [-5, 6],
              ],
              walls: [],
            },
          ],
          roof: {
            type: 'hip',
            pitchAngle: 30,
            overhang: 1.4,
            material: 'metal',
          },
          wallMaterial: 'plaster',
          wallColor: '#f8fafc',
          massingShape: 'l_shape',
          windowStyle: 'curtain_wall',
          hasBalcony: true,
          hasSunLouvers: true,
          hasVerticalGarden: true,
          hasFrontArcade: false,
          useBasePlinthMaterial: true,
          baseMaterial: 'andesite',
          mullionColor: '#1e293b',
          hasSkylight: false,
        },
      ],
    };

    const jsonStr = JSON.stringify(cadCityData);
    const parsed: CitySaveData = JSON.parse(jsonStr);

    const cb = parsed.customBuildings?.[0];
    expect(cb).toBeDefined();
    expect(cb?.massingShape).toBe('l_shape');
    expect(cb?.windowStyle).toBe('curtain_wall');
    expect(cb?.hasBalcony).toBe(true);
    expect(cb?.hasSunLouvers).toBe(true);
    expect(cb?.hasVerticalGarden).toBe(true);
    expect(cb?.hasFrontArcade).toBe(false);
    expect(cb?.useBasePlinthMaterial).toBe(true);
    expect(cb?.baseMaterial).toBe('andesite');
    expect(cb?.mullionColor).toBe('#1e293b');
    expect(cb?.hasSkylight).toBe(false);

    const val = CitySerializer.validateCityData(parsed);
    expect(val.valid).toBe(true);
  });
});
