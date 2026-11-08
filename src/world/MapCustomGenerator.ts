import {
  CitySaveData,
  SerializedBuilding,
  SerializedLot,
  SerializedRoadEdge,
  SerializedRoadNode,
} from '../io/CitySerializer';
import { createMalioboroMapData } from './MalioboroPreset';
import { createModernGridMapData } from './ModernGridPreset';

export type RoadLayoutPattern =
  | 'blank_canvas'
  | 'malioboro_corridor'
  | 'modern_grid'
  | 'radial_boulevard'
  | 'waterfront_coastal';

export type RiverPatternMode =
  | 'none'
  | 'straight_center'
  | 'meander'
  | 'confluence';

export type TerrainContourMode =
  | 'flat_plain'
  | 'river_valley'
  | 'hills';

export type DominantArchitectureStyle =
  | 'nusantara_tropis'
  | 'modern_kaca'
  | 'kampung_komunal'
  | 'mix_eklektik';

export interface CustomMapConfig {
  cityName: string;
  layoutTemplate: RoadLayoutPattern;
  topography: TerrainContourMode | 'tropical_river_valley' | 'natural_hills';
  riverMode?: RiverPatternMode;
  riverWidth?: number; // 8m - 36m
  riverAngleDeg?: number; // -90 - +90 deg
  hillHeight?: number; // 4m - 24m
  treeDensityPercent?: number; // 0 - 100
  treeDensity?: 'none' | 'medium' | 'lush';
  architecturalStyle?: DominantArchitectureStyle;
  startTime: number;
}

export interface RiverCurve2D {
  points: Array<[number, number]>; // [x, z] Bezier/polyline control points
  isTributary?: boolean;
}

function rotatePointXZ(x: number, z: number, angleRad: number): [number, number] {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return [x * cos - z * sin, x * sin + z * cos];
}

export function normalizeTopographyMode(
  topo: CustomMapConfig['topography']
): TerrainContourMode {
  if (topo === 'tropical_river_valley' || topo === 'river_valley') return 'river_valley';
  if (topo === 'natural_hills' || topo === 'hills') return 'hills';
  return 'flat_plain';
}

export function resolveRiverMode(config: CustomMapConfig): RiverPatternMode {
  if (config.riverMode) return config.riverMode;
  if (config.topography === 'tropical_river_valley') return 'meander';
  if (config.layoutTemplate === 'waterfront_coastal') return 'meander';
  return 'none';
}

export function resolveTreeDensityPercent(config: CustomMapConfig): number {
  if (typeof config.treeDensityPercent === 'number') {
    return Math.max(0, Math.min(100, config.treeDensityPercent));
  }
  if (config.treeDensity === 'none') return 0;
  if (config.treeDensity === 'lush') return 85;
  return 45;
}

/**
 * Generates rotated XZ Bezier control points for rivers in [-span, +span] world space.
 */
export function computeRiverCurves(
  mode: RiverPatternMode,
  angleDeg: number = 20,
  span: number = 175
): RiverCurve2D[] {
  if (mode === 'none') return [];
  const rad = (angleDeg * Math.PI) / 180;

  if (mode === 'straight_center') {
    return [
      {
        points: [
          rotatePointXZ(-span, 0, rad),
          rotatePointXZ(-span * 0.33, 0, rad),
          rotatePointXZ(span * 0.33, 0, rad),
          rotatePointXZ(span, 0, rad),
        ],
      },
    ];
  }

  if (mode === 'meander') {
    return [
      {
        points: [
          rotatePointXZ(-span, -36, rad),
          rotatePointXZ(-span * 0.38, 48, rad),
          rotatePointXZ(span * 0.36, -46, rad),
          rotatePointXZ(span, 34, rad),
        ],
      },
    ];
  }

  // confluence: main channel + joining tributary from upper flank into (0, 0)
  return [
    {
      points: [
        rotatePointXZ(-span, -14, rad),
        rotatePointXZ(-span * 0.34, 18, rad),
        rotatePointXZ(span * 0.34, -12, rad),
        rotatePointXZ(span, 10, rad),
      ],
    },
    {
      points: [
        rotatePointXZ(-span * 0.35, -span * 0.92, rad),
        rotatePointXZ(-span * 0.2, -span * 0.48, rad),
        rotatePointXZ(-6, -12, rad),
        rotatePointXZ(0, 0, rad),
      ],
      isTributary: true,
    },
  ];
}

