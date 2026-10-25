import * as THREE from 'three';
import { RoadEdge, ROAD_PROFILES } from './RoadTypes';
import { RoadGraph } from './RoadGraph';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { RoadPropPlacer } from './RoadPropPlacer';
import { ProceduralTextureGen } from '../materials/ProceduralTextureGen';
import { RoadMaterialHelper } from './RoadMaterialHelper';

export class RoadGeometryBuilder {
  private static asphaltMaterial: THREE.MeshStandardMaterial | null = null;
  private static sidewalkMaterial: THREE.MeshStandardMaterial | null = null;
  private static curbMaterial: THREE.MeshStandardMaterial | null = null;
  private static tactileMaterial: THREE.MeshStandardMaterial | null = null;
  private static markingMaterial: THREE.MeshBasicMaterial | null = null;
  private static roadTextMaterial: THREE.MeshStandardMaterial | null = null;

  private static initMaterials(): void {
    if (this.asphaltMaterial) return;

    this.asphaltMaterial = MaterialLibrary.get('road_asphalt');
    this.asphaltMaterial.side = THREE.DoubleSide;
    this.asphaltMaterial.polygonOffset = true;
    this.asphaltMaterial.polygonOffsetFactor = -1;
    this.asphaltMaterial.polygonOffsetUnits = -1;

    this.sidewalkMaterial = MaterialLibrary.getInstance().getMaterial('paving', {
      roughness: 0.8,
      metalness: 0.05,
      color: 0xffffff
    });
    this.sidewalkMaterial.side = THREE.DoubleSide;
    this.sidewalkMaterial.polygonOffset = true;
    this.sidewalkMaterial.polygonOffsetFactor = -1;
    this.sidewalkMaterial.polygonOffsetUnits = -1;

    this.curbMaterial = MaterialLibrary.getInstance().getMaterial('concrete', {
      roughness: 0.85,
      metalness: 0.05,
      color: 0x94a3b8
    });
    this.curbMaterial.side = THREE.DoubleSide;

    this.tactileMaterial = MaterialLibrary.getInstance().getMaterial('tactile_paving', {
      roughness: 0.7,
      metalness: 0.1
    });
    this.tactileMaterial.side = THREE.DoubleSide;

    this.markingMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });

    const roadTextTex = ProceduralTextureGen.getMalioboroRoadMarkingTexture();
    this.roadTextMaterial = new THREE.MeshStandardMaterial({
      map: roadTextTex,
      transparent: true,
      opacity: 0.95,
      roughness: 0.85,
      metalness: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2
    });
  }

  public static buildRoadMeshGroup(edge: RoadEdge, graph: RoadGraph): THREE.Group {
    this.initMaterials();

    const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };
    const matConfig = RoadMaterialHelper.getConfig(edge.type);

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

    // 1. Road Carriageway Ribbon (Badan Jalan Utama)
    const halfWidth = profile.width * 0.5;
    const roadGeom = new THREE.BufferGeometry();
    const posCount = (segments + 1) * 2;
    const positions = new Float32Array(posCount * 3);
    const uvs = new Float32Array(posCount * 2);
    const indices: number[] = [];

    const distances: number[] = new Array(segments + 1);
    distances[0] = 0;
    for (let i = 1; i <= segments; i++) {
      distances[i] = distances[i - 1] + points[i].distanceTo(points[i - 1]);
    }

    for (let i = 0; i <= segments; i++) {
      const pt = points[i];
      const norm = normals[i];
      const dist = distances[i];

      const leftPt = pt.clone().addScaledVector(norm, -halfWidth);
      const rightPt = pt.clone().addScaledVector(norm, halfWidth);

      const baseIdx = i * 2;
      // Left vertex (cross-section u = 0, v = curveDistance / 4.0) at Y = 0.06m
      positions[baseIdx * 3] = leftPt.x;
      positions[baseIdx * 3 + 1] = 0.06;
      positions[baseIdx * 3 + 2] = leftPt.z;
      uvs[baseIdx * 2] = 0.0;
      uvs[baseIdx * 2 + 1] = dist / 4.0;

      // Right vertex (cross-section u = 1.0, v = curveDistance / 4.0) at Y = 0.06m
      positions[(baseIdx + 1) * 3] = rightPt.x;
      positions[(baseIdx + 1) * 3 + 1] = 0.06;
      positions[(baseIdx + 1) * 3 + 2] = rightPt.z;
      uvs[(baseIdx + 1) * 2] = 1.0;
      uvs[(baseIdx + 1) * 2 + 1] = dist / 4.0;

      if (i < segments) {
        const v0 = baseIdx;
        const v1 = baseIdx + 1;
        const v2 = baseIdx + 2;
        const v3 = baseIdx + 3;

        // Segitiga menghadap ke atas (+Y normal)
        indices.push(v0, v1, v2);
        indices.push(v1, v3, v2);
      }
    }

    roadGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    roadGeom.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    roadGeom.setIndex(indices);
    roadGeom.computeVertexNormals();
    roadGeom.computeTangents();

    const roadMat = RoadMaterialHelper.getRoadSurfaceMaterial(edge.type);
    const roadMesh = new THREE.Mesh(roadGeom, roadMat);
    roadMesh.name = 'RoadMesh';
    roadMesh.receiveShadow = true;
    roadMesh.userData = { edgeId: edge.id };
    group.add(roadMesh);

    // 2. Road Markings (Marka Tengah & Garis Tepi)
    // 2a. Marka Tengah
    if (matConfig.hasCenterMarking) {
      if (matConfig.centerMarkingType === 'double_solid') {
        // Marka Kuning Ganda Solid (Double Solid Yellow Centerlines) untuk Jalan Arteri
        const doubleOffsets = [-0.18, 0.18];
        const lineHalfW = 0.08;
        const yellowMat = new THREE.MeshBasicMaterial({
          color: matConfig.centerMarkingColor,
          transparent: true,
          opacity: 0.95,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        });

        doubleOffsets.forEach((offset) => {
          const doubleLineGeom = new THREE.BufferGeometry();
          const linePositions = new Float32Array(posCount * 3);
          const lineIndices: number[] = [];

          for (let i = 0; i <= segments; i++) {
            const pt = points[i];
            const norm = normals[i];
            const center = pt.clone().addScaledVector(norm, offset);
            const pL = center.clone().addScaledVector(norm, -lineHalfW);
            const pR = center.clone().addScaledVector(norm, lineHalfW);

            const baseIdx = i * 2;
            linePositions[baseIdx * 3] = pL.x;
            linePositions[baseIdx * 3 + 1] = 0.075;
            linePositions[baseIdx * 3 + 2] = pL.z;

            linePositions[(baseIdx + 1) * 3] = pR.x;
            linePositions[(baseIdx + 1) * 3 + 1] = 0.075;
            linePositions[(baseIdx + 1) * 3 + 2] = pR.z;

            if (i < segments) {
              const v0 = baseIdx;
              const v1 = baseIdx + 1;
              const v2 = baseIdx + 2;
              const v3 = baseIdx + 3;
              lineIndices.push(v0, v1, v2);
              lineIndices.push(v1, v3, v2);
            }
          }

          doubleLineGeom.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
          doubleLineGeom.setIndex(lineIndices);
          doubleLineGeom.computeVertexNormals();

          const doubleMesh = new THREE.Mesh(doubleLineGeom, yellowMat);
          group.add(doubleMesh);
        });
      } else if (matConfig.centerMarkingType === 'dashed') {
        // Garis Marka Putus-putus (Dashed Centerline)
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

              centerDashPositions.push(mL.x, 0.075, mL.z);
              centerDashPositions.push(mR.x, 0.075, mR.z);
              cVertIdx += 2;

              if (s < segsInDash) {
                const v0 = baseV + s * 2;
                const v1 = v0 + 1;
                const v2 = v0 + 2;
                const v3 = v0 + 3;
                centerDashIndices.push(v0, v1, v2);
                centerDashIndices.push(v1, v3, v2);
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

          const dashMat = new THREE.MeshBasicMaterial({
            color: matConfig.centerMarkingColor,
            transparent: true,
            opacity: 0.95,
            side: THREE.DoubleSide,
            polygonOffset: true,
            polygonOffsetFactor: -2,
            polygonOffsetUnits: -2,
          });
          const centerMesh = new THREE.Mesh(centerGeom, dashMat);
          group.add(centerMesh);
        }
      }
    }

    // 2b. Garis Tepi Tegas (Crisp Edge Markings)
    if (matConfig.hasEdgeMarking) {
      const edgeMarkDist = Math.max(0.4, halfWidth - (edge.type === 'alley' ? 0.18 : 0.28));
      const edgeMarkMat = new THREE.MeshBasicMaterial({
        color: matConfig.edgeMarkingColor,
        transparent: true,
        opacity: 0.95,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });

      [-1, 1].forEach((side) => {
        const edgeMarkGeom = new THREE.BufferGeometry();
        const edgePositions = new Float32Array(posCount * 3);
        const edgeIndices: number[] = [];
        const w = edge.type === 'alley' ? 0.06 : 0.09;

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const center = pt.clone().addScaledVector(norm, side * edgeMarkDist);
          const eL = center.clone().addScaledVector(norm, -w);
          const eR = center.clone().addScaledVector(norm, w);

          const baseIdx = i * 2;
          edgePositions[baseIdx * 3] = eL.x;
          edgePositions[baseIdx * 3 + 1] = 0.075;
          edgePositions[baseIdx * 3 + 2] = eL.z;

          edgePositions[(baseIdx + 1) * 3] = eR.x;
          edgePositions[(baseIdx + 1) * 3 + 1] = 0.075;
          edgePositions[(baseIdx + 1) * 3 + 2] = eR.z;

          if (i < segments) {
            const v0 = baseIdx;
            const v1 = baseIdx + 1;
            const v2 = baseIdx + 2;
            const v3 = baseIdx + 3;
            edgeIndices.push(v0, v1, v2);
            edgeIndices.push(v1, v3, v2);
          }
        }

        edgeMarkGeom.setAttribute('position', new THREE.BufferAttribute(edgePositions, 3));
        edgeMarkGeom.setIndex(edgeIndices);
        edgeMarkGeom.computeVertexNormals();

        const edgeMarkMesh = new THREE.Mesh(edgeMarkGeom, edgeMarkMat);
        group.add(edgeMarkMesh);
      });
    }

    // 2c. Clean White Stencil Road Text "MALIOBORO" on asphalt surface
    if (edge.length >= 24 && this.roadTextMaterial && (edge.type === 'arterial' || edge.type === 'collector')) {
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
        textPlane.position.set(pt.x, 0.075, pt.z); // Berada tepat di atas aspal pada Y = 0.075m
        group.add(textPlane);

        d += step * 2;
      }
    }

    // 3. Sidewalks, Beveled Curbs & Yellow Tactile Paving
    if (profile.sidewalkWidth > 0) {
      const swWidth = profile.sidewalkWidth;
      const swHeight = Math.max(0.16, profile.curbHeight || 0.16);

      const createSidewalkMesh = (sideMultiplier: number): THREE.Mesh => {
        const swGeom = new THREE.BufferGeometry();
        const swPositions = new Float32Array(posCount * 3);
        const swUvs = new Float32Array(posCount * 2);
        const swIndices: number[] = [];

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];

          // Inner edge (adjacent to road)
          const innerOffset = sideMultiplier * halfWidth;
          const outerOffset = sideMultiplier * (halfWidth + swWidth);

          const innerPt = pt.clone().addScaledVector(norm, innerOffset);
          const outerPt = pt.clone().addScaledVector(norm, outerOffset);

          const baseIdx = i * 2;
          const dist = distances[i];
          swPositions[baseIdx * 3] = innerPt.x;
          swPositions[baseIdx * 3 + 1] = swHeight; // Y = 0.16m
          swPositions[baseIdx * 3 + 2] = innerPt.z;
          swUvs[baseIdx * 2] = 0;
          swUvs[baseIdx * 2 + 1] = dist / 1.5;

          swPositions[(baseIdx + 1) * 3] = outerPt.x;
          swPositions[(baseIdx + 1) * 3 + 1] = swHeight;
          swPositions[(baseIdx + 1) * 3 + 2] = outerPt.z;
          swUvs[(baseIdx + 1) * 2] = swWidth / 1.5;
          swUvs[(baseIdx + 1) * 2 + 1] = dist / 1.5;

          if (i < segments) {
            const v0 = baseIdx;
            const v1 = baseIdx + 1;
            const v2 = baseIdx + 2;
            const v3 = baseIdx + 3;
            swIndices.push(v0, v1, v2);
            swIndices.push(v1, v3, v2);
          }
        }

        swGeom.setAttribute('position', new THREE.BufferAttribute(swPositions, 3));
        swGeom.setAttribute('uv', new THREE.BufferAttribute(swUvs, 2));
        swGeom.setIndex(swIndices);
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
        const curbIndices: number[] = [];

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const roadEdgePt = pt.clone().addScaledVector(norm, sideMultiplier * halfWidth);

          const baseIdx = i * 2;
          // Bottom at road level (Y = 0.06m)
          curbPositions[baseIdx * 3] = roadEdgePt.x;
          curbPositions[baseIdx * 3 + 1] = 0.06;
          curbPositions[baseIdx * 3 + 2] = roadEdgePt.z;

          // Top at sidewalk level (Y = 0.16m)
          curbPositions[(baseIdx + 1) * 3] = roadEdgePt.x;
          curbPositions[(baseIdx + 1) * 3 + 1] = swHeight;
          curbPositions[(baseIdx + 1) * 3 + 2] = roadEdgePt.z;

          if (i < segments) {
            const v0 = baseIdx;
            const v1 = baseIdx + 1;
            const v2 = baseIdx + 2;
            const v3 = baseIdx + 3;
            curbIndices.push(v0, v1, v2);
            curbIndices.push(v1, v3, v2);
          }
        }

        curbGeom.setAttribute('position', new THREE.BufferAttribute(curbPositions, 3));
        curbGeom.setIndex(curbIndices);
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
        const tacIndices: number[] = [];
        const tacWidth = 0.45;
        const tacOffset = sideMultiplier * (halfWidth + swWidth * 0.42);

        for (let i = 0; i <= segments; i++) {
          const pt = points[i];
          const norm = normals[i];
          const dist = distances[i];
          const centerPt = pt.clone().addScaledVector(norm, tacOffset);
          const leftPt = centerPt.clone().addScaledVector(norm, -tacWidth * 0.5);
          const rightPt = centerPt.clone().addScaledVector(norm, tacWidth * 0.5);

          const baseIdx = i * 2;
          tacPositions[baseIdx * 3] = leftPt.x;
          tacPositions[baseIdx * 3 + 1] = swHeight + 0.005;
          tacPositions[baseIdx * 3 + 2] = leftPt.z;
          tacUvs[baseIdx * 2] = 0;
          tacUvs[baseIdx * 2 + 1] = dist / 0.6;

          tacPositions[(baseIdx + 1) * 3] = rightPt.x;
          tacPositions[(baseIdx + 1) * 3 + 1] = swHeight + 0.005;
          tacPositions[(baseIdx + 1) * 3 + 2] = rightPt.z;
          tacUvs[(baseIdx + 1) * 2] = tacWidth / 0.45;
          tacUvs[(baseIdx + 1) * 2 + 1] = dist / 0.6;

          if (i < segments) {
            const v0 = baseIdx;
            const v1 = baseIdx + 1;
            const v2 = baseIdx + 2;
            const v3 = baseIdx + 3;
            tacIndices.push(v0, v1, v2);
            tacIndices.push(v1, v3, v2);
          }
        }

        tacGeom.setAttribute('position', new THREE.BufferAttribute(tacPositions, 3));
        tacGeom.setAttribute('uv', new THREE.BufferAttribute(tacUvs, 2));
        tacGeom.setIndex(tacIndices);
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
      const curbH = 0.16; // Standar elevasi 0.16m
      [-1, 1].forEach((side) => {
        const curbGeom = new THREE.BufferGeometry();
        const curbPositions = new Float32Array(posCount * 3);
        const curbIndices: number[] = [];

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

          if (i < segments) {
            const v0 = baseIdx;
            const v1 = baseIdx + 1;
            const v2 = baseIdx + 2;
            const v3 = baseIdx + 3;
            curbIndices.push(v0, v1, v2);
            curbIndices.push(v1, v3, v2);
          }
        }

        curbGeom.setAttribute('position', new THREE.BufferAttribute(curbPositions, 3));
        curbGeom.setIndex(curbIndices);
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
        lightPos.y = profile.curbHeight || 0.16;

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
          benchPos.y = profile.curbHeight || 0.16;
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
        treePos.y = profile.curbHeight || 0.16;

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

    // Subsurface Drainage System (Box Culverts, Biopori Shafts, Sumur Resapan)
    const subsurfaceGroup = new THREE.Group();
    subsurfaceGroup.name = 'SubsurfaceDrainage';
    subsurfaceGroup.visible = false;

    if (profile.sidewalkWidth > 0 && points.length >= 2) {
      const concreteMat = MaterialLibrary.getInstance().getMaterial('concrete', { roughness: 0.9, color: 0x475569 });
      const culvertWidth = Math.min(1.2, profile.sidewalkWidth * 0.8);
      const culvertHeight = 0.9;
      const culvertY = -0.75;

      for (const side of [-1, 1]) {
        const culvertOffset = side * (halfWidth + profile.sidewalkWidth * 0.5);
        for (let i = 0; i < points.length - 1; i++) {
          const p1 = points[i].clone().addScaledVector(normals[i], culvertOffset);
          const p2 = points[i + 1].clone().addScaledVector(normals[i + 1], culvertOffset);
          p1.y = culvertY;
          p2.y = culvertY;

          const segLen = p1.distanceTo(p2);
          if (segLen > 0.05) {
            const culvertGeom = new THREE.BoxGeometry(culvertWidth, culvertHeight, segLen);
            const culvertMesh = new THREE.Mesh(culvertGeom, concreteMat);
            culvertMesh.position.copy(p1).add(p2).multiplyScalar(0.5);
            culvertMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p2.clone().sub(p1).normalize());
            subsurfaceGroup.add(culvertMesh);
          }
        }
      }

      const resapanGeom = new THREE.CylinderGeometry(0.5, 0.5, 3.0, 12);
      const bioporiGeom = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
      const gravelMat = MaterialLibrary.getInstance().getMaterial('stone_plinth', { roughness: 0.95, color: 0x334155 });

      let drainageD = 15;
      while (drainageD < edge.length) {
        const t = drainageD / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const norm = normals[Math.min(segments, Math.floor(t * segments))];

        const resapanPos = pt.clone().addScaledVector(norm, halfWidth + profile.sidewalkWidth * 0.7);
        resapanPos.y = -1.5;
        const resapanMesh = new THREE.Mesh(resapanGeom, concreteMat);
        resapanMesh.position.copy(resapanPos);
        subsurfaceGroup.add(resapanMesh);

        const bioporiPos = pt.clone().addScaledVector(norm, -(halfWidth + profile.sidewalkWidth * 0.7));
        bioporiPos.y = -0.6;
        const bioporiMesh = new THREE.Mesh(bioporiGeom, gravelMat);
        bioporiMesh.position.copy(bioporiPos);
        subsurfaceGroup.add(bioporiMesh);

        drainageD += 25;
      }
    }

    group.add(subsurfaceGroup);
    group.userData.subsurfaceDrainage = subsurfaceGroup;

    return group;
  }
}
