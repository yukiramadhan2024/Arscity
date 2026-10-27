import * as THREE from 'three';
import { RiverSegment, RiverNode, RiverType, RIVER_PROFILES } from './RiverTypes';
import { Terrain } from './Terrain';
import { MaterialLibrary } from '../materials/MaterialLibrary';

export class RiverManager {
  public scene: THREE.Scene;
  public terrain?: Terrain;
  public masterGroup: THREE.Group;

  public nodes: Map<string, RiverNode> = new Map();
  public segments: Map<string, RiverSegment> = new Map();
  private segmentMeshes: Map<string, THREE.Group> = new Map();

  private waterMaterials: THREE.MeshStandardMaterial[] = [];

  constructor(scene: THREE.Scene, terrain?: Terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.masterGroup = new THREE.Group();
    this.masterGroup.name = 'RiverManager_Master';
    this.scene.add(this.masterGroup);
  }

  public setTerrain(terrain: Terrain): void {
    this.terrain = terrain;
  }

  public sampleBezier(points: THREE.Vector3[], t: number): THREE.Vector3 {
    if (points.length === 2) {
      return new THREE.Vector3().lerpVectors(points[0], points[1], t);
    }
    if (points.length === 3) {
      const p0 = points[0];
      const p1 = points[1];
      const p2 = points[2];
      const u = 1 - t;
      return new THREE.Vector3(
        u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
        u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
        u * u * p0.z + 2 * u * t * p1.z + t * t * p2.z
      );
    }
    // Cubic Bezier
    const p0 = points[0];
    const p1 = points[1];
    const p2 = points[2];
    const p3 = points[3];
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    return new THREE.Vector3(
      uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
      uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y,
      uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z
    );
  }

