import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { BuildingManager } from '../buildings/BuildingManager';
import { LotManager } from '../zones/LotManager';
import { RoadManager } from '../roads/RoadManager';

export class RealWorldExporter {
  /**
   * Generates a 2D Architectural CAD DXF (Drawing Exchange Format) string
   * containing lot parcel perimeters, building exterior walls, interior partition walls,
   * doors, and room text annotations.
   */
  public static exportFloorPlanToDXF(
    buildingManager: BuildingManager,
    lotManager: LotManager,
    roadManager: RoadManager
  ): string {
    const lines: string[] = [];

    // DXF Header
    lines.push('0', 'SECTION', '2', 'HEADER', '9', '$ACADVER', '1', 'AC1009', '0', 'ENDSEC');

    // DXF Tables: Layers
    lines.push('0', 'SECTION', '2', 'TABLES', '0', 'TABLE', '2', 'LAYER', '70', '4');
    // Layer 1: LOT_BOUNDARY (Green)
    lines.push('0', 'LAYER', '2', 'LOT_BOUNDARY', '70', '0', '62', '3', '6', 'CONTINUOUS');
    // Layer 2: BUILDING_WALLS (White)
    lines.push('0', 'LAYER', '2', 'BUILDING_WALLS', '70', '0', '62', '7', '6', 'CONTINUOUS');
    // Layer 3: INTERIOR_PARTITIONS (Cyan)
    lines.push('0', 'LAYER', '2', 'INTERIOR_PARTITIONS', '70', '0', '62', '4', '6', 'CONTINUOUS');
    // Layer 4: ROAD_NETWORK (Yellow)
    lines.push('0', 'LAYER', '2', 'ROAD_NETWORK', '70', '0', '62', '2', '6', 'CONTINUOUS');
    lines.push('0', 'ENDTAB', '0', 'ENDSEC');

    // DXF Entities
    lines.push('0', 'SECTION', '2', 'ENTITIES');

    // 1. Export Lots
    for (const lot of (lotManager.lots?.values() || [])) {
      if ((lot as any).polygon && Array.isArray((lot as any).polygon) && (lot as any).polygon.length > 0) {
        const poly = (lot as any).polygon;
        for (let i = 0; i < poly.length; i++) {
          const p1 = poly[i];
          const p2 = poly[(i + 1) % poly.length];
          this.addDXFLine(lines, 'LOT_BOUNDARY', p1.x, -p1.y, p2.x, -p2.y);
        }
      } else {
        const halfW = (lot.width || 20) / 2;
        const halfL = (lot.length || 20) / 2;
        const posX = lot.position?.x ?? 0;
        const posZ = lot.position?.z ?? 0;
        const pts = [
          { x: posX - halfW, y: posZ - halfL },
          { x: posX + halfW, y: posZ - halfL },
          { x: posX + halfW, y: posZ + halfL },
          { x: posX - halfW, y: posZ + halfL },
        ];
        for (let i = 0; i < pts.length; i++) {
          const p1 = pts[i];
          const p2 = pts[(i + 1) % pts.length];
          this.addDXFLine(lines, 'LOT_BOUNDARY', p1.x, -p1.y, p2.x, -p2.y);
        }
      }
    }

    // 2. Export Roads
    for (const edge of roadManager.graph.edges.values()) {
      const p1 = roadManager.graph.nodes.get(edge.startNodeId)?.position;
      const p2 = roadManager.graph.nodes.get(edge.endNodeId)?.position;
      if (p1 && p2) {
        this.addDXFLine(lines, 'ROAD_NETWORK', p1.x, -p1.z, p2.x, -p2.z);
      }
    }

    // 3. Export Buildings & Interior Partitions
    for (const bld of buildingManager.buildings.values()) {
      const cos = Math.cos(bld.rotationY);
      const sin = Math.sin(bld.rotationY);
      const hw = bld.width / 2;
      const hl = bld.length / 2;

      // Outer Footprint Rectangle
      const localCorners = [
        { x: -hw, y: -hl },
        { x: hw, y: -hl },
        { x: hw, y: hl },
        { x: -hw, y: hl }
      ];
      const worldCorners = localCorners.map(c => ({
        x: bld.position.x + (c.x * cos - c.y * sin),
        y: bld.position.z + (c.x * sin + c.y * cos)
      }));

      for (let i = 0; i < worldCorners.length; i++) {
        const p1 = worldCorners[i];
        const p2 = worldCorners[(i + 1) % worldCorners.length];
        this.addDXFLine(lines, 'BUILDING_WALLS', p1.x, -p1.y, p2.x, -p2.y);
      }

      // Interior Partition Walls
      if (bld.interiorLayouts && bld.interiorLayouts.length > 0) {
        const groundLayout = bld.interiorLayouts[0];
        for (const wall of groundLayout.walls) {
          const w1 = {
            x: bld.position.x + (wall.start.x * cos - wall.start.y * sin),
            y: bld.position.z + (wall.start.x * sin + wall.start.y * cos)
          };
          const w2 = {
            x: bld.position.x + (wall.end.x * cos - wall.end.y * sin),
            y: bld.position.z + (wall.end.x * sin + wall.end.y * cos)
          };
          this.addDXFLine(lines, 'INTERIOR_PARTITIONS', w1.x, -w1.y, w2.x, -w2.y);
        }

        // Room Labels
        for (const room of groundLayout.rooms) {
          const rx = bld.position.x + (room.labelPosition.x * cos - room.labelPosition.y * sin);
          const ry = bld.position.z + (room.labelPosition.x * sin + room.labelPosition.y * cos);
          this.addDXFText(lines, 'INTERIOR_PARTITIONS', `${room.name} (${room.areaM2.toFixed(1)}m²)`, rx, -ry, 0.45);
        }
      }
    }

    lines.push('0', 'ENDSEC', '0', 'EOF');
    return lines.join('\n');
  }

