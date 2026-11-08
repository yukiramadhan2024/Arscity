import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GraphicsQuality } from './GraphicsPresets';

/**
 * PostProcessingManager - Manages high-fidelity post-processing pipeline for Arscity.
 *
 * Encapsulates:
 * - Scene RenderPass
 * - Ground Truth Ambient Occlusion (GTAOPass) for contact shadows with camera altitude/distance fade
 * - Anti-Aliasing (SMAAPass) to remove roof edge and window muntin shimmering
 * - Subtle Architectural Bloom (UnrealBloomPass) for hot solar highlights and night illumination
 * - Color Grading & Tone Mapping (OutputPass) to sRGB
 *
 * Implements strict lifecycle and memory disposal when quality switches away or preset changes.
 */
export class PostProcessingManager {
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private gtaoPass: GTAOPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private smaaPass: SMAAPass | null = null;
  private outputPass: OutputPass | null = null;

  private isInitialized: boolean = false;
  private enabled: boolean = false;
  private currentQuality: GraphicsQuality = 'ultra';
  private width: number = 1024;
  private height: number = 768;

  public init(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    width: number,
    height: number,
    quality: GraphicsQuality = 'ultra'
  ): boolean {
    this.dispose();

    try {
      // Check if context supports render targets
      const gl = renderer.getContext();
      if (!gl) {
        return false;
      }

      this.currentQuality = quality;
      this.width = width;
      this.height = height;

      // 1. Create EffectComposer with high-precision render target
      const pixelRatio = renderer.getPixelRatio();
      const targetWidth = Math.floor(width * pixelRatio);
      const targetHeight = Math.floor(height * pixelRatio);

      const renderTarget = new THREE.WebGLRenderTarget(targetWidth, targetHeight, {
        type: THREE.HalfFloatType,
        samples: quality === 'ultra' ? 4 : 2,
      });
      renderTarget.texture.name = 'Arscity_PostProcess_RT';

      this.composer = new EffectComposer(renderer, renderTarget);
      this.composer.setSize(width, height);

      // 2. Base Scene Pass
      this.renderPass = new RenderPass(scene, camera);
      this.composer.addPass(this.renderPass);

      // 3. Ground Truth Ambient Occlusion (GTAO) for realistic contact shadows
      try {
        this.gtaoPass = new GTAOPass(scene, camera, width, height);
        this.gtaoPass.blendIntensity = quality === 'medium' ? 0.45 : 0.80;
        if (this.gtaoPass.gtaoMaterial?.uniforms) {
          this.gtaoPass.gtaoMaterial.uniforms.radius.value = 0.75; // subtle 0.75m radius
          this.gtaoPass.gtaoMaterial.uniforms.distanceExponent.value = 1.0;
          this.gtaoPass.gtaoMaterial.uniforms.thickness.value = 1.0;
          this.gtaoPass.gtaoMaterial.uniforms.scale.value = 1.0;
        }
        this.composer.addPass(this.gtaoPass);
      } catch (aoErr) {
        console.warn('[PostProcessingManager] GTAOPass init fallback:', aoErr);
        this.gtaoPass = null;
      }

      // 4. Subtle Night & Hotspot Architectural Bloom (Ultra only)
      try {
        this.bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          0.22, // subtle strength
          0.4,  // radius
          0.88  // high threshold: affects only hot highlights and night neon/emissives
        );
        this.bloomPass.enabled = quality === 'high' || quality === 'ultra';
        this.composer.addPass(this.bloomPass);
      } catch (bErr) {
        this.bloomPass = null;
      }

      // 5. SMAA Anti-Aliasing (High & Ultra) to remove jagged roof and window lines
      try {
        this.smaaPass = new SMAAPass(targetWidth, targetHeight);
        this.smaaPass.enabled = quality === 'high' || quality === 'ultra';
        this.composer.addPass(this.smaaPass);
      } catch (smaaErr) {
        console.warn('[PostProcessingManager] SMAAPass init fallback:', smaaErr);
        this.smaaPass = null;
      }

      // 6. Output Color Grading & Tone Mapping Pass
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

  public update(cameraPosition: THREE.Vector3, cameraTarget: THREE.Vector3): void {
    if (!this.gtaoPass) return;
    const dist = cameraPosition.distanceTo(cameraTarget);
    const alt = cameraPosition.y;

    // Fade out GTAO when zooming out to high orbit (distance > 70m or altitude > 50m)
    // Prevents dark circular halos and noisy speckles from high altitude
    const fadeDist = THREE.MathUtils.clamp(1.0 - (dist - 50) / 90, 0, 1);
    const fadeAlt = THREE.MathUtils.clamp(1.0 - (alt - 40) / 80, 0, 1);
    const fadeFactor = Math.min(fadeDist, fadeAlt);
    const baseIntensity = this.currentQuality === 'medium' ? 0.45 : 0.80;
    this.gtaoPass.blendIntensity = baseIntensity * fadeFactor;
  }

  public setQuality(quality: GraphicsQuality): void {
    this.currentQuality = quality;
    if (quality === 'low') {
      this.setEnabled(false);
      return;
    }
    this.setEnabled(true);
    if (this.gtaoPass) {
      this.gtaoPass.enabled = true;
      this.gtaoPass.blendIntensity = quality === 'medium' ? 0.45 : 0.80;
    }
    if (this.bloomPass) {
      this.bloomPass.enabled = quality === 'high' || quality === 'ultra';
    }
    if (this.smaaPass) {
      this.smaaPass.enabled = quality === 'high' || quality === 'ultra';
    }
  }

  public render(): void {
    if (this.enabled && this.composer && this.isInitialized) {
      this.composer.render();
    }
  }

  public setSize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return;
    }
    this.width = width;
    this.height = height;
    if (!this.composer) return;
    this.composer.setSize(width, height);
    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
    if (this.gtaoPass) {
      this.gtaoPass.setSize(width, height);
    }
    if (this.smaaPass) {
      this.smaaPass.setSize(width, height);
    }
  }

  public setCamera(camera: THREE.Camera): void {
    if (this.renderPass) {
      this.renderPass.camera = camera;
    }
    if (this.gtaoPass) {
      this.gtaoPass.camera = camera;
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
   * to guarantee 0 memory leak when downgrading presets.
   */
  public dispose(): void {
    if (this.bloomPass) {
      this.bloomPass.dispose();
      this.bloomPass = null;
    }

    if (this.gtaoPass) {
      this.gtaoPass.dispose();
      this.gtaoPass = null;
    }

    if (this.smaaPass) {
      this.smaaPass.dispose();
      this.smaaPass = null;
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
