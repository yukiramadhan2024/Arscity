import * as THREE from 'three';

export type RoofType = 'gable' | 'hip' | 'joglo' | 'flat' | 'dome';
export type WallMaterialType = 'plaster' | 'brick' | 'concrete' | 'wood';
export type RoofMaterialType = 'clay_tile' | 'metal' | 'concrete';

export interface PrefabPreset {
  key: string;
  name: string;
  category: 'residential' | 'commercial' | 'public';
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

export const PREFAB_CATALOG: Record<string, PrefabPreset> = {
  house_36: {
    key: 'house_36',
    name: 'Rumah Modern Tipe 36',
    category: 'residential',
    description: 'Hunian minimalis modern 1 lantai (6 x 6 m) dengan aksen kisi kayu & kanopi kantilever.',
    defaultWidth: 6,
    defaultLength: 6,
    defaultFloorCount: 1,
    floorHeight: 3.2,
    defaultRoofType: 'gable',
    defaultRoofOverhang: 0.8,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  house_54: {
    key: 'house_54',
    name: 'Villa Tropis Tipe 54',
    category: 'residential',
    description: 'Villa tropis 1 lantai (6 x 9 m) dengan teras lanai tertutup & bukaan geser panorama.',
    defaultWidth: 6,
    defaultLength: 9,
    defaultFloorCount: 1,
    floorHeight: 3.3,
    defaultRoofType: 'hip',
    defaultRoofOverhang: 1.0,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  house_2fl: {
    key: 'house_2fl',
    name: 'Villa Tropis 2 Lantai',
    category: 'residential',
    description: 'Rumah mewah 2 lantai (8 x 12 m) dengan lantai kantilever, balkon kaca, dan taman gantung.',
    defaultWidth: 8,
    defaultLength: 12,
    defaultFloorCount: 2,
    floorHeight: 3.2,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 1.2,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  joglo: {
    key: 'joglo',
    name: 'Joglo Kontemporer',
    category: 'residential',
    description: 'Perpaduan neo-vernakular Jawa: soko guru jati, umpak batu, atap brunjung bertingkat, dan beranda terbuka.',
    defaultWidth: 10,
    defaultLength: 12,
    defaultFloorCount: 1,
    floorHeight: 4.0,
    defaultRoofType: 'joglo',
    defaultRoofOverhang: 1.5,
    defaultWallMaterial: 'wood',
    defaultWallColor: '#854d0e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  ruko_3fl: {
    key: 'ruko_3fl',
    name: 'Ruko Kontemporer 3 Lantai',
    category: 'commercial',
    description: 'Boutique shophouse (5 x 15 m) berfasad kaca komersil, sirip peneduh vertikal, & balkon privat.',
    defaultWidth: 5,
    defaultLength: 15,
    defaultFloorCount: 3,
    floorHeight: 3.4,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 0.4,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#cbd5e1',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  minimarket: {
    key: 'minimarket',
    name: 'Minimarket Modern',
    category: 'commercial',
    description: 'Toko ritel modern (8 x 14 m) dengan curtain wall kaca frameless dan kanopi beriluminasi.',
    defaultWidth: 8,
    defaultLength: 14,
    defaultFloorCount: 1,
    floorHeight: 3.6,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 0.6,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  office_tower: {
    key: 'office_tower',
    name: 'Menara Kantor Modern',
    category: 'commercial',
    description: 'Gedung kantor 6 lantai (16 x 20 m) dengan ribbon curtain wall, atrium kaca, dan rooftop pergola.',
    defaultWidth: 16,
    defaultLength: 20,
    defaultFloorCount: 6,
    floorHeight: 3.5,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 0.5,
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#94a3b8',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  apartment: {
    key: 'apartment',
    name: 'Apartemen Modern',
    category: 'residential',
    description: 'Hunian vertikal 4 lantai (16 x 24 m) dengan fasad modular terartikulasi dan balkon tiap unit.',
    defaultWidth: 16,
    defaultLength: 24,
    defaultFloorCount: 4,
    floorHeight: 3.2,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 0.6,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  mosque: {
    key: 'mosque',
    name: 'Masjid Tropis Modern',
    category: 'public',
    description: 'Masjid kontemporer (16 x 16 m) berpavilun krawangan mashrabiya, kubah zamrud, dan selasar peneduh.',
    defaultWidth: 16,
    defaultLength: 16,
    defaultFloorCount: 1,
    floorHeight: 4.5,
    defaultRoofType: 'dome',
    defaultRoofOverhang: 1.2,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  },
  school: {
    key: 'school',
    name: 'Sekolah Tropis Modern',
    category: 'public',
    description: 'Kampus 2 lantai (12 x 30 m) berkoridor selasar terbuka, sun louvers, dan aksen ceria.',
    defaultWidth: 12,
    defaultLength: 30,
    defaultFloorCount: 2,
    floorHeight: 3.4,
    defaultRoofType: 'gable',
    defaultRoofOverhang: 1.2,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fef08a',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  puskesmas: {
    key: 'puskesmas',
    name: 'Puskesmas Modern',
    category: 'public',
    description: 'Klinik kesehatan 2 lantai (12 x 18 m) dengan portico drop-off darurat dan ribbon windows.',
    defaultWidth: 12,
    defaultLength: 18,
    defaultFloorCount: 2,
    floorHeight: 3.3,
    defaultRoofType: 'flat',
    defaultRoofOverhang: 1.0,
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f0fdf4',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  community_hall: {
    key: 'community_hall',
    name: 'Balai Warga / Pendopo',
    category: 'public',
    description: 'Paviliun terbuka (10 x 14 m) dengan struktur kuda-kuda kayu tereskpos dan plinth batu andesit.',
    defaultWidth: 10,
    defaultLength: 14,
    defaultFloorCount: 1,
    floorHeight: 3.8,
    defaultRoofType: 'hip',
    defaultRoofOverhang: 1.5,
    defaultWallMaterial: 'wood',
    defaultWallColor: '#78350f',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  }
};

import type { FloorDefinition, RoofDefinition } from './CustomBuildingModel';
import type { InteriorLayout } from './InteriorTypes';

export interface BuildingInstance {
  id: string;
  presetKey: string;
  name: string;
  category: 'residential' | 'commercial' | 'public';
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
  lotId?: string;

  // Unified Custom Architecture Extensions (T2.1)
  isCustom?: boolean;
  footprintPolygon?: THREE.Vector2[]; // Local 2D polygon vertices
  floors?: FloorDefinition[];
  customRoof?: RoofDefinition;
  plinthHeight?: number;

  // Interior Architecture & Room Layouts (T5.1)
  interiorLayouts?: InteriorLayout[];
}
