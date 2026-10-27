import * as THREE from 'three';

export type RiverType = 'small_canal' | 'urban_river' | 'wide_river';

export interface RiverProfile {
  id: RiverType;
  name: string;
  width: number;
  depth: number;
  waterLevelY: number; // default -0.15
  bankStyle: 'urban_candi' | 'natural_boulder' | 'adaptive';
  coolingRadius: number; // microclimate cooling impact in meters
  coolingDeltaC: number; // temperature reduction in Celsius
}

export const RIVER_PROFILES: Record<RiverType, RiverProfile> = {
  small_canal: {
    id: 'small_canal',
    name: 'Kanal Selokan Mataram',
    width: 6.0,
    depth: 1.4,
    waterLevelY: -0.20,
    bankStyle: 'urban_candi',
    coolingRadius: 18.0,
    coolingDeltaC: 1.5,
  },
  urban_river: {
    id: 'urban_river',
    name: 'Sungai Kota / Kali Code',
    width: 14.0,
    depth: 2.2,
    waterLevelY: -0.25,
    bankStyle: 'adaptive',
    coolingRadius: 36.0,
    coolingDeltaC: 2.4,
  },
  wide_river: {
    id: 'wide_river',
    name: 'Sungai Lebar Tropis',
    width: 26.0,
    depth: 3.2,
    waterLevelY: -0.30,
    bankStyle: 'natural_boulder',
    coolingRadius: 55.0,
    coolingDeltaC: 3.2,
  },
};

export interface RiverNode {
  id: string;
  position: THREE.Vector3;
}

export interface RiverSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  type: RiverType;
  controlPoints: THREE.Vector3[];
  length: number;
  carveData?: { indices: number[]; oldHeights: number[] };
}
