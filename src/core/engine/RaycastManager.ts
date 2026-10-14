import * as THREE from 'three';
import { GridSystem } from '../../world/GridSystem';

export class RaycastManager {
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private groundPlane: THREE.Plane;
  private domElement: HTMLElement;
  private camera: THREE.Camera;
  private gridSystem: GridSystem;

  public groundPoint: THREE.Vector3 = new THREE.Vector3();
  public snappedPoint: THREE.Vector3 = new THREE.Vector3();
  public isHoveringGround: boolean = false;

  // Visual cursor marker on the ground
  public cursorMarker: THREE.Mesh;

  constructor(domElement: HTMLElement, camera: THREE.Camera, gridSystem: GridSystem, scene: THREE.Scene) {
    this.domElement = domElement;
    this.camera = camera;
    this.gridSystem = gridSystem;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2(-999, -999);
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Subtle Apple-style cyan halo ring on the terrain
    const ringGeom = new THREE.RingGeometry(0.3, 0.45, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x007aff,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.cursorMarker = new THREE.Mesh(ringGeom, ringMat);
    this.cursorMarker.position.set(0, 0.05, 0);
    this.cursorMarker.name = 'CursorMarker';
    scene.add(this.cursorMarker);

    this.domElement.addEventListener('mousemove', this.onMouseMove);
    this.domElement.addEventListener('mouseleave', this.onMouseLeave);
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  private onMouseMove = (e: MouseEvent): void => {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  };

  private onMouseLeave = (): void => {
    this.mouse.set(-999, -999);
    this.isHoveringGround = false;
    this.cursorMarker.visible = false;
  };

  public updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.update();
  }

  public update(): void {
    if (this.mouse.x < -1 || this.mouse.x > 1 || this.mouse.y < -1 || this.mouse.y > 1) {
      this.isHoveringGround = false;
      this.cursorMarker.visible = false;
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, this.groundPoint);

    if (hit) {
      this.isHoveringGround = true;
      this.snappedPoint = this.gridSystem.snapVector(this.groundPoint);
      this.cursorMarker.position.set(this.snappedPoint.x, 0.05, this.snappedPoint.z);
      this.cursorMarker.visible = true;
    } else {
      this.isHoveringGround = false;
      this.cursorMarker.visible = false;
    }
  }

  public raycastObjects(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave);
    this.cursorMarker.geometry.dispose();
    (this.cursorMarker.material as THREE.Material).dispose();
  }
}
