import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { applyWindShader, applyFoliageSubsurfaceShader } from '../materials/WindShader';
import type { RoadEdge, RoadProfile } from './RoadTypes';
import type { RoadGraph } from './RoadGraph';
import type { RoadManager } from './RoadManager';

export interface RoadPropPlacementContext {
  edge: RoadEdge;
  profile: RoadProfile;
  graph: RoadGraph;
  group: THREE.Group;
  points: THREE.Vector3[];
  normals: THREE.Vector3[];
  distances: number[];
  effectiveGroundY: number[];
  segments: number;
  startRadius: number;
  endRadius: number;
  roadManager?: RoadManager;
}

export class RoadPropPlacer {
  private static lightPoleGeom: THREE.BufferGeometry | null = null;
  private static lightPoleMat: THREE.MeshStandardMaterial | null = null;
  private static lampGlowMat: THREE.MeshStandardMaterial | THREE.MeshBasicMaterial | null = null;
  private static bulbGeom: THREE.BufferGeometry | null = null;

  private static treeTrunkGeom: THREE.BufferGeometry | null = null;
  private static treeTrunkMat: THREE.MeshStandardMaterial | null = null;
  private static treeFoliageGeom: THREE.BufferGeometry | null = null;
  private static treeFoliageMat: THREE.MeshStandardMaterial | null = null;

  /**
   * Calculates lateral offset for corridor props (trees, lamps, bollards, benches)
   * following the mandatory formula:
   * lateralOffset = (edge.width * 0.5) + Math.max(0.8, edge.sidewalkWidth * 0.65)
   */
  public static calculateLateralOffset(width: number, sidewalkWidth: number): number {
    return (width * 0.5) + Math.max(0.8, sidewalkWidth * 0.65);
  }

  /**
   * Places streetlights, bollards, benches, shade trees, and planter pits along a road edge.
   * Ensures all props stay outside the asphalt carriageway and skips points overlapping intersecting roads.
   */
  public static placeRoadProps(ctx: RoadPropPlacementContext): void {
    const {
      edge,
      profile,
      graph,
      group,
      points,
      normals,
      effectiveGroundY,
      segments,
      startRadius,
      endRadius,
      roadManager
    } = ctx;

    const halfWidth = profile.width * 0.5;
    const swWidth = profile.sidewalkWidth || 0;
    const lateralOffset = RoadPropPlacer.calculateLateralOffset(profile.width, swWidth);

    // 1. Street Lights, Companion Bollards, and Park Benches
    const lightTransforms: THREE.Matrix4[] = [];
    if (profile.hasStreetLights && profile.lightSpacing > 0) {
      let d = Math.max(startRadius + 3.0, profile.lightSpacing * 0.5);
      while (d < edge.length - endRadius - 3.0) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const segIdx = Math.min(segments, Math.floor(t * segments));
        const norm = normals[segIdx];
        const gy = effectiveGroundY[segIdx];

        // Street light position (positive normal)
        const lightOffset = lateralOffset;
        const lightPos = pt.clone().addScaledVector(norm, lightOffset);
        lightPos.y = gy + (profile.curbHeight || 0.16);

        // Check if lightPos falls on another road's asphalt
        const lightOverlapsOtherRoad = roadManager
          ? roadManager.isPointOnRoadAsphalt(lightPos.x, lightPos.z, 0.4, edge.id)
          : false;

        if (!lightOverlapsOtherRoad) {
          const m = new THREE.Matrix4();
          m.makeRotationY(Math.atan2(norm.x, norm.z));
          m.setPosition(lightPos);
          lightTransforms.push(m);

          // Add companion bollard light nearby on sidewalk
          if (swWidth > 0 && d + 6 < edge.length - endRadius - 2.0) {
            const bollardOffset = lateralOffset;
            const bollardPos = pt.clone().addScaledVector(norm, bollardOffset);
            bollardPos.y = gy + (profile.curbHeight || 0.16);

            const bollardOverlaps = roadManager
              ? roadManager.isPointOnRoadAsphalt(bollardPos.x, bollardPos.z, 0.4, edge.id)
              : false;

            if (!bollardOverlaps) {
              group.add(RoadPropPlacer.createBollardLight(bollardPos));
            }
          }
        }

        // Add park bench between light intervals
        if (swWidth >= 2.5 && d + profile.lightSpacing * 0.4 < edge.length - endRadius - 2.0) {
          const benchT = (d + profile.lightSpacing * 0.4) / edge.length;
          const benchBase = graph.sampleBezier(edge.controlPoints, benchT);
          const benchSegIdx = Math.min(segments, Math.floor(benchT * segments));
          const benchNorm = normals[benchSegIdx];
          const benchGy = effectiveGroundY[benchSegIdx];

          const benchOffset = lateralOffset;
          const benchPos = benchBase.clone().addScaledVector(benchNorm, benchOffset);
          benchPos.y = benchGy + (profile.curbHeight || 0.16);

          const benchOverlaps = roadManager
            ? roadManager.isPointOnRoadAsphalt(benchPos.x, benchPos.z, 0.4, edge.id)
            : false;

          if (!benchOverlaps) {
            const rotY = Math.atan2(benchNorm.x, benchNorm.z) + Math.PI;
            group.add(RoadPropPlacer.createParkBench(benchPos, rotY));
          }
        }

        d += profile.lightSpacing;
      }
    }

