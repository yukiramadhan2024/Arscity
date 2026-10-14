import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class Terrain {
  public mesh: THREE.Mesh;
  public size: number;
  private material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, size: number = 512) {
    this.size = size;

    const geometry = new THREE.PlaneGeometry(size, size, 64, 64);
    geometry.rotateX(-Math.PI / 2); // Orient horizontally in XZ plane

    this.material = MaterialLibrary.getInstance().getMaterial('grass');
    if (this.material.map) {
      this.material.map.repeat.set(size / 8, size / 8);
      this.material.map.needsUpdate = true;
    }

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Terrain';

    scene.add(this.mesh);
  }

  public resize(newSize: number): void {
    this.size = newSize;
    this.mesh.geometry.dispose();
    const newGeom = new THREE.PlaneGeometry(newSize, newSize, 64, 64);
    newGeom.rotateX(-Math.PI / 2);
    this.mesh.geometry = newGeom;

    if (this.material.map) {
      this.material.map.repeat.set(newSize / 8, newSize / 8);
      this.material.map.needsUpdate = true;
    }
  }

  public getHeightAt(_x: number, _z: number): number {
    return 0;
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