  /**
   * Adds and carves a new river segment into the terrain, building water and talud walls.
   */
  public addRiverSegment(
    startPos: THREE.Vector3,
    endPos: THREE.Vector3,
    type: RiverType = 'urban_river',
    customControlPoints?: THREE.Vector3[]
  ): RiverSegment {
    const profile = RIVER_PROFILES[type];
    const id = `river_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    // Find closest existing river node within snap distance (6.0m)
    let effectiveStart = startPos.clone();
    let startNodeId: string;
    let nearestStart: RiverNode | null = null;
    let minStartD = 6.0;
    for (const node of this.nodes.values()) {
      const d = startPos.distanceTo(node.position);
      if (d < minStartD) {
        minStartD = d;
        nearestStart = node;
      }
    }
    if (nearestStart) {
      startNodeId = nearestStart.id;
      effectiveStart.copy(nearestStart.position);
    } else {
      startNodeId = `rnode_${Date.now()}_start_${Math.floor(Math.random() * 1000)}`;
      this.nodes.set(startNodeId, { id: startNodeId, position: effectiveStart.clone() });
    }

    let effectiveEnd = endPos.clone();
    let endNodeId: string;
    let nearestEnd: RiverNode | null = null;
    let minEndD = 6.0;
    for (const node of this.nodes.values()) {
      if (node.id === startNodeId) continue;
      const d = endPos.distanceTo(node.position);
      if (d < minEndD) {
        minEndD = d;
        nearestEnd = node;
      }
    }
    if (nearestEnd) {
      endNodeId = nearestEnd.id;
      effectiveEnd.copy(nearestEnd.position);
    } else {
      endNodeId = `rnode_${Date.now()}_end_${Math.floor(Math.random() * 1000)}`;
      this.nodes.set(endNodeId, { id: endNodeId, position: effectiveEnd.clone() });
    }

    // Determine control points
    let controlPoints: THREE.Vector3[];
    if (customControlPoints && customControlPoints.length >= 2) {
      controlPoints = customControlPoints.map((p) => p.clone());
      controlPoints[0].copy(effectiveStart);
      controlPoints[controlPoints.length - 1].copy(effectiveEnd);
    } else {
      const mid = new THREE.Vector3().lerpVectors(effectiveStart, effectiveEnd, 0.5);
      controlPoints = [effectiveStart.clone(), mid, effectiveEnd.clone()];
    }

    const length = effectiveStart.distanceTo(effectiveEnd);
    const segment: RiverSegment = {
      id,
      startNodeId,
      endNodeId,
      type,
      controlPoints,
      length,
    };

    this.segments.set(id, segment);

    // 1. Build 3D mesh (water surface & retaining talud) from pre-carve terrain elevation
    const meshGroup = this.buildRiverMeshes(segment);
    this.segmentMeshes.set(id, meshGroup);
    this.masterGroup.add(meshGroup);

    // 2. Carve terrain along the river curve so water rests inside channel
    segment.carveData = this.carveTerrainForRiver(segment);

    return segment;
  }

  /**
   * Carves the terrain channel downward along the river curve so water rests below surface.
   */
  public carveTerrainForRiver(segment: RiverSegment): { indices: number[]; oldHeights: number[] } | undefined {
    if (!this.terrain) return undefined;

    const profile = RIVER_PROFILES[segment.type];
    if (typeof this.terrain.carveRiverTrench === 'function') {
      return this.terrain.carveRiverTrench(segment.controlPoints, profile.width, profile.depth);
    } else {
      // Fallback for mocks
      const steps = Math.max(12, Math.ceil(segment.length / 2));
      const carveRadius = profile.width * 0.75;
      const carveDepth = profile.depth;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const pt = this.sampleBezier(segment.controlPoints, t);
        this.terrain.modifyElevation(pt.x, pt.z, carveRadius, carveDepth, 'lower');
      }
      return undefined;
    }
  }

  /**
   * Constructs the 3D water ribbon and stone talud retaining walls.
   */
  public buildRiverMeshes(segment: RiverSegment): THREE.Group {
    const group = new THREE.Group();
    group.name = `RiverSegment_${segment.id}`;

    const profile = RIVER_PROFILES[segment.type];
    const segments = Math.max(16, Math.min(80, Math.ceil(segment.length * 1.5)));
    const halfWidth = profile.width * 0.5;

    const points: THREE.Vector3[] = [];
    const normals: THREE.Vector3[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const pt = this.sampleBezier(segment.controlPoints, t);
      points.push(pt);

      const deltaT = 0.005;
      const ptNext = this.sampleBezier(segment.controlPoints, Math.min(1, t + deltaT));
      const ptPrev = this.sampleBezier(segment.controlPoints, Math.max(0, t - deltaT));
      const tan = new THREE.Vector3().subVectors(ptNext, ptPrev).normalize();
      tan.y = 0;
      if (tan.lengthSq() < 0.001) tan.set(0, 0, 1);

      const lat = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      normals.push(lat);
    }

    // A. Water Ribbon Mesh
    const waterGeom = new THREE.BufferGeometry();
    const posCount = (segments + 1) * 2;
    const waterPositions = new Float32Array(posCount * 3);
    const waterUvs = new Float32Array(posCount * 2);
    const waterIndices: number[] = [];

    const startPt = points[0];
    const endPt = points[segments];
    const startGroundH = this.terrain ? this.terrain.getHeightAt(startPt.x, startPt.z) : 0;
    const endGroundH = this.terrain ? this.terrain.getHeightAt(endPt.x, endPt.z) : 0;

    for (let i = 0; i <= segments; i++) {
      const pt = points[i];
      const norm = normals[i];
      const baseIdx = i * 2;
      const t = i / segments;

      const pL = pt.clone().addScaledVector(norm, -halfWidth);
      const pR = pt.clone().addScaledVector(norm, halfWidth);

      // Hydrological water level smoothly slopes between start and end node
      const waterY = THREE.MathUtils.lerp(startGroundH, endGroundH, t) + profile.waterLevelY;

      waterPositions[baseIdx * 3] = pL.x;
      waterPositions[baseIdx * 3 + 1] = waterY;
      waterPositions[baseIdx * 3 + 2] = pL.z;
      waterUvs[baseIdx * 2] = 0;
      waterUvs[baseIdx * 2 + 1] = t * (segment.length / 6);

      waterPositions[(baseIdx + 1) * 3] = pR.x;
      waterPositions[(baseIdx + 1) * 3 + 1] = waterY;
      waterPositions[(baseIdx + 1) * 3 + 2] = pR.z;
      waterUvs[(baseIdx + 1) * 2] = 1;
      waterUvs[(baseIdx + 1) * 2 + 1] = t * (segment.length / 6);

      if (i < segments) {
        const v0 = baseIdx;
        const v1 = baseIdx + 1;
        const v2 = baseIdx + 2;
        const v3 = baseIdx + 3;
        waterIndices.push(v0, v1, v2);
        waterIndices.push(v1, v3, v2);
      }
    }

    waterGeom.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
    waterGeom.setAttribute('uv', new THREE.BufferAttribute(waterUvs, 2));
    waterGeom.setIndex(waterIndices);
    waterGeom.computeVertexNormals();

    const matLib = MaterialLibrary.getInstance();
    const waterMat = matLib.getMaterial('water').clone();
    waterMat.color.setHex(0x0284c7); // Clear tropical cyan river water
    waterMat.roughness = 0.12;
    waterMat.metalness = 0.20;
    waterMat.transparent = true;
    waterMat.opacity = 0.88;
    this.waterMaterials.push(waterMat);

    const waterMesh = new THREE.Mesh(waterGeom, waterMat);
    waterMesh.name = 'RiverWater';
    waterMesh.receiveShadow = true;
    group.add(waterMesh);

    // B. Stone Talud Retaining Walls on Left and Right Banks (Solid Closed 3D Mesh)
    const taludMat = matLib.getMaterial('stone_candi') || matLib.getMaterial('concrete');
    const wallThick = 0.45;

    [-1, 1].forEach((side) => {
      const taludGeom = new THREE.BufferGeometry();
      const taludPositions: number[] = [];
      const taludIndices: number[] = [];
      let tVert = 0;

      for (let i = 0; i <= segments; i++) {
        const pt = points[i];
        const norm = normals[i];

        const innerPt = pt.clone().addScaledVector(norm, side * halfWidth);
        const outerPt = pt.clone().addScaledVector(norm, side * (halfWidth + wallThick));

        // Sample ground elevation for this side
        const t = i / segments;
        const waterY = THREE.MathUtils.lerp(startGroundH, endGroundH, t) + profile.waterLevelY;
        const sideGroundH = this.terrain ? this.terrain.getHeightAt(innerPt.x, innerPt.z) : 0;
        const wallTopY = Math.max(sideGroundH + 0.12, waterY + 0.35);
        const wallBottomY = waterY - 0.50;

        // 4 vertices per slice
        taludPositions.push(innerPt.x, wallTopY, innerPt.z);       // 0: top inner
        taludPositions.push(outerPt.x, wallTopY, outerPt.z);       // 1: top outer
        taludPositions.push(innerPt.x, wallBottomY, innerPt.z);    // 2: bottom inner (in water)
        taludPositions.push(outerPt.x, wallBottomY, outerPt.z);    // 3: bottom outer (embedded in soil)

        if (tVert >= 4) {
          const v0 = tVert - 4;
          const v1 = tVert - 3;
          const v2 = tVert - 2;
          const v3 = tVert - 1;
          const c0 = tVert;
          const c1 = tVert + 1;
          const c2 = tVert + 2;
          const c3 = tVert + 3;

          // 1. Top coping face
          taludIndices.push(v0, v1, c0);
          taludIndices.push(v1, c1, c0);

          // 2. Facing river (inner face)
          if (side === -1) {
            taludIndices.push(v0, c0, v2);
            taludIndices.push(c0, c2, v2);
          } else {
            taludIndices.push(v0, v2, c0);
            taludIndices.push(c0, v2, c2);
          }

          // 3. Facing soil (outer back face)
          if (side === -1) {
            taludIndices.push(v1, v3, c1);
            taludIndices.push(c1, v3, c3);
          } else {
            taludIndices.push(v1, c1, v3);
            taludIndices.push(c1, c3, v3);
          }
        }
        tVert += 4;
      }

      // 4. Start end-cap at i = 0
      taludIndices.push(0, 2, 1);
      taludIndices.push(1, 2, 3);

      // 5. End end-cap at i = segments
      const lastBase = tVert - 4;
      taludIndices.push(lastBase + 0, lastBase + 1, lastBase + 2);
      taludIndices.push(lastBase + 1, lastBase + 3, lastBase + 2);

      if (taludPositions.length > 0) {
        taludGeom.setAttribute('position', new THREE.Float32BufferAttribute(taludPositions, 3));
        taludGeom.setIndex(taludIndices);
        taludGeom.computeVertexNormals();

        const taludMesh = new THREE.Mesh(taludGeom, taludMat);
        taludMesh.name = side === -1 ? 'RiverTalud_Left' : 'RiverTalud_Right';
        taludMesh.castShadow = true;
        taludMesh.receiveShadow = true;
        group.add(taludMesh);
      }
    });

    return group;
  }

  /**
   * Removes a river segment and disposes its meshes cleanly.
   */
  public removeRiverSegment(id: string): boolean {
    const segment = this.segments.get(id);
    if (!segment) return false;

    // Restore carved terrain
    if (segment.carveData && this.terrain && typeof this.terrain.restoreElevations === 'function') {
      this.terrain.restoreElevations(segment.carveData.indices, segment.carveData.oldHeights);
    }

    const meshGroup = this.segmentMeshes.get(id);
    if (meshGroup) {
      meshGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else if (m.material) {
            m.material.dispose();
          }
        }
      });
      this.masterGroup.remove(meshGroup);
      this.segmentMeshes.delete(id);
    }

    this.segments.delete(id);
    return true;
  }

  /**
   * Computes the shortest distance from any point in the world to the nearest river centerline.
   */
  public getDistanceToNearestRiver(point: THREE.Vector3): number {
    if (this.segments.size === 0) return Infinity;

    let minDistance = Infinity;
    for (const segment of this.segments.values()) {
      const steps = Math.max(6, Math.ceil(segment.length / 4));
      for (let i = 0; i <= steps; i++) {
        const pt = this.sampleBezier(segment.controlPoints, i / steps);
        const dist = Math.hypot(point.x - pt.x, point.z - pt.z);
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
    }
    return minDistance;
  }

  /**
   * Continuous river water wave animation.
   */
  public update(delta: number): void {
    if (this.waterMaterials.length === 0) return;
    const flowSpeed = delta * 0.12;

    for (const mat of this.waterMaterials) {
      if (mat.map) {
        mat.map.offset.y = (mat.map.offset.y + flowSpeed) % 1.0;
      }
      if (mat.normalMap) {
        mat.normalMap.offset.y = (mat.normalMap.offset.y + flowSpeed * 1.5) % 1.0;
      }
    }
  }

  public dispose(): void {
    for (const segId of Array.from(this.segments.keys())) {
      this.removeRiverSegment(segId);
    }
    this.scene.remove(this.masterGroup);
  }
}
