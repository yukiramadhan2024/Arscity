import * as THREE from 'three';
import { LotParcel, ZoneType, ZONE_RULES, BuildingCodeViolation } from './ZoneTypes';
import { BuildingManager } from '../buildings/BuildingManager';
import { PolygonMath, Vec2D } from '../core/math/PolygonMath';
import type { RoadManager } from '../roads/RoadManager';
import type { LandscapeManager } from '../world/LandscapeManager';

export class LotManager {
  public lots: Map<string, LotParcel> = new Map();
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  public roadManager?: RoadManager;
  public landscapeManager?: LandscapeManager;

  private lotMeshGroups: Map<string, THREE.Group> = new Map();
  public selectedLotId: string | null = null;
  public onSelectionChanged?: () => void;
  public onLotsUpdated?: () => void;

  private nextLotId: number = 1;

  constructor(
    scene: THREE.Scene,
    buildingManager: BuildingManager,
    roadManager?: RoadManager,
    landscapeManager?: LandscapeManager
  ) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.roadManager = roadManager;
    this.landscapeManager = landscapeManager;
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'LotsMasterGroup';
    scene.add(this.masterGroup);
  }

  public setDependencies(roadManager?: RoadManager, landscapeManager?: LandscapeManager): void {
    if (roadManager) this.roadManager = roadManager;
    if (landscapeManager) this.landscapeManager = landscapeManager;
    this.evaluateAllLots();
  }

  /**
   * Smart Block Subdivider: Subdivides a rectangular area into a regular grid
   * of uniform parcels, each automatically calibrated to face the nearest road.
   */
  public subdivideBlock(
    center: THREE.Vector3,
    blockWidth: number,
    blockLength: number,
    parcelWidth: number = 10,
    parcelLength: number = 20,
    zone: ZoneType = 'residential'
  ): LotParcel[] {
    const createdParcels: LotParcel[] = [];
    const safeBlockW = Math.max(1, Math.abs(blockWidth));
    const safeBlockL = Math.max(1, Math.abs(blockLength));
    const safeParcelW = Math.max(1, Math.abs(parcelWidth));
    const safeParcelL = Math.max(1, Math.abs(parcelLength));

    const cols = Math.max(1, Math.floor(safeBlockW / safeParcelW));
    const rows = Math.max(1, Math.floor(safeBlockL / safeParcelL));

    const actualW = safeBlockW / cols;
    const actualL = safeBlockL / rows;

    const startX = center.x - safeBlockW / 2 + actualW / 2;
    const startZ = center.z - safeBlockL / 2 + actualL / 2;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const px = startX + c * actualW;
        const pz = startZ + r * actualL;
        const pos = new THREE.Vector3(px, center.y, pz);

        const parcel = this.createLot(pos, actualW, actualL, zone);

        if (this.roadManager) {
          const nearest = this.roadManager.findNearestRoadEdge(pos);
          if (nearest) {
            const dx = nearest.closestPt.x - pos.x;
            const dz = nearest.closestPt.z - pos.z;
            if (Math.abs(dz) >= Math.abs(dx)) {
              parcel.frontEdgeIndex = dz > 0 ? 0 : 2;
            } else {
              parcel.frontEdgeIndex = dx > 0 ? 1 : 3;
            }
          }
        }

        createdParcels.push(parcel);
      }
    }

    if (this.onLotsUpdated) this.onLotsUpdated();
    return createdParcels;
  }

  public static formatIndonesianInt(n: number): string {
    const rounded = Math.max(0, Math.round(n));
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  public static formatParkingBadgeText(areaM2: number, stallCount: number): string {
    return `Luas ${LotManager.formatIndonesianInt(areaM2)} m2 - ${Math.max(0, Math.round(stallCount))} Slot Parkir`;
  }

  public static computePolygonAreaAndCentroid(poly: Vec2D[]): { areaM2: number; centroid: Vec2D } {
    if (!poly || poly.length < 3) {
      return { areaM2: 0, centroid: { x: 0, y: 0 } };
    }
    let signedArea2 = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < poly.length; i++) {
      const p0 = poly[i];
      const p1 = poly[(i + 1) % poly.length];
      const cross = p0.x * p1.y - p1.x * p0.y;
      signedArea2 += cross;
      cx += (p0.x + p1.x) * cross;
      cy += (p0.y + p1.y) * cross;
    }
    const area = Math.abs(signedArea2) * 0.5;
    if (area < 1e-4) {
      let sx = 0;
      let sy = 0;
      for (const p of poly) {
        sx += p.x;
        sy += p.y;
      }
      return { areaM2: 0, centroid: { x: sx / poly.length, y: sy / poly.length } };
    }
    const factor = 1 / (3 * signedArea2);
    return {
      areaM2: Math.round(area * 10) / 10,
      centroid: { x: cx * factor, y: cy * factor }
    };
  }

  /**
   * Computes 2.5m x 5.0m parking stalls aligned with the longest polygon edge,
   * separated by 6.0m two-way circulation aisles, inset safely inside the polygon boundary.
   */
  public static computeParkingLotLayout(poly: Vec2D[]): {
    areaM2: number;
    centroid: Vec2D;
    longestEdgeIndex: number;
    axisU: Vec2D;
    axisV: Vec2D;
    stalls: { center: Vec2D; facingSign: 1 | -1 }[];
    aisles: { start: Vec2D; end: Vec2D }[];
    badgeText: string;
  } {
    const { areaM2, centroid } = LotManager.computePolygonAreaAndCentroid(poly);
    if (!poly || poly.length < 3 || areaM2 < 12) {
      return {
        areaM2,
        centroid,
        longestEdgeIndex: 0,
        axisU: { x: 1, y: 0 },
        axisV: { x: 0, y: 1 },
        stalls: [],
        aisles: [],
        badgeText: LotManager.formatParkingBadgeText(areaM2, 0)
      };
    }

    // 1. Find longest polygon edge
    let longestEdgeIndex = 0;
    let maxEdgeLen = -1;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len > maxEdgeLen) {
        maxEdgeLen = len;
        longestEdgeIndex = i;
      }
    }
    const pA = poly[longestEdgeIndex];
    const pB = poly[(longestEdgeIndex + 1) % poly.length];
    const eLen = Math.max(1e-4, Math.hypot(pB.x - pA.x, pB.y - pA.y));
    const axisU: Vec2D = { x: (pB.x - pA.x) / eLen, y: (pB.y - pA.y) / eLen };
    const axisV: Vec2D = { x: -axisU.y, y: axisU.x };

    const toLocal = (w: Vec2D) => {
      const dx = w.x - centroid.x;
      const dy = w.y - centroid.y;
      return { u: dx * axisU.x + dy * axisU.y, v: dx * axisV.x + dy * axisV.y };
    };
    const toWorld = (u: number, v: number): Vec2D => ({
      x: centroid.x + u * axisU.x + v * axisV.x,
      y: centroid.y + u * axisU.y + v * axisV.y
    });

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const p of poly) {
      const loc = toLocal(p);
      minU = Math.min(minU, loc.u);
      maxU = Math.max(maxU, loc.u);
      minV = Math.min(minV, loc.v);
      maxV = Math.max(maxV, loc.v);
    }

    const STALL_W = 2.5;
    const STALL_D = 5.0;
    const AISLE_W = 6.0;
    const MARGIN = 0.65;

    const isInsideWithMargin = (pt: Vec2D, margin: number): boolean => {
      if (!PolygonMath.isPointInPolygon(pt, poly)) return false;
      if (margin <= 0) return true;
      for (let i = 0; i < poly.length; i++) {
        const d = PolygonMath.distancePointToSegment(pt, poly[i], poly[(i + 1) % poly.length]);
        if (d < margin) return false;
      }
      return true;
    };

    const stalls: { center: Vec2D; facingSign: 1 | -1 }[] = [];
    const aisles: { start: Vec2D; end: Vec2D }[] = [];

    const spanV = maxV - minV - MARGIN * 2;
    const rowSpecs: { vCenter: number; facingSign: 1 | -1 }[] = [];
    const aisleVs: number[] = [];

    if (spanV >= STALL_D * 2 + AISLE_W) {
      // Double-loaded module repeating every (STALL_D + AISLE_W + STALL_D = 16m)
      let cursorV = minV + MARGIN;
      while (cursorV + STALL_D <= maxV - MARGIN + 0.05) {
        // Bottom stall row facing +V into aisle
        rowSpecs.push({ vCenter: cursorV + STALL_D * 0.5, facingSign: 1 });
        cursorV += STALL_D;

        if (cursorV + AISLE_W <= maxV - MARGIN + 0.5) {
          aisleVs.push(cursorV + AISLE_W * 0.5);
          cursorV += AISLE_W;

          if (cursorV + STALL_D <= maxV - MARGIN + 0.05) {
            // Top stall row facing -V into aisle
            rowSpecs.push({ vCenter: cursorV + STALL_D * 0.5, facingSign: -1 });
            cursorV += STALL_D + 0.6; // Buffer island between bays
          }
        } else {
          break;
        }
      }
    } else if (spanV >= STALL_D) {
      // Single-loaded row + circulation lane
      const vRow = minV + MARGIN + STALL_D * 0.5;
      rowSpecs.push({ vCenter: vRow, facingSign: 1 });
      if (maxV - (minV + MARGIN + STALL_D) >= 3.5) {
        aisleVs.push(minV + MARGIN + STALL_D + Math.min(AISLE_W * 0.5, (maxV - (minV + MARGIN + STALL_D)) * 0.5));
      }
    }

    for (const row of rowSpecs) {
      for (let u = minU + MARGIN + STALL_W * 0.5; u <= maxU - MARGIN - STALL_W * 0.5 + 0.01; u += STALL_W) {
        const hw = STALL_W * 0.48;
        const hd = STALL_D * 0.48;
        const c0 = toWorld(u - hw, row.vCenter - hd);
        const c1 = toWorld(u + hw, row.vCenter - hd);
        const c2 = toWorld(u + hw, row.vCenter + hd);
        const c3 = toWorld(u - hw, row.vCenter + hd);
        if (
          isInsideWithMargin(c0, 0.35) &&
          isInsideWithMargin(c1, 0.35) &&
          isInsideWithMargin(c2, 0.35) &&
          isInsideWithMargin(c3, 0.35)
        ) {
          stalls.push({ center: toWorld(u, row.vCenter), facingSign: row.facingSign });
        }
      }
    }

    for (const av of aisleVs) {
      let firstU: number | null = null;
      let lastU: number | null = null;
      for (let u = minU + 1.5; u <= maxU - 1.5; u += 1.0) {
        const wPt = toWorld(u, av);
        if (isInsideWithMargin(wPt, 0.8)) {
          if (firstU === null) firstU = u;
          lastU = u;
        }
      }
      if (firstU !== null && lastU !== null && lastU - firstU >= 4.0) {
        aisles.push({ start: toWorld(firstU, av), end: toWorld(lastU, av) });
      }
    }

    return {
      areaM2,
      centroid,
      longestEdgeIndex,
      axisU,
      axisV,
      stalls,
      aisles,
      badgeText: LotManager.formatParkingBadgeText(areaM2, stalls.length)
    };
  }

  public createPolygonLot(
    polygonPoints: Vec2D[],
    zone: ZoneType = 'parking_lot'
  ): LotParcel {
    const cleanPoly = polygonPoints.map((p) => ({ x: p.x, y: p.y }));
    const { areaM2, centroid } = LotManager.computePolygonAreaAndCentroid(cleanPoly);
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of cleanPoly) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minZ = Math.min(minZ, p.y);
      maxZ = Math.max(maxZ, p.y);
    }
    const width = Math.max(4, maxX - minX);
    const length = Math.max(4, maxZ - minZ);
    const id = `lot_${this.nextLotId++}`;

    const parcel: LotParcel = {
      id,
      name: zone === 'parking_lot' ? `Parkir Terpadu #${this.nextLotId - 1}` : `Kavling #${this.nextLotId - 1}`,
      zone,
      position: new THREE.Vector3(centroid.x, 0, centroid.y),
      width,
      length,
      areaM2: Math.max(16, areaM2),
      polygon: cleanPoly,
      containedBuildingIds: [],
      metrics: {
        groundFootprintM2: 0,
        totalFloorAreaM2: 0,
        greenAreaM2: Math.round(areaM2 * 0.16),
        pavedAreaM2: Math.round(areaM2 * 0.84),
        kdbPercent: 0,
        klbRatio: 0,
        kdhPercent: 16,
        gsbFrontActualM: 1.5,
        gsbSideActualM: 1.5,
        gsbRearActualM: 1.5,
        gsbDistanceM: 1.5,
        maxFloors: 0
      },
      violations: []
    };

    this.lots.set(id, parcel);
    this.evaluateBuildingCode(parcel);
    this.rebuildLotMesh(parcel);
    if (this.onLotsUpdated) this.onLotsUpdated();
    return parcel;
  }

  public createLot(
    position: THREE.Vector3,
    width: number,
    length: number,
    zone: ZoneType = 'residential'
  ): LotParcel {
    const id = `lot_${this.nextLotId++}`;
    const areaM2 = width * length;

    const parcel: LotParcel = {
      id,
      name: `Kavling #${this.nextLotId - 1}`,
      zone,
      position: position.clone(),
      width,
      length,
      areaM2,
      containedBuildingIds: [],
      metrics: {
        groundFootprintM2: 0,
        totalFloorAreaM2: 0,
        greenAreaM2: 0,
        pavedAreaM2: areaM2,
        kdbPercent: 0,
        klbRatio: 0,
        kdhPercent: 0,
        gsbFrontActualM: 4.0,
        gsbSideActualM: 3.0,
        gsbRearActualM: 3.0,
        gsbDistanceM: 4.0,
        maxFloors: 0
      },
      violations: []
    };

    this.lots.set(id, parcel);
    this.evaluateBuildingCode(parcel);
    this.rebuildLotMesh(parcel);

    if (this.onLotsUpdated) this.onLotsUpdated();
    return parcel;
  }

  public removeLot(id: string): boolean {
    if (!this.lots.has(id)) return false;

    const group = this.lotMeshGroups.get(id);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.lotMeshGroups.delete(id);
    }

    if (this.selectedLotId === id) {
      this.selectedLotId = null;
      if (this.onSelectionChanged) this.onSelectionChanged();
    }

    this.lots.delete(id);
    if (this.onLotsUpdated) this.onLotsUpdated();
    return true;
  }

  public setLotZone(lotId: string, newZone: ZoneType): void {
    const lot = this.lots.get(lotId);
    if (!lot) return;

    lot.zone = newZone;
    this.evaluateBuildingCode(lot);
    this.rebuildLotMesh(lot);
    if (this.onLotsUpdated) this.onLotsUpdated();
  }

  /**
   * Get 2D lot boundary corners in world coordinate space (counter-clockwise).
   * Edge 0: C0 -> C1 (North / top edge)
   * Edge 1: C1 -> C2 (East / right edge)
   * Edge 2: C2 -> C3 (South / bottom edge)
   * Edge 3: C3 -> C0 (West / left edge)
   */
  public getLotCorners2D(lot: LotParcel): Vec2D[] {
    if (lot.polygon && lot.polygon.length >= 3) {
      return lot.polygon;
    }
    const hw = lot.width * 0.5;
    const hl = lot.length * 0.5;
    const cx = lot.position.x;
    const cz = lot.position.z;

    return [
      { x: cx - hw, y: cz - hl }, // C0: North-West
      { x: cx + hw, y: cz - hl }, // C1: North-East
      { x: cx + hw, y: cz + hl }, // C2: South-East
      { x: cx - hw, y: cz + hl }, // C3: South-West
    ];
  }

  /**
   * Identifies lot edges and detects which edge faces the nearest road (Front Edge).
   * Returns indices: front, rear, side1, side2.
   */
  public getLotEdgeClassification(lot: LotParcel): {
    frontIdx: number;
    rearIdx: number;
    sideIndices: number[];
  } {
    const corners = this.getLotCorners2D(lot);
    const n = corners.length;
    let frontIdx = Math.min(2, n - 1);

    if (this.roadManager && this.roadManager.graph.edges.size > 0) {
      let minDistanceToRoad = Infinity;

      for (let i = 0; i < n; i++) {
        const p1 = corners[i];
        const p2 = corners[(i + 1) % n];
        const edgeMid = { x: (p1.x + p2.x) * 0.5, y: (p1.y + p2.y) * 0.5 };

        for (const edge of this.roadManager.graph.edges.values()) {
          const sNode = this.roadManager.graph.nodes.get(edge.startNodeId);
          const eNode = this.roadManager.graph.nodes.get(edge.endNodeId);
          if (!sNode || !eNode) continue;

          const segA = { x: sNode.position.x, y: sNode.position.z };
          const segB = { x: eNode.position.x, y: eNode.position.z };
          const dist = PolygonMath.distancePointToSegment(edgeMid, segA, segB);

          if (dist < minDistanceToRoad) {
            minDistanceToRoad = dist;
            frontIdx = i;
          }
        }
      }
    }

    const rearIdx = (frontIdx + Math.max(1, Math.floor(n / 2))) % n;
    const sideIndices = [(frontIdx + 1) % n, (frontIdx + n - 1) % n];

    return { frontIdx, rearIdx, sideIndices };
  }

  public evaluateBuildingCode(lot: LotParcel): void {
    if (lot.zone === 'parking_lot') {
      const poly = this.getLotCorners2D(lot);
      const layout = LotManager.computeParkingLotLayout(poly);
      lot.areaM2 = Math.max(16, layout.areaM2);
      lot.parkingCapacity = layout.stalls.length;
      lot.userData = {
        ...(lot.userData || {}),
        parkingCapacity: layout.stalls.length,
        infoBadgeText: layout.badgeText
      };
      const greenM2 = Math.round(lot.areaM2 * 0.16);
      lot.metrics = {
        groundFootprintM2: 0,
        totalFloorAreaM2: 0,
        greenAreaM2: greenM2,
        pavedAreaM2: Math.max(0, lot.areaM2 - greenM2),
        kdbPercent: 0,
        klbRatio: 0,
        kdhPercent: 16,
        gsbFrontActualM: 1.5,
        gsbSideActualM: 1.5,
        gsbRearActualM: 1.5,
        gsbDistanceM: 1.5,
        maxFloors: 0
      };
      lot.violations = [];
      return;
    }

    const rule = ZONE_RULES[lot.zone];
    const lotCorners = this.getLotCorners2D(lot);
    const { frontIdx, rearIdx, sideIndices } = this.getLotEdgeClassification(lot);

    // Edges of the lot
    const lotEdges = lotCorners.map((pt, idx) => ({
      start: pt,
      end: lotCorners[(idx + 1) % lotCorners.length]
    }));

    const insideBuildingIds: string[] = [];
    let groundArea = 0;
    let totalFloorArea = 0;
    let highestFloor = 0;

    let minGsbFront = Infinity;
    let minGsbSide = Infinity;
    let minGsbRear = Infinity;

    const violations: BuildingCodeViolation[] = [];

    // Find and evaluate all buildings against this lot's polygon footprint
    for (const bld of this.buildingManager.buildings.values()) {
      const bldFootprint = BuildingManager.getBuildingWorldFootprint(bld);
      if (bldFootprint.length < 3) continue;

      const bldPoly: Vec2D[] = bldFootprint.map((p) => ({ x: p.x, y: p.y }));

      // Check how many vertices are inside this lot
      let insideCount = 0;
      for (const v of bldPoly) {
        if (PolygonMath.isPointInPolygon(v, lotCorners)) {
          insideCount++;
        }
      }

      // Check if center or any part is inside lot
      const bldCenter: Vec2D = { x: bld.position.x, y: bld.position.z };
      const centerInside = PolygonMath.isPointInPolygon(bldCenter, lotCorners);

      if (insideCount > 0 || centerInside) {
        insideBuildingIds.push(bld.id);

        const bldGround = BuildingManager.getBuildingGroundArea(bld);
        const bldTotal = BuildingManager.getBuildingTotalFloorArea(bld);
        groundArea += bldGround;
        totalFloorArea += bldTotal;
        highestFloor = Math.max(highestFloor, bld.floorCount);

        // Check OUT_OF_BOUNDS or CROSS_LOTS
        if (insideCount < bldPoly.length) {
          // Check if outer vertices fall into another lot
          let fallsIntoOtherLot = false;
          for (const otherLot of this.lots.values()) {
            if (otherLot.id === lot.id) continue;
            const otherCorners = this.getLotCorners2D(otherLot);
            for (const v of bldPoly) {
              if (PolygonMath.isPointInPolygon(v, otherCorners)) {
                fallsIntoOtherLot = true;
                break;
              }
            }
            if (fallsIntoOtherLot) break;
          }

          if (fallsIntoOtherLot) {
            violations.push({
              code: 'CROSS_LOTS',
              title: 'Bangunan Melintasi Batas Kavling',
              actual: 'Melintasi 2 kavling',
              allowed: '1 kavling utuh',
              message: `Bangunan '${bld.name}' berdiri melintasi dua kavling berbeda.`,
              advice: 'Posisikan bangunan seutuhnya dalam satu kepemilikan kavling atau satukan kavling terlebih dahulu.'
            });
          } else {
            violations.push({
              code: 'OUT_OF_BOUNDS',
              title: 'Bangunan Keluar Batas Kavling',
              actual: 'Menjorok ke luar',
              allowed: 'Dalam kavling',
              message: `Sebagian tapak bangunan '${bld.name}' menjorok keluar dari batas kavling.`,
              advice: 'Kecilkan ukuran bangunan atau geser posisinya agar seluruh tapak berada di dalam kavling.'
            });
          }
        }

        // Measure GSB: Shortest distance to Front, Side, and Rear edges
        const dFront = PolygonMath.minDistancePolygonToSegment(
          bldPoly,
          lotEdges[frontIdx].start,
          lotEdges[frontIdx].end
        );
        const dRear = PolygonMath.minDistancePolygonToSegment(
          bldPoly,
          lotEdges[rearIdx].start,
          lotEdges[rearIdx].end
        );
        const dSide = Math.min(
          PolygonMath.minDistancePolygonToSegment(bldPoly, lotEdges[sideIndices[0]].start, lotEdges[sideIndices[0]].end),
          PolygonMath.minDistancePolygonToSegment(bldPoly, lotEdges[sideIndices[1]].start, lotEdges[sideIndices[1]].end)
        );

        if (dFront < minGsbFront) minGsbFront = dFront;
        if (dSide < minGsbSide) minGsbSide = dSide;
        if (dRear < minGsbRear) minGsbRear = dRear;
      }
    }

    lot.containedBuildingIds = insideBuildingIds;

    // Evaluate true green area from LandscapeManager (unmarked space is paved, not green)
    const walkwayArea = this.buildingManager && typeof (this.buildingManager as any).getWalkwayAreaInLot === 'function'
      ? (this.buildingManager as any).getWalkwayAreaInLot(lot)
      : 0;
    const rawGreenArea = this.landscapeManager ? this.landscapeManager.getGreenAreaInLot(lot) : 0;
    const greenArea = Math.max(0, rawGreenArea - walkwayArea);
    const pavedArea = Math.max(0, lot.areaM2 - groundArea - greenArea);

    const kdb = Math.min(100, Math.round((groundArea / lot.areaM2) * 100));
    const klb = parseFloat((totalFloorArea / lot.areaM2).toFixed(2));
    const kdh = Math.min(100, Math.round((greenArea / lot.areaM2) * 100));

    const gsbFrontActual = isFinite(minGsbFront) ? parseFloat(minGsbFront.toFixed(1)) : lot.length * 0.5;
    const gsbSideActual = isFinite(minGsbSide) ? parseFloat(minGsbSide.toFixed(1)) : lot.width * 0.5;
    const gsbRearActual = isFinite(minGsbRear) ? parseFloat(minGsbRear.toFixed(1)) : lot.length * 0.5;
    const gsbMinOverall = Math.min(gsbFrontActual, gsbSideActual, gsbRearActual);

    lot.metrics = {
      groundFootprintM2: groundArea,
      totalFloorAreaM2: totalFloorArea,
      greenAreaM2: greenArea,
      pavedAreaM2: pavedArea,
      walkwayAreaM2: walkwayArea,
      kdbPercent: kdb,
      klbRatio: klb,
      kdhPercent: kdh,
      gsbFrontActualM: gsbFrontActual,
      gsbSideActualM: gsbSideActual,
      gsbRearActualM: gsbRearActual,
      gsbDistanceM: gsbMinOverall,
      maxFloors: highestFloor
    };

    // 1. KDB violation
    if (kdb > rule.maxKDB) {
      violations.push({
        code: 'KDB',
        title: 'Pelanggaran KDB (Kepadatan Lahan Berlebih)',
        actual: `${kdb}%`,
        allowed: `maks ${rule.maxKDB}%`,
        message: `KDB ${kdb}% melebihi batas zonasi ${rule.maxKDB}%. Lahan terlalu padat tertutup bangunan.`,
        advice: 'Kecilkan denah bangunan atau sisakan ruang terbuka agar resapan air hujan optimal.'
      });
    }

    // 2. KLB violation
    if (klb > rule.maxKLB) {
      violations.push({
        code: 'KLB',
        title: 'Pelanggaran KLB (Kapasitas Lantai Berlebih)',
        actual: `${klb}`,
        allowed: `maks ${rule.maxKLB}`,
        message: `KLB ${klb} melebihi batas zonasi ${rule.maxKLB}. Luas lantai total terlalu masif untuk daya dukung lingkungan.`,
        advice: 'Kurangi jumlah lantai atau kurangi luas lantai atas (buat teras/setback).'
      });
    }

    // 3. KDH violation (true green area test)
    if (kdh < rule.minKDH) {
      violations.push({
        code: 'KDH',
        title: 'Kekurangan Ruang Terbuka Hijau (KDH)',
        actual: `${kdh}%`,
        allowed: `min ${rule.minKDH}%`,
        message: `KDH ${kdh}% kurang dari syarat minimum ${rule.minKDH}%. Sisa lahan tanpa lansekap dihitung sebagai perkerasan.`,
        advice: 'Tanam pohon peneduh atau buat taman berumput menggunakan alat Lansekap.'
      });
    }

    // 4. Height violation
    if (highestFloor > rule.maxFloors) {
      violations.push({
        code: 'HEIGHT',
        title: 'Tinggi Bangunan Melebihi Batas',
        actual: `${highestFloor} lantai`,
        allowed: `maks ${rule.maxFloors} lantai`,
        message: `Tinggi ${highestFloor} lantai melebihi batas zonasi ${rule.maxFloors} lantai.`,
        advice: 'Pangkas jumlah lantai agar sesuai dengan karakter kawasan peruntukan.'
      });
    }

    // 5. GSB Front violation
    if (insideBuildingIds.length > 0 && gsbFrontActual < rule.minGSBFront) {
      violations.push({
        code: 'GSB_FRONT',
        title: 'Pelanggaran GSB Depan (Menjorok ke Jalan)',
        actual: `${gsbFrontActual} m`,
        allowed: `min ${rule.minGSBFront} m`,
        message: `Jarak dinding ke sisi jalan ${gsbFrontActual}m lebih kecil dari sempadan jalan minimum ${rule.minGSBFront}m.`,
        advice: 'Mundurkan bangunan dari arah jalan agar berada di belakang garis sempadan muka.'
      });
    }

    // 6. GSB Side violation
    if (insideBuildingIds.length > 0 && gsbSideActual < rule.minGSBSide) {
      violations.push({
        code: 'GSB_SIDE',
        title: 'Pelanggaran GSB Samping (Terlalu Rapat Tetangga)',
        actual: `${gsbSideActual} m`,
        allowed: `min ${rule.minGSBSide} m`,
        message: `Jarak samping ${gsbSideActual}m lebih kecil dari jarak bebas samping minimum ${rule.minGSBSide}m.`,
        advice: 'Sisakan celah samping untuk sirkulasi udara alami dan jalur evakuasi kebakaran.'
      });
    }

    // 7. GSB Rear violation
    if (insideBuildingIds.length > 0 && gsbRearActual < rule.minGSBRear) {
      violations.push({
        code: 'GSB_REAR',
        title: 'Pelanggaran GSB Belakang',
        actual: `${gsbRearActual} m`,
        allowed: `min ${rule.minGSBRear} m`,
        message: `Jarak belakang ${gsbRearActual}m lebih kecil dari sempadan belakang minimum ${rule.minGSBRear}m.`,
        advice: 'Sisakan halaman belakang untuk ruang terbuka dan resapan air.'
      });
    }

    // 8. GSS (Garis Sempadan Sungai) Check (Permen PUPR No. 28/PRT/M/2015)
    if (this.landscapeManager && insideBuildingIds.length > 0) {
      let minRiverDistance = Infinity;
      for (const item of this.landscapeManager.items.values()) {
        if (item.type === 'river_segment') {
          const rW = item.width || 12;
          const rL = item.length || 24;
          for (const bldId of insideBuildingIds) {
            const bld = this.buildingManager.buildings.get(bldId);
            if (bld) {
              const dx = Math.max(0, Math.abs(bld.position.x - item.position.x) - (rW / 2 + bld.width / 2));
              const dz = Math.max(0, Math.abs(bld.position.z - item.position.z) - (rL / 2 + bld.length / 2));
              const d = Math.hypot(dx, dz);
              if (d < minRiverDistance) minRiverDistance = d;
            }
          }
        }
      }

      if (minRiverDistance < 10.0) {
        violations.push({
          code: 'GSS',
          title: 'Pelanggaran Garis Sempadan Sungai (GSS)',
          actual: `${minRiverDistance.toFixed(1)} m`,
          allowed: 'min 10.0 m',
          message: `Jarak bangunan ke tepi alur sungai (${minRiverDistance.toFixed(1)} m) kurang dari batas sempadan 10.0 m (Permen PUPR No. 28/PRT/M/2015).`,
          advice: 'Mundurkan tapak bangunan minimal 10 meter dari tepi sungai dan pertahankan sabuk hijau sempadan.'
        });
      }
    }

    lot.violations = violations;
  }

  public evaluateAllLots(): void {
    for (const lot of this.lots.values()) {
      this.evaluateBuildingCode(lot);
      this.rebuildLotMesh(lot);
    }
    if (this.buildingManager && typeof (this.buildingManager as any).updateArcadeCanopies === 'function') {
      (this.buildingManager as any).updateArcadeCanopies();
    }
  }

  private createParkedCarSilhouette(colorHex: number): THREE.Group {
    const car = new THREE.Group();
    car.name = 'ParkedCarSilhouette';

    const bodyMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.35,
      metalness: 0.25
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.6
    });
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
      metalness: 0.1
    });

    // Lower chassis (1.82m wide x 4.2m long)
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.56, 4.2), bodyMat);
    chassis.position.set(0, 0.42, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    car.add(chassis);

    // Cabin greenhouse
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.50, 2.15), glassMat);
    cabin.position.set(0, 0.92, -0.15);
    cabin.castShadow = true;
    car.add(cabin);

    // Roof cap
    const roofCap = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.08, 1.90), bodyMat);
    roofCap.position.set(0, 1.18, -0.15);
    car.add(roofCap);

    // Four wheels
    const wheelGeom = new THREE.CylinderGeometry(0.30, 0.30, 0.22, 12);
    wheelGeom.rotateZ(Math.PI / 2);
    const wheelOffsets = [
      [-0.86, 0.30, 1.28],
      [0.86, 0.30, 1.28],
      [-0.86, 0.30, -1.28],
      [0.86, 0.30, -1.28]
    ];
    for (const [wx, wy, wz] of wheelOffsets) {
      const w = new THREE.Mesh(wheelGeom, wheelMat);
      w.position.set(wx, wy, wz);
      car.add(w);
    }

    return car;
  }

  private createParkingGardenLamp(): THREE.Group {
    const lamp = new THREE.Group();
    lamp.name = 'ParkingLightPole';

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.45,
      metalness: 0.65
    });
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef3c7 });

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 4.4, 10), poleMat);
    pole.position.set(0, 2.2, 0);
    pole.castShadow = true;
    lamp.add(pole);

    const crossArm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 0.12), poleMat);
    crossArm.position.set(0, 4.38, 0);
    lamp.add(crossArm);

    for (const side of [-0.52, 0.52]) {
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.22), poleMat);
      head.position.set(side, 4.35, 0);
      lamp.add(head);

      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.16), bulbMat);
      lens.rotateX(Math.PI / 2);
      lens.position.set(side, 4.30, 0);
      lamp.add(lens);
    }

    return lamp;
  }

  private buildParkingLotMeshGroup(lot: LotParcel, group: THREE.Group): void {
    const poly = this.getLotCorners2D(lot);
    const layout = LotManager.computeParkingLotLayout(poly);
    lot.areaM2 = Math.max(16, layout.areaM2);
    lot.parkingCapacity = layout.stalls.length;
    lot.userData = {
      ...(lot.userData || {}),
      parkingCapacity: layout.stalls.length,
      infoBadgeText: layout.badgeText
    };

    const cx = lot.position.x;
    const cz = lot.position.z;

    // 1. Dark-Grey Smooth Parking Asphalt Polygon
    const shape = new THREE.Shape();
    poly.forEach((pt, idx) => {
      const lx = pt.x - cx;
      const ly = -(pt.y - cz);
      if (idx === 0) shape.moveTo(lx, ly);
      else shape.lineTo(lx, ly);
    });
    shape.closePath();

    const asphaltGeom = new THREE.ShapeGeometry(shape);
    asphaltGeom.rotateX(-Math.PI / 2);
    const asphaltMat = new THREE.MeshStandardMaterial({
      color: 0x2c3543,
      roughness: 0.86,
      metalness: 0.04,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    });
    const asphaltMesh = new THREE.Mesh(asphaltGeom, asphaltMat);
    asphaltMesh.name = 'ParkingAsphaltSurface';
    asphaltMesh.position.y = 0.015;
    asphaltMesh.receiveShadow = true;
    group.add(asphaltMesh);

    // Identify nearest road edge for entrance apron & curb cut
    const { frontIdx } = this.getLotEdgeClassification(lot);
    const frontA = poly[frontIdx];
    const frontB = poly[(frontIdx + 1) % poly.length];
    const frontMid: Vec2D = { x: (frontA.x + frontB.x) * 0.5, y: (frontA.y + frontB.y) * 0.5 };

    // 2. Crisp White Concrete Perimeter Curbs (with 6.0m entrance opening on front edge)
    const curbMat = new THREE.MeshStandardMaterial({
      color: 0xeef2f6,
      roughness: 0.72,
      metalness: 0.05
    });
    const curbGroup = new THREE.Group();
    curbGroup.name = 'ParkingPerimeterCurb';

    const addCurbSegment = (a: Vec2D, b: Vec2D) => {
      const dx = b.x - a.x;
      const dz = b.y - a.y;
      const segLen = Math.hypot(dx, dz);
      if (segLen < 0.25) return;
      const segMesh = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, segLen), curbMat);
      segMesh.position.set(((a.x + b.x) * 0.5) - cx, 0.10, ((a.y + b.y) * 0.5) - cz);
      segMesh.rotation.y = Math.atan2(dx, dz);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      curbGroup.add(segMesh);
    };

    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const edgeLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (i === frontIdx && edgeLen > 7.5) {
        const halfGapRatio = Math.min(0.4, 3.0 / edgeLen);
        const g1: Vec2D = {
          x: THREE.MathUtils.lerp(a.x, b.x, 0.5 - halfGapRatio),
          y: THREE.MathUtils.lerp(a.y, b.y, 0.5 - halfGapRatio)
        };
        const g2: Vec2D = {
          x: THREE.MathUtils.lerp(a.x, b.x, 0.5 + halfGapRatio),
          y: THREE.MathUtils.lerp(a.y, b.y, 0.5 + halfGapRatio)
        };
        addCurbSegment(a, g1);
        addCurbSegment(g2, b);
      } else {
        addCurbSegment(a, b);
      }
    }
    group.add(curbGroup);

    // 3. Green Landscaped Corner Planter Islands
    const planterGrassMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.88,
      metalness: 0.02
    });
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x388e3c,
      roughness: 0.82,
      metalness: 0.02
    });

    for (let i = 0; i < poly.length; i++) {
      const corner = poly[i];
      const toC = { x: layout.centroid.x - corner.x, y: layout.centroid.y - corner.y };
      const distToC = Math.hypot(toC.x, toC.y);
      if (distToC < 3.2) continue;
      const insetX = corner.x + (toC.x / distToC) * 1.55;
      const insetZ = corner.y + (toC.y / distToC) * 1.55;
      if (!PolygonMath.isPointInPolygon({ x: insetX, y: insetZ }, poly)) continue;

      const island = new THREE.Group();
      island.name = 'CornerPlanterIsland';
      island.position.set(insetX - cx, 0.02, insetZ - cz);

      const ringCurb = new THREE.Mesh(new THREE.CylinderGeometry(1.08, 1.14, 0.20, 14), curbMat);
      ringCurb.position.y = 0.10;
      island.add(ringCurb);

      const turf = new THREE.Mesh(new THREE.CylinderGeometry(0.96, 0.96, 0.22, 14), planterGrassMat);
      turf.position.y = 0.11;
      island.add(turf);

      const shrub = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 1), bushMat);
      shrub.scale.set(1.15, 0.85, 1.15);
      shrub.position.y = 0.56;
      shrub.castShadow = true;
      island.add(shrub);

      group.add(island);
    }

    // 4. Entrance Apron Connecting to Nearest Road
    const fDx = frontB.x - frontA.x;
    const fDz = frontB.y - frontA.y;
    const fLen = Math.max(1e-4, Math.hypot(fDx, fDz));
    let outNx = -fDz / fLen;
    let outNz = fDx / fLen;
    // Ensure normal points outward from centroid
    if ((frontMid.x - layout.centroid.x) * outNx + (frontMid.y - layout.centroid.y) * outNz < 0) {
      outNx = -outNx;
      outNz = -outNz;
    }

    let apronLen = 3.2;
    if (this.roadManager) {
      const sample = this.roadManager.getNearestRoadSample(new THREE.Vector2(frontMid.x, frontMid.y));
      if (sample && sample.distance < 24) {
        apronLen = Math.max(2.0, Math.min(12.0, sample.distance - sample.asphaltHalfWidth + 0.35));
      }
    }

    const apronGroup = new THREE.Group();
    apronGroup.name = 'ParkingEntranceApron';
    apronGroup.position.set(
      frontMid.x + outNx * (apronLen * 0.5) - cx,
      0.02,
      frontMid.y + outNz * (apronLen * 0.5) - cz
    );
    apronGroup.rotation.y = Math.atan2(outNx, outNz);

    const apronSlab = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.05, apronLen), asphaltMat);
    apronSlab.receiveShadow = true;
    apronGroup.add(apronSlab);
    group.add(apronGroup);

    // 5. Procedural 2.5m x 5.0m White Stall Lines, Circulation Arrows, Lamps & Low-Poly Cars
    const lineMat = new THREE.MeshBasicMaterial({
      color: 0xf8fafc,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const stallPositions: number[] = [];
    const stallIndices: number[] = [];
    let sVert = 0;

    const pushWorldQuad = (centerW: Vec2D, halfU: number, halfV: number, yLocal: number) => {
      const ux = layout.axisU.x;
      const uz = layout.axisU.y;
      const vx = layout.axisV.x;
      const vz = layout.axisV.y;

      const cornersLocal = [
        [-halfU, -halfV],
        [halfU, -halfV],
        [halfU, halfV],
        [-halfU, halfV]
      ];
      const base = sVert;
      for (const [cu, cv] of cornersLocal) {
        const wx = centerW.x + cu * ux + cv * vx - cx;
        const wz = centerW.y + cu * uz + cv * vz - cz;
        stallPositions.push(wx, yLocal, wz);
        sVert++;
      }
      stallIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };

    const CAR_PALETTE = [0xf8fafc, 0xcbd5e1, 0x072d59, 0x334155, 0xfd6e8e, 0x1e3a8a];
    const rowAngleY = Math.atan2(layout.axisV.x, layout.axisV.y);

    layout.stalls.forEach((stall, idx) => {
      const ux = layout.axisU.x;
      const uz = layout.axisU.y;
      const vx = layout.axisV.x;
      const vz = layout.axisV.y;

      // Left & right 5.0m stall divider lines (width 0.09m, length 5.0m)
      for (const sideU of [-1.25, 1.25]) {
        const lineCenter: Vec2D = {
          x: stall.center.x + sideU * ux,
          y: stall.center.y + sideU * uz
        };
        pushWorldQuad(lineCenter, 0.045, 2.48, 0.035);
      }
      // Rear wheel-stop line opposite facingSign
      const backV = -stall.facingSign * 2.45;
      pushWorldQuad(
        { x: stall.center.x + backV * vx, y: stall.center.y + backV * vz },
        1.25,
        0.05,
        0.035
      );

      // Spawn neatly parked 3D low-poly car silhouette in ~50% of stalls
      if ((idx * 7 + 3) % 10 < 5) {
        const carColor = CAR_PALETTE[idx % CAR_PALETTE.length];
        const car = this.createParkedCarSilhouette(carColor);
        car.position.set(stall.center.x - cx, 0.02, stall.center.y - cz);
        car.rotation.y = stall.facingSign > 0 ? rowAngleY : rowAngleY + Math.PI;
        group.add(car);
      }
    });

    if (stallPositions.length > 0) {
      const stallGeom = new THREE.BufferGeometry();
      stallGeom.setAttribute('position', new THREE.Float32BufferAttribute(stallPositions, 3));
      stallGeom.setIndex(stallIndices);
      stallGeom.computeVertexNormals();
      const stallMesh = new THREE.Mesh(stallGeom, lineMat);
      stallMesh.name = 'ParkingStallLines';
      group.add(stallMesh);
    }

    // Two-way circulation aisle arrows + garden lamps
    const arrowAngleY = Math.atan2(layout.axisU.x, layout.axisU.y);
    for (const aisle of layout.aisles) {
      const adx = aisle.end.x - aisle.start.x;
      const adz = aisle.end.y - aisle.start.y;
      const aLen = Math.hypot(adx, adz);
      const steps = Math.max(1, Math.floor(aLen / 11));

      for (let s = 0; s <= steps; s++) {
        const t = steps === 0 ? 0.5 : (s + 0.5) / (steps + 1);
        const ax = THREE.MathUtils.lerp(aisle.start.x, aisle.end.x, t) - cx;
        const az = THREE.MathUtils.lerp(aisle.start.y, aisle.end.y, t) - cz;

        for (const laneSign of [-1, 1]) {
          const arrowGroup = new THREE.Group();
          arrowGroup.name = 'CirculationArrow';
          arrowGroup.position.set(
            ax + layout.axisV.x * laneSign * 1.35,
            0.038,
            az + layout.axisV.y * laneSign * 1.35
          );
          arrowGroup.rotation.y = laneSign > 0 ? arrowAngleY : arrowAngleY + Math.PI;

          const shaft = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 1.8), lineMat);
          shaft.rotateX(-Math.PI / 2);
          arrowGroup.add(shaft);

          const headGeom = new THREE.ConeGeometry(0.45, 0.75, 3);
          headGeom.rotateX(Math.PI / 2);
          headGeom.scale(1, 0.05, 1);
          const head = new THREE.Mesh(headGeom, lineMat);
          head.position.set(0, 0, 1.15);
          arrowGroup.add(head);

          group.add(arrowGroup);
        }
      }

      // Garden lamp at aisle start & end
      const lampA = this.createParkingGardenLamp();
      lampA.position.set(aisle.start.x - cx, 0.02, aisle.start.y - cz);
      group.add(lampA);
      if (aLen >= 14) {
        const lampB = this.createParkingGardenLamp();
        lampB.position.set(aisle.end.x - cx, 0.02, aisle.end.y - cz);
        group.add(lampB);
      }
    }

    // Ensure at least one garden lamp even for compact lots
    if (layout.aisles.length === 0) {
      const lampCenter = this.createParkingGardenLamp();
      lampCenter.position.set(0, 0.02, 0);
      group.add(lampCenter);
    }

    // 6. Floating Indonesian Info Badge ("Luas 1.450 m2 - 32 Slot Parkir")
    let badgeTex: THREE.CanvasTexture | undefined;
    if (typeof document !== 'undefined') {
      try {
        const badgeCanvas = document.createElement('canvas');
        badgeCanvas.width = 860;
        badgeCanvas.height = 148;
        const bCtx = badgeCanvas.getContext('2d');
        if (bCtx) {
          bCtx.clearRect(0, 0, 860, 148);
          bCtx.beginPath();
          bCtx.fillStyle = '#072D59';
          if ((bCtx as any).roundRect) {
            (bCtx as any).roundRect(6, 6, 848, 136, 36);
          } else {
            bCtx.rect(6, 6, 848, 136);
          }
          bCtx.fill();
          bCtx.strokeStyle = '#FD6E8E';
          bCtx.lineWidth = 5;
          bCtx.stroke();

          bCtx.fillStyle = '#DBF2FC';
          bCtx.font = 'bold 42px "Plus Jakarta Sans", sans-serif';
          bCtx.textAlign = 'center';
          bCtx.textBaseline = 'middle';
          bCtx.fillText(layout.badgeText, 430, 74);

          badgeTex = new THREE.CanvasTexture(badgeCanvas);
          badgeTex.colorSpace = THREE.SRGBColorSpace;
        }
      } catch {
        // Ignore headless canvas context unavailability
      }
    }

    const badgeSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        ...(badgeTex ? { map: badgeTex } : { color: 0x072d59 }),
        depthTest: false,
        depthWrite: false,
        transparent: true
      })
    );
    badgeSprite.position.set(0, 5.4, 0);
    badgeSprite.scale.set(8.2, 1.42, 1.0);
    badgeSprite.name = 'ParkingInfoBadge';
    badgeSprite.userData = {
      isParkingInfoBadge: true,
      lotId: lot.id,
      badgeText: layout.badgeText
    };
    badgeSprite.renderOrder = 999;
    group.add(badgeSprite);
  }

  public rebuildLotMesh(lot: LotParcel): void {
    const existing = this.lotMeshGroups.get(lot.id);
    if (existing) {
      this.masterGroup.remove(existing);
      this.disposeGroup(existing);
    }

    const group = new THREE.Group();
    group.name = `Lot_${lot.id}`;
    group.position.set(lot.position.x, 0.03, lot.position.z);
    group.userData = { lotId: lot.id, type: 'lot', zone: lot.zone };

    if (lot.zone === 'parking_lot') {
      this.buildParkingLotMeshGroup(lot, group);
      this.masterGroup.add(group);
      this.lotMeshGroups.set(lot.id, group);
      return;
    }

    const rule = ZONE_RULES[lot.zone];
    const hasViolations = lot.violations.length > 0;
    const COLOR_BAD = 0xe11d48;
    const COLOR_GOOD = 0x30d158;

    // 1. Transparent tinted zone surface plane (reduced opacity for natural city look)
    const planeGeom = new THREE.PlaneGeometry(lot.width - 0.2, lot.length - 0.2);
    planeGeom.rotateX(-Math.PI / 2);

    const planeMat = new THREE.MeshBasicMaterial({
      color: hasViolations ? COLOR_BAD : (lot.userData?.grassColorHexInt || rule.colorHexInt),
      transparent: true,
      opacity: hasViolations ? 0.20 : 0.14,
      depthWrite: false
    });
    const surfaceMesh = new THREE.Mesh(planeGeom, planeMat);
    group.add(surfaceMesh);

    // 2. Lot Boundary Border Line (with opening for entrance gate if present)
    const hw = lot.width * 0.5;
    const hl = lot.length * 0.5;
    const borderSegments: THREE.Vector3[] = [];

    // Top: (-hw, -hl) -> (hw, -hl)
    borderSegments.push(new THREE.Vector3(-hw, 0.01, -hl), new THREE.Vector3(hw, 0.01, -hl));
    // Right: (hw, -hl) -> (hw, hl)
    borderSegments.push(new THREE.Vector3(hw, 0.01, -hl), new THREE.Vector3(hw, 0.01, hl));

    // Bottom (Front): check if gate opening
    if (lot.userData?.gateOpening) {
      const gateW = lot.userData.gateOpening.width || 1.4;
      const rawGateX = lot.userData.gateOpening.x - lot.position.x;
      const gateX = Math.max(-hw + 0.8, Math.min(hw - 0.8, rawGateX));
      const gMin = Math.max(-hw, gateX - gateW * 0.5);
      const gMax = Math.min(hw, gateX + gateW * 0.5);

      // (hw, hl) -> (gMax, hl)
      borderSegments.push(new THREE.Vector3(hw, 0.01, hl), new THREE.Vector3(gMax, 0.01, hl));
      // (gMin, hl) -> (-hw, hl)
      borderSegments.push(new THREE.Vector3(gMin, 0.01, hl), new THREE.Vector3(-hw, 0.01, hl));
    } else {
      borderSegments.push(new THREE.Vector3(hw, 0.01, hl), new THREE.Vector3(-hw, 0.01, hl));
    }

    // Left: (-hw, hl) -> (-hw, -hl)
    borderSegments.push(new THREE.Vector3(-hw, 0.01, hl), new THREE.Vector3(-hw, 0.01, -hl));

    const lineGeom = new THREE.BufferGeometry().setFromPoints(borderSegments);
    const lineMat = new THREE.LineBasicMaterial({
      color: hasViolations ? COLOR_BAD : rule.colorHexInt,
      linewidth: 2
    });
    const lineMesh = new THREE.LineSegments(lineGeom, lineMat);
    group.add(lineMesh);

    // 3. Setback (GSB) Envelope Line: Inward permissible building envelope
    const gsbFront = rule.minGSBFront || 3.0;
    const gsbSide = rule.minGSBSide || 1.5;
    const gsbRear = rule.minGSBRear || 2.0;

    const envLeft = -hw + gsbSide;
    const envRight = hw - gsbSide;
    const envTop = -hl + gsbRear;
    const envBottom = hl - gsbFront;

    if (envRight > envLeft && envBottom > envTop) {
      const setbackPoints = [
        new THREE.Vector3(envLeft, 0.045, envTop),
        new THREE.Vector3(envRight, 0.045, envTop),
        new THREE.Vector3(envRight, 0.045, envBottom),
        new THREE.Vector3(envLeft, 0.045, envBottom),
        new THREE.Vector3(envLeft, 0.045, envTop)
      ];
      const setbackGeom = new THREE.BufferGeometry().setFromPoints(setbackPoints);
      const isGsbViolated = lot.violations.some(v => v.code.startsWith('GSB'));
      const gsbColor = isGsbViolated ? COLOR_BAD : COLOR_GOOD;

      const setbackMat = new THREE.LineDashedMaterial({
        color: gsbColor,
        dashSize: 1.2,
        gapSize: 0.6,
        linewidth: 2.0,
        transparent: true,
        opacity: 0.85
      });
      const setbackLine = new THREE.Line(setbackGeom, setbackMat);
      setbackLine.computeLineDistances();
      setbackLine.renderOrder = 920;
      group.add(setbackLine);
    }

    // 4. Compact 3D Floating Violation Badge Elevated Above Roof
    if (hasViolations && typeof document !== 'undefined') {
      try {
        const badgeCanvas = document.createElement('canvas');
        badgeCanvas.width = 768;
        badgeCanvas.height = 144;
        const bCtx = badgeCanvas.getContext('2d');
        if (bCtx) {
          bCtx.fillStyle = '#DC2626';
          if ((bCtx as any).roundRect) {
            (bCtx as any).roundRect(6, 6, 756, 132, 28);
          } else {
            bCtx.rect(6, 6, 756, 132);
          }
          bCtx.fill();
          bCtx.strokeStyle = '#FFFFFF';
          bCtx.lineWidth = 4;
          bCtx.stroke();

          bCtx.fillStyle = '#FFFFFF';
          bCtx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
          bCtx.textAlign = 'center';
          bCtx.textBaseline = 'middle';
          const badgeText = lot.violations[0].title || 'Pelanggaran Regulasi';
          bCtx.fillText(badgeText, 384, 72);

          const badgeTex = new THREE.CanvasTexture(badgeCanvas);
          badgeTex.colorSpace = THREE.SRGBColorSpace;
          const spriteMat = new THREE.SpriteMaterial({
            map: badgeTex,
            depthTest: false,
            transparent: true
          });
          const badgeSprite = new THREE.Sprite(spriteMat);
          
          // Calculate height above any existing building on this lot
          let buildingH = 0;
          const bldId = lot.containedBuildingIds?.[0];
          if (bldId) {
            const bld = this.buildingManager.buildings.get(bldId);
            if (bld) {
              buildingH = (bld.floorCount || 1) * (bld.floorHeight || 3.5) + 3.0;
            }
          }
          const badgeY = Math.max(5.0, buildingH + 2.5);
          badgeSprite.position.set(0, badgeY, 0);
          badgeSprite.scale.set(6.8, 1.28, 1.0);
          badgeSprite.name = 'ViolationBadge';
          badgeSprite.userData = { isViolationBadge: true, lotId: lot.id };
          badgeSprite.visible = false;
          badgeSprite.renderOrder = 999;
          group.add(badgeSprite);
        }
      } catch (err) {
        // Ignore canvas errors in headless environments
      }
    }

    this.masterGroup.add(group);
    this.lotMeshGroups.set(lot.id, group);
  }

  /**
   * Updates lot mesh visibility based on active tool or layer toggle (Spec B1).
   * Default mode displays a pristine, clean city without noisy lot outlines.
   */
  public updateVisibility(
    activeToolName: string,
    forceOverlays: boolean = false,
    hoveredLotId: string | null = null
  ): void {
    const isToolNeedingLots =
      activeToolName === 'zone' || activeToolName === 'build' || activeToolName === 'analyze';
    const showAll = isToolNeedingLots || forceOverlays;

    for (const [lotId, group] of this.lotMeshGroups.entries()) {
      const isSelected = lotId === this.selectedLotId;
      const isHovered = lotId === hoveredLotId;
      const lot = this.lots.get(lotId);
      const isParkingLot = lot?.zone === 'parking_lot';
      const hasViolations = Boolean(lot && lot.violations && lot.violations.length > 0);

      if (isParkingLot || showAll || isSelected || isHovered) {
        group.visible = true;
      } else if (hasViolations && activeToolName === 'analyze') {
        group.visible = true;
      } else {
        group.visible = false;
      }

      const parkingBadge = group.getObjectByName('ParkingInfoBadge');
      if (parkingBadge) {
        parkingBadge.visible =
          isSelected || isHovered || activeToolName === 'zone' || activeToolName === 'analyze' || forceOverlays;
      }

      const badge = group.getObjectByName('ViolationBadge');
      if (badge) {
        const showBadge = isSelected || activeToolName === 'zone' || activeToolName === 'build' || forceOverlays;
        badge.visible = showBadge;
      }
    }
  }


  public selectLot(id: string | null): void {
    this.selectedLotId = id;
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public getSelectedLot(): LotParcel | null {
    if (!this.selectedLotId) return null;
    return this.lots.get(this.selectedLotId) || null;
  }

  public getLotForBuilding(buildingId: string): LotParcel | null {
    for (const lot of this.lots.values()) {
      if (lot.containedBuildingIds && lot.containedBuildingIds.includes(buildingId)) {
        return lot;
      }
    }
    const bld = this.buildingManager.buildings.get(buildingId);
    if (!bld) return null;

    // Check if building position is inside lot 2D bounding box
    for (const lot of this.lots.values()) {
      const hw = lot.width * 0.5;
      const hl = lot.length * 0.5;
      if (
        bld.position.x >= lot.position.x - hw &&
        bld.position.x <= lot.position.x + hw &&
        bld.position.z >= lot.position.z - hl &&
        bld.position.z <= lot.position.z + hl
      ) {
        return lot;
      }
    }

    let nearest: LotParcel | null = null;
    let minDist = Infinity;
    for (const lot of this.lots.values()) {
      const d = lot.position.distanceTo(bld.position);
      if (d < minDist) {
        minDist = d;
        nearest = lot;
      }
    }
    return nearest;
  }

  public getLotAtPosition(x: number, z: number): LotParcel | null {
    const pt = { x, y: z };
    for (const lot of this.lots.values()) {
      const corners = this.getLotCorners2D(lot);
      if (PolygonMath.isPointInPolygon(pt, corners)) {
        return lot;
      }
    }
    return null;
  }

  public findLotAtPosition(x: number, z: number): LotParcel | null {
    return this.getLotAtPosition(x, z);
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh || (child as THREE.Line).isLine) {
        const obj = child as THREE.Mesh;
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material?.dispose();
        }
      }
    });
  }

  public rebuildAll(): void {
    for (const lot of this.lots.values()) {
      this.evaluateBuildingCode(lot);
      this.rebuildLotMesh(lot);
    }
  }

  public clearAll(): void {
    this.selectLot(null);
    for (const g of this.lotMeshGroups.values()) {
      this.masterGroup.remove(g);
      this.disposeGroup(g);
    }
    this.lots.clear();
    this.lotMeshGroups.clear();
    if (this.onLotsUpdated) this.onLotsUpdated();
    if (this.onSelectionChanged) this.onSelectionChanged();
  }

  public dispose(): void {
    for (const g of this.lotMeshGroups.values()) {
      this.disposeGroup(g);
    }
    this.lots.clear();
    this.lotMeshGroups.clear();
    this.scene.remove(this.masterGroup);
  }
}
