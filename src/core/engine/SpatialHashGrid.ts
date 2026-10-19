import * as THREE from 'three';

export interface BBox2D {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export interface SpatialItem<T> {
  id: string;
  aabb: BBox2D;
  data: T;
  cellKeys: string[];
}

/**
 * High-Performance 2D Spatial Hash Grid for Arscity.
 * Partitions world XZ plane into uniform cells to accelerate raycasting,
 * selection, and proximity queries from O(N) to O(1) local lookups.
 */
export class SpatialHashGrid<T> {
  public readonly cellSize: number;
  private cells: Map<string, Set<string>> = new Map();
  private items: Map<string, SpatialItem<T>> = new Map();

  constructor(cellSize: number = 20) {
    this.cellSize = cellSize > 0 ? cellSize : 20;
  }

  private hash(cellX: number, cellZ: number): string {
    return `${cellX}_${cellZ}`;
  }

  public getCellCoords(x: number, z: number): { cx: number; cz: number } {
    return {
      cx: Math.floor(x / this.cellSize),
      cz: Math.floor(z / this.cellSize),
    };
  }

  public insert(id: string, aabb: BBox2D, data: T): void {
    if (this.items.has(id)) {
      this.remove(id);
    }

    const { cx: minCx, cz: minCz } = this.getCellCoords(aabb.minX, aabb.minZ);
    const { cx: maxCx, cz: maxCz } = this.getCellCoords(aabb.maxX, aabb.maxZ);

    const cellKeys: string[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.hash(cx, cz);
        cellKeys.push(key);
        let cell = this.cells.get(key);
        if (!cell) {
          cell = new Set();
          this.cells.set(key, cell);
        }
        cell.add(id);
      }
    }

    this.items.set(id, { id, aabb, data, cellKeys });
  }

  public remove(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    for (const key of item.cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        cell.delete(id);
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.items.delete(id);
    return true;
  }

  public update(id: string, aabb: BBox2D, data: T): void {
    this.insert(id, aabb, data);
  }

  public queryAABB(aabb: BBox2D): T[] {
    const { cx: minCx, cz: minCz } = this.getCellCoords(aabb.minX, aabb.minZ);
    const { cx: maxCx, cz: maxCz } = this.getCellCoords(aabb.maxX, aabb.maxZ);

    const resultIds = new Set<string>();
    const results: T[] = [];

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.hash(cx, cz);
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            if (!resultIds.has(id)) {
              resultIds.add(id);
              const item = this.items.get(id);
              if (item) {
                // Secondary tight AABB intersection check
                if (
                  item.aabb.minX <= aabb.maxX &&
                  item.aabb.maxX >= aabb.minX &&
                  item.aabb.minZ <= aabb.maxZ &&
                  item.aabb.maxZ >= aabb.minZ
                ) {
                  results.push(item.data);
                }
              }
            }
          }
        }
      }
    }

    return results;
  }

  public queryPoint(x: number, z: number): T[] {
    const { cx, cz } = this.getCellCoords(x, z);
    const key = this.hash(cx, cz);
    const cell = this.cells.get(key);
    if (!cell) return [];

    const results: T[] = [];
    for (const id of cell) {
      const item = this.items.get(id);
      if (item) {
        if (
          x >= item.aabb.minX &&
          x <= item.aabb.maxX &&
          z >= item.aabb.minZ &&
          z <= item.aabb.maxZ
        ) {
          results.push(item.data);
        }
      }
    }
    return results;
  }

  /**
   * Queries candidates within a given circular radius (XZ plane) from a center point.
   */
  public queryRadius(x: number, z: number, radius: number): T[] {
    const minX = x - radius;
    const maxX = x + radius;
    const minZ = z - radius;
    const maxZ = z + radius;

    const { cx: minCx, cz: minCz } = this.getCellCoords(minX, minZ);
    const { cx: maxCx, cz: maxCz } = this.getCellCoords(maxX, maxZ);

    const resultIds = new Set<string>();
    const results: T[] = [];
    const radiusSq = radius * radius;

    for (let cx = minCx; cx <= maxCx; cx++) {
      for (let cz = minCz; cz <= maxCz; cz++) {
        const key = this.hash(cx, cz);
        const cell = this.cells.get(key);
        if (cell) {
          for (const id of cell) {
            if (!resultIds.has(id)) {
              resultIds.add(id);
              const item = this.items.get(id);
              if (item) {
                const closestX = Math.max(item.aabb.minX, Math.min(x, item.aabb.maxX));
                const closestZ = Math.max(item.aabb.minZ, Math.min(z, item.aabb.maxZ));
                const dx = x - closestX;
                const dz = z - closestZ;
                if (dx * dx + dz * dz <= radiusSq) {
                  results.push(item.data);
                }
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Queries candidates intersected by a 3D ray.
   * Computes the line segment on the XZ plane from camera or near hit to the ground plane hit
   * (or extends up to maxDistance), and traverses grid cells along that segment.
   */
  public queryRay(ray: THREE.Ray, groundPoint?: THREE.Vector3, maxDistance: number = 250): T[] {
    // If no items exist, return immediately
    if (this.items.size === 0) return [];

    const startX = ray.origin.x;
    const startZ = ray.origin.z;

    let endX: number;
    let endZ: number;

    if (groundPoint && isFinite(groundPoint.x) && isFinite(groundPoint.z)) {
      // Ray reaches ground plane. Add a small buffer past the ground point
      const dirX = ray.direction.x;
      const dirZ = ray.direction.z;
      endX = groundPoint.x + dirX * 5;
      endZ = groundPoint.z + dirZ * 5;
    } else {
      endX = startX + ray.direction.x * maxDistance;
      endZ = startZ + ray.direction.z * maxDistance;
    }

    // Traverse cells along line segment (startX, startZ) -> (endX, endZ)
    const minX = Math.min(startX, endX) - 5;
    const maxX = Math.max(startX, endX) + 5;
    const minZ = Math.min(startZ, endZ) - 5;
    const maxZ = Math.max(startZ, endZ) + 5;

    return this.queryAABB({ minX, minZ, maxX, maxZ });
  }

  public clear(): void {
    this.cells.clear();
    this.items.clear();
  }

  public getItemCount(): number {
    return this.items.size;
  }

  public getCellCount(): number {
    return this.cells.size;
  }
}
