import { describe, it, expect } from 'vitest';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';
import { PolygonMath, Vec2D } from '../src/core/math/PolygonMath';
import { SerializedRoadEdge } from '../src/io/CitySerializer';

/**
 * Robust Separating Axis Theorem (SAT) polygon-polygon overlap check
 * with customizable metric tolerance (default 0.1m).
 */
function checkPolygonOverlap(
  polyA: Vec2D[],
  polyB: Vec2D[],
  tolerance: number = 0.1
): { overlap: boolean; minOverlap: number } {
  const polygons = [polyA, polyB];
  let minAxisOverlap = Infinity;

  for (let i = 0; i < polygons.length; i++) {
    const polygon = polygons[i];
    for (let i1 = 0; i1 < polygon.length; i1++) {
      const i2 = (i1 + 1) % polygon.length;
      const p1 = polygon[i1];
      const p2 = polygon[i2];

      const edge = { x: p2.x - p1.x, y: p2.y - p1.y };
      const length = Math.hypot(edge.x, edge.y);
      if (length < 1e-6) continue;
      const normal = { x: -edge.y / length, y: edge.x / length };

      let minA = Infinity;
      let maxA = -Infinity;
      for (const p of polyA) {
        const proj = p.x * normal.x + p.y * normal.y;
        if (proj < minA) minA = proj;
        if (proj > maxA) maxA = proj;
      }

      let minB = Infinity;
      let maxB = -Infinity;
      for (const p of polyB) {
        const proj = p.x * normal.x + p.y * normal.y;
        if (proj < minB) minB = proj;
        if (proj > maxB) maxB = proj;
      }

      const overlap = Math.min(maxA, maxB) - Math.max(minA, minB);
      if (overlap <= tolerance) {
        return { overlap: false, minOverlap: 0 };
      }
      if (overlap < minAxisOverlap) {
        minAxisOverlap = overlap;
      }
    }
  }

  return { overlap: true, minOverlap: minAxisOverlap };
}

/**
 * Computes road corridor polygon for straight segments
 */
function getRoadEdgePolygon(edge: SerializedRoadEdge): Vec2D[] {
  const width = edge.type === 'arterial' ? 26 : edge.type === 'collector' ? 16 : 9;
  const halfW = width / 2;

  const p1 = edge.controlPoints[0];
  const p2 = edge.controlPoints[edge.controlPoints.length - 1];

  const dx = p2[0] - p1[0];
  const dz = p2[2] - p1[2];
  const len = Math.hypot(dx, dz);
  if (len < 1e-5) return [];

  const nx = -dz / len;
  const nz = dx / len;

  return [
    { x: p1[0] - nx * halfW, y: p1[2] - nz * halfW },
    { x: p1[0] + nx * halfW, y: p1[2] + nz * halfW },
    { x: p2[0] + nx * halfW, y: p2[2] + nz * halfW },
    { x: p2[0] - nx * halfW, y: p2[2] - nz * halfW }
  ];
}

