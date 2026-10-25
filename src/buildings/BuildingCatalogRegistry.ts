import { ZoneType } from '../zones/ZoneTypes';
import { RoofType, WallMaterialType, RoofMaterialType } from './PrefabTypes';

export type BuildingCategory =
  | 'hunian'
  | 'pemerintahan_keamanan'
  | 'pendidikan'
  | 'kesehatan'
  | 'perdagangan_jasa'
  | 'industri_logistik'
  | 'transportasi'
  | 'utilitas'
  | 'ibadah_budaya'
  | 'rekreasi_terbuka'
  | 'kuliner_kafe'
  | 'mall_ritel'
  | 'kampus_kos'
  | 'budaya_hotel'
  | 'publik_hijau';

export type RoofStyle =
  | 'gable'
  | 'hip'
  | 'joglo'
  | 'flat_parapet'
  | 'sawtooth'
  | 'shed_industrial'
  | 'arched_vault'
  | 'butterfly';

export type BuildingArchetype =
  | 'standard'
  | 'gacoan_industrial_hall'
  | 'burger_drivethru'
  | 'cafe_glasshouse'
  | 'cafe_rooftop'
  | 'cafe_container'
  | 'cafe_courtyard'
  | 'mall_atrium'
  | 'mall_open_plaza'
  | 'courtyard_block'
  | 'podium_tower'
  | 'arcade_shophouse'
  | 'pendopo_open'
  | 'stilted_house'
  | 'transit_canopy'
  | 'telecom_tower'
  | 'monument_obelisk'
  | 'stadium_arena'
  | 'bridge_girder'
  | 'flyover_viaduct'
  | 'substation_power'
  | 'water_clarifier'
  | 'sacred_temple'
  | 'cathedral_church'
  | 'vihara_pagoda'
  | 'klenteng_traditional';

export interface BuildingCatalogItem {
  id: string;
  name: string;
  category: BuildingCategory;
  icon: string; // Lucide icon name
  description: string;
  defaultWidth: number;
  defaultDepth: number;
  defaultLength?: number; // Backward-compatible alias for defaultDepth
  defaultFloors: number;
  defaultFloorCount?: number; // Backward-compatible alias for defaultFloors
  minFloors?: number;
  maxFloors?: number;
  floorHeight: number;
  roofStyle: RoofStyle;
  defaultRoofType?: RoofType; // Backward-compatible alias for roofStyle
  archetype: BuildingArchetype;
  defaultOverhang: number;
  windowWallRatio: number;
  hasCrossVentilation: boolean;
  isPublicAmenity: boolean;
  baseCostPerSqm: number;
  recommendedZones: ZoneType[];

  // 3D Rendering & Material Styling
  defaultWallMaterial?: WallMaterialType;
  defaultWallColor?: string;
  defaultRoofMaterial?: RoofMaterialType;
  hasPlinth?: boolean;
  hasPillars?: boolean;
}

/**
 * Single Source of Truth for all 58 buildings in Arscity.
 * Contains 10 legacy foundation buildings + 48 new architectural types.
 * All systems (Procedural Mesh Builder, Interior Layouts, Cost Estimator,
 * Thermal Analyzer, City Score Walkability, and UI Dock) read from here.
 */
