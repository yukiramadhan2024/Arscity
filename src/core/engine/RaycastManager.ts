import * as THREE from 'three';
import { GridSystem } from '../../world/GridSystem';
import { SpatialHashGrid, BBox2D } from './SpatialHashGrid';

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

  // 2D Spatial Hash Grid to accelerate entity raycasting from O(N) to O(1)
  public spatialGrid: SpatialHashGrid<THREE.Object3D> = new SpatialHashGrid<THREE.Object3D>(20);

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

  public registerSpatialObject(id: string, aabb: BBox2D, obj: THREE.Object3D): void {
    this.spatialGrid.insert(id, aabb, obj);
  }

  public unregisterSpatialObject(id: string): void {
    this.spatialGrid.remove(id);
  }

  public updateSpatialObject(id: string, aabb: BBox2D, obj: THREE.Object3D): void {
    this.spatialGrid.update(id, aabb, obj);
  }

  public clearSpatialGrid(): void {
    this.spatialGrid.clear();
  }

  public raycastObjects(objects: THREE.Object3D[]): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // If spatial grid has items and we are raycasting top-level groups, filter candidates first
    if (this.spatialGrid.getItemCount() > 0) {
      const candidates = this.spatialGrid.queryRay(this.raycaster.ray, this.groundPoint);
      if (candidates.length > 0) {
        // Find which candidate objects belong to the requested objects hierarchy
        const candidateSet = new Set(candidates);
        const filteredTargets: THREE.Object3D[] = [];

        for (const obj of objects) {
          // If the object itself is a candidate
          if (candidateSet.has(obj)) {
            filteredTargets.push(obj);
          } else if (obj.children && obj.children.length > 0) {
            // Check direct children
            for (const child of obj.children) {
              if (candidateSet.has(child)) {
                filteredTargets.push(child);
              }
            }
          }
        }

        if (filteredTargets.length > 0) {
          return this.raycaster.intersectObjects(filteredTargets, true);
        }
      }
    }

    return this.raycaster.intersectObjects(objects, true);
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave);
    this.spatialGrid.clear();
    this.cursorMarker.geometry.dispose();
    (this.cursorMarker.material as THREE.Material).dispose();
  }
}