export function sampleCubicBezierXZ(
  pts: Array<[number, number]>,
  t: number
): [number, number] {
  if (pts.length === 2) {
    return [
      pts[0][0] + (pts[1][0] - pts[0][0]) * t,
      pts[0][1] + (pts[1][1] - pts[0][1]) * t,
    ];
  }
  const p0 = pts[0];
  const p1 = pts[1] || pts[0];
  const p2 = pts[2] || pts[pts.length - 1];
  const p3 = pts[3] || pts[pts.length - 1];
  const u = 1 - t;
  const uu = u * u;
  const tt = t * t;
  return [
    uu * u * p0[0] + 3 * uu * t * p1[0] + 3 * u * tt * p2[0] + tt * t * p3[0],
    uu * u * p0[1] + 3 * uu * t * p1[1] + 3 * u * tt * p2[1] + tt * t * p3[1],
  ];
}

interface StylePresetSpec {
  primaryPresetKey: string;
  secondaryPresetKey: string;
  landmarkPresetKey: string;
  wallColor: string;
  roofType: 'joglo' | 'hip' | 'gable' | 'flat';
  wallMaterial: 'plaster' | 'wood' | 'brick' | 'concrete' | 'glass_curtain' | 'stone_candi';
  roofMaterial: 'clay_tile' | 'concrete' | 'metal' | 'wooden_shingle';
}

function getStylePresetSpec(style: DominantArchitectureStyle = 'nusantara_tropis'): StylePresetSpec {
  switch (style) {
    case 'modern_kaca':
      return {
        primaryPresetKey: 'office_glass_tower',
        secondaryPresetKey: 'ruko_3fl',
        landmarkPresetKey: 'modern_civic_hall',
        wallColor: '#DBF2FC',
        roofType: 'flat',
        wallMaterial: 'glass_curtain',
        roofMaterial: 'metal',
      };
    case 'kampung_komunal':
      return {
        primaryPresetKey: 'house_54',
        secondaryPresetKey: 'warmindo_modern',
        landmarkPresetKey: 'pendopo_joglo',
        wallColor: '#FEF3C7',
        roofType: 'hip',
        wallMaterial: 'plaster',
        roofMaterial: 'clay_tile',
      };
    case 'mix_eklektik':
      return {
        primaryPresetKey: 'modern_villa',
        secondaryPresetKey: 'ruko_2fl',
        landmarkPresetKey: 'joglo',
        wallColor: '#F1F5F9',
        roofType: 'hip',
        wallMaterial: 'plaster',
        roofMaterial: 'clay_tile',
      };
    case 'nusantara_tropis':
    default:
      return {
        primaryPresetKey: 'joglo',
        secondaryPresetKey: 'modern_villa',
        landmarkPresetKey: 'pendopo_joglo',
        wallColor: '#F8FAFC',
        roofType: 'joglo',
        wallMaterial: 'wood',
        roofMaterial: 'clay_tile',
      };
  }
}

function applyArchitecturalStyleToSaveData(
  data: CitySaveData,
  style?: DominantArchitectureStyle
): CitySaveData {
  if (!style) return data;
  const spec = getStylePresetSpec(style);
  if (style === 'mix_eklektik') return data;

  data.buildings = data.buildings.map((b, idx) => {
    if (b.id.includes('landmark') || idx === 0) {
      return {
        ...b,
        presetKey: spec.landmarkPresetKey,
        wallColor: spec.wallColor,
      };
    }
    return {
      ...b,
      presetKey: idx % 2 === 0 ? spec.primaryPresetKey : spec.secondaryPresetKey,
      wallColor: spec.wallColor,
      wallMaterial: spec.wallMaterial,
      roofMaterial: spec.roofMaterial,
    };
  });
  return data;
}

