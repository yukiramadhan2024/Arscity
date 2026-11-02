import * as THREE from 'three';
import { BuildingManager } from '../../buildings/BuildingManager';
import { Terrain } from '../../world/Terrain';
import { InteriorInteractiveSystem, InteractiveSeat } from '../../buildings/InteriorInteractiveSystem';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { PolygonMath } from '../math/PolygonMath';
import { BuildingInstance, PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { LandscapeItem } from '../../world/LandscapeManager';
import {
  FirstPersonFurnitureBuilder,
  FIRST_PERSON_FURNITURE_CATALOG,
  FIRST_PERSON_EXTERIOR_CATALOG,
  FIRST_PERSON_MATERIAL_PALETTE,
  computeRotatedFurnitureHalfExtents,
  getIndoorHotbarItems,
  getOutdoorHotbarItems
} from '../../buildings/FirstPersonFurnitureCatalog';
import {
  PlaceFurnitureCommand,
  RemoveFurnitureCommand,
  MoveFurnitureCommand,
  AutoFurnishRoomCommand,
  PaintSurfaceCommand,
  PlacedFurnitureData,
  AddBuildingCommand,
  AddLandscapeItemCommand
} from '../commands/CityCommands';
import { showSnackbar } from '../../ui/state/useSnackbarStore';
import type { Engine } from './Engine';

export { computeRotatedFurnitureHalfExtents };

export interface MicroRoomMetrics {
  roomId: string;
  roomName: string;
  floorLabel: string;
  areaM2: number;
  lux: number;
  sniLuxStatus: 'Optimum (SNI)' | 'Cukup' | 'Kurang Cahaya' | 'Terlalu Terang';
  ach: number;
  temperatureC: number;
  noiseDba: number;
  interiorVariantName: string;
}

export interface FirstPersonState {
  isActive: boolean;
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  isGrounded: boolean;
  isSprinting: boolean;
  isUnderRoof: boolean;
  insideBuildingId: string | null;
  insideBuildingName: string | null;
  currentFloor: number;
  totalFloors: number;
  isSeated: boolean;
  nearbySeatLabel: string | null;
  // Enhanced First-Person Builder Mode
  activeDockTab: 'furniture' | 'exterior' | 'tools' | null;
  selectedFurnitureId: string;
  selectedExteriorId: string;
  selectedMaterialId: string;
  activeTool: 'pointer' | 'material_painter' | 'laser_measure';
  isPlacementValid: boolean;
  hoveredFurnitureName: string | null;
  laserDistanceM: number | null;
  reticleActionLabel: string | null;
  isDrawerOpen: boolean;
  isGrabbingFurniture?: boolean;
}

export class FirstPersonController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private buildingManager?: BuildingManager;
  private terrain?: Terrain;
  public engine?: Engine;

  public isActive: boolean = false;
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.65, 0);
  public yaw: number = 0;
  public pitch: number = 0;

  // Speeds & Physics
  public walkSpeed: number = 4.0;   // m/s
  public sprintSpeed: number = 7.5; // m/s
  public jumpSpeed: number = 6.0;   // m/s
  public gravity: number = -18.0;   // m/s²
  public eyeHeight: number = 1.65;  // Human scale 1.65m
  public ceilingHeadClearance: number = 0.25; // 0.25m head clearance from ceiling

  // Smooth horizontal velocity (m/s)
  public currentVelocityX: number = 0;
  public currentVelocityZ: number = 0;
  private velocityY: number = 0;
  private isGrounded: boolean = true;
  private isOnStairs: boolean = false;
  private smoothedCameraY: number = 1.65;

  // Throttled roof check (every 150ms)
  public isUnderRoof: boolean = false;
  private roofCheckAccumulatorMs: number = 150;

  // Interactive Seating (0.45m Ergonomic Height)
  public isSeated: boolean = false;
  public seatedSeat: InteractiveSeat | null = null;
  public nearbySeat: InteractiveSeat | null = null;

  // Multi-floor traversal & interior location state
  public insideBuildingId: string | null = null;
  public insideBuildingName: string | null;
  private prevInsideBuildingId: string | null = null;
  public currentFloor: number = 1;
  public targetFloor: number = 1;
  public totalFloors: number = 1;
  public floorHeight: number = 3.2;
  private targetFloorGroundY: number = 0;

  // Keyboard and mouse input state
  private keysDown: Set<string> = new Set();
  public isPointerLocked: boolean = false;
  public isDrawerOpen: boolean = false;
  public isPhotoModeOpen: boolean = false;

  // Center Raycaster & Builder Dock State
  public centerRaycaster: THREE.Raycaster;
  public activeDockTab: 'furniture' | 'exterior' | 'tools' | null = 'furniture';
  public selectedFurnitureId: string = 'sofa_l';
  public selectedExteriorId: string = 'tree_tabebuya_pink';
  public selectedMaterialId: string = 'wood_teak';
  public activeTool: 'pointer' | 'material_painter' | 'laser_measure' = 'pointer';
  public placementRotation: number = 0; // In radians, 15° steps
  private hasManualPlacementRotation: boolean = false;
  public exteriorDistance: number = 14.0; // In meters (4m - 35m)
  public ghostGroup: THREE.Group | null = null;
  public isPlacementValid: boolean = false;
  public currentPlacementTarget: THREE.Vector3 = new THREE.Vector3();
  public hoveredFurniture: { id: string; type: string; name: string; buildingId: string } | null = null;
  public grabbedFurniture: { buildingId: string; data: PlacedFurnitureData } | null = null;
  public hoveredSurface: { type: 'wall' | 'floor'; buildingId: string; point: THREE.Vector3 } | null = null;
  public laserPoints: THREE.Vector3[] = [];
  public laserDistanceM: number | null = null;
  public lastLaserLabelText: string = '';
  public laserLineMesh: THREE.Line | null = null;
  public laserLabelSprite: THREE.Sprite | null = null;
  public reticleActionLabel: string | null = null;

  private currentGhostType: string = '';
  private currentGhostValid: boolean | null = null;

  // Collision raycasters
  private downRaycaster: THREE.Raycaster;
  private upRaycaster: THREE.Raycaster;
  private horizontalRaycaster: THREE.Raycaster;

  // Callbacks & Lighting State
  public onStateChanged?: (state: FirstPersonState) => void;
  public onExit?: () => void;
  public onCycleInteriorVariant?: () => void;
  public onToggleCeilingLight?: () => void;
  public onTogglePhotoMode?: (forceOpen?: boolean) => void;
  public isCeilingLightOn: boolean = false;
  private manualLightOverride: boolean | null = null;
  public currentVariantName: 'Standar Tropis' | 'Open-Plan Modern' | 'Kompak' = 'Standar Tropis';

  // Scratchpad vectors
  private readonly _scratchMoveDir: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchOriginWaist: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchOriginChest: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchLookTarget: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchWorldQuat: THREE.Quaternion = new THREE.Quaternion();
  private readonly _scratchWorldNormal: THREE.Vector3 = new THREE.Vector3();
  private readonly _scratchUpDir: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  private readonly _scratchDownDir: THREE.Vector3 = new THREE.Vector3(0, -1, 0);
  private readonly _scratchRayOrigin: THREE.Vector3 = new THREE.Vector3();

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    buildingManager?: BuildingManager,
    terrain?: Terrain
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.buildingManager = buildingManager;
    this.terrain = terrain;
    this.insideBuildingName = null;

    this.centerRaycaster = new THREE.Raycaster();
    this.downRaycaster = new THREE.Raycaster();
    this.downRaycaster.far = 100.0;
    this.upRaycaster = new THREE.Raycaster();
    this.upRaycaster.far = 30.0;
    this.horizontalRaycaster = new THREE.Raycaster();
    this.horizontalRaycaster.far = 0.55;

    this.bindEvents();
  }

  public static formatLaserDistanceLabel(distanceM: number): string {
    return `${distanceM.toFixed(2)} m`;
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
    this.buildingManager = engine.buildingManager;
    this.terrain = engine.terrain;
    if (engine.scene) {
      InteriorInteractiveSystem.getInstance().setScene(engine.scene);
    }
  }

  private bindEvents(): void {
    if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
      document.addEventListener('pointerlockchange', this.onPointerLockChange);
      document.addEventListener('mousemove', this.onMouseMove);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
    if (this.domElement) {
      this.domElement.addEventListener('click', this.onCanvasClick);
      this.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    }
  }

  private onPointerLockChange = (): void => {
    this.isPointerLocked =
      typeof document !== 'undefined' && document.pointerLockElement === this.domElement;
    if (!this.isPointerLocked && this.isActive) {
      this.emitState();
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.isActive || !this.isPointerLocked) return;

    const sensitivity = 0.0022;
    this.yaw -= e.movementX * sensitivity;
    this.pitch -= e.movementY * sensitivity;

    // Clamp vertical pitch to prevent flipping (-85° to 85°)
    const maxPitch = (85 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  };

  private onCanvasClick = (e: MouseEvent): void => {
    if (!this.isActive || this.isPhotoModeOpen) return;

    if (this.isDrawerOpen) {
      this.toggleDrawer(false);
      return;
    }

    if (!this.isPointerLocked) {
      this.lockPointer();
      if (e.button === 0 && this.isPlacementValid) {
        this.executePlacement();
      }
      return;
    }

    if (e.button === 0) {
      this.executePlacement();
    }
  };

  public releasePointerLock(): void {
    this.isPointerLocked = false;
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch {}
    }
  }

  public lockPointer(): void {
    if (
      this.isActive &&
      !this.isDrawerOpen &&
      !this.isPhotoModeOpen &&
      this.domElement &&
      typeof this.domElement.requestPointerLock === 'function'
    ) {
      try {
        const lockPromise = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
        if (lockPromise && typeof lockPromise.catch === 'function') {
          lockPromise.catch(() => {});
        }
      } catch {}
    }
  }

  public toggleDrawer(open?: boolean): void {
    const nextOpen = open !== undefined ? open : !this.isDrawerOpen;
    this.isDrawerOpen = nextOpen;

    if (this.isDrawerOpen) {
      this.cancelGrabFurniture();
      this.clearGhostPreview();
      this.releasePointerLock();
    } else {
      this.clearGhostPreview();
      this.lockPointer();
    }
    this.emitState();
  }

  public setPhotoModeActive(open: boolean): void {
    this.isPhotoModeOpen = open;
    if (open) {
      this.cancelGrabFurniture();
      this.clearGhostPreview();
      this.releasePointerLock();
    } else {
      this.lockPointer();
    }
    this.emitState();
  }

  public selectHotbarIndex(index: number): void {
    this.cancelGrabFurniture();
    this.hasManualPlacementRotation = false;

    if (this.insideBuildingId) {
      const items = getIndoorHotbarItems();
      const item = items[index];
      if (item) {
        this.activeDockTab = 'furniture';
        this.selectedFurnitureId = item.id;
        this.activeTool = 'pointer';
        this.clearGhostPreview();
        this.clearLaserMeasure();
        try {
          proceduralAudio.playClick();
        } catch {}
        this.emitState();
      }
    } else {
      const items = getOutdoorHotbarItems();
      const item = items[index];
      if (item) {
        this.activeDockTab = 'exterior';
        this.selectedExteriorId = item.id;
        this.activeTool = 'pointer';
        this.clearGhostPreview();
        this.clearLaserMeasure();
        try {
          proceduralAudio.playClick();
        } catch {}
        this.emitState();
      }
    }
  }

  private onWheel = (e: WheelEvent): void => {
    if (!this.isActive || !this.isPointerLocked) return;
    e.preventDefault();

    if (this.activeDockTab === 'exterior' && !this.insideBuildingId) {
      // Adjust placement distance between 4m and 35m
      this.exteriorDistance += e.deltaY > 0 ? 1.5 : -1.5;
      this.exteriorDistance = Math.max(4.0, Math.min(35.0, this.exteriorDistance));
    } else {
      // Rotate furniture by 15°
      this.rotatePlacement(e.deltaY > 0 ? Math.PI / 12 : -Math.PI / 12);
    }
    this.emitState();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.isActive) return;

    // Ignore when typing in inputs
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    // Allow Ctrl+Z / Ctrl+Y undo/redo cleanly (cancelling active grab first if needed)
    if (e.ctrlKey || e.metaKey) {
      if (e.code === 'KeyZ' || e.code === 'KeyY') {
        this.cancelGrabFurniture();
      }
      return;
    }

    this.keysDown.add(e.code);

    if (e.code === 'Space' && this.isGrounded) {
      if (this.isSeated) {
        this.standUp();
      } else {
        this.velocityY = this.jumpSpeed;
        this.isGrounded = false;
        this.isOnStairs = false;
      }
    } else if (e.code === 'KeyR') {
      this.rotatePlacement(Math.PI / 12);
    } else if (e.code === 'KeyX') {
      this.executeRemove();
    } else if (e.code === 'KeyG') {
      this.grabHoveredFurniture();
    } else if (e.code === 'KeyV') {
      this.cloneHoveredFurniture();
    } else if (e.code === 'KeyC') {
      this.cancelGrabFurniture();
      this.activeTool = this.activeTool === 'material_painter' ? 'pointer' : 'material_painter';
      this.clearLaserMeasure();
      this.emitState();
    } else if (e.code === 'KeyM') {
      this.cancelGrabFurniture();
      this.activeTool = this.activeTool === 'laser_measure' ? 'pointer' : 'laser_measure';
      if (this.activeTool === 'pointer') {
        this.clearLaserMeasure();
      }
      this.emitState();
    } else if (e.code === 'KeyF') {
      this.sitOrStand();
    } else if (e.code === 'KeyL') {
      this.toggleCeilingLight();
    } else if (e.code === 'KeyP') {
      e.preventDefault();
      const nextOpen = !this.isPhotoModeOpen;
      this.setPhotoModeActive(nextOpen);
      if (this.onTogglePhotoMode) {
        this.onTogglePhotoMode(nextOpen);
      }
    } else if (e.code === 'PageUp') {
      e.preventDefault();
      this.traverseFloor('up');
    } else if (e.code === 'PageDown') {
      e.preventDefault();
      this.traverseFloor('down');
    } else if (e.code === 'Tab' || e.code === 'KeyB') {
      e.preventDefault();
      this.toggleDrawer();
    } else if (e.code.startsWith('Digit')) {
      const num = parseInt(e.code.replace('Digit', ''), 10);
      if (num >= 1 && num <= 9) {
        this.selectHotbarIndex(num - 1);
      }
    } else if (e.code === 'Escape') {
      if (this.grabbedFurniture) {
        this.cancelGrabFurniture();
        this.emitState();
      } else if (this.isPhotoModeOpen) {
        this.setPhotoModeActive(false);
        if (this.onTogglePhotoMode) {
          this.onTogglePhotoMode(false);
        }
      } else if (this.isSeated) {
        this.standUp();
      } else if (this.isDrawerOpen) {
        this.toggleDrawer(false);
      } else if (this.activeTool !== 'pointer') {
        this.activeTool = 'pointer';
        this.clearLaserMeasure();
        this.emitState();
      } else if (this.isPointerLocked) {
        this.releasePointerLock();
        this.emitState();
      } else if (this.onExit) {
        this.onExit();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  public rotatePlacement(delta: number): void {
    this.hasManualPlacementRotation = true;
    this.placementRotation = (this.placementRotation + delta) % (Math.PI * 2);
    if (this.placementRotation < 0) this.placementRotation += Math.PI * 2;
    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public grabHoveredFurniture(): boolean {
    if (this.grabbedFurniture) {
      this.cancelGrabFurniture();
      this.emitState();
      return false;
    }

    if (!this.hoveredFurniture || !this.buildingManager) return false;
    const bld = this.buildingManager.buildings.get(this.hoveredFurniture.buildingId);
    if (!bld || !bld.userData?.placedFurniture) return false;

    const existing = bld.userData.placedFurniture.find(
      (f: PlacedFurnitureData) => f.id === this.hoveredFurniture!.id
    );
    if (!existing) return false;

    const savedCopy: PlacedFurnitureData = {
      ...existing,
      position: [...existing.position] as [number, number, number]
    };

    // Temporarily detach original mesh while moving as ghost preview
    if (typeof this.buildingManager.detachFurniture === 'function') {
      this.buildingManager.detachFurniture(bld.id, existing.id);
    } else {
      bld.userData.placedFurniture = bld.userData.placedFurniture.filter(
        (f: PlacedFurnitureData) => f.id !== existing.id
      );
    }

    const bldRot = bld.rotationY || 0;
    this.grabbedFurniture = {
      buildingId: bld.id,
      data: savedCopy
    };
    this.activeDockTab = 'furniture';
    this.activeTool = 'pointer';
    this.selectedFurnitureId = savedCopy.type;
    this.placementRotation = ((bldRot + (savedCopy.rotationY || 0)) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    this.hasManualPlacementRotation = true;
    this.hoveredFurniture = null;
    this.clearGhostPreview();

    try {
      proceduralAudio.playClick();
    } catch {}
    this.updateCenterRaycast();
    this.updateGhostPreview();
    this.emitState();
    return true;
  }

  public cancelGrabFurniture(): void {
    if (!this.grabbedFurniture) return;
    const { buildingId, data } = this.grabbedFurniture;
    this.grabbedFurniture = null;

    if (this.buildingManager) {
      const bld = this.buildingManager.buildings.get(buildingId);
      if (bld) {
        if (!bld.userData) bld.userData = {};
        if (!bld.userData.placedFurniture) bld.userData.placedFurniture = [];
        if (!bld.userData.placedFurniture.some((f: PlacedFurnitureData) => f.id === data.id)) {
          bld.userData.placedFurniture.push(data);
        }
        if (typeof this.buildingManager.attachFurniture === 'function') {
          this.buildingManager.attachFurniture(buildingId, data);
        }
      }
    }
    this.clearGhostPreview();
  }

  public cloneHoveredFurniture(): boolean {
    if (!this.hoveredFurniture) return false;

    const targetBldId = this.hoveredFurniture.buildingId;
    const targetFurId = this.hoveredFurniture.id;
    let targetType = this.hoveredFurniture.type;
    let targetName = this.hoveredFurniture.name;
    let localRot = 0;
    let bldRot = 0;

    if (this.buildingManager) {
      const bld = this.buildingManager.buildings.get(targetBldId);
      if (bld) {
        bldRot = bld.rotationY || 0;
        const found = bld.userData?.placedFurniture?.find(
          (f: PlacedFurnitureData) => f.id === targetFurId
        );
        if (found) {
          targetType = found.type;
          targetName = found.name;
          localRot = found.rotationY || 0;
        }
      }
    }

    if (!targetType) return false;

    this.cancelGrabFurniture();
    this.activeDockTab = 'furniture';
    this.activeTool = 'pointer';
    this.selectedFurnitureId = targetType;
    this.placementRotation = ((bldRot + localRot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    this.hasManualPlacementRotation = true;
    this.clearGhostPreview();
    this.clearLaserMeasure();

    try {
      proceduralAudio.playClick();
      showSnackbar({
        variant: 'info',
        title: 'Perabot Disalin',
        detail: targetName,
        groupKey: 'fp_clone_furniture'
      });
    } catch {}

    this.emitState();
    return true;
  }

  public sitOrStand(): void {
    if (this.isSeated) {
      this.standUp();
    } else if (this.nearbySeat) {
      this.sitDown(this.nearbySeat);
    } else if (this.insideBuildingId) {
      this.isSeated = true;
      this.currentVelocityX = 0;
      this.currentVelocityZ = 0;
      this.eyeHeight = 1.10;
      this.position.y = this.calculateGroundHeight(this.position.x, this.position.z) + this.eyeHeight;
      this.smoothedCameraY = this.position.y;
      try {
        proceduralAudio.playSitDown();
      } catch {}
      this.emitState();
    }
  }

  public enter(startPos?: THREE.Vector3, initialYaw?: number): void {
    this.isActive = true;
    this.camera.near = 0.06;
    this.camera.updateProjectionMatrix();
    if (startPos) {
      this.position.copy(startPos);
    }
    if (initialYaw !== undefined) {
      this.yaw = initialYaw;
    }
    this.pitch = 0;
    this.velocityY = 0;
    this.currentVelocityX = 0;
    this.currentVelocityZ = 0;
    this.keysDown.clear();
    this.currentFloor = 1;
    this.targetFloor = 1;
    this.isSeated = false;
    this.seatedSeat = null;
    this.eyeHeight = 1.65;
    this.isDrawerOpen = false;
    this.isPhotoModeOpen = false;
    this.roofCheckAccumulatorMs = 150;

    const groundY = this.calculateGroundHeight(this.position.x, this.position.z, true);
    this.position.y = groundY + this.eyeHeight;
    this.smoothedCameraY = this.position.y;
    this.syncIndoorLightingTransition();

    this.lockPointer();
    this.emitState();
  }

  public exit(): void {
    this.cancelGrabFurniture();
    this.isActive = false;
    this.isDrawerOpen = false;
    this.isPhotoModeOpen = false;
    this.keysDown.clear();
    this.currentVelocityX = 0;
    this.currentVelocityZ = 0;
    this.velocityY = 0;
    this.clearGhostPreview();
    this.clearLaserMeasure();
    InteriorInteractiveSystem.getInstance().ceilingLightMasterEnabled = false;
    InteriorInteractiveSystem.getInstance().activeIndoorBuildingId = null;
    InteriorInteractiveSystem.getInstance().disableCeilingLights();
    this.releasePointerLock();
    this.emitState();
  }

  public sitDown(seat: InteractiveSeat): void {
    this.isSeated = true;
    this.seatedSeat = seat;
    this.currentVelocityX = 0;
    this.currentVelocityZ = 0;
    this.position.x = seat.worldPosition.x;
    this.position.z = seat.worldPosition.z;
    this.position.y = seat.worldPosition.y + 0.48; // Ergonomic 0.45-0.50m sitting eye height
    this.smoothedCameraY = this.position.y;
    this.velocityY = 0;
    this.isGrounded = true;
    try {
      proceduralAudio.playSitDown();
    } catch {}
    this.emitState();
  }

  public standUp(): void {
    if (!this.isSeated) return;
    this.isSeated = false;
    this.seatedSeat = null;
    this.currentVelocityX = 0;
    this.currentVelocityZ = 0;
    this.eyeHeight = 1.65;
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.eyeHeight;
    this.smoothedCameraY = this.position.y;
    try {
      proceduralAudio.playStandUp();
    } catch {}
    this.emitState();
  }

  /**
   * Computes the current floor ceiling Y coordinate when inside a building,
   * or null when outdoors.
   */
  public getCurrentFloorCeilingY(): number | null {
    if (!this.buildingManager) return null;

    let bld: BuildingInstance | undefined;
    if (this.insideBuildingId) {
      bld = this.buildingManager.buildings.get(this.insideBuildingId);
    }
    if (!bld && typeof this.buildingManager.getBuildingAtPosition === 'function') {
      const cand = this.buildingManager.getBuildingAtPosition(this.position.x, this.position.z);
      if (cand && this.isPositionInsideInnerWalls(cand, this.position.x, this.position.z)) {
        bld = cand;
      }
    }
    if (!bld) return null;

    const plinth = bld.plinthHeight ?? 0.35;
    const flH = bld.floorHeight || 3.2;
    const floorIdx = Math.max(1, this.currentFloor);
    return bld.position.y + plinth + floorIdx * flH;
  }

  private syncIndoorLightingTransition(): void {
    if (this.insideBuildingId !== this.prevInsideBuildingId) {
      if (this.insideBuildingId && !this.prevInsideBuildingId) {
        // Stepped indoors: auto-enable warm 2700K lights at night unless manually overridden
        if (this.manualLightOverride === null && this.engine?.lightingSystem) {
          const hour = this.engine.lightingSystem.currentHour;
          this.isCeilingLightOn = hour >= 17.5 || hour <= 6.0;
        }
      } else if (!this.insideBuildingId) {
        this.manualLightOverride = null;
        this.isCeilingLightOn = false;
      }
      this.prevInsideBuildingId = this.insideBuildingId;
    }

    const iis = InteriorInteractiveSystem.getInstance();
    iis.ceilingLightMasterEnabled = Boolean(this.insideBuildingId && this.isCeilingLightOn);
    iis.activeIndoorBuildingId = this.insideBuildingId;
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

    const dt = Math.min(deltaTime, 0.1);

    // Seated state check
    if (this.isSeated) {
      const wantsMove =
        this.keysDown.has('KeyW') ||
        this.keysDown.has('KeyS') ||
        this.keysDown.has('KeyA') ||
        this.keysDown.has('KeyD') ||
        this.keysDown.has('ArrowUp') ||
        this.keysDown.has('ArrowDown') ||
        this.keysDown.has('ArrowLeft') ||
        this.keysDown.has('ArrowRight') ||
        this.keysDown.has('Space');

      if (wantsMove) {
        this.standUp();
      } else {
        if (this.seatedSeat) {
          this.position.x = this.seatedSeat.worldPosition.x;
          this.position.z = this.seatedSeat.worldPosition.z;
          this.position.y = this.seatedSeat.worldPosition.y + 0.48;
        }
        this.smoothedCameraY = this.position.y;
        this.camera.position.copy(this.position);
        this._scratchLookTarget.set(
          this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
          this.position.y + Math.sin(this.pitch),
          this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(this._scratchLookTarget);
        this.syncIndoorLightingTransition();
        this.updateCenterRaycast();
        this.updateGhostPreview();
        this.emitState();
        return;
      }
    }

    // Query nearby chair/sofa
    this.nearbySeat = InteriorInteractiveSystem.getInstance().getNearestSeat(this.position);

    // Smooth horizontal velocity acceleration & deceleration (lambda = 14.0)
    const isSprinting = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight');
    const maxSpeed = isSprinting ? this.sprintSpeed : this.walkSpeed;

    let forward = 0;
    let strafe = 0;

    if (!this.isDrawerOpen && !this.isPhotoModeOpen) {
      if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
      if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
      if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) strafe -= 1;
      if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) strafe += 1;
    }

    let targetVx = 0;
    let targetVz = 0;
    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      forward /= len;
      strafe /= len;

      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);

      targetVx = (sinY * forward - cosY * strafe) * maxSpeed;
      targetVz = (cosY * forward + sinY * strafe) * maxSpeed;
    }

    this.currentVelocityX = THREE.MathUtils.damp(this.currentVelocityX, targetVx, 14.0, dt);
    this.currentVelocityZ = THREE.MathUtils.damp(this.currentVelocityZ, targetVz, 14.0, dt);

    if (Math.abs(this.currentVelocityX) < 0.0005) this.currentVelocityX = 0;
    if (Math.abs(this.currentVelocityZ) < 0.0005) this.currentVelocityZ = 0;

    const dx = this.currentVelocityX * dt;
    const dz = this.currentVelocityZ * dt;

    if (Math.abs(dx) > 0.00001 || Math.abs(dz) > 0.00001) {
      const canMove = this.testWallCollision(dx, dz);
      if (canMove) {
        this.position.x += dx;
        this.position.z += dz;
      } else {
        if (Math.abs(dx) > 0.00001 && this.testWallCollision(dx, 0)) {
          this.position.x += dx;
          this.currentVelocityZ = 0;
        } else if (Math.abs(dz) > 0.00001 && this.testWallCollision(0, dz)) {
          this.position.z += dz;
          this.currentVelocityX = 0;
        } else {
          this.currentVelocityX = 0;
          this.currentVelocityZ = 0;
        }
      }
    }

    // Ground and Multi-Floor Elevation Evaluation
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    const targetY = groundY + this.eyeHeight;

    // Apply gravity & jumping with Indoor Ceiling Head-Bump Check (0.25m clearance)
    if (this.isOnStairs && this.isGrounded && this.velocityY <= 0) {
      // Physical feet lock cleanly to stair ramp while camera Y damps smoothly below
      this.position.y = targetY;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      const wasUploadingJump = this.velocityY > 0;
      this.velocityY += this.gravity * dt;
      this.position.y += this.velocityY * dt;

      if (wasUploadingJump || this.velocityY > 0) {
        const ceilingY = this.getCurrentFloorCeilingY();
        if (ceilingY !== null) {
          const maxEyeY = ceilingY - this.ceilingHeadClearance;
          if (this.position.y >= maxEyeY) {
            this.position.y = maxEyeY;
            if (this.velocityY > 0) {
              this.velocityY = 0;
            }
          }
        }
      }

      if (this.position.y <= targetY) {
        this.position.y = targetY;
        this.velocityY = 0;
        this.isGrounded = true;
      } else {
        this.isGrounded = false;
      }
    }

    // Throttled roof raycast (every 150ms instead of every frame)
    this.roofCheckAccumulatorMs += dt * 1000;
    if (this.insideBuildingId) {
      this.isUnderRoof = true;
    } else if (this.roofCheckAccumulatorMs >= 150) {
      this.roofCheckAccumulatorMs = 0;
      this.isUnderRoof = this.checkIfUnderRoof(this.position);
    }

    this.syncIndoorLightingTransition();

    // Smooth camera Y on stairs via THREE.MathUtils.damp so stair transition never jitters
    if (this.isOnStairs && this.isGrounded) {
      this.smoothedCameraY = THREE.MathUtils.damp(this.smoothedCameraY, this.position.y, 16.0, dt);
    } else if (this.isGrounded && Math.abs(this.smoothedCameraY - this.position.y) > 0.001) {
      this.smoothedCameraY = THREE.MathUtils.damp(this.smoothedCameraY, this.position.y, 24.0, dt);
    } else {
      this.smoothedCameraY = this.position.y;
    }

    // Apply to Three.js camera
    this.camera.position.set(this.position.x, this.smoothedCameraY, this.position.z);
    this._scratchLookTarget.set(
      this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
      this.smoothedCameraY + Math.sin(this.pitch),
      this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch)
    );
    this.camera.lookAt(this._scratchLookTarget);

    // Interactive Raycast & Ghost update
    this.updateCenterRaycast();
    this.updateGhostPreview();

    this.emitState();
  }

  /**
   * Indoor room check: Player (x, z) is inside the building walls.
   * Uses wallInset = 0.12m so that the moment the player crosses the door threshold,
   * indoor room detection and furniture mode activate smoothly.
   */
  public isPositionInsideInnerWalls(bld: BuildingInstance, x: number, z: number): boolean {
    const dx = x - bld.position.x;
    const dz = z - bld.position.z;
    const rot = bld.rotationY || 0;
    const cos = Math.cos(-rot);
    const sin = Math.sin(-rot);
    const localX = cos * dx - sin * dz;
    const localZ = sin * dx + cos * dz;

    const wallInset = 0.12;
    const hw = (bld.width || 10) * 0.5 - wallInset;
    const hl = (bld.length || 10) * 0.5 - wallInset;

    if (hw <= 0 || hl <= 0) return false;

    if (bld.footprintPolygon && bld.footprintPolygon.length >= 3) {
      const inPoly = PolygonMath.isPointInPolygon(
        { x: localX, y: localZ },
        bld.footprintPolygon.map((p) => ({ x: p.x, y: p.y }))
      );
      if (!inPoly) return false;
    }

    return Math.abs(localX) <= hw && Math.abs(localZ) <= hl;
  }

  private isPlacedFurnitureObject(obj: THREE.Object3D | null): boolean {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (
        cur.userData?.furnitureId ||
        cur.userData?.isFurniture ||
        cur.name === 'DynamicFurnitureGroup' ||
        (typeof cur.name === 'string' && cur.name.startsWith('Furniture_'))
      ) {
        return true;
      }
      cur = cur.parent;
    }
    return false;
  }

  /**
   * 2D bounding-box collision test against placed furniture with height > 0.4m
   * (tables, beds, cafe counters, wardrobes), allowing smooth sliding along sides.
   */
  public testFurnitureCollision2D(dx: number, dz: number, playerRadius: number = 0.20): boolean {
    if (!this.buildingManager) return true;

    const nextX = this.position.x + dx;
    const nextZ = this.position.z + dz;

    let bld: BuildingInstance | undefined;
    if (this.insideBuildingId) {
      bld = this.buildingManager.buildings.get(this.insideBuildingId);
    }
    if (!bld && typeof this.buildingManager.getBuildingAtPosition === 'function') {
      bld = this.buildingManager.getBuildingAtPosition(nextX, nextZ) ?? undefined;
    }
    if (!bld || !bld.userData?.placedFurniture || bld.userData.placedFurniture.length === 0) {
      return true;
    }

    const rot = bld.rotationY || 0;
    const cosR = Math.cos(-rot);
    const sinR = Math.sin(-rot);

    const curDx = this.position.x - bld.position.x;
    const curDz = this.position.z - bld.position.z;
    const curLocalX = cosR * curDx - sinR * curDz;
    const curLocalZ = sinR * curDx + cosR * curDz;

    const nextDx = nextX - bld.position.x;
    const nextDz = nextZ - bld.position.z;
    const nextLocalX = cosR * nextDx - sinR * nextDz;
    const nextLocalZ = sinR * nextDx + cosR * nextDz;

    const plinth = bld.plinthHeight ?? 0.35;
    const playerFeetLocalY = (this.position.y - this.eyeHeight) - (bld.position.y + plinth);

    for (const fur of bld.userData.placedFurniture as PlacedFurnitureData[]) {
      if (this.grabbedFurniture && fur.id === this.grabbedFurniture.data.id) continue;
      if ((fur.floorIndex || 1) !== this.currentFloor) continue;

      const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((it) => it.id === fur.type);
      const furHeight = furItem?.height ?? 0.85;
      if (furHeight <= 0.4) continue;

      // Allow jumping cleanly above low furniture if feet clear the top
      const furBaseY = fur.position[1] || 0;
      if (playerFeetLocalY >= furBaseY + furHeight - 0.05) continue;

      const { effectiveHalfW, effectiveHalfD } = computeRotatedFurnitureHalfExtents(
        furItem?.width ?? 0.8,
        furItem?.depth ?? 0.8,
        fur.rotationY || 0
      );

      const padW = effectiveHalfW + playerRadius;
      const padD = effectiveHalfD + playerRadius;

      const relNextX = Math.abs(nextLocalX - fur.position[0]);
      const relNextZ = Math.abs(nextLocalZ - fur.position[2]);

      if (relNextX < padW && relNextZ < padD) {
        const relCurX = Math.abs(curLocalX - fur.position[0]);
        const relCurZ = Math.abs(curLocalZ - fur.position[2]);

        // If already slightly inside (e.g., standing up from a seat), permit outward escape
        if (relCurX < padW && relCurZ < padD) {
          const curNormDist = Math.hypot(relCurX / padW, relCurZ / padD);
          const nextNormDist = Math.hypot(relNextX / padW, relNextZ / padD);
          if (nextNormDist < curNormDist) {
            return false;
          }
        } else {
          return false;
        }
      }
    }

    return true;
  }

  private testWallCollision(dx: number, dz: number): boolean {
    const moveLen = Math.hypot(dx, dz);
    if (moveLen < 0.0001) return true;

    const playerRadius = 0.20;

    // 1. Check 2D bounding boxes of solid furniture (height > 0.4m)
    if (!this.testFurnitureCollision2D(dx, dz, playerRadius)) {
      return false;
    }

    this._scratchMoveDir.set(dx, 0, dz).normalize();
    // Test at waist and chest heights
    this._scratchOriginWaist.set(this.position.x, this.position.y - 0.75, this.position.z);
    this._scratchOriginChest.set(this.position.x, this.position.y - 0.35, this.position.z);

    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) {
      return true;
    }

    const origins = [this._scratchOriginWaist, this._scratchOriginChest];
    for (const origin of origins) {
      this.horizontalRaycaster.set(origin, this._scratchMoveDir);
      this.horizontalRaycaster.far = Math.max(0.35, moveLen + playerRadius);

      const hits = this.horizontalRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );

      for (const hit of hits) {
        // Skip door leaves, portal casings, and interactive doors (furniture is handled by 2D rotated AABB above)
        if (
          hit.object.userData?.isDoor ||
          hit.object.userData?.isWalkThroughPortal ||
          this.isPlacedFurnitureObject(hit.object) ||
          hit.object.name?.toLowerCase().includes('door') ||
          hit.object.name?.toLowerCase().includes('portal')
        ) {
          continue;
        }

        if (hit.distance < playerRadius) {
          if (hit.face) {
            this._scratchWorldNormal.copy(hit.face.normal).applyQuaternion(
              hit.object.getWorldQuaternion(this._scratchWorldQuat)
            );
            if (this._scratchMoveDir.dot(this._scratchWorldNormal) < -0.15) {
              return false;
            }
          } else {
            return false;
          }
        }
      }
    }

    return true;
  }

  private calculateGroundHeight(x: number, z: number, isSpawning: boolean = false): number {
    this.isOnStairs = false;

    const bld = this.buildingManager?.getBuildingAtPosition?.(x, z);
    const isStrictlyInside = bld ? this.isPositionInsideInnerWalls(bld, x, z) : false;

    // Check if player is on the building's plinth or entrance porch threshold
    let isAtPlinth = false;
    let plinthTargetY = 0;
    if (bld) {
      const dx = x - bld.position.x;
      const dz = z - bld.position.z;
      const rot = bld.rotationY || 0;
      const cos = Math.cos(-rot);
      const sin = Math.sin(-rot);
      const localX = cos * dx - sin * dz;
      const localZ = sin * dx + cos * dz;
      const hw = (bld.width || 10) * 0.5 + 0.25;
      const hl = (bld.length || 10) * 0.5 + 0.25;
      if (Math.abs(localX) <= hw && Math.abs(localZ) <= hl) {
        isAtPlinth = true;
        plinthTargetY = bld.position.y + (bld.plinthHeight ?? 0.35);
      }
    }

    if (bld && isStrictlyInside) {
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.totalFloors = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));

      const flH = bld.floorHeight || 3.2;
      const plinth = bld.plinthHeight ?? 0.35;

      // 1. Continuous Physical StairZone Check
      const stairZones: any[] = bld.userData?.stairZones || (bld as any).stairZones || [];
      if (stairZones.length > 0) {
        const dx = x - bld.position.x;
        const dz = z - bld.position.z;
        const rot = bld.rotationY || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        const localX = cos * dx - sin * dz;
        const localZ = sin * dx + cos * dz;

        const coreX = -Math.max(1.2, Math.min(bld.width * 0.35, (bld.width || 12) * 0.22));
        const coreZ = 0;
        const runLength = 3.2;
        const flightX = coreX - 0.68;
        const flightW = 1.35;
        const zStart = coreZ - runLength * 0.5;
        const zEnd = coreZ + runLength * 0.5;

        const inStairFootprint =
          localX >= flightX - flightW * 0.6 &&
          localX <= flightX + flightW * 0.6 &&
          localZ >= zStart - 0.5 &&
          localZ <= zEnd + 0.5;

        if (inStairFootprint) {
          let currentZone = stairZones.find((sz: any) => sz.floorIndex === this.targetFloor - 1);
          if (!currentZone) {
            let minDiff = 999999;
            currentZone = stairZones[0];
            for (const sz of stairZones) {
              const diff = Math.abs(this.position.y - (bld.position.y + sz.baseFloorY));
              if (diff < minDiff) {
                minDiff = diff;
                currentZone = sz;
              }
            }
          }

          if (currentZone) {
            this.isOnStairs = true;
            const t = Math.max(0.0, Math.min(1.0, (localZ - zStart) / (zEnd - zStart)));
            const stairElevation = bld.position.y + currentZone.baseFloorY + t * currentZone.floorHeight;

            if (t >= 0.98) {
              this.targetFloor = Math.min(this.totalFloors, currentZone.floorIndex + 2);
              this.currentFloor = this.targetFloor;
            } else if (t <= 0.02) {
              this.targetFloor = Math.max(1, currentZone.floorIndex + 1);
              this.currentFloor = this.targetFloor;
            }

            return stairElevation;
          }
        }
      }

      const targetY = bld.position.y + plinth + (this.targetFloor - 1) * flH;
      this.currentFloor = this.targetFloor;
      return targetY;
    }

    // Outside the building
    this.insideBuildingId = null;
    this.insideBuildingName = null;
    this.currentFloor = 1;
    this.targetFloor = 1;
    this.totalFloors = 1;

    let highestFloorY = 0;
    const terrainY = this.terrain ? this.terrain.getHeightAt(x, z) : 0;

    // Raycast down to find elevated floors, decks, or rooftops (ignoring all furniture meshes).
    const currentFeetY = this.position.y - this.eyeHeight;
    const rayCastStartY = isSpawning
      ? Math.max(50.0, this.position.y + 10.0)
      : Math.max(currentFeetY + 0.55, terrainY + 0.55);

    this._scratchRayOrigin.set(x, rayCastStartY, z);
    this.downRaycaster.set(this._scratchRayOrigin, this._scratchDownDir);
    this.downRaycaster.far = isSpawning ? 100.0 : Math.max(5.0, rayCastStartY - terrainY + 1.0);

    if (this.buildingManager?.masterGroup && this.buildingManager.masterGroup.children.length > 0) {
      this.buildingManager.masterGroup.updateMatrixWorld(true);
      const hits = this.downRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );
      for (const hit of hits) {
        // Ignore placed furniture & doors so player never stands on top of tables, beds, or wardrobes
        if (
          this.isPlacedFurnitureObject(hit.object) ||
          hit.object.userData?.isDoor ||
          hit.object.userData?.isWalkThroughPortal
        ) {
          continue;
        }

        // Upward-facing walkable surfaces (floors, stairs, plinths, decks)
        if (hit.face && hit.face.normal.y > 0.6) {
          if (isSpawning || hit.point.y <= currentFeetY + 0.55) {
            if (hit.point.y > highestFloorY) {
              highestFloorY = hit.point.y;
            }
          }
        }
      }
    }

    if (isAtPlinth) {
      if (isSpawning || plinthTargetY <= currentFeetY + 0.55) {
        if (plinthTargetY > highestFloorY) {
          highestFloorY = plinthTargetY;
        }
      }
    }

    return Math.max(terrainY, highestFloorY);
  }

  private checkIfUnderRoof(pos: THREE.Vector3): boolean {
    if (this.insideBuildingId) return true;
    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) {
      return false;
    }

    this.upRaycaster.set(pos, this._scratchUpDir);
    const hits = this.upRaycaster.intersectObjects(
      this.buildingManager.masterGroup.children,
      true
    );
    return hits.some((h) => !this.isPlacedFurnitureObject(h.object));
  }

  /**
   * Evaluates rotated AABB validity for a candidate furniture placement against
   * inner building walls and existing placed furniture on the same floor.
   */
  public checkFurniturePlacementValidity(
    bld: BuildingInstance,
    localX: number,
    localZ: number,
    furnitureId: string,
    localRotationY: number,
    floorIndex: number,
    ignoreFurnitureId?: string
  ): { valid: boolean; reason: 'ok' | 'wall' | 'overlap' } {
    const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === furnitureId);
    const { effectiveHalfW, effectiveHalfD } = computeRotatedFurnitureHalfExtents(
      furItem?.width ?? 0.8,
      furItem?.depth ?? 0.8,
      localRotationY
    );

    // 1. Inner wall clearance check using rotated effective half-width and half-depth
    const innerHalfW = (bld.width || 10) * 0.5 - 0.16;
    const innerHalfL = (bld.length || 10) * 0.5 - 0.16;
    if (
      Math.abs(localX) + effectiveHalfW > innerHalfW + 0.015 ||
      Math.abs(localZ) + effectiveHalfD > innerHalfL + 0.015
    ) {
      return { valid: false, reason: 'wall' };
    }

    // 2. Rotated AABB overlap check against existing furniture on this floor
    const existing: PlacedFurnitureData[] = bld.userData?.placedFurniture || [];
    const candMinX = localX - effectiveHalfW;
    const candMaxX = localX + effectiveHalfW;
    const candMinZ = localZ - effectiveHalfD;
    const candMaxZ = localZ + effectiveHalfD;
    const eps = 0.02;

    const hasOverlap = existing.some((f) => {
      if (ignoreFurnitureId && f.id === ignoreFurnitureId) return false;
      if ((f.floorIndex || 1) !== floorIndex) return false;

      const otherItem = FIRST_PERSON_FURNITURE_CATALOG.find((it) => it.id === f.type);
      const { effectiveHalfW: otherHW, effectiveHalfD: otherHD } = computeRotatedFurnitureHalfExtents(
        otherItem?.width ?? 0.8,
        otherItem?.depth ?? 0.8,
        f.rotationY || 0
      );

      const otherMinX = f.position[0] - otherHW;
      const otherMaxX = f.position[0] + otherHW;
      const otherMinZ = f.position[2] - otherHD;
      const otherMaxZ = f.position[2] + otherHD;

      return (
        candMinX < otherMaxX - eps &&
        candMaxX > otherMinX + eps &&
        candMinZ < otherMaxZ - eps &&
        candMaxZ > otherMinZ + eps
      );
    });

    if (hasOverlap) {
      return { valid: false, reason: 'overlap' };
    }

    return { valid: true, reason: 'ok' };
  }

  private updateCenterRaycast(): void {
    if (!this.isActive) return;

    this.centerRaycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const isInside = Boolean(this.insideBuildingId);
    this.centerRaycaster.near = isInside ? 0.3 : 1.5;
    this.centerRaycaster.far = isInside ? 8.0 : 40.0;

    this.reticleActionLabel = null;
    this.hoveredFurniture = null;
    this.hoveredSurface = null;
    this.isPlacementValid = false;

    // 1. Check hovered placed furniture if inside building (and not currently moving a grabbed piece)
    if (isInside && this.insideBuildingId && this.buildingManager && !this.grabbedFurniture) {
      const bldGroup = this.buildingManager.getBuildingGroup(this.insideBuildingId);
      if (bldGroup) {
        const hits = this.centerRaycaster.intersectObjects(bldGroup.children, true);
        for (const hit of hits) {
          let cur: THREE.Object3D | null = hit.object;
          while (cur && cur !== bldGroup) {
            if (cur.userData?.furnitureId) {
              const furType = cur.userData.type || '';
              const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === furType);
              this.hoveredFurniture = {
                id: cur.userData.furnitureId,
                type: furType,
                name: furItem?.name || 'Perabot',
                buildingId: this.insideBuildingId
              };
              this.reticleActionLabel = `[G] Geser  [V] Salin  [X] Hapus ${this.hoveredFurniture.name}${furItem?.isSeat ? '  [F] Duduk' : ''}`;
              this.isPlacementValid = false;
              return;
            }
            cur = cur.parent;
          }
        }
      }
    }

    // 2. Active Tool: Laser Measure
    if (this.activeTool === 'laser_measure') {
      const targets: THREE.Object3D[] = [];
      if (this.buildingManager) targets.push(this.buildingManager.masterGroup);
      if (this.terrain) targets.push(this.terrain.mesh);
      const hits = this.centerRaycaster.intersectObjects(targets, true);
      if (hits.length > 0) {
        const hit = hits[0];
        this.currentPlacementTarget.copy(hit.point);
        this.isPlacementValid = true;
        const ptNum = this.laserPoints.length === 0 ? '1' : '2';
        this.reticleActionLabel = `[Klik Kiri] Titik ${ptNum} Laser (${hit.distance.toFixed(2)} m)`;
      }
      return;
    }

    // 3. Active Tool: Material Painter
    if (this.activeTool === 'material_painter') {
      if (this.buildingManager) {
        const hits = this.centerRaycaster.intersectObjects(this.buildingManager.masterGroup.children, true);
        if (hits.length > 0) {
          const hit = hits[0];
          const isFloor = hit.face ? Math.abs(hit.face.normal.y) > 0.6 : false;
          const surfaceType: 'wall' | 'floor' = isFloor ? 'floor' : 'wall';
          const bldId = this.insideBuildingId || hit.object.userData?.buildingId || '';
          this.hoveredSurface = { type: surfaceType, buildingId: bldId, point: hit.point };
          this.isPlacementValid = Boolean(bldId);
          const matItem = FIRST_PERSON_MATERIAL_PALETTE.find((m) => m.id === this.selectedMaterialId);
          this.reticleActionLabel = `[Klik Kiri] Cat ${surfaceType === 'wall' ? 'Dinding' : 'Lantai'} (${matItem?.name || ''})`;
        }
      }
      return;
    }

    // 4. Tab 1: Furnitur Interior
    if (this.activeDockTab === 'furniture') {
      if (!isInside || !this.insideBuildingId) {
        this.reticleActionLabel = 'Masuk ke dalam gedung untuk menaruh perabot';
        this.isPlacementValid = false;
        return;
      }
      const bld = this.buildingManager?.buildings.get(this.insideBuildingId);
      const bldGroup = this.buildingManager?.getBuildingGroup(this.insideBuildingId);
      if (!bld || !bldGroup) return;

      const hits = this.centerRaycaster.intersectObjects(bldGroup.children, true);
      const floorHit = hits.find(
        (h) => h.face && h.face.normal.y > 0.7 && !this.isPlacedFurnitureObject(h.object)
      );
      if (floorHit) {
        const targetPos = floorHit.point.clone();

        const dx = targetPos.x - bld.position.x;
        const dz = targetPos.z - bld.position.z;
        const rot = bld.rotationY || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        let localX = cos * dx - sin * dz;
        let localZ = sin * dx + cos * dz;

        const innerHalfW = (bld.width || 10) * 0.5 - 0.18;
        const innerHalfL = (bld.length || 10) * 0.5 - 0.18;

        const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === this.selectedFurnitureId);
        let snapped = false;
        let autoSnapLocalRot = 0;

        if (Math.abs(localX - innerHalfW) < 0.6) {
          autoSnapLocalRot = -Math.PI * 0.5;
          snapped = true;
        } else if (Math.abs(localX - (-innerHalfW)) < 0.6) {
          autoSnapLocalRot = Math.PI * 0.5;
          snapped = true;
        } else if (Math.abs(localZ - innerHalfL) < 0.6) {
          autoSnapLocalRot = Math.PI;
          snapped = true;
        } else if (Math.abs(localZ - (-innerHalfL)) < 0.6) {
          autoSnapLocalRot = 0;
          snapped = true;
        }

        if (snapped && !this.hasManualPlacementRotation) {
          this.placementRotation = ((rot + autoSnapLocalRot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        }

        const localRotY = this.placementRotation - rot;
        const { effectiveHalfW, effectiveHalfD } = computeRotatedFurnitureHalfExtents(
          furItem?.width ?? 0.8,
          furItem?.depth ?? 0.8,
          localRotY
        );

        // Snap flush against inner wall using rotated effective half-extents so 90° items never pierce walls
        if (Math.abs(localX - innerHalfW) < 0.6 && innerHalfW > effectiveHalfW) {
          localX = innerHalfW - effectiveHalfW;
        } else if (Math.abs(localX - (-innerHalfW)) < 0.6 && innerHalfW > effectiveHalfW) {
          localX = -innerHalfW + effectiveHalfW;
        }

        if (Math.abs(localZ - innerHalfL) < 0.6 && innerHalfL > effectiveHalfD) {
          localZ = innerHalfL - effectiveHalfD;
        } else if (Math.abs(localZ - (-innerHalfL)) < 0.6 && innerHalfL > effectiveHalfD) {
          localZ = -innerHalfL + effectiveHalfD;
        }

        targetPos.x = bld.position.x + (localX * Math.cos(rot) - localZ * Math.sin(rot));
        targetPos.z = bld.position.z + (localX * Math.sin(rot) + localZ * Math.cos(rot));
        this.currentPlacementTarget.copy(targetPos);

        const validity = this.checkFurniturePlacementValidity(
          bld,
          localX,
          localZ,
          this.selectedFurnitureId,
          localRotY,
          this.currentFloor,
          this.grabbedFurniture?.data.id
        );

        if (!validity.valid) {
          this.isPlacementValid = false;
          this.reticleActionLabel =
            validity.reason === 'wall'
              ? 'Terlalu dekat dengan dinding ruangan'
              : 'Area terhalang oleh perabot lain';
        } else {
          this.isPlacementValid = true;
          const name = furItem?.name || 'Perabot';
          if (this.grabbedFurniture) {
            this.reticleActionLabel = `[Klik Kiri] Pindahkan ${name}  [R] Putar  [Esc] Batal`;
          } else {
            this.reticleActionLabel = `[Klik Kiri] Taruh ${name}  [R / Scroll] Putar`;
          }
        }
      }
    } else if (this.activeDockTab === 'exterior') {
      // Tab 2: Exterior Placement - Crosshair Raycast to Terrain
      let hitTerrain = false;
      if (this.terrain?.mesh) {
        const hits = this.centerRaycaster.intersectObject(this.terrain.mesh, false);
        if (hits.length > 0 && hits[0].distance >= 1.5 && hits[0].distance <= 60.0) {
          this.currentPlacementTarget.copy(hits[0].point);
          hitTerrain = true;
        }
      }

      if (!hitTerrain) {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        const dist = Math.min(Math.max(4.0, this.exteriorDistance), 35.0);
        const targetX = this.position.x + camDir.x * dist;
        const targetZ = this.position.z + camDir.z * dist;
        const targetY = this.terrain ? this.terrain.getHeightAt(targetX, targetZ) : 0;
        this.currentPlacementTarget.set(targetX, targetY, targetZ);
      }

      const targetX = this.currentPlacementTarget.x;
      const targetZ = this.currentPlacementTarget.z;

      // Validate not on road asphalt
      const isOnRoad = this.engine?.roadManager?.isPointOnRoadAsphalt?.(targetX, targetZ, 1.2) ?? false;
      const extItem = FIRST_PERSON_EXTERIOR_CATALOG.find((e) => e.id === this.selectedExteriorId);

      if (isOnRoad) {
        this.isPlacementValid = false;
        this.reticleActionLabel = `Lokasi terhalang jalan raya (${extItem?.name || ''})`;
      } else {
        this.isPlacementValid = true;
        this.reticleActionLabel = `[Klik Kiri] Bangun ${extItem?.name || ''}  [R / Scroll] Putar`;
      }
    }
  }

  public updateGhostPreview(): void {
    if (!this.isActive || !this.engine?.scene || this.isDrawerOpen || this.isPhotoModeOpen) {
      this.clearGhostPreview();
      return;
    }

    if (
      this.activeTool !== 'pointer' ||
      (this.hoveredFurniture && !this.grabbedFurniture)
    ) {
      this.clearGhostPreview();
      return;
    }

    if (this.activeDockTab === 'furniture' && this.insideBuildingId) {
      if (this.currentGhostType !== this.selectedFurnitureId || this.currentGhostValid !== this.isPlacementValid) {
        this.clearGhostPreview();
        this.ghostGroup = FirstPersonFurnitureBuilder.buildGhostPreview(this.selectedFurnitureId, this.isPlacementValid);
        this.engine.scene.add(this.ghostGroup);
        this.currentGhostType = this.selectedFurnitureId;
        this.currentGhostValid = this.isPlacementValid;
      }
      if (this.ghostGroup) {
        this.ghostGroup.visible = true;
        this.ghostGroup.position.copy(this.currentPlacementTarget);
        this.ghostGroup.rotation.y = this.placementRotation;
      }
    } else if (this.activeDockTab === 'exterior' && !this.insideBuildingId) {
      if (this.currentGhostType !== this.selectedExteriorId || this.currentGhostValid !== this.isPlacementValid) {
        this.clearGhostPreview();
        const extItem = FIRST_PERSON_EXTERIOR_CATALOG.find((e) => e.id === this.selectedExteriorId);
        const group = new THREE.Group();
        const color = this.isPlacementValid ? 0x007aff : 0xff3b30;

        if (extItem?.category === 'building') {
          const box = new THREE.Mesh(
            new THREE.BoxGeometry(10, 6, 12),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, wireframe: true })
          );
          box.position.y = 3;
          group.add(box);
        } else {
          const sphere = new THREE.Mesh(
            new THREE.DodecahedronGeometry(1.8),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
          );
          sphere.position.y = 3.2;
          group.add(sphere);
          const trunk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.25, 0.3, 2.2),
            new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45 })
          );
          trunk.position.y = 1.1;
          group.add(trunk);
        }
        this.ghostGroup = group;
        this.engine.scene.add(this.ghostGroup);
        this.currentGhostType = this.selectedExteriorId;
        this.currentGhostValid = this.isPlacementValid;
      }
      if (this.ghostGroup) {
        this.ghostGroup.visible = true;
        this.ghostGroup.position.copy(this.currentPlacementTarget);
        this.ghostGroup.rotation.y = this.placementRotation;
      }
    } else {
      this.clearGhostPreview();
    }
  }

  public clearGhostPreview(): void {
    if (this.ghostGroup && this.engine?.scene) {
      this.engine.scene.remove(this.ghostGroup);
      this.ghostGroup = null;
      this.currentGhostType = '';
      this.currentGhostValid = null;
    }
  }

  public executePlacement(): void {
    if (!this.engine) return;

    if (this.activeTool === 'laser_measure') {
      if (this.laserPoints.length === 0) {
        this.laserPoints.push(this.currentPlacementTarget.clone());
        try {
          proceduralAudio.playClick();
        } catch {}
      } else if (this.laserPoints.length === 1) {
        this.laserPoints.push(this.currentPlacementTarget.clone());
        this.laserDistanceM = Math.round(this.laserPoints[0].distanceTo(this.laserPoints[1]) * 100) / 100;

        // Draw 3D laser line
        if (this.laserLineMesh) {
          this.engine.scene.remove(this.laserLineMesh);
        }
        const geo = new THREE.BufferGeometry().setFromPoints(this.laserPoints);
        const mat = new THREE.LineBasicMaterial({ color: 0x007aff });
        this.laserLineMesh = new THREE.Line(geo, mat);
        this.engine.scene.add(this.laserLineMesh);

        // Draw 3D Midpoint Billboard Distance Badge (Space Mono, zero Unicode emoji)
        if (this.laserLabelSprite) {
          this.engine.scene.remove(this.laserLabelSprite);
        }
        const midPoint = new THREE.Vector3().addVectors(this.laserPoints[0], this.laserPoints[1]).multiplyScalar(0.5);
        midPoint.y += 0.35;
        const cleanLabel = FirstPersonController.formatLaserDistanceLabel(this.laserDistanceM);
        this.lastLaserLabelText = cleanLabel;
        this.laserLabelSprite = this.createLaserLabelSprite(cleanLabel);
        this.laserLabelSprite.position.copy(midPoint);
        this.engine.scene.add(this.laserLabelSprite);

        try {
          proceduralAudio.playPlaceBuilding();
          showSnackbar({
            variant: 'info',
            title: 'Pengukuran Laser',
            detail: `Jarak Terukur: ${cleanLabel}`,
            groupKey: 'fp_laser_measure'
          });
        } catch {}
      } else {
        this.clearLaserMeasure();
      }
      this.emitState();
      return;
    }

    if (this.activeTool === 'material_painter') {
      if (this.hoveredSurface && this.hoveredSurface.buildingId) {
        this.engine.executeCommand(
          new PaintSurfaceCommand(
            this.engine,
            this.hoveredSurface.buildingId,
            this.hoveredSurface.type,
            this.selectedMaterialId
          )
        );
      }
      return;
    }

    if (this.activeDockTab === 'furniture' && this.isPlacementValid && this.insideBuildingId) {
      const bld = this.buildingManager?.buildings.get(this.insideBuildingId);
      if (!bld) return;

      const dx = this.currentPlacementTarget.x - bld.position.x;
      const dz = this.currentPlacementTarget.z - bld.position.z;
      const rot = bld.rotationY || 0;
      const localX = Math.cos(-rot) * dx - Math.sin(-rot) * dz;
      const localZ = Math.sin(-rot) * dx + Math.cos(-rot) * dz;
      const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === this.selectedFurnitureId);
      const floorY = (this.currentFloor - 1) * (bld.floorHeight || 3.2);

      if (this.grabbedFurniture && this.grabbedFurniture.buildingId === bld.id) {
        const prevData = this.grabbedFurniture.data;
        const nextData: PlacedFurnitureData = {
          id: prevData.id,
          type: prevData.type,
          name: prevData.name,
          position: [localX, floorY, localZ],
          rotationY: this.placementRotation - rot,
          floorIndex: this.currentFloor
        };
        this.grabbedFurniture = null;
        this.engine.executeCommand(new MoveFurnitureCommand(this.engine, bld.id, prevData, nextData));
        this.emitState();
        return;
      }

      const furData: PlacedFurnitureData = {
        id: `fur_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: this.selectedFurnitureId,
        name: furItem?.name || 'Perabot',
        position: [localX, floorY, localZ],
        rotationY: this.placementRotation - rot,
        floorIndex: this.currentFloor
      };

      // Local spring animation (0.75 -> 1.0 over 200ms) runs directly on the furniture mesh inside attachFurniture;
      // never shake the parent building group while standing indoors.
      this.engine.executeCommand(new PlaceFurnitureCommand(this.engine, bld.id, furData));
    } else if (this.activeDockTab === 'exterior' && this.isPlacementValid) {
      const extItem = FIRST_PERSON_EXTERIOR_CATALOG.find((e) => e.id === this.selectedExteriorId);
      if (extItem?.category === 'building') {
        const newId = `bld_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        const preset = PREFAB_CATALOG[extItem.presetKey || 'house_36'] || Object.values(PREFAB_CATALOG)[0];
        const instance: BuildingInstance = {
          id: newId,
          presetKey: preset.key,
          name: extItem.name,
          category: (preset.category as any) || 'residential',
          position: this.currentPlacementTarget.clone(),
          rotationY: this.placementRotation,
          width: preset.defaultWidth || 10,
          length: preset.defaultLength || 10,
          floorCount: preset.defaultFloorCount || 1,
          floorHeight: preset.floorHeight || 3.2,
          roofType: preset.defaultRoofType || 'gable',
          roofOverhang: preset.defaultRoofOverhang || 0.6,
          wallMaterial: preset.defaultWallMaterial || 'plaster',
          wallColor: preset.defaultWallColor || '#FFFFFF',
          roofMaterial: preset.defaultRoofMaterial || 'clay_tile'
        };
        this.engine.executeCommand(new AddBuildingCommand(this.engine, instance));
      } else if (extItem) {
        const item: LandscapeItem = {
          id: `land_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          type: extItem.id as any,
          position: this.currentPlacementTarget.clone(),
          rotationY: this.placementRotation,
          width: 3.0,
          length: 3.0,
          radius: 2.0
        };
        this.engine.executeCommand(new AddLandscapeItemCommand(this.engine, item));
      }
    }
  }

  public executeRemove(): void {
    if (!this.engine || !this.hoveredFurniture) return;
    this.engine.executeCommand(
      new RemoveFurnitureCommand(this.engine, this.hoveredFurniture.buildingId, {
        id: this.hoveredFurniture.id,
        type: this.hoveredFurniture.type || '',
        name: this.hoveredFurniture.name,
        position: [0, 0, 0],
        rotationY: 0,
        floorIndex: this.currentFloor
      })
    );
    this.hoveredFurniture = null;
  }

  public autoFurnishCurrentRoom(): void {
    if (!this.engine || !this.insideBuildingId) return;
    this.cancelGrabFurniture();
    this.engine.executeCommand(new AutoFurnishRoomCommand(this.engine, this.insideBuildingId));
  }

  public clearLaserMeasure(): void {
    this.laserPoints = [];
    this.laserDistanceM = null;
    this.lastLaserLabelText = '';
    if (this.laserLineMesh && this.engine?.scene) {
      this.engine.scene.remove(this.laserLineMesh);
      this.laserLineMesh = null;
    }
    if (this.laserLabelSprite && this.engine?.scene) {
      this.engine.scene.remove(this.laserLabelSprite);
      this.laserLabelSprite = null;
    }
  }

  private createLaserLabelSprite(text: string): THREE.Sprite {
    if (typeof document === 'undefined') {
      const fallback = new THREE.Sprite();
      fallback.userData = { labelText: text };
      return fallback;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(12, 10, 232, 44, 22);
      } else {
        ctx.rect(12, 10, 232, 44);
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.65)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '600 22px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.35, 0.34, 1);
    sprite.userData = { labelText: text };
    return sprite;
  }

  public traverseFloor(direction: 'up' | 'down'): boolean {
    const bld = this.buildingManager?.getBuildingAtPosition?.(this.position.x, this.position.z);
    if (!bld && !this.insideBuildingId) return false;

    if (bld) {
      const total = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));
      this.totalFloors = total;
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.floorHeight = bld.floorHeight || 3.2;
    }

    const flH = bld?.floorHeight || this.floorHeight || 3.2;
    const plinth = bld?.plinthHeight ?? 0;
    const baseY = bld ? bld.position.y + plinth : 0;

    if (direction === 'up' && this.targetFloor < this.totalFloors) {
      this.targetFloor++;
      this.currentFloor = this.targetFloor;
      this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
      this.position.y = this.targetFloorGroundY + this.eyeHeight;
      this.smoothedCameraY = this.position.y;
      this.camera.position.copy(this.position);
      this.emitState();
      return true;
    } else if (direction === 'down' && this.targetFloor > 1) {
      this.targetFloor--;
      this.currentFloor = this.targetFloor;
      this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
      this.position.y = this.targetFloorGroundY + this.eyeHeight;
      this.smoothedCameraY = this.position.y;
      this.camera.position.copy(this.position);
      this.emitState();
      return true;
    }
    return false;
  }

  public goToFloor(floorNum: number): boolean {
    const bld = this.buildingManager?.getBuildingAtPosition?.(this.position.x, this.position.z);
    if (!bld && !this.insideBuildingId) return false;

    if (bld) {
      const total = Math.max(1, bld.floorCount || (bld.floors ? bld.floors.length : 1));
      this.totalFloors = total;
      this.insideBuildingId = bld.id;
      this.insideBuildingName = bld.name;
      this.floorHeight = bld.floorHeight || 3.2;
    }

    if (floorNum < 1 || floorNum > this.totalFloors) return false;

    this.targetFloor = floorNum;
    this.currentFloor = floorNum;
    const flH = bld?.floorHeight || this.floorHeight || 3.2;
    const plinth = bld?.plinthHeight ?? 0.35;
    const baseY = bld ? bld.position.y + plinth : 0;
    this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
    this.position.y = this.targetFloorGroundY + this.eyeHeight;
    this.smoothedCameraY = this.position.y;
    this.camera.position.copy(this.position);
    this.emitState();
    return true;
  }

  public cycleInteriorVariant(): string {
    const variants: ('Standar Tropis' | 'Open-Plan Modern' | 'Kompak')[] = [
      'Standar Tropis',
      'Open-Plan Modern',
      'Kompak'
    ];
    const nextIdx = (variants.indexOf(this.currentVariantName) + 1) % variants.length;
    this.currentVariantName = variants[nextIdx];

    if (this.onCycleInteriorVariant) {
      this.onCycleInteriorVariant();
    }
    if (this.insideBuildingId && this.buildingManager) {
      const bld = this.buildingManager.buildings.get(this.insideBuildingId);
      if (bld) {
        const variantKeys: Record<'Standar Tropis' | 'Open-Plan Modern' | 'Kompak', 'variant_a' | 'variant_b' | 'variant_c'> = {
          'Standar Tropis': 'variant_a',
          'Open-Plan Modern': 'variant_b',
          'Kompak': 'variant_c'
        };
        bld.interiorVariant = variantKeys[this.currentVariantName];
        this.buildingManager.updateBuilding(bld);
      }
    }
    try {
      proceduralAudio.playClick();
    } catch {}
    this.emitState();
    return this.currentVariantName;
  }

  public toggleCeilingLight(): boolean {
    this.isCeilingLightOn = !this.isCeilingLightOn;
    this.manualLightOverride = this.isCeilingLightOn;
    try {
      proceduralAudio.playClick();
    } catch {}

    const iis = InteriorInteractiveSystem.getInstance();
    iis.ceilingLightMasterEnabled = Boolean(this.insideBuildingId && this.isCeilingLightOn);
    iis.activeIndoorBuildingId = this.insideBuildingId;
    iis.updateCeilingLights(
      this.position,
      Boolean(this.insideBuildingId && this.isCeilingLightOn),
      this.insideBuildingId
    );

    if (this.onToggleCeilingLight) {
      this.onToggleCeilingLight();
    }
    this.emitState();
    return this.isCeilingLightOn;
  }

  public getCurrentRoomMetrics(): MicroRoomMetrics | null {
    if (!this.insideBuildingId || !this.buildingManager) return null;
    const bld = this.buildingManager.buildings.get(this.insideBuildingId);
    if (!bld || !bld.interiorLayouts || bld.interiorLayouts.length === 0) return null;

    const floorIdx = Math.max(0, Math.min(bld.interiorLayouts.length - 1, this.currentFloor - 1));
    const layout = bld.interiorLayouts[floorIdx];
    if (!layout || !layout.rooms || layout.rooms.length === 0) return null;

    this._scratchMoveDir.subVectors(this.position, bld.position);
    this._scratchMoveDir.applyAxisAngle(this._scratchUpDir, -bld.rotationY);
    const localPt = new THREE.Vector2(this._scratchMoveDir.x, this._scratchMoveDir.z);

    let activeRoom = layout.rooms.find((r) => PolygonMath.isPointInPolygon(localPt, r.boundary));
    if (!activeRoom) {
      activeRoom = layout.rooms[0];
    }

    const daylightFactor = activeRoom.type === 'living_room' || activeRoom.type === 'terrace' ? 0.025 : 0.016;
    const rawLux = Math.round(9500 * daylightFactor + (this.isCeilingLightOn ? 320 : 55));
    const lux = Math.max(40, Math.min(1000, rawLux));

    let sniLuxStatus: MicroRoomMetrics['sniLuxStatus'] = 'Optimum (SNI)';
    if (lux < 120) sniLuxStatus = 'Kurang Cahaya';
    else if (lux > 500) sniLuxStatus = 'Terlalu Terang';
    else if (lux >= 150 && lux <= 350) sniLuxStatus = 'Optimum (SNI)';
    else sniLuxStatus = 'Cukup';

    const ach = activeRoom.type === 'terrace' ? 12.5 : 6.4;
    const temperatureC = 27.6;
    const noiseDba = activeRoom.type === 'terrace' ? 56 : 41;

    const variantKey = bld.interiorVariant || 'variant_a';
    const variantNames: Record<string, string> = {
      variant_a: 'Varian A: Standar Tropis',
      variant_b: 'Varian B: Open-Plan Modern',
      variant_c: 'Varian C: Kompak Efisien'
    };

    return {
      roomId: activeRoom.id,
      roomName: activeRoom.name,
      floorLabel: `Lantai ${this.currentFloor}`,
      areaM2: Math.round(activeRoom.areaM2 * 10) / 10,
      lux,
      sniLuxStatus,
      ach,
      temperatureC,
      noiseDba,
      interiorVariantName: variantNames[variantKey] || 'Varian A: Standar Tropis'
    };
  }

  public getInsideBuildingId(): string | null {
    return this.insideBuildingId;
  }

  public emitState(): void {
    if (!this.onStateChanged) return;
    this.onStateChanged({
      isActive: this.isActive,
      position: this.position,
      yaw: this.yaw,
      pitch: this.pitch,
      isGrounded: this.isGrounded,
      isSprinting: this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight'),
      isUnderRoof: this.isUnderRoof,
      insideBuildingId: this.insideBuildingId,
      insideBuildingName: this.insideBuildingName,
      currentFloor: this.currentFloor,
      totalFloors: this.totalFloors,
      isSeated: this.isSeated,
      nearbySeatLabel: this.nearbySeat ? this.nearbySeat.label : null,
      activeDockTab: this.activeDockTab,
      selectedFurnitureId: this.selectedFurnitureId,
      selectedExteriorId: this.selectedExteriorId,
      selectedMaterialId: this.selectedMaterialId,
      activeTool: this.activeTool,
      isPlacementValid: this.isPlacementValid,
      hoveredFurnitureName: this.hoveredFurniture ? this.hoveredFurniture.name : null,
      laserDistanceM: this.laserDistanceM,
      reticleActionLabel: this.reticleActionLabel,
      isDrawerOpen: this.isDrawerOpen,
      isGrabbingFurniture: Boolean(this.grabbedFurniture)
    });
  }

  public dispose(): void {
    this.exit();
    if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
      document.removeEventListener('pointerlockchange', this.onPointerLockChange);
      document.removeEventListener('mousemove', this.onMouseMove);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
    }
    if (this.domElement) {
      this.domElement.removeEventListener('click', this.onCanvasClick);
      this.domElement.removeEventListener('wheel', this.onWheel);
    }
  }
}
