import * as THREE from 'three';
import { RoadEdge, ROAD_PROFILES } from './RoadTypes';
import { RoadGraph } from './RoadGraph';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { RoadPropPlacer } from './RoadPropPlacer';
import { ProceduralTextureGen } from '../materials/ProceduralTextureGen';
import { RoadMaterialHelper } from './RoadMaterialHelper';
import type { Terrain } from '../world/Terrain';
import type { RoadManager } from './RoadManager';

export class RoadGeometryBuilder {
  private static asphaltMaterial: THREE.MeshStandardMaterial | null = null;
  private static sidewalkMaterial: THREE.MeshStandardMaterial | null = null;
  private static curbMaterial: THREE.MeshStandardMaterial | null = null;
  private static tactileMaterial: THREE.MeshStandardMaterial | null = null;
  private static markingMaterial: THREE.MeshBasicMaterial | null = null;
  private static roadTextMaterial: THREE.MeshStandardMaterial | null = null;
  private static roadTextMaterials: Map<string, THREE.MeshStandardMaterial> = new Map();

  public static getRoadTextMaterial(roadName: string): THREE.MeshStandardMaterial {
    const key = (roadName || 'JL. KOTA').toUpperCase().trim();
    if (this.roadTextMaterials.has(key)) {
      return this.roadTextMaterials.get(key)!;
    }
    const tex = ProceduralTextureGen.getRoadSurfaceNameTexture(key);
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
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
    this.roadTextMaterials.set(key, mat);
    return mat;
  }

  public static resolveRoadName(edge: RoadEdge): string {
    if (edge.name) return edge.name;

    const ARTERIAL_NAMES = [
      'JL. MALIOBORO',
      'JL. MANGKUBUMI',
      'JL. JEND. SUDIRMAN',
      'JL. A. YANI',
      'JL. DIPONEGORO',
      'JL. VETERAN'
    ];
    const COLLECTOR_NAMES = [
      'JL. KALIURANG',
      'JL. GEJAYAN',
      'JL. PALAGAN',
      'JL. MATARAM',
      'JL. SENOPATI',
      'JL. KHA DAHLAN'
    ];
    const LOCAL_NAMES = [
      'JL. KEMETIRAN',
      'JL. DAGEN',
      'JL. SOSROWIJAYAN',
      'JL. PAJEKSAN',
      'JL. PASAR KEMBANG'
    ];
    const ALLEY_NAMES = [
      'GG. CEMPAKA',
      'GG. KENANGA',
      'GG. MAWAR',
      'GG. MELATI'
    ];

    let hash = 0;
    for (let i = 0; i < edge.id.length; i++) {
      hash = (hash * 31 + edge.id.charCodeAt(i)) >>> 0;
    }

    if (edge.type === 'arterial') {
      return ARTERIAL_NAMES[hash % ARTERIAL_NAMES.length];
    } else if (edge.type === 'collector') {
      return COLLECTOR_NAMES[hash % COLLECTOR_NAMES.length];
    } else if (edge.type === 'local') {
      return LOCAL_NAMES[hash % LOCAL_NAMES.length];
    } else if (edge.type === 'alley') {
      return ALLEY_NAMES[hash % ALLEY_NAMES.length];
    }
    return 'JL. KOTA';
  }

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
      color: 0x9e9e9e
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

  public static buildRoadMeshGroup(
    edge: RoadEdge,
    graph: RoadGraph,
    terrain?: Terrain,
    roadManager?: RoadManager
  ): THREE.Group {
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
    const rawGroundY: number[] = [];
    const effectiveGroundY: number[] = [];
    const isBridgeSample: boolean[] = [];

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

      const gy = terrain ? terrain.getHeightAt(pt.x, pt.z) : 0;
      rawGroundY.push(gy);
    }

    // River / valley crossing: keep deck level at bank height (deckY >= 0.10m)
    const startBankY = rawGroundY[0];
    const endBankY = rawGroundY[segments];
    let hasBridge = false;