function buildRadialBoulevardData(config: CustomMapConfig): CitySaveData {
  const nodes: SerializedRoadNode[] = [];
  const edges: SerializedRoadEdge[] = [];
  const buildings: SerializedBuilding[] = [];
  const lots: SerializedLot[] = [];
  const spec = getStylePresetSpec(config.architecturalStyle);

  const ringRadius = 46;
  const outerRadius = 115;
  const ringCount = 8;

  for (let i = 0; i < ringCount; i++) {
    const a = (i / ringCount) * Math.PI * 2;
    nodes.push({
      id: `rad_ring_${i}`,
      x: Math.round(Math.cos(a) * ringRadius * 10) / 10,
      y: 0,
      z: Math.round(Math.sin(a) * ringRadius * 10) / 10,
      connectedEdgeIds: [],
    });
  }

  for (let i = 0; i < ringCount; i++) {
    const next = (i + 1) % ringCount;
    const n1 = nodes[i];
    const n2 = nodes[next];
    const edgeId = `rad_edge_ring_${i}`;
    edges.push({
      id: edgeId,
      startNodeId: n1.id,
      endNodeId: n2.id,
      type: 'arterial',
      controlPoints: [
        [n1.x, 0, n1.z],
        [n2.x, 0, n2.z],
      ],
      length: Math.hypot(n2.x - n1.x, n2.z - n1.z),
      customProfile: { hasTrees: true, hasStreetLights: true },
    });
    n1.connectedEdgeIds.push(edgeId);
    n2.connectedEdgeIds.push(edgeId);
  }

  // 4 cardinal spokes from ring to outer perimeter + 2 inner cross avenues across center plaza
  const spokes = [0, 2, 4, 6];
  spokes.forEach((ringIdx, k) => {
    const a = (ringIdx / ringCount) * Math.PI * 2;
    const outerNode: SerializedRoadNode = {
      id: `rad_outer_${k}`,
      x: Math.round(Math.cos(a) * outerRadius * 10) / 10,
      y: 0,
      z: Math.round(Math.sin(a) * outerRadius * 10) / 10,
      connectedEdgeIds: [],
    };
    nodes.push(outerNode);
    const ringNode = nodes[ringIdx];
    const edgeId = `rad_spoke_out_${k}`;
    edges.push({
      id: edgeId,
      startNodeId: ringNode.id,
      endNodeId: outerNode.id,
      type: 'collector',
      controlPoints: [
        [ringNode.x, 0, ringNode.z],
        [outerNode.x, 0, outerNode.z],
      ],
      length: outerRadius - ringRadius,
      customProfile: { hasTrees: true, hasStreetLights: true },
    });
    ringNode.connectedEdgeIds.push(edgeId);
    outerNode.connectedEdgeIds.push(edgeId);
  });

  // Inner North-South & East-West diameter
  const centerNode: SerializedRoadNode = {
    id: 'rad_center_0',
    x: 0,
    y: 0,
    z: 0,
    connectedEdgeIds: [],
  };
  nodes.push(centerNode);
  spokes.forEach((ringIdx, k) => {
    const ringNode = nodes[ringIdx];
    const edgeId = `rad_spoke_in_${k}`;
    edges.push({
      id: edgeId,
      startNodeId: centerNode.id,
      endNodeId: ringNode.id,
      type: 'local',
      controlPoints: [
        [0, 0, 0],
        [ringNode.x, 0, ringNode.z],
      ],
      length: ringRadius,
      customProfile: { hasTrees: false, hasStreetLights: true },
    });
    centerNode.connectedEdgeIds.push(edgeId);
    ringNode.connectedEdgeIds.push(edgeId);
  });

  // Starter buildings placed cleanly in the radial quadrants
  const quadrantAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  quadrantAngles.forEach((a, idx) => {
    const dist = 70;
    const bx = Math.cos(a) * dist;
    const bz = Math.sin(a) * dist;
    const isModern = config.architecturalStyle === 'modern_kaca';
    buildings.push({
      id: `rad_bld_${idx}`,
      name: idx === 0 ? 'Paviliun Sentral Boulevard' : `Blok Kuadran ${idx + 1}`,
      category: idx % 2 === 0 ? 'commercial' : 'residential',
      presetKey: idx === 0 ? spec.landmarkPresetKey : idx % 2 === 0 ? spec.secondaryPresetKey : spec.primaryPresetKey,
      position: [bx, 0, bz],
      rotationY: -a + Math.PI / 2,
      width: 14,
      length: 12,
      floorCount: isModern ? (idx % 2 === 0 ? 4 : 3) : 2,
      floorHeight: 3.6,
      roofType: spec.roofType,
      roofOverhang: 1.0,
      wallMaterial: spec.wallMaterial,
      wallColor: spec.wallColor,
      roofMaterial: spec.roofMaterial,
    });
  });

  return {
    version: '2.0.0',
    cityTitle: config.cityName || 'Kota Boulevard Radial',
    timestamp: Date.now(),
    environment: {
      timeOfDay: config.startTime ?? 8.5,
      dayOfYear: 172,
      weather: 'clear',
    },
    roads: { nodes, edges },
    buildings,
    customBuildings: [],
    lots,
    landscape: [],
    displaySettings: {},
  };
}

