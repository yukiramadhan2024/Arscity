import * as THREE from 'three';
import { LightingSystem } from './LightingSystem';
import { calculateSolarPosition } from '../math/SolarPosition';

/**
 * SunPathVisualizer: Renders an astronomically accurate 3D architectural celestial arc
 * and moving sun marker overhead, calibrated to Yogyakarta\'s solar trajectory at -7.8° S latitude.
 *
 * Supports seasonal solar declination tilt:
 * - March Equinox (equinox_mar, day 80): Declination 0°, path near celestial equator
 * - June Solstice (solstice_jun, day 172): Declination +23.45° LU, tilts towards North (-Z)
 * - December Solstice (solstice_dec, day 355): Declination -23.45° LS, tilts towards South (+Z)
 *
 * Features glowing neon cyan dual arcs (#00E5FF), hour tick marks, and an intense golden sun sphere.
 */
export class SunPathVisualizer {
  private scene: THREE.Scene;
  public masterGroup: THREE.Group;

  private primaryTubeMesh: THREE.Mesh | null = null;
  private dashedCompanionLine: THREE.Line | null = null;
  private tickMarksGroup: THREE.Group | null = null;
  private sunSphere: THREE.Group | null = null;
  private groundShadowVectorLine: THREE.Line | null = null;
  public isVisible: boolean = false;
  public currentDayOfYear: number = 172;

  private centerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private curve: THREE.CatmullRomCurve3 | null = null;
  private readonly radius = 46.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'SunPathVisualizerGroup';
    this.masterGroup.visible = false;
    this.scene.add(this.masterGroup);

