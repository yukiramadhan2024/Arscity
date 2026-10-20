import * as THREE from 'three';
import { InteriorLayout, InteriorWall, InteriorStair, FloorVoid, RoomDefinition } from './InteriorTypes';
import { roomStandardsRegistry } from './RoomStandards';
import { PolygonMath } from '../core/math/PolygonMath';
import { BuildingCatalogRegistry, BuildingCatalogItem } from './BuildingCatalogRegistry';

export class InteriorLayoutFactory {
  /**
   * Generates authentic, architecturally correct Indonesian floorplans
   * with partition walls (15 cm thickness), doors, stairs, voids, and rooms.
   */
  public static getLayoutForBuilding(
    presetKey: string,
    width: number,
    length: number,
    floorHeight: number = 3.2,
    floorCount: number = 1
  ): InteriorLayout[] {
    const layouts: InteriorLayout[] = [];

    for (let fl = 0; fl < floorCount; fl++) {
      let layout: InteriorLayout;
      switch (presetKey) {
        case 'house_36':
          layout = this.buildHouse36Layout(width, length, floorHeight, fl);
          break;
        case 'house_54':
          layout = this.buildHouse54Layout(width, length, floorHeight, fl);
          break;
        case 'house_2fl':
          layout = this.buildHouse2StoryLayout(width, length, floorHeight, fl);
          break;
        case 'joglo':
          layout = this.buildJogloLayout(width, length, floorHeight, fl);
          break;
        case 'ruko_3fl':
          layout = this.buildRukoLayout(width, length, floorHeight, fl);
          break;
        default: {
          const item = BuildingCatalogRegistry.getBuilding(presetKey);
          if (item) {
            switch (item.category) {
              case 'kuliner_kafe':
                layout = this.buildKulinerKafeLayout(width, length, floorHeight, fl, item);
                break;
              case 'mall_ritel':
              case 'perdagangan_jasa':
                layout = this.buildMallRitelLayout(width, length, floorHeight, fl, item);
                break;
              case 'kampus_kos':
              case 'pendidikan':
                layout = this.buildKampusKosLayout(width, length, floorHeight, fl, item);
                break;
              case 'budaya_hotel':
              case 'ibadah_budaya':
                layout = this.buildBudayaHotelLayout(width, length, floorHeight, fl, item);
                break;
              case 'publik_hijau':
              case 'pemerintahan_keamanan':
              case 'kesehatan':
              case 'rekreasi_terbuka':
                layout = this.buildPublikHijauLayout(width, length, floorHeight, fl, item);
                break;
              case 'hunian':
                layout = this.buildHouse2StoryLayout(width, length, floorHeight, fl);
                break;
              case 'industri_logistik':
              case 'transportasi':
              case 'utilitas':
              default:
                layout = this.buildGenericLayout(width, length, floorHeight, fl);
                break;
            }
          } else {
            layout = this.buildGenericLayout(width, length, floorHeight, fl);
          }
          break;
        }
      }

      // Check compliance for each generated room
      for (const room of layout.rooms) {
        const evalResult = roomStandardsRegistry.evaluateRoomCompliance(room);
        room.isCompliant = evalResult.isCompliant;
        room.complianceNote = evalResult.note;
      }

      layouts.push(layout);
    }

    return layouts;
  }

