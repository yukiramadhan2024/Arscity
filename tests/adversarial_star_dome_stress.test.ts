import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { LightingSystem } from '../src/core/engine/LightingSystem';

describe('Adversarial Star Dome Verification (T1.2)', () => {
  it('strictly enforces all architectural star dome parameters', () => {
    const scene = new THREE.Scene();
    const lighting = new LightingSystem(scene);

    const starPoints = lighting.starPoints;
    expect(starPoints).toBeDefined();
    expect(starPoints).toBeInstanceOf(THREE.Points);

    // 1. Frustum culling and render order
    expect(starPoints!.frustumCulled).toBe(false);
    expect(starPoints!.renderOrder).toBe(-1000);

    // 2. Material configuration
    const mat = starPoints!.material as THREE.PointsMaterial;
    expect(mat.sizeAttenuation).toBe(false); // Must be fixed pixel size, NOT world scale
    expect(mat.depthWrite).toBe(false);      // Must never occlude or write depth
    expect(mat.depthTest).toBe(false);       // Must never be occluded by scene objects
    expect(mat.fog).toBe(false);             // Fog must not dim or tint stars irregularly
    expect(mat.transparent).toBe(true);

    // 3. Geometry radius
    const positions = starPoints!.geometry.getAttribute('position');
    expect(positions.count).toBe(800);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const r = Math.hypot(x, y, z);
      // Expected radius ~ 3600m
      expect(r).toBeCloseTo(3600, 0);
      // All stars must be in upper hemisphere (above horizon)
      expect(y).toBeGreaterThanOrEqual(0);
    }
  });

  it('verifies camera tracking updates star dome position accurately in all directions', () => {
    const scene = new THREE.Scene();
    const lighting = new LightingSystem(scene);
    const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 4000);

    const testPositions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1250, 450, -890),
      new THREE.Vector3(-3400, 120, 2500),
      new THREE.Vector3(500, 1800, 500)
    ];

    for (const pos of testPositions) {
      camera.position.copy(pos);
      lighting.updateStarDome(camera);
      expect(lighting.starPoints!.position.x).toBe(pos.x);
      expect(lighting.starPoints!.position.y).toBe(pos.y);
      expect(lighting.starPoints!.position.z).toBe(pos.z);
    }
  });

  it('verifies 24-hour diurnal cycle: zero stars at noon, visible at midnight, smooth transitions', () => {
    const scene = new THREE.Scene();
    const lighting = new LightingSystem(scene);

    // Midday (12:00): must be completely invisible (opacity 0, visible false)
    lighting.setTime(12.0);
    expect(lighting.starPoints!.visible).toBe(false);
    expect((lighting.starPoints!.material as THREE.PointsMaterial).opacity).toBe(0);

    // Morning (09:00): invisible
    lighting.setTime(9.0);
    expect(lighting.starPoints!.visible).toBe(false);

    // Afternoon (15:00): invisible
    lighting.setTime(15.0);
    expect(lighting.starPoints!.visible).toBe(false);

    // Golden Hour (17:00): invisible
    lighting.setTime(17.0);
    expect(lighting.starPoints!.visible).toBe(false);

    // Dusk transition (18:00): partially faded in
    lighting.setTime(18.0);
    expect(lighting.starPoints!.visible).toBe(true);
    const opacityDusk = (lighting.starPoints!.material as THREE.PointsMaterial).opacity;
    expect(opacityDusk).toBeGreaterThan(0);
    expect(opacityDusk).toBeLessThan(0.95);

    // Obsidian Night (21:00 to 04:00): fully visible
    lighting.setTime(22.0);
    expect(lighting.starPoints!.visible).toBe(true);
    expect((lighting.starPoints!.material as THREE.PointsMaterial).opacity).toBe(0.95);

    lighting.setTime(0.0);
    expect(lighting.starPoints!.visible).toBe(true);
    expect((lighting.starPoints!.material as THREE.PointsMaterial).opacity).toBe(0.95);

    lighting.setTime(3.0);
    expect(lighting.starPoints!.visible).toBe(true);
    expect((lighting.starPoints!.material as THREE.PointsMaterial).opacity).toBe(0.95);

    // Dawn transition (05:30): fading out
    lighting.setTime(5.5);
    expect(lighting.starPoints!.visible).toBe(true);
    const opacityDawn = (lighting.starPoints!.material as THREE.PointsMaterial).opacity;
    expect(opacityDawn).toBeGreaterThan(0);
    expect(opacityDawn).toBeLessThan(0.95);

    // Full sunrise (06:30): invisible
    lighting.setTime(6.5);
    expect(lighting.starPoints!.visible).toBe(false);
    expect((lighting.starPoints!.material as THREE.PointsMaterial).opacity).toBe(0);
  });
});
