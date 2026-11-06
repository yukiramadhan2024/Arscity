import * as THREE from 'three';
import earcut from 'earcut';
import { RoadGraph } from './RoadGraph';
import { RoadNode, ROAD_PROFILES, RoadType } from './RoadTypes';
import { RoadMaterialHelper } from './RoadMaterialHelper';
import type { Terrain } from '../world/Terrain';

export class IntersectionBuilder {
  public static buildIntersectionMesh(node: RoadNode, graph: RoadGraph, terrain?: Terrain): THREE.Mesh | null {
    if (node.connectedEdgeIds.length < 2 || !graph.isJunctionNode(node.id)) return null;

    // Collect connected edges and their true incident tangent directions from node
    const edgeData: { edgeId: string; dir: THREE.Vector3; width: number; angle: number; type: RoadType }[] = [];

    for (const edgeId of node.connectedEdgeIds) {
      const edge = graph.edges.get(edgeId);
      if (!edge) continue;

      const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };
      const isStart = edge.startNodeId === node.id;
      const otherNodeId = isStart ? edge.endNodeId : edge.startNodeId;
      const otherNode = graph.nodes.get(otherNodeId);
      if (!otherNode) continue;

      // Incident tangent pointing AWAY from node along the curve/line
      let dir = new THREE.Vector3();
      if (edge.controlPoints && edge.controlPoints.length >= 2) {
        if (isStart) {
          dir.subVectors(edge.controlPoints[1], edge.controlPoints[0]);
        } else {
          const lastIdx = edge.controlPoints.length - 1;
          dir.subVectors(edge.controlPoints[lastIdx - 1], edge.controlPoints[lastIdx]);
        }
      }
      dir.y = 0;
      if (dir.lengthSq() < 0.001) {
        dir.subVectors(otherNode.position, node.position);
        dir.y = 0;
      }
      if (dir.lengthSq() < 0.001) dir.set(1, 0, 0);
      dir.normalize();

      const angle = Math.atan2(dir.z, dir.x);
      edgeData.push({ edgeId, dir, width: profile.width, angle, type: edge.type });
    }

    if (edgeData.length < 2) return null;

    // Sort edges counter-clockwise by angle
    edgeData.sort((a, b) => a.angle - b.angle);

    // Matching trimming radius used in RoadGeometryBuilder: max(widths) * 0.52
    const maxW = Math.max(...edgeData.map((e) => e.width));
    const radius = maxW * 0.52;

    // Build boundary polygon vertices around the intersection with smooth corner curb fillets
    const polyPoints: THREE.Vector3[] = [];

    for (let i = 0; i < edgeData.length; i++) {
      const curr = edgeData[i];
      const next = edgeData[(i + 1) % edgeData.length];

      // Perpendicular lateral vector for curr edge (pointing to right)
      const right = new THREE.Vector3(-curr.dir.z, 0, curr.dir.x).normalize();
      const halfW = curr.width * 0.5;

      // Corner start: Right side of current edge at intersection boundary
      const p1 = node.position.clone().addScaledVector(curr.dir, radius).addScaledVector(right, halfW);

      // Perpendicular lateral vector for next edge (pointing to left)
      const nextLeft = new THREE.Vector3(next.dir.z, 0, -next.dir.x).normalize();
      const nextHalfW = next.width * 0.5;

      // Corner end: Left side of next edge at intersection boundary
      const p2 = node.position.clone().addScaledVector(next.dir, radius).addScaledVector(nextLeft, nextHalfW);

      let dAngle = next.angle - curr.angle;
      if (dAngle < 0) dAngle += Math.PI * 2;

      polyPoints.push(p1);

      // If angle indicates a corner turn (< 155 deg, e.g. ~90 deg perempatan / pertigaan corner),
      // generate smooth curb fillet arc rounding between the two roads
      if (dAngle > 0.35 && dAngle < 2.7) {
        // Corner intersection point
        const cornerTarget = node.position.clone()
          .addScaledVector(right, halfW * 0.95)
          .addScaledVector(nextLeft, nextHalfW * 0.95);

        // Subdivide fillet curve with quadratic Bezier
        const b1 = new THREE.Vector3().lerpVectors(p1, cornerTarget, 0.45).lerp(
          new THREE.Vector3().lerpVectors(cornerTarget, p2, 0.45),
          0.45
        );
        const b2 = new THREE.Vector3().lerpVectors(p1, cornerTarget, 0.75).lerp(
          new THREE.Vector3().lerpVectors(cornerTarget, p2, 0.75),
          0.75
        );

        polyPoints.push(b1);
        polyPoints.push(b2);
      }

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

    // Add crisp white zebra crosswalk markings on vehicular branches with sidewalks
    this.addZebraCrosswalks(mesh, node, edgeData, radius, terrain);

    // Freeze static matrix for road intersections
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    mesh.updateMatrixWorld(true);

    return mesh;
  }