  // =========================================================================
  // 1. RUMAH TIPE 36 (6 x 6 m)
  // Master Bedroom (3x3), Kids Room (3x2.5), Living (3x3.5), Kitchen & Bath
  // =========================================================================
  private static buildHouse36Layout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    // Main central corridor partition (X = 0, along Z)
    walls.push({
      id: 'w_36_mid',
      start: new THREE.Vector2(0, -hl),
      end: new THREE.Vector2(0, hl),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.45, width: 0.9, height: 2.1 }
    });

    // Cross wall splitting bedrooms (left side: X = -hw to 0, Z = 0)
    walls.push({
      id: 'w_36_bed_split',
      start: new THREE.Vector2(-hw, 0),
      end: new THREE.Vector2(0, 0),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.75, width: 0.9, height: 2.1 }
    });

    // Bathroom enclosure wall (right rear: X = 0 to hw, Z = 1.0)
    walls.push({
      id: 'w_36_bath_wall',
      start: new THREE.Vector2(hw - 1.8, 1.0),
      end: new THREE.Vector2(hw, 1.0),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.35, width: 0.75, height: 2.0 }
    });
    walls.push({
      id: 'w_36_bath_side',
      start: new THREE.Vector2(hw - 1.8, 1.0),
      end: new THREE.Vector2(hw - 1.8, hl),
      thickness: 0.15,
      height: h
    });

    // Rooms
    rooms.push({
      id: 'rm_36_liv',
      name: 'Ruang Tamu & Keluarga',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(0, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, 1.0),
        new THREE.Vector2(0, 1.0)
      ],
      areaM2: hw * (hl + 1.0),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw * 0.5, -hl * 0.3),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_36_bed1',
      name: 'Kamar Tidur Utama',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(0, -hl),
        new THREE.Vector2(0, 0),
        new THREE.Vector2(-hw, 0)
      ],
      areaM2: hw * hl,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw * 0.5, -hl * 0.5),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_36_bed2',
      name: 'Kamar Tidur Anak',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, 0),
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: hw * hl,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw * 0.5, hl * 0.5),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_36_bath',
      name: 'Kamar Mandi',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(hw - 1.8, 1.0),
        new THREE.Vector2(hw, 1.0),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(hw - 1.8, hl)
      ],
      areaM2: 1.8 * (hl - 1.0),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw - 0.9, (1.0 + hl) * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // 2. VILLA TROPIS TIPE 54 (6 x 9 m)
  // =========================================================================
  private static buildHouse54Layout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    // Longitudinal spine
    walls.push({
      id: 'w_54_spine',
      start: new THREE.Vector2(0, -hl + 1.8),
      end: new THREE.Vector2(0, hl),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.3, width: 0.9, height: 2.1 }
    });

    // Bedroom 1 split (left front)
    walls.push({
      id: 'w_54_bed1',
      start: new THREE.Vector2(-hw, -1.0),
      end: new THREE.Vector2(0, -1.0),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.7, width: 0.9, height: 2.1 }
    });

    // Bedroom 2 split (left rear)
    walls.push({
      id: 'w_54_bed2',
      start: new THREE.Vector2(-hw, 2.0),
      end: new THREE.Vector2(0, 2.0),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.7, width: 0.9, height: 2.1 }
    });

    // Kitchen / Bath boundary (right side)
    walls.push({
      id: 'w_54_kitchen',
      start: new THREE.Vector2(0, 1.5),
      end: new THREE.Vector2(hw, 1.5),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.9, height: 2.1 }
    });

    // Rooms
    rooms.push({
      id: 'rm_54_living',
      name: 'Ruang Tamu & Lanai',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(0, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, 1.5),
        new THREE.Vector2(0, 1.5)
      ],
      areaM2: hw * (hl + 1.5),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw * 0.5, -hl * 0.3),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_54_bed_master',
      name: 'Kamar Tidur Utama',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(0, -hl),
        new THREE.Vector2(0, -1.0),
        new THREE.Vector2(-hw, -1.0)
      ],
      areaM2: hw * (hl - 1.0),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw * 0.5, (-hl - 1.0) * 0.5),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_54_kitchen',
      name: 'Dapur & Ruang Makan',
      type: 'kitchen',
      floorIndex,
      boundary: [
        new THREE.Vector2(0, 1.5),
        new THREE.Vector2(hw, 1.5),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(0, hl)
      ],
      areaM2: hw * (hl - 1.5),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw * 0.5, (1.5 + hl) * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // 3. VILLA TROPIS 2 LANTAI (7 x 9 m) DENGAN TANGGA & VOID
  // =========================================================================
  private static buildHouse2StoryLayout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];
    const stairs: InteriorStair[] = [];
    const voids: FloorVoid[] = [];

    // Staircase (runs along left center)
    stairs.push({
      id: `stair_${floorIndex}`,
      position: new THREE.Vector2(-hw + 0.8, -0.5),
      rotation: 0,
      width: 0.95,
      totalHeight: h,
      riserCount: 18
    });

    if (floorIndex === 0) {
      // Ground Floor
      walls.push({
        id: 'w_2fl_g_mid',
        start: new THREE.Vector2(-0.5, -hl),
        end: new THREE.Vector2(-0.5, hl),
        thickness: 0.15,
        height: h,
        doorOpening: { positionRatio: 0.5, width: 0.9, height: 2.1 }
      });

      rooms.push({
        id: 'rm_2fl_g_liv',
        name: 'Ruang Tamu & Keluarga',
        type: 'living_room',
        floorIndex,
        boundary: [
          new THREE.Vector2(-0.5, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, 1.0),
          new THREE.Vector2(-0.5, 1.0)
        ],
        areaM2: (hw + 0.5) * (hl + 1.0),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(hw * 0.4, -hl * 0.3),
        isCompliant: true
      });

      rooms.push({
        id: 'rm_2fl_g_kitchen',
        name: 'Dapur & Dining',
        type: 'kitchen',
        floorIndex,
        boundary: [
          new THREE.Vector2(-0.5, 1.0),
          new THREE.Vector2(hw, 1.0),
          new THREE.Vector2(hw, hl),
          new THREE.Vector2(-0.5, hl)
        ],
        areaM2: (hw + 0.5) * (hl - 1.0),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(hw * 0.4, (1.0 + hl) * 0.5),
        isCompliant: true
      });
    } else {
      // 2nd Floor with Void above Staircase
      voids.push({
        id: 'void_stair_2fl',
        polygon: [
          new THREE.Vector2(-hw + 0.5, -1.8),
          new THREE.Vector2(-hw + 1.8, -1.8),
          new THREE.Vector2(-hw + 1.8, 1.0),
          new THREE.Vector2(-hw + 0.5, 1.0)
        ]
      });

      rooms.push({
        id: 'rm_2fl_suite',
        name: 'Kamar Tidur Utama (Suite)',
        type: 'bedroom',
        floorIndex,
        boundary: [
          new THREE.Vector2(0, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, hl),
          new THREE.Vector2(0, hl)
        ],
        areaM2: hw * (hl * 2),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(hw * 0.5, 0),
        isCompliant: true
      });

      rooms.push({
        id: 'rm_2fl_lounge',
        name: 'Ruang Santai Atas',
        type: 'living_room',
        floorIndex,
        boundary: [
          new THREE.Vector2(-hw, 1.0),
          new THREE.Vector2(0, 1.0),
          new THREE.Vector2(0, hl),
          new THREE.Vector2(-hw, hl)
        ],
        areaM2: hw * (hl - 1.0),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(-hw * 0.5, (1.0 + hl) * 0.5),
        isCompliant: true
      });
    }

    return { floorIndex, walls, stairs, voids, rooms };
  }

  // =========================================================================
  // 4. JOGLO TRADISIONAL JAWA (10 x 12 m)
  // Pendopo Depan, Peringgitan, Senthong Tengah, Senthong Kiwo, Senthong Tengen
  // =========================================================================
  private static buildJogloLayout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    // Omah Dalem dividing wall separating front open Pendopo from inner sanctum
    walls.push({
      id: 'w_joglo_dalem_front',
      start: new THREE.Vector2(-hw, 0),
      end: new THREE.Vector2(hw, 0),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 1.2, height: 2.2 }
    });

    // Three rear chambers (Senthong)
    const senthongZ = hl - 2.5;
    walls.push({
      id: 'w_joglo_senthong_front',
      start: new THREE.Vector2(-hw, senthongZ),
      end: new THREE.Vector2(hw, senthongZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 1.0, height: 2.1 }
    });

    walls.push({
      id: 'w_joglo_senthong_div1',
      start: new THREE.Vector2(-1.5, senthongZ),
      end: new THREE.Vector2(-1.5, hl),
      thickness: 0.15,
      height: h
    });

    walls.push({
      id: 'w_joglo_senthong_div2',
      start: new THREE.Vector2(1.5, senthongZ),
      end: new THREE.Vector2(1.5, hl),
      thickness: 0.15,
      height: h
    });

    rooms.push({
      id: 'rm_joglo_pendopo',
      name: 'Pendopo Terbuka',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, 0),
        new THREE.Vector2(-hw, 0)
      ],
      areaM2: w * hl,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, -hl * 0.5),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_joglo_dalem',
      name: 'Omah Dalem',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, 0),
        new THREE.Vector2(hw, 0),
        new THREE.Vector2(hw, senthongZ),
        new THREE.Vector2(-hw, senthongZ)
      ],
      areaM2: w * senthongZ,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, senthongZ * 0.5),
      isCompliant: true
    });

    rooms.push({
      id: 'rm_joglo_senthong_mid',
      name: 'Senthong Tengah',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-1.5, senthongZ),
        new THREE.Vector2(1.5, senthongZ),
        new THREE.Vector2(1.5, hl),
        new THREE.Vector2(-1.5, hl)
      ],
      areaM2: 3.0 * (hl - senthongZ),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, (senthongZ + hl) * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // 5. RUKO MODERN (5 x 12 m, 3 Lantai)
  // =========================================================================
  private static buildRukoLayout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];
    const stairs: InteriorStair[] = [];

    // Rear stairs
    stairs.push({
      id: `ruko_stair_${floorIndex}`,
      position: new THREE.Vector2(-hw + 0.6, hl - 2.5),
      rotation: 0,
      width: 0.9,
      totalHeight: h,
      riserCount: 18
    });

    // Rear toilet partition
    walls.push({
      id: `ruko_wc_${floorIndex}`,
      start: new THREE.Vector2(hw - 1.8, hl - 2.2),
      end: new THREE.Vector2(hw, hl - 2.2),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.75, height: 2.0 }
    });

    if (floorIndex === 0) {
      rooms.push({
        id: 'rm_ruko_toko',
        name: 'Ruang Usaha / Toko',
        type: 'living_room',
        floorIndex,
        boundary: [
          new THREE.Vector2(-hw, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, hl - 2.2),
          new THREE.Vector2(-hw, hl - 2.2)
        ],
        areaM2: w * (l - 2.2),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(0, -1.0),
        isCompliant: true
      });
    } else {
      rooms.push({
        id: `rm_ruko_office_${floorIndex}`,
        name: `Ruang Kerja / Kantor Lt.${floorIndex + 1}`,
        type: 'living_room',
        floorIndex,
        boundary: [
          new THREE.Vector2(-hw, -hl),
          new THREE.Vector2(hw, -hl),
          new THREE.Vector2(hw, hl - 2.2),
          new THREE.Vector2(-hw, hl - 2.2)
        ],
        areaM2: w * (l - 2.2),
        ceilingHeight: h,
        labelPosition: new THREE.Vector2(0, -1.0),
        isCompliant: true
      });
    }

    rooms.push({
      id: `rm_ruko_bath_${floorIndex}`,
      name: 'Toilet',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(hw - 1.8, hl - 2.2),
        new THREE.Vector2(hw, hl - 2.2),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(hw - 1.8, hl)
      ],
      areaM2: 1.8 * 2.2,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw - 0.9, hl - 1.1),
      isCompliant: true
    });

    return { floorIndex, walls, stairs, rooms };
  }

  // =========================================================================
  // Generic Fallback Layout
  // =========================================================================
  private static buildGenericLayout(w: number, l: number, h: number, floorIndex: number): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    // Simple single open plan room with bathroom corner
    walls.push({
      id: `gen_wc_${floorIndex}`,
      start: new THREE.Vector2(hw - 1.8, hl - 1.8),
      end: new THREE.Vector2(hw, hl - 1.8),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.8, height: 2.0 }
    });

    rooms.push({
      id: `gen_hall_${floorIndex}`,
      name: `Ruang Utama Lt.${floorIndex + 1}`,
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: w * l - 3.24,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, 0),
      isCompliant: true
    });

    rooms.push({
      id: `gen_bath_${floorIndex}`,
      name: 'Kamar Mandi',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(hw - 1.8, hl - 1.8),
        new THREE.Vector2(hw, hl - 1.8),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(hw - 1.8, hl)
      ],
      areaM2: 1.8 * 1.8,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw - 0.9, hl - 0.9),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // Adaptive Category Layout 1: KULINER & KAFE
  // Area Duduk Utama (Main Dining), Coffee Bar / Dapur, Area Teras Outdoor, Toilet
  // =========================================================================
  private static buildKulinerKafeLayout(
    w: number,
    l: number,
    h: number,
    floorIndex: number,
    item: BuildingCatalogItem
  ): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    const terD = Math.max(2.0, Math.min(3.2, l * 0.22));
    const terZ = hl - terD;

    const wcW = Math.max(1.8, Math.min(2.4, w * 0.25));
    const wcD = Math.max(1.8, Math.min(2.4, (l - terD) * 0.25));
    const wcX = -hw + wcW;
    const wcZ = -hl + wcD;

    const barW = Math.max(2.5, Math.min(4.5, w * 0.38));
    const barD = Math.max(2.5, Math.min(4.0, (l - terD) * 0.35));
    const barX = hw - barW;
    const barZ = -hl + barD;

    // Walls for Toilet
    walls.push({
      id: `kafe_wc_w_${floorIndex}`,
      start: new THREE.Vector2(-hw, wcZ),
      end: new THREE.Vector2(wcX, wcZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.75, height: 2.0 }
    });
    walls.push({
      id: `kafe_wc_s_${floorIndex}`,
      start: new THREE.Vector2(wcX, -hl),
      end: new THREE.Vector2(wcX, wcZ),
      thickness: 0.15,
      height: h
    });

    // Walls for Coffee Bar & Kitchen
    walls.push({
      id: `kafe_bar_w_${floorIndex}`,
      start: new THREE.Vector2(barX, -hl),
      end: new THREE.Vector2(barX, barZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.85, height: 2.0 }
    });
    walls.push({
      id: `kafe_bar_s_${floorIndex}`,
      start: new THREE.Vector2(barX, barZ),
      end: new THREE.Vector2(hw, barZ),
      thickness: 0.15,
      height: h
    });

    // Partition between indoor and outdoor terrace
    walls.push({
      id: `kafe_ter_w_${floorIndex}`,
      start: new THREE.Vector2(-hw, terZ),
      end: new THREE.Vector2(hw, terZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 1.8, height: 2.2 }
    });

    // 1. Teras Outdoor
    rooms.push({
      id: `kafe_ter_${floorIndex}`,
      name: 'Area Teras Outdoor',
      type: 'terrace',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, terZ),
        new THREE.Vector2(hw, terZ),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: w * terD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, terZ + terD * 0.5),
      isCompliant: true
    });

    // 2. Toilet
    rooms.push({
      id: `kafe_wc_${floorIndex}`,
      name: 'Toilet',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(wcX, -hl),
        new THREE.Vector2(wcX, wcZ),
        new THREE.Vector2(-hw, wcZ)
      ],
      areaM2: wcW * wcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw + wcW * 0.5, -hl + wcD * 0.5),
      isCompliant: true
    });

    // 3. Coffee Bar / Dapur
    rooms.push({
      id: `kafe_bar_${floorIndex}`,
      name: 'Coffee Bar & Dapur',
      type: 'kitchen',
      floorIndex,
      boundary: [
        new THREE.Vector2(barX, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, barZ),
        new THREE.Vector2(barX, barZ)
      ],
      areaM2: barW * barD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(barX + barW * 0.5, -hl + barD * 0.5),
      isCompliant: true
    });

    // 4. Area Duduk Utama (Main Dining)
    const diningArea = Math.max(12.0, w * (l - terD) - wcW * wcD - barW * barD);
    rooms.push({
      id: `kafe_dining_${floorIndex}`,
      name: 'Area Duduk Utama (Main Dining)',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, wcZ),
        new THREE.Vector2(hw, barZ),
        new THREE.Vector2(hw, terZ),
        new THREE.Vector2(-hw, terZ)
      ],
      areaM2: diningArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, (wcZ + terZ) * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // Adaptive Category Layout 2: MALL & RITEL
  // Atrium Utama / Koridor, Unit Ritel Utama, Gudang, Toilet Publik
  // =========================================================================
  private static buildMallRitelLayout(
    w: number,
    l: number,
    h: number,
    floorIndex: number,
    item: BuildingCatalogItem
  ): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    const svcW = Math.max(2.5, Math.min(6.0, w * 0.28));
    const svcD = Math.max(2.5, Math.min(6.0, l * 0.28));
    const svcX = hw - svcW;
    const svcZ = -hl + svcD;

    const wcW = Math.max(2.0, Math.min(3.5, w * 0.22));
    const wcD = Math.max(2.0, Math.min(3.5, l * 0.22));
    const wcX = -hw + wcW;
    const wcZ = -hl + wcD;

    const corW = Math.max(2.2, Math.min(6.0, w * 0.32));
    const corHalfW = corW * 0.5;

    // Walls for Gudang
    walls.push({
      id: `mall_gudang_w_${floorIndex}`,
      start: new THREE.Vector2(svcX, -hl),
      end: new THREE.Vector2(svcX, svcZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 1.0, height: 2.1 }
    });
    walls.push({
      id: `mall_gudang_s_${floorIndex}`,
      start: new THREE.Vector2(svcX, svcZ),
      end: new THREE.Vector2(hw, svcZ),
      thickness: 0.15,
      height: h
    });

    // Walls for Toilet Publik
    walls.push({
      id: `mall_wc_w_${floorIndex}`,
      start: new THREE.Vector2(-hw, wcZ),
      end: new THREE.Vector2(wcX, wcZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.9, height: 2.1 }
    });
    walls.push({
      id: `mall_wc_s_${floorIndex}`,
      start: new THREE.Vector2(wcX, -hl),
      end: new THREE.Vector2(wcX, wcZ),
      thickness: 0.15,
      height: h
    });

    // 1. Gudang & Bongkar Muat
    rooms.push({
      id: `mall_svc_${floorIndex}`,
      name: 'Gudang & Bongkar Muat',
      type: 'service_area',
      floorIndex,
      boundary: [
        new THREE.Vector2(svcX, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, svcZ),
        new THREE.Vector2(svcX, svcZ)
      ],
      areaM2: svcW * svcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(svcX + svcW * 0.5, -hl + svcD * 0.5),
      isCompliant: true
    });

    // 2. Toilet Publik
    rooms.push({
      id: `mall_wc_${floorIndex}`,
      name: 'Toilet Publik',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(wcX, -hl),
        new THREE.Vector2(wcX, wcZ),
        new THREE.Vector2(-hw, wcZ)
      ],
      areaM2: wcW * wcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw + wcW * 0.5, -hl + wcD * 0.5),
      isCompliant: true
    });

    // 3. Atrium Utama & Koridor
    rooms.push({
      id: `mall_atrium_${floorIndex}`,
      name: 'Atrium Utama & Koridor',
      type: 'corridor',
      floorIndex,
      boundary: [
        new THREE.Vector2(-corHalfW, -hl),
        new THREE.Vector2(corHalfW, -hl),
        new THREE.Vector2(corHalfW, hl),
        new THREE.Vector2(-corHalfW, hl)
      ],
      areaM2: corW * l,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, 0),
      isCompliant: true
    });

    // 4. Unit Ritel Utama
    const ritelArea = Math.max(15.0, w * l - svcW * svcD - wcW * wcD - corW * l);
    rooms.push({
      id: `mall_ritel_${floorIndex}`,
      name: 'Unit Ritel Utama',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, wcZ),
        new THREE.Vector2(-corHalfW, wcZ),
        new THREE.Vector2(-corHalfW, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: ritelArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2((-hw - corHalfW) * 0.5, 0),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // Adaptive Category Layout 3: KAMPUS & KOS
  // Koridor Ventilasi, Unit Kamar Kos / Studio, Area Komunal, Kamar Mandi
  // =========================================================================
  private static buildKampusKosLayout(
    w: number,
    l: number,
    h: number,
    floorIndex: number,
    item: BuildingCatalogItem
  ): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    const corW = Math.max(1.4, Math.min(2.4, w * 0.18));
    const corHalfW = corW * 0.5;

    const komD = Math.max(3.0, Math.min(6.0, l * 0.3));
    const komZ = hl - komD;

    const bathW = Math.max(1.8, Math.min(2.5, w * 0.25));
    const bathD = Math.max(1.8, Math.min(2.5, (l - komD) * 0.25));
    const bathX = -hw + bathW;
    const bathZ = -hl + bathD;

    // Corridor Partition Walls
    walls.push({
      id: `kos_cor_left_${floorIndex}`,
      start: new THREE.Vector2(-corHalfW, -hl),
      end: new THREE.Vector2(-corHalfW, komZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.3, width: 0.9, height: 2.1 }
    });
    walls.push({
      id: `kos_cor_right_${floorIndex}`,
      start: new THREE.Vector2(corHalfW, -hl),
      end: new THREE.Vector2(corHalfW, komZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.6, width: 0.9, height: 2.1 }
    });

    // 1. Koridor Ventilasi
    rooms.push({
      id: `kos_cor_${floorIndex}`,
      name: 'Koridor Ventilasi',
      type: 'corridor',
      floorIndex,
      boundary: [
        new THREE.Vector2(-corHalfW, -hl),
        new THREE.Vector2(corHalfW, -hl),
        new THREE.Vector2(corHalfW, komZ),
        new THREE.Vector2(-corHalfW, komZ)
      ],
      areaM2: corW * (l - komD),
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, (-hl + komZ) * 0.5),
      isCompliant: true
    });

    // 2. Kamar Mandi
    rooms.push({
      id: `kos_bath_${floorIndex}`,
      name: 'Kamar Mandi',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(bathX, -hl),
        new THREE.Vector2(bathX, bathZ),
        new THREE.Vector2(-hw, bathZ)
      ],
      areaM2: bathW * bathD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw + bathW * 0.5, -hl + bathD * 0.5),
      isCompliant: true
    });

    // 3. Unit Kamar Kos / Ruang Studio
    const unitArea = Math.max(9.0, (hw - corHalfW) * (l - komD) * 0.9);
    rooms.push({
      id: `kos_unit_${floorIndex}`,
      name: 'Unit Kamar Kos / Ruang Studio',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(corHalfW, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, komZ),
        new THREE.Vector2(corHalfW, komZ)
      ],
      areaM2: unitArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2((corHalfW + hw) * 0.5, (-hl + komZ) * 0.5),
      isCompliant: true
    });

    // 4. Area Komunal Mahasiswa
    rooms.push({
      id: `kos_komunal_${floorIndex}`,
      name: 'Area Komunal Mahasiswa',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, komZ),
        new THREE.Vector2(hw, komZ),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: w * komD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, komZ + komD * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // Adaptive Category Layout 4: BUDAYA & HOTEL
  // Lobi & Ruang Budaya, Unit Kamar / Studio Kriya, Teras & Courtyard, Toilet
  // =========================================================================
  private static buildBudayaHotelLayout(
    w: number,
    l: number,
    h: number,
    floorIndex: number,
    item: BuildingCatalogItem
  ): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    const terD = Math.max(2.0, Math.min(3.5, l * 0.22));
    const terZ = hl - terD;

    const wcW = Math.max(1.8, Math.min(2.5, w * 0.22));
    const wcD = Math.max(1.8, Math.min(2.5, (l - terD) * 0.25));
    const wcX = -hw + wcW;
    const wcZ = -hl + wcD;

    const splitX = 0;

    // Central dividing wall between Suite/Studio and Lobby
    walls.push({
      id: `budaya_mid_${floorIndex}`,
      start: new THREE.Vector2(splitX, -hl),
      end: new THREE.Vector2(splitX, terZ),
      thickness: 0.15,
      height: h,
      doorOpening: { positionRatio: 0.5, width: 0.9, height: 2.1 }
    });

    // 1. Teras & Courtyard
    rooms.push({
      id: `budaya_ter_${floorIndex}`,
      name: 'Teras & Courtyard',
      type: 'terrace',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, terZ),
        new THREE.Vector2(hw, terZ),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: w * terD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, terZ + terD * 0.5),
      isCompliant: true
    });

    // 2. Toilet & Sanitasi
    rooms.push({
      id: `budaya_wc_${floorIndex}`,
      name: 'Toilet & Sanitasi',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(wcX, -hl),
        new THREE.Vector2(wcX, wcZ),
        new THREE.Vector2(-hw, wcZ)
      ],
      areaM2: wcW * wcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw + wcW * 0.5, -hl + wcD * 0.5),
      isCompliant: true
    });

    // 3. Unit Kamar / Studio Kriya
    const studioArea = Math.max(10.0, hw * (l - terD) - wcW * wcD);
    rooms.push({
      id: `budaya_studio_${floorIndex}`,
      name: 'Unit Kamar / Studio Kriya',
      type: 'bedroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, wcZ),
        new THREE.Vector2(splitX, wcZ),
        new THREE.Vector2(splitX, terZ),
        new THREE.Vector2(-hw, terZ)
      ],
      areaM2: studioArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw * 0.5, 0),
      isCompliant: true
    });

    // 4. Lobi & Ruang Budaya
    const lobbyArea = Math.max(14.0, hw * (l - terD));
    rooms.push({
      id: `budaya_lobby_${floorIndex}`,
      name: 'Lobi & Ruang Budaya',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(splitX, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, terZ),
        new THREE.Vector2(splitX, terZ)
      ],
      areaM2: lobbyArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(hw * 0.5, 0),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }

  // =========================================================================
  // Adaptive Category Layout 5: PUBLIK & HIJAU
  // Ruang Layanan Publik, Peron & Sirkulasi, Ruang Petugas / Servis, Toilet
  // =========================================================================
  private static buildPublikHijauLayout(
    w: number,
    l: number,
    h: number,
    floorIndex: number,
    item: BuildingCatalogItem
  ): InteriorLayout {
    const hw = w * 0.5;
    const hl = l * 0.5;
    const walls: InteriorWall[] = [];
    const rooms: RoomDefinition[] = [];

    const peronD = Math.max(1.8, Math.min(3.5, l * 0.22));
    const peronZ = hl - peronD;

    const wcW = Math.max(1.8, Math.min(2.5, w * 0.22));
    const wcD = Math.max(1.8, Math.min(2.5, (l - peronD) * 0.25));
    const wcX = -hw + wcW;
    const wcZ = -hl + wcD;

    const svcW = Math.max(2.2, Math.min(3.5, w * 0.28));
    const svcD = Math.max(2.0, Math.min(3.5, (l - peronD) * 0.28));
    const svcX = hw - svcW;
    const svcZ = -hl + svcD;

    // 1. Peron & Sirkulasi
    rooms.push({
      id: `publik_peron_${floorIndex}`,
      name: 'Peron & Sirkulasi',
      type: 'corridor',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, peronZ),
        new THREE.Vector2(hw, peronZ),
        new THREE.Vector2(hw, hl),
        new THREE.Vector2(-hw, hl)
      ],
      areaM2: w * peronD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, peronZ + peronD * 0.5),
      isCompliant: true
    });

    // 2. Toilet Publik
    rooms.push({
      id: `publik_wc_${floorIndex}`,
      name: 'Toilet Publik',
      type: 'bathroom',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, -hl),
        new THREE.Vector2(wcX, -hl),
        new THREE.Vector2(wcX, wcZ),
        new THREE.Vector2(-hw, wcZ)
      ],
      areaM2: wcW * wcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(-hw + wcW * 0.5, -hl + wcD * 0.5),
      isCompliant: true
    });

    // 3. Ruang Petugas / Servis
    rooms.push({
      id: `publik_svc_${floorIndex}`,
      name: 'Ruang Petugas / Servis',
      type: 'service_area',
      floorIndex,
      boundary: [
        new THREE.Vector2(svcX, -hl),
        new THREE.Vector2(hw, -hl),
        new THREE.Vector2(hw, svcZ),
        new THREE.Vector2(svcX, svcZ)
      ],
      areaM2: svcW * svcD,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(svcX + svcW * 0.5, -hl + svcD * 0.5),
      isCompliant: true
    });

    // 4. Ruang Layanan Publik
    const hallArea = Math.max(12.0, w * (l - peronD) - wcW * wcD - svcW * svcD);
    rooms.push({
      id: `publik_hall_${floorIndex}`,
      name: 'Ruang Layanan Publik',
      type: 'living_room',
      floorIndex,
      boundary: [
        new THREE.Vector2(-hw, wcZ),
        new THREE.Vector2(hw, svcZ),
        new THREE.Vector2(hw, peronZ),
        new THREE.Vector2(-hw, peronZ)
      ],
      areaM2: hallArea,
      ceilingHeight: h,
      labelPosition: new THREE.Vector2(0, (wcZ + peronZ) * 0.5),
      isCompliant: true
    });

    return { floorIndex, walls, rooms };
  }
}

