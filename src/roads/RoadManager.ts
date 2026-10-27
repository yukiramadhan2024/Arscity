import * as THREE from 'three';
import { RoadGraph } from './RoadGraph';
import { RoadNode, RoadEdge, RoadType, RoadProfile, ROAD_PROFILES } from './RoadTypes';
import { RoadGeometryBuilder } from './RoadGeometryBuilder';
import { IntersectionBuilder } from './IntersectionBuilder';
import { Terrain } from '../world/Terrain';
import type { LandscapeManager } from '../world/LandscapeManager';
import type { LotManager } from '../zones/LotManager';
import type { BuildingManager } from '../buildings/BuildingManager';

export interface RoadSample {
  distance: number;
  closestPoint: THREE.Vector2;
  normal: THREE.Vector2;
  asphaltHalfWidth: number;
  corridorHalfWidth: number;
  edge: RoadEdge;
  t: number;
}

export class RoadManager {
  public graph: RoadGraph;
  public masterGroup: THREE.Group;
  public terrain?: Terrain;
  private scene: THREE.Scene;

  public landscapeManager?: LandscapeManager;
  public lotManager?: LotManager;
  public buildingManager?: BuildingManager;

  private edgeGroups: Map<string, THREE.Group> = new Map();
  private intersectionMeshes: Map<string, THREE.Mesh> = new Map();

  public selectedEdgeId: string | null = null;
  public onGraphChanged?: (totalKm: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.graph = new RoadGraph();
    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'RoadsMasterGroup';
    scene.add(this.masterGroup);
  }

  public setDependencies(
    landscapeManager?: LandscapeManager,
    lotManager?: LotManager,
    buildingManager?: BuildingManager
  ): void {
    if (landscapeManager) this.landscapeManager = landscapeManager;
    if (lotManager) this.lotManager = lotManager;
    if (buildingManager) this.buildingManager = buildingManager;
  }

  /**
   * Splits an existing road edge at a given intersection point,
   * cleaning up the old 3D mesh, updating the graph, and creating 2 new edge meshes
   * while rebuilding intersection geometry for all affected nodes.
   */
  public splitEdgeAndRebuild(
    edgeId: string,
    splitPoint: THREE.Vector3
  ): { node: RoadNode; edge1: RoadEdge | null; edge2: RoadEdge | null } | null {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return null;

    const startNodeId = edge.startNodeId;
    const endNodeId = edge.endNodeId;

    // Dispose old 3D group
    const oldGroup = this.edgeGroups.get(edgeId);
    if (oldGroup) {
      this.masterGroup.remove(oldGroup);
      this.disposeGroup(oldGroup);
      this.edgeGroups.delete(edgeId);
    }

    // Graph split
    const split = this.graph.splitEdgeAtPoint(edgeId, splitPoint);
    if (!split) return null;

    // Rebuild meshes for new sub-edges
    if (split.edge1) {
      this.rebuildEdgeMesh(split.edge1.id);
    }
    if (split.edge2) {
      this.rebuildEdgeMesh(split.edge2.id);
    }

    // Rebuild intersections for endpoints and the junction node
    this.rebuildNodeIntersections(startNodeId);
    this.rebuildNodeIntersections(endNodeId);
    this.rebuildNodeIntersections(split.node.id);

    return split;
  }

