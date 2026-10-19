import { CitySaveData, SerializedRoadNode, SerializedRoadEdge, SerializedBuilding, SerializedLot, SerializedLandscapeItem } from '../io/CitySerializer';

/**
 * MalioboroPreset.ts
 *
 * 100% Procedural & Declarative Generator for the iconic Jalan Malioboro Yogyakarta corridor.
 * Conforms to Arscity CitySaveData v2.0.0 schema.
 *
 * Features:
 * - Straight North-South arterial corridor (x = 0, z = -180 to 180) with pedestrian sidewalks and street trees.
 * - Side intersections: Jl. Sosrowijayan, Jl. Dagen, Jl. Suryatmajan (Kepatihan), Jl. Pajeksan, and Simpang Titik Nol.
 * - Commercial corridor: Dense 2-storey shophouses (Ruko) on West and East flanks.
 * - Cultural Heritage: Kompleks Kepatihan DIY featuring authentic Joglo Brunjung, sprawling green garden (KDH > 35%),
 *   shade trees, and eco-drainage (sumur resapan & biopori).
 * - Colonial/Heritage Hub: Dutch Indies heritage villas at the South intersection (Titik Nol Km).
 */
export function createMalioboroMapData(): CitySaveData {
  // 1. Road Nodes
  const nodes: SerializedRoadNode[] = [
    // Main Malioboro Corridor (North -> South along x = 0)
    { id: 'node_m_north', x: 0, y: 0, z: -180, connectedEdgeIds: ['edge_m_1'] },
    { id: 'node_m_sosro', x: 0, y: 0, z: -90, connectedEdgeIds: ['edge_m_1', 'edge_m_2', 'edge_sosro_w'] },
    { id: 'node_m_dagen', x: 0, y: 0, z: -20, connectedEdgeIds: ['edge_m_2', 'edge_m_3', 'edge_dagen_w'] },
    { id: 'node_m_kepatihan', x: 0, y: 0, z: 30, connectedEdgeIds: ['edge_m_3', 'edge_m_4', 'edge_kepatihan_e'] },
    { id: 'node_m_pajeksan', x: 0, y: 0, z: 90, connectedEdgeIds: ['edge_m_4', 'edge_m_5', 'edge_pajeksan_w'] },
    { id: 'node_m_nol', x: 0, y: 0, z: 180, connectedEdgeIds: ['edge_m_5', 'edge_nol_w', 'edge_nol_e'] },

    // Side branches
    { id: 'node_sosro_w', x: -60, y: 0, z: -90, connectedEdgeIds: ['edge_sosro_w'] },
    { id: 'node_dagen_w', x: -50, y: 0, z: -20, connectedEdgeIds: ['edge_dagen_w'] },
    { id: 'node_kepatihan_e', x: 80, y: 0, z: 30, connectedEdgeIds: ['edge_kepatihan_e'] },
    { id: 'node_pajeksan_w', x: -50, y: 0, z: 90, connectedEdgeIds: ['edge_pajeksan_w'] },
    { id: 'node_nol_w', x: -70, y: 0, z: 180, connectedEdgeIds: ['edge_nol_w'] },
    { id: 'node_nol_e', x: 70, y: 0, z: 180, connectedEdgeIds: ['edge_nol_e'] },
  ];

  // 2. Road Edges
  const edges: SerializedRoadEdge[] = [
    // Main Malioboro Segments (Arterial with sidewalk, trees & lighting)
    {
      id: 'edge_m_1',
      startNodeId: 'node_m_north',
      endNodeId: 'node_m_sosro',
      type: 'arterial',
      controlPoints: [[0, 0, -180], [0, 0, -90]],
      length: 90,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_m_2',
      startNodeId: 'node_m_sosro',
      endNodeId: 'node_m_dagen',
      type: 'arterial',
      controlPoints: [[0, 0, -90], [0, 0, -20]],
      length: 70,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_m_3',
      startNodeId: 'node_m_dagen',
      endNodeId: 'node_m_kepatihan',
      type: 'arterial',
      controlPoints: [[0, 0, -20], [0, 0, 30]],
      length: 50,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_m_4',
      startNodeId: 'node_m_kepatihan',
      endNodeId: 'node_m_pajeksan',
      type: 'arterial',
      controlPoints: [[0, 0, 30], [0, 0, 90]],
      length: 60,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_m_5',
      startNodeId: 'node_m_pajeksan',
      endNodeId: 'node_m_nol',
      type: 'arterial',
      controlPoints: [[0, 0, 90], [0, 0, 180]],
      length: 90,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },

    // Side road branches
    {
      id: 'edge_sosro_w',
      startNodeId: 'node_m_sosro',
      endNodeId: 'node_sosro_w',
      type: 'collector',
      controlPoints: [[0, 0, -90], [-60, 0, -90]],
      length: 60,
      customProfile: { hasTrees: false, hasStreetLights: true }
    },
    {
      id: 'edge_dagen_w',
      startNodeId: 'node_m_dagen',
      endNodeId: 'node_dagen_w',
      type: 'local',
      controlPoints: [[0, 0, -20], [-50, 0, -20]],
      length: 50,
      customProfile: { hasTrees: false, hasStreetLights: true }
    },
    {
      id: 'edge_kepatihan_e',
      startNodeId: 'node_m_kepatihan',
      endNodeId: 'node_kepatihan_e',
      type: 'collector',
      controlPoints: [[0, 0, 30], [80, 0, 30]],
      length: 80,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_pajeksan_w',
      startNodeId: 'node_m_pajeksan',
      endNodeId: 'node_pajeksan_w',
      type: 'local',
      controlPoints: [[0, 0, 90], [-50, 0, 90]],
      length: 50,
      customProfile: { hasTrees: false, hasStreetLights: true }
    },
    {
      id: 'edge_nol_w',
      startNodeId: 'node_m_nol',
      endNodeId: 'node_nol_w',
      type: 'arterial',
      controlPoints: [[0, 0, 180], [-70, 0, 180]],
      length: 70,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
    {
      id: 'edge_nol_e',
      startNodeId: 'node_m_nol',
      endNodeId: 'node_nol_e',
      type: 'arterial',
      controlPoints: [[0, 0, 180], [70, 0, 180]],
      length: 70,
      customProfile: { hasTrees: true, hasStreetLights: true }
    },
  ];

  // 3. Lots and Buildings Generator
  const lots: SerializedLot[] = [];
  const buildings: SerializedBuilding[] = [];

  // Helper for Ruko generation
  const wallColors = ['#f8fafc', '#f1f5f9', '#fef3c7', '#fde047', '#fed7aa', '#cbd5e1', '#e2e8f0'];

  // A. West side Corridor (facing East: rotationY = Math.PI / 2)
  // Featuring Pendopo Joglo Yogyakarta and Tropical Cafe KOPI & RASA at central view
  const westZs = [-155, -135, -115, -65, -45, 45, 65, 85, 105, 125];
  westZs.forEach((z, idx) => {
    const lotId = `lot_ruko_w_${idx + 1}`;
    const bldId = `bld_ruko_w_${idx + 1}`;
    const color = wallColors[idx % wallColors.length];

    lots.push({
      id: lotId,
      name: `Kavling Ruko Malioboro Barat #${idx + 1}`,
      zone: 'commercial',
      position: [-26, 0, z],
      width: 26,
      length: 18,
      areaM2: 468,
      gsbDistanceM: 5.0,
    });

    buildings.push({
      id: bldId,
      presetKey: 'ruko_3fl',
      name: `Ruko Malioboro Kulon #${idx + 1}`,
      category: 'commercial',
      position: [-26, 0, z],
      rotationY: Math.PI / 2, // Facing East towards Jl. Malioboro
      width: 8,
      length: 14,
      floorCount: 2,
      floorHeight: 4.5,
      roofType: 'flat',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: color,
      roofMaterial: 'concrete',
      lotId,
    });
  });

  // 1. SHOWCASE: Pendopo Joglo Yogyakarta (Left Corridor)
  const jogloLotId = 'lot_joglo_yogyakarta';
  lots.push({
    id: jogloLotId,
    name: 'Kavling Pendopo Joglo Yogyakarta',
    zone: 'public_facility',
    position: [-28, 0, -18],
    width: 32,
    length: 36,
    areaM2: 1152,
    gsbDistanceM: 4.5,
  });

  buildings.push({
    id: 'bld_joglo_yogyakarta',
    presetKey: 'joglo',
    name: 'Pendopo Joglo Yogyakarta',
    category: 'public',
    position: [-28, 0, -18],
    rotationY: Math.PI / 2,
    width: 18,
    length: 22,
    floorCount: 1,
    floorHeight: 5.2,
    roofType: 'joglo',
    roofOverhang: 2.2,
    wallMaterial: 'wood',
    wallColor: '#78350f',
    roofMaterial: 'clay_tile',
    lotId: jogloLotId,
  });

  // 2. SHOWCASE: Tropical Cafe "KOPI & RASA" (Center Corridor)
  const cafeLotId = 'lot_cafe_kopi_rasa';
  lots.push({
    id: cafeLotId,
    name: 'Kavling Tropical Cafe KOPI & RASA',
    zone: 'commercial',
    position: [-24, 0, 16],
    width: 26,
    length: 30,
    areaM2: 780,
    gsbDistanceM: 4.0,
  });

  buildings.push({
    id: 'bld_cafe_kopi_rasa',
    presetKey: 'cafe_minimalis_kaca',
    name: 'Tropical Cafe KOPI & RASA',
    category: 'commercial',
    position: [-24, 0, 16],
    rotationY: Math.PI / 2,
    width: 14,
    length: 18,
    floorCount: 1,
    floorHeight: 4.8,
    roofType: 'flat',
    roofOverhang: 1.5,
    wallMaterial: 'plaster',
    wallColor: '#ffffff',
    roofMaterial: 'metal',
    lotId: cafeLotId,
  });

  // B. East side Corridor (facing West: rotationY = -Math.PI / 2)
  // Featuring Industrial Noodle Restaurant "MIE NUSANTARA"
  const eastZs = [-155, -135, -115, -65, -45];
  eastZs.forEach((z, idx) => {
    const lotId = `lot_ruko_e_${idx + 1}`;
    const bldId = `bld_ruko_e_${idx + 1}`;
    const color = wallColors[(idx + 2) % wallColors.length];

    lots.push({
      id: lotId,
      name: `Kavling Ruko Malioboro Wetan #${idx + 1}`,
      zone: 'commercial',
      position: [26, 0, z],
      width: 26,
      length: 18,
      areaM2: 468,
      gsbDistanceM: 5.0,
    });

    buildings.push({
      id: bldId,
      presetKey: 'ruko_3fl',
      name: `Ruko Malioboro Wetan #${idx + 1}`,
      category: 'commercial',
      position: [26, 0, z],
      rotationY: -Math.PI / 2, // Facing West towards Jl. Malioboro
      width: 8,
      length: 14,
      floorCount: 2,
      floorHeight: 4.5,
      roofType: 'flat',
      roofOverhang: 0.6,
      wallMaterial: 'plaster',
      wallColor: color,
      roofMaterial: 'concrete',
      lotId,
    });
  });

  // 3. SHOWCASE: Industrial Noodle Restaurant "MIE NUSANTARA" (Right Corridor)
  const mieLotId = 'lot_mie_nusantara';
  lots.push({
    id: mieLotId,
    name: 'Kavling Resto MIE NUSANTARA',
    zone: 'commercial',
    position: [26, 0, 0],
    width: 30,
    length: 32,
    areaM2: 960,
    gsbDistanceM: 4.5,
  });

  buildings.push({
    id: 'bld_mie_nusantara',
    presetKey: 'resto_mie_gacoan',
    name: 'Resto MIE NUSANTARA',
    category: 'commercial',
    position: [26, 0, 0],
    rotationY: -Math.PI / 2,
    width: 16,
    length: 22,
    floorCount: 2,
    floorHeight: 4.5,
    roofType: 'flat',
    roofOverhang: 1.2,
    wallMaterial: 'plaster',
    wallColor: '#1e293b',
    roofMaterial: 'metal',
    lotId: mieLotId,
  });

  // C. Kompleks Kepatihan DIY (Middle East area: z = 30 to 75, x = 35 to 85)
  const kepatihanLotId = 'lot_kepatihan_diy';
  lots.push({
    id: kepatihanLotId,
    name: 'Kawasan Cagar Budaya Kepatihan DIY',
    zone: 'public_facility',
    position: [62, 0, 55],
    width: 56,
    length: 64,
    areaM2: 3584,
    gsbDistanceM: 6.0,
  });

  // Grand Joglo: Pendopo Ageng Kepatihan
  buildings.push({
    id: 'bld_joglo_kepatihan',
    presetKey: 'joglo',
    name: 'Pendopo Ageng Kepatihan DIY',
    category: 'public',
    position: [62, 0, 55],
    rotationY: 0,
    width: 20,
    length: 24,
    floorCount: 1,
    floorHeight: 5.5,
    roofType: 'joglo',
    roofOverhang: 2.2,
    wallMaterial: 'wood',
    wallColor: '#78350f',
    roofMaterial: 'clay_tile',
    lotId: kepatihanLotId,
  });

  // Secondary Pavilion: Bale Danunegaran
  buildings.push({
    id: 'bld_bale_kepatihan',
    presetKey: 'community_hall',
    name: 'Bale Pertemuan Danunegaran',
    category: 'public',
    position: [78, 0, 72],
    rotationY: 0,
    width: 14,
    length: 18,
    floorCount: 1,
    floorHeight: 4.5,
    roofType: 'hip',
    roofOverhang: 1.8,
    wallMaterial: 'wood',
    wallColor: '#854d0e',
    roofMaterial: 'clay_tile',
    lotId: kepatihanLotId,
  });

  // D. Simpang Titik Nol Km: Dutch Indies / Colonial Heritage Buildings
  // 1. Gedung Cagar Budaya Titik Nol Timur (ex Bank Indonesia / BNI 1946)
  const heritageEastLotId = 'lot_heritage_nol_e';
  lots.push({
    id: heritageEastLotId,
    name: 'Kavling Cagar Budaya Titik Nol Timur',
    zone: 'public_facility',
    position: [38, 0, 160],
    width: 32,
    length: 32,
    areaM2: 1024,
    gsbDistanceM: 5.0,
  });

  buildings.push({
    id: 'bld_heritage_nol_e',
    presetKey: 'house_2fl',
    name: 'Gedung Cagar Budaya Titik Nol (Heritage Kolonial)',
    category: 'public',
    position: [38, 0, 160],
    rotationY: -Math.PI / 2,
    width: 16,
    length: 22,
    floorCount: 2,
    floorHeight: 4.5,
    roofType: 'hip',
    roofOverhang: 1.5,
    wallMaterial: 'plaster',
    wallColor: '#ffffff',
    roofMaterial: 'clay_tile',
    lotId: heritageEastLotId,
  });

  // 2. Gedung Heritage Barat (ex Kantor Pos Besar Yogyakarta)
  const heritageWestLotId = 'lot_heritage_nol_w';
  lots.push({
    id: heritageWestLotId,
    name: 'Kavling Cagar Budaya Titik Nol Barat',
    zone: 'public_facility',
    position: [-38, 0, 160],
    width: 32,
    length: 32,
    areaM2: 1024,
    gsbDistanceM: 5.0,
  });

  buildings.push({
    id: 'bld_heritage_nol_w',
    presetKey: 'house_2fl',
    name: 'Gedung Pos Heritage Titik Nol',
    category: 'public',
    position: [-38, 0, 160],
    rotationY: Math.PI / 2,
    width: 16,
    length: 22,
    floorCount: 2,
    floorHeight: 4.5,
    roofType: 'hip',
    roofOverhang: 1.5,
    wallMaterial: 'plaster',
    wallColor: '#f8fafc',
    roofMaterial: 'clay_tile',
    lotId: heritageWestLotId,
  });

  // 4. Landscape Items (Trees, Gardens, Infiltration Wells, Biopores)
  const landscape: SerializedLandscapeItem[] = [
    // Kepatihan Green Courtyard (High KDH > 35%, exemplary tropical architecture)
    { id: 'land_kepatihan_lawn_1', type: 'grass_patch', position: [44, 0, 44], scale: 12 },
    { id: 'land_kepatihan_lawn_2', type: 'grass_patch', position: [66, 0, 44], scale: 12 },
    { id: 'land_kepatihan_lawn_3', type: 'grass_patch', position: [44, 0, 66], scale: 12 },
    { id: 'land_kepatihan_lawn_4', type: 'grass_patch', position: [66, 0, 66], scale: 12 },

    // Big shade trees (Pohon Peneduh Trembesi / Beringin) around Kepatihan
    { id: 'land_tree_kepatihan_1', type: 'tree', position: [38, 0, 38], radius: 3.5 },
    { id: 'land_tree_kepatihan_2', type: 'tree', position: [72, 0, 38], radius: 3.5 },
    { id: 'land_tree_kepatihan_3', type: 'tree', position: [38, 0, 72], radius: 3.5 },
    { id: 'land_tree_kepatihan_4', type: 'tree', position: [72, 0, 72], radius: 3.5 },
    { id: 'land_tree_kepatihan_5', type: 'tree', position: [55, 0, 36], radius: 3.0 },

    // Eco-Drainage: Sumur Resapan & Biopori in Kepatihan Complex
    { id: 'land_well_kepatihan_1', type: 'well', position: [40, 0, 42], radius: 1.0 },
    { id: 'land_well_kepatihan_2', type: 'well', position: [70, 0, 68], radius: 1.0 },
    { id: 'land_biopore_1', type: 'biopore', position: [42, 0, 50], radius: 0.3 },
    { id: 'land_biopore_2', type: 'biopore', position: [46, 0, 52], radius: 0.3 },
    { id: 'land_biopore_3', type: 'biopore', position: [64, 0, 50], radius: 0.3 },
    { id: 'land_biopore_4', type: 'biopore', position: [68, 0, 52], radius: 0.3 },

    // Malioboro Pedestrian Corridor Street Trees (Peneduh Jalan)
    { id: 'land_tree_m_1', type: 'tree', position: [-8, 0, -140], radius: 2.2 },
    { id: 'land_tree_m_2', type: 'tree', position: [8, 0, -140], radius: 2.2 },
    { id: 'land_tree_m_3', type: 'tree', position: [-8, 0, -100], radius: 2.2 },
    { id: 'land_tree_m_4', type: 'tree', position: [8, 0, -100], radius: 2.2 },
    { id: 'land_tree_m_5', type: 'tree', position: [-8, 0, -40], radius: 2.2 },
    { id: 'land_tree_m_6', type: 'tree', position: [8, 0, -40], radius: 2.2 },
    { id: 'land_tree_m_7', type: 'tree', position: [-8, 0, 20], radius: 2.2 },
    { id: 'land_tree_m_8', type: 'tree', position: [8, 0, 20], radius: 2.2 },
    { id: 'land_tree_m_9', type: 'tree', position: [-8, 0, 80], radius: 2.2 },
    { id: 'land_tree_m_10', type: 'tree', position: [8, 0, 80], radius: 2.2 },
    { id: 'land_tree_m_11', type: 'tree', position: [-8, 0, 140], radius: 2.2 },
    { id: 'land_tree_m_12', type: 'tree', position: [8, 0, 140], radius: 2.2 },

    // Titik Nol Km Heritage landscaping
    { id: 'land_tree_nol_e', type: 'tree', position: [24, 0, 160], radius: 3.0 },
    { id: 'land_tree_nol_w', type: 'tree', position: [-24, 0, 160], radius: 3.0 },
    { id: 'land_lawn_nol_e', type: 'grass_patch', position: [26, 0, 162], scale: 6 },
    { id: 'land_lawn_nol_w', type: 'grass_patch', position: [-26, 0, 162], scale: 6 },

    // SHOWCASE: Joglo Yogyakarta Lush Courtyard & Stepping Stones
    { id: 'land_joglo_lawn', type: 'grass_patch', position: [-28, 0, -18], scale: 22 },
    { id: 'land_joglo_tree_1', type: 'tree', position: [-38, 0, -8], radius: 3.4 },
    { id: 'land_joglo_tree_2', type: 'tree', position: [-38, 0, -28], radius: 3.2 },
    { id: 'land_joglo_shrub_1', type: 'shrub' as any, position: [-18, 0, -12], scale: 1 },
    { id: 'land_joglo_shrub_2', type: 'shrub' as any, position: [-18, 0, -24], scale: 1 },
    { id: 'land_joglo_shrub_3', type: 'shrub' as any, position: [-36, 0, -14], scale: 1 },
    { id: 'land_joglo_shrub_4', type: 'shrub' as any, position: [-36, 0, -22], scale: 1 },
    { id: 'land_joglo_stone_1', type: 'stepping_stones' as any, position: [-16, 0, -18], scale: 1 },
    { id: 'land_joglo_stone_2', type: 'stepping_stones' as any, position: [-14.5, 0, -18], scale: 1 },
    { id: 'land_joglo_stone_3', type: 'stepping_stones' as any, position: [-13, 0, -18], scale: 1 },

    // SHOWCASE: Tropical Cafe "KOPI & RASA" Outdoor Garden
    { id: 'land_cafe_lawn', type: 'grass_patch', position: [-24, 0, 16], scale: 20 },
    { id: 'land_cafe_tree_1', type: 'tree', position: [-34, 0, 24], radius: 3.0 },
    { id: 'land_cafe_shrub_1', type: 'shrub' as any, position: [-16, 0, 9], scale: 1 },
    { id: 'land_cafe_shrub_2', type: 'shrub' as any, position: [-16, 0, 23], scale: 1 },
    { id: 'land_cafe_shrub_3', type: 'shrub' as any, position: [-32, 0, 10], scale: 1 },

    // SHOWCASE: Resto "MIE NUSANTARA" Green Boundary
    { id: 'land_mie_lawn', type: 'grass_patch', position: [26, 0, 0], scale: 22 },
    { id: 'land_mie_shrub_1', type: 'shrub' as any, position: [17, 0, -10], scale: 1 },
    { id: 'land_mie_shrub_2', type: 'shrub' as any, position: [17, 0, 10], scale: 1 },
    { id: 'land_mie_tree_1', type: 'tree', position: [36, 0, 12], radius: 2.8 },
  ];

  return {
    version: '2.0.0',
    cityTitle: 'Koridor Malioboro Yogyakarta',
    timestamp: Date.now(),
    environment: {
      timeOfDay: 16.5, // 16:30 WIB golden hour afternoon sun
      dayOfYear: 172,  // June solstice (Yogyakarta latitude -7.80° LS)
      weather: 'clear',
    },
    roads: {
      nodes,
      edges,
    },
    buildings,
    lots,
    landscape,
    displaySettings: {},
  };
}
