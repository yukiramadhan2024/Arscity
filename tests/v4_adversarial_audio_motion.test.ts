import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { ProceduralAudio, FootstepMaterial } from '../src/audio/ProceduralAudio';
import { useUIStore } from '../src/ui/state/useUIStore';

// ============================================================================
// High-Fidelity Web Audio API Simulation Harness with Timeline & Node Tracking
// ============================================================================

class AdvMockAudioNode {
  public connectedTo: AdvMockAudioNode[] = [];
  public isDisconnected: boolean = false;

  public connect(target: AdvMockAudioNode) {
    this.connectedTo.push(target);
  }

  public disconnect() {
    this.isDisconnected = true;
    this.connectedTo = [];
  }
}

class AdvMockGainNode extends AdvMockAudioNode {
  public gainValues: Array<{ time: number; value: number; type: string }> = [];
  public gain = {
    value: 1,
    setValueAtTime: vi.fn((val: number, time: number) => {
      this.gain.value = val;
      this.gainValues.push({ time, value: val, type: 'set' });
    }),
    linearRampToValueAtTime: vi.fn((val: number, time: number) => {
      this.gain.value = val;
      this.gainValues.push({ time, value: val, type: 'linear' });
    }),
    exponentialRampToValueAtTime: vi.fn((val: number, time: number) => {
      this.gain.value = val;
      this.gainValues.push({ time, value: val, type: 'exponential' });
    })
  };
}

class AdvMockScheduledSourceNode extends AdvMockAudioNode {
  public startTime: number = -1;
  public stopTime: number = -1;
  public isStarted: boolean = false;
  public isStopped: boolean = false;
  public onended: (() => void) | null = null;
  public context: AdvMockAudioContext;

  constructor(ctx: AdvMockAudioContext) {
    super();
    this.context = ctx;
    ctx.registerSourceNode(this);
  }

  public start = vi.fn((time?: number) => {
    this.isStarted = true;
    this.startTime = time !== undefined ? time : this.context.currentTime;
  });

  public stop = vi.fn((time?: number) => {
    this.isStopped = true;
    this.stopTime = time !== undefined ? time : this.context.currentTime;
  });
}

class AdvMockOscillatorNode extends AdvMockScheduledSourceNode {
  public type: OscillatorType = 'sine';
  public frequency = {
    value: 440,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
}

class AdvMockBufferSourceNode extends AdvMockScheduledSourceNode {
  public buffer: any = null;
}

class AdvMockBiquadFilterNode extends AdvMockAudioNode {
  public type: BiquadFilterType = 'lowpass';
  public frequency = {
    value: 1000,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn()
  };
  public Q = {
    value: 1,
    setValueAtTime: vi.fn()
  };
}

class AdvMockAudioContext {
  public state: AudioContextState = 'running';
  public sampleRate: number = 44100;
  public currentTime: number = 0;
  public destination: AdvMockAudioNode = new AdvMockAudioNode();

  // Allocation counters for memory leak detection
  public bufferSourceCount: number = 0;
  public oscillatorCount: number = 0;
  public gainCount: number = 0;
  public filterCount: number = 0;

  public activeSourceNodes: AdvMockScheduledSourceNode[] = [];

  public registerSourceNode(node: AdvMockScheduledSourceNode) {
    this.activeSourceNodes.push(node);
  }

  public createGain(): AdvMockGainNode {
    this.gainCount++;
    return new AdvMockGainNode();
  }

  public createOscillator(): AdvMockOscillatorNode {
    this.oscillatorCount++;
    return new AdvMockOscillatorNode(this);
  }

  public createBiquadFilter(): AdvMockBiquadFilterNode {
    this.filterCount++;
    return new AdvMockBiquadFilterNode();
  }

  public createBufferSource(): AdvMockBufferSourceNode {
    this.bufferSourceCount++;
    return new AdvMockBufferSourceNode(this);
  }

  public createBuffer(channels: number, length: number, sampleRate: number) {
    return {
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: () => new Float32Array(length)
    };
  }

  public resume = vi.fn().mockResolvedValue(undefined);
  public suspend = vi.fn().mockResolvedValue(undefined);
  public close = vi.fn().mockResolvedValue(undefined);

