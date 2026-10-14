import * as THREE from 'three';
import { RoadGraph } from './RoadGraph';
import { RoadEdge, RoadType } from './RoadTypes';
import { RoadGeometryBuilder } from './RoadGeometryBuilder';
import { IntersectionBuilder } from './IntersectionBuilder';

export class RoadManager {
  public graph: RoadGraph;
  public masterGroup: THREE.Group;
  private scene: THREE.Scene;

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

  public addRoad(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    type: RoadType,
    controlPoints?: THREE.Vector3[]
  ): RoadEdge | null {
    // Snap to existing nodes if close
    const startNode = this.graph.getOrCreateNode(startPos, 2.5);
    const endNode = this.graph.getOrCreateNode(endPos, 2.5);

    const edge = this.graph.addEdge(startNode.id, endNode.id, type, controlPoints);
    if (!edge) return null;

    this.rebuildEdgeMesh(edge.id);
    this.rebuildNodeIntersections(startNode.id);
    this.rebuildNodeIntersections(endNode.id);

    if (this.onGraphChanged) {
      this.onGraphChanged(this.graph.getTotalLengthKm());
    }

    return edge;
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

    const newGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge, this.graph);
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

    const newMesh = IntersectionBuilder.buildIntersectionMesh(node, this.graph);
    if (newMesh) {
      this.masterGroup.add(newMesh);
      this.intersectionMeshes.set(nodeId, newMesh);
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
      }
    });
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