function buildWaterfrontCoastalData(config: CustomMapConfig): CitySaveData {
  const nodes: SerializedRoadNode[] = [];
  const edges: SerializedRoadEdge[] = [];
  const buildings: SerializedBuilding[] = [];
  const spec = getStylePresetSpec(config.architecturalStyle);

  const riverW = Math.max(8, Math.min(36, config.riverWidth ?? 18));
  const rad = ((config.riverAngleDeg ?? 18) * Math.PI) / 180;
  const promenadeOffset = riverW * 0.5 + 18;

  const pSouth = rotatePointXZ(-115, promenadeOffset, rad);
  const pMidS = rotatePointXZ(-38, promenadeOffset, rad);
  const pMid = rotatePointXZ(0, promenadeOffset, rad);
  const pMidN = rotatePointXZ(38, promenadeOffset, rad);
  const pNorth = rotatePointXZ(115, promenadeOffset, rad);

  // Opposite bank cross-river avenue so bridges spawn across river!
  const pOppWest = rotatePointXZ(-38, -promenadeOffset - 16, rad);
  const pOppEast = rotatePointXZ(38, -promenadeOffset - 16, rad);
  const pBackW = rotatePointXZ(-38, promenadeOffset + 45, rad);
  const pBackE = rotatePointXZ(38, promenadeOffset + 45, rad);

  const pts: Array<{ id: string; xy: [number, number] }> = [
    { id: 'wf_n_s', xy: pSouth },
    { id: 'wf_n_ms', xy: pMidS },
    { id: 'wf_n_mid', xy: pMid },
    { id: 'wf_n_mn', xy: pMidN },
    { id: 'wf_n_n', xy: pNorth },
    { id: 'wf_opp_w', xy: pOppWest },
    { id: 'wf_opp_e', xy: pOppEast },
    { id: 'wf_back_w', xy: pBackW },
    { id: 'wf_back_e', xy: pBackE },
  ];

  const nodeMap = new Map<string, SerializedRoadNode>();
  pts.forEach((p) => {
    const n: SerializedRoadNode = {
      id: p.id,
      x: Math.round(p.xy[0] * 10) / 10,
      y: 0,
      z: Math.round(p.xy[1] * 10) / 10,
      connectedEdgeIds: [],
    };
    nodes.push(n);
    nodeMap.set(p.id, n);
  });

  const addSeg = (id: string, a: string, b: string, type: 'arterial' | 'collector' | 'local') => {
    const na = nodeMap.get(a)!;
    const nb = nodeMap.get(b)!;
    edges.push({
      id,
      startNodeId: a,
      endNodeId: b,
      type,
      controlPoints: [
        [na.x, 0, na.z],
        [nb.x, 0, nb.z],
      ],
      length: Math.hypot(nb.x - na.x, nb.z - na.z),
      customProfile: { hasTrees: true, hasStreetLights: true },
    });
    na.connectedEdgeIds.push(id);
    nb.connectedEdgeIds.push(id);
  };

  addSeg('wf_prom_1', 'wf_n_s', 'wf_n_ms', 'arterial');
  addSeg('wf_prom_2', 'wf_n_ms', 'wf_n_mid', 'arterial');
  addSeg('wf_prom_3', 'wf_n_mid', 'wf_n_mn', 'arterial');
  addSeg('wf_prom_4', 'wf_n_mn', 'wf_n_n', 'arterial');
  // Cross-river bridges
  addSeg('wf_bridge_w', 'wf_n_ms', 'wf_opp_w', 'collector');
  addSeg('wf_bridge_e', 'wf_n_mn', 'wf_opp_e', 'collector');
  // Neighborhood inland streets
  addSeg('wf_inland_w', 'wf_n_ms', 'wf_back_w', 'local');
  addSeg('wf_inland_e', 'wf_n_mn', 'wf_back_e', 'local');

  // Waterfront pavilions & shophouses facing the river across the promenade
  [-72, -16, 16, 72].forEach((along, idx) => {
    const bPos = rotatePointXZ(along, promenadeOffset + 15, rad);
    buildings.push({
      id: `wf_bld_${idx}`,
      name: idx === 1 ? 'Paviliun Tepian Sungai' : `Ruko Tepian Air ${idx + 1}`,
      category: idx === 1 ? 'public' : 'commercial',
      presetKey: idx === 1 ? spec.landmarkPresetKey : idx % 2 === 0 ? spec.secondaryPresetKey : spec.primaryPresetKey,
      position: [bPos[0], 0, bPos[1]],
      rotationY: -rad + Math.PI,
      width: 13,
      length: 11,
      floorCount: config.architecturalStyle === 'modern_kaca' ? 3 : 2,
      floorHeight: 3.6,
      roofType: spec.roofType,
      roofOverhang: 1.0,
      wallMaterial: spec.wallMaterial,
      wallColor: spec.wallColor,
      roofMaterial: spec.roofMaterial,
    });
  });

  return {
    version: '2.0.0',
    cityTitle: config.cityName || 'Distrik Pesisir Tepian Air',
    timestamp: Date.now(),
    environment: {
      timeOfDay: config.startTime ?? 8.5,
      dayOfYear: 172,
      weather: 'clear',
    },
    roads: { nodes, edges },
    buildings,
    customBuildings: [],
    lots: [],
    landscape: [],
    displaySettings: {},
  };
}

