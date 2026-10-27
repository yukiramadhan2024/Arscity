import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: 'living' | 'bedroom' | 'dining' | 'office' | 'commercial' | 'bathroom' | 'decor';
  description: string;
  width: number;
  depth: number;
  height: number;
  seatHeight?: number;
  isSeat?: boolean;
}

export interface ExteriorCatalogItem {
  id: string;
  name: string;
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

export const FIRST_PERSON_FURNITURE_CATALOG: FurnitureCatalogItem[] = [
  {
    id: 'sofa_l',
    name: 'Sofa L-Shape Ruang Tamu',
    category: 'living',
    description: 'Sofa sudut modern kain abu-abu dengan bantal aksen',
    width: 2.4,
    depth: 1.8,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true
  },
  {
    id: 'sofa_3seater',
    name: 'Sofa 3 Dudukan & Meja Kopi',
    category: 'living',
    description: 'Sofa minimalis 3 dudukan dengan meja kopi kayu jati',
    width: 2.2,
    depth: 1.6,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true
  },
  {
    id: 'bed_king',
    name: 'Tempat Tidur King & Nakas',
    category: 'bedroom',
    description: 'Ranjang kayu jati dengan kasur empuk dan sepasang nakas',
    width: 2.2,
    depth: 2.2,
    height: 0.95,
    seatHeight: 0.55,
    isSeat: true
  },
  {
    id: 'dining_set',
    name: 'Meja Makan + 4 Kursi',
    category: 'dining',
    description: 'Meja makan kayu solid dengan 4 kursi bergaya Skandinavia',
    width: 1.8,
    depth: 1.4,
    height: 0.85,
    seatHeight: 0.45,
    isSeat: true
  },
  {
    id: 'desk_office',
    name: 'Meja Kerja & PC Monitor',
    category: 'office',
    description: 'Meja kerja ergonomis dengan layar monitor ganda dan kursi putar',
    width: 1.4,
    depth: 0.8,
    height: 1.1,
    seatHeight: 0.48,
    isSeat: true
  },
  {
    id: 'bar_counter',
    name: 'Konter Bar Kopi & Mesin Kasir',
    category: 'commercial',
    description: 'Konter barista kayu dengan mesin espresso dan display kasir',
    width: 2.4,
    depth: 1.0,
    height: 1.15
  },
  {
    id: 'wardrobe_shelf',
    name: 'Lemari Pakaian & Rak Buku',
    category: 'bedroom',
    description: 'Lemari kabinet tinggi kayu gelap dengan rak buku terintegrasi',
    width: 1.6,
    depth: 0.6,
    height: 2.2
  },
  {
    id: 'plant_monstera',
    name: 'Tanaman Pot Monstera Indoor',
    category: 'decor',
    description: 'Pot keramik putih dengan tanaman tropis hijau segar',
    width: 0.6,
    depth: 0.6,
    height: 1.1
  },
  {
    id: 'floor_lamp',
    name: 'Lampu Berdiri (Floor Lamp 2700K)',
    category: 'decor',
    description: 'Lampu sudut minimalis dengan pencahayaan hangat 2700K',
    width: 0.45,
    depth: 0.45,
    height: 1.65
  },
  {
    id: 'kitchen_island',
    name: 'Kitchen Island & Kulkas Wastafel',
    category: 'dining',
    description: 'Set dapur modern marmer putih dengan wastafel stainless dan kulkas',
    width: 2.6,
    depth: 1.2,
    height: 1.85
  },
  {
    id: 'bathroom_set',
    name: 'Bathtub & Toilet Minimalis',
    category: 'bathroom',
    description: 'Bak mandi freestanding akrilik putih dengan toilet duduk dan vanity wastafel',
    width: 2.0,
    depth: 1.4,
    height: 1.0
  },
  {
    id: 'reception_desk',
    name: 'Meja Resepsionis & Kursi Ergonomis',
    category: 'commercial',
    description: 'Meja resepsionis modern panel kayu dengan kursi kantor',
    width: 2.2,
    depth: 1.1,
    height: 1.15,
    seatHeight: 0.48,
    isSeat: true
  }
];

export const FIRST_PERSON_EXTERIOR_CATALOG: ExteriorCatalogItem[] = [
  // Buildings
  { id: 'bld_tropis', name: 'Rumah Tropis Tipe 36', category: 'building', description: 'Rumah tinggal 1 lantai tropis modern', presetKey: 'house_36' },
  { id: 'bld_villa', name: 'Villa Tropis 2 Lantai', category: 'building', description: 'Villa tropis mewah dengan balkon lantai 2', presetKey: 'house_2fl' },
  { id: 'bld_ruko', name: 'Ruko Modern 3 Lantai', category: 'building', description: 'Rumah toko komersial dengan kanopi teras', presetKey: 'ruko_3fl' },
  { id: 'bld_kafe', name: 'Resto & Kafe Tropis', category: 'building', description: 'Kafe kuliner berarsitektur hall terbuka', presetKey: 'resto_mie_gacoan' },
  { id: 'bld_joglo', name: 'Pendopo Joglo Tradisional', category: 'building', description: 'Arsitektur vernakular Jawa atap joglo megah', presetKey: 'joglo' },
  { id: 'bld_kantor', name: 'Kantor Modern Kaca', category: 'building', description: 'Gedung perkantoran modern fasad kaca & louvers', presetKey: 'office_tower_glass' },

  // Trees & Flora
  { id: 'tree_tabebuya_pink', name: 'Pohon Tabebuya Pink', category: 'flora', description: 'Pohon peneduh tropis dengan bunga merah muda Sakura Jawa' },
  { id: 'tree_tabebuya_gold', name: 'Pohon Tabebuya Emas', category: 'flora', description: 'Pohon hias tropis dengan kanopi bunga kuning keemasan' },
  { id: 'tree_flamboyan', name: 'Pohon Flamboyan', category: 'flora', description: 'Pohon rindang berbunga merah menyala khas Malioboro' },
  { id: 'tree_frangipani', name: 'Pohon Kamboja', category: 'flora', description: 'Pohon taman aromatik tropis berbatang artistik' },
  { id: 'flora_yellow_bamboo', name: 'Bambu Kuning', category: 'flora', description: 'Rumpun bambu hias tropis penyejuk teras dan taman' },
  { id: 'tree_banyan_kurung', name: 'Pohon Beringin Rindang', category: 'flora', description: 'Pohon beringin ikonik dengan peneduh maksimal -3.0°C' },
  { id: 'tree_asam_jawa', name: 'Pohon Asam Jawa', category: 'flora', description: 'Pohon peneduh jalan raya dengan tajuk daun rindang' },

  // Street Furniture
  { id: 'street_malioboro_bollards', name: 'Bangku Malioboro', category: 'street_furniture', description: 'Bangku taman besi tempa & kayu khas pedestrian Malioboro' },
  { id: 'street_garden_lanterns', name: 'Lampu Taman', category: 'street_furniture', description: 'Tiang lentera penerangan pedestrian klasik' },
  { id: 'fountain_reflecting_pool', name: 'Air Mancur', category: 'street_furniture', description: 'Kolam air mancur bundar dengan ornamen batu candi' },
  { id: 'sculpture_candi_stone', name: 'Patung Seni Candi', category: 'street_furniture', description: 'Monolit pahatan seni arsitektur nusantara' }
];

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
        // Base main
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.9), fabricGray);
        base.position.set(0, 0.21, 0);
        base.castShadow = true;
        group.add(base);

        // Backrest
        const back = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 0.25), fabricGray);
        back.position.set(0, 0.63, -0.325);
        back.castShadow = true;
        group.add(back);

        // L return
        const ret = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.42, 0.9), fabricGray);
        ret.position.set(-0.775, 0.21, 0.9);
        ret.castShadow = true;
        group.add(ret);

        // Pillows
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.15), fabricBlue);
        p1.position.set(0.65, 0.58, -0.15);
        group.add(p1);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.15), brassMat);
        p2.position.set(-0.2, 0.58, -0.15);
        group.add(p2);
        break;
      }

      case 'sofa_3seater': {
        const base = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.85), fabricGray);
        base.position.set(0, 0.21, -0.3);
        base.castShadow = true;
        group.add(base);

        const back = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.42, 0.25), fabricGray);
        back.position.set(0, 0.63, -0.6);
        back.castShadow = true;
        group.add(back);

        // Coffee table
        const table = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.36, 0.6), woodMat);
        table.position.set(0, 0.18, 0.5);
        table.castShadow = true;
        group.add(table);
        break;
      }

      case 'bed_king': {
        const platform = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 2.1), darkWoodMat);
        platform.position.set(0, 0.225, 0);
        platform.castShadow = true;
        group.add(platform);

        const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.25, 2.0), whiteMat);
        mattress.position.set(0, 0.575, 0);
        group.add(mattress);

        // Pillows
        const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.4), whiteMat);
        p1.position.set(-0.45, 0.75, -0.65);
        group.add(p1);
        const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.4), whiteMat);
        p2.position.set(0.45, 0.75, -0.65);
        group.add(p2);

        // Blanket
        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.08, 1.0), fabricBlue);
        blanket.position.set(0, 0.73, 0.5);
        group.add(blanket);

        // Headboard
        const headboard = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 0.1), darkWoodMat);
        headboard.position.set(0, 0.65, -1.05);
        group.add(headboard);
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
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.74, 0.7), woodMat);
        desk.position.set(0, 0.37, 0);
        desk.castShadow = true;
        group.add(desk);

        // Monitor
        const monitorStand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.2, 0.12), steelMat);
        monitorStand.position.set(0, 0.84, -0.2);
        group.add(monitorStand);
        const monitorScreen = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.38, 0.04), steelMat);
        monitorScreen.position.set(0, 1.05, -0.2);
        group.add(monitorScreen);

        // Ergonomic Chair
        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.9, 0.48), steelMat);
        chair.position.set(0, 0.45, 0.45);
        group.add(chair);
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
        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.45, 12), ceramicMat);
        pot.position.set(0, 0.225, 0);
        pot.castShadow = true;
        group.add(pot);

        const plantFoliage = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38), plantMat);
        plantFoliage.position.set(0, 0.65, 0);
        group.add(plantFoliage);
        break;
      }

      case 'floor_lamp': {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.04, 12), steelMat);
        base.position.set(0, 0.02, 0);
        group.add(base);

        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), steelMat);
        pole.position.set(0, 0.77, 0);
        group.add(pole);

        const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 0.35, 12, 1, true), warmLightMat);
        shade.position.set(0, 1.45, 0);
        group.add(shade);
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
