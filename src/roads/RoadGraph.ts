import * as THREE from 'three';
import { RoadNode, RoadEdge, RoadType, ROAD_PROFILES } from './RoadTypes';

export class RoadGraph {
  public nodes: Map<string, RoadNode> = new Map();
  public edges: Map<string, RoadEdge> = new Map();

  private nextNodeId: number = 1;
  private nextEdgeId: number = 1;

  public getOrCreateNode(position: THREE.Vector3, snapRadius: number = 2.0): RoadNode {
    // Check if near existing node
    const existing = this.findClosestNode(position, snapRadius);
    if (existing) {
      return existing;
    }

    const id = `node_${this.nextNodeId++}`;
    const node: RoadNode = {
      id,
      position: position.clone(),
      connectedEdgeIds: []
    };
    this.nodes.set(id, node);
    return node;
  }

  public findClosestNode(point: THREE.Vector3, maxDist: number = 2.0): RoadNode | null {
    let closest: RoadNode | null = null;
    let minDistSq = maxDist * maxDist;

    for (const node of this.nodes.values()) {
      const distSq = node.position.distanceToSquared(point);
      if (distSq < minDistSq) {
        minDistSq = distSq;
        closest = node;
      }
    }
    return closest;
  }

  public addEdge(
    startNodeId: string,
    endNodeId: string,
    type: RoadType,
    controlPoints?: THREE.Vector3[]
  ): RoadEdge | null {
    if (startNodeId === endNodeId) return null; // Avoid self-loop

    const startNode = this.nodes.get(startNodeId);
    const endNode = this.nodes.get(endNodeId);
    if (!startNode || !endNode) return null;

    // Check if edge already exists between these two
    for (const edgeId of startNode.connectedEdgeIds) {
      const edge = this.edges.get(edgeId);
      if (
        edge &&
        ((edge.startNodeId === startNodeId && edge.endNodeId === endNodeId) ||
          (edge.startNodeId === endNodeId && edge.endNodeId === startNodeId))
      ) {
        return edge; // Edge already exists
      }
    }

    const id = `edge_${this.nextEdgeId++}`;
    const pStart = startNode.position.clone();
    const pEnd = endNode.position.clone();

    // Default control points for cubic Bezier
    let cps = controlPoints;
    if (!cps || cps.length !== 4) {
      const cp1 = new THREE.Vector3().lerpVectors(pStart, pEnd, 0.33);
      const cp2 = new THREE.Vector3().lerpVectors(pStart, pEnd, 0.67);
      cps = [pStart, cp1, cp2, pEnd];
    } else {
      cps[0].copy(pStart);
      cps[3].copy(pEnd);
    }

    const length = this.calculateEdgeLength(cps);

    const edge: RoadEdge = {
      id,
      startNodeId,
      endNodeId,
      type,
      controlPoints: cps,
      length
    };

    this.edges.set(id, edge);
    startNode.connectedEdgeIds.push(id);
    endNode.connectedEdgeIds.push(id);

    return edge;
  }

  public calculateEdgeLength(cps: THREE.Vector3[], samples: number = 20): number {
    let totalLen = 0;
    let prev = this.sampleBezier(cps, 0);

    for (let i = 1; i <= samples; i++) {
      const t = i / samples;
      const current = this.sampleBezier(cps, t);
      totalLen += prev.distanceTo(current);
      prev = current;
    }
    return totalLen;
  }

  public sampleBezier(cps: THREE.Vector3[], t: number): THREE.Vector3 {
    if (!cps || cps.length === 0) return new THREE.Vector3();
    if (cps.length === 1) return cps[0].clone();
    if (cps.length === 2) {
      return new THREE.Vector3().lerpVectors(cps[0], cps[1], t);
    }
    if (cps.length === 3) {
      const u = 1 - t;
      const x = u * u * cps[0].x + 2 * u * t * cps[1].x + t * t * cps[2].x;
      const y = u * u * cps[0].y + 2 * u * t * cps[1].y + t * t * cps[2].y;
      const z = u * u * cps[0].z + 2 * u * t * cps[1].z + t * t * cps[2].z;
      return new THREE.Vector3(x, y, z);
    }

    const p0 = cps[0];
    const p1 = cps[1];
    const p2 = cps[2];
    const p3 = cps[3];

    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    const y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    const z = uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z;

    return new THREE.Vector3(x, y, z);
  }

