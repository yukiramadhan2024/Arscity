import * as THREE from 'three';
import { RoofType, WallMaterialType, RoofMaterialType } from './PrefabTypes';

export type OpeningType =
  | 'window_single'
  | 'window_double'
  | 'window_jalusi'
  | 'door_single'
  | 'door_double'
  | 'balcony';

export interface WallOpening {
  id: string;
  type: OpeningType;
  positionRatio: number; // 0.0 to 1.0 along the wall segment
  width: number;         // Opening width in meters
  height: number;        // Opening height in meters
  sillHeight: number;    // Height above floor level (0 for door)
}

export interface WallSegment {
  wallIndex: number;
  openings: WallOpening[];
}

export interface FloorDefinition {
  floorIndex: number;
  footprint: THREE.Vector2[]; // 2D polygon vertices in local building coordinates
  height: number;            // Floor height in meters (default 3.0m)
  walls: WallSegment[];
}

export interface RoofDefinition {
  type: RoofType | 'shed';
  pitchAngle: number;        // in degrees (default 30 deg for tropical roofs)
  overhang: number;          // Overhang / teritis in meters (default 1.2m)
  material: RoofMaterialType;
}

export interface CustomBuilding {
  id: string;
  name: string;
  position: THREE.Vector3;
  rotationY: number;
  plinthHeight: number;
  floors: FloorDefinition[];
  roof: RoofDefinition;
  wallMaterial: WallMaterialType;
  wallColor: string;
  isBlueprint?: boolean;
}
