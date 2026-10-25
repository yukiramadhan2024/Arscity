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

  // 4. Landscape Items (Iconic Placemaking, Flora Nusantara, Statues, Lighting, Eco-Drainage)
  const landscape: SerializedLandscapeItem[] = [
    // ----------------------------------------------------
    // NORTH CORRIDOR APEX: TUGU PAL PUTIH YOGYAKARTA
    // ----------------------------------------------------
    { id: 'land_tugu_jogja', type: 'monument_tugu_jogja', position: [0, 0, -185], width: 4.5, length: 4.5, radius: 2.5 },

    // ----------------------------------------------------
    // MALIOBORO PEDESTRIAN SIDEWALK FLANKS (x = -8 and x = 8)
    // Featuring alternating Tabebuya Pink/Gold, Asem Jawa, Bollards, & Festoon Lights
    // ----------------------------------------------------
    // West Sidewalk (x = -8)
    { id: 'land_tree_w_1', type: 'tree_tabebuya_pink', position: [-8, 0, -150], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_1', type: 'street_malioboro_bollards', position: [-8, 0, -135], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_2', type: 'tree_asam_jawa', position: [-8, 0, -115], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_festoon_w_1', type: 'street_festoon_lights', position: [-8, 0, -95], width: 8.0, length: 2.0 },
    { id: 'land_tree_w_3', type: 'tree_tabebuya_gold', position: [-8, 0, -75], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_2', type: 'street_malioboro_bollards', position: [-8, 0, -55], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_4', type: 'tree_tabebuya_pink', position: [-8, 0, -35], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_tree_w_5', type: 'tree_asam_jawa', position: [-8, 0, 10], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_w_3', type: 'street_malioboro_bollards', position: [-8, 0, 35], width: 4.0, length: 2.0 },
    { id: 'land_festoon_w_2', type: 'street_festoon_lights', position: [-8, 0, 55], width: 8.0, length: 2.0 },
    { id: 'land_tree_w_6', type: 'tree_tabebuya_gold', position: [-8, 0, 75], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_4', type: 'street_malioboro_bollards', position: [-8, 0, 110], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_7', type: 'tree_tabebuya_pink', position: [-8, 0, 135], width: 5.5, length: 5.5, radius: 2.8 },

    // East Sidewalk (x = 8)
    { id: 'land_tree_e_1', type: 'tree_tabebuya_gold', position: [8, 0, -150], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_e_1', type: 'street_malioboro_bollards', position: [8, 0, -135], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_2', type: 'tree_tabebuya_pink', position: [8, 0, -115], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_festoon_e_1', type: 'street_festoon_lights', position: [8, 0, -95], width: 8.0, length: 2.0 },
    { id: 'land_tree_e_3', type: 'tree_asam_jawa', position: [8, 0, -75], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_e_2', type: 'street_malioboro_bollards', position: [8, 0, -55], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_4', type: 'tree_tabebuya_gold', position: [8, 0, -35], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_tree_e_5', type: 'tree_tabebuya_pink', position: [8, 0, 10], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_e_3', type: 'street_malioboro_bollards', position: [8, 0, 35], width: 4.0, length: 2.0 },
    { id: 'land_festoon_e_2', type: 'street_festoon_lights', position: [8, 0, 55], width: 8.0, length: 2.0 },
    { id: 'land_tree_e_6', type: 'tree_asam_jawa', position: [8, 0, 75], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_e_4', type: 'street_malioboro_bollards', position: [8, 0, 110], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_7', type: 'tree_tabebuya_gold', position: [8, 0, 135], width: 5.5, length: 5.5, radius: 2.8 },

    // ----------------------------------------------------
    // KOMPLEKS KEPATIHAN DIY (CULTURAL & HERITAGE SANCTUARY)
    // ----------------------------------------------------
    { id: 'land_candi_bentar_kepatihan', type: 'gate_candi_bentar', position: [28, 0, 30], width: 6.0, length: 2.5 },
    { id: 'land_beringin_kurung', type: 'tree_banyan_kurung', position: [55, 0, 55], width: 14.0, length: 14.0, radius: 7.0 },
    { id: 'land_wayang_corten_kepatihan', type: 'sculpture_wayang_corten', position: [38, 0, 32], width: 3.0, length: 1.5 },
    { id: 'land_lotus_kepatihan', type: 'flora_lotus_water', position: [55, 0, 38], width: 6.0, length: 6.0, radius: 3.0 },
    { id: 'land_gazebo_kepatihan', type: 'pavilion_garden_gazebo', position: [72, 0, 38], width: 4.5, length: 4.5 },
    { id: 'land_bamboo_kepatihan', type: 'flora_yellow_bamboo', position: [36, 0, 70], width: 4.0, length: 2.0 },
    { id: 'land_lanterns_kepatihan', type: 'street_garden_lanterns', position: [42, 0, 35], width: 3.0, length: 1.5 },
    { id: 'land_tree_flamboyan_kepatihan', type: 'tree_flamboyan', position: [72, 0, 72], width: 8.0, length: 8.0, radius: 4.0 },

    // Kepatihan Green Courtyard Lawns, Trees & Eco-Drainage
    { id: 'land_kepatihan_lawn_1', type: 'grass_garden', position: [44, 0, 44], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_2', type: 'grass_garden', position: [66, 0, 44], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_3', type: 'grass_garden', position: [44, 0, 66], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_4', type: 'grass_garden', position: [66, 0, 66], width: 12, length: 12 },
    { id: 'land_tree_kepatihan_1', type: 'tree_banyan_kurung', position: [38, 0, 38], width: 10.0, length: 10.0, radius: 5.0 },
    { id: 'land_tree_kepatihan_2', type: 'tree_flamboyan', position: [72, 0, 38], width: 8.0, length: 8.0, radius: 4.0 },
    { id: 'land_tree_kepatihan_3', type: 'tree_tabebuya_pink', position: [38, 0, 72], width: 6.0, length: 6.0, radius: 3.0 },
    { id: 'land_tree_kepatihan_4', type: 'tree_asam_jawa', position: [72, 0, 72], width: 7.0, length: 7.0, radius: 3.5 },
    { id: 'land_well_kepatihan_1', type: 'well', position: [40, 0, 42], radius: 1.0 },
    { id: 'land_well_kepatihan_2', type: 'well', position: [70, 0, 68], radius: 1.0 },
    { id: 'land_biopore_1', type: 'biopore', position: [42, 0, 50], radius: 0.3 },
    { id: 'land_biopore_2', type: 'biopore', position: [46, 0, 52], radius: 0.3 },
    { id: 'land_biopore_3', type: 'biopore', position: [64, 0, 50], radius: 0.3 },
    { id: 'land_biopore_4', type: 'biopore', position: [68, 0, 52], radius: 0.3 },

    // ----------------------------------------------------
    // TITIK NOL KILOMETER & GEDUNG HERITAGE CIVIC PLAZA
    // ----------------------------------------------------
    { id: 'land_fountain_nol', type: 'fountain_reflecting_pool', position: [24, 0, 168], width: 8.0, length: 8.0, radius: 4.0 },
    { id: 'land_kinetic_nol', type: 'sculpture_kinetic_steel', position: [-24, 0, 168], width: 3.5, length: 3.5 },
    { id: 'land_clock_tower_nol', type: 'monument_clock_tower', position: [30, 0, 185], width: 3.5, length: 3.5 },
    { id: 'land_amphitheater_nol', type: 'plaza_mini_amphitheater', position: [-30, 0, 185], width: 12.0, length: 12.0, radius: 6.0 },
    { id: 'land_pergola_nol', type: 'street_timber_pergola', position: [-24, 0, 148], width: 6.0, length: 4.0 },
    { id: 'land_deck_nol', type: 'waterfront_wood_deck', position: [24, 0, 148], width: 6.0, length: 4.0 },
    { id: 'land_candi_stone_nol', type: 'sculpture_candi_stone', position: [15, 0, 175], width: 2.0, length: 2.0 },

    // ----------------------------------------------------
    // JOGLO COURTYARD & TROPICAL CAFE HIGHLIGHTS
    // ----------------------------------------------------
    { id: 'land_frangipani_joglo', type: 'tree_frangipani', position: [-38, 0, -8], width: 4.0, length: 4.0, radius: 2.0 },
    { id: 'land_bambusa_joglo', type: 'flora_yellow_bamboo', position: [-38, 0, -28], width: 4.0, length: 2.0 },
    { id: 'land_arch_cafe', type: 'flora_bougainvillea_arch', position: [-20, 0, 16], width: 3.0, length: 4.0 },
    { id: 'land_frangipani_cafe', type: 'tree_frangipani', position: [-34, 0, 24], width: 4.0, length: 4.0, radius: 2.0 }
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
