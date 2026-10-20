import * as THREE from 'three';
import { CameraController } from './CameraController';
import { LightingSystem } from './LightingSystem';
import { Terrain } from '../../world/Terrain';
import { GridSystem } from '../../world/GridSystem';
import { WeatherSystem, WeatherType } from '../../world/WeatherSystem';
import { RaycastManager } from './RaycastManager';
import { RoadManager } from '../../roads/RoadManager';
import { RoadTool } from '../../tools/RoadTool';
import { BuildingManager } from '../../buildings/BuildingManager';
import { BuildingTool } from '../../tools/BuildingTool';
import { FootprintTool } from '../../tools/FootprintTool';
import { LotManager } from '../../zones/LotManager';
import { ZoneTool } from '../../tools/ZoneTool';
import { SolarAnalyzer } from '../../analysis/SolarAnalyzer';
import { VentilationAnalyzer } from '../../analysis/VentilationAnalyzer';
import { SectionCutManager } from '../../analysis/SectionCutManager';
import { FloorPlanAnnotationOverlay } from '../../analysis/FloorPlanAnnotationOverlay';
import { RunoffOverlay } from '../../analysis/RunoffOverlay';
import { CityScoreOverlay } from '../../analysis/CityScoreOverlay';
import { UnderlayPlanManager } from '../../world/UnderlayPlanManager';
import { MeasurementTool } from '../../analysis/MeasurementTool';
import { MissionManager } from '../../education/MissionManager';
import { CommandManager, ICommand } from '../commands/CommandManager';
import {
  RemoveBuildingCommand,
  RemoveRoadCommand,
  RemoveLotCommand,
} from '../commands/CityCommands';
import { LandscapeManager } from '../../world/LandscapeManager';
import { LandscapeTool } from '../../tools/LandscapeTool';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { updateWindTime } from '../../materials/WindShader';
import { GraphicsQuality, GRAPHICS_PRESETS } from './GraphicsPresets';
import { GpuDiagnostics, detectGpuDiagnostics } from './GpuDiagnostics';
import { PostProcessingManager } from './PostProcessingManager';
import { CitySerializer, CitySaveData } from '../../io/CitySerializer';
import { createMalioboroMapData } from '../../world/MalioboroPreset';
import { IndexedDBStorage } from '../../io/IndexedDBStorage';
import { ZONE_RULES } from '../../zones/ZoneTypes';
import { runoffSimulator } from '../../simulation/RunoffSimulator';
import { cityScoreAnalyzer } from '../../analysis/CityScoreAnalyzer';
import { BuildingGizmoManager } from './BuildingGizmoManager';
import { SpatialHighlighter } from './SpatialHighlighter';
import { SunPathVisualizer } from './SunPathVisualizer';
import { springAnimator, SpringAnimator } from './SpringAnimator';
import { FirstPersonController, FirstPersonState } from './FirstPersonController';
import { CinematicDroneController, DroneTourState } from './CinematicDroneController';
import { spatialAudio } from '../../audio/SpatialAudioSystem';
import { acousticAnalyzer } from '../../analysis/AcousticAnalyzer';

export type MaquetteDataLensType = 'none' | 'kdb_gsb' | 'solar_vent' | 'runoff' | 'walkability' | 'acoustic';

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

export class Engine {
  public postProcessingManager: PostProcessingManager;
  public currentQuality: GraphicsQuality = 'ultra';
  private gpuDiagnostics: GpuDiagnostics | null = null;
  public container: HTMLElement;
  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public cameraController: CameraController;
  public lightingSystem: LightingSystem;
  public terrain: Terrain;
  public gridSystem: GridSystem;
  public weatherSystem: WeatherSystem;
  public raycastManager: RaycastManager;
  public roadManager: RoadManager;
  public roadTool: RoadTool;
  public buildingManager: BuildingManager;
  public buildingTool: BuildingTool;
  public footprintTool: FootprintTool;
  public lotManager: LotManager;
  public zoneTool: ZoneTool;
  public landscapeManager: LandscapeManager;
  public landscapeTool: LandscapeTool;
  public solarAnalyzer: SolarAnalyzer;
  public ventilationAnalyzer: VentilationAnalyzer;
  public sectionCutManager: SectionCutManager;
  public floorPlanAnnotationOverlay: FloorPlanAnnotationOverlay;
  public runoffOverlay: RunoffOverlay;
  public cityScoreOverlay: CityScoreOverlay;
  public underlayPlanManager: UnderlayPlanManager;
  public measurementTool: MeasurementTool;
  public missionManager: MissionManager;
  public commandManager: CommandManager;

  // Interactive 3D Handles, Highlights & Celestial Visualizer
  public buildingGizmoManager: BuildingGizmoManager;
  public spatialHighlighter: SpatialHighlighter;
  public sunPathVisualizer: SunPathVisualizer;
  public springAnimator: SpringAnimator = springAnimator;

  // Human-Scale Walkthrough & Cinematic Drone Tour
  public firstPersonController: FirstPersonController;
  public cinematicDroneController: CinematicDroneController;
  public currentCameraMode: 'orbit' | 'first_person' | 'cinematic_drone' = 'orbit';
  public onCameraModeChanged?: (mode: 'orbit' | 'first_person' | 'cinematic_drone') => void;

