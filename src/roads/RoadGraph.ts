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
}