    this.buildArcGeometry(172);
  }

  /**
   * Rebuilds the celestial solar arc based on season / day of year.
   * Disposes previous geometries and lines safely to prevent memory leaks.
   */
  public rebuildArc(dayOfYear: number): void {
    this.currentDayOfYear = dayOfYear;

    // Dispose old meshes and geometries
    if (this.primaryTubeMesh) {
      this.masterGroup.remove(this.primaryTubeMesh);
      this.primaryTubeMesh.geometry.dispose();
      (this.primaryTubeMesh.material as THREE.Material).dispose();
      this.primaryTubeMesh = null;
    }

    if (this.dashedCompanionLine) {
      this.masterGroup.remove(this.dashedCompanionLine);
      this.dashedCompanionLine.geometry.dispose();
      (this.dashedCompanionLine.material as THREE.Material).dispose();
      this.dashedCompanionLine = null;
    }

    if (this.tickMarksGroup) {
      this.masterGroup.remove(this.tickMarksGroup);
      this.tickMarksGroup.traverse((child) => {
        if ((child as THREE.Line).isLine) {
          const line = child as THREE.Line;
          line.geometry.dispose();
          if (Array.isArray(line.material)) {
            line.material.forEach((m) => m.dispose());
          } else {
            line.material.dispose();
          }
        }
      });
      this.tickMarksGroup = null;
    }

    this.buildArcGeometry(dayOfYear);
  }

  private buildArcGeometry(dayOfYear: number): void {
    const arcPoints: THREE.Vector3[] = [];
    const companionPoints: THREE.Vector3[] = [];

    // Arc from sunrise (05:40 WIB) to sunset (17:50 WIB)
    const steps = 60;
    const startHour = 5.65;
    const endHour = 17.85;

    for (let i = 0; i <= steps; i++) {
      const h = startHour + (i / steps) * (endHour - startHour);
      const coords = calculateSolarPosition(h, dayOfYear);

      const pt = coords.direction.clone().multiplyScalar(this.radius);
      pt.y = Math.max(0.4, pt.y);
      arcPoints.push(pt);

      // Slightly offset companion arc
      companionPoints.push(new THREE.Vector3(pt.x * 1.03, Math.max(0.4, pt.y * 1.03 + 0.3), pt.z * 1.03));
    }

    this.curve = new THREE.CatmullRomCurve3(arcPoints);

    // 1. Primary Glowing Neon Cyan 3D Tube Arc (#00E5FF)
    const tubeGeom = new THREE.TubeGeometry(this.curve, 80, 0.16, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.95,
      depthTest: true
    });
    this.primaryTubeMesh = new THREE.Mesh(tubeGeom, tubeMat);
    this.primaryTubeMesh.renderOrder = 950;
    this.masterGroup.add(this.primaryTubeMesh);

    // 2. Dashed Companion Line (#00B4D8)
    const compGeom = new THREE.BufferGeometry().setFromPoints(companionPoints);
    const compMat = new THREE.LineDashedMaterial({
      color: 0x00b4d8,
      dashSize: 1.4,
      gapSize: 0.8,
      transparent: true,
      opacity: 0.75,
      depthTest: true
    });
    this.dashedCompanionLine = new THREE.Line(compGeom, compMat);
    this.dashedCompanionLine.computeLineDistances();
    this.dashedCompanionLine.renderOrder = 948;
    this.masterGroup.add(this.dashedCompanionLine);

    // 3. Hour Scale Tick Marks (06:00 to 18:00 WIB)
    this.tickMarksGroup = new THREE.Group();
    const tickMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85
    });

    for (let h = 6; h <= 18; h++) {
      const coords = calculateSolarPosition(h, dayOfYear);
      const p1 = coords.direction.clone().multiplyScalar(this.radius);
      p1.y = Math.max(0.4, p1.y);

      const normal = p1.clone().normalize();
      const p2 = p1.clone().addScaledVector(normal, 1.2);

      const tickGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const tickLine = new THREE.Line(tickGeom, tickMat);
      this.tickMarksGroup.add(tickLine);
    }
    this.masterGroup.add(this.tickMarksGroup);

    // 4. Glowing 3D Golden Sun Sphere (create once)
    if (!this.sunSphere) {
      this.sunSphere = new THREE.Group();
      const coreGeom = new THREE.SphereGeometry(1.6, 24, 24);
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xfff1d6 // Intense warm white-gold core
      });
      const coreMesh = new THREE.Mesh(coreGeom, coreMat);
      this.sunSphere.add(coreMesh);

      const coronaGeom = new THREE.SphereGeometry(2.3, 16, 16);
      const coronaMat = new THREE.MeshBasicMaterial({
        color: 0xffb347, // Golden amber outer optical glow
        transparent: true,
        opacity: 0.45,
        side: THREE.BackSide
      });
      const coronaMesh = new THREE.Mesh(coronaGeom, coronaMat);
      this.sunSphere.add(coronaMesh);

      this.sunSphere.renderOrder = 955;
      this.masterGroup.add(this.sunSphere);
    }

    // 5. Sun Ray Vector Line to Ground (create once)
    if (!this.groundShadowVectorLine) {
      const lineGeom = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 10, 0)
      ]);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.35,
        depthTest: false
      });
      this.groundShadowVectorLine = new THREE.Line(lineGeom, lineMat);
      this.groundShadowVectorLine.renderOrder = 945;
      this.masterGroup.add(this.groundShadowVectorLine);
    }

    // Initial position update
    this.updateTime(16.25, undefined, dayOfYear);
  }

  public setCenter(pos: THREE.Vector3): void {
    this.centerPosition.copy(pos);
    this.masterGroup.position.set(pos.x, 0, pos.z);
  }

  public updateTime(timeOfDay: number, _lightingSystem?: LightingSystem, dayOfYear?: number): void {
    const isDay = timeOfDay >= 5.5 && timeOfDay <= 18.25;
    this.masterGroup.visible = this.isVisible;

    if (!isDay || !this.sunSphere) {
      if (this.sunSphere) this.sunSphere.visible = false;
      if (this.groundShadowVectorLine) this.groundShadowVectorLine.visible = false;
      return;
    }

    this.sunSphere.visible = true;
    if (this.groundShadowVectorLine) this.groundShadowVectorLine.visible = true;

    const currentDay = dayOfYear ?? this.currentDayOfYear;
    const coords = calculateSolarPosition(timeOfDay, currentDay);
    const pos = coords.direction.clone().multiplyScalar(this.radius);
    pos.y = Math.max(0.6, pos.y);

    this.sunSphere.position.copy(pos);

    if (this.groundShadowVectorLine) {
      const positions = (this.groundShadowVectorLine.geometry.attributes.position as THREE.BufferAttribute);
      positions.setXYZ(0, 0, 0.1, 0);
      positions.setXYZ(1, pos.x, pos.y, pos.z);
      positions.needsUpdate = true;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.masterGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.masterGroup);
    if (this.primaryTubeMesh) {
      this.primaryTubeMesh.geometry.dispose();
      (this.primaryTubeMesh.material as THREE.Material).dispose();
    }
    if (this.dashedCompanionLine) {
      this.dashedCompanionLine.geometry.dispose();
      (this.dashedCompanionLine.material as THREE.Material).dispose();
    }
    if (this.groundShadowVectorLine) {
      this.groundShadowVectorLine.geometry.dispose();
      (this.groundShadowVectorLine.material as THREE.Material).dispose();
    }
    if (this.tickMarksGroup) {
      this.tickMarksGroup.traverse((child) => {
        if ((child as THREE.Line).isLine) {
          (child as THREE.Line).geometry.dispose();
          const mat = (child as THREE.Line).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
    if (this.sunSphere) {
      this.sunSphere.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).geometry.dispose();
          const mat = (child as THREE.Mesh).material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
    }
  }
}