  public addRoad(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    type: RoadType,
    controlPoints?: THREE.Vector3[]
  ): RoadEdge | null {
    // 1. Resolve start node: snap to existing node or snap-to-edge (T-junction / pertigaan)
    let effectiveStart = startPos.clone();
    let startNode = this.graph.findClosestNode(effectiveStart, 3.5);
    if (!startNode) {
      const hitEdge = this.graph.findNearestEdgePoint(effectiveStart);
      if (hitEdge) {
        effectiveStart.copy(hitEdge.point);
        const split = this.splitEdgeAndRebuild(hitEdge.edge.id, hitEdge.point);
        if (split) {
          startNode = split.node;
        }
      }
    }
    if (!startNode) {
      startNode = this.graph.getOrCreateNode(effectiveStart, 2.5);
    }

    // 2. Resolve end node: snap to existing node or snap-to-edge (T-junction / pertigaan)
    let effectiveEnd = endPos.clone();
    let endNode = this.graph.findClosestNode(effectiveEnd, 3.5);
    if (!endNode) {
      const hitEdge = this.graph.findNearestEdgePoint(effectiveEnd);
      if (hitEdge) {
        effectiveEnd.copy(hitEdge.point);
        const split = this.splitEdgeAndRebuild(hitEdge.edge.id, hitEdge.point);
        if (split) {
          endNode = split.node;
        }
      }
    }
    if (!endNode) {
      endNode = this.graph.getOrCreateNode(effectiveEnd, 2.5);
    }

    if (startNode.id === endNode.id) return null;

    // 3. Detect any intermediate road crossings (perempatan / 4-way intersections)
    const crossings = this.graph.findCrossings(startNode.position, endNode.position);

    if (crossings.length === 0) {
      // Direct edge with no collisions
      const edge = this.graph.addEdge(startNode.id, endNode.id, type, controlPoints);
      if (!edge) return null;

      this.rebuildEdgeMesh(edge.id);
      this.rebuildNodeIntersections(startNode.id);
      this.rebuildNodeIntersections(endNode.id);

      if (this.onGraphChanged) {
        this.onGraphChanged(this.graph.getTotalLengthKm());
      }

      this.enforceRoadClearance();

      return edge;
    }

    // 4. Handle intermediate intersections: split crossed roads and construct connected chain
    const chainNodes: RoadNode[] = [startNode];
    const affectedNodeIds = new Set<string>([startNode.id, endNode.id]);

    for (const cross of crossings) {
      const targetEdge = this.graph.edges.get(cross.edge.id) || this.graph.findNearestEdgePoint(cross.point, 2.0)?.edge;
      if (!targetEdge) continue;

      const split = this.splitEdgeAndRebuild(targetEdge.id, cross.point);
      if (split) {
        chainNodes.push(split.node);
        affectedNodeIds.add(split.node.id);
        if (split.edge1) affectedNodeIds.add(split.edge1.startNodeId);
        if (split.edge2) affectedNodeIds.add(split.edge2.endNodeId);
      }
    }
    chainNodes.push(endNode);

    let primaryEdge: RoadEdge | null = null;
    for (let i = 0; i < chainNodes.length - 1; i++) {
      const nA = chainNodes[i];
      const nB = chainNodes[i + 1];
      if (nA.id === nB.id) continue;

      const subEdge = this.graph.addEdge(nA.id, nB.id, type);
      if (subEdge) {
        if (!primaryEdge) primaryEdge = subEdge;
        this.rebuildEdgeMesh(subEdge.id);
      }
    }

    // Rebuild all affected intersections
    for (const nid of affectedNodeIds) {
      if (nid) this.rebuildNodeIntersections(nid);
    }

    if (this.onGraphChanged) {
      this.onGraphChanged(this.graph.getTotalLengthKm());
    }

    this.enforceRoadClearance();

    return primaryEdge;
  }

  public removeRoad(edgeId: string): boolean {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return false;

    const startNodeId = edge.startNodeId;
    const endNodeId = edge.endNodeId;

    // Remove 3D group
    const group = this.edgeGroups.get(edgeId);
    if (group) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
      this.edgeGroups.delete(edgeId);
    }

    if (this.selectedEdgeId === edgeId) {
      this.selectedEdgeId = null;
    }

    this.graph.removeEdge(edgeId);

    // Rebuild intersections for affected nodes
    this.rebuildNodeIntersections(startNodeId);
    this.rebuildNodeIntersections(endNodeId);

    if (this.onGraphChanged) {
      this.onGraphChanged(this.graph.getTotalLengthKm());
    }

