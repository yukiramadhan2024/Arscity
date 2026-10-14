import * as THREE from 'three';
import { InteriorLayout, InteriorWall, InteriorStair, FloorVoid, RoomDefinition } from './InteriorTypes';
import { roomStandardsRegistry } from './RoomStandards';
import { PolygonMath } from '../core/math/PolygonMath';

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
        default:
          layout = this.buildGenericLayout(width, length, floorHeight, fl);
          break;
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
}
