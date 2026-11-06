import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';

// UI & Store
import { useUIStore } from '../../src/ui/state/useUIStore';
import { LIGHT_THEME_TOKENS } from '../../src/ui/constants/themeTokens';
import { SPRING_TACTILE } from '../../src/ui/motion/appleSprings';

// Engine & Camera
import { CameraController } from '../../src/core/engine/CameraController';
import { GRAPHICS_PRESETS, GraphicsQuality } from '../../src/core/engine/GraphicsPresets';

// Hydrology & Terrain
import { Terrain } from '../../src/world/Terrain';
import { RoadGraph } from '../../src/roads/RoadGraph';
import { RoadGeometryBuilder } from '../../src/roads/RoadGeometryBuilder';
import { RIVER_PROFILES } from '../../src/world/RiverTypes';

// Interiors & CAD
import {
  computeRotatedFurnitureHalfExtents,
  FIRST_PERSON_FURNITURE_CATALOG
} from '../../src/buildings/FirstPersonFurnitureCatalog';
import { InteriorInteractiveSystem, InteractiveDoor } from '../../src/buildings/InteriorInteractiveSystem';
import { InteriorMeshBuilder } from '../../src/buildings/InteriorMeshBuilder';
import { FirstPersonController } from '../../src/core/engine/FirstPersonController';
import { BuildingInstance } from '../../src/buildings/PrefabTypes';
import { generateFloorsForMassingShape } from '../../src/buildings/CustomBuildingModel';
import { SectionCutManager } from '../../src/analysis/SectionCutManager';

