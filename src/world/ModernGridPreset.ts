import * as THREE from 'three';
import { CitySaveData, SerializedRoadNode, SerializedRoadEdge, SerializedBuilding, SerializedLot, SerializedLandscapeItem } from '../io/CitySerializer';

/**
 * ModernGridPreset.ts
 *
 * 100% Procedural & Declarative Generator for a Symmetric Modern Architectural Grid City.
 * Conforms to Arscity CitySaveData v2.0.0 schema.
 */
export function createModernGridMapData(): CitySaveData {
  const nodes: SerializedRoadNode[] = [
    // Center column (x = 0)
    { id: 'grid_n_0_m70', x: 0, y: 0, z: -70, connectedEdgeIds: ['edge_vert_c_1'] },
    { id: 'grid_n_0_m35', x: 0, y: 0, z: -35, connectedEdgeIds: ['edge_vert_c_1', 'edge_vert_c_2', 'edge_horiz_m35_l', 'edge_horiz_m35_r'] },
    { id: 'grid_n_0_0', x: 0, y: 0, z: 0, connectedEdgeIds: ['edge_vert_c_2', 'edge_vert_c_3', 'edge_horiz_0_l', 'edge_horiz_0_r'] },
    { id: 'grid_n_0_35', x: 0, y: 0, z: 35, connectedEdgeIds: ['edge_vert_c_3', 'edge_vert_c_4', 'edge_horiz_35_l', 'edge_horiz_35_r'] },
    { id: 'grid_n_0_70', x: 0, y: 0, z: 70, connectedEdgeIds: ['edge_vert_c_4'] },

    // West column (x = -45)
    { id: 'grid_n_m45_m70', x: -45, y: 0, z: -70, connectedEdgeIds: ['edge_vert_w_1'] },
    { id: 'grid_n_m45_m35', x: -45, y: 0, z: -35, connectedEdgeIds: ['edge_vert_w_1', 'edge_vert_w_2', 'edge_horiz_m35_l'] },
    { id: 'grid_n_m45_0', x: -45, y: 0, z: 0, connectedEdgeIds: ['edge_vert_w_2', 'edge_vert_w_3', 'edge_horiz_0_l'] },
    { id: 'grid_n_m45_35', x: -45, y: 0, z: 35, connectedEdgeIds: ['edge_vert_w_3', 'edge_vert_w_4', 'edge_horiz_35_l'] },
    { id: 'grid_n_m45_70', x: -45, y: 0, z: 70, connectedEdgeIds: ['edge_vert_w_4'] },

    // East column (x = 45)
    { id: 'grid_n_45_m70', x: 45, y: 0, z: -70, connectedEdgeIds: ['edge_vert_e_1'] },
    { id: 'grid_n_45_m35', x: 45, y: 0, z: -35, connectedEdgeIds: ['edge_vert_e_1', 'edge_vert_e_2', 'edge_horiz_m35_r'] },
    { id: 'grid_n_45_0', x: 45, y: 0, z: 0, connectedEdgeIds: ['edge_vert_e_2', 'edge_vert_e_3', 'edge_horiz_0_r'] },
    { id: 'grid_n_45_35', x: 45, y: 0, z: 35, connectedEdgeIds: ['edge_vert_e_3', 'edge_vert_e_4', 'edge_horiz_35_r'] },
    { id: 'grid_n_45_70', x: 45, y: 0, z: 70, connectedEdgeIds: ['edge_vert_e_4'] },
  ];

  const edges: SerializedRoadEdge[] = [
    // Main North-South Boulevard (Arterial along x = 0)
    { id: 'edge_vert_c_1', startNodeId: 'grid_n_0_m70', endNodeId: 'grid_n_0_m35', type: 'arterial', controlPoints: [[0, 0, -70], [0, 0, -35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_c_2', startNodeId: 'grid_n_0_m35', endNodeId: 'grid_n_0_0', type: 'arterial', controlPoints: [[0, 0, -35], [0, 0, 0]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_c_3', startNodeId: 'grid_n_0_0', endNodeId: 'grid_n_0_35', type: 'arterial', controlPoints: [[0, 0, 0], [0, 0, 35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_c_4', startNodeId: 'grid_n_0_35', endNodeId: 'grid_n_0_70', type: 'arterial', controlPoints: [[0, 0, 35], [0, 0, 70]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },

    // West Avenue
    { id: 'edge_vert_w_1', startNodeId: 'grid_n_m45_m70', endNodeId: 'grid_n_m45_m35', type: 'collector', controlPoints: [[-45, 0, -70], [-45, 0, -35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_w_2', startNodeId: 'grid_n_m45_m35', endNodeId: 'grid_n_m45_0', type: 'collector', controlPoints: [[-45, 0, -35], [-45, 0, 0]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_w_3', startNodeId: 'grid_n_m45_0', endNodeId: 'grid_n_m45_35', type: 'collector', controlPoints: [[-45, 0, 0], [-45, 0, 35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_w_4', startNodeId: 'grid_n_m45_35', endNodeId: 'grid_n_m45_70', type: 'collector', controlPoints: [[-45, 0, 35], [-45, 0, 70]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },

    // East Avenue
    { id: 'edge_vert_e_1', startNodeId: 'grid_n_45_m70', endNodeId: 'grid_n_45_m35', type: 'collector', controlPoints: [[45, 0, -70], [45, 0, -35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_e_2', startNodeId: 'grid_n_45_m35', endNodeId: 'grid_n_45_0', type: 'collector', controlPoints: [[45, 0, -35], [45, 0, 0]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_e_3', startNodeId: 'grid_n_45_0', endNodeId: 'grid_n_45_35', type: 'collector', controlPoints: [[45, 0, 0], [45, 0, 35]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_vert_e_4', startNodeId: 'grid_n_45_35', endNodeId: 'grid_n_45_70', type: 'collector', controlPoints: [[45, 0, 35], [45, 0, 70]], length: 35, customProfile: { hasTrees: true, hasStreetLights: true } },

    // Cross Streets (East-West)
    { id: 'edge_horiz_m35_l', startNodeId: 'grid_n_m45_m35', endNodeId: 'grid_n_0_m35', type: 'collector', controlPoints: [[-45, 0, -35], [0, 0, -35]], length: 45, customProfile: { hasTrees: false, hasStreetLights: true } },
    { id: 'edge_horiz_m35_r', startNodeId: 'grid_n_0_m35', endNodeId: 'grid_n_45_m35', type: 'collector', controlPoints: [[0, 0, -35], [45, 0, -35]], length: 45, customProfile: { hasTrees: false, hasStreetLights: true } },

    { id: 'edge_horiz_0_l', startNodeId: 'grid_n_m45_0', endNodeId: 'grid_n_0_0', type: 'arterial', controlPoints: [[-45, 0, 0], [0, 0, 0]], length: 45, customProfile: { hasTrees: true, hasStreetLights: true } },
    { id: 'edge_horiz_0_r', startNodeId: 'grid_n_0_0', endNodeId: 'grid_n_45_0', type: 'arterial', controlPoints: [[0, 0, 0], [45, 0, 0]], length: 45, customProfile: { hasTrees: true, hasStreetLights: true } },

    { id: 'edge_horiz_35_l', startNodeId: 'grid_n_m45_35', endNodeId: 'grid_n_0_35', type: 'collector', controlPoints: [[-45, 0, 35], [0, 0, 35]], length: 45, customProfile: { hasTrees: false, hasStreetLights: true } },
    { id: 'edge_horiz_35_r', startNodeId: 'grid_n_0_35', endNodeId: 'grid_n_45_35', type: 'collector', controlPoints: [[0, 0, 35], [45, 0, 35]], length: 45, customProfile: { hasTrees: false, hasStreetLights: true } },
  ];

  const buildings: SerializedBuilding[] = [
    {
      id: 'grid_bld_civic_plaza',
      name: 'Menara Arsitektur Nusantara',
      category: 'commercial',
      presetKey: 'office_glass_tower',
      position: [22, 0, 18],
      rotationY: 0,
      width: 16,
      length: 16,
      floorCount: 8,
      floorHeight: 3.8,
      roofType: 'flat',
      roofOverhang: 0.6,
      wallMaterial: 'glass_curtain',
      wallColor: '#DBF2FC',
      roofMaterial: 'metal',
    },
    {
      id: 'grid_bld_ruko_west',
      name: 'Ruko Modern Distrik Barat',
      category: 'commercial',
      presetKey: 'ruko_3fl',
      position: [-22, 0, 18],
      rotationY: 0,
      width: 14,
      length: 12,
      floorCount: 3,
      floorHeight: 3.6,
      roofType: 'flat',
      roofOverhang: 0.5,
      wallMaterial: 'concrete',
      wallColor: '#F8FAFC',
      roofMaterial: 'concrete',
    },
    {
      id: 'grid_bld_residential_nw',
      name: 'Paviliun Hunian Tropis',
      category: 'residential',
      presetKey: 'modern_villa',
      position: [-22, 0, -18],
      rotationY: Math.PI,
      width: 12,
      length: 14,
      floorCount: 2,
      floorHeight: 3.4,
      roofType: 'hip',
      roofOverhang: 0.8,
      wallMaterial: 'plaster',
      wallColor: '#F1F5F9',
      roofMaterial: 'clay_tile',
    },
    {
      id: 'grid_bld_creative_hub',
      name: 'Studio Desain & Riset CAD',
      category: 'commercial',
      presetKey: 'ruko_2fl',
      position: [22, 0, -18],
      rotationY: Math.PI,
      width: 12,
      length: 12,
      floorCount: 2,
      floorHeight: 3.6,
      roofType: 'flat',
      roofOverhang: 0.5,
      wallMaterial: 'concrete',
      wallColor: '#E2E8F0',
      roofMaterial: 'metal',
    },
  ];

  const lots: SerializedLot[] = [
    {
      id: 'lot_grid_se',
      name: 'Kavling Komersial Tenggara',
      zone: 'commercial',
      position: [22, 0, 18],
      width: 22,
      length: 22,
      areaM2: 22 * 22,
    },
    {
      id: 'lot_grid_sw',
      name: 'Kavling Ruko Barat Daya',
      zone: 'commercial',
      position: [-22, 0, 18],
      width: 20,
      length: 20,
      areaM2: 20 * 20,
    },
  ];

  const landscapeItems: SerializedLandscapeItem[] = [
    { id: 'tree_grid_1', type: 'tree_tabebuya_pink', position: [8, 0, 8], rotationY: 0.4, scale: 1.1 },
    { id: 'tree_grid_2', type: 'tree_tabebuya_gold', position: [-8, 0, 8], rotationY: 1.2, scale: 1.05 },
    { id: 'tree_grid_3', type: 'tree_asam_jawa', position: [8, 0, -8], rotationY: 2.1, scale: 1.2 },
    { id: 'tree_grid_4', type: 'shade_tree', position: [-8, 0, -8], rotationY: 0.8, scale: 1.15 },
  ];

  return {
    version: '2.0.0',
    cityTitle: 'Grid Arsitektur Modern',
    timestamp: Date.now(),
    environment: {
      timeOfDay: 10.0,
      dayOfYear: 172,
      weather: 'clear',
    },
    roads: {
      nodes,
      edges,
    },
    lots,
    buildings,
    landscape: landscapeItems,
    displaySettings: {},
  };
}

