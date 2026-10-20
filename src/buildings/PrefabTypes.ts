import * as THREE from 'three';
import { BuildingCatalogRegistry, BuildingCategory } from './BuildingCatalogRegistry';
import type { FloorDefinition, RoofDefinition } from './CustomBuildingModel';
import type { InteriorLayout } from './InteriorTypes';

export type RoofType =
  | 'gable'
  | 'hip'
  | 'joglo'
  | 'flat'
  | 'dome'
  | 'flat_parapet'
  | 'sawtooth'
  | 'shed_industrial'
  | 'arched_vault'
  | 'butterfly';

export type WallMaterialType = 'plaster' | 'brick' | 'concrete' | 'wood';
export type RoofMaterialType = 'clay_tile' | 'metal' | 'concrete';

export interface PrefabPreset {
  key: string;
  name: string;
  category: 'residential' | 'commercial' | 'public' | BuildingCategory | string;
  description: string;
  defaultWidth: number;
  defaultLength: number;
  defaultFloorCount: number;
  floorHeight: number;
  defaultRoofType: RoofType;
  defaultRoofOverhang: number;
  defaultWallMaterial: WallMaterialType;
  defaultWallColor: string;
  defaultRoofMaterial: RoofMaterialType;
  hasPlinth: boolean;
  hasPillars?: boolean;
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

  // Tropical Building Physics & Solar PV Extensions (Sector 3)
  hasRooftopSolar?: boolean;
  solarCapacityKwp?: number;
  solarAnnualKwh?: number;
  hasSecondarySkin?: boolean;
}
