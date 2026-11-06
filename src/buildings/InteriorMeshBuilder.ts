import * as THREE from 'three';
import { InteriorLayout, InteriorWall, InteriorStair, RoomDefinition } from './InteriorTypes';
import { MaterialLibrary } from '../materials/MaterialLibrary';
import { BuildingInstance, StairZone } from './PrefabTypes';
import { InteriorInteractiveSystem, InteractiveDoorType } from './InteriorInteractiveSystem';

export class InteriorMeshBuilder {
  private static getMaterial(type: string, color?: string): THREE.Material {
    if (type === 'warm_light' || type === 'warm_led') {
      return new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    }
    if (type === 'indicator_led') {
      return new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    }
    return MaterialLibrary.getInstance().getMaterial(type, { color });
  }

  /**
   * Builds continuous 3D flight of stairs with landings, handrails, and elevator shaft
   * connecting Floor 1 -> Floor 2 -> ... Floor 18.
   * Generates StairZone bounding boxes stored in buildingInstance.userData.stairZones.
   */
  public static buildBuildingStairwell(
    building: BuildingInstance,
    plinthH: number = 0.35
  ): { stairGroup: THREE.Group; stairZones: StairZone[] } {
    const stairGroup = new THREE.Group();
    stairGroup.name = `Stairwell_${building.id}`;
    const stairZones: StairZone[] = [];

    const totalFloors = Math.max(1, building.floorCount || 1);
    if (totalFloors <= 1) {
      building.userData = building.userData || {};
      building.userData.stairZones = stairZones;
      building.stairZones = stairZones;
      return { stairGroup, stairZones };
    }

    const flH = building.floorHeight || 3.8;
    const woodMat = this.getMaterial('wood_slat', '#78350f');
    const concreteMat = this.getMaterial('concrete_board', '#94a3b8');
    const steelMat = this.getMaterial('frame');
    const metalMat = this.getMaterial('metal', '#cbd5e1');
    const ledMat = this.getMaterial('warm_light');
    const indicatorMat = this.getMaterial('indicator_led');

    // Consistent Stairwell circulation zone (2.8m width x 4.2m length)
    const stairW = 2.8;
    const stairL = 4.2;
    const halfW = stairW * 0.5; // 1.4m
    const halfL = stairL * 0.5; // 2.1m

    // Offset position inside building footprint
    const coreX = -Math.max(1.2, Math.min(building.width * 0.35, (building.width || 12) * 0.22));
    const coreZ = 0;

    // Local coordinates
    const localMinX = coreX - halfW;
    const localMaxX = coreX + halfW;
    const localMinZ = coreZ - halfL;
    const localMaxZ = coreZ + halfL;

    // World coordinates taking rotation into account
    const rot = building.rotationY || 0;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const worldCenterX = building.position.x + (cos * coreX - sin * coreZ);
    const worldCenterZ = building.position.z + (sin * coreX + cos * coreZ);
    const halfExtentX = Math.abs(cos) * halfW + Math.abs(sin) * halfL;
    const halfExtentZ = Math.abs(sin) * halfW + Math.abs(cos) * halfL;

    const minX = worldCenterX - halfExtentX;
    const maxX = worldCenterX + halfExtentX;
    const minZ = worldCenterZ - halfExtentZ;
    const maxZ = worldCenterZ + halfExtentZ;

    for (let fl = 0; fl < totalFloors - 1; fl++) {
      const baseFloorY = plinthH + fl * flH;
      const topFloorY = plinthH + (fl + 1) * flH;

      // 1. Register StairZone for FirstPersonController physical climbing
      const zone: StairZone = {
        minX,
        maxX,
        minZ,
        maxZ,
        direction: 'z',
        floorHeight: flH,
        totalFloors,
        floorIndex: fl,
        baseFloorY,
        topFloorY
      };
      // Store local bounds for precise local relative climbing calculation
      (zone as any).localMinX = localMinX;
      (zone as any).localMaxX = localMaxX;
      (zone as any).localMinZ = localMinZ;
      (zone as any).localMaxZ = localMaxZ;
      stairZones.push(zone);

      // 2. 3D Flight of Steps (16 treads & risers per floor)
      const flightGroup = new THREE.Group();
      flightGroup.position.set(0, 0, 0);

      const stepCount = 16;
      const runLength = 3.2; // 3.2m run inside 4.2m zone
      const flightW = 1.25;
      const flightX = coreX - 0.68;
      const riserH = flH / stepCount;
      const treadD = runLength / stepCount; // 0.20m tread

      for (let s = 0; s < stepCount; s++) {
        const stepY = baseFloorY + (s + 0.5) * riserH;
        const stepZ = (coreZ - runLength * 0.5) + (s + 0.5) * treadD;

        // Tread block
        const stepGeo = new THREE.BoxGeometry(flightW, (s + 1) * riserH, treadD);
        const stepMesh = new THREE.Mesh(stepGeo, woodMat);
        stepMesh.position.set(flightX, baseFloorY + (s + 1) * riserH * 0.5, stepZ);
        stepMesh.castShadow = true;
        stepMesh.receiveShadow = true;
        flightGroup.add(stepMesh);
      }

      // 3. Lower & Upper Landings
      // Lower landing at foot of stairs
      const lowLandGeo = new THREE.BoxGeometry(flightW, 0.15, 0.5);
      const lowLandMesh = new THREE.Mesh(lowLandGeo, concreteMat);
      lowLandMesh.position.set(flightX, baseFloorY + 0.075, coreZ - runLength * 0.5 - 0.25);
      flightGroup.add(lowLandMesh);

      // Upper landing at top of stairs
      const topLandGeo = new THREE.BoxGeometry(flightW, 0.2, 0.5);
      const topLandMesh = new THREE.Mesh(topLandGeo, concreteMat);
      topLandMesh.position.set(flightX, topFloorY - 0.1, coreZ + runLength * 0.5 + 0.25);
      flightGroup.add(topLandMesh);

      // 4. Sloped Handrails & Baluster Posts
      const slopeLen = Math.hypot(runLength, flH);
      const slopeAngle = Math.atan2(flH, runLength);

      // Open side handrail bar
      const railGeo = new THREE.BoxGeometry(0.06, 0.06, slopeLen);
      const railMesh = new THREE.Mesh(railGeo, steelMat);
      railMesh.position.set(flightX + flightW * 0.5 + 0.03, baseFloorY + flH * 0.5 + 0.9, coreZ);
      railMesh.rotation.x = -slopeAngle;
      flightGroup.add(railMesh);

      // Balusters
      for (let b = 0; b <= stepCount; b += 4) {
        const bZ = (coreZ - runLength * 0.5) + b * treadD;
        const bY = baseFloorY + b * riserH + 0.45;
        const balGeo = new THREE.BoxGeometry(0.04, 0.9, 0.04);
        const balMesh = new THREE.Mesh(balGeo, steelMat);
        balMesh.position.set(flightX + flightW * 0.5 + 0.03, bY, bZ);
        flightGroup.add(balMesh);
      }

      // 5. Interactive Elevator Shaft Beside Stairs
      const elevatorX = coreX + 0.72;
      const shaftGeo = new THREE.BoxGeometry(1.2, flH, 1.8);
      const shaftMesh = new THREE.Mesh(shaftGeo, concreteMat);
      shaftMesh.position.set(elevatorX, baseFloorY + flH * 0.5, coreZ);
      flightGroup.add(shaftMesh);

      // Elevator Doors
      const doorGeo = new THREE.BoxGeometry(0.04, 2.2, 1.1);
      const doorMesh = new THREE.Mesh(doorGeo, metalMat);
      doorMesh.position.set(elevatorX + 0.62, baseFloorY + 1.1, coreZ);
      flightGroup.add(doorMesh);

      // Digital Floor Indicator ("L1", "L2", ...)
      const indicatorGeo = new THREE.BoxGeometry(0.04, 0.18, 0.45);
      const indicatorMesh = new THREE.Mesh(indicatorGeo, indicatorMat);
      indicatorMesh.position.set(elevatorX + 0.63, baseFloorY + 2.35, coreZ);
      flightGroup.add(indicatorMesh);

      // Elevator Call Button
      const buttonGeo = new THREE.BoxGeometry(0.04, 0.12, 0.08);
      const buttonMesh = new THREE.Mesh(buttonGeo, ledMat);
      buttonMesh.position.set(elevatorX + 0.63, baseFloorY + 1.1, coreZ + 0.7);
      flightGroup.add(buttonMesh);

      stairGroup.add(flightGroup);
    }

    building.userData = building.userData || {};
    building.userData.stairZones = stairZones;
    building.stairZones = stairZones;

    return { stairGroup, stairZones };
  }