  public removeEdge(edgeId: string): boolean {
    const edge = this.edges.get(edgeId);
    if (!edge) return false;

    // Remove from nodes
    const startNode = this.nodes.get(edge.startNodeId);
    if (startNode) {
      startNode.connectedEdgeIds = startNode.connectedEdgeIds.filter((id) => id !== edgeId);
      if (startNode.connectedEdgeIds.length === 0) {
        this.nodes.delete(startNode.id);
      }
    }

    const endNode = this.nodes.get(edge.endNodeId);
    if (endNode) {
      endNode.connectedEdgeIds = endNode.connectedEdgeIds.filter((id) => id !== edgeId);
      if (endNode.connectedEdgeIds.length === 0) {
        this.nodes.delete(endNode.id);
      }
    }

    this.edges.delete(edgeId);
    return true;
  }

  public getTotalLengthKm(): number {
    let sumMeters = 0;
    for (const edge of this.edges.values()) {
      sumMeters += edge.length;
    }
    return sumMeters / 1000;
  }

  /**
   * Finds the closest node to a 3D point with its distance.
   */
  public findNearestNode(point: THREE.Vector3, maxDist: number = Infinity): { node: RoadNode; distance: number } | null {
    let closest: RoadNode | null = null;
    let minDist = maxDist;

    for (const node of this.nodes.values()) {
      const dist = new THREE.Vector2(node.position.x - point.x, node.position.z - point.z).length();
      if (dist < minDist) {
        minDist = dist;
        closest = node;
      }
    }

    if (!closest) return null;
    return { node: closest, distance: minDist };
  }

