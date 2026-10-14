import * as THREE from 'three';

export type RoadType = 'alley' | 'local' | 'collector' | 'arterial' | 'pedestrian' | 'cycle';

export interface RoadProfile {
  type: RoadType;
  name: string;
  width: number;           // Total road width in meters
  laneCount: number;       // Number of vehicular lanes
  sidewalkWidth: number;   // Sidewalk width on each side in meters (0 if none)
  curbHeight: number;      // Trotoar height in meters (e.g. 0.15m)
  hasMedian: boolean;      // Median strip in the middle
  medianWidth: number;
  hasStreetLights: boolean;
  lightSpacing: number;    // meters between street lights
  hasTrees: boolean;
  treeSpacing: number;     // meters between shade trees
  speedLimit: number;      // km/h
  description: string;
}

export const ROAD_PROFILES: Record<RoadType, RoadProfile> = {
  alley: {
    type: 'alley',
    name: 'Gang Lingkungan',
    width: 3.5,
    laneCount: 1,
    sidewalkWidth: 0,
    curbHeight: 0.1,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 25,
    hasTrees: false,
    treeSpacing: 0,
    speedLimit: 15,
    description: 'Jalan sempit akses rumah warga/kavling padat, kecepatan rendah.'
  },
  local: {
    type: 'local',
    name: 'Jalan Lokal',
    width: 6.0,
    laneCount: 2,
    sidewalkWidth: 0.8,
    curbHeight: 0.15,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 20,
    hasTrees: false,
    treeSpacing: 0,
    speedLimit: 30,
    description: 'Jalan penghubung antar-lingkungan perumahan dengan trotoar kompak.'
  },
  collector: {
    type: 'collector',
    name: 'Jalan Kolektor',
    width: 9.0,
    laneCount: 2,
    sidewalkWidth: 1.5,
    curbHeight: 0.2,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 22,
    hasTrees: true,
    treeSpacing: 18,
    speedLimit: 40,
    description: 'Jalan pengumpul utama kawasan dengan trotoar lega dan pohon peneduh.'
  },
  arterial: {
    type: 'arterial',
    name: 'Jalan Arteri',
    width: 14.0,
    laneCount: 4,
    sidewalkWidth: 2.0,
    curbHeight: 0.2,
    hasMedian: true,
    medianWidth: 1.5,
    hasStreetLights: true,
    lightSpacing: 25,
    hasTrees: true,
    treeSpacing: 16,
    speedLimit: 60,
    description: 'Jalan raya utama kota dengan median tengah, trotoar lebar, dan penerangan tinggi.'
  },
  pedestrian: {
    type: 'pedestrian',
    name: 'Jalur Pejalan Kaki',
    width: 3.0,
    laneCount: 0,
    sidewalkWidth: 1.5,
    curbHeight: 0.08,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 15,
    hasTrees: true,
    treeSpacing: 12,
    speedLimit: 5,
    description: 'Koridor khusus pejalan kaki berpaving dengan lampu taman dan pohon peneduh.'
  },
  cycle: {
    type: 'cycle',
    name: 'Jalur Sepeda',
    width: 2.2,
    laneCount: 1,
    sidewalkWidth: 0,
    curbHeight: 0.1,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 20,
    hasTrees: false,
    treeSpacing: 0,
    speedLimit: 20,
    description: 'Jalur mobilitas mikro dan sepeda ramah lingkungan.'
  }
};

export interface RoadNode {
  id: string;
  position: THREE.Vector3;
  connectedEdgeIds: string[];
}

export interface RoadEdge {
  id: string;
  startNodeId: string;
  endNodeId: string;
  type: RoadType;
  controlPoints: THREE.Vector3[]; // [start, CP1, CP2, end] for cubic Bezier
  length: number;                 // Length in meters
  customProfile?: Partial<RoadProfile>;
}
