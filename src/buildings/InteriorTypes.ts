import * as THREE from 'three';

export type RoomType =
  | 'bedroom'       // Kamar Tidur
  | 'living_room'   // Ruang Keluarga / Tamu
  | 'kitchen'       // Dapur
  | 'bathroom'      // Kamar Mandi / Toilet
  | 'terrace'       // Teras
  | 'corridor'      // Koridor / Sirkulasi
  | 'service_area'; // Area Servis / Cuci

export interface DoorOpening {
  positionRatio: number; // 0.0 to 1.0 along the partition wall
  width: number;         // default 0.9 m
  height: number;        // default 2.1 m
}

export interface InteriorWall {
  id: string;
  start: THREE.Vector2;  // 2D start position in local building coords
  end: THREE.Vector2;    // 2D end position in local building coords
  thickness: number;     // Wall thickness in meters (default 0.15m: 15 cm bata merah plester aci)
  height: number;        // Wall height (matching floor ceiling height)
  doorOpening?: DoorOpening;
}

export interface InteriorStair {
  id: string;
  position: THREE.Vector2; // Base landing coordinate
  rotation: number;        // in radians
  width: number;           // Stair width in meters (default 0.9m)
  totalHeight: number;     // Floor-to-floor height
  riserCount: number;      // e.g. 17 steps (optimum ~18 cm riser)
}

export interface FloorVoid {
  id: string;
  polygon: THREE.Vector2[]; // Cutout boundary on upper floor slab
}

export interface RoomDefinition {
  id: string;
  name: string;
  type: RoomType;
  floorIndex: number;
  boundary: THREE.Vector2[]; // 2D polygon corners
  areaM2: number;
  ceilingHeight: number;
  labelPosition: THREE.Vector2;
  isCompliant: boolean;
  complianceNote?: string;
}

export interface InteriorLayout {
  floorIndex: number;
  walls: InteriorWall[];
  stairs?: InteriorStair[];
  voids?: FloorVoid[];
  rooms: RoomDefinition[];
}
