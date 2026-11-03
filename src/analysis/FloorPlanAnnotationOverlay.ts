import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoomDefinition, RoomType } from '../buildings/InteriorTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { roomStandardsRegistry } from '../buildings/RoomStandards';
import { InteriorLayoutFactory } from '../buildings/InteriorLayoutFactory';

export class FloorPlanAnnotationOverlay {
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  private overlayGroup: THREE.Group;
  public isActive: boolean = false;
  public activeFloorIndex: number = 0;
  private createdTextures: THREE.Texture[] = [];
  private createdGeometries: THREE.BufferGeometry[] = [];
  private createdMaterials: THREE.Material[] = [];

  constructor(scene: THREE.Scene, buildingManager: BuildingManager) {
    this.scene = scene;
    this.buildingManager = buildingManager;
    this.overlayGroup = new THREE.Group();
    this.overlayGroup.name = 'FloorPlanAnnotationOverlayGroup';
    this.scene.add(this.overlayGroup);
  }

  public setActiveFloor(floorIndex: number): void {
    this.activeFloorIndex = Math.max(0, floorIndex);
  }

  public setVisible(visible: boolean, sliceHeight?: number): void {
    this.isActive = visible;
    this.clear();

    if (!visible) return;

    for (const bld of this.buildingManager.buildings.values()) {
      // Ensure interior layouts exist
      if (!bld.interiorLayouts || bld.interiorLayouts.length === 0) {
        bld.interiorLayouts = InteriorLayoutFactory.getLayoutForBuilding(
          bld.presetKey,
          bld.width,
          bld.length,
          bld.floorHeight || 3.2,
          bld.floorCount || 1
        );
      }

      const totalFloors = bld.floorCount || 1;
      if (this.activeFloorIndex >= totalFloors) continue;

      const floorH = bld.floorHeight || 3.2;
      const floorElevation = this.activeFloorIndex * floorH;
      const cutHeight = sliceHeight !== undefined ? sliceHeight : (floorElevation + 1.2);

      const group = new THREE.Group();
      group.position.set(bld.position.x, 0, bld.position.z);
      group.rotation.y = bld.rotationY;

      const layout = (bld.interiorLayouts && bld.interiorLayouts[this.activeFloorIndex])
        || (bld.interiorLayouts && bld.interiorLayouts[0]);

      if (layout) {
        // 1. Room zones & translucent surface
        for (const room of layout.rooms) {
          const b = room.boundary;
          if (b.length >= 3) {
            const shape = new THREE.Shape();
            shape.moveTo(b[0].x, b[0].y);
            for (let i = 1; i < b.length; i++) {
              shape.lineTo(b[i].x, b[i].y);
            }
            shape.closePath();

            const geo = new THREE.ShapeGeometry(shape);
            this.createdGeometries.push(geo);

            const zoneColor = this.getRoomColor(room.type);
            const mat = new THREE.MeshBasicMaterial({
              color: zoneColor,
              transparent: true,
              opacity: 0.16,
              side: THREE.DoubleSide,
              depthWrite: false
            });
            this.createdMaterials.push(mat);

            const surfaceMesh = new THREE.Mesh(geo, mat);
            surfaceMesh.rotation.x = Math.PI * 0.5;
            surfaceMesh.position.y = floorElevation + 0.04;
            group.add(surfaceMesh);

            // Room boundary lines
            const points: THREE.Vector3[] = [];
            for (let i = 0; i <= b.length; i++) {
              const pt = b[i % b.length];
              points.push(new THREE.Vector3(pt.x, floorElevation + 0.06, pt.y));
            }
            const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
            this.createdGeometries.push(lineGeo);

            const lineMat = new THREE.LineBasicMaterial({
              color: zoneColor,
              transparent: true,
              opacity: 0.60
            });
            this.createdMaterials.push(lineMat);

            const boundaryLine = new THREE.Line(lineGeo, lineMat);
            group.add(boundaryLine);
          }

          // Room badge sprite
          const sprite = this.createRoomBadgeSprite(room);
          if (sprite) {
            sprite.position.set(room.labelPosition.x, floorElevation + 1.15, room.labelPosition.y);
            group.add(sprite);
          }
        }

        // 2. Thick wall section cut outlines (dinding terpotong tebal)
        const cutY = floorElevation + 1.18;
        const wallCutMat = new THREE.MeshBasicMaterial({
          color: 0x0f172a, // Dark slate section cut hatch (#0F172A)
          depthTest: true
        });
        this.createdMaterials.push(wallCutMat);

        // A. Interior partition walls
        if (layout.walls && layout.walls.length > 0) {
          for (const wall of layout.walls) {
            const dx = wall.end.x - wall.start.x;
            const dz = wall.end.y - wall.start.y;
            const wallLen = Math.hypot(dx, dz);
            if (wallLen < 0.05) continue;
            const angle = Math.atan2(dz, dx);
            const midX = (wall.start.x + wall.end.x) / 2;
            const midZ = (wall.start.y + wall.end.y) / 2;

            const wallBoxGeom = new THREE.BoxGeometry(wallLen, 0.03, wall.thickness || 0.15);
            wallBoxGeom.rotateY(-angle);
            this.createdGeometries.push(wallBoxGeom);

            const wallMesh = new THREE.Mesh(wallBoxGeom, wallCutMat);
            wallMesh.position.set(midX, cutY, midZ);
            group.add(wallMesh);
          }
        }

        // B. Exterior perimeter walls (0.20m thick section cut ribbon)
        const hw = bld.width / 2;
        const hl = bld.length / 2;
        const wallThickness = 0.20;

        // Front & Back perimeter walls
        const fbGeom = new THREE.BoxGeometry(bld.width, 0.03, wallThickness);
        this.createdGeometries.push(fbGeom);
        const frontWall = new THREE.Mesh(fbGeom, wallCutMat);
        frontWall.position.set(0, cutY, hl - wallThickness / 2);
        group.add(frontWall);

        const backWall = new THREE.Mesh(fbGeom, wallCutMat);
        backWall.position.set(0, cutY, -hl + wallThickness / 2);
        group.add(backWall);

        // Left & Right perimeter walls
        const lrGeom = new THREE.BoxGeometry(wallThickness, 0.03, bld.length - 2 * wallThickness);
        this.createdGeometries.push(lrGeom);
        const leftWall = new THREE.Mesh(lrGeom, wallCutMat);
        leftWall.position.set(-hw + wallThickness / 2, cutY, 0);
        group.add(leftWall);

        const rightWall = new THREE.Mesh(lrGeom, wallCutMat);
        rightWall.position.set(hw - wallThickness / 2, cutY, 0);
        group.add(rightWall);
      }

      this.overlayGroup.add(group);
    }
  }