    for (let i = 0; i <= segments; i++) {
      const raw = rawGroundY[i];
      if (raw < -0.25) {
        hasBridge = true;
        isBridgeSample[i] = true;
        const t = i / segments;
        const bankY = THREE.MathUtils.lerp(startBankY, endBankY, t);
        effectiveGroundY[i] = Math.max(bankY, 0.10);
      } else {
        isBridgeSample[i] = false;
        effectiveGroundY[i] = raw;
      }
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

    // Junction trimming radii to ensure sidewalks, curbs, markings, and props never invade intersection boxes
    const startNode = graph.nodes.get(edge.startNodeId);
    const endNode = graph.nodes.get(edge.endNodeId);
    const startIsJunction = startNode ? graph.isJunctionNode(startNode.id) : false;
    const endIsJunction = endNode ? graph.isJunctionNode(endNode.id) : false;

    const startRadius = startIsJunction && startNode
      ? Math.max(...(startNode.connectedEdgeIds.map((id) => {
          const e = graph.edges.get(id);
          return e ? (ROAD_PROFILES[e.type]?.width || profile.width) : profile.width;
        }))) * 0.52
      : 0;

    const endRadius = endIsJunction && endNode
      ? Math.max(...(endNode.connectedEdgeIds.map((id) => {
          const e = graph.edges.get(id);
          return e ? (ROAD_PROFILES[e.type]?.width || profile.width) : profile.width;
        }))) * 0.52
      : 0;

    for (let i = 0; i <= segments; i++) {
      const pt = points[i];
      const norm = normals[i];
      const dist = distances[i];
      const groundY = effectiveGroundY[i];

      const leftPt = pt.clone().addScaledVector(norm, -halfWidth);
      const rightPt = pt.clone().addScaledVector(norm, halfWidth);

      const baseIdx = i * 2;
      // Left vertex at groundY + 0.06m
      positions[baseIdx * 3] = leftPt.x;
      positions[baseIdx * 3 + 1] = groundY + 0.06;
      positions[baseIdx * 3 + 2] = leftPt.z;
      uvs[baseIdx * 2] = 0.0;
      uvs[baseIdx * 2 + 1] = dist / 4.0;

      // Right vertex at groundY + 0.06m
      positions[(baseIdx + 1) * 3] = rightPt.x;
      positions[(baseIdx + 1) * 3 + 1] = groundY + 0.06;
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
          const linePositions: number[] = [];
          const lineIndices: number[] = [];
          let vLine = 0;

          for (let i = 0; i < segments; i++) {
            const midDist = (distances[i] + distances[i + 1]) * 0.5;
            if (startIsJunction && midDist < startRadius + 0.4) continue;
            if (endIsJunction && midDist > edge.length - endRadius - 0.4) continue;

            const pt0 = points[i];
            const pt1 = points[i + 1];
            const norm0 = normals[i];
            const norm1 = normals[i + 1];
            const gy0 = effectiveGroundY[i];
            const gy1 = effectiveGroundY[i + 1];

            const c0 = pt0.clone().addScaledVector(norm0, offset);
            const c1 = pt1.clone().addScaledVector(norm1, offset);
            const pL0 = c0.clone().addScaledVector(norm0, -lineHalfW);
            const pR0 = c0.clone().addScaledVector(norm0, lineHalfW);
            const pL1 = c1.clone().addScaledVector(norm1, -lineHalfW);
            const pR1 = c1.clone().addScaledVector(norm1, lineHalfW);

            const baseV = vLine;
            linePositions.push(pL0.x, gy0 + 0.075, pL0.z);
            linePositions.push(pR0.x, gy0 + 0.075, pR0.z);
            linePositions.push(pL1.x, gy1 + 0.075, pL1.z);
            linePositions.push(pR1.x, gy1 + 0.075, pR1.z);

            lineIndices.push(baseV, baseV + 1, baseV + 2);
            lineIndices.push(baseV + 1, baseV + 3, baseV + 2);
            vLine += 4;
          }

          if (linePositions.length > 0) {
            doubleLineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            doubleLineGeom.setIndex(lineIndices);
            doubleLineGeom.computeVertexNormals();

            const doubleMesh = new THREE.Mesh(doubleLineGeom, yellowMat);
            group.add(doubleMesh);
          }
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
          if (startIsJunction && dEnd < startRadius + 0.5) {
            d += cycleLen;
            continue;
          }
          if (endIsJunction && d > totalLen - endRadius - 0.5) {
            break;
          }
          if (dEnd - d >= 0.4) {
            const segsInDash = Math.max(1, Math.round((dEnd - d) * 3));
            const baseV = cVertIdx;
            for (let s = 0; s <= segsInDash; s++) {
              const curD = d + (s / segsInDash) * (dEnd - d);
              const t = curD / totalLen;
              const pt = graph.sampleBezier(edge.controlPoints, t);
              const segIdx = Math.min(segments, Math.floor(t * segments));
              const norm = normals[segIdx];
              const gy = effectiveGroundY[segIdx];

              const mL = pt.clone().addScaledVector(norm, -markHalfW);
              const mR = pt.clone().addScaledVector(norm, markHalfW);

              centerDashPositions.push(mL.x, gy + 0.075, mL.z);
              centerDashPositions.push(mR.x, gy + 0.075, mR.z);
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
        const edgePositions: number[] = [];
        const edgeIndices: number[] = [];
        let vEdge = 0;
        const w = edge.type === 'alley' ? 0.06 : 0.09;

        for (let i = 0; i < segments; i++) {
          const midDist = (distances[i] + distances[i + 1]) * 0.5;
          if (startIsJunction && midDist < startRadius) continue;
          if (endIsJunction && midDist > edge.length - endRadius) continue;

          const pt0 = points[i];
          const pt1 = points[i + 1];
          const norm0 = normals[i];
          const norm1 = normals[i + 1];
          const gy0 = effectiveGroundY[i];
          const gy1 = effectiveGroundY[i + 1];

          const c0 = pt0.clone().addScaledVector(norm0, side * edgeMarkDist);
          const c1 = pt1.clone().addScaledVector(norm1, side * edgeMarkDist);
          const eL0 = c0.clone().addScaledVector(norm0, -w);
          const eR0 = c0.clone().addScaledVector(norm0, w);
          const eL1 = c1.clone().addScaledVector(norm1, -w);
          const eR1 = c1.clone().addScaledVector(norm1, w);

          const baseV = vEdge;
          edgePositions.push(eL0.x, gy0 + 0.075, eL0.z);
          edgePositions.push(eR0.x, gy0 + 0.075, eR0.z);
          edgePositions.push(eL1.x, gy1 + 0.075, eL1.z);
          edgePositions.push(eR1.x, gy1 + 0.075, eR1.z);

          edgeIndices.push(baseV, baseV + 1, baseV + 2);
          edgeIndices.push(baseV + 1, baseV + 3, baseV + 2);
          vEdge += 4;
        }

        if (edgePositions.length > 0) {
          edgeMarkGeom.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
          edgeMarkGeom.setIndex(edgeIndices);
          edgeMarkGeom.computeVertexNormals();

          const edgeMarkMesh = new THREE.Mesh(edgeMarkGeom, edgeMarkMat);
          group.add(edgeMarkMesh);
        }
      });
    }

    // 2c. Clean White Stencil Road Text on asphalt surface
    if (edge.length >= 20 && (edge.type === 'arterial' || edge.type === 'collector' || edge.type === 'local')) {
      const roadName = RoadGeometryBuilder.resolveRoadName(edge);
      const textMat = RoadGeometryBuilder.getRoadTextMaterial(roadName);
      const planeW = Math.max(5.5, Math.min(10.0, roadName.length * 0.42));
      const planeH = 1.4;
      const step = Math.min(45, edge.length * 0.5);
      let d = step;
      while (d < edge.length) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const segIdx = Math.min(segments, Math.floor(t * segments));
        const tan = tangents[segIdx];

        const textPlane = new THREE.Mesh(new THREE.PlaneGeometry(planeW, planeH), textMat);
        textPlane.name = 'RoadSurfaceLabel';
        textPlane.rotateX(-Math.PI / 2);
        const roadAngle = Math.atan2(tan.x, tan.z);
        textPlane.rotateZ(-roadAngle + Math.PI / 2);
        textPlane.position.set(pt.x, effectiveGroundY[segIdx] + 0.075, pt.z);
        group.add(textPlane);

        d += step * 2;
      }
    }

