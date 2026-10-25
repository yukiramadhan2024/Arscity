import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

/**
 * PostProcessingManager - Manages high-fidelity post-processing pipeline for the 'ultra' preset.
 *
 * Encapsulates:
 * - Scene RenderPass
 * - Ambient Occlusion (SSAOPass)
 * - Subtle Architectural Bloom (UnrealBloomPass) for tropical sunlight and night illumination
 * - Color Grading & Tone Mapping (OutputPass)
 *
 * Implements strict lifecycle and memory disposal when quality switches away from 'ultra'.
 */
export class PostProcessingManager {
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private ssaoPass: SSAOPass | null = null;
  private outputPass: OutputPass | null = null;

  private isInitialized: boolean = false;
  private enabled: boolean = false;

  public init(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number
  ): boolean {
    this.dispose();

    try {
      // Check if context supports render targets
      const gl = renderer.getContext();
      if (!gl) {
        return false;
      }

      // 1. Create EffectComposer with high-precision render target
      const pixelRatio = renderer.getPixelRatio();
      const targetWidth = Math.floor(width * pixelRatio);
      const targetHeight = Math.floor(height * pixelRatio);

      const renderTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
        type: THREE.HalfFloatType,
        samples: 4, // 4x MSAA inside composer
      });
      renderTarget.texture.name = 'Arscity_Ultra_RT';

      this.composer = new EffectComposer(renderer, renderTarget);
      this.composer.setSize(width, height);

      // 2. Base Scene Pass
      this.renderPass = new RenderPass(scene, camera);
      this.composer.addPass(this.renderPass);

      // 3. Screen Space Ambient Occlusion (SSAO) - disabled to avoid sampling noise artifacts on varied GPU backends
      // AO is natively handled with high fidelity via MeshStandardMaterial aoMap and procedural textures
      this.ssaoPass = null;

      // 4. UnrealBloomPass calibrated for golden hour sunlight, cyan sun-arc, and 2700K interior glow
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.35, // strength
        0.5,  // radius
        0.82  // threshold
      );
      this.composer.addPass(this.bloomPass);

      // 5. Output Color Grading & Tone Mapping Pass
      this.outputPass = new OutputPass();
      this.composer.addPass(this.outputPass);

      this.isInitialized = true;
      this.enabled = true;
      return true;
    } catch (err) {
      console.warn('[PostProcessingManager] Post-processing initialization failed:', err);
      this.dispose();
      return false;
    }
  }

  public render(): void {
    if (this.enabled && this.composer && this.isInitialized) {
      this.composer.render();
    }
  }

  public setSize(width: number, height: number): void {
    if (!this.composer) return;
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
    if (this.ssaoPass) {
      this.ssaoPass.setSize(width, height);
    }
  }

  public setCamera(camera: THREE.Camera): void {
    if (this.renderPass) {
      this.renderPass.camera = camera;
    }
    if (this.ssaoPass) {
      this.ssaoPass.camera = camera;
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.composer !== null;
  }

  public isEnabled(): boolean {
    return this.enabled && this.isAvailable();
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
  }

  /**
   * Strictly disposes all passes, intermediate render targets, and WebGL textures
   * to guarantee 0 memory leak when downgrading from 'ultra' preset.
   */
  public dispose(): void {
    if (this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    }

    if (this.ssaoPass) {
      this.ssaoPass.dispose();
      this.ssaoPass = null;
    }

    if (this.outputPass) {
      this.outputPass.dispose();
      this.outputPass = null;
    }

    if (this.renderPass) {
      this.renderPass = null;
    }

    if (this.composer) {
      try {
        if (this.composer.renderTarget1) {
          this.composer.renderTarget1.dispose();
        }
        if (this.composer.renderTarget2) {
          this.composer.renderTarget2.dispose();
        }
      } catch {}
      this.composer = null;
    }

    this.isInitialized = false;
    this.enabled = false;
  }
}
