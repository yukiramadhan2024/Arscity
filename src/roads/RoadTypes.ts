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
    width: 4.5,
    laneCount: 1,
    sidewalkWidth: 0.5,
    curbHeight: 0.1,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 25,
    hasTrees: false,
    treeSpacing: 0,
    speedLimit: 15,
    description: 'Jalan akses lingkungan permukiman dengan paving kompak.'
  },
  local: {
    type: 'local',
    name: 'Jalan Lokal',
    width: 9.0,
    laneCount: 2,
    sidewalkWidth: 1.5,
    curbHeight: 0.15,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 20,
    hasTrees: false,
    treeSpacing: 0,
    speedLimit: 30,
    description: 'Jalan penghubung antar-lingkungan perumahan dengan trotoar lega 1.5m.'
  },
  collector: {
    type: 'collector',
    name: 'Jalan Kolektor',
    width: 16.0,
    laneCount: 2,
    sidewalkWidth: 2.5,
    curbHeight: 0.2,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 22,
    hasTrees: true,
    treeSpacing: 18,
    speedLimit: 40,
    description: 'Jalan pengumpul utama kawasan dengan trotoar pedestrian 2.5m dan deretan pohon peneduh.'
  },
  arterial: {
    type: 'arterial',
    name: 'Jalan Arteri & Boulevard',
    width: 26.0,
    laneCount: 4,
    sidewalkWidth: 5.5,
    curbHeight: 0.2,
    hasMedian: true,
    medianWidth: 2.5,
    hasStreetLights: true,
    lightSpacing: 25,
    hasTrees: true,
    treeSpacing: 16,
    speedLimit: 60,
    description: 'Boulevard raya utama kota dengan trotoar pejalan kaki megah 5.5m, jalur pemandu, median tengah, dan penerangan ganda.'
  },
  pedestrian: {
    type: 'pedestrian',
    name: 'Jalur Pejalan Kaki',
    width: 6.0,
    laneCount: 0,
    sidewalkWidth: 3.0,
    curbHeight: 0.08,
    hasMedian: false,
    medianWidth: 0,
    hasStreetLights: true,
    lightSpacing: 15,
    hasTrees: true,
    treeSpacing: 12,
    speedLimit: 5,
    description: 'Koridor khusus pejalan kaki berpaving dengan lampu taman dan pohon peneduh rindang.'
  },
  cycle: {
    type: 'cycle',
    name: 'Jalur Sepeda',
    width: 3.0,
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
  name?: string;                  // In-world Indonesian road name (e.g. "Jl. Malioboro")
  startNodeId: string;
  endNodeId: string;
  type: RoadType;
  controlPoints: THREE.Vector3[]; // [start, CP1, CP2, end] for cubic Bezier
  length: number;                 // Length in meters
  customProfile?: Partial<RoadProfile>;
  isBridge?: boolean;
}
