import * as THREE from 'three';
import earcut from 'earcut';
import { RoadGraph } from './RoadGraph';
import { RoadNode, ROAD_PROFILES } from './RoadTypes';
import { RoadMaterialHelper } from './RoadMaterialHelper';
import type { Terrain } from '../world/Terrain';

export class IntersectionBuilder {
  public static buildIntersectionMesh(node: RoadNode, graph: RoadGraph, terrain?: Terrain): THREE.Mesh | null {
    if (node.connectedEdgeIds.length < 2 || !graph.isJunctionNode(node.id)) return null;

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

    // Pastikan seluruh segitiga poligon persimpangan menghadap ke atas (+Y)
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const x0 = polyPoints[i0].x;
      const z0 = polyPoints[i0].z;
      const x1 = polyPoints[i1].x;
      const z1 = polyPoints[i1].z;
      const x2 = polyPoints[i2].x;
      const z2 = polyPoints[i2].z;

      // Cross product (v1 - v0) x (v2 - v0) pada bidang XZ
      const ny = (z1 - z0) * (x2 - x0) - (x1 - x0) * (z2 - z0);
      if (ny < 0) {
        indices[i + 1] = i2;
        indices[i + 2] = i1;
      }
    }

    const positions = new Float32Array(polyPoints.length * 3);
    const uvs = new Float32Array(polyPoints.length * 2);

    for (let i = 0; i < polyPoints.length; i++) {
      const pt = polyPoints[i];
      const groundY = terrain ? terrain.getHeightAt(pt.x, pt.z) : 0;
      positions[i * 3] = pt.x;
      positions[i * 3 + 1] = groundY + 0.06; // Elevasi Y = groundY + 0.06m di atas Terrain
      positions[i * 3 + 2] = pt.z;

      // Planar UV projection based on world coordinates (u = worldX / 4.0, v = worldZ / 4.0)
      uvs[i * 2] = pt.x / 4.0;
      uvs[i * 2 + 1] = pt.z / 4.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    geometry.computeTangents();

    const mat = RoadMaterialHelper.getIntersectionMaterial(node, graph);
    mat.side = THREE.DoubleSide;
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -1;
    mat.polygonOffsetUnits = -1;

    const mesh = new THREE.Mesh(geometry, mat);
    mesh.receiveShadow = true;
    mesh.name = `Intersection_${node.id}`;
    mesh.userData = { nodeId: node.id, type: 'intersection' };

    return mesh;
  }
}