  /**
   * Advances the mock audio timeline and triggers onended callbacks
   * for sources that have reached their stopTime.
   */
  public advanceTime(dtSeconds: number): void {
    this.currentTime += dtSeconds;
    const remaining: AdvMockScheduledSourceNode[] = [];

    for (const source of this.activeSourceNodes) {
      if (source.isStopped && source.stopTime <= this.currentTime) {
        if (source.onended) {
          const cb = source.onended;
          source.onended = null;
          cb();
        }
      } else {
        remaining.push(source);
      }
    }
    this.activeSourceNodes = remaining;
  }
}

describe('Tahap 3 Adversarial Challenge: Audio Voice Concurrency & Motion Settings', () => {
  let mockCtx: AdvMockAudioContext;
  let audio: ProceduralAudio;

  beforeEach(() => {
    mockCtx = new AdvMockAudioContext();
    (global as any).window = (global as any).window || {};
    (global as any).window.AudioContext = class {
      constructor() {
        return mockCtx;
      }
    };

    audio = new ProceduralAudio();
    audio.enabled = true;
    audio.volume = 0.5;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // CHALLENGE 1: Audio voice concurrency stress test
  // ==========================================================================
  describe('Challenge 1: Audio Voice Concurrency Stress Test', () => {
    it('1.1 Concurrency ceiling: 20 rapid footsteps within 100ms never exceed MAX_FOOTSTEP_VOICES (4)', () => {
      const recordedCounts: number[] = [];

      // Trigger 20 rapid footsteps spaced 5ms apart across 100ms
      for (let step = 0; step < 20; step++) {
        // Step time = step * 5ms = 0.005s per step
        mockCtx.advanceTime(0.005);
        audio.playFootstep('wood');
        const currentCount = audio.getActiveFootstepVoiceCount();
        recordedCounts.push(currentCount);

        // Invariant: Pool must NEVER exceed 4
        expect(currentCount).toBeLessThanOrEqual(ProceduralAudio.MAX_FOOTSTEP_VOICES);
      }

      // Check max recorded count is exactly 4
      const maxVoices = Math.max(...recordedCounts);
      expect(maxVoices).toBe(ProceduralAudio.MAX_FOOTSTEP_VOICES);
      expect(maxVoices).toBe(4);

      // Verify that after all footsteps finish (advance 0.2s), count cleanly returns to 0
      mockCtx.advanceTime(0.2);
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
    });

    it('1.2 Voice pool cleanup: older finished voices are cleaned up via onended without starvation', () => {
      // Step 1: Saturate pool with 4 voices at t=0
      audio.playFootstep('paving');
      audio.playFootstep('paving');
      audio.playFootstep('paving');
      audio.playFootstep('paving');
      expect(audio.getActiveFootstepVoiceCount()).toBe(4);

      // 5th voice attempt is dropped because pool is saturated
      audio.playFootstep('paving');
      expect(audio.getActiveFootstepVoiceCount()).toBe(4);

      // Advance time by 0.06s (paving duration is 0.045s -> all 4 voices have finished)
      mockCtx.advanceTime(0.06);
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);

      // Now new footsteps can play freely without being starved
      audio.playFootstep('ceramic');
      expect(audio.getActiveFootstepVoiceCount()).toBe(1);

      audio.playFootstep('grass');
      expect(audio.getActiveFootstepVoiceCount()).toBe(2);

      mockCtx.advanceTime(0.1);
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
    });

    it('1.3 No AudioNode memory leak: saturated voice attempts do NOT allocate unmanaged nodes', () => {
      // Initial count
      const initialSources = mockCtx.bufferSourceCount + mockCtx.oscillatorCount;
      const initialGains = mockCtx.gainCount;

      // Fill the pool (4 voices of 'ceramic': each uses 1 bufferSource, 1 osc, 1 filter, 1 gain)
      for (let i = 0; i < 4; i++) {
        audio.playFootstep('ceramic');
      }

      const sourcesAfterFull = mockCtx.bufferSourceCount + mockCtx.oscillatorCount;
      const gainsAfterFull = mockCtx.gainCount;

      expect(audio.getActiveFootstepVoiceCount()).toBe(4);
      expect(sourcesAfterFull).toBe(initialSources + 8); // 4 * (1 noise + 1 osc)
      expect(gainsAfterFull).toBe(initialGains + 4);

      // Now fire 50 rapid footsteps while pool is full
      for (let i = 0; i < 50; i++) {
        audio.playFootstep('ceramic');
      }

      // Verifying ZERO additional AudioNodes were created while saturated
      expect(mockCtx.bufferSourceCount + mockCtx.oscillatorCount).toBe(sourcesAfterFull);
      expect(mockCtx.gainCount).toBe(gainsAfterFull);
      expect(audio.getActiveFootstepVoiceCount()).toBe(4);

      // Advance time to release all voices
      mockCtx.advanceTime(0.1);
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
    });

    it('1.4 Strict volume scaling adherence across dynamic volume adjustments', () => {
      // Test at volume 0.2
      audio.volume = 0.2;
      const gainsRecorded: number[] = [];

      // Intercept gain.setValueAtTime
      const origCreateGain = mockCtx.createGain.bind(mockCtx);
      mockCtx.createGain = () => {
        const g = origCreateGain();
        const origSet = g.gain.setValueAtTime;
        g.gain.setValueAtTime = vi.fn((v: number, t: number) => {
          gainsRecorded.push(v);
          return origSet(v, t);
        });
        return g;
      };

      // Grass base gain = 0.12 * volume
      audio.playFootstep('grass');
      expect(gainsRecorded[gainsRecorded.length - 1]).toBeCloseTo(0.12 * 0.2, 5);

      mockCtx.advanceTime(0.1);

      // Test at volume 0.8
      audio.volume = 0.8;
      // Asphalt base gain = 0.18 * volume
      audio.playFootstep('asphalt');
      expect(gainsRecorded[gainsRecorded.length - 1]).toBeCloseTo(0.18 * 0.8, 5);

      mockCtx.advanceTime(0.1);

      // Test at volume 1.0
      audio.volume = 1.0;
      // Paving base gain = 0.22 * volume
      audio.playFootstep('paving');
      expect(gainsRecorded[gainsRecorded.length - 1]).toBeCloseTo(0.22 * 1.0, 5);
    });

    it('1.5 Strict mute flag enforcement: muted state completely suppresses audio execution', () => {
      audio.setMuted(true);
      expect(audio.isMuted()).toBe(true);

      const sourcesBefore = mockCtx.bufferSourceCount + mockCtx.oscillatorCount;
      const gainsBefore = mockCtx.gainCount;

      const materials: FootstepMaterial[] = ['grass', 'asphalt', 'paving', 'wood', 'ceramic', 'dirt'];
      for (const m of materials) {
        audio.playFootstep(m);
      }

      // Voice count must remain 0
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
      // Zero nodes allocated
      expect(mockCtx.bufferSourceCount + mockCtx.oscillatorCount).toBe(sourcesBefore);
      expect(mockCtx.gainCount).toBe(gainsBefore);

      // Volume <= 0 also acts as complete suppression
      audio.setMuted(false);
      audio.volume = 0;
      audio.playFootstep('wood');
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
    });

    it('1.6 Exception resilience: error inside node synthesis cleans up voice counter', () => {
      // Mock createBuffer to throw on demand
      const origCreateBuffer = mockCtx.createBuffer.bind(mockCtx);
      let shouldThrow = true;
      mockCtx.createBuffer = (c: number, l: number, s: number) => {
        if (shouldThrow) {
          throw new Error('Adversarial Web Audio Error: Out of Memory');
        }
        return origCreateBuffer(c, l, s);
      };

      expect(() => {
        audio.playFootstep('grass');
      }).not.toThrow();

      // Because catch block calls releaseVoice(), voice count MUST NOT remain stuck at 1
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);

      // Now restore normal behavior and ensure pool works
      shouldThrow = false;
      audio.playFootstep('grass');
      expect(audio.getActiveFootstepVoiceCount()).toBe(1);
    });
  });

  // ==========================================================================
  // CHALLENGE 2: Surface tag fallback stress test
  // ==========================================================================
  describe('Challenge 2: Surface Tag Fallback Stress Test', () => {
    let camera: THREE.PerspectiveCamera;
    let mockDom: any;
    let controller: FirstPersonController;
    let mockEngine: any;

    beforeEach(() => {
      camera = new THREE.PerspectiveCamera();
      mockDom = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
      controller = new FirstPersonController(camera, mockDom);

      mockEngine = {
        scene: new THREE.Scene(),
        buildingManager: {
          buildings: new Map(),
          masterGroup: new THREE.Group()
        },
        roadManager: {
          masterGroup: new THREE.Group()
        },
        terrain: {
          getHeightAt: vi.fn(() => 0)
        },
        renderer: { toneMappingExposure: 1.05 }
      };
      controller.setEngine(mockEngine);
      controller.isActive = true;
    });

    it('2.1 classifySurfaceFromObject handles arbitrary, unknown, null, and undefined metadata safely', () => {
      // Case A: Completely empty object
      const objEmpty = new THREE.Object3D();
      expect(controller.classifySurfaceFromObject(objEmpty)).toBeNull();

      // Case B: Object with undefined/null userData and material
      const meshNull = new THREE.Mesh();
      meshNull.userData = null as any;
      (meshNull as any).material = null;
      meshNull.name = null as any;
      expect(() => controller.classifySurfaceFromObject(meshNull)).not.toThrow();
      expect(controller.classifySurfaceFromObject(meshNull)).toBeNull();

      // Case C: Unrecognized alien surface tag
      const meshAlien = new THREE.Mesh();
      meshAlien.name = 'AlienCrystallineMonolith';
      meshAlien.userData = { surfaceType: 'antimatter_plasma_flux', materialType: 'neutronium' };
      meshAlien.material = new THREE.MeshStandardMaterial({ name: 'Mat_Strange_Matter' });
      expect(controller.classifySurfaceFromObject(meshAlien)).toBeNull();

      // Case D: Material array with no matches
      const meshMulti = new THREE.Mesh();
      meshMulti.material = [
        new THREE.MeshBasicMaterial({ name: 'mat_alpha' }),
        new THREE.MeshBasicMaterial({ name: 'mat_beta' })
      ];
      expect(controller.classifySurfaceFromObject(meshMulti)).toBeNull();
    });

    it('2.2 classifySurfaceFromObject matches keywords correctly across aliases (Indonesian & English)', () => {
      const testCases: Array<{ tag: string; matName: string; expected: FootstepMaterial }> = [
        { tag: 'Lantai_Parket_Kamar', matName: 'Texture_Kayu_Jati', expected: 'wood' },
        { tag: 'Outdoor_Decking', matName: 'Wood_Plank_Dark', expected: 'wood' },
        { tag: 'Lantai_Marmer_Mewah', matName: 'White_Marble_Glossy', expected: 'ceramic' },
        { tag: 'Ubin_Keramik_Dapur', matName: 'Granit_Tile_60x60', expected: 'ceramic' },
        { tag: 'Trotoar_Pejalan_Kaki', matName: 'Beton_Korp_Paving', expected: 'paving' },
        { tag: 'Plinth_Fondasi', matName: 'Concrete_Smooth', expected: 'paving' },
        { tag: 'Ruas_Jalan_Raya', matName: 'Aspal_Hotmix_Grainy', expected: 'asphalt' },
        { tag: 'Bahu_Jalan_Street', matName: 'Asphalt_Weathered', expected: 'asphalt' },
        { tag: 'Taman_Bunga_Rumput', matName: 'Lawn_Grass_Green', expected: 'grass' },
        { tag: 'Gundukan_Tanah', matName: 'Soil_Gravel_Mud', expected: 'dirt' },
        { tag: 'Timbunan_Pasir', matName: 'River_Sand_Bed', expected: 'dirt' }
      ];

      for (const tc of testCases) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(),
          new THREE.MeshBasicMaterial({ name: tc.matName })
        );
        mesh.userData = { surfaceType: tc.tag };
        mesh.name = tc.tag;
        expect(controller.classifySurfaceFromObject(mesh)).toBe(tc.expected);
      }
    });

    it('2.3 detectSurfaceMaterial falls back robustly across entire layer hierarchy', () => {
      // 1. Inside building without matching room -> defaults to 'ceramic'
      controller.insideBuildingId = 'bld_unknown';
      mockEngine.buildingManager.buildings.set('bld_unknown', {
        id: 'bld_unknown',
        position: new THREE.Vector3(0, 0, 0),
        interiorLayouts: []
      });
      expect(controller.detectSurfaceMaterial()).toBe('ceramic');

      // 2. Outside building, no road, flat terrain -> returns 'grass'
      controller.insideBuildingId = null;
      mockEngine.terrain.getHeightAt = vi.fn(() => 0.5);
      expect(controller.detectSurfaceMaterial()).toBe('grass');

      // 3. Outside building, terrain height < -0.2 (excavated riverbed/pit) -> returns 'dirt'
      mockEngine.terrain.getHeightAt = vi.fn(() => -0.8);
      expect(controller.detectSurfaceMaterial()).toBe('dirt');

      // 4. Unknown object hit during raycast: falls back without throwing
      const unknownObj = new THREE.Mesh(new THREE.BoxGeometry(2, 0.2, 2));
      unknownObj.name = 'Unidentified_Mesh_404';
      unknownObj.position.set(0, 0, 0);
      mockEngine.buildingManager.masterGroup.add(unknownObj);
      controller.position.set(0, 1.0, 0);

      // Falls through to terrain
      mockEngine.terrain.getHeightAt = vi.fn(() => 0.0);
      expect(() => controller.detectSurfaceMaterial()).not.toThrow();
      expect(controller.detectSurfaceMaterial()).toBe('grass');

      // 5. Total void fallback: no building, no road, no terrain -> returns 'paving'
      controller.setEngine({
        scene: new THREE.Scene(),
        buildingManager: { buildings: new Map(), masterGroup: new THREE.Group() },
        roadManager: { masterGroup: new THREE.Group() }
      } as any);
      (controller as any).terrain = undefined;
      expect(controller.detectSurfaceMaterial()).toBe('paving');
    });

    it('2.4 ProceduralAudio handles invalid / arbitrary material types safely via default switch', () => {
      const invalidTypes = [
        'magma',
        'superconductor',
        '',
        undefined,
        null,
        1234,
        {},
        NaN
      ];

      for (const inv of invalidTypes) {
        expect(() => {
          audio.playFootstep(inv as any);
        }).not.toThrow();
      }

      // Advance time and verify cleanup
      mockCtx.advanceTime(0.1);
      expect(audio.getActiveFootstepVoiceCount()).toBe(0);
    });
  });

