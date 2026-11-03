import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export type FurnitureSlotType = 'floor' | 'tabletop' | 'wall';

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  shortLabel: string;
  category: 'living' | 'bedroom' | 'dining' | 'office' | 'commercial' | 'bathroom' | 'decor';
  description: string;
  width: number;
  depth: number;
  height: number;
  seatHeight?: number;
  isSeat?: boolean;
  isChair?: boolean;
  allowedSlots?: FurnitureSlotType[];
  hasTopSurface?: boolean;
  topSurfaceHeight?: number;
  topSurfaceBounds?: { width: number; depth: number; offsetX?: number; offsetZ?: number };
}

export interface ExteriorCatalogItem {
  id: string;
  name: string;
  shortLabel: string;
  category: 'building' | 'flora' | 'street_furniture';
  description: string;
  scale?: number;
  presetKey?: string;
}

export interface MaterialPaletteItem {
  id: string;
  name: string;
  color: string;
  roughness: number;
  metalness: number;
  previewColor: string;
}

/**
 * Computes effective axis-aligned half-width and half-depth for a furniture item
 * rotated by `rotationY` radians around the vertical axis.
 */
export function computeRotatedFurnitureHalfExtents(
  width: number,
  depth: number,
  rotationY: number
): { effectiveHalfW: number; effectiveHalfD: number } {
  const cos = Math.abs(Math.cos(rotationY));
  const sin = Math.abs(Math.sin(rotationY));
  const effectiveHalfW = (width * cos + depth * sin) * 0.5;
  const effectiveHalfD = (width * sin + depth * cos) * 0.5;
  return { effectiveHalfW, effectiveHalfD };
}


export interface CustomFurnitureSpec {
  id: string;
  name: string;
  category?: 'commercial' | 'office' | 'bedroom' | 'bathroom' | 'living' | 'dining' | 'decor';
  width: number;
  depth: number;
  height: number;
  color?: string;
  meshBuilder?: () => THREE.Group;
}

const CUSTOM_FURNITURE_REGISTRY = new Map<string, CustomFurnitureSpec>();

export function registerCustomStudioFurniture(spec: CustomFurnitureSpec): void {
  CUSTOM_FURNITURE_REGISTRY.set(spec.id, spec);
  const existingIdx = FIRST_PERSON_FURNITURE_CATALOG.findIndex((item) => item.id === spec.id);
  const catalogItem: FurnitureCatalogItem = {
    id: spec.id,
    name: spec.name,
    shortLabel: spec.name.slice(0, 10),
    category: spec.category || 'decor',
    width: spec.width,
    depth: spec.depth,
    height: spec.height,
    description: `Furnitur kustom Studio CAD (${spec.width}m x ${spec.depth}m)`
  };
  if (existingIdx !== -1) {
    FIRST_PERSON_FURNITURE_CATALOG[existingIdx] = catalogItem;
  } else {
    FIRST_PERSON_FURNITURE_CATALOG.push(catalogItem);
  }
}

export function buildCustomStudioFurnitureMesh(spec: CustomFurnitureSpec): THREE.Group {
  if (spec.meshBuilder) {
    return spec.meshBuilder();
  }
  const group = new THREE.Group();
  group.name = `CustomFurniture_${spec.id}`;
  group.userData = { isFurniture: true, furnitureType: spec.id, isCustom: true };
  const mat = MaterialLibrary.getInstance().getMaterial('wood_slat', { color: spec.color || '#78350f' });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(spec.width, spec.height, spec.depth), mat);
  mesh.position.set(0, spec.height * 0.5, 0);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

