import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { CameraController } from '../src/core/engine/CameraController';
import { Terrain } from '../src/world/Terrain';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';

describe('B3 & T2, T3: Glitch Jarak Jauh, Horizon Fog, & Floor Plane Alignment', () => {
  let mockDomElement: HTMLElement;

  beforeEach(() => {
    mockDomElement = {
      clientWidth: 1920,
      clientHeight: 1080,
      addEventListener: () => {},
      removeEventListener: () => {},
    } as unknown as HTMLElement;
  });

  it('CameraController mengadaptasi near plane secara dinamis sesuai ketinggian & mode', () => {
    const cameraController = new CameraController(mockDomElement);

    // 1. Initial / close-in orbit
    (cameraController as any).targetGoal.set(0, 0, 0);
    (cameraController as any).distanceGoal = 20;
    (cameraController as any).polarGoal = Math.PI / 4;
    for (let i = 0; i < 20; i++) {
      cameraController.update(0.1);
    }

    const nearClose = cameraController.camera.near;
    expect(nearClose).toBeGreaterThanOrEqual(0.15);
    expect(nearClose).toBeLessThanOrEqual(0.35);

    // 2. High altitude zoom out (ketinggian tinggi)
    (cameraController as any).distanceGoal = 600;
    (cameraController as any).polarGoal = Math.PI / 6;
    // Step forward several frames to let damping settle
    for (let i = 0; i < 20; i++) {
      cameraController.update(0.1);
    }

    const nearHigh = cameraController.camera.near;
    expect(nearHigh).toBeGreaterThanOrEqual(1.0);
    expect(nearHigh).toBeLessThanOrEqual(1.5);

    // Ratio far/near must be drastically improved (< 4000) compared to old static near=0.06 (66,666)
    const depthRatio = cameraController.camera.far / nearHigh;
    expect(depthRatio).toBeLessThanOrEqual(4000);

    // 3. Walk mode switch: near stays at 0.25 to preserve distant logarithmic depth precision
    cameraController.setWalkMode(true);
    cameraController.update(0.1);
    expect(cameraController.camera.near).toBeCloseTo(0.25, 2);

    cameraController.dispose();
  });

  it('Terrain water mesh memiliki depthWrite: true dan polygonOffset untuk mencegah z-fighting & kedip biru', () => {
    const scene = new THREE.Scene();
    const terrain = new Terrain(scene, 1600, 128);

    const water = terrain.waterMesh;
    expect(water).toBeDefined();
    expect(water.position.y).toBeLessThanOrEqual(-0.45);

    const waterMat = water.material as THREE.MeshStandardMaterial;
    expect(waterMat.depthWrite).toBe(true);
    expect(waterMat.polygonOffset).toBe(true);
    expect(waterMat.polygonOffsetFactor).toBeGreaterThanOrEqual(2.0);
  });

  it('T2: Lantai Mie Nusantara memiliki subfloor di bawah elevasi finished interior (bebas benturan z-fighting)', () => {
    const bld = {
      id: 'resto_1',
      presetKey: 'resto_mie_nusantara',
      type: 'commercial',
      position: new THREE.Vector3(0, 0, 0),
      rotationY: 0,
      width: 14,
      length: 18,
      height: 9,
      floorCount: 2,
      floorHeight: 4.5,
      lod: 'high' as const,
      userData: {}
    } as any;

    const testGroup = new THREE.Group();
    (PrefabMeshBuilder as any).buildMieNusantaraRestaurant(testGroup, bld);
    expect(testGroup.children.length).toBeGreaterThan(0);

    let foundSubfloor = false;
    testGroup.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry) {
        child.geometry.computeBoundingBox();
        const bbox = child.geometry.boundingBox!;
        const width = bbox.max.x - bbox.min.x;
        // Check for Floor 1 subfloor slab (w - 0.1, top at plinthH = 0.35)
        if (Math.abs(bbox.max.y - 0.35) < 0.01 && width > 10) {
          foundSubfloor = true;
          expect(bbox.max.y).toBeLessThanOrEqual(0.35); // Beneath interior finished floor at 0.37m
        }
      }
    });
    expect(foundSubfloor).toBe(true);
  });
});
