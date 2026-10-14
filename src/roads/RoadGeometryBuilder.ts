import * as THREE from 'three';
import { RoadEdge, ROAD_PROFILES } from './RoadTypes';
import { RoadGraph } from './RoadGraph';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { RoadPropPlacer } from './RoadPropPlacer';

export class RoadGeometryBuilder {
  private static asphaltMaterial: THREE.MeshStandardMaterial | null = null;
  private static sidewalkMaterial: THREE.MeshStandardMaterial | null = null;
  private static markingMaterial: THREE.MeshBasicMaterial | null = null;

  private static initMaterials(): void {
    if (this.asphaltMaterial) return;

    this.asphaltMaterial = MaterialLibrary.getInstance().getMaterial('asphalt', {
      roughness: 0.85,
      metalness: 0.1,
      color: 0xdddddd
    });

    this.sidewalkMaterial = MaterialLibrary.getInstance().getMaterial('paving', {
      roughness: 0.8,
      metalness: 0.05,
      color: 0xffffff
    });

    this.markingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });
  }

  public static buildRoadMeshGroup(edge: RoadEdge, graph: RoadGraph): THREE.Group {
    this.initMaterials();

    const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };
    const group = new THREE.Group();
    group.name = `Road_${edge.id}`;
    group.userData = { edgeId: edge.id, type: 'road' };

    // Samples along Bezier curve
    const segments = Math.max(8, Math.min(60, Math.ceil(edge.length * 1.5)));
    const points: THREE.Vector3[] = [];
    const tangents: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = []; // lateral normals (perpendicular to tangent and UP)

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = graph.sampleBezier(edge.controlPoints, t);
      points.push(pt);

      // Approximate tangent
      const deltaT = 0.005;
      const tNext = Math.min(1, t + deltaT);
      const tPrev = Math.max(0, t - deltaT);
      const ptNext = graph.sampleBezier(edge.controlPoints, tNext);
      const ptPrev = graph.sampleBezier(edge.controlPoints, tPrev);
      const tan = new THREE.Vector3().subVectors(ptNext, ptPrev).normalize();
      tan.y = 0;
      if (tan.lengthSq() < 0.001) tan.set(0, 0, 1);
      tangents.push(tan);

      // Lateral normal (perpendicular to road direction)
      const lat = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      normals.push(lat);
    }

    // 1. Road Asphalt Ribbon
    const halfWidth = profile.width * 0.5;
    const roadGeom = new THREE.BufferGeometry();
    const posCount = (segments + 1) * 2;
    const positions = new Float32Array(posCount * 3);
    const uvs = new Float32Array(posCount * 2);
    const indices: number[] = [];

    let accumLength = 0;

    for (let i = 0; i <= segments; i++) {
      const pt = points[i];
      const norm = normals[i];
      if (i > 0) accumLength += points[i].distanceTo(points[i - 1]);

      const leftPt = pt.clone().addScaledVector(norm, -halfWidth);
      const rightPt = pt.clone().addScaledVector(norm, halfWidth);

      const baseIdx = i * 2;
      // Left vertex
      positions[baseIdx * 3] = leftPt.x;
      positions[baseIdx * 3 + 1] = 0.04; // Slightly above terrain to avoid z-fighting
      positions[baseIdx * 3 + 2] = leftPt.z;
      uvs[baseIdx * 2] = 0;
      uvs[baseIdx * 2 + 1] = accumLength * 0.4;

      // Right vertex
      positions[(baseIdx + 1) * 3] = rightPt.x;
      positions[(baseIdx + 1) * 3 + 1] = 0.04;
      positions[(baseIdx + 1) * 3 + 2] = rightPt.z;
      uvs[(baseIdx + 1) * 2] = 1;
      uvs[(baseIdx + 1) * 2 + 1] = accumLength * 0.4;

      if (i < segments) {
        const v0 = baseIdx;
        const v1 = baseIdx + 1;
        const v2 = baseIdx + 2;
        const v3 = baseIdx + 3;

        indices.push(v0, v2, v1);
        indices.push(v1, v2, v3);
      }
    }

    roadGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    roadGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeom, this.asphaltMaterial!);
    roadMesh.receiveShadow = true;
    roadMesh.userData = { edgeId: edge.id };
    group.add(roadMesh);

    // 2. Road Markings (Putih Tengah)
    if (profile.laneCount >= 2) {
      const markingGeom = new THREE.BufferGeometry();
      const markPositions = new Float32Array(posCount * 3);
      const markHalfW = 0.12;

      for (let i = 0; i <= segments; i++) {
        const pt = points[i];
        const norm = normals[i];
        const mLeft = pt.clone().addScaledVector(norm, -markHalfW);
        const mRight = pt.clone().addScaledVector(norm, markHalfW);

        const baseIdx = i * 2;
        markPositions[baseIdx * 3] = mLeft.x;
        markPositions[baseIdx * 3 + 1] = 0.055;
        markPositions[baseIdx * 3 + 2] = mLeft.z;

        markPositions[(baseIdx + 1) * 3] = mRight.x;
        markPositions[(baseIdx + 1) * 3 + 1] = 0.055;
        markPositions[(baseIdx + 1) * 3 + 2] = mRight.z;
      }

      markingGeom.setAttribute('position', new THREE.BufferAttribute(markPositions, 3));
      markingGeom.setIndex(indices);
      markingGeom.computeVertexNormals();

      const markingMesh = new THREE.Mesh(markingGeom, this.markingMaterial!);
      group.add(markingMesh);
    }

    // 3. Sidewalks (Trotoar kiri dan kanan)
    if (profile.sidewalkWidth > 0) {
      const swWidth = profile.sidewalkWidth;
      const swHeight = profile.curbHeight || 0.15;

      const createSidewalkMesh = (sideMultiplier: number): THREE.Mesh => {
        const swGeom = new THREE.BufferGeometry();
        const swPositions = new Float32Array(posCount * 3);
        const swUvs = new Float32Array(posCount * 2);

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];

          // Inner edge (adjacent to road)
          const innerOffset = sideMultiplier * halfWidth;
          const outerOffset = sideMultiplier * (halfWidth + swWidth);

          const innerPt = pt.clone().addScaledVector(norm, innerOffset);
          const outerPt = pt.clone().addScaledVector(norm, outerOffset);

          const baseIdx = i * 2;
          swPositions[baseIdx * 3] = innerPt.x;
          swPositions[baseIdx * 3 + 1] = swHeight;
          swPositions[baseIdx * 3 + 2] = innerPt.z;
          swUvs[baseIdx * 2] = 0;
          swUvs[baseIdx * 2 + 1] = i * 0.5;

          swPositions[(baseIdx + 1) * 3] = outerPt.x;
          swPositions[(baseIdx + 1) * 3 + 1] = swHeight;
          swPositions[(baseIdx + 1) * 3 + 2] = outerPt.z;
          swUvs[(baseIdx + 1) * 2] = 1;
          swUvs[(baseIdx + 1) * 2 + 1] = i * 0.5;
        }

        swGeom.setAttribute('position', new THREE.BufferAttribute(swPositions, 3));
        swGeom.setAttribute('uv', new THREE.BufferAttribute(swUvs, 2));
        swGeom.setIndex(indices);
        swGeom.computeVertexNormals();

        const swMesh = new THREE.Mesh(swGeom, RoadGeometryBuilder.sidewalkMaterial!);
        swMesh.receiveShadow = true;
        swMesh.castShadow = true;
        return swMesh;
      };

      // Left sidewalk & Right sidewalk
      group.add(createSidewalkMesh(-1));
      group.add(createSidewalkMesh(1));
    }

    // 4. Props: Street Lights & Trees via InstancedMesh
    const lightTransforms: THREE.Matrix4[] = [];
    if (profile.hasStreetLights && profile.lightSpacing > 0) {
      let d = profile.lightSpacing * 0.5;
      while (d < edge.length) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const norm = normals[Math.min(segments, Math.floor(t * segments))];
        const swOffset = halfWidth + (profile.sidewalkWidth > 0 ? profile.sidewalkWidth * 0.5 : 0.6);
        const lightPos = pt.clone().addScaledVector(norm, swOffset);
        lightPos.y = profile.curbHeight || 0;

        const m = new THREE.Matrix4();
        m.makeRotationY(Math.atan2(norm.x, norm.z));
        m.setPosition(lightPos);
        lightTransforms.push(m);

        d += profile.lightSpacing;
      }
    }

    const treeTransforms: THREE.Matrix4[] = [];
    if (profile.hasTrees && profile.treeSpacing > 0 && profile.sidewalkWidth > 0) {
      let d = profile.treeSpacing * 0.7;
      while (d < edge.length) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const norm = normals[Math.min(segments, Math.floor(t * segments))];
        const swOffset = -(halfWidth + profile.sidewalkWidth * 0.5);
        const treePos = pt.clone().addScaledVector(norm, swOffset);
        treePos.y = profile.curbHeight || 0;

        const scale = 0.9 + ((Math.floor(d) * 31) % 5) * 0.06;
        const m = new THREE.Matrix4();
        m.makeScale(scale, scale, scale);
        m.setPosition(treePos);
        treeTransforms.push(m);

        d += profile.treeSpacing;
      }
    }

    if (lightTransforms.length > 0) {
      RoadPropPlacer.addInstancedLights(group, lightTransforms);
    }
    if (treeTransforms.length > 0) {
      RoadPropPlacer.addInstancedTrees(group, treeTransforms);
    }

    return group;
  }
}