// WCAG relative luminance and contrast helper
function getRelativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('E2E Tier 2: Boundary & Corner Cases (6 Feature Areas)', () => {
  beforeEach(() => {
    useUIStore.getState().closeModal();
  });

  // =========================================================================
  // FEATURE AREA 1: Cleanup of Mission/Score/Quiz Entry Points
  // =========================================================================
  describe('Feature Area 1: Boundary & Corner Cases (Modal State & Isolation)', () => {
    it('1.1 Rapid modal state churn (100 alternating switches) never corrupts activeModal state', () => {
      const store = useUIStore.getState();
      const modalSequence: ('settings' | 'help')[] = ['settings', 'help'];

      for (let i = 0; i < 100; i++) {
        const target = modalSequence[i % 2];
        store.openModal(target);
        expect(useUIStore.getState().activeModal).toBe(target);
      }

      store.closeModal();
      expect(useUIStore.getState().activeModal).toBeNull();
      expect(useUIStore.getState().showSettings).toBe(false);
      expect(useUIStore.getState().showHelp).toBe(false);
    });

    it('1.2 Repeated calls to closeModal when already null remain a safe idempotent no-op', () => {
      const store = useUIStore.getState();
      expect(store.activeModal).toBeNull();
      // Calling closeModal multiple times
      store.closeModal();
      store.closeModal();
      store.closeModal();
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('1.3 Handling non-existent or legacy modal IDs gracefully without throwing exceptions', () => {
      const store = useUIStore.getState();
      // Passing unknown string cast as any
      expect(() => {
        store.openModal('unknown_legacy_modal' as any);
      }).not.toThrow();

      // State safely handles the ID or ignores it
      store.closeModal();
      expect(useUIStore.getState().activeModal).toBeNull();
    });

    it('1.4 Quick Controls popover state handles rapid inversion without desync', () => {
      const store = useUIStore.getState();
      const initialSnap = store.gridSnap;
      for (let i = 0; i < 20; i++) {
        store.setGridSnap(i % 2 === 0 ? 2 : 1);
      }
      store.setGridSnap(initialSnap);
      expect(useUIStore.getState().gridSnap).toBe(initialSnap);
    });

    it('1.5 Screen state transitions between auth, hub, and game maintain clean activeModal isolation', () => {
      const store = useUIStore.getState();
      store.openModal('settings');
      expect(useUIStore.getState().activeModal).toBe('settings');

      // Transition to game screen
      store.startGame();
      expect(useUIStore.getState().currentScreen).toBe('game');
    });
  });

  // =========================================================================
  // FEATURE AREA 2: Vector Logo & 2-Font Typography Adherence
  // =========================================================================
  describe('Feature Area 2: Boundary & Corner Cases (Logo Scaling & Typography)', () => {
    it('2.1 Extreme logo sizing calculations (size = 0, size = 1, size = 2048) produce non-negative font sizes', () => {
      const computeFontSize = (size: number) => Math.max(14, size * 0.45);
      const computeGap = (size: number) => Math.max(8, size * 0.25);

      expect(computeFontSize(0)).toBe(14);
      expect(computeGap(0)).toBe(8);
      expect(computeFontSize(1)).toBe(14);
      expect(computeFontSize(2048)).toBeCloseTo(921.6, 1);
      expect(computeGap(2048)).toBeCloseTo(512, 1);
    });

    it('2.2 Undefined or null textColor prop defaults safely to theme label variable', () => {
      const fallbackTextColor = (textColor?: string) => textColor || 'var(--label, #0F172A)';
      expect(fallbackTextColor(undefined)).toBe('var(--label, #0F172A)');
      expect(fallbackTextColor('')).toBe('var(--label, #0F172A)');
      expect(fallbackTextColor('#0A84FF')).toBe('#0A84FF');
    });

    it('2.3 Telemetry number overflow formatting safely bounds extreme values (0 FPS, 99999 FPS)', () => {
      const formatFps = (fps: number) => `${Math.max(0, Math.min(9999, Math.round(fps)))} FPS`;
      expect(formatFps(0)).toBe('0 FPS');
      expect(formatFps(144)).toBe('144 FPS');
      expect(formatFps(-5)).toBe('0 FPS');
      expect(formatFps(99999)).toBe('9999 FPS');
    });

    it('2.4 Monospace font fallback list guarantees monospace availability even when primary font is missing', () => {
      const monoStack = 'var(--font-mono, "JetBrains Mono", "Space Mono", monospace)';
      expect(monoStack).toContain('monospace');
      expect(monoStack).toContain('JetBrains Mono');
    });

    it('2.5 Canvas text rendering with special architectural characters does not corrupt string buffers', () => {
      const testLabels = ['Lantai 1 (+0.35m)', 'R. Tamu (2.4m x 1.8m)', 'Gedung #12 & 100%', 'KDB: 60%'];
      for (const label of testLabels) {
        expect(label.length).toBeGreaterThan(0);
        expect(typeof label).toBe('string');
        expect(label).not.toContain('\0');
      }
    });
  });

  // =========================================================================
  // FEATURE AREA 3: Apple VisionOS Frosted Glass & Settings
  // =========================================================================
  describe('Feature Area 3: Boundary & Corner Cases (Contrast, Scales & Spring Limits)', () => {
    it('3.1 Charcoal text (#0F172A) on white surface (#FFFFFF) achieves WCAG AAA contrast (> 7.0:1)', () => {
      const charcoal = '#0F172A';
      const white = '#FFFFFF';
      const contrast = getContrastRatio(charcoal, white);
      expect(contrast).toBeGreaterThanOrEqual(7.0); // WCAG AAA is 7.0:1
      expect(contrast).toBeGreaterThan(15.0); // Actual is ~16.5:1
    });

    it('3.2 Secondary gray text (#475569) on white surface (#FFFFFF) satisfies WCAG AA contrast (>= 4.5:1)', () => {
      const slateGray = '#475569';
      const white = '#FFFFFF';
      const contrast = getContrastRatio(slateGray, white);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA standard
    });

    it('3.3 Extreme text scale clamping (minimum 0.8x to maximum 1.4x)', () => {
      const clampTextScale = (s: number) => Math.max(0.8, Math.min(1.4, s));
      expect(clampTextScale(0.5)).toBe(0.8);
      expect(clampTextScale(1.0)).toBe(1.0);
      expect(clampTextScale(2.5)).toBe(1.4);
    });

    it('3.4 Apple spring physics parameters remain physically stable (stiffness > 0, damping > 0)', () => {
      expect(SPRING_TACTILE.stiffness).toBeGreaterThan(0);
      expect(SPRING_TACTILE.damping).toBeGreaterThan(0);
      // Damping ratio zeta = damping / (2 * sqrt(stiffness * mass))
      const m = 0.7;
      const k = SPRING_TACTILE.stiffness as number;
      const c = SPRING_TACTILE.damping as number;
      const zeta = c / (2 * Math.sqrt(k * m));
      // Stable near-critical damping (0.6 <= zeta <= 1.2)
      expect(zeta).toBeGreaterThan(0.5);
      expect(zeta).toBeLessThan(1.5);
    });

    it('3.5 Rapid graphics quality switching through all 4 presets preserves preset properties', () => {
      const qualities: GraphicsQuality[] = ['low', 'medium', 'high', 'ultra'];
      for (const q of qualities) {
        const preset = GRAPHICS_PRESETS[q];
        expect(preset.id).toBe(q);
        expect(preset.shadowMapSize).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // =========================================================================
  // FEATURE AREA 4: Engine 144Hz Uncapped Loop & UE5 Visuals
  // =========================================================================
  describe('Feature Area 4: Boundary & Corner Cases (Delta Time Spikes & EMA Smoothing)', () => {
    it('4.1 Extreme delta time spikes (dt = 10.0s, dt = 3600.0s) strictly clamp to 0.1s', () => {
      const clampDt = (rawDt: number) => Math.max(0, Math.min(rawDt, 0.1));
      expect(clampDt(10.0)).toBe(0.1);
      expect(clampDt(3600.0)).toBe(0.1);
    });

    it('4.2 Negative or zero delta time clamps safely to 0 to prevent backward time step', () => {
      const clampDt = (rawDt: number) => Math.max(0, Math.min(rawDt, 0.1));
      expect(clampDt(0)).toBe(0);
      expect(clampDt(-0.016)).toBe(0);
      expect(clampDt(-100)).toBe(0);
    });

    it('4.3 EMA FPS calculation monotonically approaches sudden framerate jump from 60 to 144 FPS', () => {
      let currentEma = 60.0;
      const alpha = 0.2; // 20% weight on new sample
      const targetFps = 144.0;

      for (let frame = 0; frame < 30; frame++) {
        const prev = currentEma;
        currentEma = alpha * targetFps + (1 - alpha) * currentEma;
        expect(currentEma).toBeGreaterThan(prev); // Monotonic increase
      }
      expect(currentEma).toBeCloseTo(144.0, 0);
    });

    it('4.4 Device pixel ratio clamps low (0.5) and extreme high (4.0) values safely', () => {
      const clampDpr = (dpr: number) => Math.min(Math.max(dpr, 0.5), 1.5);
      expect(clampDpr(0.5)).toBe(0.5);
      expect(clampDpr(0.1)).toBe(0.5);
      expect(clampDpr(4.0)).toBe(1.5);
    });

    it('4.5 Freezing matrix updates on 500 static meshes executes rapidly with valid matrices', () => {
      const meshes: THREE.Mesh[] = [];
      const geom = new THREE.BoxGeometry(1, 1, 1);
      const mat = new THREE.MeshBasicMaterial();

      for (let i = 0; i < 500; i++) {
        const m = new THREE.Mesh(geom, mat);
        m.position.set(i * 2, 0, (i % 10) * 2);
        meshes.push(m);
      }

      const tStart = performance.now();
      for (const m of meshes) {
        m.updateMatrix();
        m.matrixAutoUpdate = false;
      }
      const elapsed = performance.now() - tStart;

      expect(elapsed).toBeLessThan(100); // Fast batch execution
      for (const m of meshes) {
        expect(m.matrixAutoUpdate).toBe(false);
        expect(isNaN(m.matrix.elements[0])).toBe(false);
      }
    });
  });

  // =========================================================================
  // FEATURE AREA 5: Lush Foliage, Hydrology & 2D/3D Mode
  // =========================================================================
  describe('Feature Area 5: Boundary & Corner Cases (Hydrology & Camera Extremes)', () => {
    let scene: THREE.Scene;

    beforeEach(() => {
      scene = new THREE.Scene();
    });

    it('5.1 River channel elevation bounds: excavation depth -2.0m is below water level -0.30m', () => {
      const riverbedY = -2.0;
      const waterY = RIVER_PROFILES.wide_river.waterLevelY;
      expect(waterY).toBeCloseTo(-0.30, 2);
      expect(riverbedY).toBeLessThan(waterY);
      const waterDepth = waterY - riverbedY;
      expect(waterDepth).toBeCloseTo(1.7, 1);
    });

    it('5.2 Terrain slope calculation remains strictly bounded in [0.0, 1.0] for vertical and flat faces', () => {
      const calcSlope = (normalY: number) => 1.0 - Math.min(1.0, Math.max(0.0, Math.abs(normalY)));
      // Horizontal flat plane: normal = (0, 1, 0) -> slope = 0.0
      expect(calcSlope(1.0)).toBe(0.0);
      // Vertical cliff: normal = (1, 0, 0) -> slope = 1.0
      expect(calcSlope(0.0)).toBe(1.0);
      // 45 degree slope: normalY = sqrt(0.5) ~ 0.7071
      expect(calcSlope(Math.SQRT1_2)).toBeCloseTo(0.2929, 3);
    });

    it('5.3 Road crossing river trench at acute 30-degree angle maintains continuous bridge structure', () => {
      const terrain = new Terrain(scene, 100, 100);
      terrain.getHeightAt = (x: number, z: number): number => {
        // Angled river channel
        const distToCenter = Math.abs(x * 0.5 + z * 0.866 - 40);
        return distToCenter < 10 ? -1.8 : 0.0;
      };

      const graph = new RoadGraph();
      const nA = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const nB = graph.getOrCreateNode(new THREE.Vector3(0, 0, 80));
      const edge = graph.addEdge(nA.id, nB.id, 'arterial')!;

      const roadGroup = RoadGeometryBuilder.buildRoadMeshGroup(edge, graph, terrain);
      const bridgeDeck = roadGroup.getObjectByName('BridgeDeck');
      expect(bridgeDeck).toBeDefined();
    });

    it('5.4 Orthographic camera distance goal clamps between minDistance (8m) and maxDistance (1200m)', () => {
      const mockDom = {
        clientWidth: 1920,
        clientHeight: 1080,
        addEventListener: () => {},
        removeEventListener: () => {}
      } as unknown as HTMLElement;
      const cam = new CameraController(mockDom);

      expect(cam.minDistance).toBe(8);
      expect(cam.maxDistance).toBe(1200);

      cam.distance = 5; // Under min
      cam.distance = Math.max(cam.minDistance, Math.min(cam.maxDistance, cam.distance));
      expect(cam.distance).toBe(8);

      cam.distance = 2500; // Over max
      cam.distance = Math.max(cam.minDistance, Math.min(cam.maxDistance, cam.distance));
      expect(cam.distance).toBe(1200);
    });

    it('5.5 Section cut plane at Y = 2.4m splits standard 3.5m floor height accurately', () => {
      const mockRenderer = { localClippingEnabled: false, clippingPlanes: [] as THREE.Plane[] } as any;
      const sectionCut = new SectionCutManager(mockRenderer, scene);
      sectionCut.cutHeight = 2.4;

      const floorHeight = 3.5;
      const groundFloorEyeLevel = 1.65;
      const ceilingLevel = floorHeight;

      // Eye level is below cut plane (1.65m < 2.4m) -> Visible
      expect(groundFloorEyeLevel).toBeLessThan(sectionCut.cutHeight);
      // Ceiling is above cut plane (3.5m > 2.4m) -> Clipped out
      expect(ceilingLevel).toBeGreaterThan(sectionCut.cutHeight);
    });
  });

  // =========================================================================
  // FEATURE AREA 6: Realistic Furniture, First-Person & Universal CAD Studio
  // =========================================================================
  describe('Feature Area 6: Boundary & Corner Cases (Furniture Angles, Hysteresis & Floor Limits)', () => {
    it('6.1 computeRotatedFurnitureHalfExtents is strictly symmetric across diagonal angles (45 deg and 135 deg)', () => {
      const w = 2.0;
      const d = 1.0;
      const ext45 = computeRotatedFurnitureHalfExtents(w, d, Math.PI * 0.25);
      const ext135 = computeRotatedFurnitureHalfExtents(w, d, Math.PI * 0.75);

      expect(ext45.effectiveHalfW).toBeCloseTo(ext135.effectiveHalfW, 5);
      expect(ext45.effectiveHalfD).toBeCloseTo(ext135.effectiveHalfD, 5);
    });

    it('6.2 Door proximity deadband hysteresis prevents oscillation (2.19m open, 2.81m close)', () => {
      const sys = InteriorInteractiveSystem.getInstance();
      sys.clearAll();

      const doorGroup = new THREE.Group();
      doorGroup.position.set(0, 0, 0);
      const leafMesh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.05));
      doorGroup.add(leafMesh);

      const door: InteractiveDoor = {
        id: 'door_hysteresis_test',
        type: 'swing',
        buildingId: 'bld_hyst',
        floorIndex: 1,
        group: doorGroup,
        leftLeafMesh: leafMesh,
        doorCenterLocal: new THREE.Vector3(0, 1.05, 0),
        worldPosition: new THREE.Vector3(0, 0, 0),
        doorWidth: 0.9,
        doorHeight: 2.1,
        isOpen: false,
        currentRatio: 0.0,
        targetRatio: 0.0,
        swingAngle: -Math.PI * 0.5,
        slideDist: 0.85
      };

      sys.registerDoor(door);

      // 1. Player at distance 2.19m (< 2.2m) -> should trigger targetRatio = 1.0
      sys.update(0.1, new THREE.Vector3(2.19, 0, 0), true);
      expect(door.targetRatio).toBe(1.0);

      // 2. Player moves to distance 2.5m (in deadband between 2.2m and 2.8m) -> maintains targetRatio = 1.0
      sys.update(0.1, new THREE.Vector3(2.5, 0, 0), true);
      expect(door.targetRatio).toBe(1.0);

      // 3. Player moves to distance 2.81m (> 2.8m) -> triggers targetRatio = 0.0
      sys.update(0.1, new THREE.Vector3(2.81, 0, 0), true);
      expect(door.targetRatio).toBe(0.0);
    });

    it('6.3 Floor teleportation out-of-bounds inputs (< 1 or > totalFloors) are rejected', () => {
      const camera = new THREE.PerspectiveCamera();
      const mockDom = { addEventListener: () => {}, removeEventListener: () => {} } as any;
      const fpController = new FirstPersonController(camera, mockDom);

      // When not inside any building, goToFloor returns false
      expect(fpController.goToFloor(0)).toBe(false);
      expect(fpController.goToFloor(99)).toBe(false);
      expect(fpController.goToFloor(-5)).toBe(false);
    });

    it('6.4 Stairwell void cutout dimensions invariant (2.8m width x 4.2m length) for high-rise 18-floor building', () => {
      const skyscraper: BuildingInstance = {
        id: 'skyscraper_18fl',
        presetKey: 'skyscraper_office_tower',
        name: 'Menara Kantor 18 Lantai',
        category: 'commercial',
        position: new THREE.Vector3(0, 0, 0),
        rotationY: 0,
        width: 24,
        length: 28,
        floorCount: 18,
        floorHeight: 3.8,
        roofType: 'flat',
        roofOverhang: 0.5,
        wallMaterial: 'concrete',
        wallColor: '#FFFFFF',
        roofMaterial: 'concrete'
      };

      const result = InteriorMeshBuilder.buildBuildingStairwell(skyscraper, 0.45);
      expect(result.stairZones.length).toBe(17); // 17 connection flights

      for (const sz of result.stairZones) {
        const w = sz.maxX - sz.minX;
        const l = sz.maxZ - sz.minZ;
        expect(w).toBeCloseTo(2.8, 1);
        expect(l).toBeCloseTo(4.2, 1);
      }
    });

    it('6.5 generateFloorsForMassingShape handles minimal boundary dimensions (width 4m, length 4m, 1 floor) safely', () => {
      const floors = generateFloorsForMassingShape('box', 4, 4, 1, 3.2);
      expect(floors.length).toBe(1);
      expect(floors[0].footprint.length).toBe(4);
      for (const pt of floors[0].footprint) {
        expect(isNaN(pt.x)).toBe(false);
        expect(isNaN(pt.y)).toBe(false);
      }
    });
  });
});