  /**
   * Computes topological network walking distances from an origin point to all reachable nodes
   * using Dijkstra's shortest path algorithm along connected road edges (GlassBox routing).
   */
  public computeNetworkDistancesFromPoint(
    origin: THREE.Vector3,
    maxDistanceMeters: number
  ): Map<string, number> {
    const distances = new Map<string, number>();
    const nearest = this.findNearestNode(origin, 60.0);
    if (!nearest) return distances;

    const startNode = nearest.node;
    const initialDist = nearest.distance;
    if (initialDist > maxDistanceMeters) return distances;

    distances.set(startNode.id, initialDist);

    // Min-priority queue: [nodeId, dist]
    const queue: { nodeId: string; dist: number }[] = [{ nodeId: startNode.id, dist: initialDist }];

    while (queue.length > 0) {
      // Find element with minimum distance
      let minIdx = 0;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].dist < queue[minIdx].dist) {
          minIdx = i;
        }
      }

      const { nodeId: u, dist: du } = queue.splice(minIdx, 1)[0];
      if (du > (distances.get(u) ?? Infinity)) continue;

      const nodeU = this.nodes.get(u);
      if (!nodeU) continue;

      for (const edgeId of nodeU.connectedEdgeIds) {
        const edge = this.edges.get(edgeId);
        if (!edge) continue;

        const v = edge.startNodeId === u ? edge.endNodeId : edge.startNodeId;
        const edgeLen = edge.length || 0;
        const alt = du + edgeLen;

        if (alt <= maxDistanceMeters) {
          const currentBest = distances.get(v) ?? Infinity;
          if (alt < currentBest) {
            distances.set(v, alt);
            queue.push({ nodeId: v, dist: alt });
          }
        }
      }
    }

    return distances;
  }

  /**
   * Calculates actual walking distance between origin and destination along the road network.
   * Returns null if either point is isolated (>60m from roads) or no connected path exists.
   */
  public getNetworkWalkDistance(
    origin: THREE.Vector3,
    destination: THREE.Vector3,
    maxDistanceMeters: number = 2000
  ): number | null {
    const nearestOrigin = this.findNearestNode(origin, 60.0);
    const nearestDest = this.findNearestNode(destination, 60.0);
    if (!nearestOrigin || !nearestDest) return null;

    if (nearestOrigin.node.id === nearestDest.node.id) {
      const direct = nearestOrigin.distance + nearestDest.distance;
      return direct <= maxDistanceMeters ? direct : null;
    }

    const nodeDistances = this.computeNetworkDistancesFromPoint(origin, maxDistanceMeters);
    const destNodeDist = nodeDistances.get(nearestDest.node.id);
    if (destNodeDist === undefined) return null;

    const totalWalk = destNodeDist + nearestDest.distance;
    return totalWalk <= maxDistanceMeters ? Math.round(totalWalk * 10) / 10 : null;
  }

  /**
   * Retrieves all road edge IDs reachable within a network walking distance from origin.
   */
  public getReachableEdges(origin: THREE.Vector3, maxDistanceMeters: number = 400): Set<string> {
    const reachable = new Set<string>();
    const nodeDists = this.computeNetworkDistancesFromPoint(origin, maxDistanceMeters);
    if (nodeDists.size === 0) return reachable;

    for (const edge of this.edges.values()) {
      const dStart = nodeDists.get(edge.startNodeId);
      const dEnd = nodeDists.get(edge.endNodeId);
      if (dStart !== undefined || dEnd !== undefined) {
        reachable.add(edge.id);
      }
    }

    return reachable;
  }

  /**
   * Finds the closest point on any road edge within maxDist.
   */
  public findNearestEdgePoint(
    point: THREE.Vector3,
    maxDist?: number
  ): { edge: RoadEdge; point: THREE.Vector3; distance: number } | null {
    let bestMatch: { edge: RoadEdge; point: THREE.Vector3; distance: number } | null = null;
    let minDistance = Infinity;

    for (const edge of this.edges.values()) {
      if (!edge.controlPoints || edge.controlPoints.length < 2) continue;
      const pts = edge.controlPoints;
      const profile = ROAD_PROFILES[edge.type];
      const edgeWidth = profile ? profile.width : 8.0;
      const allowedDist = maxDist !== undefined ? maxDist : Math.max(5.0, edgeWidth * 0.5 + 2.0);

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

        if (dist <= allowedDist && dist < minDistance) {
          minDistance = dist;
          bestMatch = {
            edge,
            point: new THREE.Vector3(projX, 0, projZ),
            distance: dist
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Determines if a node is a true roadway junction (valency >= 3 or sharp turn < 150 deg)
   * vs a straight-line continuous road segment.
   */
  public isJunctionNode(nodeId: string): boolean {
    const node = this.nodes.get(nodeId);
    if (!node || node.connectedEdgeIds.length < 2) return false;
    if (node.connectedEdgeIds.length >= 3) return true;

    // Node with exactly 2 edges: check if collinear
    const e1 = this.edges.get(node.connectedEdgeIds[0]);
    const e2 = this.edges.get(node.connectedEdgeIds[1]);
    if (!e1 || !e2) return false;

    const o1Id = e1.startNodeId === node.id ? e1.endNodeId : e1.startNodeId;
    const o2Id = e2.startNodeId === node.id ? e2.endNodeId : e2.startNodeId;
    const o1 = this.nodes.get(o1Id);
    const o2 = this.nodes.get(o2Id);
    if (!o1 || !o2) return false;

    const d1 = new THREE.Vector3().subVectors(o1.position, node.position).normalize();
    const d2 = new THREE.Vector3().subVectors(o2.position, node.position).normalize();
    d1.y = 0;
    d2.y = 0;
    // Dot product > -0.85 means sharp bend (< 150 deg), requiring intersection treatment
    return d1.dot(d2) > -0.85;
  }

  /**
   * Splits an existing edge at a given 3D position, creating a new junction node
   * and replacing the edge with two connected sub-edges.
   */
  public splitEdgeAtPoint(
    edgeId: string,
    splitPoint: THREE.Vector3
  ): { node: RoadNode; edge1: RoadEdge | null; edge2: RoadEdge | null } | null {
    const edge = this.edges.get(edgeId);
    if (!edge) return null;

    const startNode = this.nodes.get(edge.startNodeId);
    const endNode = this.nodes.get(edge.endNodeId);
    if (!startNode || !endNode) return null;

    // If split point is within 2.5m of an existing endpoint node, reuse it without splitting
    if (startNode.position.distanceTo(splitPoint) <= 2.5) {
      return { node: startNode, edge1: edge, edge2: null };
    }
    if (endNode.position.distanceTo(splitPoint) <= 2.5) {
      return { node: endNode, edge1: edge, edge2: null };
    }

    const roadType = edge.type;
    const customProfile = edge.customProfile;

    // Create split node at the intersection point
    const splitNode = this.getOrCreateNode(splitPoint, 1.5);

    // Add two new edges connecting startNode -> splitNode and splitNode -> endNode BEFORE removing old edge
    // (prevents removeEdge from deleting startNode/endNode as temporary orphans)
    const edge1 = this.addEdge(startNode.id, splitNode.id, roadType);
    if (edge1 && customProfile) edge1.customProfile = { ...customProfile };

    const edge2 = this.addEdge(splitNode.id, endNode.id, roadType);
    if (edge2 && customProfile) edge2.customProfile = { ...customProfile };

    // Remove the old unsplit edge
    this.removeEdge(edgeId);

    return { node: splitNode, edge1, edge2 };
  }

  /**
   * Finds all 2D planar intersections between a line segment [start, end] and existing road edges.
   */
  public findCrossings(
    start: THREE.Vector3,
    end: THREE.Vector3
  ): { edge: RoadEdge; point: THREE.Vector3; t: number }[] {
    const crossings: { edge: RoadEdge; point: THREE.Vector3; t: number }[] = [];
    const dx1 = end.x - start.x;
    const dz1 = end.z - start.z;
    const len1Sq = dx1 * dx1 + dz1 * dz1;
    if (len1Sq < 1.0) return crossings;

    for (const edge of this.edges.values()) {
      if (!edge.controlPoints || edge.controlPoints.length < 2) continue;
      const pts = edge.controlPoints;

      for (let i = 0; i < pts.length - 1; i++) {
        const pA = pts[i];
        const pB = pts[i + 1];

        const dx2 = pB.x - pA.x;
        const dz2 = pB.z - pA.z;

        const denom = dx1 * dz2 - dz1 * dx2;
        if (Math.abs(denom) < 1e-5) continue; // Parallel

        const ox = pA.x - start.x;
        const oz = pA.z - start.z;
        const t1 = (ox * dz2 - oz * dx2) / denom;
        const t2 = (ox * dz1 - oz * dx1) / denom;

        // Interior intersection (excluding exact node endpoints)
        if (t1 > 0.04 && t1 < 0.96 && t2 > 0.04 && t2 < 0.96) {
          const ix = start.x + t1 * dx1;
          const iz = start.z + t1 * dz1;
          crossings.push({
            edge,
            point: new THREE.Vector3(ix, 0, iz),
            t: t1
          });
        }
      }
    }

    // Sort by parameter t1 from start to end
    crossings.sort((a, b) => a.t - b.t);

    // Deduplicate any crossings that are within 1.5m of each other
    const filtered: typeof crossings = [];
    for (const c of crossings) {
      if (filtered.length === 0) {
        filtered.push(c);
      } else {
        const last = filtered[filtered.length - 1];
        if (last.point.distanceTo(c.point) > 1.5) {
          filtered.push(c);
        }
      }
    }

    return filtered;
  }
}
