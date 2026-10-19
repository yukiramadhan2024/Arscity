import * as THREE from 'three';

/**
 * HumanScaleFigure - 1.65m translucent architectural human silhouette
 * Used as a visual scale reference during building and footprint editing.
 * Average adult ergonomic height across Nusantara/Southeast Asia: 1.65m.
 */
export class HumanScaleFigure {
  private group: THREE.Group;
  private material: THREE.MeshBasicMaterial;

  constructor(height: number = 1.65) {
    this.group = new THREE.Group();
    this.group.name = 'HumanScaleFigure_1.65m';

    // Translucent cyan architectural scale silhouette
    this.material = new THREE.MeshBasicMaterial({
      color: 0x00d2ff,
      transparent: true,
      opacity: 0.65,
      depthTest: true,
      depthWrite: false,
    });
    this.material.userData = { isScaleFigure: true };

    const scale = height / 1.65;
    const headRadius = 0.11 * scale;
    const torsoHeight = 0.62 * scale;
    const legHeight = height - headRadius * 2 - torsoHeight;

    // 1. Head
    const headGeom = new THREE.SphereGeometry(headRadius, 12, 10);
    const head = new THREE.Mesh(headGeom, this.material);
    head.position.y = height - headRadius;
    this.group.add(head);

    // 2. Torso & Shoulders
    const torsoGeom = new THREE.CylinderGeometry(0.13 * scale, 0.11 * scale, torsoHeight, 10);
    const torso = new THREE.Mesh(torsoGeom, this.material);
    torso.position.y = legHeight + torsoHeight / 2;
    this.group.add(torso);

    // 3. Legs
    const legGeom = new THREE.CylinderGeometry(0.045 * scale, 0.04 * scale, legHeight, 8);
    const leftLeg = new THREE.Mesh(legGeom, this.material);
    leftLeg.position.set(-0.065 * scale, legHeight / 2, 0);
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, this.material);
    rightLeg.position.set(0.065 * scale, legHeight / 2, 0);
    this.group.add(rightLeg);

    // 4. Ground Reference Disc
    const groundGeom = new THREE.RingGeometry(0.05 * scale, 0.28 * scale, 16);
    groundGeom.rotateX(-Math.PI / 2);
    const groundDisc = new THREE.Mesh(groundGeom, this.material);
    groundDisc.position.y = 0.02;
    this.group.add(groundDisc);
  }

  public getObject(): THREE.Group {
    return this.group;
  }

  public setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  public setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  public dispose(): void {
    this.group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
      }
    });
    this.material.dispose();
  }
}
