import { describe, it, expect } from 'vitest';
import { createMalioboroMapData } from '../src/world/MalioboroPreset';
import { PolygonMath, Vec2D } from '../src/core/math/PolygonMath';
import { SerializedRoadEdge } from '../src/io/CitySerializer';

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

/**
 * Computes exact minimum Euclidean distance between a point and a line segment
 */
function distPointToSegment(p: Vec2D, a: Vec2D, b: Vec2D): number {
  return PolygonMath.distancePointToSegment(p, a, b);
}

/**
 * Computes exact minimum Euclidean distance between two convex polygons (or 0 if intersecting)
 */
function minDistancePolyToPoly(polyA: Vec2D[], polyB: Vec2D[]): number {
  // Check if any point of A is inside B or vice versa
  for (const p of polyA) {
    if (PolygonMath.isPointInPolygon(p, polyB)) return 0;
  }
  for (const p of polyB) {
    if (PolygonMath.isPointInPolygon(p, polyA)) return 0;
  }

  // Check edge-to-edge intersections
  for (let i = 0; i < polyA.length; i++) {
    const a1 = polyA[i];
    const a2 = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      if (PolygonMath.doLineSegmentsIntersect(a1, a2, b1, b2)) {
        return 0;
      }
    }
  }

  // If disjoint, min distance is min distance from vertices of A to edges of B and vice versa
  let minDist = Infinity;
  for (const p of polyA) {
    for (let j = 0; j < polyB.length; j++) {
      const b1 = polyB[j];
      const b2 = polyB[(j + 1) % polyB.length];
      const d = distPointToSegment(p, b1, b2);
      if (d < minDist) minDist = d;
    }
  }
  for (const p of polyB) {
    for (let i = 0; i < polyA.length; i++) {
      const a1 = polyA[i];
      const a2 = polyA[(i + 1) % polyA.length];
      const d = distPointToSegment(p, a1, a2);
      if (d < minDist) minDist = d;
    }
  }
  return minDist;
}

describe('Adversarial Malioboro Geometric Stress Test', () => {
  const data = createMalioboroMapData();
  const buildings = data.buildings;
  const roads = data.roads.edges;

  const buildingPolys = buildings.map((b) => ({
    id: b.id,
    name: b.name,
    roofOverhang: b.roofOverhang || 0,
    footprint: PolygonMath.getOrientedBoxVertices(
      { x: b.position[0], z: b.position[2] },
      b.width,
      b.length,
      b.rotationY || 0
    ),
    roofFootprint: PolygonMath.getOrientedBoxVertices(
      { x: b.position[0], z: b.position[2] },
      b.width + 2 * (b.roofOverhang || 0),
      b.length + 2 * (b.roofOverhang || 0),
      b.rotationY || 0
    )
  }));

  const roadPolys = roads.map((r) => ({
    id: r.id,
    type: r.type,
    poly: getRoadEdgePolygon(r)
  })).filter((r) => r.poly.length === 4);

  it('measures exact clearance from every building corner to all road corridors', () => {
    let globalMinFootprintRoadDist = Infinity;
    let closestFootprintPair = '';
    let globalMinRoofRoadDist = Infinity;
    let closestRoofPair = '';

    const criticalViolations: string[] = [];

    for (const b of buildingPolys) {
      for (const r of roadPolys) {
        const distFootprint = minDistancePolyToPoly(b.footprint, r.poly);
        if (distFootprint < globalMinFootprintRoadDist) {
          globalMinFootprintRoadDist = distFootprint;
          closestFootprintPair = `Building "${b.id}" to Road "${r.id}" (${r.type})`;
        }
        if (distFootprint < 0.1) {
          criticalViolations.push(
            `Footprint collision: ${b.id} is ${distFootprint.toFixed(4)}m from road ${r.id}`
          );
        }

        const distRoof = minDistancePolyToPoly(b.roofFootprint, r.poly);
        if (distRoof < globalMinRoofRoadDist) {
          globalMinRoofRoadDist = distRoof;
          closestRoofPair = `Building "${b.id}" (roof) to Road "${r.id}" (${r.type})`;
        }
        if (distRoof < 0.1) {
          criticalViolations.push(
            `Roof overhang collision: ${b.id} roof is ${distRoof.toFixed(4)}m from road ${r.id}`
          );
        }
      }
    }

    console.log(`[STRESS METRIC] Global Min Footprint-to-Road distance: ${globalMinFootprintRoadDist.toFixed(3)}m (${closestFootprintPair})`);
    console.log(`[STRESS METRIC] Global Min Roof-to-Road distance: ${globalMinRoofRoadDist.toFixed(3)}m (${closestRoofPair})`);

    expect(criticalViolations).toEqual([]);
    expect(globalMinFootprintRoadDist).toBeGreaterThanOrEqual(0.1);
  });

  it('measures pairwise clearances between all buildings to find closest neighbor', () => {
    let globalMinBldDist = Infinity;
    let closestBldPair = '';
    const bldCollisions: string[] = [];

    for (let i = 0; i < buildingPolys.length; i++) {
      for (let j = i + 1; j < buildingPolys.length; j++) {
        const bA = buildingPolys[i];
        const bB = buildingPolys[j];

        const dist = minDistancePolyToPoly(bA.footprint, bB.footprint);
        if (dist < globalMinBldDist) {
          globalMinBldDist = dist;
          closestBldPair = `${bA.id} <-> ${bB.id}`;
        }
        if (dist < 0.1) {
          bldCollisions.push(
            `Building overlap: ${bA.id} and ${bB.id} distance is ${dist.toFixed(4)}m (< 0.1m)`
          );
        }
      }
    }

    console.log(`[STRESS METRIC] Global Min Building-to-Building distance: ${globalMinBldDist.toFixed(3)}m (${closestBldPair})`);
    expect(bldCollisions).toEqual([]);
    expect(globalMinBldDist).toBeGreaterThanOrEqual(0.1);
  });

  it('verifies sidewalk landscape items (tree trunks, bollards, lanterns) bases are strictly outside road carriageway', () => {
    const landscapes = data.landscape || [];
    const trunkViolations: string[] = [];

    for (const item of landscapes) {
      const pos: Vec2D = { x: item.position[0], y: item.position[2] };

      for (const r of roadPolys) {
        if (PolygonMath.isPointInPolygon(pos, r.poly)) {
          trunkViolations.push(`Landscape base ${item.id} (${item.type}) is INSIDE road carriageway ${r.id}`);
        }
      }
    }

    console.log(`[STRESS METRIC] Landscape items trunk/base tested: ${landscapes.length}. Carriageway base violations: ${trunkViolations.length}`);
    expect(trunkViolations).toEqual([]);
  });
});


