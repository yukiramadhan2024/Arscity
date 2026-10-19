import { describe, it, expect } from 'vitest';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';
import { CitySerializer } from '../src/io/CitySerializer';

describe('Malioboro Yogyakarta Preset Generator (100% Procedural & Declarative)', () => {
  it('generates valid CitySaveData v2.0.0 schema without any validation errors', () => {
    const data = createMalioboroMapData();

    expect(data.version).toBe('2.0.0');
    expect(data.cityTitle).toBe('Koridor Malioboro Yogyakarta');
    expect(data.environment.timeOfDay).toBe(16.5); // 16:30 WIB golden hour
    expect(data.environment.weather).toBe('clear');

    const validation = CitySerializer.validateCityData(data);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('generates the main North-South Jalan Malioboro arterial corridor', () => {
    const data = createMalioboroMapData();
    const nodes = data.roads.nodes;
    const edges = data.roads.edges;

    // Check key main corridor nodes along x = 0
    const nodeNorth = nodes.find((n) => n.id === 'node_m_north');
    const nodeSosro = nodes.find((n) => n.id === 'node_m_sosro');
    const nodeDagen = nodes.find((n) => n.id === 'node_m_dagen');
    const nodeKepatihan = nodes.find((n) => n.id === 'node_m_kepatihan');
    const nodePajeksan = nodes.find((n) => n.id === 'node_m_pajeksan');
    const nodeNol = nodes.find((n) => n.id === 'node_m_nol');

    expect(nodeNorth).toBeDefined();
    expect(nodeNorth?.z).toBe(-180);
    expect(nodeSosro?.z).toBe(-90);
    expect(nodeDagen?.z).toBe(-20);
    expect(nodeKepatihan?.z).toBe(30);
    expect(nodePajeksan?.z).toBe(90);
    expect(nodeNol?.z).toBe(180);

    // Check main arterial corridor edges
    const malioboroEdges = edges.filter((e) => e.id.startsWith('edge_m_'));
    expect(malioboroEdges.length).toBe(5);
    malioboroEdges.forEach((edge) => {
      expect(edge.type).toBe('arterial');
      expect(edge.customProfile?.hasTrees).toBe(true);
      expect(edge.customProfile?.hasStreetLights).toBe(true);
    });

    // Check side intersections
    const sideEdges = edges.filter((e) => !e.id.startsWith('edge_m_'));
    expect(sideEdges.length).toBeGreaterThanOrEqual(5);

    // Verify all edges link valid start and end nodes, and nodes reference edge IDs
    edges.forEach((edge) => {
      const sNode = nodes.find((n) => n.id === edge.startNodeId);
      const eNode = nodes.find((n) => n.id === edge.endNodeId);
      expect(sNode).toBeDefined();
      expect(eNode).toBeDefined();
      expect(sNode?.connectedEdgeIds).toContain(edge.id);
      expect(eNode?.connectedEdgeIds).toContain(edge.id);
    });
  });

  it('contains dense 2-storey commercial Ruko shophouses on West and East corridors', () => {
    const data = createMalioboroMapData();

    const westRukos = data.buildings.filter((b) => b.id.startsWith('bld_ruko_w_'));
    const eastRukos = data.buildings.filter((b) => b.id.startsWith('bld_ruko_e_'));

    expect(westRukos.length).toBeGreaterThanOrEqual(10);
    expect(eastRukos.length).toBeGreaterThanOrEqual(5);

    // All Rukos are 2 floors, commercial category, and facing the street
    westRukos.forEach((ruko) => {
      expect(ruko.floorCount).toBe(2);
      expect(ruko.category).toBe('commercial');
      expect(ruko.rotationY).toBeCloseTo(Math.PI / 2, 4); // Facing East
      expect(ruko.wallColor).toBeDefined();
    });

    eastRukos.forEach((ruko) => {
      expect(ruko.floorCount).toBe(2);
      expect(ruko.category).toBe('commercial');
      expect(ruko.rotationY).toBeCloseTo(-Math.PI / 2, 4); // Facing West
      expect(ruko.wallColor).toBeDefined();
    });

    // Check matching commercial lots
    const commercialLots = data.lots.filter((l) => l.zone === 'commercial');
    expect(commercialLots.length).toBeGreaterThanOrEqual(westRukos.length + eastRukos.length);
  });

  it('features Kompleks Kepatihan with authentic Joglo Brunjung and eco-drainage', () => {
    const data = createMalioboroMapData();

    // Check Kepatihan public lot
    const kepatihanLot = data.lots.find((l) => l.id === 'lot_kepatihan_diy');
    expect(kepatihanLot).toBeDefined();
    expect(kepatihanLot?.areaM2).toBeGreaterThanOrEqual(2000);
    expect(kepatihanLot?.zone).toBe('public_facility');

    // Check Grand Joglo: Pendopo Ageng Kepatihan
    const joglo = data.buildings.find((b) => b.id === 'bld_joglo_kepatihan');
    expect(joglo).toBeDefined();
    expect(joglo?.presetKey).toBe('joglo');
    expect(joglo?.roofType).toBe('joglo');
    expect(joglo?.wallMaterial).toBe('wood');
    expect(joglo?.roofMaterial).toBe('clay_tile');
    expect(joglo?.lotId).toBe('lot_kepatihan_diy');

    // Check eco-drainage and green landscaping in Kepatihan
    const landscape = data.landscape || [];
    const lawnPatches = landscape.filter((item) => item.id.includes('kepatihan_lawn'));
    const kepatihanTrees = landscape.filter((item) => item.id.includes('tree_kepatihan'));
    const wells = landscape.filter((item) => item.type === 'well');
    const biopores = landscape.filter((item) => item.type === 'biopore');

    expect(lawnPatches.length).toBeGreaterThanOrEqual(4);
    expect(kepatihanTrees.length).toBeGreaterThanOrEqual(4);
    expect(wells.length).toBeGreaterThanOrEqual(2);
    expect(biopores.length).toBeGreaterThanOrEqual(4);
  });

  it('features Heritage Colonial buildings at Simpang Titik Nol Km', () => {
    const data = createMalioboroMapData();

    const heritageEast = data.buildings.find((b) => b.id === 'bld_heritage_nol_e');
    const heritageWest = data.buildings.find((b) => b.id === 'bld_heritage_nol_w');

    expect(heritageEast).toBeDefined();
    expect(heritageWest).toBeDefined();
    expect(heritageEast?.floorCount).toBe(2);
    expect(heritageWest?.floorCount).toBe(2);
    expect(heritageEast?.presetKey).toBe('house_2fl');
    expect(heritageWest?.presetKey).toBe('house_2fl');
  });
});
