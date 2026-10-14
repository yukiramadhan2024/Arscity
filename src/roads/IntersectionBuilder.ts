import * as THREE from 'three';
import earcut from 'earcut';
import { RoadGraph } from './RoadGraph';
import { RoadNode, ROAD_PROFILES } from './RoadTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class IntersectionBuilder {
  private static asphaltMaterial: THREE.MeshStandardMaterial | null = null;

  private static getMaterial(): THREE.MeshStandardMaterial {
    if (!this.asphaltMaterial) {
      this.asphaltMaterial = MaterialLibrary.getInstance().getMaterial('asphalt', {
        roughness: 0.85,
        metalness: 0.1,
        color: 0xdddddd
      });
    }
    return this.asphaltMaterial;
  }

  public static buildIntersectionMesh(node: RoadNode, graph: RoadGraph): THREE.Mesh | null {
    if (node.connectedEdgeIds.length < 2) return null;

    // Collect connected edges and their directions from node
    const edgeData: { edgeId: string; dir: THREE.Vector3; width: number; angle: number }[] = [];

    for (const edgeId of node.connectedEdgeIds) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };
      const isStart = edge.startNodeId === node.id;
      const otherNodeId = isStart ? edge.endNodeId : edge.startNodeId;
      const otherNode = graph.nodes.get(otherNodeId);
      if (!otherNode) continue;

      // Direction pointing AWAY from node
      const dir = new THREE.Vector3().subVectors(otherNode.position, node.position).normalize();
      dir.y = 0;
      if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);

      const angle = Math.atan2(dir.z, dir.x);
      edgeData.push({ edgeId, dir, width: profile.width, angle });
    }

    if (edgeData.length < 2) return null;

    // Sort edges by angle counter-clockwise
    edgeData.sort((a, b) => a.angle - b.angle);

    // Build boundary polygon vertices around the intersection
    const polyPoints: THREE.Vector3[] = [];
    const radius = Math.max(...edgeData.map((e) => e.width)) * 0.65;

    for (let i = 0; i < edgeData.length; i++) {
      const curr = edgeData[i];
      const next = edgeData[(i + 1) % edgeData.length];

      // Perpendicular lateral vector for curr edge (pointing to right)
      const right = new THREE.Vector3(-curr.dir.z, 0, curr.dir.x).normalize();
      const halfW = curr.width * 0.5;

      // Corner 1: Right side of current edge
      const p1 = node.position.clone().addScaledVector(curr.dir, radius * 0.8).addScaledVector(right, halfW);

      // Corner 2: Left side of next edge
      const nextLeft = new THREE.Vector3(next.dir.z, 0, -next.dir.x).normalize();
      const nextHalfW = next.width * 0.5;
      const p2 = node.position.clone().addScaledVector(next.dir, radius * 0.8).addScaledVector(nextLeft, nextHalfW);

      polyPoints.push(p1);
      polyPoints.push(p2);
    }

    // Flatten vertices for earcut [x0, z0, x1, z1, ...]
    const flatCoords: number[] = [];
    for (const p of polyPoints) {
      flatCoords.push(p.x, p.z);
    }

    const indices = earcut(flatCoords);
    if (!indices || indices.length === 0) return null;

    const positions = new Float32Array(polyPoints.length * 3);
    const uvs = new Float32Array(polyPoints.length * 2);

    for (let i = 0; i < polyPoints.length; i++) {
      positions[i * 3] = polyPoints[i].x;
      positions[i * 3 + 1] = 0.05; // Slightly above terrain
      positions[i * 3 + 2] = polyPoints[i].z;

      uvs[i * 2] = (polyPoints[i].x - node.position.x) * 0.2;
      uvs[i * 2 + 1] = (polyPoints[i].z - node.position.z) * 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const mesh = new THREE.Mesh(geometry, this.getMaterial());
    mesh.receiveShadow = true;
    mesh.name = `Intersection_${node.id}`;
    mesh.userData = { nodeId: node.id, type: 'intersection' };

    return mesh;
  }
}
