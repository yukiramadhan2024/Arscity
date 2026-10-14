import * as THREE from 'three';

export type CutMode = 'none' | 'floor_plan' | 'section_vertical';

export class SectionCutManager {
  private renderer: THREE.WebGLRenderer;
  public currentMode: CutMode = 'none';

  private horizontalPlane: THREE.Plane;
  private verticalPlane: THREE.Plane;
  public cutHeight: number = 2.2; // Default horizontal floor plan slice
  public cutOffset: number = 0;   // Default vertical slice offset

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.renderer.localClippingEnabled = true;

    // Normal pointing down: clips everything above height
    this.horizontalPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), this.cutHeight);
    // Normal pointing right: clips along X axis
    this.verticalPlane = new THREE.Plane(new THREE.Vector3(1, 0, 0), this.cutOffset);
  }

  public setCutMode(mode: CutMode): void {
    this.currentMode = mode;

    if (mode === 'none') {
      this.renderer.clippingPlanes = [];
    } else if (mode === 'floor_plan') {
      this.horizontalPlane.constant = this.cutHeight;
      this.renderer.clippingPlanes = [this.horizontalPlane];
    } else if (mode === 'section_vertical') {
      this.verticalPlane.constant = this.cutOffset;
      this.renderer.clippingPlanes = [this.verticalPlane];
    }
  }

  public setCutHeight(height: number): void {
    this.cutHeight = height;
    this.horizontalPlane.constant = height;
  }

  public setCutOffset(offset: number): void {
    this.cutOffset = offset;
    this.verticalPlane.constant = offset;
  }

  public dispose(): void {
    this.setCutMode('none');
  }
}