export function createCustomMapCityData(config: CustomMapConfig): CitySaveData | null {
  const title = config.cityName?.trim() || 'Kota Tropis Nusantara';
  if (config.layoutTemplate === 'blank_canvas') {
    return null;
  }
  if (config.layoutTemplate === 'malioboro_corridor') {
    const data = createMalioboroMapData();
    data.cityTitle = title;
    return applyArchitecturalStyleToSaveData(data, config.architecturalStyle);
  }
  if (config.layoutTemplate === 'modern_grid') {
    const data = createModernGridMapData();
    data.cityTitle = title;
    return applyArchitecturalStyleToSaveData(data, config.architecturalStyle);
  }
  if (config.layoutTemplate === 'radial_boulevard') {
    return buildRadialBoulevardData({ ...config, cityName: title });
  }
  if (config.layoutTemplate === 'waterfront_coastal') {
    return buildWaterfrontCoastalData({ ...config, cityName: title });
  }
  return null;
}

/**
 * Deterministic pseudo-random tree layout shared between Live Preview & 3D Engine.
 */
export function generateDeterministicTreeCandidates(count: number, maxRadius: number = 115): Array<{
  x: number;
  z: number;
  rotY: number;
  scale: number;
}> {
  const out: Array<{ x: number; z: number; rotY: number; scale: number }> = [];
  let seed = 42197;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < count * 3; i++) {
    const a = nextRand() * Math.PI * 2;
    const r = 12 + Math.sqrt(nextRand()) * (maxRadius - 12);
    out.push({
      x: Math.cos(a) * r,
      z: Math.sin(a) * r,
      rotY: nextRand() * Math.PI * 2,
      scale: 0.85 + nextRand() * 0.4,
    });
  }
  return out;
}
