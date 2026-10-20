import * as THREE from 'three';
import { RoadEdge, ROAD_PROFILES } from './RoadTypes';
import { RoadGraph } from './RoadGraph';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { RoadPropPlacer } from './RoadPropPlacer';
import { ProceduralTextureGen } from '../materials/ProceduralTextureGen';

export class RoadGeometryBuilder {
  private static asphaltMaterial: THREE.MeshStandardMaterial | null = null;
  private static sidewalkMaterial: THREE.MeshStandardMaterial | null = null;
  private static curbMaterial: THREE.MeshStandardMaterial | null = null;
  private static tactileMaterial: THREE.MeshStandardMaterial | null = null;
  private static markingMaterial: THREE.MeshBasicMaterial | null = null;
  private static roadTextMaterial: THREE.MeshStandardMaterial | null = null;

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

    this.curbMaterial = MaterialLibrary.getInstance().getMaterial('concrete', {
      roughness: 0.85,
      metalness: 0.05,
      color: 0x94a3b8
    });

    this.tactileMaterial = MaterialLibrary.getInstance().getMaterial('tactile_paving', {
      roughness: 0.7,
      metalness: 0.1
    });

    this.markingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.88
    });

    const roadTextTex = ProceduralTextureGen.getMalioboroRoadMarkingTexture();
    this.roadTextMaterial = new THREE.MeshStandardMaterial({
      map: roadTextTex,
      transparent: true,
      opacity: 0.92,
      roughness: 0.85,
      metalness: 0.05,
      depthWrite: false
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

    // 2. Road Markings (Garis Tepi Putih Tegas & Garis Marka Putus-putus Tengah)
    if (profile.laneCount >= 2) {
      // 2a. Garis Marka Putus-putus Putih/Kuning di Tengah Jalan (Dashed Centerline)
      const dashLen = 2.4;
      const gapLen = 1.8;
      const cycleLen = dashLen + gapLen;
      const markHalfW = 0.09;
      const centerDashIndices: number[] = [];
      const centerDashPositions: number[] = [];
      let cVertIdx = 0;

      const totalLen = edge.length;
      let d = 0;
      while (d < totalLen) {
        const dEnd = Math.min(d + dashLen, totalLen);
        if (dEnd - d >= 0.4) {
          const segsInDash = Math.max(1, Math.round((dEnd - d) * 3));
          const baseV = cVertIdx;
          for (let s = 0; s <= segsInDash; s++) {
            const curD = d + (s / segsInDash) * (dEnd - d);
            const t = curD / totalLen;
            const pt = graph.sampleBezier(edge.controlPoints, t);
            const segIdx = Math.min(segments, Math.floor(t * segments));
            const norm = normals[segIdx];

            const mL = pt.clone().addScaledVector(norm, -markHalfW);
            const mR = pt.clone().addScaledVector(norm, markHalfW);

            centerDashPositions.push(mL.x, 0.055, mL.z);
            centerDashPositions.push(mR.x, 0.055, mR.z);
            cVertIdx += 2;

            if (s < segsInDash) {
              const v0 = baseV + s * 2;
              const v1 = v0 + 1;
              const v2 = v0 + 2;
              const v3 = v0 + 3;
              centerDashIndices.push(v0, v2, v1);
              centerDashIndices.push(v1, v2, v3);
            }
          }
        }
        d += cycleLen;
      }

      if (centerDashPositions.length > 0) {
        const centerGeom = new THREE.BufferGeometry();
        centerGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(centerDashPositions), 3));
        centerGeom.setIndex(centerDashIndices);
        centerGeom.computeVertexNormals();

        // Marka kuning lembut untuk jalan kolektor, putih untuk jalan lokal
        const isYellow = edge.type === 'collector';
        const dashMat = new THREE.MeshBasicMaterial({
          color: isYellow ? 0xf59e0b : 0xffffff,
          transparent: true,
          opacity: 0.95
        });
        const centerMesh = new THREE.Mesh(centerGeom, dashMat);
        group.add(centerMesh);
      }

      // 2b. Garis Tepi Putih Tegas (Solid Crisp White Edge Markings)
      const edgeMarkDist = halfWidth - 0.28;
      [-1, 1].forEach((side) => {
        const edgeMarkGeom = new THREE.BufferGeometry();
        const edgePositions = new Float32Array(posCount * 3);
        const w = 0.09;

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const center = pt.clone().addScaledVector(norm, side * edgeMarkDist);
          const eL = center.clone().addScaledVector(norm, -w);
          const eR = center.clone().addScaledVector(norm, w);

          const baseIdx = i * 2;
          edgePositions[baseIdx * 3] = eL.x;
          edgePositions[baseIdx * 3 + 1] = 0.054;
          edgePositions[baseIdx * 3 + 2] = eL.z;

          edgePositions[(baseIdx + 1) * 3] = eR.x;
          edgePositions[(baseIdx + 1) * 3 + 1] = 0.054;
          edgePositions[(baseIdx + 1) * 3 + 2] = eR.z;
        }

        edgeMarkGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
        edgeMarkGeom.setIndex(indices);
        edgeMarkGeom.computeVertexNormals();

        const edgeMarkMesh = new THREE.Mesh(edgeMarkGeom, this.markingMaterial!);
        group.add(edgeMarkMesh);
      });
    }

    // 2b. Clean White Stencil Road Text "MALIOBORO" on asphalt surface
    if (edge.length >= 24 && this.roadTextMaterial) {
      const step = Math.min(45, edge.length * 0.5);
      let d = step;
      while (d < edge.length) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const segIdx = Math.min(segments, Math.floor(t * segments));
        const tan = tangents[segIdx];

        const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 1.6), this.roadTextMaterial);
        textPlane.rotateX(-Math.PI / 2);
        const roadAngle = Math.atan2(tan.x, tan.z);
        textPlane.rotateZ(-roadAngle + Math.PI / 2);
        textPlane.position.set(pt.x, 0.052, pt.z);
        group.add(textPlane);

        d += step * 2;
      }
    }

    // 3. Sidewalks, Beveled Curbs & Yellow Tactile Paving
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

      // Concrete Curb Bevel (Batu Pembatas Trotoar 3D)
      const createCurbBevelMesh = (sideMultiplier: number): THREE.Mesh => {
        const curbGeom = new THREE.BufferGeometry();
        const curbPositions = new Float32Array(posCount * 3);

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const roadEdgePt = pt.clone().addScaledVector(norm, sideMultiplier * halfWidth);

          const baseIdx = i * 2;
          // Bottom at asphalt level
          curbPositions[baseIdx * 3] = roadEdgePt.x;
          curbPositions[baseIdx * 3 + 1] = 0.04;
          curbPositions[baseIdx * 3 + 2] = roadEdgePt.z;

          // Top at sidewalk level
          curbPositions[(baseIdx + 1) * 3] = roadEdgePt.x;
          curbPositions[(baseIdx + 1) * 3 + 1] = swHeight;
          curbPositions[(baseIdx + 1) * 3 + 2] = roadEdgePt.z;
        }

        curbGeom.setAttribute('position', new THREE.BufferAttribute(curbPositions, 3));
        curbGeom.setIndex(indices);
        curbGeom.computeVertexNormals();

        const curbMesh = new THREE.Mesh(curbGeom, RoadGeometryBuilder.curbMaterial!);
        curbMesh.castShadow = true;
        curbMesh.receiveShadow = true;
        return curbMesh;
      };

      // Yellow Tactile Paving Blocks (Jalur Ubin Pemandu Disabilitas Kuning)
      const createTactileStripMesh = (sideMultiplier: number): THREE.Mesh => {
        const tacGeom = new THREE.BufferGeometry();
        const tacPositions = new Float32Array(posCount * 3);
        const tacUvs = new Float32Array(posCount * 2);
        const tacWidth = 0.45;
        const tacOffset = sideMultiplier * (halfWidth + swWidth * 0.42);

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const centerPt = pt.clone().addScaledVector(norm, tacOffset);
          const leftPt = centerPt.clone().addScaledVector(norm, -tacWidth * 0.5);
          const rightPt = centerPt.clone().addScaledVector(norm, tacWidth * 0.5);

          const baseIdx = i * 2;
          tacPositions[baseIdx * 3] = leftPt.x;
          tacPositions[baseIdx * 3 + 1] = swHeight + 0.004;
          tacPositions[baseIdx * 3 + 2] = leftPt.z;
          tacUvs[baseIdx * 2] = 0;
          tacUvs[baseIdx * 2 + 1] = i * 0.8;

          tacPositions[(baseIdx + 1) * 3] = rightPt.x;
          tacPositions[(baseIdx + 1) * 3 + 1] = swHeight + 0.004;
          tacPositions[(baseIdx + 1) * 3 + 2] = rightPt.z;
          tacUvs[(baseIdx + 1) * 2] = 1;
          tacUvs[(baseIdx + 1) * 2 + 1] = i * 0.8;
        }

        tacGeom.setAttribute('position', new THREE.BufferAttribute(tacPositions, 3));
        tacGeom.setAttribute('uv', new THREE.BufferAttribute(tacUvs, 2));
        tacGeom.setIndex(indices);
        tacGeom.computeVertexNormals();

        const tacMesh = new THREE.Mesh(tacGeom, RoadGeometryBuilder.tactileMaterial!);
        tacMesh.receiveShadow = true;
        return tacMesh;
      };

      // Add sidewalks, curb bevels, and tactile strips on both sides
      [-1, 1].forEach((side) => {
        group.add(createSidewalkMesh(side));
        group.add(createCurbBevelMesh(side));
        group.add(createTactileStripMesh(side));
      });
    } else {
      // 3b. Bahu Pembatas Beton (#94A3B8) untuk jalan tanpa trotoar lebar
      const curbW = 0.22;
      const curbH = 0.12;
      [-1, 1].forEach((side) => {
        const curbGeom = new THREE.BufferGeometry();
        const curbPositions = new Float32Array(posCount * 3);

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const innerPt = pt.clone().addScaledVector(norm, side * halfWidth);
          const outerPt = pt.clone().addScaledVector(norm, side * (halfWidth + curbW));

          const baseIdx = i * 2;
          curbPositions[baseIdx * 3] = innerPt.x;
          curbPositions[baseIdx * 3 + 1] = curbH;
          curbPositions[baseIdx * 3 + 2] = innerPt.z;

          curbPositions[(baseIdx + 1) * 3] = outerPt.x;
          curbPositions[(baseIdx + 1) * 3 + 1] = curbH;
          curbPositions[(baseIdx + 1) * 3 + 2] = outerPt.z;
        }

        curbGeom.setAttribute('position', new THREE.BufferAttribute(curbPositions, 3));
        curbGeom.setIndex(indices);
        curbGeom.computeVertexNormals();

        const curbMesh = new THREE.Mesh(curbGeom, RoadGeometryBuilder.curbMaterial!);
        curbMesh.castShadow = true;
        curbMesh.receiveShadow = true;
        group.add(curbMesh);
      });
    }

    // 4. Props: Street Lights, Trees, Planter Pits, Benches, and Bollards
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

        // Add companion bollard light nearby
        if (profile.sidewalkWidth > 0 && d + 6 < edge.length) {
          const bollardPos = lightPos.clone().addScaledVector(norm, -0.6);
          group.add(RoadPropPlacer.createBollardLight(bollardPos));
        }

        // Add park bench between light intervals
        if (profile.sidewalkWidth >= 2.5 && d + profile.lightSpacing * 0.4 < edge.length) {
          const benchT = (d + profile.lightSpacing * 0.4) / edge.length;
          const benchBase = graph.sampleBezier(edge.controlPoints, benchT);
          const benchNorm = normals[Math.min(segments, Math.floor(benchT * segments))];
          const benchPos = benchBase.clone().addScaledVector(benchNorm, halfWidth + profile.sidewalkWidth * 0.75);
          benchPos.y = profile.curbHeight || 0;
          const rotY = Math.atan2(benchNorm.x, benchNorm.z) + Math.PI;
          group.add(RoadPropPlacer.createParkBench(benchPos, rotY));
        }

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

        const scale = 0.95 + ((Math.floor(d) * 31) % 5) * 0.05;
        const m = new THREE.Matrix4();
        m.makeScale(scale, scale, scale);
        m.setPosition(treePos);
        treeTransforms.push(m);

        // Tree Planter Pit around every tree
        group.add(RoadPropPlacer.createTreePlanterPit(treePos));

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
