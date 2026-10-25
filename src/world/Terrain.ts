import * as THREE from 'three';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class Terrain {
  public mesh: THREE.Mesh;
  public size: number;
  public segments: number;
  private material: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, size: number = 1600, segments: number = 128) {
    this.size = size;
    this.segments = segments;

    const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    geometry.rotateX(-Math.PI / 2); // Orient horizontally in XZ plane

    this.material = MaterialLibrary.getInstance().getMaterial('grass');
    if (this.material.map) {
      this.material.map.repeat.set(size / 8, size / 8);
      if (this.material.map.image) {
        this.material.map.needsUpdate = true;
      }
    }

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'Terrain';

    scene.add(this.mesh);
  }

  public resize(newSize: number): void {
    this.size = newSize;
    this.mesh.geometry.dispose();
    const newGeom = new THREE.PlaneGeometry(newSize, newSize, this.segments, this.segments);
    newGeom.rotateX(-Math.PI / 2);
    this.mesh.geometry = newGeom;

    if (this.material.map) {
      this.material.map.repeat.set(newSize / 8, newSize / 8);
      if (this.material.map.image) {
        this.material.map.needsUpdate = true;
      }
    }
  }

  /**
   * Continuous bilinear interpolation of terrain elevation at any world (x, z) coordinates.
   */
  public getHeightAt(x: number, z: number): number {
    const half = this.size / 2;
    const normX = (x + half) / this.size;
    const normZ = (z + half) / this.size;

    if (normX < 0 || normX > 1 || normZ < 0 || normZ > 1) {
      return 0;
    }

    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return 0;

    const colF = normX * this.segments;
    const rowF = normZ * this.segments;
    const c0 = Math.floor(colF);
    const r0 = Math.floor(rowF);
    const c1 = Math.min(this.segments, c0 + 1);
    const r1 = Math.min(this.segments, r0 + 1);
    const tx = colF - c0;
    const tz = rowF - r0;

    const stride = this.segments + 1;
    const i00 = r0 * stride + c0;
    const i10 = r0 * stride + c1;
    const i01 = r1 * stride + c0;
    const i11 = r1 * stride + c1;

    const count = pos.count;
    if (i11 >= count) return 0;

    const h00 = pos.getY(i00);
    const h10 = pos.getY(i10);
    const h01 = pos.getY(i01);
    const h11 = pos.getY(i11);

    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;

    return h0 * (1 - tz) + h1 * tz;
  }

  /**
   * Modifies terrain elevation within a circular brush radius with smooth cosine falloff.
   * Supports 'raise', 'lower', and 'flatten' modes.
   */
  public modifyElevation(
    centerX: number,
    centerZ: number,
    radius: number,
    deltaY: number,
    mode: 'raise' | 'lower' | 'flatten' = 'raise',
    targetHeight?: number
  ): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;

    const half = this.size / 2;
    const step = this.size / this.segments;
    const minCol = Math.max(0, Math.floor(((centerX - radius) + half) / step));
    const maxCol = Math.min(this.segments, Math.ceil(((centerX + radius) + half) / step));
    const minRow = Math.max(0, Math.floor(((centerZ - radius) + half) / step));
    const maxRow = Math.min(this.segments, Math.ceil(((centerZ + radius) + half) / step));

    const stride = this.segments + 1;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * stride + c;
        if (idx >= pos.count) continue;

        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);
        const dist = Math.hypot(vx - centerX, vz - centerZ);

        if (dist <= radius) {
          const falloff = 0.5 * (1 + Math.cos(Math.PI * (dist / radius)));
          const currentY = pos.getY(idx);

          if (mode === 'raise') {
            pos.setY(idx, currentY + deltaY * falloff);
          } else if (mode === 'lower') {
            pos.setY(idx, currentY - deltaY * falloff);
          } else if (mode === 'flatten') {
            const target = targetHeight !== undefined ? targetHeight : 0;
            pos.setY(idx, currentY + (target - currentY) * falloff);
          }
        }
      }
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Flattens a rectangular terrain area (e.g. building footprint or lot parcel) to a uniform target elevation.
   */
  public flattenArea(minX: number, minZ: number, maxX: number, maxZ: number, targetHeight: number = 0): void {
    const pos = this.mesh.geometry.attributes.position;
    if (!pos) return;

    const half = this.size / 2;
    const step = this.size / this.segments;
    const minCol = Math.max(0, Math.floor((minX + half) / step));
    const maxCol = Math.min(this.segments, Math.ceil((maxX + half) / step));
    const minRow = Math.max(0, Math.floor((minZ + half) / step));
    const maxRow = Math.min(this.segments, Math.ceil((maxZ + half) / step));

    const stride = this.segments + 1;

    for (let r = minRow; r <= maxRow; r++) {
      for (let c = minCol; c <= maxCol; c++) {
        const idx = r * stride + c;
        if (idx >= pos.count) continue;

        const vx = pos.getX(idx);
        const vz = pos.getZ(idx);
        if (vx >= minX && vx <= maxX && vz >= minZ && vz <= maxZ) {
          pos.setY(idx, targetHeight);
        }
      }
    }

    pos.needsUpdate = true;
    this.mesh.geometry.computeVertexNormals();
  }

  /**
   * Automatically flattens the ground directly under a lot parcel.
   */
  public flattenUnderLot(
    lot: { position: { x: number; z: number }; width: number; length: number },
    targetHeight?: number
  ): void {
    const h = targetHeight !== undefined ? targetHeight : this.getHeightAt(lot.position.x, lot.position.z);
    const halfW = lot.width / 2 + 1.0;
    const halfL = lot.length / 2 + 1.0;
    this.flattenArea(
      lot.position.x - halfW,
      lot.position.z - halfL,
      lot.position.x + halfW,
      lot.position.z + halfL,
      h
    );
  }

  /**
   * Measures the elevation difference across a building footprint to determine talud foundation depth.
   */
  public getElevationDeltaAcrossFootprint(
    centerX: number,
    centerZ: number,
    width: number,
    length: number
  ): { minH: number; maxH: number; deltaH: number } {
    const hw = width / 2;
    const hl = length / 2;
    const samples = [
      this.getHeightAt(centerX, centerZ),
      this.getHeightAt(centerX - hw, centerZ - hl),
      this.getHeightAt(centerX + hw, centerZ - hl),
      this.getHeightAt(centerX - hw, centerZ + hl),
      this.getHeightAt(centerX + hw, centerZ + hl)
    ];

    const minH = Math.min(...samples);
    const maxH = Math.max(...samples);
    return { minH, maxH, deltaH: maxH - minH };
  }

  public setSubsurfaceXRay(enabled: boolean): void {
    if (enabled) {
      this.material.transparent = true;
      this.material.opacity = 0.32;
      this.material.depthWrite = false;
      this.material.needsUpdate = true;
    } else {
      this.material.transparent = false;
      this.material.opacity = 1.0;
      this.material.depthWrite = true;
      this.material.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}