  private getRoomColor(type: RoomType): number {
    switch (type) {
      case 'bedroom':
        return 0x5e5ce6; // Indigo
      case 'living_room':
        return 0x007aff; // Apple Blue
      case 'kitchen':
        return 0xff9500; // Amber
      case 'bathroom':
        return 0x30b0c7; // Cyan
      case 'terrace':
        return 0x34c759; // Green
      default:
        return 0x8e8e93; // Muted gray
    }
  }

  private createRoomBadgeSprite(room: RoomDefinition): THREE.Sprite | null {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    canvas.width = 380;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background pill frosted glass (Aturan G3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.strokeStyle = room.isCompliant ? '#16a34a' : '#dc2626';
    ctx.lineWidth = 4;

    const x = 10, y = 10, w = 360, h = 140, r = 24;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Text: Room Name (Display Sans, Aturan G3 & G2)
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, 190, 52);

    // Text: Area m² & Ceiling Height (Indonesian numbers, Aturan G2)
    ctx.fillStyle = '#475569';
    ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const areaStr = room.areaM2.toFixed(1).replace('.', ',');
    const ceilStr = room.ceilingHeight.toFixed(1).replace('.', ',');
    ctx.fillText(`${areaStr} m²  •  Plafon ${ceilStr} m`, 190, 92);

    // Compliance Badge
    ctx.font = '600 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    if (room.isCompliant) {
      ctx.fillStyle = '#16a34a';
      ctx.fillText('[SNI 03-1733: STANDAR TERPENUHI]', 190, 126);
    } else {
      ctx.fillStyle = '#dc2626';
      ctx.fillText('[SNI 03-1733: DI BAWAH STANDAR]', 190, 126);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    this.createdTextures.push(texture);

    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });
    this.createdMaterials.push(mat);

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(3.2, 1.35, 1.0);
    return sprite;
  }

  /**
   * Renders orthographic architectural elevation level datum lines
   * and the legal maximum height regulation boundary line (H <= 1.5W).
   */
  public renderElevationAnnotations(
    bld: BuildingInstance,
    _mode: 'elevation' | 'section'
  ): void {
    this.clear();
    this.isActive = true;

    const group = new THREE.Group();
    group.name = 'ElevationAnnotationsGroup';
    group.position.copy(bld.position);

    const totalFloors = bld.floorCount || 1;
    const floorH = bld.floorHeight || 3.2;
    const plinthH = 0.35;
    const bldW = bld.width || 10;
    const totalHeight = plinthH + totalFloors * floorH + 2.5;

    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      transparent: true,
      opacity: 0.85
    });
    this.createdMaterials.push(lineMat);

    const markerX = bldW / 2 + 3.0;

    // Floor levels
    for (let fl = 0; fl <= totalFloors; fl++) {
      const elevY = fl === 0 ? 0.0 : plinthH + (fl - 1) * floorH;
      const labelText = fl === 0 ? '?0.00 Lantai Dasar' : `+${elevY.toFixed(2)} Lantai ${fl}`;

      const pts = [
        new THREE.Vector3(bldW / 2, elevY, 0),
        new THREE.Vector3(markerX + 4.5, elevY, 0)
      ];
      const lineGeom = new THREE.BufferGeometry().setFromPoints(pts);
      this.createdGeometries.push(lineGeom);
      const line = new THREE.Line(lineGeom, lineMat);
      group.add(line);

      const sprite = this.createElevationSprite(labelText, '#00E5FF');
      sprite.position.set(markerX + 5.5, elevY, 0);
      group.add(sprite);
    }

    // Roof peak datum
    const roofY = totalHeight;
    const roofPts = [
      new THREE.Vector3(0, roofY, 0),
      new THREE.Vector3(markerX + 4.5, roofY, 0)
    ];
    const roofLineGeom = new THREE.BufferGeometry().setFromPoints(roofPts);
    this.createdGeometries.push(roofLineGeom);
    const roofLine = new THREE.Line(roofLineGeom, lineMat);
    group.add(roofLine);

    const roofSprite = this.createElevationSprite(`+${roofY.toFixed(2)} Puncak Atap`, '#00E5FF');
    roofSprite.position.set(markerX + 5.5, roofY, 0);
    group.add(roofSprite);

    // Maximum height regulation boundary line (H <= 1.5 * Road Width)
    const roadWidth = 16.0;
    const maxRegHeight = 1.5 * roadWidth; // 24.0m
    const regPts = [
      new THREE.Vector3(-bldW / 2 - 2.0, maxRegHeight, 0),
      new THREE.Vector3(markerX + 8.0, maxRegHeight, 0)
    ];
    const regGeom = new THREE.BufferGeometry().setFromPoints(regPts);
    this.createdGeometries.push(regGeom);
    const regMat = new THREE.LineDashedMaterial({
      color: 0xf59e0b,
      dashSize: 1.2,
      gapSize: 0.6,
      transparent: true,
      opacity: 0.95
    });
    this.createdMaterials.push(regMat);
    const regLine = new THREE.Line(regGeom, regMat);
    regLine.computeLineDistances();
    group.add(regLine);

    const regSprite = this.createElevationSprite(`Batas Maks Regulasi (H <= 1.5W = +${maxRegHeight.toFixed(1)}m)`, '#F59E0B');
    regSprite.position.set(markerX + 5.5, maxRegHeight + 0.6, 0);
    group.add(regSprite);

    this.overlayGroup.add(group);
  }

  private createElevationSprite(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 64);

    // Frosted white glass background (Aturan G3)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.94)';
    ctx.fillRect(4, 4, 504, 56);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 56);

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 18, 32);

    const texture = new THREE.CanvasTexture(canvas);
    this.createdTextures.push(texture);

    const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
    this.createdMaterials.push(mat);

    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(6.0, 0.75, 1.0);
    return sprite;
  }

  public clear(): void {
    while (this.overlayGroup.children.length > 0) {
      this.overlayGroup.remove(this.overlayGroup.children[0]);
    }
    for (const t of this.createdTextures) t.dispose();
    for (const g of this.createdGeometries) g.dispose();
    for (const m of this.createdMaterials) m.dispose();

    this.createdTextures = [];
    this.createdGeometries = [];
    this.createdMaterials = [];
  }

  public dispose(): void {
    this.clear();
    this.scene.remove(this.overlayGroup);
  }
}
