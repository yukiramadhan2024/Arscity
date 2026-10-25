import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoomDefinition, RoomType } from '../buildings/InteriorTypes';
import { BuildingInstance } from '../buildings/PrefabTypes';
import { roomStandardsRegistry } from '../buildings/RoomStandards';

export class FloorPlanAnnotationOverlay {
  private scene: THREE.Scene;
  private buildingManager: BuildingManager;
  private overlayGroup: THREE.Group;
  public isActive: boolean = false;
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

  public setVisible(visible: boolean, sliceHeight: number = 1.8): void {
    this.isActive = visible;
    this.clear();

    if (!visible) return;

    for (const bld of this.buildingManager.buildings.values()) {
      if (!bld.interiorLayouts || bld.interiorLayouts.length === 0) continue;

      const group = new THREE.Group();
      group.position.copy(bld.position);
      group.rotation.y = bld.rotationY;

      // Annotate ground floor (floorIndex = 0)
      const layout = bld.interiorLayouts[0];
      if (!layout) continue;

      for (const room of layout.rooms) {
        // 1. Subtle Translucent Room Zone Surface
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
            opacity: 0.18,
            side: THREE.DoubleSide,
            depthWrite: false
          });
          this.createdMaterials.push(mat);

          const surfaceMesh = new THREE.Mesh(geo, mat);
          surfaceMesh.rotation.x = Math.PI * 0.5;
          surfaceMesh.position.y = 0.38; // Just above plinth
          group.add(surfaceMesh);

          // 2. Room Boundary Dimension Lines
          const points: THREE.Vector3[] = [];
          for (let i = 0; i <= b.length; i++) {
            const pt = b[i % b.length];
            points.push(new THREE.Vector3(pt.x, 0.4, pt.y));
          }
          const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
          this.createdGeometries.push(lineGeo);

          const lineMat = new THREE.LineBasicMaterial({
            color: zoneColor,
            transparent: true,
            opacity: 0.65
          });
          this.createdMaterials.push(lineMat);

          const boundaryLine = new THREE.Line(lineGeo, lineMat);
          group.add(boundaryLine);
        }

        // 3. Room Label & Area Badge Text Sprite
        const sprite = this.createRoomBadgeSprite(room);
        if (sprite) {
          sprite.position.set(room.labelPosition.x, Math.min(sliceHeight - 0.2, 1.6), room.labelPosition.y);
          group.add(sprite);
        }
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

    // Background pill rounded box
    ctx.fillStyle = 'rgba(28, 28, 30, 0.88)';
    ctx.strokeStyle = room.isCompliant ? 'rgba(52, 199, 89, 0.7)' : 'rgba(255, 59, 48, 0.8)';
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

    // Text: Room Name (Display Sans)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px "Inter", -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, 190, 52);

    // Text: Area m² & Ceiling Height (Technical Metrics Mono)
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 22px "JetBrains Mono", "SF Mono", Consolas, monospace';
    ctx.fillText(`${room.areaM2.toFixed(1)} m²  •  Plafon ${room.ceilingHeight.toFixed(1)}m`, 190, 92);

    // Compliance Badge (Technical Telemetry Mono)
    ctx.font = '600 17px "JetBrains Mono", "SF Mono", Consolas, monospace';
    if (room.isCompliant) {
      ctx.fillStyle = '#34C759';
      ctx.fillText('[SNI 03-1733: STANDAR TERPENUHI]', 190, 126);
    } else {
      ctx.fillStyle = '#FF3B30';
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

    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(4, 4, 504, 56);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(4, 4, 504, 56);

    ctx.fillStyle = color;
    ctx.font = 'bold 22px "JetBrains Mono", monospace';
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
