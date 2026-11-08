import * as THREE from 'three';
import { GridSystem } from '../../world/GridSystem';
import { SpatialHashGrid, BBox2D } from './SpatialHashGrid';

/**
 * Tahap 2 (T2.4): Checks whether an Object3D and all its ancestors up to root scene have visible === true.
 * Three.js raycasting does NOT check parent/ancestor visibility when traversing child hierarchies.
 */
export function isObjectHierarchyVisible(obj: THREE.Object3D | null): boolean {
  let curr: THREE.Object3D | null = obj;
  while (curr) {
    if (!curr.visible) return false;
    curr = curr.parent;
  }
  return true;
}

export class RaycastManager {
  public static isObjectHierarchyVisible = isObjectHierarchyVisible;
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

    // Crisp Crimson Pink halo ring on the terrain
    const ringGeom = new THREE.RingGeometry(0.3, 0.45, 32);
    ringGeom.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfd6e8e,
      transparent: true,
      opacity: 0.72,
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

  private rafPending: boolean = false;
  private pendingClientX: number = 0;
  private pendingClientY: number = 0;

  private onMouseMove = (e: MouseEvent): void => {
    this.pendingClientX = e.clientX;
    this.pendingClientY = e.clientY;
    if (!this.rafPending) {
      this.rafPending = true;
      requestAnimationFrame(() => {
        if (!this.domElement) {
          this.rafPending = false;
          return;
        }
        const rect = this.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
          this.rafPending = false;
          return;
        }
        this.mouse.x = ((this.pendingClientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((this.pendingClientY - rect.top) / rect.height) * 2 + 1;
        this.update();
        this.rafPending = false;
      });
    }
  };

  private onMouseLeave = (): void => {
    this.mouse.set(-999, -999);
    this.isHoveringGround = false;
    this.cursorMarker.visible = false;
  };

  public updateMousePosition(clientX: number, clientY: number): void {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.update();
  }

  public update(): void {
    if (!this.camera || this.mouse.x < -1 || this.mouse.x > 1 || this.mouse.y < -1 || this.mouse.y > 1) {
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
                // If candidate has an ExteriorShell sub-group, raycast only against exterior
                const ext = child.getObjectByName('ExteriorShell');
                filteredTargets.push(ext || child);
              }
            }
          }
        }

        if (filteredTargets.length > 0) {
          const hits = this.raycaster.intersectObjects(filteredTargets, true);
          return hits.filter((h) => isObjectHierarchyVisible(h.object));
        }
      }
    }

    const hits = this.raycaster.intersectObjects(objects, true);
    return hits.filter((h) => isObjectHierarchyVisible(h.object));
  }

  public dispose(): void {
    this.domElement.removeEventListener('mousemove', this.onMouseMove);
    this.domElement.removeEventListener('mouseleave', this.onMouseLeave);
    this.spatialGrid.clear();
    this.cursorMarker.geometry.dispose();
    (this.cursorMarker.material as THREE.Material).dispose();
  }
}