    // 3. Sidewalks, Beveled Curbs & Yellow Tactile Paving
    if (profile.sidewalkWidth > 0) {
      const swWidth = profile.sidewalkWidth;
      const swHeight = Math.max(0.16, profile.curbHeight || 0.16);

      const createSidewalkMesh = (sideMultiplier: number): THREE.Mesh | null => {
        const swPositions: number[] = [];
        const swUvs: number[] = [];
        const swIndices: number[] = [];
        let vertIdx = 0;

        for (let i = 0; i < segments; i++) {
          const d0 = distances[i];
          const d1 = distances[i + 1];
          const midDist = (d0 + d1) * 0.5;

          // Trim sidewalk at intersection junction boundary
          if (startIsJunction && midDist < startRadius) continue;
          if (endIsJunction && midDist > edge.length - endRadius) continue;

          const pt0 = points[i];
          const pt1 = points[i + 1];
          const norm0 = normals[i];
          const norm1 = normals[i + 1];
          const gy0 = effectiveGroundY[i];
          const gy1 = effectiveGroundY[i + 1];

          const in0 = pt0.clone().addScaledVector(norm0, sideMultiplier * halfWidth);
          const out0 = pt0.clone().addScaledVector(norm0, sideMultiplier * (halfWidth + swWidth));
          const in1 = pt1.clone().addScaledVector(norm1, sideMultiplier * halfWidth);
          const out1 = pt1.clone().addScaledVector(norm1, sideMultiplier * (halfWidth + swWidth));

          const baseV = vertIdx;
          swPositions.push(in0.x, gy0 + swHeight, in0.z);
          swPositions.push(out0.x, gy0 + swHeight, out0.z);
          swPositions.push(in1.x, gy1 + swHeight, in1.z);
          swPositions.push(out1.x, gy1 + swHeight, out1.z);

          swUvs.push(0, d0 / 1.5, swWidth / 1.5, d0 / 1.5, 0, d1 / 1.5, swWidth / 1.5, d1 / 1.5);

          swIndices.push(baseV, baseV + 1, baseV + 2);
          swIndices.push(baseV + 1, baseV + 3, baseV + 2);
          vertIdx += 4;
        }

        if (swPositions.length === 0) return null;

        const swGeom = new THREE.BufferGeometry();
        swGeom.setAttribute('position', new THREE.Float32BufferAttribute(swPositions, 3));
        swGeom.setAttribute('uv', new THREE.Float32BufferAttribute(swUvs, 2));
        swGeom.setIndex(swIndices);
        swGeom.computeVertexNormals();

        const swMesh = new THREE.Mesh(swGeom, RoadGeometryBuilder.sidewalkMaterial!);
        swMesh.receiveShadow = true;
        swMesh.castShadow = true;
        return swMesh;
      };

      // Concrete Curb Bevel (Batu Pembatas Trotoar 3D)
      const createCurbBevelMesh = (sideMultiplier: number): THREE.Mesh | null => {
        const curbPositions: number[] = [];
        const curbIndices: number[] = [];
        let vertIdx = 0;

        for (let i = 0; i < segments; i++) {
          const d0 = distances[i];
          const d1 = distances[i + 1];
          const midDist = (d0 + d1) * 0.5;

          if (startIsJunction && midDist < startRadius) continue;
          if (endIsJunction && midDist > edge.length - endRadius) continue;

          const pt0 = points[i];
          const pt1 = points[i + 1];
          const norm0 = normals[i];
          const norm1 = normals[i + 1];
          const gy0 = effectiveGroundY[i];
          const gy1 = effectiveGroundY[i + 1];

          const p0 = pt0.clone().addScaledVector(norm0, sideMultiplier * halfWidth);
          const p1 = pt1.clone().addScaledVector(norm1, sideMultiplier * halfWidth);

          const baseV = vertIdx;
          curbPositions.push(p0.x, gy0 + 0.06, p0.z);
          curbPositions.push(p0.x, gy0 + swHeight, p0.z);
          curbPositions.push(p1.x, gy1 + 0.06, p1.z);
          curbPositions.push(p1.x, gy1 + swHeight, p1.z);

          curbIndices.push(baseV, baseV + 1, baseV + 2);
          curbIndices.push(baseV + 1, baseV + 3, baseV + 2);
          vertIdx += 4;
        }

        if (curbPositions.length === 0) return null;

        const curbGeom = new THREE.BufferGeometry();
        curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
        curbGeom.setIndex(curbIndices);
        curbGeom.computeVertexNormals();

        const curbMesh = new THREE.Mesh(curbGeom, RoadGeometryBuilder.curbMaterial!);
        curbMesh.castShadow = true;
        curbMesh.receiveShadow = true;
        return curbMesh;
      };

      // Yellow Tactile Paving Blocks (Jalur Ubin Pemandu Disabilitas Kuning)
      const createTactileStripMesh = (sideMultiplier: number): THREE.Mesh | null => {
        const tacPositions: number[] = [];
        const tacUvs: number[] = [];
        const tacIndices: number[] = [];
        let vertIdx = 0;
        const tacWidth = 0.45;
        const tacOffset = sideMultiplier * (halfWidth + swWidth * 0.42);

        for (let i = 0; i < segments; i++) {
          const d0 = distances[i];
          const d1 = distances[i + 1];
          const midDist = (d0 + d1) * 0.5;

          if (startIsJunction && midDist < startRadius) continue;
          if (endIsJunction && midDist > edge.length - endRadius) continue;

          const pt0 = points[i];
          const pt1 = points[i + 1];
          const norm0 = normals[i];
          const norm1 = normals[i + 1];
          const gy0 = effectiveGroundY[i];
          const gy1 = effectiveGroundY[i + 1];

          const c0 = pt0.clone().addScaledVector(norm0, tacOffset);
          const c1 = pt1.clone().addScaledVector(norm1, tacOffset);
          const l0 = c0.clone().addScaledVector(norm0, -tacWidth * 0.5);
          const r0 = c0.clone().addScaledVector(norm0, tacWidth * 0.5);
          const l1 = c1.clone().addScaledVector(norm1, -tacWidth * 0.5);
          const r1 = c1.clone().addScaledVector(norm1, tacWidth * 0.5);

          const baseV = vertIdx;
          tacPositions.push(l0.x, gy0 + swHeight + 0.005, l0.z);
          tacPositions.push(r0.x, gy0 + swHeight + 0.005, r0.z);
          tacPositions.push(l1.x, gy1 + swHeight + 0.005, l1.z);
          tacPositions.push(r1.x, gy1 + swHeight + 0.005, r1.z);

          tacUvs.push(0, d0 / 0.6, tacWidth / 0.45, d0 / 0.6, 0, d1 / 0.6, tacWidth / 0.45, d1 / 0.6);

          tacIndices.push(baseV, baseV + 1, baseV + 2);
          tacIndices.push(baseV + 1, baseV + 3, baseV + 2);
          vertIdx += 4;
        }

        if (tacPositions.length === 0) return null;

        const tacGeom = new THREE.BufferGeometry();
        tacGeom.setAttribute('position', new THREE.Float32BufferAttribute(tacPositions, 3));
        tacGeom.setAttribute('uv', new THREE.Float32BufferAttribute(tacUvs, 2));
        tacGeom.setIndex(tacIndices);
        tacGeom.computeVertexNormals();

        const tacMesh = new THREE.Mesh(tacGeom, RoadGeometryBuilder.tactileMaterial!);
        tacMesh.receiveShadow = true;
        return tacMesh;
      };

      // Add sidewalks, curb bevels, and tactile strips on both sides
      [-1, 1].forEach((side) => {
        const sw = createSidewalkMesh(side);
        if (sw) group.add(sw);
        const curb = createCurbBevelMesh(side);
        if (curb) group.add(curb);
        const tac = createTactileStripMesh(side);
        if (tac) group.add(tac);
      });
    } else {
      // 3b. Bahu Pembatas Beton (#94A3B8) untuk jalan tanpa trotoar lebar
      const curbW = 0.22;
      const curbH = 0.16; // Standar elevasi 0.16m
      [-1, 1].forEach((side) => {
        const curbPositions: number[] = [];
        const curbIndices: number[] = [];
        let vertIdx = 0;

        for (let i = 0; i < segments; i++) {
          const d0 = distances[i];
          const d1 = distances[i + 1];
          const midDist = (d0 + d1) * 0.5;

          if (startIsJunction && midDist < startRadius) continue;
          if (endIsJunction && midDist > edge.length - endRadius) continue;

          const pt0 = points[i];
          const pt1 = points[i + 1];
          const norm0 = normals[i];
          const norm1 = normals[i + 1];
          const gy0 = effectiveGroundY[i];
          const gy1 = effectiveGroundY[i + 1];

          const in0 = pt0.clone().addScaledVector(norm0, side * halfWidth);
          const out0 = pt0.clone().addScaledVector(norm0, side * (halfWidth + curbW));
          const in1 = pt1.clone().addScaledVector(norm1, side * halfWidth);
          const out1 = pt1.clone().addScaledVector(norm1, side * (halfWidth + curbW));

          const baseV = vertIdx;
          curbPositions.push(in0.x, gy0 + curbH, in0.z);
          curbPositions.push(out0.x, gy0 + curbH, out0.z);
          curbPositions.push(in1.x, gy1 + curbH, in1.z);
          curbPositions.push(out1.x, gy1 + curbH, out1.z);

          curbIndices.push(baseV, baseV + 1, baseV + 2);
          curbIndices.push(baseV + 1, baseV + 3, baseV + 2);
          vertIdx += 4;
        }

        if (curbPositions.length > 0) {
          const curbGeom = new THREE.BufferGeometry();
          curbGeom.setAttribute('position', new THREE.Float32BufferAttribute(curbPositions, 3));
          curbGeom.setIndex(curbIndices);
          curbGeom.computeVertexNormals();

          const curbMesh = new THREE.Mesh(curbGeom, RoadGeometryBuilder.curbMaterial!);
          curbMesh.castShadow = true;
          curbMesh.receiveShadow = true;
          group.add(curbMesh);
        }
      });
    }