  public activeToolName: string = 'select';

  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock;

  // Performance metrics
  private frameCount: number = 0;
  private lastFpsUpdateTime: number = 0;
  public currentFps: number = 60;
  public onFpsUpdate?: (fps: number) => void;
  public onRoadStatsChanged?: (lengthKm: number) => void;
  public onBuildingStatsChanged?: (count: number, areaM2: number) => void;
  public onSelectionChanged?: () => void;
  public onHistoryStateChanged?: (canUndo: boolean, canRedo: boolean) => void;

  // Architectural Maquette Data Lens Mode
  public currentMaquetteLens: MaquetteDataLensType = 'none';
  private maquetteOriginalMaterials: Map<THREE.Mesh, THREE.Material | THREE.Material[]> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.clock = new THREE.Clock();

    this.renderer = new THREE.WebGLRenderer({
      powerPreference: 'high-performance',
      antialias: true,
      stencil: false,
      depth: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);

    // Systems & Diagnostics
    this.postProcessingManager = new PostProcessingManager();
    this.gpuDiagnostics = detectGpuDiagnostics(
      this.renderer.getContext(),
      this.renderer.capabilities.getMaxAnisotropy()
    );

    this.cameraController = new CameraController(this.renderer.domElement);
    this.lightingSystem = new LightingSystem(this.scene);
    this.lightingSystem.initEnvironment(this.renderer);
    this.terrain = new Terrain(this.scene, 1600);
    this.gridSystem = new GridSystem(this.scene, 1600, 1);
    this.weatherSystem = new WeatherSystem(this.scene);
    this.raycastManager = new RaycastManager(
      this.renderer.domElement,
      this.cameraController.activeCamera,
      this.gridSystem,
      this.scene
    );

    // Roads
    this.roadManager = new RoadManager(this.scene);
    this.roadTool = new RoadTool(this.roadManager, this.raycastManager, this.scene);

    this.roadManager.onGraphChanged = (totalKm) => {
      if (this.onRoadStatsChanged) {
        this.onRoadStatsChanged(totalKm);
      }
    };

    // Buildings
    this.buildingManager = new BuildingManager(this.scene);
    this.buildingManager.setRaycastManager(this.raycastManager);
    this.buildingTool = new BuildingTool(this.buildingManager, this.raycastManager, this.scene, this);
    this.buildingTool.setVisible(false);
    this.footprintTool = new FootprintTool(this.buildingManager, this.raycastManager, this.scene, this);

    // Lots & Zones
    this.lotManager = new LotManager(this.scene, this.buildingManager);
    this.zoneTool = new ZoneTool(this.lotManager, this.raycastManager, this.scene);
    this.zoneTool.setVisible(false);

    // Landscape & Green Area Management
    this.landscapeManager = new LandscapeManager(this.scene);
    this.landscapeTool = new LandscapeTool(this.landscapeManager, this.raycastManager, this.scene, this);
    this.landscapeTool.setVisible(false);

    // Wire dependencies: LotManager needs roadManager for GSB and landscapeManager for KDH
    this.lotManager.setDependencies(this.roadManager, this.landscapeManager);
    this.landscapeManager.onLandscapeUpdated = () => {
      this.lotManager.evaluateAllLots();
      this.missionManager.evaluate();
    };

    // Analysis Tools
    this.solarAnalyzer = new SolarAnalyzer(this.buildingManager, this.scene);
    this.ventilationAnalyzer = new VentilationAnalyzer(this.buildingManager, this.scene, this.landscapeManager);
    this.sectionCutManager = new SectionCutManager(this.renderer);
    this.floorPlanAnnotationOverlay = new FloorPlanAnnotationOverlay(this.scene, this.buildingManager);
    this.runoffOverlay = new RunoffOverlay(this.scene);
    this.cityScoreOverlay = new CityScoreOverlay(this.scene);
    this.underlayPlanManager = new UnderlayPlanManager(this.scene);
    this.measurementTool = new MeasurementTool(this.raycastManager, this.scene);

    // Interactive 3D Spatial Highlighter, Sun Path & Building Handles
    this.spatialHighlighter = new SpatialHighlighter(this.scene, this);
    this.sunPathVisualizer = new SunPathVisualizer(this.scene);
    this.sunPathVisualizer.setVisible(true);
    this.buildingGizmoManager = new BuildingGizmoManager(
      this,
      this.scene,
      this.cameraController.activeCamera,
      this.renderer.domElement
    );
    this.sectionCutManager.setContext(
      this.scene,
      this.cameraController.activeCamera,
      this.renderer.domElement
    );

    // Missions & Education
    this.missionManager = new MissionManager(this);
    this.commandManager = new CommandManager();
    this.commandManager.onStateChanged = (canUndo, canRedo) => {
      if (this.onHistoryStateChanged) {
        this.onHistoryStateChanged(canUndo, canRedo);
      }
    };

    this.roadManager.onGraphChanged = (totalKm) => {
      if (this.onRoadStatsChanged) {
        this.onRoadStatsChanged(totalKm);
      }
      this.missionManager.evaluate();
    };

    this.buildingManager.onStatsChanged = (count, areaM2) => {
      if (this.onBuildingStatsChanged) {
        this.onBuildingStatsChanged(count, areaM2);
      }
      this.lotManager.evaluateAllLots();
      this.missionManager.evaluate();
      spatialAudio.rebuildZones(this.buildingManager, this.roadManager, this.landscapeManager);
    };
    this.lotManager.onLotsUpdated = () => {
      this.missionManager.evaluate();
    };
    this.buildingManager.onSelectionChanged = () => {
      if (this.onSelectionChanged) this.onSelectionChanged();
    };
    this.lotManager.onSelectionChanged = () => {
      if (this.onSelectionChanged) this.onSelectionChanged();
    };

    // Human-Scale Walkthrough & Drone Tour Controllers
    this.firstPersonController = new FirstPersonController(
      this.cameraController.camera,
      this.renderer.domElement,
      this.buildingManager,
      this.terrain
    );
    this.firstPersonController.onExit = () => {
      this.setCameraMode('orbit');
    };

    this.cinematicDroneController = new CinematicDroneController(
      this.cameraController.camera,
      this.renderer,
      this.buildingManager
    );
    this.cinematicDroneController.onTimeOfDayInterpolated = (hour) => {
      this.setTimeOfDay(hour);
    };

    // Initial spatial sound zones
    spatialAudio.rebuildZones(this.buildingManager, this.roadManager, this.landscapeManager);

    // User input listeners
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    window.addEventListener('keydown', this.onWindowKeyDown);
    window.addEventListener('resize', this.handleResize);

    // WebGL Context Loss Recovery
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost, false);
    this.renderer.domElement.addEventListener('webglcontextrestored', this.onContextRestored, false);
  }

  private onContextLost = (e: Event): void => {
    e.preventDefault();
    console.warn('[Engine] WebGL context lost. Pausing render loop and preserving city state...');
    this.stop();
  };

  private onContextRestored = (): void => {
    console.info('[Engine] WebGL context restored. Rebuilding GPU resources and city meshes...');
    this.handleContextRestored();
  };

  public handleContextRestored(): void {
    if (this.container) {
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    this.renderer.shadowMap.needsUpdate = true;

    // 1. Reset MaterialLibrary caches
    MaterialLibrary.getInstance().reset();

    // 2. Rebuild lighting
    this.lightingSystem.dispose();
    this.lightingSystem = new LightingSystem(this.scene);

    // 3. Rebuild terrain & grid
    this.terrain.dispose();
    this.terrain = new Terrain(this.scene, 1600);

    this.gridSystem.dispose();
    this.gridSystem = new GridSystem(this.scene, 1600, 1);

    // 4. Rebuild road meshes
    this.roadManager.rebuildAll();

    // 5. Rebuild building meshes & cache
    this.buildingManager.rebuildAll();

    // 6. Rebuild lot boundary meshes
    this.lotManager.rebuildAll();

    // 7. Rebuild landscape vegetation
    this.landscapeManager.rebuildAll();

    // 8. Re-wire spatial hash grid
    this.buildingManager.setRaycastManager(this.raycastManager);

    // 9. Resume render loop
    this.start();
  }

  private onCanvasClick = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    if (this.currentCameraMode !== 'orbit') return;
    this.raycastManager.updateMousePosition(e.clientX, e.clientY);

    if (this.activeToolName === 'road') {
      if (this.raycastManager.isHoveringGround) {
        this.roadTool.handleClick(this.raycastManager.snappedPoint);
      }
    } else if (this.activeToolName === 'build') {
      if (this.footprintTool.isDrawing) {
        this.footprintTool.handleClick(this.raycastManager.snappedPoint);
      } else if (this.raycastManager.isHoveringGround) {
        this.buildingTool.handleClick(this.raycastManager.snappedPoint);
        this.lotManager.evaluateAllLots();
      }
    } else if (this.activeToolName === 'zone') {
      if (this.raycastManager.isHoveringGround) {
        this.zoneTool.handleClick(this.raycastManager.snappedPoint);
      }
    } else if (this.activeToolName === 'nature' || this.activeToolName === 'landscape') {
      if (this.raycastManager.isHoveringGround) {
        this.landscapeTool.handleClick(this.raycastManager.snappedPoint);
      }
    } else if (this.activeToolName === 'analyze') {
      if (this.measurementTool.isActive && this.raycastManager.isHoveringGround) {
        this.measurementTool.handleClick(this.raycastManager.snappedPoint);
      }
    } else if (this.activeToolName === 'select') {
      // 1. Raycast Buildings
      const bldHits = this.raycastManager.raycastObjects([this.buildingManager.masterGroup]);
      if (bldHits.length > 0) {
        let curr: THREE.Object3D | null = bldHits[0].object;
        let bldId: string | null = null;
        while (curr && curr !== this.buildingManager.masterGroup) {
          if (curr.userData && curr.userData.buildingId) {
            bldId = curr.userData.buildingId;
            break;
          }
          curr = curr.parent;
        }

        if (bldId) {
          this.roadManager.selectEdge(null);
          this.lotManager.selectLot(null);
          this.buildingManager.selectBuilding(bldId);
          if (this.onSelectionChanged) this.onSelectionChanged();
          return;
        }
      }

      // 2. Raycast Lots
      const lotHits = this.raycastManager.raycastObjects([this.lotManager.masterGroup]);
      if (lotHits.length > 0) {
        let curr: THREE.Object3D | null = lotHits[0].object;
        let lotId: string | null = null;
        while (curr && curr !== this.lotManager.masterGroup) {
          if (curr.userData && curr.userData.lotId) {
            lotId = curr.userData.lotId;
            break;
          }
          curr = curr.parent;
        }

        if (lotId) {
          this.roadManager.selectEdge(null);
          this.buildingManager.selectBuilding(null);
          this.lotManager.selectLot(lotId);
          if (this.onSelectionChanged) this.onSelectionChanged();
          return;
        }
      }

      // 3. Raycast Roads
      const roadHits = this.raycastManager.raycastObjects([this.roadManager.masterGroup]);
      if (roadHits.length > 0) {
        let curr: THREE.Object3D | null = roadHits[0].object;
        let edgeId: string | null = null;
        while (curr && curr !== this.roadManager.masterGroup) {
          if (curr.userData && curr.userData.edgeId) {
            edgeId = curr.userData.edgeId;
            break;
          }
          curr = curr.parent;
        }

        if (edgeId) {
          this.buildingManager.selectBuilding(null);
          this.lotManager.selectLot(null);
          this.roadManager.selectEdge(edgeId);
          if (this.onSelectionChanged) this.onSelectionChanged();
          return;
        }
      }

      // Deselect all
      this.roadManager.selectEdge(null);
      this.buildingManager.selectBuilding(null);
      this.lotManager.selectLot(null);
      if (this.onSelectionChanged) this.onSelectionChanged();
    }
  };

  private onWindowKeyDown = (e: KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
      e.preventDefault();
      if (e.shiftKey) {
        this.commandManager.redo();
      } else {
        this.commandManager.undo();
      }
      return;
    } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) {
      e.preventDefault();
      this.commandManager.redo();
      return;
    }

    if (e.code === 'KeyR' && this.activeToolName === 'build') {
      this.buildingTool.rotate();
    } else if (e.code === 'Escape') {
      if (this.roadTool.isDrawing) {
        this.roadTool.cancelDrawing();
      } else if (this.footprintTool.isDrawing) {
        this.footprintTool.cancelDrawing();
      } else if (this.roadManager.selectedEdgeId) {
        this.roadManager.selectEdge(null);
        if (this.onSelectionChanged) this.onSelectionChanged();
      } else if (this.buildingManager.selectedBuildingId) {
        this.buildingManager.selectBuilding(null);
        if (this.onSelectionChanged) this.onSelectionChanged();
      } else if (this.lotManager.selectedLotId) {
        this.lotManager.selectLot(null);
        if (this.onSelectionChanged) this.onSelectionChanged();
      }
    } else if (e.code === 'Delete' || e.code === 'Backspace') {
      if (this.roadManager.selectedEdgeId) {
        const edgeId = this.roadManager.selectedEdgeId;
        this.commandManager.execute(new RemoveRoadCommand(this, edgeId));
        this.roadManager.selectEdge(null);
        if (this.onSelectionChanged) this.onSelectionChanged();
      } else if (this.buildingManager.selectedBuildingId) {
        const bld = this.buildingManager.buildings.get(this.buildingManager.selectedBuildingId);
        if (bld) {
          this.commandManager.execute(new RemoveBuildingCommand(this, bld));
          this.buildingManager.selectBuilding(null);
          if (this.onSelectionChanged) this.onSelectionChanged();
        }
      } else if (this.lotManager.selectedLotId) {
        const lot = this.lotManager.lots.get(this.lotManager.selectedLotId);
        if (lot) {
          this.commandManager.execute(new RemoveLotCommand(this, lot));
          this.lotManager.selectLot(null);
          if (this.onSelectionChanged) this.onSelectionChanged();
        }
      }
    }
  };

  public executeCommand(command: ICommand): void {
    this.commandManager.execute(command);
  }

  public undo(): boolean {
    const success = this.commandManager.undo();
    if (success && this.onSelectionChanged) {
      this.onSelectionChanged();
    }
    return success;
  }

  public redo(): boolean {
    const success = this.commandManager.redo();
    if (success && this.onSelectionChanged) {
      this.onSelectionChanged();
    }
    return success;
  }

  public setActiveTool(toolName: string): void {
    this.activeToolName = toolName;

    if (toolName === 'road') {
      this.buildingTool.setVisible(false);
      this.zoneTool.setVisible(false);
      this.landscapeTool.setVisible(false);
    } else if (toolName === 'build') {
      this.roadTool.cancelDrawing();
      this.buildingTool.setVisible(true);
      this.zoneTool.setVisible(false);
      this.landscapeTool.setVisible(false);
    } else if (toolName === 'zone') {
      this.roadTool.cancelDrawing();
      this.buildingTool.setVisible(false);
      this.zoneTool.setVisible(true);
      this.landscapeTool.setVisible(false);
    } else if (toolName === 'nature' || toolName === 'landscape') {
      this.roadTool.cancelDrawing();
      this.buildingTool.setVisible(false);
      this.zoneTool.setVisible(false);
      this.landscapeTool.setVisible(true);
    } else {
      this.roadTool.cancelDrawing();
      this.buildingTool.setVisible(false);
      this.zoneTool.setVisible(false);
      this.landscapeTool.setVisible(false);
    }

    if (toolName !== 'select') {
      this.roadManager.selectEdge(null);
      this.buildingManager.selectBuilding(null);
      this.lotManager.selectLot(null);
      if (this.onSelectionChanged) this.onSelectionChanged();
    }
  }

  public setCameraMode(mode: 'orbit' | 'first_person' | 'cinematic_drone'): void {
    if (this.currentCameraMode === mode) return;

    // Teardown previous mode
    if (this.currentCameraMode === 'first_person') {
      this.cameraController.target.copy(this.firstPersonController.position);
      this.cameraController.target.y = 0;
      this.cameraController.focusAt(this.cameraController.target);
      this.cameraController.enabled = true;
      this.firstPersonController.exit();
    } else if (this.currentCameraMode === 'cinematic_drone') {
      this.cinematicDroneController.stopTour();
      this.cameraController.setDroneMode(false);
    }

    this.currentCameraMode = mode;

    // Setup new mode
    if (mode === 'first_person') {
      const startPos = this.cameraController.target.clone();
      this.cameraController.enabled = false;
      this.firstPersonController.enter(startPos, this.cameraController.azimuth + Math.PI);
    } else if (mode === 'cinematic_drone') {
      this.cameraController.setDroneMode(true);
    } else {
      // Orbit: maintain smooth vantage without snapping back to (0,0,0)
      if (this.cameraController.isDroneMode) {
        this.cameraController.setDroneMode(false);
      }
      if (this.cameraController.isWalkMode) {
        this.cameraController.setWalkMode(false);
      }
    }

    if (this.onCameraModeChanged) {
      this.onCameraModeChanged(this.currentCameraMode);
    }
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    const deltaTime = Math.min(this.clock.getDelta(), 0.1);
    const now = performance.now();

    // FPS
    this.frameCount++;
    if (now - this.lastFpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdateTime));
      this.frameCount = 0;
      this.lastFpsUpdateTime = now;
      if (this.onFpsUpdate) this.onFpsUpdate(this.currentFps);
    }

    // Camera, Audio & Raycast
    if (this.currentCameraMode === 'first_person') {
      this.firstPersonController.update(deltaTime);
      spatialAudio.update(
        this.cameraController.camera.position,
        this.weatherSystem.currentWeather,
        this.firstPersonController.isUnderRoof
      );
    } else if (this.currentCameraMode === 'cinematic_drone') {
      if (this.cinematicDroneController.isActive) {
        this.cinematicDroneController.update(deltaTime);
      } else {
        this.cameraController.update(deltaTime);
      }
      spatialAudio.update(
        this.cameraController.camera.position,
        this.weatherSystem.currentWeather,
        false
      );
    } else {
      this.cameraController.update(deltaTime);
      spatialAudio.update(
        this.cameraController.camera.position,
        this.weatherSystem.currentWeather,
        false
      );
    }
    this.raycastManager.setCamera(this.cameraController.activeCamera);
    this.raycastManager.update();

    // Tools
    if (this.activeToolName === 'road') {
      this.roadTool.update();
    } else if (this.activeToolName === 'build') {
      if (this.footprintTool.isDrawing) {
        this.footprintTool.update();
      } else {
        this.buildingTool.update();
      }
    } else if (this.activeToolName === 'zone') {
      this.zoneTool.update();
    } else if (this.activeToolName === 'nature' || this.activeToolName === 'landscape') {
      this.landscapeTool.update();
    } else if (this.activeToolName === 'analyze') {
      if (this.measurementTool.isActive) {
        this.measurementTool.update();
      }
    }

    // Ventilation simulation particles
    if (this.ventilationAnalyzer.isWindActive) {
      this.ventilationAnalyzer.update(deltaTime);
    }

    // Spring animations & Interactive 3D Handles
    this.springAnimator.update();
    this.buildingGizmoManager.setCamera(this.cameraController.activeCamera);
    this.buildingGizmoManager.update();
    this.sunPathVisualizer.updateTime(this.lightingSystem.currentHour, this.lightingSystem);

    if (this.sectionCutManager.currentMode === 'floor_plan') {
      this.sectionCutManager.updateCenter(this.cameraController.target);
    }

    // 3D Selection & Hover Outline Ring (FASE 2)
    if (this.activeToolName === 'select' && !this.buildingGizmoManager.liveGizmoTelemetry.active) {
      const bldHits = this.raycastManager.raycastObjects([this.buildingManager.masterGroup]);
      if (bldHits.length > 0) {
        let curr: THREE.Object3D | null = bldHits[0].object;
        while (curr && curr.parent !== this.buildingManager.masterGroup) {
          curr = curr.parent;
        }
        if (curr) {
          this.spatialHighlighter.showHoverAt(curr.position, 4.0, 0x007aff);
        }
      } else {
        this.spatialHighlighter.hideHover();
      }
    } else {
      this.spatialHighlighter.hideHover();
    }

    // Lighting, Weather & Vegetation Wind
    this.lightingSystem.updateCenter(this.cameraController.target);
    this.weatherSystem.update(deltaTime, this.cameraController.camera.position);
    updateWindTime(deltaTime);

    // Render: Ultra uses PostProcessingManager with SSAO + Bloom + Output Tone Mapping
    if (this.currentQuality === 'ultra' && this.postProcessingManager.isEnabled()) {
      this.postProcessingManager.setCamera(this.cameraController.activeCamera);
      this.postProcessingManager.render();
    } else {
      this.renderer.render(this.scene, this.cameraController.activeCamera);
    }
  };

  public setTimeOfDay(hour: number, dayOfYear: number = 172): void {
    this.lightingSystem.setTime(hour, dayOfYear, this.cameraController.target);
  }

  public setWeather(weather: WeatherType): void {
    this.weatherSystem.setWeather(weather);
  }

  public setGridSnap(step: number): void {
    this.gridSystem.setSnapStep(step);
  }

  public toggleGrid(visible: boolean): void {
    this.gridSystem.setVisible(visible);
  }

  public setGraphicsQuality(level: GraphicsQuality): void {
    this.currentQuality = level;
    const config = GRAPHICS_PRESETS[level] || GRAPHICS_PRESETS.medium;

    this.lightingSystem.setGraphicsQuality(level);
    this.weatherSystem.setGraphicsQuality(level);
    this.commandManager.setMaxHistory(config.maxUndoHistory);

    // Dynamic Anisotropic Filtering
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    const targetAniso = config.anisotropy === 'max' ? maxAniso : config.anisotropy;
    MaterialLibrary.getInstance().setMaxAnisotropy(targetAniso);

    if (level === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = config.shadowType;
      const pr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, config.pixelRatio) : 1;
      this.renderer.setPixelRatio(pr);
    }
    this.renderer.shadowMap.needsUpdate = true;

    // Post-Processing pipeline lifecycle & memory management
    if (config.postProcessing) {
      const w = this.container?.clientWidth || 1024;
      const h = this.container?.clientHeight || 768;
      const success = this.postProcessingManager.init(
        this.renderer,
        this.scene,
        this.cameraController.activeCamera,
        w,
        h
      );
      this.postProcessingManager.setEnabled(success);
    } else {
      this.postProcessingManager.dispose();
    }
  }

  public getPerformanceStats(): PerformanceStats {
    return {
      fps: this.currentFps,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0,
    };
  }

  /**
   * Resets the entire world without memory leaks:
   * 1. Clears CommandManager (undoStack & redoStack).
   * 2. Removes and disposes all building, road, intersection, lot, and landscape meshes.
   * 3. Resets UI selection and spatial hash grid.
   * 4. Cancels ongoing tools and measurement lines.
   */
  public clearCurrentWorld(): void {
    // 1. Clear Command history
    this.commandManager.clear();

    // 2. Deselect active entity
    this.roadManager.selectEdge(null);
    this.buildingManager.selectBuilding(null);
    this.lotManager.selectLot(null);

    // 3. Clear and dispose managers
    this.buildingManager.clearAll();
    this.roadManager.clearAll();
    this.lotManager.clearAll();
    this.landscapeManager.clearAll();

    // 4. Reset Raycast & Spatial Hash Grid
    this.raycastManager.clearSpatialGrid();

    // 5. Cancel active drawing tools
    this.roadTool.cancelDrawing();
    this.footprintTool.cancelDrawing();
    this.measurementTool.clearAll();

    // 6. Reset Walk Mode if enabled
    if (this.cameraController.isWalkMode) {
      this.cameraController.setWalkMode(false);
    }

    // 7. Re-evaluate mission and metrics
    if (this.onSelectionChanged) this.onSelectionChanged();
    if (this.onBuildingStatsChanged) this.onBuildingStatsChanged(0, 0);
    if (this.onRoadStatsChanged) this.onRoadStatsChanged(0);
    this.missionManager.evaluate();
  }

  /**
   * Atomically loads a serialized city state into the engine
   */
  public loadWorldState(data: CitySaveData): boolean {
    this.clearCurrentWorld();
    const res = CitySerializer.deserialize(this, data);
    if (res.success) {
      if (this.onBuildingStatsChanged) {
        let totalFootprint = 0;
        for (const b of this.buildingManager.buildings.values()) {
          totalFootprint += BuildingManager.getBuildingGroundArea(b);
        }
        this.onBuildingStatsChanged(this.buildingManager.buildings.size, totalFootprint);
      }
      if (this.onRoadStatsChanged) {
        this.onRoadStatsChanged(this.roadManager.graph.getTotalLengthKm());
      }
      if (this.onSelectionChanged) this.onSelectionChanged();
      this.commandManager.clear();
      return true;
    }
    console.error('[Engine] Failed to load world state:', res.error);
    return false;
  }

  /**
   * High-level map loader: switches between empty new map, Malioboro preset, or saved map
   */
  public async loadMap(
    mapType: 'empty' | 'malioboro' | 'saved',
    mapId?: string,
    customData?: CitySaveData
  ): Promise<boolean> {
    if (mapType === 'empty') {
      this.clearCurrentWorld();
      this.setTimeOfDay(9.0, 172);
      this.setWeather('clear');
      this.cameraController.resetCamera();
      this.cameraController.focusAt(new THREE.Vector3(0, 0, 0), 75);
      return true;
    }

    if (mapType === 'malioboro') {
      const data = createMalioboroMapData();
      const success = this.loadWorldState(data);
      if (success) {
        // Position camera in bird's-eye overview over Malioboro corridor
        this.cameraController.focusAt(new THREE.Vector3(0, 0, 0), 160);
        this.setTimeOfDay(16.25, 172); // 16:15 WIB golden hour shadows
        this.buildingManager.selectBuilding('bld_joglo_yogyakarta');
        if (this.onSelectionChanged) this.onSelectionChanged();
      }
      return success;
    }

    if (mapType === 'saved') {
      let data: CitySaveData | null = customData || null;
      if (!data && mapId) {
        data = await IndexedDBStorage.loadMapById(mapId);
      }
      if (!data) {
        console.error(`[Engine] Could not find saved map with id: ${mapId}`);
        return false;
      }
      const success = this.loadWorldState(data);
      if (success) {
        this.cameraController.focusAt(new THREE.Vector3(0, 0, 0), 90);
      }
      return success;
    }

    return false;
  }

  /**
   * Highlights a specific violation in 3D for 2 seconds with a pulsing red/warning box and smooth camera focus
   */
  public highlightViolation(target: THREE.Object3D | THREE.Vector3, boxSize?: THREE.Vector3, durationMs: number = 2000): void {
    let focusPos: THREE.Vector3;
    let helper: THREE.BoxHelper | THREE.Mesh;

    if ((target as THREE.Object3D).isObject3D) {
      const obj = target as THREE.Object3D;
      focusPos = new THREE.Vector3();
      obj.getWorldPosition(focusPos);
      helper = new THREE.BoxHelper(obj, 0xff3b30);
      (helper.material as THREE.Material).transparent = true;
      (helper.material as THREE.Material).depthTest = false;
    } else {
      focusPos = (target as THREE.Vector3).clone();
      const size = boxSize || new THREE.Vector3(6, 4, 6);
      const geom = new THREE.BoxGeometry(size.x, size.y, size.z);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        wireframe: true,
        transparent: true,
        opacity: 0.9,
        depthTest: false,
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(focusPos);
      mesh.position.y += size.y / 2;
      helper = mesh;
    }

    this.scene.add(helper);
    this.cameraController.focusAt(focusPos, 24);

    const startTime = performance.now();
    const pulseInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      if (elapsed > durationMs) {
        clearInterval(pulseInterval);
        this.scene.remove(helper);
        if ((helper as THREE.BoxHelper).isLineSegments) {
          (helper as THREE.BoxHelper).geometry?.dispose();
          ((helper as THREE.BoxHelper).material as THREE.Material)?.dispose();
        } else if ((helper as THREE.Mesh).isMesh) {
          (helper as THREE.Mesh).geometry?.dispose();
          ((helper as THREE.Mesh).material as THREE.Material)?.dispose();
        }
      } else {
        const pulse = 0.5 + 0.5 * Math.sin((elapsed / 200) * Math.PI);
        const mat = (helper as any).material;
        if (mat) {
          mat.opacity = 0.4 + 0.6 * pulse;
        }
      }
    }, 30);
  }

  public handleResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.cameraController.handleResize();
    this.postProcessingManager.setSize(width, height);
  };

  /**
   * SimCity Architectural Data Lens / Maquette Mode:
   * Overrides scene materials with architectural matte white maquette and dynamically
   * color-codes evaluated buildings and lots based on regulatory compliance, microclimate,
   * flood runoff, or 400m walkability.
   * Switching back to 'none' instantly restores authentic PBR materials in 0ms.
   */
  public setMaquetteDataLens(lens: MaquetteDataLensType): void {
    // 1. Instantly restore original materials (0ms) if already in maquette mode
    if (this.maquetteOriginalMaterials.size > 0) {
      for (const [mesh, origMat] of this.maquetteOriginalMaterials.entries()) {
        mesh.material = origMat;
      }
      this.maquetteOriginalMaterials.clear();
    }

    this.currentMaquetteLens = lens;
    if (lens === 'none') return;

    const mq = MaterialLibrary.getInstance().maquetteMaterials;

    // 2. Override Terrain with matte off-white
    if (this.terrain && this.terrain.mesh) {
      this.maquetteOriginalMaterials.set(this.terrain.mesh, this.terrain.mesh.material);
      this.terrain.mesh.material = mq.terrain;
    }

    // 3. Override Road Network with neutral off-white road matte
    if (this.roadManager && this.roadManager.masterGroup) {
      this.roadManager.masterGroup.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (!this.maquetteOriginalMaterials.has(mesh)) {
            this.maquetteOriginalMaterials.set(mesh, mesh.material);
          }
          mesh.material = mq.road;
        }
      });
    }

    // 4. Evaluate Buildings dynamically based on the selected Data Lens
    let cityScoreCache: any = null;
    if (lens === 'walkability') {
      cityScoreCache = cityScoreAnalyzer.evaluateCity(
        this.buildingManager,
        this.roadManager,
        this.landscapeManager,
        this.lotManager
      );
    }

    for (const bld of this.buildingManager.buildings.values()) {
      let targetMat = mq.neutral;

      if (lens === 'kdb_gsb') {
        const lot = this.lotManager.getLotForBuilding(bld.id);
        if (lot) {
          if (lot.violations.length > 0) {
            targetMat = mq.bad;
          } else if (lot.metrics.kdbPercent > (ZONE_RULES[lot.zone]?.maxKDB * 0.85)) {
            targetMat = mq.warn;
          } else {
            targetMat = mq.good;
          }
        }
      } else if (lens === 'solar_vent') {
        const report = this.ventilationAnalyzer.analyzeBuilding(bld.id);
        if (report) {
          if (report.hasCrossVentilation && report.comfortRating === 'Nyaman Alami') {
            targetMat = mq.good;
          } else if (report.hasCrossVentilation || report.overhangMeters >= 1.0) {
            targetMat = mq.warn;
          } else {
            targetMat = mq.bad;
          }
        }
      } else if (lens === 'runoff') {
        const lot = this.lotManager.getLotForBuilding(bld.id);
        if (lot) {
          const flood = runoffSimulator.evaluateLotFlooding(lot, this.landscapeManager, 60.0, this.lotManager);
          if (flood.riskLevel === 'safe') {
            targetMat = mq.good;
          } else if (flood.riskLevel === 'warning') {
            targetMat = mq.warn;
          } else {
            targetMat = mq.bad;
          }
        }
      } else if (lens === 'walkability') {
        if (cityScoreCache?.isolatedBuildingIds?.includes(bld.id)) {
          targetMat = mq.bad;
        } else {
          let isWalkable = false;
          for (const fac of (cityScoreCache?.facilities || [])) {
            const dist = this.roadManager.graph.getNetworkWalkDistance(fac.position, bld.position, 400);
            if (dist !== null && dist <= 400) {
              isWalkable = true;
              break;
            }
          }
          targetMat = isWalkable ? mq.good : mq.warn;
        }
      } else if (lens === 'acoustic') {
        const report = acousticAnalyzer.evaluateBuilding(
          bld,
          this.roadManager,
          this.landscapeManager,
          this.buildingManager,
          this.lotManager
        );
        if (report.status === 'calm') {
          targetMat = mq.good;
        } else if (report.status === 'moderate') {
          targetMat = mq.warn;
        } else {
          targetMat = mq.bad;
        }
      }

      // Apply material to all meshes in this building group
      const grp = this.buildingManager.getBuildingGroup(bld.id);
      if (grp) {
        grp.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            if (!this.maquetteOriginalMaterials.has(mesh)) {
              this.maquetteOriginalMaterials.set(mesh, mesh.material);
            }
            mesh.material = targetMat;
          }
        });
      }
    }
  }

  /**
   * Returns active GPU diagnostic telemetry (Renderer, Vendor, Discrete GPU, Max Anisotropy, VRAM/Texture Tier)
   */
  public getGpuInfo(): GpuDiagnostics {
    if (!this.gpuDiagnostics) {
      this.gpuDiagnostics = detectGpuDiagnostics(
        this.renderer.getContext(),
        this.renderer.capabilities.getMaxAnisotropy()
      );
    }
    return this.gpuDiagnostics;
  }

  public dispose(): void {
    this.stop();
    this.setMaquetteDataLens('none');
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    this.renderer.domElement.removeEventListener('webglcontextlost', this.onContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.onContextRestored);
    window.removeEventListener('keydown', this.onWindowKeyDown);
    window.removeEventListener('resize', this.handleResize);

    this.postProcessingManager.dispose();
    this.measurementTool.dispose();
    this.floorPlanAnnotationOverlay.dispose();
    this.runoffOverlay.dispose();
    this.cityScoreOverlay.dispose();
    this.underlayPlanManager.dispose();
    this.sectionCutManager.dispose();
    this.ventilationAnalyzer.dispose();
    this.solarAnalyzer.dispose();
    this.landscapeTool.dispose();
    this.landscapeManager.dispose();
    this.zoneTool.dispose();
    this.lotManager.dispose();
    this.footprintTool.dispose();
    this.buildingTool.dispose();
    this.buildingManager.dispose();
    this.roadTool.dispose();
    this.roadManager.dispose();
    this.raycastManager.dispose();
    this.gridSystem.dispose();
    this.terrain.dispose();
    this.lightingSystem.dispose();
    this.weatherSystem.dispose();
    this.cameraController.dispose();
    this.buildingGizmoManager.dispose();
    this.spatialHighlighter.dispose();
    this.sunPathVisualizer.dispose();
    this.springAnimator.clear();

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
