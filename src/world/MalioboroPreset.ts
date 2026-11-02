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

  // Parametric corridor configuration for Malioboro urban blocks (T1.3)
  const config = {
    corridorZStart: -180,
    corridorZEnd: 180,
    arterialWidth: 26,
    sidewalkWidth: 5.5,
    frontSetback: 5.0,
    lotWidth: 12,
    lotDepth: 24,
    rukoWidth: 8,
    rukoLength: 14,
  };

  // Helper to compute parametric slot positions along corridor outside exclusion zones
  const computeParametricSlots = (
    zStart: number,
    zEnd: number,
    exclusions: { zMin: number; zMax: number }[],
    spacing: number,
    width: number
  ): number[] => {
    const slots: number[] = [];
    const half = width / 2;
    let z = zStart + spacing * 0.5;
    while (z <= zEnd - spacing * 0.5) {
      const zMin = z - half;
      const zMax = z + half;
      const collides = exclusions.some((ex) => !(zMax < ex.zMin || zMin > ex.zMax));
      if (!collides) {
        slots.push(Math.round(z));
        z += spacing;
      } else {
        z += 2.0;
      }
    }
    return slots;
  };

  // A. West side Corridor (facing East: rotationY = Math.PI / 2)
  // Side roads on West:
  // - Jl. Sosrowijayan (center -90, width 16 -> [-98, -82], buffer -> [-102, -78])
  // - Jl. Dagen (center -20, width 9 -> [-24.5, -15.5], buffer -> [-27, -13])
  // - Jl. Pajeksan (center 90, width 9 -> [85.5, 94.5], buffer -> [82, 98])
  // Showcase West:
  // - Pendopo Joglo Yogyakarta (center [-42, 0, -48], width 18, length 22, rot PI/2 -> Z [-57, -39], buffer -> [-59, -37])
  // - Tropical Cafe KOPI & RASA (center [-35, 0, 16], width 14, length 18, rot PI/2 -> Z [9, 23], buffer -> [7, 25])
  // - Gedung Pos Heritage Barat (center [-42, 0, 138], width 16, length 22, rot PI/2 -> Z [130, 146], buffer -> [127, 149])
  const westExclusions = [
    { zMin: -180, zMax: -168 },
    { zMin: -102, zMax: -78 }, // Jl. Sosrowijayan
    { zMin: -59, zMax: -37 },  // Pendopo Joglo Yogyakarta
    { zMin: -27, zMax: -13 },  // Jl. Dagen
    { zMin: 7, zMax: 25 },     // Cafe KOPI & RASA
    { zMin: 82, zMax: 98 },    // Jl. Pajeksan
    { zMin: 127, zMax: 149 },  // Gedung Pos Heritage Barat
    { zMin: 162, zMax: 180 },  // Titik Nol intersection
  ];

  const westZs = computeParametricSlots(
    config.corridorZStart,
    config.corridorZEnd,
    westExclusions,
    13,
    config.rukoWidth
  );

  westZs.forEach((z, idx) => {
    const lotId = `lot_ruko_w_${idx + 1}`;
    const bldId = `bld_ruko_w_${idx + 1}`;
    const color = wallColors[idx % wallColors.length];

    lots.push({
      id: lotId,
      name: `Kavling Ruko Malioboro Barat #${idx + 1}`,
      zone: 'commercial',
      position: [-35, 0, z],
      width: config.lotDepth,
      length: config.lotWidth,
      areaM2: config.lotDepth * config.lotWidth,
      gsbDistanceM: config.frontSetback,
    });

    buildings.push({
      id: bldId,
      presetKey: 'ruko_3fl',
      name: `Ruko Malioboro Kulon #${idx + 1}`,
      category: 'commercial',
      position: [-35, 0, z],
      rotationY: Math.PI / 2, // Facing East towards Jl. Malioboro
      width: config.rukoWidth,
      length: config.rukoLength,
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
    position: [-42, 0, -48],
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
    position: [-42, 0, -48],
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
    position: [-35, 0, 16],
    width: 26,
    length: 28,
    areaM2: 728,
    gsbDistanceM: 4.0,
  });

  buildings.push({
    id: 'bld_cafe_kopi_rasa',
    presetKey: 'cafe_minimalis_kaca',
    name: 'Tropical Cafe KOPI & RASA',
    category: 'commercial',
    position: [-35, 0, 16],
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
  // Side roads on East:
  // - Jl. Suryatmajan / Kepatihan (center z = 30, width 16 -> [22, 38], buffer -> [18, 42])
  // Showcase East:
  // - Resto MIE NUSANTARA (center [36, 0, -4], width 16, length 20, rot -PI/2 -> Z [-12, 4], buffer -> [-15, 7])
  // - Kompleks Kepatihan DIY frontage along Jl. Malioboro ([45, 95])
  // - Gedung Cagar Budaya Titik Nol Timur (center [42, 0, 138], width 16, length 22, rot -PI/2 -> Z [130, 146], buffer -> [127, 149])
  const eastExclusions = [
    { zMin: -180, zMax: -168 },
    { zMin: -15, zMax: 7 },    // Resto MIE NUSANTARA
    { zMin: 18, zMax: 42 },    // Jl. Kepatihan
    { zMin: 55, zMax: 95 },    // Kompleks Kepatihan front
    { zMin: 127, zMax: 149 },  // Gedung Heritage Nol Timur
    { zMin: 162, zMax: 180 },  // Titik Nol intersection
  ];

  const eastZs = computeParametricSlots(
    config.corridorZStart,
    config.corridorZEnd,
    eastExclusions,
    15,
    config.rukoWidth
  );

  eastZs.forEach((z, idx) => {
    const lotId = `lot_ruko_e_${idx + 1}`;
    const bldId = `bld_ruko_e_${idx + 1}`;
    const color = wallColors[(idx + 2) % wallColors.length];

    lots.push({
      id: lotId,
      name: `Kavling Ruko Malioboro Wetan #${idx + 1}`,
      zone: 'commercial',
      position: [35, 0, z],
      width: config.lotDepth,
      length: config.lotWidth,
      areaM2: config.lotDepth * config.lotWidth,
      gsbDistanceM: config.frontSetback,
    });

    buildings.push({
      id: bldId,
      presetKey: 'ruko_3fl',
      name: `Ruko Malioboro Wetan #${idx + 1}`,
      category: 'commercial',
      position: [35, 0, z],
      rotationY: -Math.PI / 2, // Facing West towards Jl. Malioboro
      width: config.rukoWidth,
      length: config.rukoLength,
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
    position: [36, 0, -4],
    width: 26,
    length: 28,
    areaM2: 728,
    gsbDistanceM: 4.5,
  });

  buildings.push({
    id: 'bld_mie_nusantara',
    presetKey: 'resto_mie_gacoan',
    name: 'Resto MIE NUSANTARA',
    category: 'commercial',
    position: [36, 0, -4],
    rotationY: -Math.PI / 2,
    width: 16,
    length: 20,
    floorCount: 2,
    floorHeight: 4.5,
    roofType: 'flat',
    roofOverhang: 1.2,
    wallMaterial: 'plaster',
    wallColor: '#1e293b',
    roofMaterial: 'metal',
    lotId: mieLotId,
  });

  // C. Kompleks Kepatihan DIY (Middle East area: South of Jl. Kepatihan z = 30)
  const kepatihanLotId = 'lot_kepatihan_diy';
  lots.push({
    id: kepatihanLotId,
    name: 'Kawasan Cagar Budaya Kepatihan DIY',
    zone: 'public_facility',
    position: [75, 0, 75],
    width: 60,
    length: 50,
    areaM2: 3000,
    gsbDistanceM: 6.0,
  });

  // Grand Joglo: Pendopo Ageng Kepatihan
  buildings.push({
    id: 'bld_joglo_kepatihan',
    presetKey: 'joglo',
    name: 'Pendopo Ageng Kepatihan DIY',
    category: 'public',
    position: [68, 0, 75],
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

  // Secondary Pavilion: Bale Danunegaran (repositioned to x = 90 with 5m clearance from Pendopo Ageng)
  buildings.push({
    id: 'bld_bale_kepatihan',
    presetKey: 'community_hall',
    name: 'Bale Pertemuan Danunegaran',
    category: 'public',
    position: [90, 0, 75],
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

  // D. Simpang Titik Nol Km: Dutch Indies / Colonial Heritage Buildings (North of Titik Nol road z = 180)
  // 1. Gedung Cagar Budaya Titik Nol Timur (ex Bank Indonesia / BNI 1946)
  const heritageEastLotId = 'lot_heritage_nol_e';
  lots.push({
    id: heritageEastLotId,
    name: 'Kavling Cagar Budaya Titik Nol Timur',
    zone: 'public_facility',
    position: [42, 0, 138],
    width: 30,
    length: 30,
    areaM2: 900,
    gsbDistanceM: 5.0,
  });

  buildings.push({
    id: 'bld_heritage_nol_e',
    presetKey: 'house_2fl',
    name: 'Gedung Cagar Budaya Titik Nol (Heritage Kolonial)',
    category: 'public',
    position: [42, 0, 138],
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
    position: [-42, 0, 138],
    width: 30,
    length: 30,
    areaM2: 900,
    gsbDistanceM: 5.0,
  });

  buildings.push({
    id: 'bld_heritage_nol_w',
    presetKey: 'house_2fl',
    name: 'Gedung Pos Heritage Titik Nol',
    category: 'public',
    position: [-42, 0, 138],
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
  // All items placed strictly on the pedestrian sidewalks (x = -16 and x = 16) or dedicated plazas
  const landscape: SerializedLandscapeItem[] = [
    // ----------------------------------------------------
    // NORTH CORRIDOR APEX: TUGU PAL PUTIH YOGYAKARTA (Placed outside road node at z = -185)
    // ----------------------------------------------------
    { id: 'land_tugu_jogja', type: 'monument_tugu_jogja', position: [0, 0, -185], width: 4.5, length: 4.5, radius: 2.5 },

    // ----------------------------------------------------
    // MALIOBORO PEDESTRIAN SIDEWALK FLANKS (x = -16 and x = 16)
    // Sidewalk extends from |x| = 13.0m to 18.5m; center of sidewalk is at |x| = 16.0m
    // ----------------------------------------------------
    // West Sidewalk (x = -16)
    { id: 'land_tree_w_1', type: 'tree_tabebuya_pink', position: [-16, 0, -150], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_1', type: 'street_malioboro_bollards', position: [-16, 0, -135], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_2', type: 'tree_asam_jawa', position: [-16, 0, -115], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_festoon_w_1', type: 'street_festoon_lights', position: [-16, 0, -105], width: 8.0, length: 2.0 },
    { id: 'land_tree_w_3', type: 'tree_tabebuya_gold', position: [-16, 0, -75], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_2', type: 'street_malioboro_bollards', position: [-16, 0, -55], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_4', type: 'tree_tabebuya_pink', position: [-16, 0, -35], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_tree_w_5', type: 'tree_asam_jawa', position: [-16, 0, 5], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_w_3', type: 'street_malioboro_bollards', position: [-16, 0, 45], width: 4.0, length: 2.0 },
    { id: 'land_festoon_w_2', type: 'street_festoon_lights', position: [-16, 0, 60], width: 8.0, length: 2.0 },
    { id: 'land_tree_w_6', type: 'tree_tabebuya_gold', position: [-16, 0, 75], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_w_4', type: 'street_malioboro_bollards', position: [-16, 0, 105], width: 4.0, length: 2.0 },
    { id: 'land_tree_w_7', type: 'tree_asam_jawa', position: [-16, 0, 135], width: 6.0, length: 6.0, radius: 3.2 },

    // East Sidewalk (x = 16)
    { id: 'land_tree_e_1', type: 'tree_tabebuya_gold', position: [16, 0, -150], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_bollard_e_1', type: 'street_malioboro_bollards', position: [16, 0, -135], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_2', type: 'tree_tabebuya_pink', position: [16, 0, -115], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_festoon_e_1', type: 'street_festoon_lights', position: [16, 0, -105], width: 8.0, length: 2.0 },
    { id: 'land_tree_e_3', type: 'tree_asam_jawa', position: [16, 0, -75], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_e_2', type: 'street_malioboro_bollards', position: [16, 0, -55], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_4', type: 'tree_tabebuya_gold', position: [16, 0, -35], width: 5.5, length: 5.5, radius: 2.8 },
    { id: 'land_tree_e_5', type: 'tree_asam_jawa', position: [16, 0, 5], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_e_3', type: 'street_malioboro_bollards', position: [16, 0, 48], width: 4.0, length: 2.0 },
    { id: 'land_festoon_e_2', type: 'street_festoon_lights', position: [16, 0, 65], width: 8.0, length: 2.0 },
    { id: 'land_tree_e_6', type: 'tree_asam_jawa', position: [16, 0, 75], width: 6.0, length: 6.0, radius: 3.2 },
    { id: 'land_bollard_e_4', type: 'street_malioboro_bollards', position: [16, 0, 105], width: 4.0, length: 2.0 },
    { id: 'land_tree_e_7', type: 'tree_tabebuya_gold', position: [16, 0, 135], width: 5.5, length: 5.5, radius: 2.8 },

    // ----------------------------------------------------
    // KOMPLEKS KEPATIHAN DIY (CULTURAL & HERITAGE SANCTUARY)
    // ----------------------------------------------------
    { id: 'land_candi_bentar_kepatihan', type: 'gate_candi_bentar', position: [35, 0, 48], width: 6.0, length: 2.5 },
    { id: 'land_beringin_kurung', type: 'tree_banyan_kurung', position: [60, 0, 75], width: 14.0, length: 14.0, radius: 7.0 },
    { id: 'land_wayang_corten_kepatihan', type: 'sculpture_wayang_corten', position: [42, 0, 52], width: 3.0, length: 1.5 },
    { id: 'land_lotus_kepatihan', type: 'flora_lotus_water', position: [60, 0, 58], width: 6.0, length: 6.0, radius: 3.0 },
    { id: 'land_gazebo_kepatihan', type: 'pavilion_garden_gazebo', position: [75, 0, 58], width: 4.5, length: 4.5 },
    { id: 'land_bamboo_kepatihan', type: 'flora_yellow_bamboo', position: [40, 0, 85], width: 4.0, length: 2.0 },
    { id: 'land_lanterns_kepatihan', type: 'street_garden_lanterns', position: [44, 0, 54], width: 3.0, length: 1.5 },
    { id: 'land_tree_flamboyan_kepatihan', type: 'tree_flamboyan', position: [75, 0, 85], width: 8.0, length: 8.0, radius: 4.0 },

    // Kepatihan Green Courtyard Lawns, Trees & Eco-Drainage
    { id: 'land_kepatihan_lawn_1', type: 'grass_garden', position: [50, 0, 60], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_2', type: 'grass_garden', position: [72, 0, 60], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_3', type: 'grass_garden', position: [50, 0, 80], width: 12, length: 12 },
    { id: 'land_kepatihan_lawn_4', type: 'grass_garden', position: [72, 0, 80], width: 12, length: 12 },
    { id: 'land_tree_kepatihan_1', type: 'tree_banyan_kurung', position: [44, 0, 60], width: 10.0, length: 10.0, radius: 5.0 },
    { id: 'land_tree_kepatihan_2', type: 'tree_flamboyan', position: [78, 0, 60], width: 8.0, length: 8.0, radius: 4.0 },
    { id: 'land_tree_kepatihan_3', type: 'tree_tabebuya_pink', position: [44, 0, 85], width: 6.0, length: 6.0, radius: 3.0 },
    { id: 'land_tree_kepatihan_4', type: 'tree_asam_jawa', position: [78, 0, 85], width: 7.0, length: 7.0, radius: 3.5 },
    { id: 'land_well_kepatihan_1', type: 'well', position: [48, 0, 52], radius: 1.0 },
    { id: 'land_well_kepatihan_2', type: 'well', position: [76, 0, 72], radius: 1.0 },
    { id: 'land_biopore_1', type: 'biopore', position: [48, 0, 56], radius: 0.3 },
    { id: 'land_biopore_2', type: 'biopore', position: [52, 0, 56], radius: 0.3 },
    { id: 'land_biopore_3', type: 'biopore', position: [70, 0, 56], radius: 0.3 },
    { id: 'land_biopore_4', type: 'biopore', position: [74, 0, 56], radius: 0.3 },

    // ----------------------------------------------------
    // TITIK NOL KILOMETER & GEDUNG HERITAGE CIVIC PLAZA
    // Placed safely away from Jl. Malioboro (x = 0) and Jl. Titik Nol (z = 180)
    // ----------------------------------------------------
    { id: 'land_fountain_nol', type: 'fountain_reflecting_pool', position: [26, 0, 145], width: 8.0, length: 8.0, radius: 4.0 },
    { id: 'land_kinetic_nol', type: 'sculpture_kinetic_steel', position: [-26, 0, 145], width: 3.5, length: 3.5 },
    { id: 'land_clock_tower_nol', type: 'monument_clock_tower', position: [32, 0, 205], width: 3.5, length: 3.5 },
    { id: 'land_amphitheater_nol', type: 'plaza_mini_amphitheater', position: [-32, 0, 205], width: 12.0, length: 12.0, radius: 6.0 },
    { id: 'land_pergola_nol', type: 'street_timber_pergola', position: [-28, 0, 145], width: 6.0, length: 4.0 },
    { id: 'land_deck_nol', type: 'waterfront_wood_deck', position: [28, 0, 145], width: 6.0, length: 4.0 },
    { id: 'land_candi_stone_nol', type: 'sculpture_candi_stone', position: [22, 0, 205], width: 2.0, length: 2.0 },

    // ----------------------------------------------------
    // JOGLO COURTYARD & TROPICAL CAFE HIGHLIGHTS
    // ----------------------------------------------------
    { id: 'land_frangipani_joglo', type: 'tree_frangipani', position: [-40, 0, -42], width: 4.0, length: 4.0, radius: 2.0 },
    { id: 'land_bambusa_joglo', type: 'flora_yellow_bamboo', position: [-40, 0, -56], width: 4.0, length: 2.0 },
    { id: 'land_arch_cafe', type: 'flora_bougainvillea_arch', position: [-28, 0, 16], width: 3.0, length: 4.0 },
    { id: 'land_frangipani_cafe', type: 'tree_frangipani', position: [-38, 0, 24], width: 4.0, length: 4.0, radius: 2.0 }
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