export const FIRST_PERSON_FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    id: 'sofa_l',
    name: 'Sofa L-Shape Ruang Tamu',
    shortLabel: 'Sofa L',
    category: 'living',
    description: 'Sofa sudut modern kain abu-abu dengan bantal aksen',
    width: 2.4,
    depth: 1.8,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true,
    allowedSlots: ['floor']
  },
  {
    id: 'sofa_3seater',
    name: 'Sofa 3 Dudukan & Meja Kopi',
    shortLabel: 'Sofa 3D',
    category: 'living',
    description: 'Sofa minimalis 3 dudukan dengan meja kopi kayu jati',
    width: 2.2,
    depth: 1.6,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true,
    allowedSlots: ['floor']
  },
  {
    id: 'bed_king',
    name: 'Tempat Tidur King & Nakas',
    shortLabel: 'Kasur King',
    category: 'bedroom',
    description: 'Ranjang kayu jati dengan kasur empuk dan sepasang nakas',
    width: 2.2,
    depth: 2.2,
    height: 0.95,
    seatHeight: 0.55,
    isSeat: true,
    allowedSlots: ['floor']
  },
  {
    id: 'dining_set',
    name: 'Meja Makan + 4 Kursi',
    shortLabel: 'Meja Makan',
    category: 'dining',
    description: 'Meja makan kayu solid dengan 4 kursi bergaya Skandinavia',
    width: 1.8,
    depth: 1.4,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true,
    allowedSlots: ['floor'],
    hasTopSurface: true,
    topSurfaceHeight: 0.75,
    topSurfaceBounds: { width: 1.8, depth: 1.4 }
  },
  {
    id: 'desk_office',
    name: 'Meja Kerja & PC Monitor',
    shortLabel: 'Meja Kerja',
    category: 'office',
    description: 'Meja kerja ergonomis dengan layar monitor ganda dan kursi putar',
    width: 1.4,
    depth: 0.8,
    height: 1.1,
    seatHeight: 0.48,
    isSeat: true,
    allowedSlots: ['floor'],
    hasTopSurface: true,
    topSurfaceHeight: 0.74,
    topSurfaceBounds: { width: 1.4, depth: 0.8 }
  },
  {
    id: 'bar_counter',
    name: 'Konter Bar Kopi & Mesin Kasir',
    shortLabel: 'Bar Kopi',
    category: 'commercial',
    description: 'Konter barista kayu dengan mesin espresso dan display kasir',
    width: 2.4,
    depth: 1.0,
    height: 1.15,
    allowedSlots: ['floor'],
    hasTopSurface: true,
    topSurfaceHeight: 0.90,
    topSurfaceBounds: { width: 2.4, depth: 1.0 }
  },
  {
    id: 'wardrobe_shelf',
    name: 'Lemari Pakaian & Rak Buku',
    shortLabel: 'Lemari',
    category: 'bedroom',
    description: 'Lemari kabinet tinggi kayu gelap dengan rak buku terintegrasi',
    width: 1.6,
    depth: 0.6,
    height: 2.2,
    allowedSlots: ['floor']
  },
  {
    id: 'plant_monstera',
    name: 'Tanaman Pot Monstera Indoor',
    shortLabel: 'Monstera',
    category: 'decor',
    description: 'Pot keramik putih dengan tanaman tropis hijau segar',
    width: 0.6,
    depth: 0.6,
    height: 1.1,
    allowedSlots: ['floor']
  },
  {
    id: 'floor_lamp',
    name: 'Lampu Berdiri (Floor Lamp 2700K)',
    shortLabel: 'Lampu 2700K',
    category: 'decor',
    description: 'Lampu sudut minimalis dengan pencahayaan hangat 2700K',
    width: 0.45,
    depth: 0.45,
    height: 1.65,
    allowedSlots: ['floor']
  },
  {
    id: 'kitchen_island',
    name: 'Kitchen Island & Kulkas Wastafel',
    shortLabel: 'Dapur Island',
    category: 'dining',
    description: 'Set dapur modern marmer putih dengan wastafel stainless dan kulkas',
    width: 2.6,
    depth: 1.2,
    height: 1.85,
    allowedSlots: ['floor'],
    hasTopSurface: true,
    topSurfaceHeight: 0.85,
    topSurfaceBounds: { width: 2.6, depth: 1.2 }
  },
  {
    id: 'bathroom_set',
    name: 'Bathtub & Toilet Minimalis',
    shortLabel: 'Kamar Mandi',
    category: 'bathroom',
    description: 'Bak mandi freestanding akrilik putih dengan toilet duduk dan vanity wastafel',
    width: 2.0,
    depth: 1.4,
    height: 1.0,
    allowedSlots: ['floor']
  },
  {
    id: 'reception_desk',
    name: 'Meja Resepsionis & Kursi Ergonomis',
    shortLabel: 'Resepsionis',
    category: 'commercial',
    description: 'Meja resepsionis modern panel kayu dengan kursi kantor',
    width: 2.2,
    depth: 1.1,
    height: 1.15,
    seatHeight: 0.48,
    isSeat: true,
    allowedSlots: ['floor'],
    hasTopSurface: true,
    topSurfaceHeight: 0.75,
    topSurfaceBounds: { width: 2.2, depth: 1.1 }
  },
  {
    id: 'rug_nusantara',
    name: 'Karpet Tenun Nusantara',
    shortLabel: 'Karpet',
    category: 'decor',
    description: 'Karpet tenun tipis bertekstur hangat yang rata di atas lantai',
    width: 2.0,
    depth: 1.4,
    height: 0.03,
    allowedSlots: ['floor']
  },
  // Tabletop items
  {
    id: 'monitor_pc',
    name: 'Monitor PC & Dudukan Logam',
    shortLabel: 'Monitor PC',
    category: 'office',
    description: 'Layar monitor tipis dengan stand aluminium untuk meja kerja',
    width: 0.6,
    depth: 0.2,
    height: 0.45,
    allowedSlots: ['tabletop']
  },
  {
    id: 'coffee_machine',
    name: 'Mesin Kopi & Kasir Barista',
    shortLabel: 'Mesin Kopi',
    category: 'commercial',
    description: 'Mesin espresso stainless steel dan kasir ringkas untuk meja konter',
    width: 0.35,
    depth: 0.35,
    height: 0.4,
    allowedSlots: ['tabletop']
  },
  {
    id: 'table_lamp',
    name: 'Lampu Meja Hangat',
    shortLabel: 'Lampu Meja',
    category: 'decor',
    description: 'Lampu meja baca dengan kap kain dan cahaya hangat',
    width: 0.3,
    depth: 0.3,
    height: 0.45,
    allowedSlots: ['tabletop']
  },
  {
    id: 'small_pot',
    name: 'Pot Sukulen Meja',
    shortLabel: 'Sukulen',
    category: 'decor',
    description: 'Pot keramik mungil berisi tanaman hias sukulen',
    width: 0.25,
    depth: 0.25,
    height: 0.3,
    allowedSlots: ['tabletop', 'floor']
  },
  // Wall items
  {
    id: 'painting_art',
    name: 'Lukisan Dinding Tropis',
    shortLabel: 'Lukisan',
    category: 'decor',
    description: 'Lukisan kanvas berpemandangan alam tropis dengan bingkai kayu jati',
    width: 1.2,
    depth: 0.05,
    height: 0.8,
    allowedSlots: ['wall']
  },
  {
    id: 'wall_sconce',
    name: 'Lampu Dinding Sconce 2700K',
    shortLabel: 'Lampu Dinding',
    category: 'decor',
    description: 'Lampu dinding kuningan dengan pancaran cahaya lembut',
    width: 0.25,
    depth: 0.2,
    height: 0.35,
    allowedSlots: ['wall']
  },
  {
    id: 'wall_signage',
    name: 'Papan Tanda Arsitektur',
    shortLabel: 'Papan Tanda',
    category: 'commercial',
    description: 'Papan penanda ruangan berbahan kayu dan plat kuningan',
    width: 0.8,
    depth: 0.04,
    height: 0.4,
    allowedSlots: ['wall']
  },
  // Standalone chairs for magnet
  {
    id: 'chair_dining',
    name: 'Kursi Makan Skandinavia',
    shortLabel: 'Kursi Makan',
    category: 'dining',
    description: 'Kursi makan kayu solid dengan sandaran ergonomis',
    width: 0.5,
    depth: 0.5,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true,
    isChair: true,
    allowedSlots: ['floor']
  },
  {
    id: 'chair_office',
    name: 'Kursi Kerja Putar Ergonomis',
    shortLabel: 'Kursi Kerja',
    category: 'office',
    description: 'Kursi kantor dengan sandaran jaring mesh dan roda putar 5 titik',
    width: 0.6,
    depth: 0.6,
    height: 0.95,
    seatHeight: 0.48,
    isSeat: true,
    isChair: true,
    allowedSlots: ['floor']
  }
];