  /**
   * Generates realistic zebra crossing stripes across intersecting road branches.
   */
  private static addZebraCrosswalks(
    parentMesh: THREE.Mesh,
    node: RoadNode,
    edgeData: { edgeId: string; dir: THREE.Vector3; width: number; type: RoadType }[],
    radius: number,
    terrain?: Terrain
  ): void {
    const zebraPositions: number[] = [];
    const zebraIndices: number[] = [];
    let vertIdx = 0;

    for (const edge of edgeData) {
      if (edge.type === 'pedestrian' || edge.type === 'cycle' || edge.type === 'alley') continue;
      if (edge.width < 5.0) continue;

      const right = new THREE.Vector3(-edge.dir.z, 0, edge.dir.x).normalize();
      const crosswalkCenterDist = radius * 0.80;
      const crosswalkLen = 2.0; // 2m long along road direction
      const stripeW = 0.42; // 42cm wide stripe
      const gapW = 0.38; // 38cm gap
      const cycleW = stripeW + gapW;

      const halfAsphalt = edge.width * 0.5 - 0.7; // Avoid curbs
      const startOffset = -halfAsphalt + 0.3;
      const endOffset = halfAsphalt - 0.3;
      const usableSpan = endOffset - startOffset;
      const numStripes = Math.floor(usableSpan / cycleW);

      for (let s = 0; s < numStripes; s++) {
        const lateralDist = startOffset + s * cycleW;
        const cNear = node.position.clone()
          .addScaledVector(edge.dir, crosswalkCenterDist - crosswalkLen * 0.5)
          .addScaledVector(right, lateralDist);
        const cFar = node.position.clone()
          .addScaledVector(edge.dir, crosswalkCenterDist + crosswalkLen * 0.5)
          .addScaledVector(right, lateralDist);

        const pL0 = cNear.clone().addScaledVector(right, -stripeW * 0.5);
        const pR0 = cNear.clone().addScaledVector(right, stripeW * 0.5);
        const pL1 = cFar.clone().addScaledVector(right, -stripeW * 0.5);
        const pR1 = cFar.clone().addScaledVector(right, stripeW * 0.5);

        const y0 = (terrain ? terrain.getHeightAt(cNear.x, cNear.z) : 0) + 0.075;
        const y1 = (terrain ? terrain.getHeightAt(cFar.x, cFar.z) : 0) + 0.075;

        const base = vertIdx;
        zebraPositions.push(pL0.x, y0, pL0.z);
        zebraPositions.push(pR0.x, y0, pR0.z);
        zebraPositions.push(pL1.x, y1, pL1.z);
        zebraPositions.push(pR1.x, y1, pR1.z);

        zebraIndices.push(base, base + 1, base + 2);
        zebraIndices.push(base + 1, base + 3, base + 2);
        vertIdx += 4;
      }
    }

    if (zebraPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(zebraPositions, 3));
      geom.setIndex(zebraIndices);
      geom.computeVertexNormals();

      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });

      const zebraMesh = new THREE.Mesh(geom, mat);
      zebraMesh.name = `ZebraCrosswalk_${node.id}`;
      zebraMesh.matrixAutoUpdate = false;
      zebraMesh.updateMatrix();
      zebraMesh.updateMatrixWorld(true);

      parentMesh.add(zebraMesh);
    }
  }
}
