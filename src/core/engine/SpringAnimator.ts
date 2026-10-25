import * as THREE from 'three';

export interface SpringTarget {
  object: THREE.Object3D;
  startTime: number;
  durationMs: number;
  initialScale: THREE.Vector3;
  targetScale: THREE.Vector3;
  isReducedMotion: boolean;
}

/**
 * SpringAnimator: Lightweight procedural bounce & tactile placement spring.
 * Gives immediate tactile game-feel to building, tree, and road placement
 * (Townscaper / Sims 4 build mode aesthetic).
 */
export class SpringAnimator {
  private activeSprings: Map<number, SpringTarget> = new Map();
  public defaultDurationMs: number = 220;

  public triggerPlacementSpring(
    object: THREE.Object3D,
    isReducedMotion: boolean = false,
    durationMs: number = 220
  ): void {
    if (!object) return;

    const targetScale = object.scale.clone();
    // Squash & stretch initial state
    const initialScale = new THREE.Vector3(
      targetScale.x * 1.12,
      targetScale.y * 0.72,
      targetScale.z * 1.12
    );

    object.scale.copy(initialScale);

    this.activeSprings.set(object.id, {
      object,
      startTime: performance.now(),
      durationMs: isReducedMotion ? 120 : durationMs,
      initialScale,
      targetScale,
      isReducedMotion
    });
  }

  public update(): void {
    if (this.activeSprings.size === 0) return;

    const now = performance.now();
    const completedIds: number[] = [];

    // Apple Tactile Physics parameters (k: 520, c: 32, m: 0.7)
    // omega0 = sqrt(520 / 0.7) ~= 27.25 rad/s
    // zeta = 32 / (2 * sqrt(520 * 0.7)) ~= 0.8386
    // gamma = zeta * omega0 ~= 22.85
    // omegaD = omega0 * sqrt(1 - zeta^2) ~= 14.85 rad/s
    const gamma = 22.85;
    const omegaD = 14.85;

    for (const [id, spring] of this.activeSprings.entries()) {
      const elapsedSec = (now - spring.startTime) / 1000;
      const progress = Math.min(1.0, (now - spring.startTime) / spring.durationMs);

      if (spring.isReducedMotion) {
        // Smooth ease-out for accessibility reduced motion
        const t = 1 - Math.pow(1 - progress, 2);
        spring.object.scale.lerpVectors(spring.initialScale, spring.targetScale, t);
      } else {
        // Pure Apple Second-Order Harmonic Spring:
        // x(t) = 1 - e^(-gamma * t) * (cos(omegaD * t) + (gamma / omegaD) * sin(omegaD * t))
        const envelope = Math.exp(-gamma * elapsedSec);
        const osc = Math.cos(omegaD * elapsedSec) + (gamma / omegaD) * Math.sin(omegaD * elapsedSec);
        // Factor represents displacement from initial (0) to target (1)
        const factor = Math.max(0, 1 - envelope * osc);

        spring.object.scale.lerpVectors(spring.initialScale, spring.targetScale, factor);
      }

      // Settling condition: envelope under threshold or duration met
      if (progress >= 1.0 || (!spring.isReducedMotion && elapsedSec > 0.18 && Math.exp(-gamma * elapsedSec) < 0.01)) {
        spring.object.scale.copy(spring.targetScale);
        completedIds.push(id);
      }
    }

    for (const id of completedIds) {
      this.activeSprings.delete(id);
    }
  }

  public clear(): void {
    for (const spring of this.activeSprings.values()) {
      spring.object.scale.copy(spring.targetScale);
    }
    this.activeSprings.clear();
  }
}

export const springAnimator = new SpringAnimator();