export const FIRST_PERSON_EXTERIOR_CATALOG: ExteriorCatalogItem[] = [
  // Buildings
  { id: 'bld_tropis', name: 'Rumah Tropis Tipe 36', shortLabel: 'Rumah 36', category: 'building', description: 'Rumah tinggal 1 lantai tropis modern', presetKey: 'house_36' },
  { id: 'bld_villa', name: 'Villa Tropis 2 Lantai', shortLabel: 'Villa', category: 'building', description: 'Villa tropis mewah dengan balkon lantai 2', presetKey: 'house_2fl' },
  { id: 'bld_ruko', name: 'Ruko Modern 3 Lantai', shortLabel: 'Ruko', category: 'building', description: 'Rumah toko komersial dengan kanopi teras', presetKey: 'ruko_3fl' },
  { id: 'bld_kafe', name: 'Resto & Kafe Tropis', shortLabel: 'Resto', category: 'building', description: 'Kafe kuliner berarsitektur hall terbuka', presetKey: 'resto_mie_gacoan' },
  { id: 'bld_joglo', name: 'Pendopo Joglo Tradisional', shortLabel: 'Joglo', category: 'building', description: 'Arsitektur vernakular Jawa atap joglo megah', presetKey: 'joglo' },
  { id: 'bld_kantor', name: 'Kantor Modern Kaca', shortLabel: 'Kantor', category: 'building', description: 'Gedung perkantoran modern fasad kaca & louvers', presetKey: 'office_tower_glass' },

  // Trees & Flora
  { id: 'tree_tabebuya_pink', name: 'Pohon Tabebuya Pink', shortLabel: 'Tabebuya', category: 'flora', description: 'Pohon peneduh tropis dengan bunga merah muda Sakura Jawa' },
  { id: 'tree_tabebuya_gold', name: 'Pohon Tabebuya Emas', shortLabel: 'Tabebuya Emas', category: 'flora', description: 'Pohon hias tropis dengan kanopi bunga kuning keemasan' },
  { id: 'tree_flamboyan', name: 'Pohon Flamboyan', shortLabel: 'Flamboyan', category: 'flora', description: 'Pohon rindang berbunga merah menyala khas Malioboro' },
  { id: 'tree_frangipani', name: 'Pohon Kamboja', shortLabel: 'Kamboja', category: 'flora', description: 'Pohon taman aromatik tropis berbatang artistik' },
  { id: 'flora_yellow_bamboo', name: 'Bambu Kuning', shortLabel: 'Bambu', category: 'flora', description: 'Rumpun bambu hias tropis penyejuk teras dan taman' },
  { id: 'tree_banyan_kurung', name: 'Pohon Beringin Rindang', shortLabel: 'Beringin', category: 'flora', description: 'Pohon beringin ikonik dengan peneduh maksimal -3.0°C' },
  { id: 'tree_asam_jawa', name: 'Pohon Asam Jawa', shortLabel: 'Asam Jawa', category: 'flora', description: 'Pohon peneduh jalan raya dengan tajuk daun rindang' },

  // Street Furniture
  { id: 'street_malioboro_bollards', name: 'Bangku Taman Malioboro', shortLabel: 'Bangku Taman', category: 'street_furniture', description: 'Bangku taman besi tempa & kayu khas pedestrian Malioboro' },
  { id: 'street_garden_lanterns', name: 'Lampu Taman', shortLabel: 'Lampu Taman', category: 'street_furniture', description: 'Tiang lentera penerangan pedestrian klasik' },
  { id: 'fountain_reflecting_pool', name: 'Air Mancur', shortLabel: 'Air Mancur', category: 'street_furniture', description: 'Kolam air mancur bundar dengan ornamen batu candi' },
  { id: 'sculpture_candi_stone', name: 'Patung Seni Candi', shortLabel: 'Patung Candi', category: 'street_furniture', description: 'Monolit pahatan seni arsitektur nusantara' }
];

export const FIRST_PERSON_OUTDOOR_HOTBAR_IDS: readonly string[] = [
  'bld_tropis',
  'bld_villa',
  'bld_ruko',
  'bld_kafe',
  'bld_joglo',
  'bld_kantor',
  'tree_tabebuya_pink',
  'tree_flamboyan',
  'street_malioboro_bollards'
];

export function getIndoorHotbarItems(): FurnitureCatalogItem[] {
  return FIRST_PERSON_FURNITURE_CATALOG.slice(0, 9);
}

export function getOutdoorHotbarItems(): ExteriorCatalogItem[] {
  return FIRST_PERSON_OUTDOOR_HOTBAR_IDS
    .map((id) => FIRST_PERSON_EXTERIOR_CATALOG.find((item) => item.id === id))
    .filter((item): item is ExteriorCatalogItem => Boolean(item));
}

export const FIRST_PERSON_MATERIAL_PALETTE: MaterialPaletteItem[] = [
  { id: 'wood_teak', name: 'Kayu Jati', color: '#854d0e', roughness: 0.6, metalness: 0.05, previewColor: '#854d0e' },
  { id: 'marble_white', name: 'Marmer Putih', color: '#f8fafc', roughness: 0.15, metalness: 0.1, previewColor: '#f1f5f9' },
  { id: 'brick_red', name: 'Bata Merah', color: '#b91c1c', roughness: 0.85, metalness: 0.0, previewColor: '#b91c1c' },
  { id: 'stone_candi', name: 'Batu Candi', color: '#475569', roughness: 0.9, metalness: 0.05, previewColor: '#475569' },
  { id: 'concrete_exposed', name: 'Beton Ekspos', color: '#94a3b8', roughness: 0.75, metalness: 0.1, previewColor: '#94a3b8' },
  { id: 'paint_white', name: 'Cat Putih Arsitek', color: '#f8fafc', roughness: 0.4, metalness: 0.0, previewColor: '#ffffff' },
  { id: 'paint_sage', name: 'Cat Hijau Sage', color: '#65a30d', roughness: 0.4, metalness: 0.0, previewColor: '#84cc16' },
  { id: 'paint_blue', name: 'Cat Biru Laut', color: '#0284c7', roughness: 0.35, metalness: 0.0, previewColor: '#0284c7' }
];

export class FirstPersonFurnitureBuilder {
  private static matLib = MaterialLibrary.getInstance();
  private static geometryCache = new Map<string, THREE.BufferGeometry>();
  private static materialCache = new Map<string, THREE.Material>();

  public static getCachedGeometry<T extends THREE.BufferGeometry>(key: string, factory: () => T): T {
    let geo = this.geometryCache.get(key) as T;
    if (!geo) {
      geo = factory();
      this.geometryCache.set(key, geo);
    }
    return geo;
  }

