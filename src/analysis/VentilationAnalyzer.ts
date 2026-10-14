import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';

export interface VentilationData {
  buildingId: string;
  crossVentilationScore: number; // 0 to 100
  windSpeedMps: number;          // e.g. 2.5 m/s
  airChangePerHour: number;      // ACH
  statusText: string;
  advice: string;
}

export class VentilationAnalyzer {
  private buildingManager: BuildingManager;
  private scene: THREE.Scene;
  public isWindActive: boolean = false;
  private windArrowsGroup: THREE.Group;
  private arrowPositions: Float32Array | null = null;
  private arrowGeometry: THREE.BufferGeometry | null = null;
  private arrowCount: number = 200;

  constructor(buildingManager: BuildingManager, scene: THREE.Scene) {
    this.buildingManager = buildingManager;
    this.scene = scene;
    this.windArrowsGroup = new THREE.Group();
    this.windArrowsGroup.name = 'VentilationWindGroup';
    scene.add(this.windArrowsGroup);
  }

  public analyzeBuilding(buildingId: string): VentilationData | null {
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;

    // Cross-ventilation logic:
    // Thinner buildings (width or length < 10m) have excellent cross-ventilation potential
    // Traditional joglo or buildings with multiple openings excel
    const minDim = Math.min(bld.width, bld.length);
    let score = 75;

    if (minDim <= 8) {
      score = 92; // Very easy cross airflow
    } else if (minDim <= 12) {
      score = 78;
    } else if (minDim <= 18) {
      score = 55;
    } else {
      score = 38; // Deep plan requires courtyards or mechanical ventilation
    }

    if (bld.presetKey === 'joglo' || bld.presetKey === 'community_hall') {
      score = Math.min(98, score + 15); // Open veranda
    }

    const windSpeed = 2.4; // Average tropical gentle breeze m/s
    const ach = parseFloat((score * 0.15).toFixed(1)); // Air changes per hour

    let statusText = 'Ventilasi Silang Sangat Baik';
    let advice = 'Aliran udara alami mengalir lancar antar-ruang, mengurangi kelembapan dan menghemat AC.';

    if (score < 50) {
      statusText = 'Ventilasi Terbatas (Denah Terlalu Dalam)';
      advice = 'Denah bangunan terlalu tebal (>16m). Pertimbangkan inner courtyard (taman dalam) atau skylight ventilasi atap.';
    } else if (score < 70) {
      statusText = 'Ventilasi Cukup';
      advice = 'Tingkatkan bukaan ventilasi silang dengan jendela jalusi/bovenlicht di sisi dinding berseberangan.';
    }

    return {
      buildingId,
      crossVentilationScore: score,
      windSpeedMps: windSpeed,
      airChangePerHour: ach,
      statusText,
      advice
    };
  }

  public setWindVisible(visible: boolean): void {
    this.isWindActive = visible;
    this.windArrowsGroup.clear();

    if (!visible) return;

    // Create animated flowing wind streamline particles
    this.arrowGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.arrowCount * 3);
    const radius = 90;

    for (let i = 0; i < this.arrowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2;
      positions[i * 3 + 1] = 2.0 + Math.random() * 8.0; // Human & window height (2 - 10m)
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 2;
    }

    this.arrowPositions = positions;
    this.arrowGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x38bdf8, // Cyan wind flow
      size: 1.2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });

    const points = new THREE.Points(this.arrowGeometry, material);
    this.windArrowsGroup.add(points);
  }

  public update(deltaTime: number): void {
    if (!this.isWindActive || !this.arrowPositions || !this.arrowGeometry) return;

    // Monsoon wind vector: Southeast to Northwest (+X, -Z)
    const speed = 18 * deltaTime;
    const box = 90;

    for (let i = 0; i < this.arrowCount; i++) {
      this.arrowPositions[i * 3] -= speed * 0.7; // Wind direction
      this.arrowPositions[i * 3 + 2] -= speed * 0.7;

      if (this.arrowPositions[i * 3] < -box) {
        this.arrowPositions[i * 3] = box;
      }
      if (this.arrowPositions[i * 3 + 2] < -box) {
        this.arrowPositions[i * 3 + 2] = box;
      }
    }

    this.arrowGeometry.attributes.position.needsUpdate = true;
  }

  public dispose(): void {
    this.setWindVisible(false);
    this.scene.remove(this.windArrowsGroup);
  }
}
