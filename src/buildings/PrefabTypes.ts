import * as THREE from 'three';
import { BuildingCatalogRegistry, BuildingCategory } from './BuildingCatalogRegistry';
import type { FloorDefinition, RoofDefinition } from './CustomBuildingModel';
import type { InteriorLayout } from './InteriorTypes';

export type RoofType =
  | 'gable'
  | 'hip'
  | 'joglo'
  | 'limasan'
  | 'flat'
  | 'flat_parapet'
  | 'pyramid'
  | 'sawtooth'
  | 'shed_industrial'
  | 'arched_vault'
  | 'butterfly'
  | 'dome';

export type WallMaterialType = 'plaster' | 'brick' | 'concrete' | 'wood';
export type RoofMaterialType = 'clay_tile' | 'metal' | 'concrete';

export type BuildingSubPartType = 'main_tower' | 'side_wing' | 'podium_base' | 'roof_crown';

export interface BuildingSubPartDimensions {
  partWidth: number;
  partDepth: number;
  partFloors: number;
}

export interface PrefabPreset {
  key: string;
  name: string;
  category: 'residential' | 'commercial' | 'public' | BuildingCategory | string;
  description: string;
  defaultWidth: number;
  defaultLength: number;
  defaultFloorCount: number;
  minFloors?: number;
  maxFloors?: number;
  floorHeight: number;
  defaultRoofType: RoofType;
  defaultRoofOverhang: number;
  defaultWallMaterial: WallMaterialType;
  defaultWallColor: string;
  defaultRoofMaterial: RoofMaterialType;
  hasPlinth: boolean;
  hasPillars?: boolean;
}

export interface StairZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  direction?: 'z' | '-z' | 'x' | '-x';
  floorHeight: number;
  totalFloors: number;
  floorIndex: number;
  baseFloorY: number;
  topFloorY: number;
}

export const PREFAB_CATALOG: Record<string, PrefabPreset> = {};

// Initialize PREFAB_CATALOG dynamically from BuildingCatalogRegistry
function initPrefabCatalog(): void {
  const buildings = BuildingCatalogRegistry.getAllBuildings();
  for (const b of buildings) {
    PREFAB_CATALOG[b.id] = {
      key: b.id,
      name: b.name,
      category: b.category,
      description: b.description,
      defaultWidth: b.defaultWidth,
      defaultLength: b.defaultDepth,
      defaultFloorCount: b.defaultFloors,
      minFloors: b.minFloors,
      maxFloors: b.maxFloors,
      floorHeight: b.floorHeight,
      defaultRoofType: b.defaultRoofType || (b.roofStyle as RoofType),
      defaultRoofOverhang: b.defaultOverhang,
      defaultWallMaterial: b.defaultWallMaterial || 'plaster',
      defaultWallColor: b.defaultWallColor || '#f8fafc',
      defaultRoofMaterial: b.defaultRoofMaterial || 'metal',
      hasPlinth: b.hasPlinth ?? true,
      hasPillars: b.hasPillars
    };
  }

  // Legacy preset aliases for backward compatibility
  if (PREFAB_CATALOG['minimarket_tropis']) {
    PREFAB_CATALOG['minimarket'] = {
      ...PREFAB_CATALOG['minimarket_tropis'],
      key: 'minimarket'
    };
  }
  if (PREFAB_CATALOG['paviliun_taman_baca']) {
    PREFAB_CATALOG['community_hall'] = {
      ...PREFAB_CATALOG['paviliun_taman_baca'],
      key: 'community_hall',
      name: 'Balai Warga / Pendopo'
    };
  }
}

initPrefabCatalog();

export interface BuildingInstance {
  id: string;
  presetKey: string;
  name: string;
  category: 'residential' | 'commercial' | 'public' | BuildingCategory | string;
  position: THREE.Vector3;
  rotationY: number; // in radians
  width: number;
  length: number;
  floorCount: number;
  floorHeight: number;
  roofType: RoofType;
  roofOverhang: number;
  wallMaterial: WallMaterialType;
  wallColor: string;
  roofMaterial: RoofMaterialType;
  roofColor?: string;
  lotId?: string;

  // Unified Custom Architecture Extensions (T2.1)
  isCustom?: boolean;
  footprintPolygon?: THREE.Vector2[]; // Local 2D polygon vertices
  floors?: FloorDefinition[];
  customRoof?: RoofDefinition;
  plinthHeight?: number;

  // Interior Architecture & Room Layouts (T5.1)
  interiorLayouts?: InteriorLayout[];
  interiorVariant?: 'variant_a' | 'variant_b' | 'variant_c';

  // Tropical Building Physics & Solar PV Extensions (Sector 3)
  hasRooftopSolar?: boolean;
  solarCapacityKwp?: number;
  solarAnnualKwh?: number;
  hasSecondarySkin?: boolean;

  // v3.0.0 Architecture & Serializer Synchronization
  archetype?: string;
  hasSolarPV?: boolean;
  customColor?: string;
  wallTexture?: string;
  minFloors?: number;
  maxFloors?: number;
  stairZones?: StairZone[];
  userData?: Record<string, any>;

  // Custom Building CAD Architecture Overhaul (v3.3.0)
  massingShape?: string;
  windowStyle?: string;
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: string;
  mullionColor?: string;
  hasSkylight?: boolean;

  // v4.1 Modular Sub-Part Customization (Miniopolis & CityRT.com) & Stretch-to-Fit
  subParts?: Partial<Record<BuildingSubPartType, BuildingSubPartDimensions>>;
  apronDepth?: number;

  // v4.1 Contractor Structural Steel Frame CAD Studio (Tahap 6)
  exposeSteelFrame?: boolean;
  hasCarportAndTopBalcony?: boolean;
  hasVerticalSecondarySkin?: boolean;
}
