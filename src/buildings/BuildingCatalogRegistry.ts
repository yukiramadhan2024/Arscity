import { ZoneType } from '../zones/ZoneTypes';
import { RoofType, WallMaterialType, RoofMaterialType } from './PrefabTypes';

export type BuildingCategory =
  | 'hunian'
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
  | 'transit_canopy';

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
  }
];

// Ensure defaultLength and defaultFloorCount are always populated
CANONICAL_BUILDING_CATALOG.forEach((item) => {
  item.defaultLength = item.defaultDepth;
  item.defaultFloorCount = item.defaultFloors;
  if (!item.defaultRoofType) {
    if (item.roofStyle === 'flat_parapet') item.defaultRoofType = 'flat';
    else if (item.roofStyle === 'shed_industrial') item.defaultRoofType = 'shed_industrial';
    else if (item.roofStyle === 'sawtooth') item.defaultRoofType = 'sawtooth';
    else if (item.roofStyle === 'arched_vault') item.defaultRoofType = 'arched_vault';
    else if (item.roofStyle === 'butterfly') item.defaultRoofType = 'butterfly';
    else item.defaultRoofType = item.roofStyle as RoofType;
  }
});

// Alias Map for legacy preset keys
const LEGACY_ALIASES: Record<string, string> = {
  minimarket: 'minimarket_tropis',
  community_hall: 'paviliun_taman_baca'
};

const CATALOG_BY_ID = new Map<string, BuildingCatalogItem>();
CANONICAL_BUILDING_CATALOG.forEach((item) => {
  CATALOG_BY_ID.set(item.id, item);
});

export class BuildingCatalogRegistry {
  public static readonly TOTAL_BUILDINGS = 58;

  /**
   * Returns all 58 buildings in the canonical catalog.
   */
  public static getAllBuildings(): BuildingCatalogItem[] {
    return CANONICAL_BUILDING_CATALOG;
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
   * Retrieves all buildings matching a given category.
   */
  public static getBuildingsByCategory(category: BuildingCategory | 'all'): BuildingCatalogItem[] {
    if (category === 'all') {
      return CANONICAL_BUILDING_CATALOG;
    }
    return CANONICAL_BUILDING_CATALOG.filter((b) => b.category === category);
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