    // 4. Props: Street Lights, Trees, Planter Pits, Benches, and Bollards
    RoadPropPlacer.placeRoadProps({
      edge,
      profile,
      graph,
      group,
      points,
      normals,
      distances,
      effectiveGroundY,
      segments,
      startRadius,
      endRadius,
      roadManager
    });

    // 5. Automatic Bridge Deck, Parapets & Riverbed Piers when crossing rivers/valleys (groundY < -0.25m)
    if (hasBridge) {
      const bridgeDeckGeom = new THREE.BufferGeometry();
      const bridgePositions: number[] = [];
      const bridgeIndices: number[] = [];
      let bVertCount = 0;

      const totalBridgeHalfW = halfWidth + (profile.sidewalkWidth > 0 ? profile.sidewalkWidth : 0.22);
      const concreteMat = this.curbMaterial || MaterialLibrary.getInstance().getMaterial('concrete', {
        roughness: 0.85,
        metalness: 0.05,
        color: 0x94a3b8
      });

      // 5a. Underside structural deck slab
      for (let i = 0; i <= segments; i++) {
        if (!isBridgeSample[i] && !(i > 0 && isBridgeSample[i - 1]) && !(i < segments && isBridgeSample[i + 1])) {
          continue;
        }
        const pt = points[i];
        const norm = normals[i];
        const gy = effectiveGroundY[i];
        const deckBottomY = gy - 0.45;

        const leftOuter = pt.clone().addScaledVector(norm, -totalBridgeHalfW);
        const rightOuter = pt.clone().addScaledVector(norm, totalBridgeHalfW);

        bridgePositions.push(leftOuter.x, deckBottomY, leftOuter.z);
        bridgePositions.push(rightOuter.x, deckBottomY, rightOuter.z);

        if (bVertCount >= 2) {
          const v0 = bVertCount - 2;
          const v1 = bVertCount - 1;
          const v2 = bVertCount;
          const v3 = bVertCount + 1;
          bridgeIndices.push(v0, v1, v2);
          bridgeIndices.push(v1, v3, v2);
        }
        bVertCount += 2;
      }

      if (bridgePositions.length > 0) {
        bridgeDeckGeom.setAttribute('position', new THREE.Float32BufferAttribute(bridgePositions, 3));
        bridgeDeckGeom.setIndex(bridgeIndices);
        bridgeDeckGeom.computeVertexNormals();
        const bridgeDeckMesh = new THREE.Mesh(bridgeDeckGeom, concreteMat);
        bridgeDeckMesh.name = 'BridgeDeck';
        bridgeDeckMesh.receiveShadow = true;
        bridgeDeckMesh.castShadow = true;
        group.add(bridgeDeckMesh);
      }

      // 5b. Bridge Parapet Railings on both sides of sidewalk
      const railH = 0.95;
      const railThick = 0.12;
      [-1, 1].forEach((side) => {
        const railPositions: number[] = [];
        const railIndices: number[] = [];
        let rVertCount = 0;

        for (let i = 0; i <= segments; i++) {
          if (!isBridgeSample[i] && !(i > 0 && isBridgeSample[i - 1]) && !(i < segments && isBridgeSample[i + 1])) {
            continue;
          }
          const pt = points[i];
          const norm = normals[i];
          const gy = effectiveGroundY[i];
          const baseRailY = gy + 0.16;
          const topRailY = baseRailY + railH;
          const railOffset = side * totalBridgeHalfW;

          const innerR = pt.clone().addScaledVector(norm, railOffset - side * railThick);
          const outerR = pt.clone().addScaledVector(norm, railOffset);

          railPositions.push(innerR.x, topRailY, innerR.z);
          railPositions.push(outerR.x, topRailY, outerR.z);
          railPositions.push(innerR.x, baseRailY, innerR.z);
          railPositions.push(outerR.x, baseRailY, outerR.z);

          if (rVertCount >= 4) {
            const v0 = rVertCount - 4;
            const v1 = rVertCount - 3;
            const v2 = rVertCount - 2;
            const v3 = rVertCount - 1;
            const c0 = rVertCount;
            const c1 = rVertCount + 1;
            const c2 = rVertCount + 2;
            const c3 = rVertCount + 3;
            // Top face
            railIndices.push(v0, v1, c0);
            railIndices.push(v1, c1, c0);
            // Outer face
            railIndices.push(v1, v3, c1);
            railIndices.push(v3, c3, c1);
            // Inner face
            railIndices.push(v2, v0, c2);
            railIndices.push(v0, c0, c2);
          }
          rVertCount += 4;
        }

        if (railPositions.length > 0) {
          const railGeom = new THREE.BufferGeometry();
          railGeom.setAttribute('position', new THREE.Float32BufferAttribute(railPositions, 3));
          railGeom.setIndex(railIndices);
          railGeom.computeVertexNormals();
          const railMesh = new THREE.Mesh(railGeom, concreteMat);
          railMesh.name = side === -1 ? 'BridgeParapetRailing_Left' : 'BridgeParapetRailing_Right';
          railMesh.castShadow = true;
          railMesh.receiveShadow = true;
          group.add(railMesh);
        }
      });

      // 5c. Concrete Piers supporting deck down to riverbed
      const pierInterval = Math.max(2, Math.floor(segments / 4));
      let pierIdx = 0;
      for (let i = 1; i < segments; i++) {
        if (isBridgeSample[i] && (i % pierInterval === 0 || i === Math.floor(segments / 2))) {
          const pt = points[i];
          const deckY = effectiveGroundY[i];
          const bedY = rawGroundY[i];
          const pierH = Math.max(0.5, deckY - bedY);
          const pierRadius = Math.min(0.8, totalBridgeHalfW * 0.25);

          const pierGeom = new THREE.CylinderGeometry(pierRadius, pierRadius * 1.15, pierH, 16);
          const pierMesh = new THREE.Mesh(pierGeom, concreteMat);
          pierMesh.name = `BridgePier_${pierIdx++}`;
          pierMesh.position.set(pt.x, bedY + pierH * 0.5, pt.z);
          pierMesh.castShadow = true;
          pierMesh.receiveShadow = true;
          group.add(pierMesh);
        }
      }
    }

    // Subsurface Drainage Group (Clean lightweight group with 0 heavy polygons)
    const subsurfaceGroup = new THREE.Group();
    subsurfaceGroup.name = 'SubsurfaceDrainage';
    subsurfaceGroup.visible = false;
    group.add(subsurfaceGroup);

    // Tahap 2 (T2.5): Freeze static matrices for road ribbon, curbs, markings, and static props
    group.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        if (!child.userData?.isAnimated && !child.userData?.isDynamic) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }
      }
    });
    group.updateMatrix();
    group.updateMatrixWorld(true);

    return group;
  }
}
