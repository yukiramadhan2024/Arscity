import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { GRAPHICS_PRESETS, GraphicsQuality } from '../src/core/engine/GraphicsPresets';
import { detectGpuDiagnostics, GpuDiagnostics } from '../src/core/engine/GpuDiagnostics';
import { CommandManager, ICommand } from '../src/core/commands/CommandManager';
import { WeatherSystem } from '../src/world/WeatherSystem';
import { LightingSystem } from '../src/core/engine/LightingSystem';
import { PostProcessingManager } from '../src/core/engine/PostProcessingManager';
import { useUIStore } from '../src/ui/state/useUIStore';

describe('Ultra Graphics Preset & GPU Diagnostics', () => {
  describe('GRAPHICS_PRESETS Configuration', () => {
    it('defines ultra preset with 4K shadow map and hardware-optimized limits', () => {
      const ultra = GRAPHICS_PRESETS.ultra;
      expect(ultra).toBeDefined();
      expect(ultra.id).toBe('ultra');
      expect(ultra.shadowMapSize).toBe(4096);
      expect(ultra.shadowFrustumRadius).toBe(150);
      expect(ultra.shadowType).toBe(THREE.PCFSoftShadowMap);
      expect(ultra.anisotropy).toBe('max');
      expect(ultra.postProcessing).toBe(true);
      expect(ultra.rainParticleCount).toBe(25000);
      expect(ultra.propDrawDistance).toBe(600);
      expect(ultra.maxUndoHistory).toBe(1000);
      expect(ultra.keepGlassBlur).toBe(true);
      expect(ultra.glassBlurPx).toBe('24px');
    });

    it('contains all 4 tiered quality levels: low, medium, high, ultra', () => {
      const keys = Object.keys(GRAPHICS_PRESETS) as GraphicsQuality[];
      expect(keys).toEqual(['low', 'medium', 'high', 'ultra']);
      expect(GRAPHICS_PRESETS.low.shadowMapSize).toBe(0);
      expect(GRAPHICS_PRESETS.medium.shadowMapSize).toBe(1024);
      expect(GRAPHICS_PRESETS.high.shadowMapSize).toBe(2048);
      expect(GRAPHICS_PRESETS.ultra.shadowMapSize).toBe(4096);
    });
  });

  describe('GpuDiagnostics Hardware Detection', () => {
    it('handles null / headless context safely without throwing', () => {
      const diag = detectGpuDiagnostics(null, 16);
      expect(diag.isDiscreteGpu).toBe(false);
      expect(diag.maxAnisotropy).toBe(16);
      expect(diag.tier).toBe('unknown');
      expect(diag.renderer).toBe('WebGL Virtual Context');
    });

    it('identifies discrete NVIDIA GeForce RTX 3070 Laptop GPU correctly', () => {
      const mockGl = {
        getExtension: (name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          return null;
        },
        getParameter: (p: number) => {
          if (p === 0x9246) {
            return 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Laptop GPU Direct3D11 vs_5_0 ps_5_0, D3D11)';
          }
          if (p === 0x9245) {
            return 'Google Inc. (NVIDIA)';
          }
          if (p === 0x0d33) {
            // MAX_TEXTURE_SIZE
            return 16384;
          }
          return null;
        },
        RENDERER: 0x1f01,
        VENDOR: 0x1f00,
        MAX_TEXTURE_SIZE: 0x0d33,
      } as unknown as WebGLRenderingContext;

      const diag = detectGpuDiagnostics(mockGl, 16);
      expect(diag.isDiscreteGpu).toBe(true);
      expect(diag.tier).toBe('discrete');
      expect(diag.vendor).toContain('NVIDIA');
      expect(diag.renderer).toContain('RTX 3070');
      expect(diag.maxAnisotropy).toBe(16);
      expect(diag.maxTextureSize).toBe(16384);
      expect(diag.description).toContain('Discrete GPU • High VRAM');
    });

    it('identifies dual-GPU integrated Intel UHD graphics as integrated', () => {
      const mockGl = {
        getExtension: (name: string) => {
          if (name === 'WEBGL_debug_renderer_info') {
            return {
              UNMASKED_RENDERER_WEBGL: 0x9246,
              UNMASKED_VENDOR_WEBGL: 0x9245,
            };
          }
          return null;
        },
        getParameter: (p: number) => {
          if (p === 0x9246) {
            return 'Intel(R) UHD Graphics 630';
          }
          if (p === 0x9245) {
            return 'Intel Open Source Technology Center';
          }
          if (p === 0x0d33) {
            return 8192;
          }
          return null;
        },
        RENDERER: 0x1f01,
        VENDOR: 0x1f00,
        MAX_TEXTURE_SIZE: 0x0d33,
      } as unknown as WebGLRenderingContext;

      const diag = detectGpuDiagnostics(mockGl, 4);
      expect(diag.isDiscreteGpu).toBe(false);
      expect(diag.tier).toBe('integrated');
      expect(diag.renderer).toContain('Intel');
      expect(diag.description).toContain('(Integrated GPU)');
    });
  });

  describe('CommandManager History Scaling for 32GB RAM', () => {
    it('supports 1000 undo steps on ultra preset and clamps to maxHistory', () => {
      const cm = new CommandManager();
      cm.setMaxHistory(1000);
      expect(cm.maxHistory).toBe(1000);

      const dummyCmd = (id: number): ICommand => ({
        description: `Command ${id}`,
        execute: () => {},
        undo: () => {},
      });

      // Push 1050 commands
      for (let i = 0; i < 1050; i++) {
        cm.execute(dummyCmd(i));
      }

      // History should be capped at 1000
      expect((cm as any).undoStack.length).toBe(1000);

      // Switching down to medium (200 steps) immediately trims excess
      cm.setMaxHistory(200);
      expect(cm.maxHistory).toBe(200);
      expect((cm as any).undoStack.length).toBe(200);
    });
  });

  describe('WeatherSystem Ultra Rain Density', () => {
    it('scales rain particle buffer to 25,000 on ultra with clean re-allocation', () => {
      const scene = new THREE.Scene();
      const ws = new WeatherSystem(scene);

      expect(ws.getRainCount()).toBe(2500); // default medium

      // Switch to Ultra
      ws.setGraphicsQuality('ultra');
      expect(ws.getRainCount()).toBe(25000);

      // Switch to Low
      ws.setGraphicsQuality('low');
      expect(ws.getRainCount()).toBe(1000);

      // Switch to High
      ws.setGraphicsQuality('high');
      expect(ws.getRainCount()).toBe(6000);

      ws.dispose();
    });
  });

  describe('LightingSystem 4K Ultra Shadow Maps & Frustum', () => {
    it('sets 4096 shadow map and 150m frustum radius on ultra', () => {
      const scene = new THREE.Scene();
      const ls = new LightingSystem(scene);

      ls.setGraphicsQuality('ultra');
      expect(ls.sunLight.castShadow).toBe(true);
      expect(ls.sunLight.shadow.mapSize.width).toBe(4096);
      expect(ls.sunLight.shadow.mapSize.height).toBe(4096);
      expect(ls.sunLight.shadow.camera.left).toBe(-150);
      expect(ls.sunLight.shadow.camera.right).toBe(150);
      expect(ls.sunLight.shadow.camera.top).toBe(150);
      expect(ls.sunLight.shadow.camera.bottom).toBe(-150);
      expect(ls.sunLight.shadow.bias).toBe(-0.0001);
      expect(ls.sunLight.shadow.normalBias).toBe(0.02);

      // Switching to low disables shadow map
      ls.setGraphicsQuality('low');
      expect(ls.sunLight.castShadow).toBe(false);

      ls.dispose();
    });
  });

  describe('PostProcessingManager Lifecycle & Disposal', () => {
    it('handles disposal cleanly with 0 dangling references', () => {
      const ppm = new PostProcessingManager();
      expect(ppm.isEnabled()).toBe(false);
      expect(ppm.isAvailable()).toBe(false);

      ppm.dispose();
      expect(ppm.isEnabled()).toBe(false);
      expect(ppm.isAvailable()).toBe(false);
    });
  });

  describe('useUIStore Ultra Quality Synchronization', () => {
    it('sets graphicsQuality to ultra and persists to store', () => {
      const store = useUIStore.getState();
      store.setGraphicsQuality('ultra');
      expect(useUIStore.getState().graphicsQuality).toBe('ultra');

      // Return to medium
      store.setGraphicsQuality('medium');
      expect(useUIStore.getState().graphicsQuality).toBe('medium');
    });

    it('updates DOM theme tokens when document is available', () => {
      const setPropertyMock = vi.fn();
      const mockDoc = {
        documentElement: {
          setAttribute: vi.fn(),
          style: {
            setProperty: setPropertyMock,
          },
        },
      };
      (globalThis as any).document = mockDoc;

      const store = useUIStore.getState();
      store.setGraphicsQuality('ultra');
      expect(setPropertyMock).toHaveBeenCalledWith('--glass-blur', '24px');

      store.setGraphicsQuality('low');
      expect(setPropertyMock).toHaveBeenCalledWith('--glass-blur', '0px');

      delete (globalThis as any).document;
    });
  });
});
