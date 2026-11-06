import * as THREE from 'three';
export type { RoofType, WallMaterialType, RoofMaterialType } from './PrefabTypes';
import { RoofType, WallMaterialType, RoofMaterialType } from './PrefabTypes';

export type StudioCreationMode = 'building' | 'furniture' | 'pavilion';

export type StudioElementType = 'gazebo' | 'gapura' | 'monumen';

export type PavilionRoofStyleType =
  | 'joglo_pendopo'
  | 'limasan_tropis'
  | 'candi_bentar'
  | 'busur_modern'
  | 'obelisk_monolit';

export type PavilionMaterialType =
  | 'teak_wood'
  | 'andesite_stone'
  | 'exposed_concrete'
  | 'corten_steel';

export interface StudioPavilionConfig {
  elementType: StudioElementType;
  name: string;
  width: number;
  depth: number;
  height: number;
  roofStyle: PavilionRoofStyleType;
  primaryMaterial: PavilionMaterialType;
  accentColor: string;
  hasWarmUplight: boolean;
}

export type OpeningType =
  | 'window_single'
  | 'window_double'
  | 'window_jalusi'
  | 'door_single'
  | 'door_double'
  | 'balcony';

export interface WallOpening {
  id: string;
  type: OpeningType;
  positionRatio: number; // 0.0 to 1.0 along the wall segment
  width: number;         // Opening width in meters
  height: number;        // Opening height in meters
  sillHeight: number;    // Height above floor level (0 for door)
}

export interface WallSegment {
  wallIndex: number;
  openings: WallOpening[];
}

export interface FloorDefinition {
  floorIndex: number;
  footprint: THREE.Vector2[]; // 2D polygon vertices in local building coordinates
  height: number;             // Floor height in meters (default 3.0m)
  walls: WallSegment[];
}

export interface RoofDefinition {
  type: RoofType | 'shed';
  pitchAngle: number;         // in degrees (default 30 deg for tropical roofs)
  overhang: number;           // Overhang / teritis in meters (default 1.2m)
  material: RoofMaterialType | string;
}

export type MassingShapeType =
  | 'box'
  | 'l_shape'
  | 'courtyard_u'
  | 'stepped_podium'
  | 'cantilever';

export type WindowStyleType =
  | 'modern_ribbon'
  | 'curtain_wall'
  | 'javanese_krepyak'
  | 'colonial_arch'
  | 'minimalist_slot';

export interface FacadeFeatures {
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: WallMaterialType | string;
  exposeSteelFrame?: boolean;
  hasCarportAndTopBalcony?: boolean;
  hasVerticalSecondarySkin?: boolean;
}

export interface CustomBuilding {
  id: string;
  name: string;
  position: THREE.Vector3;
  rotationY: number;
  plinthHeight: number;
  floors: FloorDefinition[];
  roof: RoofDefinition;
  wallMaterial: WallMaterialType;
  wallColor: string;
  isBlueprint?: boolean;
  massingShape?: MassingShapeType | string;
  windowStyle?: WindowStyleType | string;
  facadeFeatures?: FacadeFeatures;
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: string;
  mullionColor?: string;
  hasSkylight?: boolean;
  hasSolarPV?: boolean;
  exposeSteelFrame?: boolean;
  hasCarportAndTopBalcony?: boolean;
  hasVerticalSecondarySkin?: boolean;

  // Mode 3: Universal Creation Studio Pavilion & Park Element Extensions
  studioElementType?: StudioElementType;
  pavilionConfig?: StudioPavilionConfig;
  customConfig?: Record<string, any>;
}

/**
 * Extracts StudioPavilionConfig from a CustomBuilding instance, supporting both explicit
 * `pavilionConfig` / `studioElementType` and serialized `massingShape: 'pavilion_*'` tags.
 */
