import * as THREE from 'three';
import { BuildingManager } from '../buildings/BuildingManager';
import { RoomDefinition, RoomType } from '../buildings/InteriorTypes';
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
          surfaceMesh.rotation.x = -Math.PI * 0.5;
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
