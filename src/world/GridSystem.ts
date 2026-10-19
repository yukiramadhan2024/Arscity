import * as THREE from 'three';

export class GridSystem {
  public gridHelper: THREE.GridHelper;
  public snapStep: number = 1; // 1, 5, or 10 meters
  public isVisible: boolean = true;
  private scene: THREE.Scene;
  private size: number;

  constructor(scene: THREE.Scene, size: number = 1600, defaultStep: number = 1) {
    this.scene = scene;
    this.size = size;
    this.snapStep = defaultStep;

    // iOS system blue primary, subtle secondary
    this.gridHelper = new THREE.GridHelper(size, Math.min(size, 800), 0x007aff, 0x3a3a3c);
    this.gridHelper.position.y = 0.04; // Elevate slightly above grass
    (this.gridHelper.material as THREE.Material).transparent = true;
    (this.gridHelper.material as THREE.Material).opacity = 0.4;
    this.gridHelper.name = 'GridHelper';

    scene.add(this.gridHelper);
  }

  public setSnapStep(step: number): void {
    this.snapStep = step;
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.gridHelper.visible = visible;
  }

  public snap(x: number, z: number, customStep?: number): { x: number; z: number } {
    const step = customStep ?? this.snapStep;
    if (step <= 0) return { x, z };

    const snappedX = Math.round(x / step) * step;
    const snappedZ = Math.round(z / step) * step;
    return { x: snappedX, z: snappedZ };
  }

  public snapVector(v: THREE.Vector3, customStep?: number): THREE.Vector3 {
    const s = this.snap(v.x, v.z, customStep);
    return new THREE.Vector3(s.x, v.y, s.z);
  }

  public dispose(): void {
    this.scene.remove(this.gridHelper);
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
  }
}