export function extractPavilionConfig(building: Partial<CustomBuilding>): StudioPavilionConfig | null {
  if (building.pavilionConfig) {
    return building.pavilionConfig;
  }

  const customCfg = building.customConfig || (building as any).userData?.customConfig;
  if (customCfg?.pavilionConfig) {
    return customCfg.pavilionConfig as StudioPavilionConfig;
  }

  let elemType: StudioElementType | null = building.studioElementType || customCfg?.studioElementType || null;
  if (!elemType && typeof building.massingShape === 'string' && building.massingShape.startsWith('pavilion_')) {
    const suffix = building.massingShape.replace('pavilion_', '');
    if (suffix === 'gazebo' || suffix === 'gapura' || suffix === 'monumen') {
      elemType = suffix;
    }
  }

  if (!elemType) return null;

  // Derive footprint dimensions from floor[0] if present
  let derivedW = 6;
  let derivedD = 6;
  const fp = building.floors?.[0]?.footprint;
  if (fp && fp.length >= 3) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of fp) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
    if (isFinite(minX) && isFinite(maxX)) derivedW = Math.max(2, maxX - minX);
    if (isFinite(minZ) && isFinite(maxZ)) derivedD = Math.max(2, maxZ - minZ);
  }

  const derivedH = building.floors?.[0]?.height || (elemType === 'monumen' ? 9.0 : elemType === 'gapura' ? 6.5 : 4.2);

  const validRoofs: PavilionRoofStyleType[] = [
    'joglo_pendopo',
    'limasan_tropis',
    'candi_bentar',
    'busur_modern',
    'obelisk_monolit'
  ];
  const rawRoof = (customCfg?.roofStyle || building.windowStyle || '') as PavilionRoofStyleType;
  const defaultRoof: PavilionRoofStyleType =
    elemType === 'gapura' ? 'candi_bentar' : elemType === 'monumen' ? 'obelisk_monolit' : 'joglo_pendopo';
  const roofStyle = validRoofs.includes(rawRoof) ? rawRoof : defaultRoof;

  const validMats: PavilionMaterialType[] = [
    'teak_wood',
    'andesite_stone',
    'exposed_concrete',
    'corten_steel'
  ];
  const rawMat = (customCfg?.primaryMaterial || building.baseMaterial || '') as PavilionMaterialType;
  const defaultMat: PavilionMaterialType =
    elemType === 'gazebo' ? 'teak_wood' : 'andesite_stone';
  const primaryMaterial = validMats.includes(rawMat) ? rawMat : defaultMat;

  return {
    elementType: elemType,
    name: building.name || 'Elemen Taman Kustom',
    width: customCfg?.width || derivedW,
    depth: customCfg?.depth || derivedD,
    height: customCfg?.height || derivedH,
    roofStyle,
    primaryMaterial,
    accentColor: customCfg?.accentColor || building.mullionColor || building.wallColor || '#D97706',
    hasWarmUplight: customCfg?.hasWarmUplight ?? building.hasSkylight ?? true
  };
}

/**
 * Procedural floor footprint generator for the 5 architectural massing shapes
 * plus Mode 3 pavilion/park elements.
 */
