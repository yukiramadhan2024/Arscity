import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { calculateSolarPosition } from '../core/math/SolarPosition';

export interface FacadeHeatData {
  buildingId: string;
  northScore: number; // 0 (cold/shaded) to 100 (intense heat)
  southScore: number;
  eastScore: number;  // Typically hot in morning tropics
  westScore: number;  // Typically very hot in afternoon tropics
  overallComfortScore: number; // 0 to 100
  shadowLengthMeters: number;
  shadowDirection: THREE.Vector3;
  recommendations: string[];
}

export class SolarAnalyzer {
  private buildingManager: BuildingManager;
  private scene: THREE.Scene;
  public isHeatmapActive: boolean = false;
  private heatmapOverlayGroup: THREE.Group;

  constructor(buildingManager: BuildingManager, scene: THREE.Scene) {
    this.buildingManager = buildingManager;
    this.scene = scene;
    this.heatmapOverlayGroup = new THREE.Group();
    this.heatmapOverlayGroup.name = 'SolarHeatmapGroup';
    scene.add(this.heatmapOverlayGroup);
  }

  public analyzeBuilding(
    buildingId: string,
    currentHour: number = 14.0,
    dayOfYear: number = 172
  ): FacadeHeatData | null {
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;

    const coords = calculateSolarPosition(currentHour, dayOfYear);
    const bldHeight = bld.floorCount * (bld.floorHeight || 3.2);

    // Ground shadow vector (horizontal projection opposite to sun direction)
    const horizSun = new THREE.Vector3(coords.direction.x, 0, coords.direction.z);
    const horizLen = horizSun.length();
    const shadowDirection = horizLen > 0.001
      ? new THREE.Vector3(-horizSun.x / horizLen, 0, -horizSun.z / horizLen)
      : new THREE.Vector3(0, 0, 0);

    const shadowLengthMeters = (coords.isDaylight && coords.altitude > 0.05)
      ? Math.min(200, bldHeight / Math.tan(coords.altitude))
      : 0;

    // Physical solar radiation per facade based on orientation dot product
    const rot = bld.rotationY;
    const cosR = Math.cos(rot);
    const sinR = Math.sin(rot);

    // World normals for East, West, North, South faces of rotated building
    const normalEast = new THREE.Vector3(cosR, 0, -sinR);
    const normalWest = new THREE.Vector3(-cosR, 0, sinR);
    const normalNorth = new THREE.Vector3(sinR, 0, cosR);
    const normalSouth = new THREE.Vector3(-sinR, 0, -cosR);

    const calcFaceHeat = (normal: THREE.Vector3): number => {
      if (!coords.isDaylight) return 0;
      const dot = Math.max(0, normal.dot(coords.direction));
      return Math.round(dot * coords.intensity * 100);
    };

    let eastHeat = calcFaceHeat(normalEast);
    let westHeat = calcFaceHeat(normalWest);
    let northHeat = calcFaceHeat(normalNorth);
    let southHeat = calcFaceHeat(normalSouth);

    // Overhang protection factor (wider overhang shelters high solar angles)
    const overhang = bld.roofOverhang || 0.8;
    const protectionFactor = Math.max(0.55, 1.0 - overhang * 0.28);

    eastHeat = Math.round(eastHeat * protectionFactor);
    westHeat = Math.round(westHeat * protectionFactor);
    northHeat = Math.round(northHeat * protectionFactor);
    southHeat = Math.round(southHeat * protectionFactor);

    const avgHeat = (eastHeat + westHeat + northHeat + southHeat) / 4;
    const comfortScore = Math.max(10, Math.round(100 - avgHeat * 0.75));

    const recommendations: string[] = [];
    if (westHeat > 55) {
      recommendations.push(
        'Fasad Barat menerima radiasi surya sore tinggi. Tambahkan teritis atap (≥1.2 m), sun louvers, atau vegetasi peneduh di sisi barat.'
      );
    }
    if (eastHeat > 55) {
      recommendations.push(
        'Fasad Timur terpapar radiasi pagi. Gunakan kaca low-e atau tirai jalusi horizontal.'
      );
    }
    if (overhang < 1.0) {
      recommendations.push(
        'Teritis atap saat ini (< 1.0 m) kurang melindungi dinding dari terpaan tampias hujan tropis dan radiasi langsung.'
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        'Orientasi fasad dan teritis atap sudah ideal untuk iklim tropis lembap Yogyakarta!'
      );
    }

    return {
      buildingId,
      northScore: northHeat,
      southScore: southHeat,
      eastScore: eastHeat,
      westScore: westHeat,
      overallComfortScore: comfortScore,
      shadowLengthMeters,
      shadowDirection,
      recommendations
    };
  }

  public setHeatmapVisible(
    visible: boolean,
    currentHour: number = 14.0,
    dayOfYear: number = 172
  ): void {
    this.isHeatmapActive = visible;

    // Dispose old overlay children
    while (this.heatmapOverlayGroup.children.length > 0) {
      const child = this.heatmapOverlayGroup.children[0];
      this.heatmapOverlayGroup.remove(child);
      child.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const m = c as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }

    if (!visible) return;

    for (const bld of this.buildingManager.buildings.values()) {
      const data = this.analyzeBuilding(bld.id, currentHour, dayOfYear);
      if (!data) continue;

      const group = new THREE.Group();
      group.position.copy(bld.position);

      const w = bld.width;
      const l = bld.length;
      const h = bld.floorCount * (bld.floorHeight || 3.2);

      // Color maps: Green (#34C759) -> Amber (#FF9500) -> Red (#FF3B30)
      const getHeatColor = (score: number): number => {
        if (score > 60) return 0xff3b30; // Red hot
        if (score > 30) return 0xff9500; // Amber warm
        return 0x34c759;                // Green comfortable
      };

      // 1. Facade Heat Indicators
      const subGroup = new THREE.Group();
      subGroup.rotation.y = bld.rotationY;

      // West face plate
      const westMat = new THREE.MeshBasicMaterial({
        color: getHeatColor(data.westScore),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const westPlane = new THREE.Mesh(new THREE.PlaneGeometry(l, h), westMat);
      westPlane.position.set(w * 0.5 + 0.1, h * 0.5 + 0.35, 0);
      westPlane.rotation.y = Math.PI * 0.5;
      subGroup.add(westPlane);

      // East face plate
      const eastMat = new THREE.MeshBasicMaterial({
        color: getHeatColor(data.eastScore),
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const eastPlane = new THREE.Mesh(new THREE.PlaneGeometry(l, h), eastMat);
      eastPlane.position.set(-w * 0.5 - 0.1, h * 0.5 + 0.35, 0);
      eastPlane.rotation.y = -Math.PI * 0.5;
      subGroup.add(eastPlane);

      group.add(subGroup);

      // 2. Real Astronomical Shadow Direction Arrow
      if (data.shadowLengthMeters > 0.5) {
        const arrow = new THREE.ArrowHelper(
          data.shadowDirection,
          new THREE.Vector3(0, 0.15, 0),
          Math.min(30, data.shadowLengthMeters),
          0x1c1c1e, // Deep shadow ink
          Math.min(2.5, data.shadowLengthMeters * 0.25),
          Math.min(1.2, data.shadowLengthMeters * 0.15)
        );
        group.add(arrow);
      }

      this.heatmapOverlayGroup.add(group);
    }
  }

  public dispose(): void {
    this.setHeatmapVisible(false);
    this.scene.remove(this.heatmapOverlayGroup);
  }
}
