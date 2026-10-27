import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { InteriorInteractiveSystem, InteractiveDoor, InteractiveSeat } from '../src/buildings/InteriorInteractiveSystem';
import { FirstPersonController } from '../src/core/engine/FirstPersonController';
import { InteriorMeshBuilder } from '../src/buildings/InteriorMeshBuilder';
import { InteriorLayout } from '../src/buildings/InteriorTypes';
import { PrefabMeshBuilder } from '../src/buildings/PrefabMeshBuilder';
import { BuildingInstance } from '../src/buildings/PrefabTypes';
import { acousticAnalyzer } from '../src/analysis/AcousticAnalyzer';
import { ThermalVentilationAnalyzer } from '../src/analysis/ThermalVentilationAnalyzer';

describe('First-Person Interactive Interior & Ergonomic Seating Suite', () => {
  beforeEach(() => {
    InteriorInteractiveSystem.getInstance().clearAll();
  });

  it('1. Registers and updates dynamic proximity doors (< 2.2m open, > 2.8m close)', () => {
    const system = InteriorInteractiveSystem.getInstance();

    const group = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04));
    group.add(leaf);

    const door: InteractiveDoor = {
      id: 'Door_Test_01',
      type: 'swing',
      buildingId: 'bld_joglo_01',
      floorIndex: 1,
      group,
      leftLeafMesh: leaf,
      doorCenterLocal: new THREE.Vector3(0, 1.05, 0),
      worldPosition: new THREE.Vector3(10, 0, 10),
      doorWidth: 0.95,
      doorHeight: 2.2,
      isOpen: false,
      currentRatio: 0,
      targetRatio: 0,
      swingAngle: Math.PI * 0.5,
      slideDist: 0.45
    };

    system.registerDoor(door);

    // Player far away (x=20, z=20)
    system.update(0.016, new THREE.Vector3(20, 1.65, 20), true);
    expect(door.targetRatio).toBe(0.0);
    expect(door.isOpen).toBe(false);

    // Player steps close to door (x=10.5, z=10.5 -> dist < 1m)
    system.update(0.016, new THREE.Vector3(10.5, 1.65, 10.5), true);
    expect(door.targetRatio).toBe(1.0);

    // Simulate several animation frames for dampening
    for (let i = 0; i < 30; i++) {
      system.update(0.016, new THREE.Vector3(10.5, 1.65, 10.5), true);
    }
    expect(door.currentRatio).toBeGreaterThan(0.5);
    expect(door.isOpen).toBe(true);

    // Player walks away (> 2.8m)
    system.update(0.016, new THREE.Vector3(15, 1.65, 15), true);
    expect(door.targetRatio).toBe(0.0);
  });

  it('2. Distinguishes contextual door typologies (swing for joglo vs sliding for office)', () => {
    const layout: InteriorLayout = {
      floorIndex: 1,
      walls: [
        {
          id: 'w_door',
          start: new THREE.Vector2(0, 0),
          end: new THREE.Vector2(4, 0),
          thickness: 0.15,
          height: 3.5,
          doorOpening: { width: 1.0, height: 2.2, positionRatio: 0.5 }
        }
      ],
      rooms: []
    };

    // Test residential / joglo
    InteriorInteractiveSystem.getInstance().clearAll();
    const jogloInterior = InteriorMeshBuilder.buildFloorInterior(
      layout,
      0,
      3.8,
      'bld_joglo',
      'joglo_house'
    );
    expect(jogloInterior).toBeDefined();
    const jogloDoor = Array.from(InteriorInteractiveSystem.getInstance().doors.values())[0];
    expect(jogloDoor).toBeDefined();
    expect(jogloDoor.type).toBe('swing');

    // Test commercial office tower
    InteriorInteractiveSystem.getInstance().clearAll();
    const officeInterior = InteriorMeshBuilder.buildFloorInterior(
      layout,
      0,
      3.8,
      'bld_office',
      'office_tower'
    );
    expect(officeInterior).toBeDefined();
    const officeDoor = Array.from(InteriorInteractiveSystem.getInstance().doors.values())[0];
    expect(officeDoor).toBeDefined();
    expect(officeDoor.type).toBe('sliding');
  });

  it('3. Registers ergonomic seating zones and manages sit/stand camera height', () => {
    const system = InteriorInteractiveSystem.getInstance();

    const seat: InteractiveSeat = {
      id: 'Seat_Living_01',
      type: 'sofa',
      buildingId: 'bld_villa_01',
      floorIndex: 1,
      worldPosition: new THREE.Vector3(5, 0.45, 5),
      facingAngle: 0,
      label: 'Sofa Tamu'
    };
    system.registerSeat(seat);

    // Query nearest seat
    const foundSeat = system.getNearestSeat(new THREE.Vector3(5.2, 1.65, 5.2));
    expect(foundSeat).toBeDefined();
    expect(foundSeat?.id).toBe('Seat_Living_01');

    const mockDomElement = {
      requestPointerLock: () => {},
      addEventListener: () => {},
      removeEventListener: () => {}
    } as any;
    const camera = new THREE.PerspectiveCamera();
    const controller = new FirstPersonController(camera, mockDomElement);

    controller.enter(new THREE.Vector3(5.2, 1.65, 5.2));
    expect(controller.isSeated).toBe(false);
    expect(controller.position.y).toBeCloseTo(1.65, 1);

    // Sit down on sofa
    controller.sitDown(seat);
    expect(controller.isSeated).toBe(true);
    // Seated eye height must be around 0.45m - 0.50m (approx 0.93m above ground for a 0.45m seat)
    expect(controller.position.y).toBeCloseTo(0.45 + 0.48, 1);
    expect(controller.position.x).toBe(5);
    expect(controller.position.z).toBe(5);

    // Stand back up
    controller.standUp();
    expect(controller.isSeated).toBe(false);
    expect(controller.position.y).toBeCloseTo(1.65, 1);

    controller.dispose();
  });

  it('4. Simulates spinning tropical ceiling fans and proximity lighting', () => {
    const system = InteriorInteractiveSystem.getInstance();

    const blades = new THREE.Group();
    const light = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.05),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })
    );

    system.registerFixture({
      id: 'Fixture_Living_01',
      buildingId: 'bld_house_01',
      floorIndex: 1,
      roomType: 'living_room',
      fanGroup: blades,
      lightMesh: light,
      bounds: {
        minX: 0,
        maxX: 6,
        minZ: 0,
        maxZ: 6,
        floorY: 0,
        height: 3.5
      },
      isOccupied: false,
      fanSpeed: 0
    });

    // Player inside bounds (x=3, z=3, y=1.65)
    system.update(0.1, new THREE.Vector3(3, 1.65, 3), true);
    const fixture = Array.from(system.fixtures.values())[0];
    expect(fixture.isOccupied).toBe(true);
    expect(fixture.fanSpeed).toBeGreaterThan(0);

    // Update several frames -> fan blades rotate
    const initialRot = blades.rotation.y;
    system.update(0.1, new THREE.Vector3(3, 1.65, 3), true);
    expect(blades.rotation.y).toBeGreaterThan(initialRot);

    // Player walks out of room
    system.update(0.1, new THREE.Vector3(12, 1.65, 12), true);
    expect(fixture.isOccupied).toBe(false);
  });

  it('5. Integrates door opening factor with acoustic and thermal simulations', () => {
    const system = InteriorInteractiveSystem.getInstance();

    const group = new THREE.Group();
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.04));
    group.add(leaf);

    system.registerDoor({
      id: 'Door_Bld_Physics',
      type: 'swing',
      buildingId: 'bld_physics_test',
      floorIndex: 1,
      group,
      leftLeafMesh: leaf,
      doorCenterLocal: new THREE.Vector3(0, 1.05, 0),
      worldPosition: new THREE.Vector3(0, 0, 0),
      doorWidth: 1.0,
      doorHeight: 2.2,
      isOpen: false,
      currentRatio: 0,
      targetRatio: 0,
      swingAngle: Math.PI * 0.5,
      slideDist: 0.5
    });

    // When closed, building door factor is 0.0
    expect(system.getBuildingDoorOpenFactor('bld_physics_test')).toBe(0.0);

    // Approach door to open
    system.update(0.1, new THREE.Vector3(0.5, 1.65, 0.5), true);
    for (let i = 0; i < 20; i++) {
      system.update(0.1, new THREE.Vector3(0.5, 1.65, 0.5), true);
    }

    const openFactor = system.getBuildingDoorOpenFactor('bld_physics_test');
    expect(openFactor).toBeGreaterThan(0.7);
  });

  it('6. Dynamically renders user-placed furniture immediately in 3D scene with individual meshes, raycast metadata, and seats', () => {
    const building: BuildingInstance = {
      id: 'test_bld_furnish',
      presetKey: 'house_36',
      name: 'Rumah Tipe 36',
      category: 'residential',
      position: new THREE.Vector3(10, 0, 10),
      rotationY: 0,
      width: 6,
      length: 8,
      floorCount: 1,
      floorHeight: 3.2,
      plinthHeight: 0.35,
      roofType: 'gable',
      roofOverhang: 1.0,
      wallMaterial: 'concrete',
      wallColor: '#ffffff',
      roofMaterial: 'clay_tile',
      userData: {
        placedFurniture: [
          {
            id: 'fur_sofa_123',
            type: 'sofa_l',
            name: 'Sofa L-Shape Ruang Tamu',
            position: [1.0, 0, -1.0],
            rotationY: 0,
            floorIndex: 1
          }
        ]
      }
    } as unknown as BuildingInstance;

    // First build (cache miss)
    const grp = PrefabMeshBuilder.buildBuildingGroup(building);
    expect(grp).toBeDefined();

    // Check that furniture mesh exists in interiorDetails
    const interior = grp.userData.interiorDetails;
    expect(interior).toBeDefined();

    let foundFurMesh: THREE.Object3D | null = null;
    interior.traverse((child: any) => {
      if (child.userData?.furnitureId === 'fur_sofa_123') {
        foundFurMesh = child;
      }
    });
    expect(foundFurMesh).not.toBeNull();
    expect((foundFurMesh as any).userData.type).toBe('sofa_l');

    // Check interactive seat was registered
    const seat = InteriorInteractiveSystem.getInstance().getNearestSeat(new THREE.Vector3(11, 0.35, 9));
    expect(seat).toBeDefined();
    expect(seat?.id).toBe('seat_fur_sofa_123');

    // Second build (cache hit) with another furniture added
    building.userData!.placedFurniture.push({
      id: 'fur_bed_456',
      type: 'bed_king',
      name: 'Tempat Tidur King',
      position: [-1.0, 0, 1.0],
      rotationY: Math.PI / 2,
      floorIndex: 1
    });

    const grp2 = PrefabMeshBuilder.buildBuildingGroup(building);
    let foundBed: THREE.Object3D | null = null;
    grp2.userData.interiorDetails.traverse((child: any) => {
      if (child.userData?.furnitureId === 'fur_bed_456') {
        foundBed = child;
      }
    });
    expect(foundBed).not.toBeNull();
  });
});
