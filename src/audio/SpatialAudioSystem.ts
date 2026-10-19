import * as THREE from 'three';
import { proceduralAudio } from './ProceduralAudio';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoadManager } from '../roads/RoadManager';
import { LandscapeManager } from '../world/LandscapeManager';
import { WeatherType } from '../world/WeatherSystem';

export interface SpatialAudioZone {
  id: string;
  type: 'road' | 'cafe' | 'park';
  position: THREE.Vector3;
  radius: number;
}

export class SpatialAudioSystem {
  private static instance: SpatialAudioSystem;
  public enabled: boolean = true;
  public zones: SpatialAudioZone[] = [];

  // Active audio gain nodes for zones
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;

  // Sound source nodes
  private roadGain: GainNode | null = null;
  private cafeGain: GainNode | null = null;
  private parkGain: GainNode | null = null;

  // Noise generators
  private roadNoiseNode: AudioBufferSourceNode | null = null;
  private cafeNoiseNode: AudioBufferSourceNode | null = null;
  private parkNoiseNode: AudioBufferSourceNode | null = null;

  private isRunning: boolean = false;
  private lastPlayerPos: THREE.Vector3 = new THREE.Vector3();
  public isUnderRoof: boolean = false;

  public static getInstance(): SpatialAudioSystem {
    if (!this.instance) {
      this.instance = new SpatialAudioSystem();
    }
    return this.instance;
  }

  private initAudioNodes(): void {
    if (this.ctx || typeof window === 'undefined') return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    this.ctx = new AudioCtx();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // Master bus
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);

    // Rain / Indoor acoustic damping filter
    this.lowpassFilter = this.ctx.createBiquadFilter();
    this.lowpassFilter.type = 'lowpass';
    this.lowpassFilter.frequency.setValueAtTime(20000, this.ctx.currentTime); // Default full frequency

    this.lowpassFilter.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Setup 3 procedural ambient channels
    this.roadGain = this.ctx.createGain();
    this.roadGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.roadGain.connect(this.lowpassFilter);

    this.cafeGain = this.ctx.createGain();
    this.cafeGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.cafeGain.connect(this.lowpassFilter);

    this.parkGain = this.ctx.createGain();
    this.parkGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
    this.parkGain.connect(this.lowpassFilter);