  public static getCachedMaterial<T extends THREE.Material>(key: string, factory: () => T): T {
    let mat = this.materialCache.get(key) as T;
    if (!mat) {
      mat = factory();
      this.materialCache.set(key, mat);
    }
    return mat;
  }

  public static getGeometryCacheSize(): number {
    return this.geometryCache.size;
  }

  public static clearGeometryCache(): void {
    this.geometryCache.forEach((geo) => geo.dispose());
    this.geometryCache.clear();
  }

  private static getMat(type: string, color?: string): THREE.Material {
    return this.matLib.getMaterial(type, { color });
  }

  public static buildFurniture(type: string): THREE.Group {
    const group = new THREE.Group();
    group.name = `Furniture_${type}_${Date.now()}`;
    group.userData = { isFurniture: true, furnitureType: type };

    if (CUSTOM_FURNITURE_REGISTRY.has(type)) {
      return buildCustomStudioFurnitureMesh(CUSTOM_FURNITURE_REGISTRY.get(type)!);
    }

    const woodMat = this.getMat('wood_slat', '#78350f');
    const darkWoodMat = this.getMat('dark_wood', '#3b1c09');
    const fabricGray = this.getMat('fabric', '#94a3b8');
    const fabricBlue = this.getMat('fabric', '#38bdf8');
    const whiteMat = this.getMat('plaster', '#f8fafc');
    const steelMat = this.getMat('frame', '#1e293b');
    const brassMat = this.getMat('metal', '#d97706');
    const plantMat = this.getMat('grass', '#15803d');
    const ceramicMat = this.getMat('tile', '#ffffff');
    const warmLightMat = this.getCachedMaterial('warm_light', () => new THREE.MeshBasicMaterial({ color: 0xffedd5 }));

    switch (type) {
      case 'sofa_l': {
        const legGeom = this.getCachedGeometry('cyl_leg_0025_014_6', () => new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6));
        const legCoords = [
          [-1.1, 0.07, -0.38], [1.1, 0.07, -0.38],
          [-1.1, 0.07, 1.28], [-0.45, 0.07, 1.28],
          [1.1, 0.07, 0.38], [-0.45, 0.07, 0.38]
        ];
        legCoords.forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeom, steelMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
        });

        const plinthGeom = this.getCachedGeometry('sofa_l_plinth', () => new THREE.BoxGeometry(2.4, 0.08, 0.9));
        const plinth = new THREE.Mesh(plinthGeom, darkWoodMat);
        plinth.position.set(0, 0.18, 0);
        group.add(plinth);

        const seatGeom = this.getCachedGeometry('sofa_l_cushion_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.14, 2.08, 1, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const base = new THREE.Mesh(seatGeom, fabricGray);
        base.position.set(0, 0.36, 0);
        base.castShadow = true;
        group.add(base);

        const backGeom = this.getCachedGeometry('sofa_l_back_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.12, 2.08, 1, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const back = new THREE.Mesh(backGeom, fabricGray);
        back.position.set(0, 0.65, -0.34);
        back.rotation.x = 0.18;
        back.castShadow = true;
        group.add(back);

        const retGeom = this.getCachedGeometry('sofa_l_ret_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.14, 0.6, 1, 8);
          geo.rotateX(Math.PI / 2);
          return geo;
        });
        const ret = new THREE.Mesh(retGeom, fabricGray);
        ret.position.set(-0.75, 0.36, 0.88);
        ret.castShadow = true;
        group.add(ret);

        const pillowGeom = this.getCachedGeometry('pillow_capsule_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.07, 0.28, 1, 6);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const p1 = new THREE.Mesh(pillowGeom, fabricBlue);
        p1.position.set(0.65, 0.58, -0.16);
        p1.rotation.y = -0.15;
        group.add(p1);

        const p2 = new THREE.Mesh(pillowGeom, brassMat);
        p2.position.set(-0.15, 0.58, -0.16);
        p2.rotation.y = 0.12;
        group.add(p2);
        break;
      }

      case 'sofa_3seater': {
        const legGeom = this.getCachedGeometry('cyl_leg_0025_014_6', () => new THREE.CylinderGeometry(0.025, 0.025, 0.14, 6));
        const legCoords = [
          [-0.92, 0.07, -0.65], [0.92, 0.07, -0.65],
          [-0.92, 0.07, 0.05], [0.92, 0.07, 0.05]
        ];
        legCoords.forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeom, steelMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
        });

        const plinthGeom = this.getCachedGeometry('sofa_3s_plinth', () => new THREE.BoxGeometry(2.0, 0.08, 0.85));
        const plinth = new THREE.Mesh(plinthGeom, darkWoodMat);
        plinth.position.set(0, 0.18, -0.3);
        group.add(plinth);

