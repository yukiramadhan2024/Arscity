import * as THREE from 'three';
import { LightingSystem } from './LightingSystem';

/**
 * SunPathVisualizer: Renders a futuristic 3D architectural celestial arc and moving sun marker
 * overhead (calibrated to Yogyakarta's solar trajectory at -7.8° S latitude).
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
  public isVisible: boolean = true;

  private centerPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private curve: THREE.CatmullRomCurve3 | null = null;
  private readonly radius = 46.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'SunPathVisualizerGroup';
    this.masterGroup.visible = true;
    this.scene.add(this.masterGroup);

    this.buildArcGeometry();
  }

  private buildArcGeometry(): void {
    const arcPoints: THREE.Vector3[] = [];
    const companionPoints: THREE.Vector3[] = [];

    // Arc from East (sunrise 05:45) to Zenith to West (sunset 17:45)
    // In Yogyakarta (-7.8 deg S), sun path tilts slightly North or South depending on season
    const steps = 60;
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * Math.PI; // 0 to PI
      const x = Math.cos(theta) * this.radius;
      const y = Math.sin(theta) * this.radius * 0.92;
      const z = -Math.sin(theta) * this.radius * 0.22; // subtle solar declination tilt

      const pt = new THREE.Vector3(x, Math.max(0.4, y), z);
      arcPoints.push(pt);

      // Slightly offset companion arc
      companionPoints.push(new THREE.Vector3(x * 1.03, Math.max(0.4, y * 1.03 + 0.3), z * 1.03));
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
      const progress = (h - 5.75) / (18.0 - 5.75);
      const theta = progress * Math.PI;
      const x = Math.cos(theta) * this.radius;
      const y = Math.sin(theta) * this.radius * 0.92;
      const z = -Math.sin(theta) * this.radius * 0.22;

      // Small perpendicular tick segment
      const normal = new THREE.Vector3(x, y, z).normalize();
      const p1 = new THREE.Vector3(x, y, z);
      const p2 = p1.clone().addScaledVector(normal, 1.2);

      const tickGeom = new THREE.BufferGeometry().setFromPoints([p1, p2]);
      const tickLine = new THREE.Line(tickGeom, tickMat);
      this.tickMarksGroup.add(tickLine);
    }
    this.masterGroup.add(this.tickMarksGroup);

    // 4. Glowing 3D Golden Sun Sphere (#FFF1D6 + #FFB347 with Halo)
    this.sunSphere = new THREE.Group();
    const coreGeom = new THREE.SphereGeometry(1.6, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xfff1d6, // Intense warm white-gold core
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

    // 5. Sun Ray Vector Line to Ground
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

    // Initial positioning at 16:15 WIB
    this.updateTime(16.25);
  }

  public setCenter(pos: THREE.Vector3): void {
    this.centerPosition.copy(pos);
    this.masterGroup.position.set(pos.x, 0, pos.z);
  }

  public updateTime(timeOfDay: number, _lightingSystem?: LightingSystem): void {
    const isDay = timeOfDay >= 5.5 && timeOfDay <= 18.25;
    this.masterGroup.visible = this.isVisible;

    if (!isDay || !this.sunSphere) {
      if (this.sunSphere) this.sunSphere.visible = false;
      if (this.groundShadowVectorLine) this.groundShadowVectorLine.visible = false;
      return;
    }

    this.sunSphere.visible = true;
    if (this.groundShadowVectorLine) this.groundShadowVectorLine.visible = true;

    const progress = (timeOfDay - 5.5) / (18.25 - 5.5);
    const theta = Math.max(0, Math.min(Math.PI, progress * Math.PI));

    const x = Math.cos(theta) * this.radius;
    const y = Math.sin(theta) * this.radius * 0.92;
    const z = -Math.sin(theta) * this.radius * 0.22;

    this.sunSphere.position.set(x, Math.max(0.6, y), z);

    if (this.groundShadowVectorLine) {
      const positions = (this.groundShadowVectorLine.geometry.attributes.position as THREE.BufferAttribute);
      positions.setXYZ(0, 0, 0.1, 0);
      positions.setXYZ(1, x, Math.max(0.6, y), z);
      positions.needsUpdate = true;
    }
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.masterGroup.visible = visible;
  }

  public dispose(): void {
    this.scene.remove(this.masterGroup);
  }
}

