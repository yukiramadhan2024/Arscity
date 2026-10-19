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
}