  /**
   * Builds the complete 3D interior architecture for a given floor layout:
   * - Partition walls with 15 cm thickness and 2.2m door apertures
   * - Swung open door panels leaving open passages for walk mode
   * - Floor finishes (parquet & tiles)
   * - Contextual procedural 3D furniture (sofas, desks, beds, dining, kitchen, workstations, etc.)
   */
  public static buildFloorInterior(
    layout: InteriorLayout,
    baseY: number,
    floorHeight: number,
    buildingId: string = 'bld_default',
    buildingArchetype: string = 'residential',
    buildingWorldPos: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    overrideFloorMaterial?: string,
    overrideFloorColor?: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `FloorInterior_L${layout.floorIndex}`;

    const wallMat = this.getMaterial('plaster', '#f1f5f9');
    const woodMat = this.getMaterial('wood_slat', '#78350f');
    const tileMat = this.getMaterial('concrete', '#e2e8f0');
    const bathTileMat = this.getMaterial('concrete', '#94a3b8');
    const darkWoodMat = this.getMaterial('wood_slat', '#451a03');
    const fabricMat = this.getMaterial('plaster', '#cbd5e1');
    const fabricBlue = this.getMaterial('plaster', '#3b82f6');
    const stainlessMat = this.getMaterial('metal', '#cbd5e1');
    const darkSteelMat = this.getMaterial('frame');
    const glassMat = this.getMaterial('glass');
    const ledWarm = this.getMaterial('warm_light');

    const isCommercial = ['office', 'office_tower', 'commercial', 'ruko', 'minimarket', 'mall', 'skyscraper'].some(
      (k) => buildingArchetype.toLowerCase().includes(k)
    );
    const doorType: InteractiveDoorType = isCommercial ? 'sliding' : 'swing';

    // 1. Build Interior Partition Walls with 2.2m Open Doorways
    for (const wall of layout.walls) {
      const p1 = wall.start;
      const p2 = wall.end;
      const dir = new THREE.Vector2().subVectors(p2, p1);
      const len = dir.length();
      if (len < 0.1) continue;

      const angle = Math.atan2(dir.y, dir.x);
      const th = wall.thickness || 0.15;
      const h = wall.height || floorHeight;

      if (!wall.doorOpening) {
        // Solid partition wall
        const geo = new THREE.BoxGeometry(len, h, th);
        const mesh = new THREE.Mesh(geo, wallMat);
        mesh.userData = { surfaceType: 'wall', buildingId };
        const mid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
        mesh.position.set(mid.x, baseY + h * 0.5, mid.y);
        mesh.rotation.y = -angle;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      } else {
        // Wall with door opening (standard 2.2m height)
        const op = wall.doorOpening;
        const doorW = op.width || 0.95;
        const doorH = Math.min(h - 0.2, Math.max(2.2, op.height || 2.2));
        const doorCenter = op.positionRatio * len;

        const leftLen = Math.max(0, doorCenter - doorW * 0.5);
        const rightLen = Math.max(0, len - (doorCenter + doorW * 0.5));
        const lintelH = Math.max(0, h - doorH);

        const subGroup = new THREE.Group();
        subGroup.position.set(p1.x, baseY, p1.y);
        subGroup.rotation.y = -angle;

        // Left wall slice
        if (leftLen > 0.05) {
          const lGeo = new THREE.BoxGeometry(leftLen, h, th);
          const lMesh = new THREE.Mesh(lGeo, wallMat);
          lMesh.position.set(leftLen * 0.5, h * 0.5, 0);
          lMesh.castShadow = true;
          lMesh.receiveShadow = true;
          subGroup.add(lMesh);
        }

        // Right wall slice
        if (rightLen > 0.05) {
          const rGeo = new THREE.BoxGeometry(rightLen, h, th);
          const rMesh = new THREE.Mesh(rGeo, wallMat);
          rMesh.position.set(len - rightLen * 0.5, h * 0.5, 0);
          rMesh.castShadow = true;
          rMesh.receiveShadow = true;
          subGroup.add(rMesh);
        }

        // Top Lintel above door
        if (lintelH > 0.05) {
          const lintelGeo = new THREE.BoxGeometry(doorW, lintelH, th);
          const lintelMesh = new THREE.Mesh(lintelGeo, wallMat);
          lintelMesh.position.set(doorCenter, doorH + lintelH * 0.5, 0);
          lintelMesh.castShadow = true;
          lintelMesh.receiveShadow = true;
          subGroup.add(lintelMesh);
        }

        // Dynamic Interactive Door Panel
        const doorLeafW = doorW - 0.04;
        const doorLeafH = doorH - 0.02;

        if (doorType === 'swing') {
          // 3D Door Frame (Jambs & Header)
          const frameMat = darkSteelMat;
          const jambGeo = new THREE.BoxGeometry(0.04, doorH, th + 0.02);
          const jambL = new THREE.Mesh(jambGeo, frameMat);
          jambL.position.set(doorCenter - doorW * 0.5 + 0.02, doorH * 0.5, 0);
          subGroup.add(jambL);
          const jambR = new THREE.Mesh(jambGeo, frameMat);
          jambR.position.set(doorCenter + doorW * 0.5 - 0.02, doorH * 0.5, 0);
          subGroup.add(jambR);
          const headerGeo = new THREE.BoxGeometry(doorW, 0.04, th + 0.02);
          const headerMesh = new THREE.Mesh(headerGeo, frameMat);
          headerMesh.position.set(doorCenter, doorH - 0.02, 0);
          subGroup.add(headerMesh);

          // HINGED SWING DOOR: Pivot group at the jamb edge
          const doorPivot = new THREE.Group();
          doorPivot.name = 'DoorPivot';
          doorPivot.userData = { isAnimated: true };
          doorPivot.position.set(doorCenter - doorW * 0.5 + 0.02, 0, 0);

          const leafGeo = new THREE.BoxGeometry(doorLeafW, doorLeafH, 0.04);
          const leafMesh = new THREE.Mesh(leafGeo, darkWoodMat);
          leafMesh.name = 'DoorLeafMesh';
          leafMesh.userData = { isAnimated: true };
          leafMesh.position.set(doorLeafW * 0.5, doorLeafH * 0.5, 0);
          leafMesh.castShadow = true;
          doorPivot.add(leafMesh);

          // Metal door handle (both sides: front and back)
          const handleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8);
          const handleFront = new THREE.Mesh(handleGeo, stainlessMat);
          handleFront.rotation.z = Math.PI * 0.5;
          handleFront.position.set(doorLeafW - 0.08, doorLeafH * 0.45, 0.035);
          doorPivot.add(handleFront);

          const handleBack = new THREE.Mesh(handleGeo, stainlessMat);
          handleBack.rotation.z = Math.PI * 0.5;
          handleBack.position.set(doorLeafW - 0.08, doorLeafH * 0.45, -0.035);
          doorPivot.add(handleBack);

          subGroup.add(doorPivot);

          InteriorInteractiveSystem.getInstance().registerDoor({
            id: `Door_${buildingId}_L${layout.floorIndex}_${wall.id}`,
            type: 'swing',
            buildingId,
            floorIndex: layout.floorIndex,
            group: subGroup,
            leftLeafMesh: doorPivot as any,
            doorCenterLocal: new THREE.Vector3(doorCenter, doorH * 0.5, 0),
            worldPosition: new THREE.Vector3(),
            doorWidth: doorW,
            doorHeight: doorH,
            isOpen: false,
            currentRatio: 0,
            targetRatio: 0,
            swingAngle: Math.PI * 0.5,
            slideDist: doorW * 0.45
          });
        } else {
          // SLIDING GLASS DOOR: Two glass panels that slide horizontally left & right
          const slideGroup = new THREE.Group();
          slideGroup.name = 'SlideDoorGroup';
          slideGroup.userData = { isAnimated: true };
          slideGroup.position.set(doorCenter, 0, 0);

          const halfLeafW = doorLeafW * 0.5;
          const leftGeo = new THREE.BoxGeometry(halfLeafW, doorLeafH, 0.03);
          const leftMesh = new THREE.Mesh(leftGeo, glassMat);
          leftMesh.name = 'SlideDoorLeft';
          leftMesh.userData = { isAnimated: true };
          leftMesh.position.set(-halfLeafW * 0.5, doorLeafH * 0.5, 0);
          leftMesh.castShadow = true;
          slideGroup.add(leftMesh);

          const rightGeo = new THREE.BoxGeometry(halfLeafW, doorLeafH, 0.03);
          const rightMesh = new THREE.Mesh(rightGeo, glassMat);
          rightMesh.name = 'SlideDoorRight';
          rightMesh.userData = { isAnimated: true };
          rightMesh.position.set(halfLeafW * 0.5, doorLeafH * 0.5, 0);
          rightMesh.castShadow = true;
          slideGroup.add(rightMesh);

          // Sleek vertical aluminium handles
          const handleL = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.04), darkSteelMat);
          handleL.position.set(-0.04, doorLeafH * 0.48, 0);
          slideGroup.add(handleL);

          const handleR = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.35, 0.04), darkSteelMat);
          handleR.position.set(0.04, doorLeafH * 0.48, 0);
          slideGroup.add(handleR);

          subGroup.add(slideGroup);

          InteriorInteractiveSystem.getInstance().registerDoor({
            id: `Door_${buildingId}_L${layout.floorIndex}_${wall.id}`,
            type: 'sliding',
            buildingId,
            floorIndex: layout.floorIndex,
            group: subGroup,
            leftLeafMesh: leftMesh,
            rightLeafMesh: rightMesh,
            doorCenterLocal: new THREE.Vector3(doorCenter, doorH * 0.5, 0),
            worldPosition: new THREE.Vector3(),
            doorWidth: doorW,
            doorHeight: doorH,
            isOpen: false,
            currentRatio: 0,
            targetRatio: 0,
            swingAngle: 0,
            slideDist: halfLeafW * 0.95
          });
        }

        group.add(subGroup);
      }
    }

    // 2. Build Room Floor Tiles & Contextual Procedural Furniture
    for (const room of layout.rooms) {
      const b = room.boundary;
      if (b.length < 3) continue;

      // Calculate room horizontal bounds
      let minX = Infinity,
        maxX = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (const pt of b) {
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minZ) minZ = pt.y;
        if (pt.y > maxZ) maxZ = pt.y;
      }

      // Interior Floor Surface
      const shape = new THREE.Shape();
      shape.moveTo(b[0].x, b[0].y);
      for (let i = 1; i < b.length; i++) {
        shape.lineTo(b[i].x, b[i].y);
      }
      shape.closePath();

      const floorGeo = new THREE.ShapeGeometry(shape);
      const customFloorMat = overrideFloorMaterial
        ? this.getMaterial(overrideFloorMaterial, overrideFloorColor)
        : null;
      const floorMat = customFloorMat || (room.type === 'bathroom' ? bathTileMat : tileMat);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.userData = { surfaceType: 'floor', buildingId };
      floorMesh.rotation.x = -Math.PI * 0.5;
      floorMesh.position.y = baseY + 0.004; // Flush ceramic finish above slab so placed furniture (+0.01m) never sinks
      if (floorMat && 'polygonOffset' in floorMat) {
        floorMat.polygonOffset = true;
        floorMat.polygonOffsetFactor = -1;
        floorMat.polygonOffsetUnits = -1;
      }
      floorMesh.receiveShadow = true;
      group.add(floorMesh);

      const lp = room.labelPosition;

      // -------------------------------------------------------------
      // CEILING FIXTURES: Tropical Ceiling Fan & Smart Downlight
      // -------------------------------------------------------------
      if (room.type !== 'bathroom') {
        const fanGroup = new THREE.Group();
        fanGroup.position.set(lp.x, baseY + floorHeight - 0.25, lp.y);

        // Motor & Rod
        const motorMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 12), darkWoodMat);
        fanGroup.add(motorMesh);
        const rodMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), darkSteelMat);
        rodMesh.position.y = 0.11;
        fanGroup.add(rodMesh);

        // 4 Wooden Fan Blades
        const bladesGroup = new THREE.Group();
        bladesGroup.name = 'CeilingFanBlades';
        bladesGroup.userData = { isAnimated: true };
        for (let bIdx = 0; bIdx < 4; bIdx++) {
          const bAngle = (bIdx * Math.PI) / 2;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.012, 0.12), woodMat);
          blade.name = `FanBlade_${bIdx}`;
          blade.userData = { isAnimated: true };
          blade.position.set(Math.cos(bAngle) * 0.38, -0.02, Math.sin(bAngle) * 0.38);
          blade.rotation.y = -bAngle;
          bladesGroup.add(blade);
        }
        fanGroup.add(bladesGroup);
        group.add(fanGroup);

        // Recessed Ceiling Downlight
        const lightMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 12), ledWarm);
        lightMesh.position.set(lp.x, baseY + floorHeight - 0.02, lp.y);
        group.add(lightMesh);

        InteriorInteractiveSystem.getInstance().registerFixture({
          id: `Fixture_${buildingId}_L${layout.floorIndex}_${room.id || room.type}`,
          buildingId,
          floorIndex: layout.floorIndex,
          roomType: room.type,
          fanGroup: bladesGroup,
          lightMesh,
          bounds: {
            minX: buildingWorldPos.x + minX,
            maxX: buildingWorldPos.x + maxX,
            minZ: buildingWorldPos.z + minZ,
            maxZ: buildingWorldPos.z + maxZ,
            floorY: buildingWorldPos.y + baseY,
            height: floorHeight
          },
          isOccupied: false,
          fanSpeed: 0
        });
      }

      // -------------------------------------------------------------
      // A. BEDROOM (Kamar Tidur)
      // -------------------------------------------------------------
      if (room.type === 'bedroom') {
        // Wooden Bed Platform
        const bedMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 2.1), woodMat);
        bedMesh.position.set(lp.x, baseY + 0.225, lp.y);
        bedMesh.castShadow = true;
        group.add(bedMesh);

        // White Mattress
        const mattressMesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.2, 2.0), fabricMat);
        mattressMesh.position.set(lp.x, baseY + 0.55, lp.y);
        group.add(mattressMesh);

        // Pillows & Folded Blanket
        const pillow1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.4), fabricMat);
        pillow1.position.set(lp.x - 0.45, baseY + 0.7, lp.y - 0.65);
        group.add(pillow1);
        const pillow2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.4), fabricMat);
        pillow2.position.set(lp.x + 0.45, baseY + 0.7, lp.y - 0.65);
        group.add(pillow2);

        const blanket = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.08, 0.9), fabricBlue);
        blanket.position.set(lp.x, baseY + 0.69, lp.y + 0.55);
        group.add(blanket);

        // Bedside Nightstand & Lamp
        const nightstand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.45), darkWoodMat);
        nightstand.position.set(lp.x + 1.25, baseY + 0.275, lp.y - 0.65);
        group.add(nightstand);

        const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.35, 12), ledWarm);
        lamp.position.set(lp.x + 1.25, baseY + 0.725, lp.y - 0.65);
        group.add(lamp);

        // Tall Wardrobe
        const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.6), darkWoodMat);
        wardrobe.position.set(lp.x - 1.2, baseY + 1.1, lp.y + 0.6);
        wardrobe.castShadow = true;
        group.add(wardrobe);

        // Study Desk & Chair
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.75, 0.6), woodMat);
        desk.position.set(lp.x + 1.1, baseY + 0.375, lp.y + 0.6);
        group.add(desk);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.85, 0.45), darkSteelMat);
        chair.position.set(lp.x + 1.1, baseY + 0.425, lp.y + 0.1);
        group.add(chair);

        InteriorInteractiveSystem.getInstance().registerSeat({
          id: `Seat_${buildingId}_L${layout.floorIndex}_bed_chair`,
          type: 'chair',
          buildingId,
          floorIndex: layout.floorIndex,
          worldPosition: new THREE.Vector3(
            buildingWorldPos.x + lp.x + 1.1,
            buildingWorldPos.y + baseY + 0.45,
            buildingWorldPos.z + lp.y + 0.1
          ),
          facingAngle: 0,
          label: 'Kursi Belajar'
        });
      }
      // -------------------------------------------------------------
      // B. LIVING ROOM (Ruang Tamu / Keluarga)
      // -------------------------------------------------------------
      else if (room.type === 'living_room') {
        // Modern L-Shape / 3-Seater Sofa with backrest and cushions
        const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.9), fabricMat);
        sofaBase.position.set(lp.x, baseY + 0.225, lp.y - 0.4);
        sofaBase.castShadow = true;
        group.add(sofaBase);

        // Sofa Backrest
        const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 0.25), fabricMat);
        sofaBack.position.set(lp.x, baseY + 0.675, lp.y - 0.725);
        group.add(sofaBack);

        // Sofa L-Shape return
        const sofaLReturn = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 1.2), fabricMat);
        sofaLReturn.position.set(lp.x - 0.75, baseY + 0.225, lp.y + 0.65);
        group.add(sofaLReturn);

        // Decorative Sofa Pillows
        const cushion1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.15), fabricBlue);
        cushion1.position.set(lp.x + 0.65, baseY + 0.625, lp.y - 0.52);
        group.add(cushion1);
        const cushion2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 0.15), fabricBlue);
        cushion2.position.set(lp.x - 0.65, baseY + 0.625, lp.y - 0.52);
        group.add(cushion2);

        // Floor Rug
        const rug = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.02, 1.6), this.getMaterial('plaster', '#e2e8f0'));
        rug.position.set(lp.x + 0.1, baseY + 0.03, lp.y + 0.5);
        group.add(rug);

        // Wooden Coffee Table
        const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.38, 0.6), woodMat);
        coffeeTable.position.set(lp.x + 0.1, baseY + 0.19, lp.y + 0.5);
        coffeeTable.castShadow = true;
        group.add(coffeeTable);

        // Flat TV Cabinet & Screen
        const tvCabinet = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 0.45), darkWoodMat);
        tvCabinet.position.set(lp.x + 0.1, baseY + 0.25, lp.y + 1.5);
        group.add(tvCabinet);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 0.05), darkSteelMat);
        tvScreen.position.set(lp.x + 0.1, baseY + 0.95, lp.y + 1.5);
        group.add(tvScreen);

        InteriorInteractiveSystem.getInstance().registerSeat({
          id: `Seat_${buildingId}_L${layout.floorIndex}_living_sofa`,
          type: 'sofa',
          buildingId,
          floorIndex: layout.floorIndex,
          worldPosition: new THREE.Vector3(
            buildingWorldPos.x + lp.x,
            buildingWorldPos.y + baseY + 0.45,
            buildingWorldPos.z + lp.y - 0.4
          ),
          facingAngle: 0,
          label: 'Sofa Tamu'
        });
      }
      // -------------------------------------------------------------
      // C. KITCHEN & DINING (Dapur & Ruang Makan)
      // -------------------------------------------------------------
      else if (room.type === 'kitchen') {
        // Kitchen counter set with sink & faucet
        const counterMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.65), tileMat);
        counterMesh.position.set(lp.x - 0.6, baseY + 0.425, lp.y);
        counterMesh.castShadow = true;
        group.add(counterMesh);

        const sinkMesh = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.45), stainlessMat);
        sinkMesh.position.set(lp.x - 0.6, baseY + 0.875, lp.y);
        group.add(sinkMesh);

        // Refrigerator
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.85, 0.7), stainlessMat);
        fridge.position.set(lp.x - 1.8, baseY + 0.925, lp.y);
        group.add(fridge);

        // Dining Table with 4 Chairs
        const dinTable = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.75, 0.85), woodMat);
        dinTable.position.set(lp.x + 1.1, baseY + 0.375, lp.y);
        group.add(dinTable);

        // 4 Dining Chairs
        const chairOffsets = [
          [-0.45, -0.65],
          [0.45, -0.65],
          [-0.45, 0.65],
          [0.45, 0.65]
        ];
        chairOffsets.forEach(([cx, cz], idx) => {
          const ch = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.82, 0.4), darkWoodMat);
          ch.position.set(lp.x + 1.1 + cx, baseY + 0.41, lp.y + cz);
          group.add(ch);

          InteriorInteractiveSystem.getInstance().registerSeat({
            id: `Seat_${buildingId}_L${layout.floorIndex}_dining_${idx}`,
            type: 'chair',
            buildingId,
            floorIndex: layout.floorIndex,
            worldPosition: new THREE.Vector3(
              buildingWorldPos.x + lp.x + 1.1 + cx,
              buildingWorldPos.y + baseY + 0.45,
              buildingWorldPos.z + lp.y + cz
            ),
            facingAngle: 0,
            label: `Kursi Makan ${idx + 1}`
          });
        });
      }
      // -------------------------------------------------------------
      // D. BATHROOM (Kamar Mandi / Toilet)
      // -------------------------------------------------------------
      else if (room.type === 'bathroom') {
        // WC Ceramic Toilet
        const wcMesh = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.65), wallMat);
        wcMesh.position.set(lp.x, baseY + 0.225, lp.y - 0.4);
        wcMesh.castShadow = true;
        group.add(wcMesh);

        // Glass Shower Partition
        const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.0, 0.9), glassMat);
        showerGlass.position.set(lp.x + 0.55, baseY + 1.0, lp.y + 0.3);
        group.add(showerGlass);
      }
      // -------------------------------------------------------------
      // E. CORRIDOR / OFFICE / COMMERCIAL / GENERIC
      // -------------------------------------------------------------
      else {
        // Workstation or Waiting Lounge
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.7), woodMat);
        desk.position.set(lp.x, baseY + 0.375, lp.y);
        group.add(desk);

        const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.4, 0.05), darkSteelMat);
        monitor.position.set(lp.x, baseY + 0.95, lp.y - 0.15);
        group.add(monitor);

        const chair = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.85, 0.5), darkSteelMat);
        chair.position.set(lp.x, baseY + 0.425, lp.y + 0.55);
        group.add(chair);

        InteriorInteractiveSystem.getInstance().registerSeat({
          id: `Seat_${buildingId}_L${layout.floorIndex}_office_chair`,
          type: 'chair',
          buildingId,
          floorIndex: layout.floorIndex,
          worldPosition: new THREE.Vector3(
            buildingWorldPos.x + lp.x,
            buildingWorldPos.y + baseY + 0.45,
            buildingWorldPos.z + lp.y + 0.55
          ),
          facingAngle: 0,
          label: 'Kursi Kerja'
        });
      }
    }

    return group;
  }
}