  // ==========================================================================
  // CHALLENGE 3: Camera bobbing suppression stress test
  // ==========================================================================
  describe('Challenge 3: Camera Bobbing Suppression Stress Test', () => {
    let camera: THREE.PerspectiveCamera;
    let mockDom: any;
    let controller: FirstPersonController;
    let mockEngine: any;

    beforeEach(() => {
      camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 1000);
      mockDom = { addEventListener: vi.fn(), removeEventListener: vi.fn() };
      controller = new FirstPersonController(camera, mockDom);

      mockEngine = {
        scene: new THREE.Scene(),
        buildingManager: { buildings: new Map(), masterGroup: new THREE.Group() },
        roadManager: { masterGroup: new THREE.Group() },
        terrain: { mesh: new THREE.Mesh(), getHeightAt: () => 0 },
        renderer: { toneMappingExposure: 1.05 }
      };
      controller.setEngine(mockEngine);
      controller.isActive = true;
      controller.isGrounded = true;

      useUIStore.getState().setCameraBobbing(true);
      useUIStore.getState().setReduceMotion(false);

      // Start player walking at full speed (velocity = 4.0 m/s)
      controller.currentVelocityX = 0;
      controller.currentVelocityZ = -4.0;
      (controller as any).keysDown.add('KeyW');

      // Let bobbing reach steady state (30 frames of 0.016s)
      for (let i = 0; i < 30; i++) {
        controller.update(0.016);
      }
    });

    afterEach(() => {
      (controller as any).keysDown.delete('KeyW');
    });

    it('3.1 Photo mode: bobbing amplitude immediately damps to < 0.001m within 0.15s', () => {
      // Verify initial active bobbing
      expect(controller.smoothedBobbingTarget).toBeCloseTo(0.015, 2);

      // Trigger photo mode
      controller.isPhotoModeOpen = true;

      // Update for exactly 0.15s (9 steps of ~0.0166s = 0.15s)
      for (let i = 0; i < 9; i++) {
        controller.update(0.016666);
      }

      // Amplitude must damp to < 0.001m (sub-millimeter: 0.74mm)
      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
      expect(controller.smoothedBobbingTarget).toBeLessThan(0.001);

      // Verify no residual oscillation: advance 5 more frames, target continues strictly decreasing
      let prevTarget = controller.smoothedBobbingTarget;
      for (let i = 0; i < 5; i++) {
        controller.update(0.016666);
        expect(controller.smoothedBobbingTarget).toBeLessThanOrEqual(prevTarget);
        prevTarget = controller.smoothedBobbingTarget;
      }
      expect(controller.smoothedBobbingTarget).toBeCloseTo(0, 3);
    });

    it('3.2 Grabbed furniture: bobbing amplitude immediately damps to < 0.001m within 0.15s', () => {
      expect(controller.smoothedBobbingTarget).toBeCloseTo(0.015, 2);

      // Trigger furniture grab
      controller.grabbedFurniture = {
        buildingId: 'bld_1',
        data: {
          id: 'fur_test',
          name: 'Sofa L Test',
          type: 'sofa_l',
          position: [0, 0, 0],
          rotationY: 0,
          floorIndex: 1
        }
      };

      // Advance 0.15s
      for (let i = 0; i < 9; i++) {
        controller.update(0.016666);
      }

      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
      expect(controller.smoothedBobbingTarget).toBeLessThan(0.001);
    });

    it('3.3 Catalog drawer open: bobbing amplitude immediately damps to < 0.001m within 0.15s', () => {
      expect(controller.smoothedBobbingTarget).toBeCloseTo(0.015, 2);

      // Trigger catalog drawer open
      controller.isDrawerOpen = true;

      // Advance 0.15s
      for (let i = 0; i < 9; i++) {
        controller.update(0.016666);
      }

      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
      expect(controller.smoothedBobbingTarget).toBeLessThan(0.001);
    });

    it('3.4 Non-pointer tools: material painter and laser measure damp bobbing within 0.15s', () => {
      expect(controller.smoothedBobbingTarget).toBeCloseTo(0.015, 2);

      // 1. Material Painter
      controller.activeTool = 'material_painter';
      for (let i = 0; i < 9; i++) {
        controller.update(0.016666);
      }
      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);

      // Switch back to pointer: bobbing recovers smoothly
      controller.activeTool = 'pointer';
      for (let i = 0; i < 20; i++) {
        controller.update(0.016666);
      }
      expect(controller.smoothedBobbingTarget).toBeGreaterThan(0.010);

      // 2. Laser Measure
      controller.activeTool = 'laser_measure';
      for (let i = 0; i < 9; i++) {
        controller.update(0.016666);
      }
      expect(Math.abs(controller.currentBobbingOffset)).toBeLessThan(0.001);
    });

