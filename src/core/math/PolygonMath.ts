export interface Vec2D {
  x: number;
  y: number;
}

/**
 * PolygonMath - Core geometric calculations for architecture & urban planning.
 *
 * Implements:
 * - Shoelace formula (Gauss's area formula) for arbitrary simple polygons
 * - Ray casting algorithm for point-in-polygon containment
 * - Polygon-in-polygon containment & setback distance evaluation
 * - Oriented bounding box vertices from center, dimensions, and rotation
 */
export class PolygonMath {
  /**
   * Calculate polygon area using the Shoelace formula (Gauss's Area Formula).
   * Supports both clockwise and counter-clockwise vertex orders.
   *
   * Formula: Area = 0.5 * |∑ (x_i * y_{i+1} - x_{i+1} * y_i)|
   */
  public static calculateShoelaceArea(vertices: Vec2D[]): number {
    const n = vertices.length;
    if (n < 3) return 0;

    let sum = 0;
    for (let i = 0; i < n; i++) {
      const current = vertices[i];
      const next = vertices[(i + 1) % n];
      sum += current.x * next.y - next.x * current.y;
    }

    return Math.abs(sum) * 0.5;
  }

  /**
   * Determine if a 2D point is inside a polygon using ray casting.
   * Counts crossings of horizontal ray extending from point to positive infinity.
   */
  public static isPointInPolygon(point: Vec2D, polygon: Vec2D[]): boolean {
    const n = polygon.length;
    if (n < 3) return false;

    let inside = false;
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;

      const intersect =
        yi > point.y !== yj > point.y &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Check if polygon A is completely contained inside polygon B.
   * All vertices of polygon A must be inside polygon B, and edges must not intersect.
   */
  public static isPolygonInsidePolygon(inner: Vec2D[], outer: Vec2D[]): boolean {
    if (inner.length < 3 || outer.length < 3) return false;

    // 1. Every vertex of inner must be inside outer
    for (const v of inner) {
      if (!this.isPointInPolygon(v, outer)) {
        return false;
      }
    }

    // 2. No inner edge should cross any outer edge
    for (let i = 0; i < inner.length; i++) {
      const iNext = (i + 1) % inner.length;
      const a1 = inner[i];
      const a2 = inner[iNext];

      for (let j = 0; j < outer.length; j++) {
        const jNext = (j + 1) % outer.length;
        const b1 = outer[j];
        const b2 = outer[jNext];

        if (this.doLineSegmentsIntersect(a1, a2, b1, b2)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Test if two line segments (p1-p2 and p3-p4) intersect.
   */
  public static doLineSegmentsIntersect(p1: Vec2D, p2: Vec2D, p3: Vec2D, p4: Vec2D): boolean {
    const ccw = (a: Vec2D, b: Vec2D, c: Vec2D) => {
      return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
    };

    return (
      ccw(p1, p3, p4) !== ccw(p2, p3, p4) &&
      ccw(p1, p2, p3) !== ccw(p1, p2, p4)
    );
  }

  /**
   * Shortest perpendicular distance from a 2D point to a line segment [segA, segB].
   */
  public static distancePointToSegment(point: Vec2D, segA: Vec2D, segB: Vec2D): number {
    const dx = segB.x - segA.x;
    const dy = segB.y - segA.y;
    const l2 = dx * dx + dy * dy;
    if (l2 === 0) {
      const pdx = point.x - segA.x;
      const pdy = point.y - segA.y;
      return Math.sqrt(pdx * pdx + pdy * pdy);
    }

    let t = ((point.x - segA.x) * dx + (point.y - segA.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = segA.x + t * dx;
    const projY = segA.y + t * dy;
    const distSq = (point.x - projX) ** 2 + (point.y - projY) ** 2;
    return Math.sqrt(distSq);
  }

  /**
   * Shortest distance from a polygon to a line segment.
   */
  public static minDistancePolygonToSegment(poly: Vec2D[], segA: Vec2D, segB: Vec2D): number {
    let minDist = Infinity;
    for (const v of poly) {
      const d = this.distancePointToSegment(v, segA, segB);
      if (d < minDist) minDist = d;
    }
    return minDist;
  }

  /**
   * Compute the 4 oriented ground vertices of a rectangular footprint.
   * X is width, Z is length in 3D world space. In 2D plane: (x, z) -> (x, y).
   */
  public static getOrientedBoxVertices(
    center: { x: number; z: number },
    width: number,
    length: number,
    rotationY: number
  ): Vec2D[] {
    const hw = width / 2;
    const hl = length / 2;
    const cos = Math.cos(rotationY);
    const sin = Math.sin(rotationY);

    // Local 4 corners: (-hw, -hl), (hw, -hl), (hw, hl), (-hw, hl)
    const corners = [
      { lx: -hw, lz: -hl },
      { lx: hw, lz: -hl },
      { lx: hw, lz: hl },
      { lx: -hw, lz: hl },
    ];

    return corners.map((c) => ({
      x: center.x + (c.lx * cos - c.lz * sin),
      y: center.z + (c.lx * sin + c.lz * cos),
    }));
  }
}