describe('Malioboro Layout Geometric Verification (T1.3)', () => {
  it('ensures ZERO building-to-building overlaps across all preset buildings (0.1m tolerance)', () => {
    const data = createMalioboroMapData();
    const buildings = data.buildings;
    expect(buildings.length).toBeGreaterThanOrEqual(25);

    const buildingPolys = buildings.map((b) => ({
      id: b.id,
      name: b.name,
      pos: b.position,
      poly: PolygonMath.getOrientedBoxVertices(
        { x: b.position[0], z: b.position[2] },
        b.width,
        b.length,
        b.rotationY || 0
      )
    }));

    const overlappingPairs: string[] = [];

    for (let i = 0; i < buildingPolys.length; i++) {
      for (let j = i + 1; j < buildingPolys.length; j++) {
        const bA = buildingPolys[i];
        const bB = buildingPolys[j];

        const res = checkPolygonOverlap(bA.poly, bB.poly, 0.1);
        if (res.overlap) {
          overlappingPairs.push(
            `Overlap between "${bA.id}" and "${bB.id}": min overlap ${res.minOverlap.toFixed(2)}m`
          );
        }
      }
    }

    expect(overlappingPairs).toEqual([]);
  });

  it('ensures ZERO building-to-road overlaps across all preset buildings and road corridors (0.1m tolerance)', () => {
    const data = createMalioboroMapData();
    const buildings = data.buildings;
    const roads = data.roads.edges;

    const buildingPolys = buildings.map((b) => ({
      id: b.id,
      name: b.name,
      poly: PolygonMath.getOrientedBoxVertices(
        { x: b.position[0], z: b.position[2] },
        b.width,
        b.length,
        b.rotationY || 0
      )
    }));

    const roadPolys = roads.map((r) => ({
      id: r.id,
      type: r.type,
      poly: getRoadEdgePolygon(r)
    })).filter((r) => r.poly.length === 4);

    const roadCollisions: string[] = [];

    for (const b of buildingPolys) {
      for (const r of roadPolys) {
        const res = checkPolygonOverlap(b.poly, r.poly, 0.1);
        if (res.overlap) {
          roadCollisions.push(
            `Building "${b.id}" overlaps road "${r.id}" (${r.type}): min overlap ${res.minOverlap.toFixed(2)}m`
          );
        }
      }
    }

    expect(roadCollisions).toEqual([]);
  });

  it('explicitly eliminates the 3 previously identified collision bugs', () => {
    const data = createMalioboroMapData();

    // Bug 1: No Ruko overlaps Pendopo Joglo Yogyakarta
    const joglo = data.buildings.find((b) => b.id === 'bld_joglo_yogyakarta')!;
    expect(joglo).toBeDefined();
    const jogloPoly = PolygonMath.getOrientedBoxVertices(
      { x: joglo.position[0], z: joglo.position[2] },
      joglo.width,
      joglo.length,
      joglo.rotationY || 0
    );

    const westRukos = data.buildings.filter((b) => b.id.startsWith('bld_ruko_w_'));
    for (const ruko of westRukos) {
      const rukoPoly = PolygonMath.getOrientedBoxVertices(
        { x: ruko.position[0], z: ruko.position[2] },
        ruko.width,
        ruko.length,
        ruko.rotationY || 0
      );
      const res = checkPolygonOverlap(jogloPoly, rukoPoly, 0.1);
      expect(res.overlap).toBe(false);
    }

    // Bug 2: No building overlaps Jl. Pajeksan road corridor
    const pajeksanEdge = data.roads.edges.find((e) => e.id === 'edge_pajeksan_w')!;
    expect(pajeksanEdge).toBeDefined();
    const pajeksanPoly = getRoadEdgePolygon(pajeksanEdge);

    for (const b of data.buildings) {
      const bPoly = PolygonMath.getOrientedBoxVertices(
        { x: b.position[0], z: b.position[2] },
        b.width,
        b.length,
        b.rotationY || 0
      );
      const res = checkPolygonOverlap(bPoly, pajeksanPoly, 0.1);
      expect(res.overlap).toBe(false);
    }

    // Bug 3: Bale Danunegaran does not collide with Pendopo Ageng Kepatihan
    const pendopoKepatihan = data.buildings.find((b) => b.id === 'bld_joglo_kepatihan')!;
    const baleKepatihan = data.buildings.find((b) => b.id === 'bld_bale_kepatihan')!;
    expect(pendopoKepatihan).toBeDefined();
    expect(baleKepatihan).toBeDefined();

    const pendopoPoly = PolygonMath.getOrientedBoxVertices(
      { x: pendopoKepatihan.position[0], z: pendopoKepatihan.position[2] },
      pendopoKepatihan.width,
      pendopoKepatihan.length,
      pendopoKepatihan.rotationY || 0
    );
    const balePoly = PolygonMath.getOrientedBoxVertices(
      { x: baleKepatihan.position[0], z: baleKepatihan.position[2] },
      baleKepatihan.width,
      baleKepatihan.length,
      baleKepatihan.rotationY || 0
    );

    const kepatihanRes = checkPolygonOverlap(pendopoPoly, balePoly, 0.1);
    expect(kepatihanRes.overlap).toBe(false);
  });
});