    it('3.5 Exact mathematical damping verification (lambda = 20, exp(-20 * 0.15) ≈ 0.0498)', () => {
      const initialAmp = 0.015;
      controller.smoothedBobbingTarget = initialAmp;

      // Suppress
      controller.isPhotoModeOpen = true;

      // Update 0.05s: expected = 0.015 * exp(-1.0) = 0.005518m
      controller.update(0.05);
      expect(controller.smoothedBobbingTarget).toBeCloseTo(initialAmp * Math.exp(-20 * 0.05), 4);

      // Update another 0.05s (total 0.10s): expected = 0.015 * exp(-2.0) = 0.002030m
      controller.update(0.05);
      expect(controller.smoothedBobbingTarget).toBeCloseTo(initialAmp * Math.exp(-20 * 0.10), 4);

      // Update another 0.05s (total 0.15s): expected = 0.015 * exp(-3.0) = 0.000746m (< 1mm)
      controller.update(0.05);
      expect(controller.smoothedBobbingTarget).toBeCloseTo(initialAmp * Math.exp(-20 * 0.15), 4);
      expect(controller.smoothedBobbingTarget).toBeLessThan(0.0008);

      // Monotonic convergence towards 0, no overshoot or sign flip
      expect(controller.smoothedBobbingTarget).toBeGreaterThanOrEqual(0);
    });

    it('3.6 Adversarial rapid flapping test: rapid toggling of suppression states maintains numerical stability', () => {
      for (let frame = 0; frame < 100; frame++) {
        // Pseudo-random state flapping every frame
        controller.isPhotoModeOpen = frame % 3 === 0;
        controller.isDrawerOpen = frame % 5 === 0;
        controller.activeTool = frame % 2 === 0 ? 'pointer' : 'material_painter';
        controller.grabbedFurniture = frame % 7 === 0 ? ({} as any) : null;

        controller.update(0.016);

        // Assert numerical sanity: No NaN, no Infinity, within physical bounds
        expect(Number.isFinite(controller.smoothedBobbingTarget)).toBe(true);
        expect(Number.isFinite(controller.currentBobbingOffset)).toBe(true);
        expect(controller.smoothedBobbingTarget).toBeGreaterThanOrEqual(0);
        expect(controller.smoothedBobbingTarget).toBeLessThanOrEqual(0.016);
        expect(Math.abs(controller.currentBobbingOffset)).toBeLessThanOrEqual(0.016);
      }
    });
  });
});