  private static addDXFLine(lines: string[], layer: string, x1: number, y1: number, x2: number, y2: number): void {
    lines.push('0', 'LINE', '8', layer);
    lines.push('10', x1.toFixed(3), '20', y1.toFixed(3), '30', '0.0');
    lines.push('11', x2.toFixed(3), '21', y2.toFixed(3), '31', '0.0');
  }

  private static addDXFText(lines: string[], layer: string, text: string, x: number, y: number, height: number): void {
    lines.push('0', 'TEXT', '8', layer);
    lines.push('10', x.toFixed(3), '20', y.toFixed(3), '30', '0.0');
    lines.push('40', height.toFixed(3));
    lines.push('1', text);
  }

  /**
   * Exports master scene or building group to glTF / GLB format.
   */
  public static async exportToGLTF(targetObject: THREE.Object3D, filename: string = 'arscity_model.gltf'): Promise<void> {
    const exporter = new GLTFExporter();
    exporter.parse(
      targetObject,
      (gltf) => {
        const output = typeof gltf === 'string' ? gltf : JSON.stringify(gltf, null, 2);
        const blob = new Blob([output], { type: 'application/json' });
        this.triggerDownload(blob, filename);
      },
      (error) => {
        console.error('Error exporting glTF:', error);
      },
      { binary: false, embedImages: true }
    );
  }

  /**
   * Exports master scene or building group to Wavefront OBJ format.
   */
  public static exportToOBJ(targetObject: THREE.Object3D, filename: string = 'arscity_model.obj'): void {
    const exporter = new OBJExporter();
    const result = exporter.parse(targetObject);
    const blob = new Blob([result], { type: 'text/plain' });
    this.triggerDownload(blob, filename);
  }

  /**
   * Downloads DXF file directly to browser.
   */
  public static downloadDXF(dxfContent: string, filename: string = 'arscity_denah.dxf'): void {
    const blob = new Blob([dxfContent], { type: 'application/dxf' });
    this.triggerDownload(blob, filename);
  }

  public static triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