        const cushionGeom = this.getCachedGeometry('sofa_3s_cushion_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.13, 0.44, 1, 6);
          geo.rotateX(Math.PI / 2);
          return geo;
        });
        for (let i = 0; i < 3; i++) {
          const cushion = new THREE.Mesh(cushionGeom, fabricGray);
          cushion.position.set(-0.64 + i * 0.64, 0.35, -0.28);
          cushion.castShadow = true;
          group.add(cushion);
        }

        const backGeom = this.getCachedGeometry('sofa_3s_back_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.12, 1.76, 1, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const back = new THREE.Mesh(backGeom, fabricGray);
        back.position.set(0, 0.66, -0.62);
        back.rotation.x = 0.18;
        back.castShadow = true;
        group.add(back);

        const armGeom = this.getCachedGeometry('sofa_3s_arm_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.09, 0.68, 1, 6);
          geo.rotateX(Math.PI / 2);
          return geo;
        });
        const armL = new THREE.Mesh(armGeom, fabricGray);
        armL.position.set(-1.0, 0.42, -0.3);
        group.add(armL);
        const armR = new THREE.Mesh(armGeom, fabricGray);
        armR.position.set(1.0, 0.42, -0.3);
        group.add(armR);

        const tableTopGeom = this.getCachedGeometry('coffee_table_round_top_opt', () => new THREE.CylinderGeometry(0.55, 0.55, 0.04, 12));
        const tableTop = new THREE.Mesh(tableTopGeom, woodMat);
        tableTop.position.set(0, 0.36, 0.5);
        tableTop.castShadow = true;
        group.add(tableTop);

        const tableLegGeom = this.getCachedGeometry('coffee_table_leg_6', () => new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6));
        const tableLegCoords = [
          [-0.32, 0.18, 0.32], [0.32, 0.18, 0.32],
          [-0.32, 0.18, 0.68], [0.32, 0.18, 0.68]
        ];
        tableLegCoords.forEach(([tx, ty, tz]) => {
          const tLeg = new THREE.Mesh(tableLegGeom, steelMat);
          tLeg.position.set(tx, ty, tz);
          group.add(tLeg);
        });
        break;
      }

      case 'bed_king': {
        const platformGeom = this.getCachedGeometry('bed_platform', () => new THREE.BoxGeometry(1.9, 0.32, 2.1));
        const platform = new THREE.Mesh(platformGeom, darkWoodMat);
        platform.position.set(0, 0.22, 0);
        platform.castShadow = true;
        group.add(platform);

        const bLegGeom = this.getCachedGeometry('bed_leg_cyl', () => new THREE.CylinderGeometry(0.04, 0.04, 0.12, 8));
        const bLegs = [[-0.88, 0.06, -0.98], [0.88, 0.06, -0.98], [-0.88, 0.06, 0.98], [0.88, 0.06, 0.98]];
        bLegs.forEach(([bx, by, bz]) => {
          const leg = new THREE.Mesh(bLegGeom, darkWoodMat);
          leg.position.set(bx, by, bz);
          group.add(leg);
        });

        const mattressGeom = this.getCachedGeometry('bed_mattress_capsule', () => new THREE.BoxGeometry(1.8, 0.28, 2.0));
        const mattress = new THREE.Mesh(mattressGeom, whiteMat);
        mattress.position.set(0, 0.52, 0);
        group.add(mattress);

        const duvetGeom = this.getCachedGeometry('bed_duvet', () => new THREE.BoxGeometry(1.82, 0.09, 1.3));
        const duvet = new THREE.Mesh(duvetGeom, fabricBlue);
        duvet.position.set(0, 0.68, 0.35);
        group.add(duvet);

        const pillowBedGeom = this.getCachedGeometry('bed_pillow_capsule_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.08, 0.48, 1, 6);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const p1 = new THREE.Mesh(pillowBedGeom, whiteMat);
        p1.position.set(-0.45, 0.72, -0.72);
        p1.rotation.x = 0.2;
        group.add(p1);
        const p2 = new THREE.Mesh(pillowBedGeom, whiteMat);
        p2.position.set(0.45, 0.72, -0.72);
        p2.rotation.x = 0.2;
        group.add(p2);

        const headboardGeom = this.getCachedGeometry('bed_headboard', () => new THREE.BoxGeometry(2.3, 1.1, 0.1));
        const headboard = new THREE.Mesh(headboardGeom, darkWoodMat);
        headboard.position.set(0, 0.75, -1.05);
        group.add(headboard);

        const standGeom = this.getCachedGeometry('nightstand_box', () => new THREE.BoxGeometry(0.48, 0.48, 0.45));
        const lampBaseGeom = this.getCachedGeometry('nightstand_lamp_base', () => new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12));
        const lampShadeGeom = this.getCachedGeometry('nightstand_lamp_shade', () => new THREE.CylinderGeometry(0.10, 0.14, 0.20, 12));

        [-1.35, 1.35].forEach((nx) => {
          const stand = new THREE.Mesh(standGeom, darkWoodMat);
          stand.position.set(nx, 0.24, -0.75);
          stand.castShadow = true;
          group.add(stand);

          const lampBase = new THREE.Mesh(lampBaseGeom, brassMat);
          lampBase.position.set(nx, 0.49, -0.75);
          group.add(lampBase);
          const lampShade = new THREE.Mesh(lampShadeGeom, warmLightMat);
          lampShade.position.set(nx, 0.62, -0.75);
          group.add(lampShade);
        });
        break;
      }

      case 'dining_set': {
        const tableGeom = this.getCachedGeometry('dining_table_top', () => new THREE.BoxGeometry(1.6, 0.06, 0.9));
        const table = new THREE.Mesh(tableGeom, woodMat);
        table.position.set(0, 0.73, 0);
        table.castShadow = true;
        group.add(table);

        const tableLegGeom = this.getCachedGeometry('dining_table_leg_6', () => new THREE.CylinderGeometry(0.03, 0.02, 0.70, 6));
        const tableLegs = [[-0.72, 0.35, -0.38], [0.72, 0.35, -0.38], [-0.72, 0.35, 0.38], [0.72, 0.35, 0.38]];
        tableLegs.forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(tableLegGeom, darkWoodMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
        });

        const chairSeatGeom = this.getCachedGeometry('dining_ch_seat', () => new THREE.CylinderGeometry(0.22, 0.22, 0.04, 10));
        const chairLegGeom = this.getCachedGeometry('dining_ch_leg_6', () => new THREE.CylinderGeometry(0.018, 0.012, 0.43, 6));
        const chairBackGeom = this.getCachedGeometry('dining_ch_back_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.035, 0.34, 1, 6);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });

        const chairCoords = [
          [-0.5, -0.65],
          [0.5, -0.65],
          [-0.5, 0.65],
          [0.5, 0.65]
        ];
        chairCoords.forEach(([cx, cz]) => {
          const chSeat = new THREE.Mesh(chairSeatGeom, woodMat);
          chSeat.position.set(cx, 0.43, cz);
          group.add(chSeat);
          const chLeg = new THREE.Mesh(chairLegGeom, steelMat);
          chLeg.position.set(cx, 0.215, cz);
          group.add(chLeg);
          const chBack = new THREE.Mesh(chairBackGeom, woodMat);
          chBack.position.set(cx, 0.68, cz + (cz > 0 ? 0.16 : -0.16));
          group.add(chBack);
        });
        break;
      }

      case 'desk_office': {
        const deskTopGeom = this.getCachedGeometry('desk_top_15', () => new THREE.BoxGeometry(1.5, 0.04, 0.75));
        const deskTop = new THREE.Mesh(deskTopGeom, woodMat);
        deskTop.position.set(0, 0.73, 0);
        deskTop.castShadow = true;
        group.add(deskTop);

        const deskLegGeom = this.getCachedGeometry('desk_tubular_leg', () => new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8));
        const deskLegCoords = [[-0.68, 0.36, -0.32], [0.68, 0.36, -0.32], [-0.68, 0.36, 0.32], [0.68, 0.36, 0.32]];
        deskLegCoords.forEach(([dx, dy, dz]) => {
          const dLeg = new THREE.Mesh(deskLegGeom, steelMat);
          dLeg.position.set(dx, dy, dz);
          group.add(dLeg);
        });

        const cabinetGeom = this.getCachedGeometry('desk_cabinet', () => new THREE.BoxGeometry(0.42, 0.52, 0.65));
        const drawerCabinet = new THREE.Mesh(cabinetGeom, darkWoodMat);
        drawerCabinet.position.set(0.46, 0.46, 0);
        group.add(drawerCabinet);
        break;
      }

      case 'chair_dining': {
        const seatGeom = this.getCachedGeometry('chair_din_seat', () => new THREE.CylinderGeometry(0.23, 0.23, 0.04, 16));
        const seat = new THREE.Mesh(seatGeom, woodMat);
        seat.position.set(0, 0.43, 0);
        seat.castShadow = true;
        group.add(seat);

        const legGeom = this.getCachedGeometry('chair_din_leg', () => new THREE.CylinderGeometry(0.02, 0.014, 0.43, 8));
        const legOffsets = [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]];
        legOffsets.forEach(([lx, lz]) => {
          const leg = new THREE.Mesh(legGeom, woodMat);
          leg.position.set(lx, 0.215, lz);
          group.add(leg);
        });

        const backGeom = this.getCachedGeometry('chair_din_back_capsule', () => {
          const geo = new THREE.CapsuleGeometry(0.035, 0.36, 2, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const back = new THREE.Mesh(backGeom, woodMat);
        back.position.set(0, 0.76, -0.18);
        back.rotation.x = 0.12;
        group.add(back);

        const spindleGeom = this.getCachedGeometry('chair_din_spindle', () => new THREE.CylinderGeometry(0.012, 0.012, 0.32, 8));
        [-0.14, 0.14].forEach((sx) => {
          const spindle = new THREE.Mesh(spindleGeom, steelMat);
          spindle.position.set(sx, 0.58, -0.17);
          group.add(spindle);
        });
        break;
      }

      case 'chair_office': {
        const baseCenterGeom = this.getCachedGeometry('off_ch_hub', () => new THREE.CylinderGeometry(0.05, 0.05, 0.08, 10));
        const hub = new THREE.Mesh(baseCenterGeom, steelMat);
        hub.position.set(0, 0.08, 0);
        group.add(hub);

        const spokeGeom = this.getCachedGeometry('off_ch_spoke', () => {
          const geo = new THREE.CylinderGeometry(0.014, 0.014, 0.26, 6);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        for (let i = 0; i < 5; i++) {
          const ang = (i * Math.PI * 2) / 5;
          const spoke = new THREE.Mesh(spokeGeom, steelMat);
          spoke.position.set(Math.cos(ang) * 0.14, 0.06, Math.sin(ang) * 0.14);
          spoke.rotation.y = ang;
          group.add(spoke);
        }

        const stemGeom = this.getCachedGeometry('off_ch_stem', () => new THREE.CylinderGeometry(0.024, 0.024, 0.32, 8));
        const stem = new THREE.Mesh(stemGeom, steelMat);
        stem.position.set(0, 0.24, 0);
        group.add(stem);

        const seatGeom = this.getCachedGeometry('off_ch_seat_capsule', () => {
          const geo = new THREE.CapsuleGeometry(0.08, 0.36, 2, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const seat = new THREE.Mesh(seatGeom, fabricGray);
        seat.position.set(0, 0.44, 0);
        group.add(seat);

        const backGeom = this.getCachedGeometry('off_ch_back_capsule', () => {
          const geo = new THREE.CapsuleGeometry(0.06, 0.38, 2, 8);
          geo.rotateZ(Math.PI / 2);
          return geo;
        });
        const back = new THREE.Mesh(backGeom, steelMat);
        back.position.set(0, 0.78, -0.2);
        back.rotation.x = 0.14;
        group.add(back);
        break;
      }

      case 'monitor_pc': {
        const baseGeom = this.getCachedGeometry('monitor_base_cyl', () => new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16));
        const base = new THREE.Mesh(baseGeom, brassMat);
        base.position.set(0, 0.0075, 0);
        group.add(base);

        const stalkGeom = this.getCachedGeometry('monitor_stalk_cyl', () => new THREE.CylinderGeometry(0.014, 0.014, 0.22, 8));
        const stalk = new THREE.Mesh(stalkGeom, steelMat);
        stalk.position.set(0, 0.11, 0);
        group.add(stalk);

        const frameGeom = this.getCachedGeometry('monitor_frame_box', () => new THREE.BoxGeometry(0.60, 0.36, 0.02));
        const frame = new THREE.Mesh(frameGeom, steelMat);
        frame.position.set(0, 0.26, 0);
        frame.castShadow = true;
        group.add(frame);

        const screenGeom = this.getCachedGeometry('monitor_screen_panel', () => new THREE.BoxGeometry(0.56, 0.32, 0.005));
        const screenMat = this.getCachedMaterial('screen_cyan', () => new THREE.MeshBasicMaterial({ color: 0x0284c7 }));
        const screen = new THREE.Mesh(screenGeom, screenMat);
        screen.position.set(0, 0.26, 0.012);
        group.add(screen);
        break;
      }

      case 'coffee_machine': {
        const bodyGeom = this.getCachedGeometry('coffee_body_box', () => new THREE.BoxGeometry(0.28, 0.32, 0.28));
        const body = new THREE.Mesh(bodyGeom, steelMat);
        body.position.set(0, 0.16, 0);
        body.castShadow = true;
        group.add(body);

        const hopperGeom = this.getCachedGeometry('coffee_hopper_cyl', () => new THREE.CylinderGeometry(0.075, 0.065, 0.08, 12));
        const hopper = new THREE.Mesh(hopperGeom, darkWoodMat);
        hopper.position.set(0, 0.36, -0.04);
        group.add(hopper);

        const cupGeom = this.getCachedGeometry('coffee_cup_cyl', () => new THREE.CylinderGeometry(0.035, 0.025, 0.045, 12));
        const cup = new THREE.Mesh(cupGeom, ceramicMat);
        cup.position.set(0, 0.04, 0.10);
        group.add(cup);

        const wandGeom = this.getCachedGeometry('coffee_wand_cyl', () => new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8));
        const wand = new THREE.Mesh(wandGeom, brassMat);
        wand.position.set(0.12, 0.12, 0.12);
        wand.rotation.z = -0.3;
        group.add(wand);
        break;
      }

      case 'table_lamp': {
        const baseGeom = this.getCachedGeometry('table_lamp_base_cyl', () => new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16));
        const base = new THREE.Mesh(baseGeom, brassMat);
        base.position.set(0, 0.01, 0);
        group.add(base);

        const stemGeom = this.getCachedGeometry('table_lamp_stem_cyl', () => new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8));
        const stem = new THREE.Mesh(stemGeom, brassMat);
        stem.position.set(0, 0.15, 0);
        group.add(stem);

        const shadeGeom = this.getCachedGeometry('table_lamp_shade_cyl', () => new THREE.CylinderGeometry(0.08, 0.13, 0.16, 16));
        const shade = new THREE.Mesh(shadeGeom, warmLightMat);
        shade.position.set(0, 0.34, 0);
        group.add(shade);
        break;
      }

      case 'small_pot': {
        const potGeom = this.getCachedGeometry('succulent_pot_cyl', () => new THREE.CylinderGeometry(0.09, 0.065, 0.12, 14));
        const pot = new THREE.Mesh(potGeom, ceramicMat);
        pot.position.set(0, 0.06, 0);
        pot.castShadow = true;
        group.add(pot);

        const soilGeom = this.getCachedGeometry('succulent_soil_cyl', () => new THREE.CylinderGeometry(0.084, 0.084, 0.02, 12));
        const soil = new THREE.Mesh(soilGeom, darkWoodMat);
        soil.position.set(0, 0.12, 0);
        group.add(soil);

        const leafGeom = this.getCachedGeometry('succulent_leaf_capsule_opt', () => {
          const geo = new THREE.CapsuleGeometry(0.022, 0.04, 1, 6);
          geo.rotateZ(Math.PI / 4);
          return geo;
        });
        for (let i = 0; i < 5; i++) {
          const ang = (i * Math.PI * 2) / 5;
          const leaf = new THREE.Mesh(leafGeom, plantMat);
          leaf.position.set(Math.cos(ang) * 0.045, 0.14, Math.sin(ang) * 0.045);
          leaf.rotation.y = ang;
          group.add(leaf);
        }
        break;
      }

      case 'painting_art': {
        const frameGeom = this.getCachedGeometry('art_frame_box', () => new THREE.BoxGeometry(1.2, 0.8, 0.04));
        const frame = new THREE.Mesh(frameGeom, woodMat);
        frame.position.set(0, 0, 0);
        frame.castShadow = true;
        group.add(frame);

        const canvasGeom = this.getCachedGeometry('art_canvas_box', () => new THREE.BoxGeometry(1.1, 0.7, 0.01));
        const canvasMat = this.getCachedMaterial('art_canvas_mat', () => new THREE.MeshBasicMaterial({ color: 0x059669 }));
        const canvas = new THREE.Mesh(canvasGeom, canvasMat);
        canvas.position.set(0, 0, 0.022);
        group.add(canvas);
        break;
      }

      case 'wall_sconce': {
        const mountGeom = this.getCachedGeometry('sconce_mount_cyl', () => new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12));
        const mount = new THREE.Mesh(mountGeom, brassMat);
        mount.rotation.x = Math.PI / 2;
        group.add(mount);

        const bodyGeom = this.getCachedGeometry('sconce_body_cyl', () => new THREE.CylinderGeometry(0.045, 0.045, 0.22, 14));
        const sconce = new THREE.Mesh(bodyGeom, warmLightMat);
        sconce.position.set(0, 0, 0.08);
        group.add(sconce);

        const ringGeom = this.getCachedGeometry('sconce_ring_cyl', () => new THREE.CylinderGeometry(0.05, 0.05, 0.04, 14));
        const ring = new THREE.Mesh(ringGeom, brassMat);
        ring.position.set(0, 0, 0.08);
        group.add(ring);
        break;
      }

      case 'wall_signage': {
        const woodPlateGeom = this.getCachedGeometry('sign_wood_plate', () => new THREE.BoxGeometry(0.8, 0.4, 0.03));
        const woodPlate = new THREE.Mesh(woodPlateGeom, darkWoodMat);
        woodPlate.position.set(0, 0, 0);
        group.add(woodPlate);

        const brassPlateGeom = this.getCachedGeometry('sign_brass_plate', () => new THREE.BoxGeometry(0.72, 0.32, 0.01));
        const brassPlate = new THREE.Mesh(brassPlateGeom, brassMat);
        brassPlate.position.set(0, 0, 0.016);
        group.add(brassPlate);
        break;
      }

      case 'bar_counter': {
        const counterGeom = this.getCachedGeometry('bar_counter_body', () => new THREE.BoxGeometry(2.4, 1.05, 0.75));
        const counter = new THREE.Mesh(counterGeom, darkWoodMat);
        counter.position.set(0, 0.525, 0);
        counter.castShadow = true;
        group.add(counter);

        const topGeom = this.getCachedGeometry('bar_counter_top', () => new THREE.BoxGeometry(2.5, 0.06, 0.82));
        const marbleTop = new THREE.Mesh(topGeom, whiteMat);
        marbleTop.position.set(0, 1.08, 0);
        group.add(marbleTop);

        const machineGeom = this.getCachedGeometry('bar_coffee_machine', () => new THREE.BoxGeometry(0.5, 0.4, 0.38));
        const machine = new THREE.Mesh(machineGeom, steelMat);
        machine.position.set(-0.6, 1.3, 0);
        group.add(machine);

        const posGeom = this.getCachedGeometry('bar_pos_reg', () => new THREE.BoxGeometry(0.3, 0.25, 0.25));
        const pos = new THREE.Mesh(posGeom, whiteMat);
        pos.position.set(0.6, 1.23, 0);
        group.add(pos);
        break;
      }

      case 'wardrobe_shelf': {
        const cabinetGeom = this.getCachedGeometry('wardrobe_shelf_box', () => new THREE.BoxGeometry(1.5, 2.1, 0.55));
        const cabinet = new THREE.Mesh(cabinetGeom, darkWoodMat);
        cabinet.position.set(0, 1.05, 0);
        cabinet.castShadow = true;
        group.add(cabinet);
        break;
      }

      case 'plant_monstera': {
        const potGeom = this.getCachedGeometry('monstera_pot_cyl', () => new THREE.CylinderGeometry(0.24, 0.18, 0.48, 16));
        const pot = new THREE.Mesh(potGeom, ceramicMat);
        pot.position.set(0, 0.24, 0);
        pot.castShadow = true;
        group.add(pot);

        const soilGeom = this.getCachedGeometry('monstera_soil_cyl', () => new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16));
        const soil = new THREE.Mesh(soilGeom, darkWoodMat);
        soil.position.set(0, 0.47, 0);
        group.add(soil);

        const leafStemGeom = this.getCachedGeometry('monstera_stem_cyl', () => new THREE.CylinderGeometry(0.012, 0.015, 0.45, 6));
        const leafBladeGeom = this.getCachedGeometry('monstera_blade_box', () => new THREE.BoxGeometry(0.28, 0.02, 0.22));
        const leafAngles = [0, 1.25, 2.5, 3.8, 5.0];
        leafAngles.forEach((ang, idx) => {
          const leafStem = new THREE.Mesh(leafStemGeom, plantMat);
          leafStem.position.set(Math.cos(ang) * 0.12, 0.62 + idx * 0.06, Math.sin(ang) * 0.12);
          leafStem.rotation.z = Math.cos(ang) * 0.35;
          leafStem.rotation.x = Math.sin(ang) * 0.35;
          group.add(leafStem);

          const leafBlade = new THREE.Mesh(leafBladeGeom, plantMat);
          leafBlade.position.set(Math.cos(ang) * 0.28, 0.82 + idx * 0.06, Math.sin(ang) * 0.28);
          leafBlade.rotation.y = ang;
          leafBlade.rotation.z = 0.25;
          group.add(leafBlade);
        });
        break;
      }

      case 'floor_lamp': {
        const baseGeom = this.getCachedGeometry('floor_lamp_base_cyl', () => new THREE.CylinderGeometry(0.22, 0.24, 0.04, 16));
        const base = new THREE.Mesh(baseGeom, steelMat);
        base.position.set(0, 0.02, 0);
        group.add(base);

        const poleGeom = this.getCachedGeometry('floor_lamp_pole_cyl', () => new THREE.CylinderGeometry(0.018, 0.018, 1.62, 8));
        const pole = new THREE.Mesh(poleGeom, brassMat);
        pole.position.set(0, 0.83, 0);
        group.add(pole);

        const shadeGeom = this.getCachedGeometry('floor_lamp_shade_cyl', () => new THREE.CylinderGeometry(0.22, 0.26, 0.36, 16, 1, true));
        const shade = new THREE.Mesh(shadeGeom, warmLightMat);
        shade.position.set(0, 1.52, 0);
        group.add(shade);

        const bulbGeom = this.getCachedGeometry('floor_lamp_bulb_sph', () => new THREE.SphereGeometry(0.06, 10, 10));
        const bulb = new THREE.Mesh(bulbGeom, warmLightMat);
        bulb.position.set(0, 1.50, 0);
        group.add(bulb);
        break;
      }

      case 'kitchen_island': {
        const islandGeom = this.getCachedGeometry('kitchen_island_base', () => new THREE.BoxGeometry(2.4, 0.9, 0.9));
        const island = new THREE.Mesh(islandGeom, darkWoodMat);
        island.position.set(0, 0.45, 0);
        island.castShadow = true;
        group.add(island);

        const topGeom = this.getCachedGeometry('kitchen_island_top', () => new THREE.BoxGeometry(2.5, 0.06, 0.98));
        const top = new THREE.Mesh(topGeom, whiteMat);
        top.position.set(0, 0.93, 0);
        group.add(top);

        const fridgeGeom = this.getCachedGeometry('kitchen_fridge', () => new THREE.BoxGeometry(0.85, 1.85, 0.75));
        const fridge = new THREE.Mesh(fridgeGeom, steelMat);
        fridge.position.set(1.7, 0.925, 0);
        group.add(fridge);
        break;
      }

      case 'bathroom_set': {
        const tubGeom = this.getCachedGeometry('bath_tub_box', () => new THREE.BoxGeometry(1.6, 0.55, 0.8));
        const tub = new THREE.Mesh(tubGeom, ceramicMat);
        tub.position.set(-0.2, 0.275, 0);
        tub.castShadow = true;
        group.add(tub);

        const toiletGeom = this.getCachedGeometry('bath_toilet_box', () => new THREE.BoxGeometry(0.45, 0.75, 0.65));
        const toilet = new THREE.Mesh(toiletGeom, ceramicMat);
        toilet.position.set(1.1, 0.375, 0);
        group.add(toilet);
        break;
      }

      case 'reception_desk': {
        const deskGeom = this.getCachedGeometry('reception_desk_base', () => new THREE.BoxGeometry(2.2, 1.1, 0.85));
        const desk = new THREE.Mesh(deskGeom, darkWoodMat);
        desk.position.set(0, 0.55, 0);
        desk.castShadow = true;
        group.add(desk);

        const topAccentGeom = this.getCachedGeometry('reception_top_accent', () => new THREE.BoxGeometry(2.3, 0.05, 0.9));
        const topAccent = new THREE.Mesh(topAccentGeom, brassMat);
        topAccent.position.set(0, 1.125, 0);
        group.add(topAccent);

        const chairGeom = this.getCachedGeometry('reception_chair_box', () => new THREE.BoxGeometry(0.48, 0.95, 0.48));
        const chair = new THREE.Mesh(chairGeom, steelMat);
        chair.position.set(0, 0.475, -0.6);
        group.add(chair);
        break;
      }

      case 'rug_nusantara': {
        const rugMat = this.getCachedMaterial('rug_nusantara_mat', () => new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.92, metalness: 0.0 }));
        const rugGeom = this.getCachedGeometry('rug_nusantara_plane', () => new THREE.BoxGeometry(2.0, 0.025, 1.4));
        const rug = new THREE.Mesh(rugGeom, rugMat);
        rug.position.set(0, 0.0125, 0);
        rug.receiveShadow = true;
        group.add(rug);
        break;
      }

      default: {
        const boxGeom = this.getCachedGeometry('default_box', () => new THREE.BoxGeometry(1, 1, 1));
        const box = new THREE.Mesh(boxGeom, woodMat);
        box.position.set(0, 0.5, 0);
        group.add(box);
        break;
      }
    }

    return group;
  }

  public static buildGhostPreview(type: string, isValid: boolean): THREE.Group {
    const group = this.buildFurniture(type);
    const color = isValid ? 0x007aff : 0xff3b30;

    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.45,
          wireframe: false,
          depthWrite: false
        });
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });

    return group;
  }
}