    return true;
  }

  public rebuildEdgeMesh(edgeId: string): void {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return;

    // Remove existing if any
    const existingGroup = this.edgeGroups.get(edgeId);
    if (existingGroup) {
      this.masterGroup.remove(existingGroup);
      this.disposeGroup(existingGroup);
    }

    const newGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge, this.graph, this.terrain, this);
    this.masterGroup.add(newGroup);
    this.edgeGroups.set(edgeId, newGroup);
  }

  public rebuildNodeIntersections(nodeId: string): void {
    const node = this.graph.nodes.get(nodeId);

    // Remove existing intersection mesh if present
    const existingMesh = this.intersectionMeshes.get(nodeId);
    if (existingMesh) {
      this.masterGroup.remove(existingMesh);
      existingMesh.geometry.dispose();
      this.intersectionMeshes.delete(nodeId);
    }

    if (!node || node.connectedEdgeIds.length < 2) return;

    const newMesh = IntersectionBuilder.buildIntersectionMesh(node, this.graph, this.terrain);
    if (newMesh) {
      this.masterGroup.add(newMesh);
      this.intersectionMeshes.set(nodeId, newMesh);
    }
  }

  public findNearestRoadWithTangent(
    point: THREE.Vector3,
    maxRadius = 25
  ): { edge: RoadEdge; nearestPoint: THREE.Vector3; tangent: THREE.Vector3; distance: number; angle: number } | null {
    let bestMatch: {
      edge: RoadEdge;
      nearestPoint: THREE.Vector3;
      tangent: THREE.Vector3;
      distance: number;
      angle: number;
    } | null = null;
    let minDistance = maxRadius;

    for (const edge of this.graph.edges.values()) {
      if (!edge.controlPoints || edge.controlPoints.length < 2) continue;
      const pts = edge.controlPoints;

      for (let i = 0; i < pts.length - 1; i++) {
        const pA = pts[i];
        const pB = pts[i + 1];

        const dx = pB.x - pA.x;
        const dz = pB.z - pA.z;
        const segLenSq = dx * dx + dz * dz;
        if (segLenSq < 0.0001) continue;

        let t = ((point.x - pA.x) * dx + (point.z - pA.z) * dz) / segLenSq;
        t = Math.max(0, Math.min(1, t));

        const projX = pA.x + t * dx;
        const projZ = pA.z + t * dz;
        const dist = Math.hypot(point.x - projX, point.z - projZ);

        if (dist < minDistance) {
          minDistance = dist;
          const segLen = Math.sqrt(segLenSq);
          const tangent = new THREE.Vector3(dx / segLen, 0, dz / segLen);
          // Angle facing road perpendicular or aligned
          const angle = Math.atan2(tangent.x, tangent.z);

          bestMatch = {
            edge,
            nearestPoint: new THREE.Vector3(projX, 0, projZ),
            tangent,
            distance: dist,
            angle
          };
        }
      }
    }

    return bestMatch;
  }

  public findNearestRoadEdge(point: THREE.Vector3): { edge: RoadEdge; dist: number; closestPt: THREE.Vector3 } | null {
    let best: { edge: RoadEdge; dist: number; closestPt: THREE.Vector3 } | null = null;
    let minDistSq = Infinity;

    for (const edge of this.graph.edges.values()) {
      if (!edge.controlPoints || edge.controlPoints.length === 0) continue;
      const p1 = edge.controlPoints[0];
      const p2 = edge.controlPoints[edge.controlPoints.length - 1];
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const distSq = point.distanceToSquared(mid);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        best = { edge, dist: Math.sqrt(distSq), closestPt: mid };
      }
    }
    return best;
  }

  public getEdge(edgeId: string): RoadEdge | undefined {
    return this.graph.edges.get(edgeId);
  }

  public updateRoad(
    edgeId: string,
    newType?: RoadType,
    customProfile?: Partial<RoadProfile>
  ): RoadEdge | null {
    const edge = this.graph.edges.get(edgeId);
    if (!edge) return null;

    if (newType !== undefined) edge.type = newType;
    if (customProfile !== undefined) {
      edge.customProfile = { ...edge.customProfile, ...customProfile };
    }

    this.rebuildEdgeMesh(edgeId);
    this.rebuildNodeIntersections(edge.startNodeId);
    this.rebuildNodeIntersections(edge.endNodeId);

    if (this.onGraphChanged) {
      this.onGraphChanged(this.graph.getTotalLengthKm());
    }

    this.enforceRoadClearance();

    return edge;
  }

  /**
   * Finds the closest point on the Bezier curves of all RoadEdges.
   * Returns distance to centerline, closest 2D point (x, z), outward perpendicular normal,
   * asphalt half-width, and corridor half-width (asphalt + sidewalk).
   */
  public getNearestRoadSample(point: THREE.Vector2, excludeEdgeId?: string): RoadSample | null {
    let bestSample: RoadSample | null = null;
    let minDistance = Infinity;

    for (const edge of this.graph.edges.values()) {
      if (excludeEdgeId && edge.id === excludeEdgeId) continue;
      if (!edge.controlPoints || edge.controlPoints.length < 2) continue;

      const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };
      const asphaltHalfWidth = (profile.width || 8.0) * 0.5;
      const sidewalkWidth = profile.sidewalkWidth ?? 0;
      const corridorHalfWidth = asphaltHalfWidth + sidewalkWidth;

      const numSamples = Math.max(12, Math.min(60, Math.ceil(edge.length * 1.5)));
      let prevPt = this.graph.sampleBezier(edge.controlPoints, 0);

      for (let i = 1; i <= numSamples; i++) {
        const tCurr = i / numSamples;
        const currPt = this.graph.sampleBezier(edge.controlPoints, tCurr);

        const dx = currPt.x - prevPt.x;
        const dz = currPt.z - prevPt.z;
        const segLenSq = dx * dx + dz * dz;

        if (segLenSq > 1e-6) {
          let u = ((point.x - prevPt.x) * dx + (point.y - prevPt.z) * dz) / segLenSq;
          u = Math.max(0, Math.min(1, u));

          const projX = prevPt.x + u * dx;
          const projZ = prevPt.z + u * dz;
          const dist = Math.hypot(point.x - projX, point.y - projZ);

          if (dist < minDistance) {
            minDistance = dist;
            const segLen = Math.sqrt(segLenSq);
            const tanX = dx / segLen;
            const tanZ = dz / segLen;

            const normal = new THREE.Vector2();
            if (dist > 1e-4) {
              normal.set((point.x - projX) / dist, (point.y - projZ) / dist);
            } else {
              // Exact centerline hit: default to lateral normal perpendicular to tangent
              normal.set(-tanZ, tanX).normalize();
            }

            bestSample = {
              distance: dist,
              closestPoint: new THREE.Vector2(projX, projZ),
              normal,
              asphaltHalfWidth,
              corridorHalfWidth,
              edge,
              t: ((i - 1) + u) / numSamples,
            };
          }
        }
        prevPt = currPt;
      }
    }

    return bestSample;
  }

  /**
   * Returns true if point (x, z) falls within the asphalt carriageway of any road
   * or within an intersection polygon/zone, accounting for safetyMargin.
   */
  public isPointOnRoadAsphalt(
    x: number,
    z: number,
    safetyMargin = 0.6,
    excludeEdgeId?: string
  ): boolean {
    // 1. Check intersections (junction nodes with valency >= 2)
    for (const node of this.graph.nodes.values()) {
      if (this.graph.isJunctionNode(node.id)) {
        let maxAsphaltHalfW = 0;
        let connectedCount = 0;

        for (const edgeId of node.connectedEdgeIds) {
          if (excludeEdgeId && edgeId === excludeEdgeId) continue;
          const e = this.graph.edges.get(edgeId);
          if (e) {
            connectedCount++;
            const prof = { ...ROAD_PROFILES[e.type], ...e.customProfile };
            maxAsphaltHalfW = Math.max(maxAsphaltHalfW, (prof.width || 8.0) * 0.5);
          }
        }

        if (connectedCount > 0 && maxAsphaltHalfW > 0) {
          // Matching IntersectionBuilder: radius = maxW * 0.65 = maxAsphaltHalfW * 1.3
          const junctionRadius = maxAsphaltHalfW * 1.25;
          const distToNode = Math.hypot(x - node.position.x, z - node.position.z);
          if (distToNode <= junctionRadius + safetyMargin) {
            return true;
          }
        }
      }
    }

    // 2. Check linear road edge carriageway
    const sample = this.getNearestRoadSample(new THREE.Vector2(x, z), excludeEdgeId);
    if (sample) {
      let isBeyondDeadEnd = false;
      if (sample.t <= 0.01) {
        const sNode = this.graph.nodes.get(sample.edge.startNodeId);
        if (sNode && sNode.connectedEdgeIds.length <= 1) {
          const p1 = this.graph.sampleBezier(sample.edge.controlPoints, 0);
          const p2 = this.graph.sampleBezier(sample.edge.controlPoints, 0.05);
          const dirX = p2.x - p1.x;
          const dirZ = p2.z - p1.z;
          if ((x - p1.x) * dirX + (z - p1.z) * dirZ < 0) {
            isBeyondDeadEnd = true;
          }
        }
      } else if (sample.t >= 0.99) {
        const eNode = this.graph.nodes.get(sample.edge.endNodeId);
        if (eNode && eNode.connectedEdgeIds.length <= 1) {
          const p1 = this.graph.sampleBezier(sample.edge.controlPoints, 0.95);
          const p2 = this.graph.sampleBezier(sample.edge.controlPoints, 1.0);
          const dirX = p2.x - p1.x;
          const dirZ = p2.z - p1.z;
          if ((x - p2.x) * dirX + (z - p2.z) * dirZ > 0) {
            isBeyondDeadEnd = true;
          }
        }
      }

      if (!isBeyondDeadEnd && sample.distance < (sample.asphaltHalfWidth + safetyMargin)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Checks whether a polygon (building or lot footprint) penetrates into any road or sidewalk corridor.
   * Tests all vertices, edge midpoints, and centroid.
   */
  public isFootprintOverlappingRoad(polygon: THREE.Vector2[], safetyMargin = 0.5): boolean {
    if (!polygon || polygon.length === 0) return false;

    const pointsToTest: THREE.Vector2[] = [];
    let sumX = 0;
    let sumY = 0;

    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i];
      pointsToTest.push(p);
      sumX += p.x;
      sumY += p.y;

      const nextP = polygon[(i + 1) % polygon.length];
      pointsToTest.push(new THREE.Vector2((p.x + nextP.x) * 0.5, (p.y + nextP.y) * 0.5));
    }

    pointsToTest.push(new THREE.Vector2(sumX / polygon.length, sumY / polygon.length));

    for (const pt of pointsToTest) {
      // 1. Check nearest road corridor (asphalt + sidewalk)
      const sample = this.getNearestRoadSample(pt);
      if (sample) {
        let isBeyondDeadEnd = false;
        if (sample.t <= 0.01) {
          const sNode = this.graph.nodes.get(sample.edge.startNodeId);
          if (sNode && sNode.connectedEdgeIds.length <= 1) {
            const p1 = this.graph.sampleBezier(sample.edge.controlPoints, 0);
            const p2 = this.graph.sampleBezier(sample.edge.controlPoints, 0.05);
            const dirX = p2.x - p1.x;
            const dirZ = p2.z - p1.z;
            if ((pt.x - p1.x) * dirX + (pt.y - p1.z) * dirZ < 0) {
              isBeyondDeadEnd = true;
            }
          }
        } else if (sample.t >= 0.99) {
          const eNode = this.graph.nodes.get(sample.edge.endNodeId);
          if (eNode && eNode.connectedEdgeIds.length <= 1) {
            const p1 = this.graph.sampleBezier(sample.edge.controlPoints, 0.95);
            const p2 = this.graph.sampleBezier(sample.edge.controlPoints, 1.0);
            const dirX = p2.x - p1.x;
            const dirZ = p2.z - p1.z;
            if ((pt.x - p2.x) * dirX + (pt.y - p2.z) * dirZ > 0) {
              isBeyondDeadEnd = true;
            }
          }
        }

        if (!isBeyondDeadEnd && sample.distance < (sample.corridorHalfWidth + safetyMargin)) {
          return true;
        }
      }

      // 2. Check junction intersection boxes
      for (const node of this.graph.nodes.values()) {
        if (this.graph.isJunctionNode(node.id)) {
          let maxCorridorHalfW = 0;
          for (const edgeId of node.connectedEdgeIds) {
            const e = this.graph.edges.get(edgeId);
            if (e) {
              const prof = { ...ROAD_PROFILES[e.type], ...e.customProfile };
              const corridor = (prof.width || 8.0) * 0.5 + (prof.sidewalkWidth || 0);
              maxCorridorHalfW = Math.max(maxCorridorHalfW, corridor);
            }
          }
          if (maxCorridorHalfW > 0) {
            const jRadius = maxCorridorHalfW * 1.25;
            const dist = Math.hypot(pt.x - node.position.x, pt.y - node.position.z);
            if (dist <= jRadius + safetyMargin) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Road Clearance & Auto-Eviction System:
   * Clears objects that accidentally invade the road asphalt or corridor:
   * - Landscape items in intersections are cleanly disposed.
   * - Landscape items on road asphalt are relocated to the safe sidewalk edge.
   * - Lots and buildings penetrating the road corridor are shifted along the normal vector.
   */
  public enforceRoadClearance(
    landscapeManager?: LandscapeManager,
    lotManager?: LotManager,
    buildingManager?: BuildingManager
  ): {
    evictedCount: number;
    relocatedLandscapeCount: number;
    shiftedLotsCount: number;
    shiftedBuildingsCount: number;
  } {
    const lm = landscapeManager || this.landscapeManager;
    const lotMgr = lotManager || this.lotManager;
    const bldMgr = buildingManager || this.buildingManager;

    let evictedCount = 0;
    let relocatedLandscapeCount = 0;
    let shiftedLotsCount = 0;
    let shiftedBuildingsCount = 0;

    // 1. Landscape Items
    if (lm) {
      const itemsSnapshot = Array.from(lm.items.values());
      for (const item of itemsSnapshot) {
        const pt = new THREE.Vector2(item.position.x, item.position.z);
        const sample = this.getNearestRoadSample(pt);
        if (!sample) continue;

        if (sample.distance < sample.asphaltHalfWidth + 0.6) {
          // Check if located in an intersection
          let isIntersection = false;
          for (const node of this.graph.nodes.values()) {
            if (this.graph.isJunctionNode(node.id)) {
              let maxAsphaltHalfW = 4.0;
              for (const edgeId of node.connectedEdgeIds) {
                const e = this.graph.edges.get(edgeId);
                if (e) {
                  const prof = { ...ROAD_PROFILES[e.type], ...e.customProfile };
                  maxAsphaltHalfW = Math.max(maxAsphaltHalfW, (prof.width || 8.0) * 0.5);
                }
              }
              const jRadius = maxAsphaltHalfW * 1.25;
              if (Math.hypot(item.position.x - node.position.x, item.position.z - node.position.z) <= jRadius + 0.6) {
                isIntersection = true;
                break;
              }
            }
          }

          if (isIntersection) {
            lm.removeItem(item.id);
            evictedCount++;
          } else {
            const sidewalkWidth = Math.max(1.2, sample.corridorHalfWidth - sample.asphaltHalfWidth);
            const safeDist = sample.asphaltHalfWidth + Math.max(0.8, sidewalkWidth * 0.7);
            const newX = sample.closestPoint.x + sample.normal.x * safeDist;
            const newZ = sample.closestPoint.y + sample.normal.y * safeDist;
            lm.updateItemPosition(item.id, new THREE.Vector3(newX, item.position.y, newZ));
            relocatedLandscapeCount++;
          }
        }
      }
    }

    // 2. Lots
    if (lotMgr) {
      for (const lot of lotMgr.lots.values()) {
        const hw = lot.width * 0.5;
        const hl = lot.length * 0.5;
        const corners = [
          new THREE.Vector2(lot.position.x - hw, lot.position.z - hl),
          new THREE.Vector2(lot.position.x + hw, lot.position.z - hl),
          new THREE.Vector2(lot.position.x + hw, lot.position.z + hl),
          new THREE.Vector2(lot.position.x - hw, lot.position.z + hl),
        ];
        const testPts = [...corners];
        for (let i = 0; i < 4; i++) {
          testPts.push(new THREE.Vector2((corners[i].x + corners[(i + 1) % 4].x) * 0.5, (corners[i].y + corners[(i + 1) % 4].y) * 0.5));
        }
        testPts.push(new THREE.Vector2(lot.position.x, lot.position.z));

        let maxPen = 0;
        let pushNormal = new THREE.Vector2(0, 0);

        for (const pt of testPts) {
          const sample = this.getNearestRoadSample(pt);
          if (sample && sample.distance < sample.corridorHalfWidth + 0.5) {
            const pen = (sample.corridorHalfWidth + 0.5) - sample.distance;
            if (pen > maxPen) {
              maxPen = pen;
              pushNormal.copy(sample.normal);
            }
          }
        }

        if (maxPen > 0 && pushNormal.lengthSq() > 0.001) {
          lot.position.x += pushNormal.x * (maxPen + 0.1);
          lot.position.z += pushNormal.y * (maxPen + 0.1);
          lotMgr.rebuildLotMesh(lot);
          shiftedLotsCount++;
        }
      }
    }

    // 3. Buildings
    if (bldMgr) {
      for (const bld of bldMgr.buildings.values()) {
        const hw = (bld.width || 10) * 0.5;
        const hl = (bld.length || 10) * 0.5;
        const rot = bld.rotationY || 0;
        const cos = Math.cos(rot);
        const sin = Math.sin(rot);
        const corners = [
          new THREE.Vector2(bld.position.x + (-hw * cos - -hl * sin), bld.position.z + (-hw * sin + -hl * cos)),
          new THREE.Vector2(bld.position.x + (hw * cos - -hl * sin),  bld.position.z + (hw * sin + -hl * cos)),
          new THREE.Vector2(bld.position.x + (hw * cos - hl * sin),   bld.position.z + (hw * sin + hl * cos)),
          new THREE.Vector2(bld.position.x + (-hw * cos - hl * sin),  bld.position.z + (-hw * sin + hl * cos)),
        ];
        const testPts = [...corners];
        for (let i = 0; i < 4; i++) {
          testPts.push(new THREE.Vector2((corners[i].x + corners[(i + 1) % 4].x) * 0.5, (corners[i].y + corners[(i + 1) % 4].y) * 0.5));
        }
        testPts.push(new THREE.Vector2(bld.position.x, bld.position.z));

        let maxPen = 0;
        let pushNormal = new THREE.Vector2(0, 0);

        for (const pt of testPts) {
          const sample = this.getNearestRoadSample(pt);
          if (sample && sample.distance < sample.corridorHalfWidth + 0.5) {
            const pen = (sample.corridorHalfWidth + 0.5) - sample.distance;
            if (pen > maxPen) {
              maxPen = pen;
              pushNormal.copy(sample.normal);
            }
          }
        }

        if (maxPen > 0 && pushNormal.lengthSq() > 0.001) {
          bld.position.x += pushNormal.x * (maxPen + 0.2);
          bld.position.z += pushNormal.y * (maxPen + 0.2);
          bldMgr.updateBuilding(bld);
          shiftedBuildingsCount++;
        }
      }
    }

    return {
      evictedCount,
      relocatedLandscapeCount,
      shiftedLotsCount,
      shiftedBuildingsCount,
    };
  }

  public setSubsurfaceDrainageVisible(visible: boolean): void {
    for (const group of this.edgeGroups.values()) {
      const drainage = group.getObjectByName('SubsurfaceDrainage') || group.userData.subsurfaceDrainage;
      if (drainage) {
        drainage.visible = visible;
      }
    }
  }

  public selectEdge(edgeId: string | null): void {
    // Un-highlight previous
    if (this.selectedEdgeId && this.edgeGroups.has(this.selectedEdgeId)) {
      const g = this.edgeGroups.get(this.selectedEdgeId)!;
      g.position.y = 0;
    }

    this.selectedEdgeId = edgeId;

    // Highlight new
    if (edgeId && this.edgeGroups.has(edgeId)) {
      const g = this.edgeGroups.get(edgeId)!;
      g.position.y = 0.08; // Slight lift to indicate selection
    }
  }

  private disposeGroup(group: THREE.Group): void {
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.geometry?.dispose();
        if (mesh.userData?.isUniqueMaterial && mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m?.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  }

  public rebuildAll(): void {
    for (const edgeId of this.graph.edges.keys()) {
      this.rebuildEdgeMesh(edgeId);
    }
    for (const nodeId of this.graph.nodes.keys()) {
      this.rebuildNodeIntersections(nodeId);
    }
  }

  public clearAll(): void {
    this.selectEdge(null);
    for (const group of this.edgeGroups.values()) {
      this.masterGroup.remove(group);
      this.disposeGroup(group);
    }
    for (const mesh of this.intersectionMeshes.values()) {
      this.masterGroup.remove(mesh);
      mesh.geometry?.dispose();
    }
    this.edgeGroups.clear();
    this.intersectionMeshes.clear();
    this.graph.edges.clear();
    this.graph.nodes.clear();
    if (this.onGraphChanged) {
      this.onGraphChanged(0);
    }
  }

  public dispose(): void {
    for (const group of this.edgeGroups.values()) {
      this.disposeGroup(group);
    }
    for (const mesh of this.intersectionMeshes.values()) {
      mesh.geometry?.dispose();
    }
    this.edgeGroups.clear();
    this.intersectionMeshes.clear();
    this.scene.remove(this.masterGroup);
  }
}
