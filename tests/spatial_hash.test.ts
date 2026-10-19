import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { SpatialHashGrid } from '../src/core/engine/SpatialHashGrid';

describe('SpatialHashGrid (2D Raycasting & Proximity Optimization)', () => {
  it('correctly inserts, indexes, and queries items within AABB', () => {
    const grid = new SpatialHashGrid<string>(20);

    grid.insert('building_1', { minX: 10, minZ: 10, maxX: 25, maxZ: 25 }, 'Building A');
    grid.insert('building_2', { minX: 100, minZ: 100, maxX: 120, maxZ: 120 }, 'Building B');

    expect(grid.getItemCount()).toBe(2);

    // Query box overlapping building_1
    const nearA = grid.queryAABB({ minX: 5, minZ: 5, maxX: 30, maxZ: 30 });
    expect(nearA).toEqual(['Building A']);

    // Query box far away
    const far = grid.queryAABB({ minX: 50, minZ: 50, maxX: 70, maxZ: 70 });
    expect(far).toEqual([]);

    // Query point inside building_2
    const pointHits = grid.queryPoint(110, 110);
    expect(pointHits).toEqual(['Building B']);
  });

  it('correctly updates and removes spatial items without leaking cells', () => {
    const grid = new SpatialHashGrid<string>(20);

    grid.insert('tree_1', { minX: 0, minZ: 0, maxX: 5, maxZ: 5 }, 'Tree #1');
    expect(grid.getItemCount()).toBe(1);

    grid.update('tree_1', { minX: 40, minZ: 40, maxX: 45, maxZ: 45 }, 'Tree #1 (Moved)');

    // Old location should be empty
    expect(grid.queryPoint(2, 2)).toEqual([]);

    // New location should hit
    expect(grid.queryPoint(42, 42)).toEqual(['Tree #1 (Moved)']);

    // Remove item
    grid.remove('tree_1');
    expect(grid.getItemCount()).toBe(0);
    expect(grid.getCellCount()).toBe(0);
  });

  it('queries candidates along 3D ray segment efficiently', () => {
    const grid = new SpatialHashGrid<string>(20);

    grid.insert('obj_target', { minX: 20, minZ: 20, maxX: 30, maxZ: 30 }, 'Hit Target');
    grid.insert('obj_far', { minX: -200, minZ: -200, maxX: -180, maxZ: -180 }, 'Far Object');

    // Ray from (0, 10, 0) towards (25, 0, 25)
    const ray = new THREE.Ray(
      new THREE.Vector3(0, 10, 0),
      new THREE.Vector3(25, -10, 25).normalize()
    );
    const groundHit = new THREE.Vector3(25, 0, 25);

    const candidates = grid.queryRay(ray, groundHit);
    expect(candidates).toContain('Hit Target');
    expect(candidates).not.toContain('Far Object');
  });
});