    // 2. Trees and Planter Pits (negative normal flank)
    const treeTransforms: THREE.Matrix4[] = [];
    if (profile.hasTrees && profile.treeSpacing > 0 && swWidth > 0) {
      let d = Math.max(startRadius + 3.0, profile.treeSpacing * 0.7);
      while (d < edge.length - endRadius - 3.0) {
        const t = d / edge.length;
        const pt = graph.sampleBezier(edge.controlPoints, t);
        const segIdx = Math.min(segments, Math.floor(t * segments));
        const norm = normals[segIdx];
        const gy = effectiveGroundY[segIdx];

        const treeOffset = -lateralOffset;
        const treePos = pt.clone().addScaledVector(norm, treeOffset);
        treePos.y = gy + (profile.curbHeight || 0.16);

        // Check if treePos falls on another road's asphalt
        const treeOverlapsOtherRoad = roadManager
          ? roadManager.isPointOnRoadAsphalt(treePos.x, treePos.z, 0.4, edge.id)
          : false;

        if (!treeOverlapsOtherRoad) {
          const scale = 0.95 + ((Math.floor(d) * 31) % 5) * 0.05;
          const m = new THREE.Matrix4();
          m.makeScale(scale, scale, scale);
          m.setPosition(treePos);
          treeTransforms.push(m);

          // Tree Planter Pit around every tree
          group.add(RoadPropPlacer.createTreePlanterPit(treePos));
        }

        d += profile.treeSpacing;
      }
    }