    this.startProceduralLoops();
  }

  private startProceduralLoops(): void {
    if (!this.ctx || !this.roadGain || !this.cafeGain || !this.parkGain) return;

    // 1. Road hum noise (brown/pink low frequency rumble)
    const bufferSize = this.ctx.sampleRate * 2;
    const roadBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const roadData = roadBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      roadData[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = roadData[i];
      roadData[i] *= 1.5; // Gain boost
    }
    this.roadNoiseNode = this.ctx.createBufferSource();
    this.roadNoiseNode.buffer = roadBuffer;
    this.roadNoiseNode.loop = true;
    this.roadNoiseNode.connect(this.roadGain);
    this.roadNoiseNode.start();

    // 2. Cafe murmur / clatter noise (bandpass filtered high texture)
    const cafeBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const cafeData = cafeBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      cafeData[i] = (Math.random() * 2 - 1) * 0.1;
    }
    const cafeFilter = this.ctx.createBiquadFilter();
    cafeFilter.type = 'bandpass';
    cafeFilter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    cafeFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

    this.cafeNoiseNode = this.ctx.createBufferSource();
    this.cafeNoiseNode.buffer = cafeBuffer;
    this.cafeNoiseNode.loop = true;
    this.cafeNoiseNode.connect(cafeFilter);
    cafeFilter.connect(this.cafeGain);
    this.cafeNoiseNode.start();

    // 3. Park leaves & breeze (high-shelf smoothed pink noise)
    const parkBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const parkData = parkBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      parkData[i] = (b0 + b1 + b2) * 0.15;
    }
    const parkFilter = this.ctx.createBiquadFilter();
    parkFilter.type = 'highpass';
    parkFilter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    this.parkNoiseNode = this.ctx.createBufferSource();
    this.parkNoiseNode.buffer = parkBuffer;
    this.parkNoiseNode.loop = true;
    this.parkNoiseNode.connect(parkFilter);
    parkFilter.connect(this.parkGain);
    this.parkNoiseNode.start();
  }

  /**
   * Rebuilds spatial sound zones from the current city objects (buildings, roads, trees)
   */
  public rebuildZones(
    buildingManager: BuildingManager,
    roadManager: RoadManager,
    landscapeManager: LandscapeManager
  ): void {
    this.zones = [];

    // 1. Road zones
    for (const edge of roadManager.graph.edges.values()) {
      const startNode = roadManager.graph.nodes.get(edge.startNodeId);
      const endNode = roadManager.graph.nodes.get(edge.endNodeId);
      if (startNode && endNode) {
        const midPos = new THREE.Vector3(
          (startNode.position.x + endNode.position.x) / 2,
          0,
          (startNode.position.z + endNode.position.z) / 2
        );
        this.zones.push({
          id: `road_${edge.id}`,
          type: 'road',
          position: midPos,
          radius: Math.max(15, (edge.length || 30) / 2)
        });
      }
    }

    // 2. Cafe & Resto zones
    for (const bld of buildingManager.buildings.values()) {
      const key = bld.presetKey || '';
      if (
        key.includes('cafe') ||
        key.includes('resto') ||
        key.includes('warmindo') ||
        key.includes('angkringan') ||
        key.includes('gelato') ||
        key.includes('burger')
      ) {
        this.zones.push({
          id: `cafe_${bld.id}`,
          type: 'cafe',
          position: bld.position.clone(),
          radius: 20
        });
      }
    }

    // 3. Park & Green zones
    for (const item of landscapeManager.items.values()) {
      if (item.type === 'shade_tree' || item.type === 'grass_garden') {
        this.zones.push({
          id: `park_${item.id}`,
          type: 'park',
          position: item.position.clone(),
          radius: 16
        });
      }
    }
  }

  /**
   * Updates positional sound volume based on camera / player distance
   */
  public update(
    cameraPos: THREE.Vector3,
    weather: WeatherType,
    isUnderRoof: boolean = false
  ): void {
    this.lastPlayerPos.copy(cameraPos);
    this.isUnderRoof = isUnderRoof;

    if (!this.enabled || proceduralAudio.isMuted()) {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.05);
      }
      return;
    }

    if (!this.ctx) {
      this.initAudioNodes();
    }

    if (!this.ctx || !this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(0.35, this.ctx.currentTime, 0.05);

    // Calculate nearest zone intensity per category
    let minRoadDist = Infinity;
    let minCafeDist = Infinity;
    let minParkDist = Infinity;

    for (const z of this.zones) {
      const d = cameraPos.distanceTo(z.position);
      if (z.type === 'road') {
        minRoadDist = Math.min(minRoadDist, d);
      } else if (z.type === 'cafe') {
        minCafeDist = Math.min(minCafeDist, d);
      } else if (z.type === 'park') {
        minParkDist = Math.min(minParkDist, d);
      }
    }

    // Attenuation formula: max(0, 1 - dist/radius)
    const roadVolume = Math.max(0.001, Math.min(0.25, (1.0 - Math.min(30, minRoadDist) / 30) * 0.25));
    const cafeVolume = Math.max(0.001, Math.min(0.35, (1.0 - Math.min(22, minCafeDist) / 22) * 0.35));
    const parkVolume = Math.max(0.001, Math.min(0.28, (1.0 - Math.min(20, minParkDist) / 20) * 0.28));

    if (this.roadGain) {
      this.roadGain.gain.setTargetAtTime(roadVolume, this.ctx.currentTime, 0.1);
    }
    if (this.cafeGain) {
      this.cafeGain.gain.setTargetAtTime(cafeVolume, this.ctx.currentTime, 0.1);
    }
    if (this.parkGain) {
      this.parkGain.gain.setTargetAtTime(parkVolume, this.ctx.currentTime, 0.1);
    }

    // Rain lowpass filter when indoor/under roof
    if (this.lowpassFilter) {
      const targetCutoff = isUnderRoof ? 700 : weather === 'rain' ? 3500 : 20000;
      this.lowpassFilter.frequency.setTargetAtTime(targetCutoff, this.ctx.currentTime, 0.15);
    }
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.zones = [];
  }
}

export const spatialAudio = SpatialAudioSystem.getInstance();
