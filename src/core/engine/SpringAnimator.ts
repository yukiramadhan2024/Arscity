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

    for (const [id, spring] of this.activeSprings.entries()) {
      const elapsed = now - spring.startTime;
      const progress = Math.min(1.0, elapsed / spring.durationMs);

      if (spring.isReducedMotion) {
        // Linear ease-out for reduced motion
        const t = 1 - Math.pow(1 - progress, 2);
        spring.object.scale.lerpVectors(spring.initialScale, spring.targetScale, t);
      } else {
        // Damped harmonic spring curve: 0.72 -> 1.04 -> 1.0
        // f(t) = 1 - e^(-6t) * cos(10t)
        const decay = Math.exp(-6.5 * progress);
        const osc = Math.cos(9.0 * progress);
        const factor = 1 - decay * osc;

        spring.object.scale.set(
          spring.targetScale.x * factor,
          spring.targetScale.y * factor,
          spring.targetScale.z * factor
        );
      }

      if (progress >= 1.0) {
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