    if (lightTransforms.length > 0) {
      RoadPropPlacer.addInstancedLights(group, lightTransforms);
    }
    if (treeTransforms.length > 0) {
      RoadPropPlacer.addInstancedTrees(group, treeTransforms);
    }
  }

  private static initMaterials(): void {
    if (this.lightPoleGeom) return;

    // 1. Classical Yogyakarta Heritage Street Light Pole (Lampu Antik Malioboro)
    // Deep heritage forest green cast-iron with stepped pedestal and arched arm
    const basePedestal = new THREE.CylinderGeometry(0.24, 0.32, 0.6, 8);
    basePedestal.translate(0, 0.3, 0);

    const baseCollar = new THREE.CylinderGeometry(0.26, 0.26, 0.1, 8);
    baseCollar.translate(0, 0.65, 0);

    const flutedShaft = new THREE.CylinderGeometry(0.09, 0.15, 4.4, 8);
    flutedShaft.translate(0, 2.85, 0);

    const capitalCollar = new THREE.CylinderGeometry(0.18, 0.10, 0.2, 8);
    capitalCollar.translate(0, 5.05, 0);

    const archedArm = new THREE.BoxGeometry(0.08, 0.08, 1.1);
    archedArm.translate(0, 5.2, 0.5);

    const lanternCap = new THREE.ConeGeometry(0.32, 0.3, 6);
    lanternCap.translate(0, 5.35, 1.0);

    const lanternCage = new THREE.CylinderGeometry(0.24, 0.18, 0.45, 6);
    lanternCage.translate(0, 4.95, 1.0);

    const mergedPole = mergeGeometries([
      basePedestal,
      baseCollar,
      flutedShaft,
      capitalCollar,
      archedArm,
      lanternCap,
      lanternCage
    ], false);

    this.lightPoleGeom = mergedPole || flutedShaft;

    // Vintage warm amber bulb core
    const bulb = new THREE.SphereGeometry(0.18, 8, 8);
    bulb.translate(0, 4.95, 1.0);
    this.bulbGeom = bulb;

    // Ornate Heritage Green Paint (Malioboro Yogyakarta signature color)
    this.lightPoleMat = new THREE.MeshStandardMaterial({
      color: 0x14532d,
      metalness: 0.65,
      roughness: 0.35
    });

    this.lampGlowMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      emissive: new THREE.Color(0xfef08a),
      emissiveIntensity: 0.05,
      roughness: 0.25,
      metalness: 0.1
    });

    // 2. Tropical Umbrella Shade Tree (Pohon Trembesi Malioboro Multi-Cluster)
    const baseTrunk = new THREE.CylinderGeometry(0.24, 0.42, 2.8, 8);
    baseTrunk.translate(0, 1.4, 0);

    const b1 = new THREE.CylinderGeometry(0.14, 0.22, 1.8, 6);
    b1.rotateZ(0.4);
    b1.rotateY(0.3);
    b1.translate(0.45, 2.7, 0.15);

    const b2 = new THREE.CylinderGeometry(0.13, 0.20, 1.7, 6);
    b2.rotateZ(-0.38);
    b2.rotateY(2.2);
    b2.translate(-0.4, 2.8, 0.35);

    const b3 = new THREE.CylinderGeometry(0.14, 0.21, 1.8, 6);
    b3.rotateZ(-0.35);
    b3.rotateY(-2.1);
    b3.translate(-0.3, 2.6, -0.4);

    const mergedTrunk = mergeGeometries([baseTrunk, b1, b2, b3], false);
    this.treeTrunkGeom = mergedTrunk || baseTrunk;

    this.treeTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x452e1e,
      roughness: 0.92
    });

    // Multi-tiered broad umbrella canopy (Tropical multi-cluster foliage)
    const domeCenter = new THREE.DodecahedronGeometry(2.7, 1);
    domeCenter.translate(0, 4.4, 0);

    const domeLeft = new THREE.DodecahedronGeometry(2.0, 1);
    domeLeft.translate(-1.6, 4.0, 0.8);

    const domeRight = new THREE.DodecahedronGeometry(2.0, 1);
    domeRight.translate(1.7, 4.1, -0.6);

    const domeFront = new THREE.DodecahedronGeometry(1.8, 1);
    domeFront.translate(0.4, 3.8, 1.7);

    const domeBack = new THREE.DodecahedronGeometry(1.7, 1);
    domeBack.translate(-0.5, 4.2, -1.6);

    const domeUnder1 = new THREE.DodecahedronGeometry(1.6, 1);
    domeUnder1.translate(1.2, 3.6, 1.2);

    const domeUnder2 = new THREE.DodecahedronGeometry(1.5, 1);
    domeUnder2.translate(-1.2, 3.7, -1.1);

    const mergedFoliage = mergeGeometries([
      domeCenter,
      domeLeft,
      domeRight,
      domeFront,
      domeBack,
      domeUnder1,
      domeUnder2
    ], false);
    this.treeFoliageGeom = mergedFoliage || domeCenter;

    this.treeFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x2e4f1e, // Deep forest green in shadow
      roughness: 0.75,
      metalness: 0.02
    });
    applyFoliageSubsurfaceShader(this.treeFoliageMat);
  }

  /**
   * Sets street lamp glow state based on solar elevation angle.
   * Smoothly ramps emissive intensity between dusk and night.
   */
  public static setNightGlow(factor: number): void {
    this.initMaterials();
    if (!this.lampGlowMat) return;

    const clamped = THREE.MathUtils.clamp(factor, 0, 1);
    if ('emissiveIntensity' in this.lampGlowMat) {
      const mat = this.lampGlowMat as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = clamped * 2.5;
      mat.emissive.setHex(0xfef08a);
      mat.color.lerpColors(new THREE.Color(0x334155), new THREE.Color(0xfef08a), clamped);
    } else {
      (this.lampGlowMat as any).color.setHex(clamped > 0 ? 0xfef08a : 0x334155);
    }
  }

  /**
   * InstancedMesh for streetlights along road corridor
   */
  public static addInstancedLights(group: THREE.Group, transforms: THREE.Matrix4[]): void {
    if (transforms.length === 0) return;
    this.initMaterials();

    const count = transforms.length;
    const instancedPoles = new THREE.InstancedMesh(this.lightPoleGeom!, this.lightPoleMat!, count);
    instancedPoles.castShadow = true;

    const instancedBulbs = new THREE.InstancedMesh(this.bulbGeom!, this.lampGlowMat!, count);

    for (let i = 0; i < count; i++) {
      instancedPoles.setMatrixAt(i, transforms[i]);
      instancedBulbs.setMatrixAt(i, transforms[i]);
    }

    instancedPoles.instanceMatrix.needsUpdate = true;
    instancedBulbs.instanceMatrix.needsUpdate = true;

    group.add(instancedPoles);
    group.add(instancedBulbs);
  }

  /**
   * InstancedMesh for shade trees along road sidewalk
   */
  public static addInstancedTrees(group: THREE.Group, transforms: THREE.Matrix4[]): void {
    if (transforms.length === 0) return;
    this.initMaterials();

    const count = transforms.length;
    const instancedTrunks = new THREE.InstancedMesh(this.treeTrunkGeom!, this.treeTrunkMat!, count);
    instancedTrunks.castShadow = true;
    instancedTrunks.receiveShadow = true;

    const instancedFoliage = new THREE.InstancedMesh(this.treeFoliageGeom!, this.treeFoliageMat!, count);
    instancedFoliage.castShadow = true;
    instancedFoliage.receiveShadow = true;

    for (let i = 0; i < count; i++) {
      instancedTrunks.setMatrixAt(i, transforms[i]);
      instancedFoliage.setMatrixAt(i, transforms[i]);
    }

    instancedTrunks.instanceMatrix.needsUpdate = true;
    instancedFoliage.instanceMatrix.needsUpdate = true;

    group.add(instancedTrunks);
    group.add(instancedFoliage);
  }

  public static createStreetLight(position: THREE.Vector3, rotationY: number): THREE.Group {
    this.initMaterials();

    const group = new THREE.Group();
    group.position.copy(position);
    group.rotation.y = rotationY;

    const poleMesh = new THREE.Mesh(this.lightPoleGeom!, this.lightPoleMat!);
    poleMesh.castShadow = true;
    group.add(poleMesh);

    const bulb = new THREE.Mesh(this.bulbGeom!, this.lampGlowMat!);
    group.add(bulb);

    return group;
  }

  public static createShadeTree(position: THREE.Vector3, scale: number = 1.0): THREE.Group {
    this.initMaterials();

    const group = new THREE.Group();
    group.position.copy(position);
    group.scale.setScalar(scale);

    const trunk = new THREE.Mesh(this.treeTrunkGeom!, this.treeTrunkMat!);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    group.add(trunk);

    const foliage = new THREE.Mesh(this.treeFoliageGeom!, this.treeFoliageMat!);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    group.add(foliage);

    return group;
  }

  public static createBollardLight(pos: THREE.Vector3): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(pos);

    const postMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.8 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.85, 12), postMat);
    post.position.y = 0.425;
    post.castShadow = true;
    g.add(post);

    const glow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.15, 12),
      new THREE.MeshBasicMaterial({ color: 0xffedd5 })
    );
    glow.position.y = 0.75;
    g.add(glow);

    return g;
  }

  public static createParkBench(pos: THREE.Vector3, rotY: number = 0): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(pos);
    g.rotation.y = rotY;

    const wood = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.65 });
    const iron = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4, metalness: 0.8 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.45), wood);
    seat.position.y = 0.45;
    seat.castShadow = true;
    g.add(seat);

    // Backrest
    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.05), wood);
    back.position.set(0, 0.72, -0.2);
    back.castShadow = true;
    g.add(back);

    // Legs
    const leg1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.42), iron);
    leg1.position.set(-0.65, 0.225, 0);
    g.add(leg1);

    const leg2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.42), iron);
    leg2.position.set(0.65, 0.225, 0);
    g.add(leg2);

    return g;
  }

  public static createTreePlanterPit(pos: THREE.Vector3): THREE.Group {
    const g = new THREE.Group();
    g.position.copy(pos);

    const curbMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x3f2e21, roughness: 0.95 });

    const soil = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), soilMat);
    soil.rotateX(-Math.PI / 2);
    soil.position.y = 0.01;
    g.add(soil);

    const pitSize = 2.0;
    const curbT = 0.12;
    const curbH = 0.14;

    const b1 = new THREE.Mesh(new THREE.BoxGeometry(pitSize, curbH, curbT), curbMat);
    b1.position.set(0, curbH * 0.5, pitSize * 0.5);
    b1.castShadow = true;
    g.add(b1);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(pitSize, curbH, curbT), curbMat);
    b2.position.set(0, curbH * 0.5, -pitSize * 0.5);
    b2.castShadow = true;
    g.add(b2);

    const b3 = new THREE.Mesh(new THREE.BoxGeometry(curbT, curbH, pitSize), curbMat);
    b3.position.set(pitSize * 0.5, curbH * 0.5, 0);
    b3.castShadow = true;
    g.add(b3);

    const b4 = new THREE.Mesh(new THREE.BoxGeometry(curbT, curbH, pitSize), curbMat);
    b4.position.set(-pitSize * 0.5, curbH * 0.5, 0);
    b4.castShadow = true;
    g.add(b4);

    return g;
  }
}
