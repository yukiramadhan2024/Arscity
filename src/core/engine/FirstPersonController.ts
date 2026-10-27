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
  FIRST_PERSON_MATERIAL_PALETTE
} from '../../buildings/FirstPersonFurnitureCatalog';
import {
  PlaceFurnitureCommand,
  RemoveFurnitureCommand,
  AutoFurnishRoomCommand,
  PaintSurfaceCommand,
  PlacedFurnitureData,
  AddBuildingCommand,
  AddLandscapeItemCommand
} from '../commands/CityCommands';
import { springAnimator } from './SpringAnimator';
import { showSnackbar } from '../../ui/state/useSnackbarStore';
import type { Engine } from './Engine';

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

  // Speeds
  public walkSpeed: number = 4.0;   // m/s
  public sprintSpeed: number = 7.5; // m/s
  public jumpSpeed: number = 6.0;   // m/s
  public gravity: number = -18.0;   // m/s²
  public eyeHeight: number = 1.65;  // Human scale 1.65m

  private velocityY: number = 0;
  private isGrounded: boolean = true;
  public isUnderRoof: boolean = false;

  // Interactive Seating (0.45m Ergonomic Height)
  public isSeated: boolean = false;
  public seatedSeat: InteractiveSeat | null = null;
  public nearbySeat: InteractiveSeat | null = null;

  // Multi-floor traversal & interior location state
  public insideBuildingId: string | null = null;
  public insideBuildingName: string | null = null;
  public currentFloor: number = 1;
  public targetFloor: number = 1;
  public totalFloors: number = 1;
  public floorHeight: number = 3.2;
  private targetFloorGroundY: number = 0;

  // Keyboard and mouse input state
  private keysDown: Set<string> = new Set();
  public isPointerLocked: boolean = false;
  public isDrawerOpen: boolean = false;

  // Center Raycaster & Builder Dock State
  public centerRaycaster: THREE.Raycaster;
  public activeDockTab: 'furniture' | 'exterior' | 'tools' | null = 'furniture';
  public selectedFurnitureId: string = 'sofa_l';
  public selectedExteriorId: string = 'tree_tabebuya_pink';
  public selectedMaterialId: string = 'wood_teak';
  public activeTool: 'pointer' | 'material_painter' | 'laser_measure' = 'pointer';
  public placementRotation: number = 0; // In radians, 15° steps
  public exteriorDistance: number = 14.0; // In meters (8m - 35m)
  public ghostGroup: THREE.Group | null = null;
  public isPlacementValid: boolean = false;
  public currentPlacementTarget: THREE.Vector3 = new THREE.Vector3();
  public hoveredFurniture: { id: string; name: string; buildingId: string } | null = null;
  public hoveredSurface: { type: 'wall' | 'floor'; buildingId: string; point: THREE.Vector3 } | null = null;
  public laserPoints: THREE.Vector3[] = [];
  public laserDistanceM: number | null = null;
  public laserLineMesh: THREE.Line | null = null;
  public laserLabelSprite: THREE.Sprite | null = null;
  public reticleActionLabel: string | null = null;

  private currentGhostType: string = '';
  private currentGhostValid: boolean | null = null;

  // Collision raycasters
  private downRaycaster: THREE.Raycaster;
  private upRaycaster: THREE.Raycaster;
  private horizontalRaycaster: THREE.Raycaster;

  // Callbacks
  public onStateChanged?: (state: FirstPersonState) => void;
  public onExit?: () => void;
  public onCycleInteriorVariant?: () => void;
  public onToggleCeilingLight?: () => void;
  public isCeilingLightOn: boolean = false;
  private warmCeilingLight: THREE.PointLight | null = null;
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

    this.centerRaycaster = new THREE.Raycaster();
    this.downRaycaster = new THREE.Raycaster();
    this.downRaycaster.far = 100.0;
    this.upRaycaster = new THREE.Raycaster();
    this.upRaycaster.far = 30.0;
    this.horizontalRaycaster = new THREE.Raycaster();
    this.horizontalRaycaster.far = 0.55;

    this.bindEvents();
  }

  public setEngine(engine: Engine): void {
    this.engine = engine;
    this.buildingManager = engine.buildingManager;
    this.terrain = engine.terrain;
  }

  private bindEvents(): void {
    if (typeof document !== 'undefined') {
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
    this.isPointerLocked = document.pointerLockElement === this.domElement;
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
    if (!this.isActive) return;

    if (this.isDrawerOpen) {
      this.toggleDrawer(false);
      this.lockPointer();
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
      // Left click interaction
      this.executePlacement();
    }
  };

  public toggleDrawer(open?: boolean): void {
    this.isDrawerOpen = open !== undefined ? open : !this.isDrawerOpen;
    if (this.isDrawerOpen) {
      this.clearGhostPreview();
      if (typeof document !== 'undefined' && document.pointerLockElement === this.domElement) {
        document.exitPointerLock();
      }
    } else {
      this.clearGhostPreview();
    }
    this.emitState();
  }

  public selectHotbarIndex(index: number): void {
    if (this.insideBuildingId) {
      const item = FIRST_PERSON_FURNITURE_CATALOG[index];
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
      const item = FIRST_PERSON_EXTERIOR_CATALOG[index];
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

    if (this.activeDockTab === 'exterior') {
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
    this.keysDown.add(e.code);

    if (e.code === 'Space' && this.isGrounded) {
      if (this.isSeated) {
        this.standUp();
      } else {
        this.velocityY = this.jumpSpeed;
        this.isGrounded = false;
      }
    } else if (e.code === 'KeyR') {
      this.rotatePlacement(Math.PI / 12);
    } else if (e.code === 'KeyX') {
      this.executeRemove();
    } else if (e.code === 'KeyC') {
      this.activeTool = this.activeTool === 'material_painter' ? 'pointer' : 'material_painter';
      this.clearLaserMeasure();
      this.emitState();
    } else if (e.code === 'KeyM') {
      this.activeTool = this.activeTool === 'laser_measure' ? 'pointer' : 'laser_measure';
      if (this.activeTool === 'pointer') {
        this.clearLaserMeasure();
      }
      this.emitState();
    } else if (e.code === 'KeyF') {
      this.sitOrStand();
    } else if (e.code === 'KeyL') {
      this.toggleCeilingLight();
    } else if (e.code === 'Tab' || e.code === 'KeyB') {
      e.preventDefault();
      this.toggleDrawer();
    } else if (e.code.startsWith('Digit')) {
      const num = parseInt(e.code.replace('Digit', ''), 10);
      if (num >= 1 && num <= 9) {
        this.selectHotbarIndex(num - 1);
      }
    } else if (e.code === 'Escape') {
      if (this.isSeated) {
        this.standUp();
      } else if (this.isDrawerOpen) {
        this.toggleDrawer(false);
      } else if (this.activeTool !== 'pointer') {
        this.activeTool = 'pointer';
        this.clearLaserMeasure();
        this.emitState();
      } else if (this.isPointerLocked) {
        if (typeof document !== 'undefined') {
          document.exitPointerLock();
        }
      } else if (this.onExit) {
        this.onExit();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysDown.delete(e.code);
  };

  public rotatePlacement(delta: number): void {
    this.placementRotation = (this.placementRotation + delta) % (Math.PI * 2);
    if (this.placementRotation < 0) this.placementRotation += Math.PI * 2;
    try {
      proceduralAudio.playClick();
    } catch {}
  }

  public sitOrStand(): void {
    if (this.isSeated) {
      this.standUp();
    } else if (this.nearbySeat) {
      this.sitDown(this.nearbySeat);
    } else if (this.insideBuildingId) {
      this.isSeated = true;
      this.eyeHeight = 1.10;
      this.position.y = this.calculateGroundHeight(this.position.x, this.position.z) + this.eyeHeight;
      try {
        proceduralAudio.playSitDown();
      } catch {}
      this.emitState();
    }
  }

  public enter(startPos?: THREE.Vector3, initialYaw?: number): void {
    this.isActive = true;
    if (startPos) {
      this.position.copy(startPos);
    }
    if (initialYaw !== undefined) {
      this.yaw = initialYaw;
    }
    this.pitch = 0;
    this.velocityY = 0;
    this.keysDown.clear();
    this.currentFloor = 1;
    this.targetFloor = 1;
    this.isSeated = false;
    this.seatedSeat = null;
    this.eyeHeight = 1.65;

    const groundY = this.calculateGroundHeight(this.position.x, this.position.z, true);
    this.position.y = groundY + this.eyeHeight;

    try {
      if (this.domElement && typeof this.domElement.requestPointerLock === 'function') {
        this.domElement.requestPointerLock();
      }
    } catch {
      // Pointer lock may require user click
    }

    this.emitState();
  }

  public exit(): void {
    this.isActive = false;
    this.keysDown.clear();
    this.clearGhostPreview();
    this.clearLaserMeasure();
    if (typeof document !== 'undefined' && document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
    this.emitState();
  }

  public lockPointer(): void {
    if (this.isActive && this.domElement && typeof this.domElement.requestPointerLock === 'function') {
      this.domElement.requestPointerLock();
    }
  }

  public sitDown(seat: InteractiveSeat): void {
    this.isSeated = true;
    this.seatedSeat = seat;
    this.position.x = seat.worldPosition.x;
    this.position.z = seat.worldPosition.z;
    this.position.y = seat.worldPosition.y + 0.48; // Ergonomic 0.45-0.50m sitting eye height
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
    this.eyeHeight = 1.65;
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    this.position.y = groundY + this.eyeHeight;
    try {
      proceduralAudio.playStandUp();
    } catch {}
    this.emitState();
  }

  public update(deltaTime: number): void {
    if (!this.isActive) return;

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
        this.camera.position.copy(this.position);
        this._scratchLookTarget.set(
          this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
          this.position.y + Math.sin(this.pitch),
          this.position.z + Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        this.camera.lookAt(this._scratchLookTarget);
        this.updateCenterRaycast();
        this.updateGhostPreview();
        this.emitState();
        return;
      }
    }

    // Query nearby chair/sofa
    this.nearbySeat = InteriorInteractiveSystem.getInstance().getNearestSeat(this.position);

    const dt = Math.min(deltaTime, 0.1);
    const isSprinting = this.keysDown.has('ShiftLeft') || this.keysDown.has('ShiftRight');
    const speed = (isSprinting ? this.sprintSpeed : this.walkSpeed) * dt;

    let forward = 0;
    let strafe = 0;

    if (this.keysDown.has('KeyW') || this.keysDown.has('ArrowUp')) forward += 1;
    if (this.keysDown.has('KeyS') || this.keysDown.has('ArrowDown')) forward -= 1;
    if (this.keysDown.has('KeyA') || this.keysDown.has('ArrowLeft')) strafe -= 1;
    if (this.keysDown.has('KeyD') || this.keysDown.has('ArrowRight')) strafe += 1;

    if (forward !== 0 || strafe !== 0) {
      const len = Math.hypot(forward, strafe);
      forward /= len;
      strafe /= len;

      const sinY = Math.sin(this.yaw);
      const cosY = Math.cos(this.yaw);

      const dx = (sinY * forward - cosY * strafe) * speed;
      const dz = (cosY * forward + sinY * strafe) * speed;

      const canMove = this.testWallCollision(dx, dz);
      if (canMove) {
        this.position.x += dx;
        this.position.z += dz;
      } else {
        if (this.testWallCollision(dx, 0)) {
          this.position.x += dx;
        } else if (this.testWallCollision(0, dz)) {
          this.position.z += dz;
        }
      }
    }

    // Apply gravity & jumping
    this.velocityY += this.gravity * dt;
    this.position.y += this.velocityY * dt;

    // Ground and Multi-Floor Collision
    const groundY = this.calculateGroundHeight(this.position.x, this.position.z);
    const targetY = groundY + this.eyeHeight;

    if (this.position.y <= targetY) {
      this.position.y = targetY;
      this.velocityY = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    this.isUnderRoof = this.checkIfUnderRoof(this.position);

    // Apply to Three.js camera
    this.camera.position.copy(this.position);
    this._scratchLookTarget.set(
      this.position.x + Math.sin(this.yaw) * Math.cos(this.pitch),
      this.position.y + Math.sin(this.pitch),
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
      const inPoly = PolygonMath.isPointInPolygon({ x: localX, y: localZ }, bld.footprintPolygon.map((p) => ({ x: p.x, y: p.y })));
      if (!inPoly) return false;
    }

    return Math.abs(localX) <= hw && Math.abs(localZ) <= hl;
  }

  private testWallCollision(dx: number, dz: number): boolean {
    const moveLen = Math.hypot(dx, dz);
    if (moveLen < 0.0001) return true;

    this._scratchMoveDir.set(dx, 0, dz).normalize();
    // Test at waist and chest heights
    this._scratchOriginWaist.set(this.position.x, this.position.y - 0.75, this.position.z);
    this._scratchOriginChest.set(this.position.x, this.position.y - 0.35, this.position.z);

    if (!this.buildingManager || this.buildingManager.masterGroup.children.length === 0) {
      return true;
    }

    // Player collision radius: 0.20m (allows smooth navigation through doorways and between indoor furniture)
    const playerRadius = 0.20;
    const origins = [this._scratchOriginWaist, this._scratchOriginChest];
    for (const origin of origins) {
      this.horizontalRaycaster.set(origin, this._scratchMoveDir);
      this.horizontalRaycaster.far = Math.max(0.35, moveLen + playerRadius);

      const hits = this.horizontalRaycaster.intersectObjects(
        this.buildingManager.masterGroup.children,
        true
      );

      for (const hit of hits) {
        // Skip door leaves, portal casings, interactive doors, and placed furniture
        if (
          hit.object.userData?.isDoor ||
          hit.object.userData?.isWalkThroughPortal ||
          hit.object.userData?.furnitureId ||
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

    // Raycast down to find elevated floors, decks, or rooftops.
    // When isSpawning = true, cast from high up to detect starting ground/deck.
    // When moving, cast from slightly above current feet to prevent snapping onto roofs/ceilings overhead.
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
        // Upward-facing walkable surfaces
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
    return hits.length > 0;
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

    // 1. Check hovered placed furniture if inside building
    if (isInside && this.insideBuildingId && this.buildingManager) {
      const bldGroup = this.buildingManager.getBuildingGroup(this.insideBuildingId);
      if (bldGroup) {
        const hits = this.centerRaycaster.intersectObjects(bldGroup.children, true);
        for (const hit of hits) {
          let cur: THREE.Object3D | null = hit.object;
          while (cur && cur !== bldGroup) {
            if (cur.userData?.furnitureId) {
              const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === cur?.userData?.type);
              this.hoveredFurniture = {
                id: cur.userData.furnitureId,
                name: furItem?.name || 'Perabot',
                buildingId: this.insideBuildingId
              };
              this.reticleActionLabel = `[X] Hapus ${this.hoveredFurniture.name}${furItem?.isSeat ? ' • [F] Duduk' : ''}`;
              this.isPlacementValid = true;
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
      const floorHit = hits.find((h) => h.face && h.face.normal.y > 0.7);
      if (floorHit) {
        const targetPos = floorHit.point.clone();

        // Wall Snap: if within < 0.6m from inner wall, snap to wall and orient flush facing room
        const dx = targetPos.x - bld.position.x;
        const dz = targetPos.z - bld.position.z;
        const rot = bld.rotationY || 0;
        const cos = Math.cos(-rot);
        const sin = Math.sin(-rot);
        let localX = cos * dx - sin * dz;
        let localZ = sin * dx + cos * dz;

        const hw = (bld.width || 10) * 0.5 - 0.35;
        const hl = (bld.length || 10) * 0.5 - 0.35;

        let snapped = false;
        let snapLocalRot = 0;
        const furItem = FIRST_PERSON_FURNITURE_CATALOG.find((f) => f.id === this.selectedFurnitureId);
        const furHalfDepth = (furItem?.depth || 1.0) * 0.5;

        if (Math.abs(localX - hw) < 0.6) {
          localX = hw - furHalfDepth;
          snapLocalRot = -Math.PI * 0.5; // Back against +X wall, face -X into room
          snapped = true;
        } else if (Math.abs(localX - (-hw)) < 0.6) {
          localX = -hw + furHalfDepth;
          snapLocalRot = Math.PI * 0.5; // Back against -X wall, face +X into room
          snapped = true;
        } else if (Math.abs(localZ - hl) < 0.6) {
          localZ = hl - furHalfDepth;
          snapLocalRot = Math.PI; // Back against +Z wall, face -Z into room
          snapped = true;
        } else if (Math.abs(localZ - (-hl)) < 0.6) {
          localZ = -hl + furHalfDepth;
          snapLocalRot = 0; // Back against -Z wall, face +Z into room
          snapped = true;
        }

        if (snapped) {
          targetPos.x = bld.position.x + (localX * Math.cos(rot) - localZ * Math.sin(rot));
          targetPos.z = bld.position.z + (localX * Math.sin(rot) + localZ * Math.cos(rot));
          this.placementRotation = (rot + snapLocalRot + Math.PI * 2) % (Math.PI * 2);
        }

        this.currentPlacementTarget.copy(targetPos);

        // Overlap Prevention against existing placed furniture on this floor
        const existing: PlacedFurnitureData[] = bld.userData?.placedFurniture || [];
        const hasOverlap = existing.some((f) => {
          if (f.floorIndex !== this.currentFloor) return false;
          const dist = Math.hypot(f.position[0] - localX, f.position[2] - localZ);
          const minR = Math.max(0.40, Math.min(furItem?.width || 0.8, furItem?.depth || 0.8) * 0.45);
          return dist < minR;
        });

        if (hasOverlap) {
          this.isPlacementValid = false;
          this.reticleActionLabel = 'Area terhalang oleh perabot lain';
        } else {
          this.isPlacementValid = true;
          const name = furItem?.name || 'Perabot';
          this.reticleActionLabel = `[Klik Kiri] Taruh ${name} • [R / Scroll] Putar`;
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
        this.reticleActionLabel = `[Klik Kiri] Bangun ${extItem?.name || ''} • [R / Scroll] Putar`;
      }
    }
  }

  public updateGhostPreview(): void {
    if (!this.isActive || !this.engine?.scene) {
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

        // Draw 3D Midpoint Billboard Distance Badge
        if (this.laserLabelSprite) {
          this.engine.scene.remove(this.laserLabelSprite);
        }
        const midPoint = new THREE.Vector3().addVectors(this.laserPoints[0], this.laserPoints[1]).multiplyScalar(0.5);
        midPoint.y += 0.35;
        this.laserLabelSprite = this.createLaserLabelSprite(`📏 ${this.laserDistanceM} m`);
        this.laserLabelSprite.position.copy(midPoint);
        this.engine.scene.add(this.laserLabelSprite);

        try {
          proceduralAudio.playPlaceBuilding();
          showSnackbar({
            variant: 'info',
            title: 'Pengukuran Laser',
            detail: `Jarak Terukur: ${this.laserDistanceM} meter`
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

      const furData: PlacedFurnitureData = {
        id: `fur_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        type: this.selectedFurnitureId,
        name: furItem?.name || 'Perabot',
        position: [localX, floorY, localZ],
        rotationY: this.placementRotation - rot,
        floorIndex: this.currentFloor
      };

      this.engine.executeCommand(new PlaceFurnitureCommand(this.engine, bld.id, furData));

      // Trigger placement spring animation on building group
      const bldGroup = this.buildingManager?.getBuildingGroup(bld.id);
      if (bldGroup) {
        springAnimator.triggerPlacementSpring(bldGroup);
      }
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
        type: '',
        name: this.hoveredFurniture.name,
        position: [0, 0, 0],
        rotationY: 0,
        floorIndex: 1
      })
    );
    this.hoveredFurniture = null;
  }

  public autoFurnishCurrentRoom(): void {
    if (!this.engine || !this.insideBuildingId) return;
    this.engine.executeCommand(new AutoFurnishRoomCommand(this.engine, this.insideBuildingId));
  }

  public clearLaserMeasure(): void {
    this.laserPoints = [];
    this.laserDistanceM = null;
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
      return new THREE.Sprite();
    }
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(8, 8, 240, 48, 12);
      } else {
        ctx.rect(8, 8, 240, 48);
      }
      ctx.fill();
      ctx.strokeStyle = '#007AFF';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 22px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 128, 32);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(1.4, 0.35, 1);
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
      this.camera.position.copy(this.position);
      this.emitState();
      return true;
    } else if (direction === 'down' && this.targetFloor > 1) {
      this.targetFloor--;
      this.currentFloor = this.targetFloor;
      this.targetFloorGroundY = baseY + (this.targetFloor - 1) * flH;
      this.position.y = this.targetFloorGroundY + this.eyeHeight;
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
    try {
      proceduralAudio.playClick();
    } catch {}

    if (this.isCeilingLightOn) {
      if (!this.warmCeilingLight) {
        this.warmCeilingLight = new THREE.PointLight(0xffecd2, 2.2, 16, 1.2);
        this.warmCeilingLight.castShadow = false;
        this.camera.add(this.warmCeilingLight);
      }
      this.warmCeilingLight.visible = true;
    } else {
      if (this.warmCeilingLight) {
        this.warmCeilingLight.visible = false;
      }
    }
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
      isDrawerOpen: this.isDrawerOpen
    });
  }

  public dispose(): void {
    this.exit();
    if (typeof document !== 'undefined') {
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