export function generateFloorsForMassingShape(
  massingShape: MassingShapeType | string = 'box',
  width: number,
  length: number,
  floorCount: number,
  floorHeight: number = 3.2
): FloorDefinition[] {
  const hw = width * 0.5;
  const hl = length * 0.5;
  const floors: FloorDefinition[] = [];

  for (let f = 0; f < floorCount; f++) {
    let footprint: THREE.Vector2[] = [];

    switch (massingShape) {
      case 'l_shape': {
        // L-Shape with corner cutout for open patio/terrace
        footprint = [
          new THREE.Vector2(-hw, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, 0),
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0, hl),
          new THREE.Vector2(-hw, hl)
        ];
        break;
      }
      case 'courtyard_u': {
        // U-Shape wrapping around central open ventilation courtyard
        const wingW = hw * 0.38;
        footprint = [
          new THREE.Vector2(-hw, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, hl),
          new THREE.Vector2(hw - wingW, hl),
          new THREE.Vector2(hw - wingW, -hl * 0.2),
          new THREE.Vector2(-hw + wingW, -hl * 0.2),
          new THREE.Vector2(-hw + wingW, hl),
          new THREE.Vector2(-hw, hl)
        ];
        break;
      }
      case 'stepped_podium': {
        // Floor 0 (and Floor 1 if count >= 4) full podium; upper floors set back with rooftop terrace
        if (f < (floorCount >= 4 ? 2 : 1)) {
          footprint = [
            new THREE.Vector2(-hw, -hl),
            new THREE.Vector2(hw, -hl),
            new THREE.Vector2(hw, hl),
            new THREE.Vector2(-hw, hl)
          ];
        } else {
          const tw = hw * 0.70;
          const tl = hl * 0.70;
          footprint = [
            new THREE.Vector2(-tw, -tl),
            new THREE.Vector2(tw, -tl),
            new THREE.Vector2(tw, tl),
            new THREE.Vector2(-tw, tl)
          ];
        }
        break;
      }
      case 'cantilever': {
        // Floor 0 set back by 1.8m in front; Floor 1+ cantilevers out 1.8m
        if (f === 0) {
          const cDepth = Math.min(2.0, length * 0.22);
          footprint = [
            new THREE.Vector2(-hw, -hl),
            new THREE.Vector2(hw, -hl),
            new THREE.Vector2(hw, hl - cDepth),
            new THREE.Vector2(-hw, hl - cDepth)
          ];
        } else {
          footprint = [
            new THREE.Vector2(-hw, -hl),
            new THREE.Vector2(hw, -hl),
            new THREE.Vector2(hw, hl),
            new THREE.Vector2(-hw, hl)
          ];
        }
        break;
      }
      case 'box':
      default: {
        footprint = [
          new THREE.Vector2(-hw, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, hl),
          new THREE.Vector2(-hw, hl)
        ];
        break;
      }
    }

    floors.push({
      floorIndex: f,
      height: floorHeight,
      footprint,
      walls: []
    });
  }

  return floors;
}

/**
 * Accurately calculate ground footprint area (KDB) and gross floor area (KLB)
 * based on architectural massing shape.
 */
export function calculateBuildingAreas(
  width: number,
  length: number,
  floorCount: number,
  massingShape: MassingShapeType | string = 'box'
): { kdb: number; klb: number } {
  const rawFootprint = width * length;
  let kdb = rawFootprint;
  let klb = rawFootprint * Math.max(1, floorCount);

  switch (massingShape) {
    case 'l_shape': {
      // 25% cutout for outdoor corner terrace deck
      kdb = Math.round(rawFootprint * 0.75);
      klb = kdb * Math.max(1, floorCount);
      break;
    }
    case 'courtyard_u': {
      // 20% central open courtyard
      kdb = Math.round(rawFootprint * 0.80);
      klb = kdb * Math.max(1, floorCount);
      break;
    }
    case 'stepped_podium': {
      // Ground floor is full podium
      kdb = rawFootprint;
      const podiumFloors = Math.min(Math.max(1, floorCount), floorCount >= 4 ? 2 : 1);
      const towerFloors = Math.max(0, floorCount - podiumFloors);
      // Tower footprint is 70% width x 70% length = 49% area
      const towerArea = Math.round(rawFootprint * 0.49);
      klb = (podiumFloors * rawFootprint) + (towerFloors * towerArea);
      break;
    }
    case 'cantilever': {
      const cDepth = Math.min(2.0, length * 0.22);
      const groundFloorArea = Math.round(width * (length - cDepth));
      kdb = groundFloorArea;
      const upperFloors = Math.max(0, floorCount - 1);
      klb = groundFloorArea + (upperFloors * rawFootprint);
      break;
    }
    case 'pavilion_gapura': {
      // Twin split gateway pylons occupy ~55% of bounding span
      kdb = Math.max(4, Math.round(rawFootprint * 0.55));
      klb = kdb;
      break;
    }
    case 'pavilion_monumen': {
      kdb = Math.max(4, Math.round(rawFootprint * 0.78));
      klb = kdb;
      break;
    }
    case 'box':
    default: {
      kdb = rawFootprint;
      klb = rawFootprint * Math.max(1, floorCount);
      break;
    }
  }

  return { kdb, klb };
}