const CANONICAL_BUILDING_CATALOG: BuildingCatalogItem[] = [
  // =========================================================================
  // 1. HUNIAN & PERUMAHAN (4 Bangunan Legacy)
  // =========================================================================
  {
    id: 'house_36',
    name: 'Rumah Modern Tipe 36',
    category: 'hunian',
    icon: 'Home',
    description: 'Hunian minimalis modern 1 lantai dengan aksen kisi kayu dan kanopi kantilever.',
    defaultWidth: 9,
    defaultDepth: 9,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 0.8,
    windowWallRatio: 0.28,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_800_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'house_54',
    name: 'Villa Tropis Tipe 54',
    category: 'hunian',
    icon: 'Home',
    description: 'Villa tropis 1 lantai dengan teras lanai tertutup dan bukaan geser panorama.',
    defaultWidth: 9,
    defaultDepth: 13,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_200_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'house_2fl',
    name: 'Villa Tropis 2 Lantai',
    category: 'hunian',
    icon: 'Home',
    description: 'Rumah mewah 2 lantai dengan lantai kantilever, balkon kaca, dan taman gantung.',
    defaultWidth: 12,
    defaultDepth: 17,
    defaultFloors: 2,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.42,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_800_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'apartment',
    name: 'Apartemen Modern',
    category: 'hunian',
    icon: 'Building2',
    description: 'Hunian vertikal 4 lantai dengan fasad modular terartikulasi dan balkon tiap unit.',
    defaultWidth: 22,
    defaultDepth: 34,
    defaultFloors: 4,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 0.8,
    windowWallRatio: 0.40,
    hasCrossVentilation: false,
    isPublicAmenity: false,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },

  // =========================================================================
  // 2. KULINER & KAFE (12 Bangunan Baru)
  // =========================================================================
  {
    id: 'resto_mie_gacoan',
    name: 'Resto Mie Pedas Komunal (Gacoan Style)',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Rangka baja hitam industrial bentang lebar, semi-terbuka 4 sisi untuk ventilasi silang maksimal, aksen fasad diagonal kuning-merah tegas, area antrean kurir, dan pelataran meja payung taman.',
    defaultWidth: 22,
    defaultDepth: 32,
    defaultFloors: 1,
    floorHeight: 5.5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'gacoan_industrial_hall',
    defaultOverhang: 1.8,
    windowWallRatio: 0.65,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_600_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#1e293b',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'resto_burger_drivethru',
    name: 'Burger Shop & Drive-Thru Diner',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Fasad modern dengan kanopi kantilever melengkung, jalur lintasan mobil drive-thru di sekeliling tapak, papan menu, dan teras makan.',
    defaultWidth: 20,
    defaultDepth: 26,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'burger_drivethru',
    defaultOverhang: 1.5,
    windowWallRatio: 0.55,
    hasCrossVentilation: false,
    isPublicAmenity: false,
    baseCostPerSqm: 4_500_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'cafe_industrial_tropis',
    name: 'Industrial Tropical Coffee Shop',
    category: 'kuliner_kafe',
    icon: 'Coffee',
    description: 'Kombinasi dinding bata ekspos & baja gelap, atap miring shed roof, dan halaman kerikil resapan dengan pohon peneduh.',
    defaultWidth: 14,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_000_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#b91c1c',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'cafe_joglo_kopi',
    name: 'Kopi Pendopo Joglo & Slow Bar',
    category: 'kuliner_kafe',
    icon: 'Coffee',
    description: 'Bangunan pendopo kayu jati tanpa sekat masif dengan bar seduh di tengah taman hijau.',
    defaultWidth: 17,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 5.2,
    roofStyle: 'joglo',
    defaultRoofType: 'joglo',
    archetype: 'pendopo_open',
    defaultOverhang: 2.0,
    windowWallRatio: 0.70,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_800_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#854d0e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'cafe_minimalis_kaca',
    name: 'Artisanal Glasshouse Roastery',
    category: 'kuliner_kafe',
    icon: 'Coffee',
    description: 'Fasad kaca tinggi yang dilindungi sirip kayu vertikal (sun-shading louvers) anti panas barat.',
    defaultWidth: 14,
    defaultDepth: 22,
    defaultFloors: 1,
    floorHeight: 5.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'cafe_glasshouse',
    defaultOverhang: 1.0,
    windowWallRatio: 0.75,
    hasCrossVentilation: false,
    isPublicAmenity: false,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'cafe_rooftop_senja',
    name: 'Sunset Rooftop Cafe & Roastery',
    category: 'kuliner_kafe',
    icon: 'Coffee',
    description: 'Bangunan 2 lantai dengan dek teras atas terbuka ber-pergola untuk menikmati senja.',
    defaultWidth: 17,
    defaultDepth: 22,
    defaultFloors: 2,
    floorHeight: 5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'cafe_rooftop',
    defaultOverhang: 1.0,
    windowWallRatio: 0.55,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_900_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'cafe_kontainer_park',
    name: 'Modular Container Coffee Park',
    category: 'kuliner_kafe',
    icon: 'Coffee',
    description: 'Susunan modul kontainer kargo daur ulang 2 tingkat yang disilangkan membentuk teras bawah yang teduh.',
    defaultWidth: 14,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'cafe_container',
    defaultOverhang: 0.8,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_400_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'metal',
    hasPlinth: false
  },
  {
    id: 'cafe_buku_botani',
    name: 'Botanical Book Cafe & Conservatory',
    category: 'kuliner_kafe',
    icon: 'BookOpen',
    description: 'Kafe literasi berbentuk L yang merangkul taman botani basah di sisi dalam.',
    defaultWidth: 20,
    defaultDepth: 22,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'cafe_courtyard',
    defaultOverhang: 1.4,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_300_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#78350f',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'warmindo_modern',
    name: 'Kedai Warmindo 2 Lantai',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Kuliner mahasiswa khas Yogyakarta dengan bar masak di lantai dasar dan balkon komunal di lantai atas.',
    defaultWidth: 9,
    defaultDepth: 17,
    defaultFloors: 2,
    floorHeight: 4.5,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'arcade_shophouse',
    defaultOverhang: 1.0,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_200_000,
    recommendedZones: ['commercial', 'residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f59e0b',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'angkringan_paviliun',
    name: 'Paviliun Angkringan & Kuliner Malam',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Struktur atap pelana kayu bertumpuk yang menaungi deretan gerobak kuliner dengan lampu malam hangat.',
    defaultWidth: 11,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 4.5,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'pendopo_open',
    defaultOverhang: 1.5,
    windowWallRatio: 0.70,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 2_900_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#92400e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'gelato_colonial_shop',
    name: 'Kedai Gelato & Pastry Indische',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Bangunan kolonial tropis dengan jendela krepyak tinggi, teras ubin motif, dan kanopi klasik.',
    defaultWidth: 14,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'arcade_shophouse',
    defaultOverhang: 1.4,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_600_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fef3c7',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'resto_bambu_ekologis',
    name: 'Resto Bambu Bentang Lebar',
    category: 'kuliner_kafe',
    icon: 'Utensils',
    description: 'Struktur atap organik memanjang dengan teras tepi kolam retensi.',
    defaultWidth: 20,
    defaultDepth: 28,
    defaultFloors: 1,
    floorHeight: 5.5,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'pendopo_open',
    defaultOverhang: 2.2,
    windowWallRatio: 0.75,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_800_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#b45309',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  },

  // =========================================================================
  // 3. MALL & RITEL (10 Bangunan Baru + 2 Legacy: ruko_3fl, office_tower)
  // =========================================================================
  {
    id: 'ruko_3fl',
    name: 'Ruko Kontemporer 3 Lantai',
    category: 'mall_ritel',
    icon: 'Building2',
    description: 'Boutique shophouse berfasad kaca komersil, sirip peneduh vertikal, dan balkon privat.',
    defaultWidth: 8,
    defaultDepth: 21,
    defaultFloors: 3,
    floorHeight: 4.5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'arcade_shophouse',
    defaultOverhang: 0.4,
    windowWallRatio: 0.50,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_500_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#cbd5e1',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'office_tower',
    name: 'Menara Kantor Modern',
    category: 'mall_ritel',
    icon: 'Building2',
    description: 'Gedung kantor 6 lantai dengan ribbon curtain wall, atrium kaca, dan rooftop pergola.',
    defaultWidth: 24,
    defaultDepth: 28,
    defaultFloors: 6,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 0.5,
    windowWallRatio: 0.65,
    hasCrossVentilation: false,
    isPublicAmenity: false,
    baseCostPerSqm: 6_500_000,
    recommendedZones: ['commercial', 'office'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#94a3b8',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'mall_grand_atrium',
    name: 'Grand Atrium Shopping Mall',
    category: 'mall_ritel',
    icon: 'ShoppingBag',
    description: 'Pusat perbelanjaan 4 lantai dengan podium lebar, kubah kaca skylight di tengah atap, kanopi drop-off utama, dan kisi peneduh fasad.',
    defaultWidth: 40,
    defaultDepth: 52,
    defaultFloors: 4,
    floorHeight: 5.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'mall_atrium',
    defaultOverhang: 1.2,
    windowWallRatio: 0.50,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 7_500_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'mall_lifestyle_tropis',
    name: 'Tropical Open-Air Lifestyle Mall',
    category: 'mall_ritel',
    icon: 'ShoppingBag',
    description: 'Mall 3 lantai berkonsep semi-outdoor dengan lorong terbuka penghasil efek wind-tunnel sejuk dan balkon tanaman gantung.',
    defaultWidth: 34,
    defaultDepth: 45,
    defaultFloors: 3,
    floorHeight: 5.4,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'mall_open_plaza',
    defaultOverhang: 1.8,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_800_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'minimarket_tropis',
    name: 'Minimarket Lingkungan',
    category: 'mall_ritel',
    icon: 'Store',
    description: 'Toko ritel 1 lantai dengan kanopi beton depan, area parkir berpori, dan lisplang warna khas.',
    defaultWidth: 12,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 0.6,
    windowWallRatio: 0.55,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 3_900_000,
    recommendedZones: ['commercial', 'residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'supermarket_fresh_hub',
    name: 'Supermarket & Pasar Segar Modern',
    category: 'mall_ritel',
    icon: 'Store',
    description: 'Bangunan ritel menengah dengan atap gerigi (sawtooth roof) untuk pencahayaan langit alami.',
    defaultWidth: 28,
    defaultDepth: 40,
    defaultFloors: 1,
    floorHeight: 5.5,
    roofStyle: 'sawtooth',
    defaultRoofType: 'sawtooth',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.35,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_600_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'pasar_rakyat_modern',
    name: 'Pasar Rakyat Revitalisasi',
    category: 'mall_ritel',
    icon: 'ShoppingBag',
    description: 'Pasar 2 lantai berventilasi atap bertingkat (clerestory) dan los arkade terbuka.',
    defaultWidth: 26,
    defaultDepth: 38,
    defaultFloors: 2,
    floorHeight: 5.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'mall_open_plaza',
    defaultOverhang: 1.8,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_700_000,
    recommendedZones: ['commercial', 'public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#b91c1c',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'toko_roti_heritage',
    name: 'Toko Roti & Kopi Heritage',
    category: 'mall_ritel',
    icon: 'Store',
    description: 'Bangunan sudut bergaya Art Deco Nusantara dengan menara fasad kecil dan arkade pejalan kaki.',
    defaultWidth: 12,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'arcade_shophouse',
    defaultOverhang: 1.0,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_400_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fef3c7',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'showroom_galeri_kaca',
    name: 'Showroom & Galeri Desain',
    category: 'mall_ritel',
    icon: 'Store',
    description: 'Ruang pamer berfasad kaca miring dengan tritisan space-frame lebar.',
    defaultWidth: 20,
    defaultDepth: 28,
    defaultFloors: 2,
    floorHeight: 5.2,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'cafe_glasshouse',
    defaultOverhang: 1.6,
    windowWallRatio: 0.70,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 5_400_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'bioskop_art_deco',
    name: 'Bioskop & Teater Kota',
    category: 'mall_ritel',
    icon: 'Building2',
    description: 'Gedung sinema dengan fasad relief geometris, lobi tinggi, dan plasa depan.',
    defaultWidth: 28,
    defaultDepth: 38,
    defaultFloors: 2,
    floorHeight: 5.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.25,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 6_200_000,
    recommendedZones: ['commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'apotek_klinik_24jam',
    name: 'Apotek & Klinik Pratama',
    category: 'mall_ritel',
    icon: 'Activity',
    description: 'Fasilitas kesehatan warga dengan ramp aksesibilitas dan kanopi teduh.',
    defaultWidth: 14,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.40,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_700_000,
    recommendedZones: ['commercial', 'public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f0fdf4',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'pasar_kreatif_umkm',
    name: 'Galeri Batik, Kriya & UMKM Hub',
    category: 'mall_ritel',
    icon: 'ShoppingBag',
    description: 'Ruang pamer kerajinan lokal beratap limasan kembar dan dinding bata roster.',
    defaultWidth: 20,
    defaultDepth: 26,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'pendopo_open',
    defaultOverhang: 1.6,
    windowWallRatio: 0.55,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_900_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#9a3412',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },

  // =========================================================================
  // 4. KAMPUS & KOS (8 Bangunan Baru + 1 Legacy: school)
  // =========================================================================
  {
    id: 'school',
    name: 'Sekolah Tropis Modern',
    category: 'kampus_kos',
    icon: 'GraduationCap',
    description: 'Kampus 2 lantai berkoridor selasar terbuka, sun louvers, dan aksen ceria.',
    defaultWidth: 18,
    defaultDepth: 42,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_200_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fef08a',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'kos_eksklusif_courtyard',
    name: 'Kos Eksklusif Inner Courtyard',
    category: 'kampus_kos',
    icon: 'Home',
    description: 'Hunian mahasiswa 3 lantai dengan taman terbuka di tengah gedung untuk ventilasi silang tiap kamar.',
    defaultWidth: 22,
    defaultDepth: 28,
    defaultFloors: 3,
    floorHeight: 4.2,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'courtyard_block',
    defaultOverhang: 1.2,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_200_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'kos_tropis_balkon',
    name: 'Rumah Kos Deret Balkon',
    category: 'kampus_kos',
    icon: 'Home',
    description: 'Bangunan kos 2 lantai memanjang dengan deretan pintu kamar, balkon teras, dan sirip peneduh.',
    defaultWidth: 12,
    defaultDepth: 28,
    defaultFloors: 2,
    floorHeight: 4.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_800_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'coworking_hub_tropis',
    name: 'Co-Working Space & Creative Hub',
    category: 'kampus_kos',
    icon: 'Building2',
    description: 'Ruang kerja kolaboratif dengan tangga duduk amfiteater luar dan atap hijau.',
    defaultWidth: 20,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'cafe_rooftop',
    defaultOverhang: 1.2,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_100_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'perpustakaan_daerah',
    name: 'Perpustakaan Kota & Ruang Baca',
    category: 'kampus_kos',
    icon: 'BookOpen',
    description: 'Gedung publik dengan fasad kisi terakota penahan radiasi matahari.',
    defaultWidth: 22,
    defaultDepth: 32,
    defaultFloors: 2,
    floorHeight: 5.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.4,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#c2410c',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'kampus_studio_arsitektur',
    name: 'Gedung Kampus Studio Desain',
    category: 'kampus_kos',
    icon: 'GraduationCap',
    description: 'Dua blok gedung kuliah 3 lantai yang dihubungkan jembatan layang di atas plasa hijau.',
    defaultWidth: 28,
    defaultDepth: 40,
    defaultFloors: 3,
    floorHeight: 5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'courtyard_block',
    defaultOverhang: 1.4,
    windowWallRatio: 0.55,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#cbd5e1',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'asrama_mahasiswa_hijau',
    name: 'Asrama Mahasiswa Ramah Lingkungan',
    category: 'kampus_kos',
    icon: 'Home',
    description: 'Gedung asrama 4 lantai dengan kebun atap (green roof) dan balkon komunal.',
    defaultWidth: 22,
    defaultDepth: 34,
    defaultFloors: 4,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'courtyard_block',
    defaultOverhang: 1.0,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_400_000,
    recommendedZones: ['public_facility', 'residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'toko_percetakan_desain',
    name: 'Pusat Percetakan & Plotter CAD',
    category: 'kampus_kos',
    icon: 'Store',
    description: 'Ruko 2 lantai penunjang kawasan pendidikan.',
    defaultWidth: 9,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'arcade_shophouse',
    defaultOverhang: 0.8,
    windowWallRatio: 0.45,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_100_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#e0f2fe',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'pusat_riset_iklim',
    name: 'Laboratorium Sains Bangunan Tropis',
    category: 'kampus_kos',
    icon: 'GraduationCap',
    description: 'Gedung riset dengan menara penangkap angin (windcatcher) dan instrumen surya.',
    defaultWidth: 22,
    defaultDepth: 28,
    defaultFloors: 3,
    floorHeight: 5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.2,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#94a3b8',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },

  // =========================================================================
  // 5. BUDAYA & HOTEL (10 Bangunan Baru + 1 Legacy: joglo)
  // =========================================================================
  {
    id: 'joglo',
    name: 'Joglo Kontemporer',
    category: 'budaya_hotel',
    icon: 'Landmark',
    description: 'Perpaduan neo-vernakular Jawa: soko guru jati, umpak batu, atap brunjung bertingkat, dan beranda terbuka.',
    defaultWidth: 15,
    defaultDepth: 18,
    defaultFloors: 1,
    floorHeight: 5.5,
    roofStyle: 'joglo',
    defaultRoofType: 'joglo',
    archetype: 'pendopo_open',
    defaultOverhang: 1.5,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#854d0e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'boutique_hotel_jogja',
    name: 'Boutique Hotel Tropis Yogyakarta',
    category: 'budaya_hotel',
    icon: 'Hotel',
    description: 'Hotel 4 lantai berbentuk U mengelilingi taman dalam dan kolam reflektif dengan lobi pendopo.',
    defaultWidth: 30,
    defaultDepth: 40,
    defaultFloors: 4,
    floorHeight: 4.5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'courtyard_block',
    defaultOverhang: 1.4,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_400_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fdf4ff',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'homestay_kampung_wisata',
    name: 'Homestay Kampung Wisata Limasan',
    category: 'budaya_hotel',
    icon: 'Home',
    description: 'Klaster penginapan beratap limasan Jawa dengan teras kayu.',
    defaultWidth: 12,
    defaultDepth: 17,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'standard',
    defaultOverhang: 1.6,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_800_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#78350f',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'townhouse_tropis_modern',
    name: 'Townhouse Compact 2.5 Lantai',
    category: 'budaya_hotel',
    icon: 'Home',
    description: 'Hunian perkotaan split-level dengan taman atap kecil.',
    defaultWidth: 9,
    defaultDepth: 20,
    defaultFloors: 3,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 0.8,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_600_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'rumah_tumbuh_modular',
    name: 'Rumah Tumbuh Modular Tahan Gempa',
    category: 'budaya_hotel',
    icon: 'Home',
    description: 'Hunian kompak berstruktur rangka beton pracetak tegas.',
    defaultWidth: 9,
    defaultDepth: 15,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.30,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 3_200_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#cbd5e1',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'apartemen_hijau_terracotta',
    name: 'Mid-Rise Green Apartment 6 Lantai',
    category: 'budaya_hotel',
    icon: 'Building2',
    description: 'Hunian vertikal menengah dengan kantong taman gantung (sky terrace).',
    defaultWidth: 25,
    defaultDepth: 34,
    defaultFloors: 6,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.0,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 5_500_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#ea580c',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'pendopo_agung_budaya',
    name: 'Pendopo Agung & Panggung Budaya',
    category: 'budaya_hotel',
    icon: 'Landmark',
    description: 'Struktur Joglo agung terbuka dengan 4 tiang Saka Guru ber-umpak batu candi tanpa dinding penutup.',
    defaultWidth: 24,
    defaultDepth: 30,
    defaultFloors: 1,
    floorHeight: 6,
    roofStyle: 'joglo',
    defaultRoofType: 'joglo',
    archetype: 'pendopo_open',
    defaultOverhang: 2.2,
    windowWallRatio: 0.85,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_600_000,
    recommendedZones: ['public_facility', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#78350f',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'museum_arsitektur_nusantara',
    name: 'Museum & Galeri Sejarah Kota',
    category: 'budaya_hotel',
    icon: 'Landmark',
    description: 'Bangunan Indische Empire dengan barisan kolom putih dan beranda keliling lebar.',
    defaultWidth: 26,
    defaultDepth: 38,
    defaultFloors: 2,
    floorHeight: 5.5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'arcade_shophouse',
    defaultOverhang: 1.8,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_000_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'sanggar_batik_kriya',
    name: 'Sanggar Batik & Kriya Kayu',
    category: 'budaya_hotel',
    icon: 'Landmark',
    description: 'Bangunan workshop semi-terbuka dengan pelataran jemur kain dan kolam filtrasi.',
    defaultWidth: 17,
    defaultDepth: 22,
    defaultFloors: 1,
    floorHeight: 4.8,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'pendopo_open',
    defaultOverhang: 1.6,
    windowWallRatio: 0.65,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_500_000,
    recommendedZones: ['mixed_use', 'commercial'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#92400e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'rumah_panggung_kayu',
    name: 'Rumah Panggung Kayu Vernakular',
    category: 'budaya_hotel',
    icon: 'Home',
    description: 'Rumah kayu di atas tiang panggung setinggi 1.8m (tahan banjir & memaksimalkan resapan tanah di bawahnya).',
    defaultWidth: 12,
    defaultDepth: 17,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'stilted_house',
    defaultOverhang: 1.5,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_200_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#78350f',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: false,
    hasPillars: true
  },
  {
    id: 'villa_courtyard_tropis',
    name: 'Resort Villa Courtyard & Bale',
    category: 'budaya_hotel',
    icon: 'Hotel',
    description: 'Kompleks villa dengan paviliun utama, kolam tepi, dan gazebo taman.',
    defaultWidth: 20,
    defaultDepth: 26,
    defaultFloors: 1,
    floorHeight: 4.5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'cafe_courtyard',
    defaultOverhang: 1.6,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['commercial', 'residential'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#854d0e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },

  // =========================================================================
  // 6. PUBLIK & HIJAU (8 Bangunan Baru + 2 Legacy: mosque, puskesmas)
  // =========================================================================
  {
    id: 'mosque',
    name: 'Masjid Tropis Modern',
    category: 'publik_hijau',
    icon: 'Landmark',
    description: 'Masjid kontemporer berpavilun krawangan mashrabiya, kubah zamrud, dan selasar peneduh.',
    defaultWidth: 24,
    defaultDepth: 24,
    defaultFloors: 1,
    floorHeight: 5.8,
    roofStyle: 'hip',
    defaultRoofType: 'dome',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'puskesmas',
    name: 'Puskesmas Modern',
    category: 'publik_hijau',
    icon: 'Activity',
    description: 'Klinik kesehatan 2 lantai dengan portico drop-off darurat dan ribbon windows.',
    defaultWidth: 17,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.35,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f0fdf4',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'halte_transit_hub',
    name: 'Halte Transit Bus & Hub Sepeda',
    category: 'publik_hijau',
    icon: 'Train',
    description: 'Kanopi transit pejalan kaki dengan peron tinggi dan peneduh tanaman.',
    defaultWidth: 9,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 4.5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'transit_canopy',
    defaultOverhang: 1.5,
    windowWallRatio: 0.80,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 2_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'stasiun_komuter_heritage',
    name: 'Stasiun Kereta Komuter Heritage',
    category: 'publik_hijau',
    icon: 'Train',
    description: 'Bangunan stasiun bergaya kolonial dengan kanopi peron memanjang.',
    defaultWidth: 20,
    defaultDepth: 40,
    defaultFloors: 1,
    floorHeight: 5.8,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'transit_canopy',
    defaultOverhang: 2.0,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#b91c1c',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'gedung_parkir_hijau',
    name: 'Gedung Parkir Vertikal Fasad Hijau',
    category: 'publik_hijau',
    icon: 'Building2',
    description: 'Struktur parkir 4 lantai dengan kisi-kisi ventilasi terbuka dan tanaman rambat.',
    defaultWidth: 28,
    defaultDepth: 34,
    defaultFloors: 4,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 0.6,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_800_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#64748b',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'gor_olahraga_tropis',
    name: 'Gelanggang Olahraga (GOR) Tropis',
    category: 'publik_hijau',
    icon: 'Building2',
    description: 'Gedung olahraga beratap lengkung tinggi (arched vault) dengan deretan jendela jalusi atas.',
    defaultWidth: 34,
    defaultDepth: 50,
    defaultFloors: 1,
    floorHeight: 7.5,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'standard',
    defaultOverhang: 1.8,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'paviliun_taman_baca',
    name: 'Paviliun Taman Baca & RTH Kota',
    category: 'publik_hijau',
    icon: 'Trees',
    description: 'Bangunan kayu terbuka di tengah taman hijau dengan KDH >80%.',
    defaultWidth: 12,
    defaultDepth: 15,
    defaultFloors: 1,
    floorHeight: 4.5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'pendopo_open',
    defaultOverhang: 1.8,
    windowWallRatio: 0.70,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 3_200_000,
    recommendedZones: ['green_space', 'public_facility'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#854d0e',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'pusat_daur_ulang_tps3r',
    name: 'Fasilitas Daur Ulang & TPS 3R',
    category: 'publik_hijau',
    icon: 'Trees',
    description: 'Bangunan utilitas lingkungan beratap miring tinggi dengan sabuk pepohonan.',
    defaultWidth: 17,
    defaultDepth: 24,
    defaultFloors: 1,
    floorHeight: 5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.30,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 2_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#64748b',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'pos_pemadam_mitigasi',
    name: 'Pos Pemadam & Tanggap Bencana',
    category: 'publik_hijau',
    icon: 'Flame',
    description: 'Gedung siaga bencana dengan pintu garasi ganda merah dan menara pantau.',
    defaultWidth: 20,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 5.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.35,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 4_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#dc2626',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'kapel_roster_tropis',
    name: 'Bangunan Ibadah Kontemplatif Roster',
    category: 'publik_hijau',
    icon: 'Landmark',
    description: 'Arsitektur tropis tenang dengan dinding bata berlubang (breeze block) dan celah cahaya atap.',
    defaultWidth: 15,
    defaultDepth: 24,
    defaultFloors: 1,
    floorHeight: 5.8,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 1.4,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#9a3412',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },

  // =========================================================================
  // 7. HUNIAN & PERUMAHAN BARU (2 Bangunan)
  // =========================================================================
  {
    id: 'perumahan_cluster_asri',
    name: 'Perumahan Cluster Asri',
    category: 'hunian',
    icon: 'Home',
    description: 'Kompleks perumahan tapak modern bernuansa hijau dengan jalan lingkungan dan taman cluster.',
    defaultWidth: 16,
    defaultDepth: 14,
    defaultFloors: 2,
    floorHeight: 4.0,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.32,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['residential'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'clay_tile'
  },
  {
    id: 'rusunawa_rakyat',
    name: 'Rusunawa Bertingkat Rakyat',
    category: 'hunian',
    icon: 'Building2',
    description: 'Rumah susun sewa sederhana 5 lantai untuk masyarakat berpenghasilan rendah dengan koridor ventilasi silang.',
    defaultWidth: 24,
    defaultDepth: 16,
    defaultFloors: 5,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'courtyard_block',
    defaultOverhang: 0.8,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_600_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'concrete'
  },

  // =========================================================================
  // 8. PEMERINTAHAN & KEAMANAN (6 Bangunan)
  // =========================================================================
  {
    id: 'balai_kota_pemerintahan',
    name: 'Balai Kota Pemerintahan',
    category: 'pemerintahan_keamanan',
    icon: 'Landmark',
    description: 'Pusat administrasi pemerintahan kota megah dengan fasad kolom neoklasik tropis dan kubah sentral.',
    defaultWidth: 42,
    defaultDepth: 32,
    defaultFloors: 4,
    floorHeight: 4.5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.5,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 8_500_000,
    recommendedZones: ['public_facility', 'office'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'kantor_kecamatan_kelurahan',
    name: 'Kantor Terpadu Kecamatan & Kelurahan',
    category: 'pemerintahan_keamanan',
    icon: 'Building2',
    description: 'Gedung pelayanan publik terpadu tingkat kecamatan dengan loket administrasi kependudukan dan ruang warga.',
    defaultWidth: 22,
    defaultDepth: 18,
    defaultFloors: 2,
    floorHeight: 4.0,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_400_000,
    recommendedZones: ['public_facility', 'office'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'clay_tile'
  },
  {
    id: 'kantor_polisi_resor',
    name: 'Kantor Kepolisian Resor (Polres)',
    category: 'pemerintahan_keamanan',
    icon: 'ShieldCheck',
    description: 'Markas kepolisian kota dengan sentra pelayanan kepolisian terpadu, ruang tahanan aman, dan garasi patroli.',
    defaultWidth: 28,
    defaultDepth: 22,
    defaultFloors: 3,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.30,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_200_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#1e293b',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pos_pemadam_kebakaran',
    name: 'Markas Pemadam Kebakaran & Penyelamatan',
    category: 'pemerintahan_keamanan',
    icon: 'Flame',
    description: 'Pos damkar siaga 24 jam dengan 3 bay garasi armada pemadam, menara latihan selang, dan asrama kru.',
    defaultWidth: 26,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.6,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.28,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#b91c1c',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'gedung_pengadilan_negeri',
    name: 'Gedung Pengadilan Negeri',
    category: 'pemerintahan_keamanan',
    icon: 'Scale',
    description: 'Balai keadilan resmi berkontur wibawa dengan ruang sidang utama, pilar monumental, dan sistem pengamanan ketat.',
    defaultWidth: 32,
    defaultDepth: 26,
    defaultFloors: 3,
    floorHeight: 4.4,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'podium_tower',
    defaultOverhang: 1.4,
    windowWallRatio: 0.32,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_800_000,
    recommendedZones: ['public_facility', 'office'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'metal',
    hasPlinth: true,
    hasPillars: true
  },
  {
    id: 'kantor_pos_giro',
    name: 'Kantor Pos & Logistik Giro',
    category: 'pemerintahan_keamanan',
    icon: 'Mail',
    description: 'Pusat layanan surat pos, ekspedisi paket kilat, dan layanan keuangan giro dengan loket antrean modern.',
    defaultWidth: 18,
    defaultDepth: 16,
    defaultFloors: 2,
    floorHeight: 4.0,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.38,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_100_000,
    recommendedZones: ['commercial', 'public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ea580c',
    defaultRoofMaterial: 'clay_tile'
  },

  // =========================================================================
  // 9. PENDIDIKAN (1 Bangunan Baru)
  // =========================================================================
  {
    id: 'lembaga_kursus_pelatihan',
    name: 'Lembaga Kursus & Pelatihan Kejuruan',
    category: 'pendidikan',
    icon: 'BookOpen',
    description: 'Pusat pelatihan vokasi dan ketrampilan kerja dilengkapi laboratorium komputer cerdas dan studio bahasa.',
    defaultWidth: 20,
    defaultDepth: 18,
    defaultFloors: 3,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 0.8,
    windowWallRatio: 0.42,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_300_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'concrete'
  },

  // =========================================================================
  // 10. KESEHATAN (2 Bangunan Baru)
  // =========================================================================
  {
    id: 'rumah_sakit_umum_daerah',
    name: 'Rumah Sakit Umum Daerah (RSUD Tipe A)',
    category: 'kesehatan',
    icon: 'HeartPulse',
    description: 'Kompleks rumah sakit rujukan modern dengan instalasi gawat darurat (IGD), rawat inap bertingkat, dan helipad.',
    defaultWidth: 48,
    defaultDepth: 36,
    defaultFloors: 6,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.2,
    windowWallRatio: 0.45,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 9_200_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'concrete',
    hasPlinth: true
  },
  {
    id: 'klinik_pratama_warga',
    name: 'Klinik Pratama Rawat Jalan',
    category: 'kesehatan',
    icon: 'Cross',
    description: 'Klinik kesehatan tingkat pertama dengan dokter umum, dokter gigi, ruang bersalin, dan laboratorium dasar.',
    defaultWidth: 16,
    defaultDepth: 14,
    defaultFloors: 2,
    floorHeight: 4.0,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.36,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 5_200_000,
    recommendedZones: ['residential', 'commercial', 'public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'metal'
  },

  // =========================================================================
  // 11. PERDAGANGAN & JASA (1 Bangunan Baru)
  // =========================================================================
  {
    id: 'gedung_bank_sentral',
    name: 'Gedung Bank & Keuangan Daerah',
    category: 'perdagangan_jasa',
    icon: 'Landmark',
    description: 'Menara kantor perbankan bertingkat tinggi dengan galeri ATM 24 jam, brankas bawah tanah, dan fasad kaca reflektif.',
    defaultWidth: 30,
    defaultDepth: 26,
    defaultFloors: 8,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.0,
    windowWallRatio: 0.65,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 8_900_000,
    recommendedZones: ['commercial', 'office'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'metal'
  },

  // =========================================================================
  // 12. INDUSTRI & LOGISTIK (4 Bangunan)
  // =========================================================================
  {
    id: 'pabrik_manufaktur_modern',
    name: 'Pabrik Manufaktur & Perakitan Modern',
    category: 'industri_logistik',
    icon: 'Factory',
    description: 'Hanggar industri beratap lengkung ventilasi tinggi dengan jalur perakitan conveyor otomatis dan dermaga bongkar muat.',
    defaultWidth: 45,
    defaultDepth: 30,
    defaultFloors: 2,
    floorHeight: 6.0,
    roofStyle: 'sawtooth',
    defaultRoofType: 'sawtooth',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.20,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_800_000,
    recommendedZones: ['office', 'commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#475569',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'kawasan_industri_terpadu',
    name: 'Pusat Pengelola Kawasan Industri',
    category: 'industri_logistik',
    icon: 'Boxes',
    description: 'Pusat administrasi kawasan industri terintegrasi dengan timbangan truk digital, gardu kendali, dan kantor bea cukai.',
    defaultWidth: 36,
    defaultDepth: 24,
    defaultFloors: 3,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 5_600_000,
    recommendedZones: ['office', 'commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#334155',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pergudangan_logistik_kargo',
    name: 'Gudang Logistik & Hub Distribusi Kargo',
    category: 'industri_logistik',
    icon: 'Warehouse',
    description: 'Pusat pergudangan e-commerce dan kargo kontainer dengan 8 pintu loading dock serta sistem racking bertingkat.',
    defaultWidth: 50,
    defaultDepth: 32,
    defaultFloors: 1,
    floorHeight: 8.5,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'standard',
    defaultOverhang: 1.8,
    windowWallRatio: 0.15,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_200_000,
    recommendedZones: ['commercial', 'office'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#64748b',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pelabuhan_kering_dryport',
    name: 'Depot Kontainer & Pelabuhan Kering (Dry Port)',
    category: 'industri_logistik',
    icon: 'Boxes',
    description: 'Fasilitas penumpukan dan konsolidasi peti kemas darat dengan crane gantry rel dan pemeriksaan bea cukai.',
    defaultWidth: 56,
    defaultDepth: 36,
    defaultFloors: 2,
    floorHeight: 5.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.22,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 4_900_000,
    recommendedZones: ['commercial', 'office'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#1e293b',
    defaultRoofMaterial: 'concrete'
  },

  // =========================================================================
  // 13. TRANSPORTASI (5 Bangunan)
  // =========================================================================
  {
    id: 'terminal_bus_antarkota',
    name: 'Terminal Bus Antarkota & Antarprovinsi',
    category: 'transportasi',
    icon: 'Bus',
    description: 'Terminal transportasi darat tipe A berkanopi kantilever luas dengan ruang tunggu ber-AC dan jalur peron bus teratur.',
    defaultWidth: 44,
    defaultDepth: 28,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'transit_canopy',
    defaultOverhang: 2.5,
    windowWallRatio: 0.50,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_500_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'bandara_terminal_udara',
    name: 'Terminal Penumpang Bandara Udara',
    category: 'transportasi',
    icon: 'Plane',
    description: 'Gedung terminal bandara aerodinamis dengan kanopi ombak bentang lebar, ruang boarding luas, dan menara ATC pengawas.',
    defaultWidth: 64,
    defaultDepth: 40,
    defaultFloors: 3,
    floorHeight: 5.5,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'transit_canopy',
    defaultOverhang: 3.0,
    windowWallRatio: 0.60,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 12_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pelabuhan_dermaga_laut',
    name: 'Gedung Terminal Dermaga & Pelabuhan Laut',
    category: 'transportasi',
    icon: 'Ship',
    description: 'Terminal penumpang kapal feri dan pesiar dengan jembatan garbarata kapal, mercusuar maritim, dan teras dermaga laut.',
    defaultWidth: 42,
    defaultDepth: 30,
    defaultFloors: 2,
    floorHeight: 5.0,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'transit_canopy',
    defaultOverhang: 2.0,
    windowWallRatio: 0.52,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0369a1',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'jembatan_penyeberangan_girder',
    name: 'Jembatan Penghubung Antarwilayah (Girder Bridge)',
    category: 'transportasi',
    icon: 'GitCommit',
    description: 'Struktur jembatan gelagar baja dan beton kokoh melintasi rintangan sungai dengan trotoar pejalan kaki dan penerangan terpadu.',
    defaultWidth: 36,
    defaultDepth: 14,
    defaultFloors: 1,
    floorHeight: 5.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'bridge_girder',
    defaultOverhang: 0.5,
    windowWallRatio: 0.10,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 8_200_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#64748b',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'flyover_jalan_layang',
    name: 'Flyover Segmen Jalan Layang Kota',
    category: 'transportasi',
    icon: 'TrendingUp',
    description: 'Jalan layang viaduct bertingkat bertopang pilar beton segmental mengurai kemacetan lalu lintas persimpangan arteri.',
    defaultWidth: 40,
    defaultDepth: 16,
    defaultFloors: 2,
    floorHeight: 6.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'flyover_viaduct',
    defaultOverhang: 0.6,
    windowWallRatio: 0.05,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 9_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#475569',
    defaultRoofMaterial: 'concrete'
  },

  // =========================================================================
  // 14. UTILITAS (6 Bangunan)
  // =========================================================================
  {
    id: 'gardu_induk_listrik',
    name: 'Gardu Induk Distribusi Listrik Kota',
    category: 'utilitas',
    icon: 'Zap',
    description: 'Instalasi gardu trafo daya tegangan tinggi dengan pemutus sirkuit gas (GIS), tiang isolator, dan pagar pengaman.',
    defaultWidth: 26,
    defaultDepth: 20,
    defaultFloors: 1,
    floorHeight: 5.5,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'substation_power',
    defaultOverhang: 0.6,
    windowWallRatio: 0.12,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_100_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#334155',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pembangkit_listrik_surya_bio',
    name: 'Pembangkit Listrik Tenaga Surya & Bioenergi',
    category: 'utilitas',
    icon: 'Sun',
    description: 'Pembangkit energi bersih terbarukan berbasis susunan panel fotovoltaik atap masif dan unit konversi biomassa ramah lingkungan.',
    defaultWidth: 38,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 4.5,
    roofStyle: 'sawtooth',
    defaultRoofType: 'sawtooth',
    archetype: 'substation_power',
    defaultOverhang: 1.2,
    windowWallRatio: 0.25,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 8_400_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#0f766e',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'instalasi_pengolahan_air_pdam',
    name: 'Instalasi Pengolahan Air Bersih (IPA PDAM)',
    category: 'utilitas',
    icon: 'Droplets',
    description: 'Fasilitas filtrasi dan pemurnian air minum kota dengan kolam sedimentasi bundar, bak aerasi, dan menara pompa distribusi.',
    defaultWidth: 34,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 4.8,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'water_clarifier',
    defaultOverhang: 0.8,
    windowWallRatio: 0.20,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'instalasi_pengolahan_limbah_ipal',
    name: 'Instalasi Pengolahan Air Limbah Terpadu (IPAL)',
    category: 'utilitas',
    icon: 'Recycle',
    description: 'Pusat pengolahan air limbah domestik perkotaan dengan reaktor anaerobik, bak sedimentasi sekunder, dan sistem biofilter.',
    defaultWidth: 32,
    defaultDepth: 24,
    defaultFloors: 2,
    floorHeight: 4.6,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'water_clarifier',
    defaultOverhang: 0.8,
    windowWallRatio: 0.18,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_700_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#15803d',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'tpa_sanitary_landfill',
    name: 'Pusat Pengolahan Sampah Terpadu (TPS & TPA)',
    category: 'utilitas',
    icon: 'Trash2',
    description: 'Fasilitas pemilahan sampah daur ulang, komposting organik, dan pengolahan residu sanitary landfill modern.',
    defaultWidth: 36,
    defaultDepth: 26,
    defaultFloors: 1,
    floorHeight: 6.2,
    roofStyle: 'shed_industrial',
    defaultRoofType: 'shed_industrial',
    archetype: 'standard',
    defaultOverhang: 1.2,
    windowWallRatio: 0.15,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 4_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#57534e',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'menara_telekomunikasi_bts',
    name: 'Menara Telekomunikasi Seluler (Tower BTS)',
    category: 'utilitas',
    icon: 'Radio',
    description: 'Menara transmisi telekomunikasi 4G/5G bertipe rangka baja lattice kokoh dengan perangkat shelter kendali sinyal.',
    defaultWidth: 12,
    defaultDepth: 12,
    defaultFloors: 1,
    floorHeight: 24.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'telecom_tower',
    defaultOverhang: 0.4,
    windowWallRatio: 0.05,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_500_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#dc2626',
    defaultRoofMaterial: 'metal'
  },

  // =========================================================================
  // 15. IBADAH & BUDAYA (7 Bangunan)
  // =========================================================================
  {
    id: 'gereja_katedral_menara',
    name: 'Gereja Katedral Menara Salib',
    category: 'ibadah_budaya',
    icon: 'Church',
    description: 'Katedral agung dengan nave langit-langit kubah berkaca patri warna-warni dan menara lonceng menjulang tinggi.',
    defaultWidth: 26,
    defaultDepth: 36,
    defaultFloors: 2,
    floorHeight: 7.5,
    roofStyle: 'gable',
    defaultRoofType: 'gable',
    archetype: 'cathedral_church',
    defaultOverhang: 1.4,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_600_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'pura_kahyangan_nusantara',
    name: 'Pura Kahyangan Candi Bentar',
    category: 'ibadah_budaya',
    icon: 'Landmark',
    description: 'Tempat ibadah Hindu bernuansa sakral Bali-Jawa dengan candi bentar kembar, pelataran jaba tengah, dan meru tumpang kayu jati.',
    defaultWidth: 24,
    defaultDepth: 28,
    defaultFloors: 1,
    floorHeight: 6.8,
    roofStyle: 'joglo',
    defaultRoofType: 'joglo',
    archetype: 'sacred_temple',
    defaultOverhang: 1.6,
    windowWallRatio: 0.20,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_900_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'brick',
    defaultWallColor: '#b45309',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'vihara_dharma_meditasi',
    name: 'Vihara Buddha Dharma Loka',
    category: 'ibadah_budaya',
    icon: 'Compass',
    description: 'Pusat meditasi dan ibadah Buddha berarsitektur pagoda hening dengan atap bertingkat teratur dan aula rupang emas.',
    defaultWidth: 22,
    defaultDepth: 26,
    defaultFloors: 2,
    floorHeight: 5.5,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'vihara_pagoda',
    defaultOverhang: 1.8,
    windowWallRatio: 0.30,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#fef08a',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'klenteng_tri_dharma',
    name: 'Klenteng Bersejarah Tri Dharma',
    category: 'ibadah_budaya',
    icon: 'Flame',
    description: 'Kelenteng tradisional berhias ukiran naga kembar, tiang merah cerah bersanding lampion, dan gerbang beratap lengkung khas.',
    defaultWidth: 20,
    defaultDepth: 24,
    defaultFloors: 1,
    floorHeight: 5.8,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'klenteng_traditional',
    defaultOverhang: 1.8,
    windowWallRatio: 0.25,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 7_100_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#b91c1c',
    defaultRoofMaterial: 'clay_tile',
    hasPlinth: true
  },
  {
    id: 'gedung_teater_pertunjukan',
    name: 'Gedung Teater & Seni Pertunjukan',
    category: 'ibadah_budaya',
    icon: 'Theater',
    description: 'Gedung auditorium pertunjukan seni berkapasitas 800 penonton dengan akustik berstandar dunia dan panggung proscenium.',
    defaultWidth: 36,
    defaultDepth: 30,
    defaultFloors: 3,
    floorHeight: 5.2,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'podium_tower',
    defaultOverhang: 1.5,
    windowWallRatio: 0.25,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 8_800_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#475569',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },
  {
    id: 'galeri_seni_kontemporer',
    name: 'Galeri Seni & Budaya Kontemporer',
    category: 'ibadah_budaya',
    icon: 'Palette',
    description: 'Ruang pameran karya seni rupa modern dengan pencahayaan skylight terarah, partisi dinamis, dan kafe seni semi terbuka.',
    defaultWidth: 24,
    defaultDepth: 20,
    defaultFloors: 2,
    floorHeight: 4.6,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'standard',
    defaultOverhang: 1.0,
    windowWallRatio: 0.40,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_400_000,
    recommendedZones: ['public_facility', 'commercial'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f8fafc',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'monumen_tugu_kota',
    name: 'Monumen Tugu Titik Nol Kota',
    category: 'ibadah_budaya',
    icon: 'Landmark',
    description: 'Monumen tugu lambang persatuan kota bermahkota kubah emas dengan air mancur melingkar dan pelataran upacara berundak.',
    defaultWidth: 16,
    defaultDepth: 16,
    defaultFloors: 1,
    floorHeight: 18.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'monument_obelisk',
    defaultOverhang: 0.6,
    windowWallRatio: 0.05,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 9_000_000,
    recommendedZones: ['public_facility', 'green_space'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#e2e8f0',
    defaultRoofMaterial: 'metal',
    hasPlinth: true
  },

  // =========================================================================
  // 16. REKREASI & RUANG TERBUKA (5 Bangunan)
  // =========================================================================
  {
    id: 'taman_kota_terbuka',
    name: 'Taman Kota Terbuka Hijau (Green Park)',
    category: 'rekreasi_terbuka',
    icon: 'Trees',
    description: 'Ruang terbuka hijau publik seluas 40x40 meter dengan pepohonan kanopi rindang, jalur pedestrian jogging, dan gazebo santai.',
    defaultWidth: 40,
    defaultDepth: 40,
    defaultFloors: 1,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'pendopo_open',
    defaultOverhang: 1.5,
    windowWallRatio: 0.10,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 2_800_000,
    recommendedZones: ['green_space', 'public_facility'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#15803d',
    defaultRoofMaterial: 'clay_tile'
  },
  {
    id: 'lapangan_alun_alun_kota',
    name: 'Alun-Alun & Lapangan Terbuka Kota',
    category: 'rekreasi_terbuka',
    icon: 'Maximize2',
    description: 'Pusat kegiatan warga dan upacara kenegaraan dengan hamparan rumput hijau, panggung rakyat, dan ring beringin kembar.',
    defaultWidth: 48,
    defaultDepth: 48,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'pendopo_open',
    defaultOverhang: 1.8,
    windowWallRatio: 0.10,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 2_500_000,
    recommendedZones: ['green_space', 'public_facility'],
    defaultWallMaterial: 'wood',
    defaultWallColor: '#166534',
    defaultRoofMaterial: 'clay_tile'
  },
  {
    id: 'stadion_olahraga_kota',
    name: 'Stadion Sepak Bola & Atletik Kota',
    category: 'rekreasi_terbuka',
    icon: 'Trophy',
    description: 'Arena olahraga bertaraf nasional dengan tribun keliling berkapasitas 15.000 penonton, lapangan rumput, dan lintasan lari.',
    defaultWidth: 60,
    defaultDepth: 44,
    defaultFloors: 3,
    floorHeight: 6.0,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'stadium_arena',
    defaultOverhang: 2.5,
    windowWallRatio: 0.20,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 11_500_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#1e293b',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pusat_olahraga_sportcenter',
    name: 'Pusat Olahraga & Kebugaran (Sport Center)',
    category: 'rekreasi_terbuka',
    icon: 'Dumbbell',
    description: 'Gelanggang serbaguna mencakup lapangan basket, futsal, kolam renang semi olimpiade, dan gym kebugaran terpadu.',
    defaultWidth: 38,
    defaultDepth: 28,
    defaultFloors: 2,
    floorHeight: 5.5,
    roofStyle: 'arched_vault',
    defaultRoofType: 'arched_vault',
    archetype: 'standard',
    defaultOverhang: 1.4,
    windowWallRatio: 0.35,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 6_800_000,
    recommendedZones: ['public_facility'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#0284c7',
    defaultRoofMaterial: 'metal'
  },
  {
    id: 'pemakaman_taman_asri',
    name: 'Pemakaman Taman Asri & Krematorium',
    category: 'rekreasi_terbuka',
    icon: 'Trees',
    description: 'Taman pemakaman umum teratur dengan lansekap pepohonan peneduh, pendopo persemayaman, dan jalur peziarah bersih.',
    defaultWidth: 36,
    defaultDepth: 36,
    defaultFloors: 1,
    floorHeight: 4.2,
    roofStyle: 'hip',
    defaultRoofType: 'hip',
    archetype: 'pendopo_open',
    defaultOverhang: 1.5,
    windowWallRatio: 0.15,
    hasCrossVentilation: true,
    isPublicAmenity: true,
    baseCostPerSqm: 2_200_000,
    recommendedZones: ['green_space', 'public_facility'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#78716c',
    defaultRoofMaterial: 'clay_tile'
  },
  // =========================================================================
  // 16. GEDUNG PENCAKAR LANGIT 18 LANTAI (High-Rise Skyscrapers)
  // =========================================================================
  {
    id: 'skyscraper_office_tower',
    name: 'Menara Perkantoran Kaca Nusantara (18 Lantai)',
    category: 'perdagangan_jasa',
    icon: 'Building2',
    description: 'Podium lobi 3 lantai dengan menara curtain wall kaca ber-sirip peneduh matahari 15 lantai serta mahkota atap dan helipad.',
    defaultWidth: 32,
    defaultDepth: 32,
    defaultFloors: 18,
    minFloors: 1,
    maxFloors: 18,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 0.6,
    windowWallRatio: 0.72,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 12_500_000,
    recommendedZones: ['commercial', 'office'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#1e293b',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'skyscraper_green_apartment',
    name: 'Apartemen Menara Hijau Tropis (18 Lantai)',
    category: 'hunian',
    icon: 'Building',
    description: 'Menara hunian vertikal dengan balkon tanaman gantung dan sky terrace hijau di setiap kelipatan 3 lantai.',
    defaultWidth: 28,
    defaultDepth: 28,
    defaultFloors: 16,
    minFloors: 1,
    maxFloors: 18,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 1.0,
    windowWallRatio: 0.55,
    hasCrossVentilation: true,
    isPublicAmenity: false,
    baseCostPerSqm: 9_200_000,
    recommendedZones: ['residential', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#f1f5f9',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'skyscraper_grand_hotel',
    name: 'Menara Hotel & Konvensi Bintang 5 (18 Lantai)',
    category: 'budaya_hotel',
    icon: 'Hotel',
    description: 'Podium drop-off pendopo modern dengan menara kamar panorama dan fasilitas konvensi internasional.',
    defaultWidth: 30,
    defaultDepth: 30,
    defaultFloors: 15,
    minFloors: 1,
    maxFloors: 18,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 0.8,
    windowWallRatio: 0.65,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 11_000_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'plaster',
    defaultWallColor: '#ffffff',
    defaultRoofMaterial: 'concrete'
  },
  {
    id: 'skyscraper_mixed_use',
    name: 'Menara Terpadu Ritel & Kantor (18 Lantai)',
    category: 'mall_ritel',
    icon: 'Building2',
    description: 'Lantai 1-4 atrium mall perbelanjaan terpadu dan lantai 5-18 menara perkantoran modern.',
    defaultWidth: 36,
    defaultDepth: 36,
    defaultFloors: 18,
    minFloors: 1,
    maxFloors: 18,
    floorHeight: 4.0,
    roofStyle: 'flat_parapet',
    defaultRoofType: 'flat',
    archetype: 'podium_tower',
    defaultOverhang: 0.8,
    windowWallRatio: 0.68,
    hasCrossVentilation: false,
    isPublicAmenity: true,
    baseCostPerSqm: 13_000_000,
    recommendedZones: ['commercial', 'mixed_use'],
    defaultWallMaterial: 'concrete',
    defaultWallColor: '#0f172a',
    defaultRoofMaterial: 'concrete'
  }
];

// Ensure defaultLength, defaultFloorCount, minFloors, and maxFloors are always populated
CANONICAL_BUILDING_CATALOG.forEach((item) => {
  item.defaultLength = item.defaultDepth;
  item.defaultFloorCount = item.defaultFloors;

  // Architectural floor limits logic
  if (item.minFloors === undefined || item.maxFloors === undefined) {
    const id = item.id.toLowerCase();
    const cat = item.category;

    // a. Skyscrapers, apartments, hotels, offices, hospitals/clinics: 1 to 18 floors
    if (
      id.startsWith('skyscraper') ||
      id.includes('tower') ||
      id.includes('apartemen') ||
      id.includes('apartment') ||
      id.includes('hotel') ||
      id.includes('kantor') ||
      id.includes('office') ||
      id.includes('rumah_sakit') ||
      id.includes('hospital') ||
      cat === 'kesehatan'
    ) {
      item.minFloors = item.minFloors ?? 1;
      item.maxFloors = item.maxFloors ?? 18;
    }
    // b. Ruko, modern cafe, Resto Mie Gacoan, co-working, showroom: up to 4 - 6 floors
    else if (
      id.includes('ruko') ||
      id.includes('cafe') ||
      id.includes('kafe') ||
      id.includes('gacoan') ||
      id.includes('resto') ||
      id.includes('burger') ||
      id.includes('showroom') ||
      id.includes('co_working') ||
      id.includes('warmindo') ||
      cat === 'kuliner_kafe'
    ) {
      item.minFloors = item.minFloors ?? 1;
      item.maxFloors = item.maxFloors ?? 6;
    }
    // c. Campus, dorm, library, parking garage, exclusive boarding, mall: up to 10 - 12 floors
    else if (
      id.includes('kampus') ||
      id.includes('asrama') ||
      id.includes('perpustakaan') ||
      id.includes('parkir') ||
      id.includes('kos') ||
      id.includes('mall') ||
      cat === 'kampus_kos' ||
      cat === 'mall_ritel' ||
      cat === 'pendidikan'
    ) {
      item.minFloors = item.minFloors ?? 1;
      item.maxFloors = item.maxFloors ?? 12;
    }
    // d. Pure vernacular (Joglo, angkringan, halte): 1 to 3 floors
    else if (
      id.includes('joglo') ||
      id.includes('angkringan') ||
      id.includes('halte') ||
      id.includes('pendopo') ||
      id.includes('pos_kamling')
    ) {
      item.minFloors = 1;
      item.maxFloors = item.maxFloors ?? 3;
    } else {
      item.minFloors = item.minFloors ?? 1;
      item.maxFloors = item.maxFloors ?? (item.defaultFloors >= 6 ? 18 : 8);
    }
  }

  if (!item.defaultRoofType) {
    if (item.roofStyle === 'flat_parapet') item.defaultRoofType = 'flat';
    else if (item.roofStyle === 'shed_industrial') item.defaultRoofType = 'shed_industrial';
    else if (item.roofStyle === 'sawtooth') item.defaultRoofType = 'sawtooth';
    else if (item.roofStyle === 'arched_vault') item.defaultRoofType = 'arched_vault';
    else if (item.roofStyle === 'butterfly') item.defaultRoofType = 'butterfly';
    else item.defaultRoofType = item.roofStyle as RoofType;
  }
});

// Comprehensive Alias Map for natural queries and legacy preset keys
const LEGACY_ALIASES: Record<string, string> = {
  minimarket: 'minimarket_tropis',
  community_hall: 'paviliun_taman_baca',
  // Hunian
  rumah_tapak: 'house_36',
  perumahan: 'perumahan_cluster_asri',
  apartemen: 'apartemen_studio_modern',
  rusun: 'rusunawa_rakyat',
  kos: 'kost_putra_putri',
  asrama: 'asrama_mahasiswa_kampus',
  // Pemerintahan dan keamanan
  balai_kota: 'balai_kota_pemerintahan',
  kantor_kecamatan: 'kantor_kecamatan_kelurahan',
  kantor_kelurahan: 'kantor_kecamatan_kelurahan',
  kantor_polisi: 'kantor_polisi_resor',
  pemadam_kebakaran: 'pos_pemadam_kebakaran',
  damkar: 'pos_pemadam_kebakaran',
  pengadilan: 'gedung_pengadilan_negeri',
  kantor_pos: 'kantor_pos_giro',
  // Pendidikan
  sekolah: 'sekolah_dasar_inpres',
  kampus: 'gedung_fakultas_kampus',
  perpustakaan: 'perpustakaan_daerah',
  lembaga_kursus: 'lembaga_kursus_pelatihan',
  // Kesehatan
  rumah_sakit: 'rumah_sakit_umum_daerah',
  rsud: 'rumah_sakit_umum_daerah',
  puskesmas: 'puskesmas_rawat_inap',
  klinik: 'klinik_pratama_warga',
  apotek: 'apotek_kimia_farma_style',
  // Perdagangan dan jasa
  pasar_tradisional: 'pasar_tradisional_modern',
  mal: 'mall_lifestyle_atrium',
  supermarket: 'supermarket_lokal',
  ruko: 'ruko_arcade_3fl',
  bank: 'gedung_bank_sentral',
  perkantoran: 'gedung_perkantoran_tower',
  hotel: 'hotel_resort_bintang4',
  restoran: 'resto_mie_gacoan',
  kafe: 'cafe_industrial_tropis',
  // Industri dan logistik
  pabrik: 'pabrik_manufaktur_modern',
  kawasan_industri: 'kawasan_industri_terpadu',
  pergudangan: 'pergudangan_logistik_kargo',
  pelabuhan_kering: 'pelabuhan_kering_dryport',
  // Transportasi
  terminal: 'terminal_bus_antarkota',
  stasiun: 'stasiun_kereta_komuter',
  bandara: 'bandara_terminal_udara',
  halte: 'halte_trans_shelter',
  pelabuhan: 'pelabuhan_dermaga_laut',
  jembatan: 'jembatan_penyeberangan_girder',
  flyover: 'flyover_jalan_layang',
  area_parkir: 'gedung_parkir_vertikal',
  // Utilitas
  gardu_listrik: 'gardu_induk_listrik',
  pembangkit_listrik: 'pembangkit_listrik_surya_bio',
  instalasi_air_minum: 'instalasi_pengolahan_air_pdam',
  pdam: 'instalasi_pengolahan_air_pdam',
  pengolahan_limbah: 'instalasi_pengolahan_limbah_ipal',
  ipal: 'instalasi_pengolahan_limbah_ipal',
  tps: 'tpa_sanitary_landfill',
  tpa: 'tpa_sanitary_landfill',
  menara_telekomunikasi: 'menara_telekomunikasi_bts',
  bts: 'menara_telekomunikasi_bts',
  // Ibadah dan budaya
  masjid: 'masjid_agung_kubah',
  gereja: 'gereja_katedral_menara',
  pura: 'pura_kahyangan_nusantara',
  vihara: 'vihara_dharma_meditasi',
  klenteng: 'klenteng_tri_dharma',
  museum: 'museum_heritage',
  teater: 'gedung_teater_pertunjukan',
  galeri: 'galeri_seni_kontemporer',
  monumen: 'monumen_tugu_kota',
  // Rekreasi dan ruang terbuka
  taman_kota: 'taman_kota_terbuka',
  lapangan_kota: 'lapangan_alun_alun_kota',
  alun_alun: 'lapangan_alun_alun_kota',
  stadion: 'stadion_olahraga_kota',
  gor: 'gor_bulutangkis',
  pusat_olahraga: 'pusat_olahraga_sportcenter',
  pemakaman: 'pemakaman_taman_asri',
  // Gedung Pencakar Langit (Skyscrapers)
  menara_kantor: 'skyscraper_office_tower',
  menara_perkantoran: 'skyscraper_office_tower',
  apartemen_menara: 'skyscraper_green_apartment',
  apartemen_hijau: 'skyscraper_green_apartment',
  hotel_bintang5: 'skyscraper_grand_hotel',
  menara_hotel: 'skyscraper_grand_hotel',
  menara_mixed_use: 'skyscraper_mixed_use'
};

const CATALOG_BY_ID = new Map<string, BuildingCatalogItem>();
CANONICAL_BUILDING_CATALOG.forEach((item) => {
  CATALOG_BY_ID.set(item.id, item);
});

export class BuildingCatalogRegistry {
  public static readonly TOTAL_BUILDINGS = 101;

  /**
   * Returns all 101 buildings in the canonical catalog.
   */
  public static getAllBuildings(): BuildingCatalogItem[] {
    return CANONICAL_BUILDING_CATALOG;
  }

  /**
   * Retrieves reasonable minFloors and maxFloors based on building architectural archetype and category.
   */
  public static getFloorLimits(presetKey?: string): { minFloors: number; maxFloors: number } {
    if (!presetKey) return { minFloors: 1, maxFloors: 18 };
    const item = this.getBuilding(presetKey);
    if (!item) return { minFloors: 1, maxFloors: 18 };

    return {
      minFloors: item.minFloors ?? 1,
      maxFloors: item.maxFloors ?? 18
    };
  }

  /**
   * Retrieves a building item by its ID or alias.
   */
  public static getBuilding(id: string): BuildingCatalogItem | undefined {
    if (!id) return undefined;
    const direct = CATALOG_BY_ID.get(id);
    if (direct) return direct;
    const targetAlias = LEGACY_ALIASES[id];
    if (targetAlias) return CATALOG_BY_ID.get(targetAlias);
    return undefined;
  }

  /**
   * Retrieves all buildings matching a given category with functional cross-sector support.
   */
  public static getBuildingsByCategory(category: BuildingCategory | 'all'): BuildingCatalogItem[] {
    if (category === 'all') {
      return CANONICAL_BUILDING_CATALOG;
    }

    return CANONICAL_BUILDING_CATALOG.filter((b) => {
      if (b.category === category) return true;

      // Smart functional cross-sector mapping for urban functions
      switch (category) {
        case 'hunian':
          return b.id.includes('house') || b.id.includes('kos') || b.id.includes('asrama') || b.id.includes('apartemen') || b.id.includes('rusun') || b.id.includes('perumahan') || b.id.includes('shophouse') || b.id.includes('villa') || b.id.includes('townhouse');
        case 'pemerintahan_keamanan':
          return b.id.includes('balai_kota') || b.id.includes('kantor') || b.id.includes('polisi') || b.id.includes('polsek') || b.id.includes('damkar') || b.id.includes('pemadam') || b.id.includes('pengadilan') || b.id.includes('kelurahan') || b.id.includes('kecamatan');
        case 'pendidikan':
          return b.category === 'kampus_kos' || b.id.includes('sekolah') || b.id.includes('kampus') || b.id.includes('fakultas') || b.id.includes('perpustakaan') || b.id.includes('kursus') || b.id.includes('riset');
        case 'kesehatan':
          return b.id.includes('rumah_sakit') || b.id.includes('puskesmas') || b.id.includes('klinik') || b.id.includes('apotek');
        case 'perdagangan_jasa':
          return b.category === 'kuliner_kafe' || b.category === 'mall_ritel' || b.id.includes('bank') || b.id.includes('pasar') || b.id.includes('mall') || b.id.includes('supermarket') || b.id.includes('ruko') || b.id.includes('hotel') || b.id.includes('kantor_tower');
        case 'industri_logistik':
          return b.id.includes('pabrik') || b.id.includes('industri') || b.id.includes('gudang') || b.id.includes('pergudangan') || b.id.includes('kargo') || b.id.includes('dryport') || b.id.includes('logistik');
        case 'transportasi':
          return b.id.includes('terminal') || b.id.includes('stasiun') || b.id.includes('bandara') || b.id.includes('halte') || b.id.includes('pelabuhan') || b.id.includes('jembatan') || b.id.includes('flyover') || b.id.includes('parkir');
        case 'utilitas':
          return b.id.includes('listrik') || b.id.includes('gardu') || b.id.includes('air') || b.id.includes('pdam') || b.id.includes('limbah') || b.id.includes('ipal') || b.id.includes('tpa') || b.id.includes('tps') || b.id.includes('telekomunikasi') || b.id.includes('bts');
        case 'ibadah_budaya':
          return b.id.includes('masjid') || b.id.includes('gereja') || b.id.includes('pura') || b.id.includes('vihara') || b.id.includes('klenteng') || b.id.includes('museum') || b.id.includes('teater') || b.id.includes('galeri') || b.id.includes('monumen') || b.id.includes('joglo') || b.id.includes('pendopo') || b.id.includes('kapel');
        case 'rekreasi_terbuka':
          return b.id.includes('taman') || b.id.includes('lapangan') || b.id.includes('alun_alun') || b.id.includes('stadion') || b.id.includes('gor') || b.id.includes('olahraga') || b.id.includes('pemakaman');
        default:
          return false;
      }
    });
  }

  /**
   * Search buildings across name, description, category, and id.
   */
  public static searchBuildings(query: string, category: BuildingCategory | 'all' = 'all'): BuildingCatalogItem[] {
    const q = (query || '').trim().toLowerCase();
    const baseList = this.getBuildingsByCategory(category);
    if (!q) return baseList;

    return baseList.filter((b) => {
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q)
      );
    });
  }

  /**
   * Checks if building is a public amenity that satisfies 400m walkability.
   */
  public static isPublicAmenity(id: string): boolean {
    const item = this.getBuilding(id);
    return item?.isPublicAmenity ?? false;
  }

  /**
   * Checks if building possesses natural cross-ventilation.
   */
  public static hasCrossVentilation(id: string): boolean {
    const item = this.getBuilding(id);
    return item?.hasCrossVentilation ?? false;
  }

  /**
   * Retrieves the architectural composition archetype for a building.
   */
  public static getArchetype(id: string): BuildingArchetype {
    const item = this.getBuilding(id);
    return item?.archetype ?? 'standard';
  }

  /**
   * Returns the count of items in each category.
   */
  public static getCategoryCounts(): Record<BuildingCategory | 'all', number> {
    const counts: Record<BuildingCategory | 'all', number> = {
      all: CANONICAL_BUILDING_CATALOG.length,
      hunian: 0,
      pemerintahan_keamanan: 0,
      pendidikan: 0,
      kesehatan: 0,
      perdagangan_jasa: 0,
      industri_logistik: 0,
      transportasi: 0,
      utilitas: 0,
      ibadah_budaya: 0,
      rekreasi_terbuka: 0,
      kuliner_kafe: 0,
      mall_ritel: 0,
      kampus_kos: 0,
      budaya_hotel: 0,
      publik_hijau: 0
    };

    for (const b of CANONICAL_BUILDING_CATALOG) {
      if (counts[b.category] !== undefined) {
        counts[b.category]++;
      }
    }

    return counts;
  }
}

