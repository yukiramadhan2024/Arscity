import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';
import { HumanScaleFigure } from '../src/buildings/HumanScaleFigure';
import { useUIStore } from '../src/ui/state/useUIStore';

describe('Phase 5: Adaptive Glass & Human Scale Figure 1.65m', () => {
  it('creates HumanScaleFigure with 1.65m height and proper parts', () => {
    const figure = new HumanScaleFigure(1.65);
    const obj = figure.getObject();

    expect(obj).toBeInstanceOf(THREE.Group);
    expect(obj.name).toContain('1.65m');

    let meshCount = 0;
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++;
      }
    });

    // Head, torso, 2 legs, 1 ground disc = 5 meshes
    expect(meshCount).toBe(5);

    figure.dispose();
  });

  it('handles adaptive glass performance downgrade when low FPS is reported', () => {
    const { setFps } = useUIStore.getState();

    // Baseline 60 FPS
    setFps(60);
    expect(useUIStore.getState().adaptiveGlass).toBe('normal');

    // Simulate drop below 48 FPS
    setFps(40);
    // At first tick, still normal
    expect(useUIStore.getState().adaptiveGlass).toBe('normal');

    // Fast forward mock time if performance.now is simulated
    const origNow = performance.now;
    let mockTime = 1000;
    performance.now = () => mockTime;

    setFps(42); // first tick records mockTime = 1000
    mockTime = 4500; // 3500ms later
    setFps(42); // second tick triggers downgrade

    expect(useUIStore.getState().adaptiveGlass).toBe('low');

    // Recovery when FPS returns to >= 54
    setFps(58);
    expect(useUIStore.getState().adaptiveGlass).toBe('normal');

    performance.now = origNow;
  });
});
