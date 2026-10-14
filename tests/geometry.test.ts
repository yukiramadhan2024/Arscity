import { describe, it, expect } from 'vitest';
import { PolygonMath, Vec2D } from '../src/core/math/PolygonMath';

describe('PolygonMath - Shoelace Area & Point in Polygon', () => {
  it('calculates area of a simple 10x20 rectangle correctly (200 m²)', () => {
    const rectCCW: Vec2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];
    expect(PolygonMath.calculateShoelaceArea(rectCCW)).toBe(200);

    // Clockwise winding must also return positive 200
    const rectCW: Vec2D[] = [
      { x: 0, y: 0 },
      { x: 0, y: 20 },
      { x: 10, y: 20 },
      { x: 10, y: 0 },
    ];
    expect(PolygonMath.calculateShoelaceArea(rectCW)).toBe(200);
  });

  it('calculates area of a right-angled triangle correctly', () => {
    const triangle: Vec2D[] = [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 8 },
    ];
    // Area = 0.5 * 6 * 8 = 24
    expect(PolygonMath.calculateShoelaceArea(triangle)).toBe(24);
  });

  it('calculates area of an L-shaped building footprint', () => {
    // 10x10 block with a 5x5 corner removed: total area = 100 - 25 = 75
    const lShape: Vec2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(PolygonMath.calculateShoelaceArea(lShape)).toBe(75);
  });

  it('detects points inside and outside polygon correctly', () => {
    const poly: Vec2D[] = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];

    expect(PolygonMath.isPointInPolygon({ x: 5, y: 5 }, poly)).toBe(true);
    expect(PolygonMath.isPointInPolygon({ x: 1, y: 1 }, poly)).toBe(true);
    expect(PolygonMath.isPointInPolygon({ x: 9.9, y: 9.9 }, poly)).toBe(true);

    expect(PolygonMath.isPointInPolygon({ x: -1, y: 5 }, poly)).toBe(false);
    expect(PolygonMath.isPointInPolygon({ x: 11, y: 5 }, poly)).toBe(false);
    expect(PolygonMath.isPointInPolygon({ x: 5, y: -2 }, poly)).toBe(false);
    expect(PolygonMath.isPointInPolygon({ x: 5, y: 15 }, poly)).toBe(false);
  });

  it('calculates oriented box vertices with rotation', () => {
    const center = { x: 0, z: 0 };
    // 0 rotation: width 10, length 20
    const unrotated = PolygonMath.getOrientedBoxVertices(center, 10, 20, 0);
    expect(unrotated.length).toBe(4);
    expect(PolygonMath.calculateShoelaceArea(unrotated)).toBeCloseTo(200, 3);

    // 45 degrees rotation (Math.PI / 4): area must still be 200 m²
    const rotated = PolygonMath.getOrientedBoxVertices(center, 10, 20, Math.PI / 4);
    expect(PolygonMath.calculateShoelaceArea(rotated)).toBeCloseTo(200, 3);
  });

  it('measures perpendicular distance from point to segment', () => {
    const segA = { x: 0, y: 0 };
    const segB = { x: 10, y: 0 };

    // Point right above the segment at (5, 4) -> distance = 4
    expect(PolygonMath.distancePointToSegment({ x: 5, y: 4 }, segA, segB)).toBeCloseTo(4, 3);

    // Point beyond segB at (13, 4) -> distance to (10, 0) = sqrt(3^2 + 4^2) = 5
    expect(PolygonMath.distancePointToSegment({ x: 13, y: 4 }, segA, segB)).toBeCloseTo(5, 3);
  });
});
