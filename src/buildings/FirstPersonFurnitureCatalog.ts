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
    const warmLightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });

    switch (type) {
      case 'sofa_l': {
        // Cylindrical black steel legs
        const legGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8);
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

        // Plinth frame
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.9), darkWoodMat);
        plinth.position.set(0, 0.18, 0);
        group.add(plinth);

        // Main seat cushions (ergonomic bevel)
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.28, 0.88), fabricGray);
        base.position.set(0, 0.36, 0);
        base.castShadow = true;
        group.add(base);

        // 105-degree tilted backrest (15 deg slope backwards)
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.44, 0.22), fabricGray);
        back.position.set(0, 0.65, -0.34);
        back.rotation.x = 0.18; // ~10.5 deg tilt
        back.castShadow = true;
        group.add(back);

        // L-return chaise
        const ret = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.88), fabricGray);
        ret.position.set(-0.75, 0.36, 0.88);
        ret.castShadow = true;
        group.add(ret);

        // Pillows
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.32, 0.14), fabricBlue);
        p1.position.set(0.65, 0.58, -0.16);
        p1.rotation.y = -0.15;
        group.add(p1);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.30, 0.14), brassMat);
        p2.position.set(-0.15, 0.58, -0.16);
        p2.rotation.y = 0.12;
        group.add(p2);
        break;
      }

      case 'sofa_3seater': {
        // 4 steel cylinder legs
        const legGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.14, 8);
        const legCoords = [
          [-0.92, 0.07, -0.65], [0.92, 0.07, -0.65],
          [-0.92, 0.07, 0.05], [0.92, 0.07, 0.05]
        ];
        legCoords.forEach(([lx, ly, lz]) => {
          const leg = new THREE.Mesh(legGeom, steelMat);
          leg.position.set(lx, ly, lz);
          group.add(leg);
        });

        // Base plinth
        const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.85), darkWoodMat);
        plinth.position.set(0, 0.18, -0.3);
        group.add(plinth);

        // 3-cushion divided seat
        for (let i = 0; i < 3; i++) {
          const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.82), fabricGray);
          cushion.position.set(-0.64 + i * 0.64, 0.35, -0.28);
          cushion.castShadow = true;
          group.add(cushion);
        }

        // 105-degree tilted backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.45, 0.22), fabricGray);
        back.position.set(0, 0.66, -0.62);
        back.rotation.x = 0.18; // ~10.5 deg slope
        back.castShadow = true;
        group.add(back);

        // Side armrests
        const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.86), fabricGray);
        armL.position.set(-1.0, 0.42, -0.3);
        group.add(armL);
        const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 0.86), fabricGray);
        armR.position.set(1.0, 0.42, -0.3);
        group.add(armR);

        // Teak coffee table with 4 legs
        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.04, 0.6), woodMat);
        tableTop.position.set(0, 0.36, 0.5);
        tableTop.castShadow = true;
        group.add(tableTop);
        const tableLegCoords = [
          [-0.52, 0.18, 0.26], [0.52, 0.18, 0.26],
          [-0.52, 0.18, 0.74], [0.52, 0.18, 0.74]
        ];
        tableLegCoords.forEach(([tx, ty, tz]) => {
          const tLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8), steelMat);
          tLeg.position.set(tx, ty, tz);
          group.add(tLeg);
        });
        break;
      }

      case 'bed_king': {
        // Platform frame with legs
        const platform = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.32, 2.1), darkWoodMat);
        platform.position.set(0, 0.22, 0);
        platform.castShadow = true;
        group.add(platform);

        // 4 corner legs
        const bLegs = [[-0.88, 0.06, -0.98], [0.88, 0.06, -0.98], [-0.88, 0.06, 0.98], [0.88, 0.06, 0.98]];
        bLegs.forEach(([bx, by, bz]) => {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.08), darkWoodMat);
          leg.position.set(bx, by, bz);
          group.add(leg);
        });

        // 2-tier thick spring mattress
        const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.28, 2.0), whiteMat);
        mattress.position.set(0, 0.52, 0);
        group.add(mattress);

        // Layered duvet & folded blanket runner
        const duvet = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.09, 1.3), fabricBlue);
        duvet.position.set(0, 0.68, 0.35);
        group.add(duvet);

        // 4 sleeping pillows (2 back, 2 front plush)
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.38), whiteMat);
        p1.position.set(-0.45, 0.72, -0.72);
        p1.rotation.x = 0.2;
        group.add(p1);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.38), whiteMat);
        p2.position.set(0.45, 0.72, -0.72);
        p2.rotation.x = 0.2;
        group.add(p2);
        const p3 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.32), fabricGray);
        p3.position.set(-0.45, 0.74, -0.42);
        group.add(p3);
        const p4 = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.32), fabricGray);
        p4.position.set(0.45, 0.74, -0.42);
        group.add(p4);

        // Slatted headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.1, 0.1), darkWoodMat);
        headboard.position.set(0, 0.75, -1.05);
        group.add(headboard);

        // 2 Nightstands (left & right)
        [-1.35, 1.35].forEach((nx) => {
          const stand = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.45), darkWoodMat);
          stand.position.set(nx, 0.24, -0.75);
          stand.castShadow = true;
          group.add(stand);

          // Warm bedside lamp on nightstand
          const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 12), brassMat);
          lampBase.position.set(nx, 0.49, -0.75);
          group.add(lampBase);
          const lampShade = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.20, 12), warmLightMat);
          lampShade.position.set(nx, 0.62, -0.75);
          group.add(lampShade);
        });
        break;
      }

      case 'dining_set': {
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.76, 0.9), woodMat);
        table.position.set(0, 0.38, 0);
        table.castShadow = true;
        group.add(table);

        // 4 chairs
        const chairCoords = [
          [-0.5, -0.65],
          [0.5, -0.65],
          [-0.5, 0.65],
          [0.5, 0.65]
        ];
        chairCoords.forEach(([cx, cz]) => {
          const chSeat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), woodMat);
          chSeat.position.set(cx, 0.45, cz);
          group.add(chSeat);
          const chLeg = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.38), steelMat);
          chLeg.position.set(cx, 0.225, cz);
          group.add(chLeg);
          const chBack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.4, 0.05), woodMat);
          chBack.position.set(cx, 0.675, cz + (cz > 0 ? 0.18 : -0.18));
          group.add(chBack);
        });
        break;
      }

      case 'desk_office': {
        // Desktop solid wood top
        const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.04, 0.75), woodMat);
        deskTop.position.set(0, 0.73, 0);
        deskTop.castShadow = true;
        group.add(deskTop);

        // 4 tubular metal legs
        const deskLegCoords = [[-0.68, 0.36, -0.32], [0.68, 0.36, -0.32], [-0.68, 0.36, 0.32], [0.68, 0.36, 0.32]];
        deskLegCoords.forEach(([dx, dy, dz]) => {
          const dLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.72, 8), steelMat);
          dLeg.position.set(dx, dy, dz);
          group.add(dLeg);
        });

        // 2-drawer side cabinet
        const drawerCabinet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.52, 0.65), darkWoodMat);
        drawerCabinet.position.set(0.46, 0.46, 0);
        group.add(drawerCabinet);

        // Ultra-thin monitor on aluminum stand
        const monitorBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16), brassMat);
        monitorBase.position.set(-0.05, 0.757, -0.2);
        group.add(monitorBase);
        const monitorStalk = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.24, 8), steelMat);
        monitorStalk.position.set(-0.05, 0.88, -0.2);
        group.add(monitorStalk);
        const monitorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.42, 0.02), steelMat);
        monitorPanel.position.set(-0.05, 1.05, -0.2);
        group.add(monitorPanel);

        // Ergonomic Chair with 5-star castor base & mesh back
        const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.46), fabricGray);
        chairSeat.position.set(-0.05, 0.46, 0.45);
        group.add(chairSeat);
        const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.48, 0.04), steelMat);
        chairBack.position.set(-0.05, 0.72, 0.66);
        group.add(chairBack);
        const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.38, 8), steelMat);
        chairBase.position.set(-0.05, 0.22, 0.45);
        group.add(chairBase);
        const chairStar = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.03, 5), steelMat);
        chairStar.position.set(-0.05, 0.04, 0.45);
        group.add(chairStar);
        break;
      }

      case 'bar_counter': {
        const counter = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.05, 0.75), darkWoodMat);
        counter.position.set(0, 0.525, 0);
        counter.castShadow = true;
        group.add(counter);

        const marbleTop = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.82), whiteMat);
        marbleTop.position.set(0, 1.08, 0);
        group.add(marbleTop);

        // Coffee machine
        const machine = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.38), steelMat);
        machine.position.set(-0.6, 1.3, 0);
        group.add(machine);

        // POS Register
        const pos = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.25), whiteMat);
        pos.position.set(0.6, 1.23, 0);
        group.add(pos);
        break;
      }

      case 'wardrobe_shelf': {
        const cabinet = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.1, 0.55), darkWoodMat);
        cabinet.position.set(0, 1.05, 0);
        cabinet.castShadow = true;
        group.add(cabinet);
        break;
      }

      case 'plant_monstera': {
        // Fluted ceramic planter pot
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.48, 16), ceramicMat);
        pot.position.set(0, 0.24, 0);
        pot.castShadow = true;
        group.add(pot);

        // Soil disk
        const soil = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 16), darkWoodMat);
        soil.position.set(0, 0.47, 0);
        group.add(soil);

        // Cascading Monstera leaves at diverse angles
        const leafAngles = [0, 1.25, 2.5, 3.8, 5.0];
        leafAngles.forEach((ang, idx) => {
          const leafStem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.45, 6), plantMat);
          leafStem.position.set(Math.cos(ang) * 0.12, 0.62 + idx * 0.06, Math.sin(ang) * 0.12);
          leafStem.rotation.z = Math.cos(ang) * 0.35;
          leafStem.rotation.x = Math.sin(ang) * 0.35;
          group.add(leafStem);

          const leafBlade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.22), plantMat);
          leafBlade.position.set(Math.cos(ang) * 0.28, 0.82 + idx * 0.06, Math.sin(ang) * 0.28);
          leafBlade.rotation.y = ang;
          leafBlade.rotation.z = 0.25;
          group.add(leafBlade);
        });
        break;
      }

      case 'floor_lamp': {
        // Weighted circular brass/steel base
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.04, 16), steelMat);
        base.position.set(0, 0.02, 0);
        group.add(base);

        // Slender arched pole
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.62, 8), brassMat);
        pole.position.set(0, 0.83, 0);
        group.add(pole);

        // Drum linen lampshade
        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.36, 16, 1, true), warmLightMat);
        shade.position.set(0, 1.52, 0);
        group.add(shade);

        // Glowing warm bulb sphere inside shade
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), warmLightMat);
        bulb.position.set(0, 1.50, 0);
        group.add(bulb);
        break;
      }

      case 'kitchen_island': {
        const island = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 0.9), darkWoodMat);
        island.position.set(0, 0.45, 0);
        island.castShadow = true;
        group.add(island);

        const top = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.98), whiteMat);
        top.position.set(0, 0.93, 0);
        group.add(top);

        const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.85, 0.75), steelMat);
        fridge.position.set(1.7, 0.925, 0);
        group.add(fridge);
        break;
      }

      case 'bathroom_set': {
        // Bathtub
        const tub = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.8), ceramicMat);
        tub.position.set(-0.2, 0.275, 0);
        tub.castShadow = true;
        group.add(tub);

        // Toilet
        const toilet = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.65), ceramicMat);
        toilet.position.set(1.1, 0.375, 0);
        group.add(toilet);
        break;
      }

      case 'reception_desk': {
        const desk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.85), darkWoodMat);
        desk.position.set(0, 0.55, 0);
        desk.castShadow = true;
        group.add(desk);

        const topAccent = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.05, 0.9), brassMat);
        topAccent.position.set(0, 1.125, 0);
        group.add(topAccent);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.95, 0.48), steelMat);
        chair.position.set(0, 0.475, -0.6);
        group.add(chair);
        break;
      }

      case 'rug_nusantara': {
        const rugMat = new THREE.MeshStandardMaterial({ color: 0x8b5a3c, roughness: 0.92, metalness: 0.0 });
        const rug = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.025, 1.4), rugMat);
        rug.position.set(0, 0.0125, 0);
        rug.receiveShadow = true;
        group.add(rug);
        break;
      }

      default: {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), woodMat);
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
