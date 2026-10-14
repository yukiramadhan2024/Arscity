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

export interface PerformanceStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
}

export class Engine {
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
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7fb8f5);

    // Systems
    this.cameraController = new CameraController(this.renderer.domElement);
    this.lightingSystem = new LightingSystem(this.scene);
    this.terrain = new Terrain(this.scene, 512);
    this.gridSystem = new GridSystem(this.scene, 512, 1);
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
    this.ventilationAnalyzer = new VentilationAnalyzer(this.buildingManager, this.scene);
    this.sectionCutManager = new SectionCutManager(this.renderer);
    this.floorPlanAnnotationOverlay = new FloorPlanAnnotationOverlay(this.scene, this.buildingManager);
    this.runoffOverlay = new RunoffOverlay(this.scene);
    this.cityScoreOverlay = new CityScoreOverlay(this.scene);
    this.underlayPlanManager = new UnderlayPlanManager(this.scene);
    this.measurementTool = new MeasurementTool(this.raycastManager, this.scene);

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

    // User input listeners
    this.renderer.domElement.addEventListener('click', this.onCanvasClick);
    window.addEventListener('keydown', this.onWindowKeyDown);
    window.addEventListener('resize', this.handleResize);
  }

  private onCanvasClick = (e: MouseEvent): void => {
    if (e.button !== 0) return;
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

    // Camera & Raycast
    this.cameraController.update(deltaTime);
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

    // Lighting & Weather
    this.lightingSystem.updateCenter(this.cameraController.target);
    this.weatherSystem.update(deltaTime, this.cameraController.camera.position);

    // Render
    this.renderer.render(this.scene, this.cameraController.activeCamera);
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

  public setGraphicsQuality(level: 'low' | 'medium' | 'high'): void {
    this.lightingSystem.setGraphicsQuality(level);
    if (level === 'low') {
      this.renderer.shadowMap.enabled = false;
      this.renderer.setPixelRatio(1);
    } else if (level === 'medium') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    } else {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    }
    this.renderer.shadowMap.needsUpdate = true;
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

  public handleResize = (): void => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.renderer.setSize(width, height);
    this.cameraController.handleResize();
  };

  public dispose(): void {
    this.stop();
    this.renderer.domElement.removeEventListener('click', this.onCanvasClick);
    window.removeEventListener('keydown', this.onWindowKeyDown);
    window.removeEventListener('resize', this.handleResize);

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

    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
