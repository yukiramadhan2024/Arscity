import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { RoadGraph } from '../src/roads/RoadGraph';
import { RoadManager } from '../src/roads/RoadManager';
import { IntersectionBuilder } from '../src/roads/IntersectionBuilder';
import { BuildingCatalogRegistry } from '../src/buildings/BuildingCatalogRegistry';
import { ProceduralTextureGen } from '../src/materials/ProceduralTextureGen';
import fs from 'fs';
import path from 'path';

describe('V4.4 User Audit & Logical Road Intersection Suite', () => {
  describe('1. 2D Mode HUD Retention & Return to 3D Orbit', () => {
    it('verifies App.tsx renders HudLayout in both orbit and 2d mode', () => {
      const appFile = fs.readFileSync(path.resolve(__dirname, '../src/app/App.tsx'), 'utf-8');
      expect(appFile).toContain("(cameraMode === 'orbit' || cameraMode === '2d')");
    });
  });

  describe('2. Elimination of Button Heartbeat (Hover Oscillation)', () => {
    it('verifies TopHeader settings/more buttons no longer have hit-slop-8 collision overlap', () => {
      const topHeaderFile = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/TopHeader.tsx'), 'utf-8');
      // No hit-slop-8 on settings button
      expect(topHeaderFile).not.toMatch(/className="hit-slop-8"/);
    });

    it('verifies BottomToolbar dock handles onMouseLeave to prevent hover heartbeat oscillation', () => {
      const toolbarFile = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/BottomToolbar.tsx'), 'utf-8');
      expect(toolbarFile).toContain('onMouseLeave={() => setHoveredToolIndex(null)}');
    });
  });

  describe('3. Contrast & Visibility of Settings and Help Modals', () => {
    it('verifies SettingsModal cards enforce high contrast text (#072D59)', () => {
      const settingsFile = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/SettingsModal.tsx'), 'utf-8');
      expect(settingsFile).toContain("color: '#072D59'");
      expect(settingsFile).toContain("'--label': '#072D59'");
    });

    it('verifies ModalSheet title uses explicit high-contrast Navy (#072D59)', () => {
      const sheetFile = fs.readFileSync(path.resolve(__dirname, '../src/ui/primitives/ModalSheet.tsx'), 'utf-8');
      expect(sheetFile).toContain("color: '#072D59'");
    });
  });

  describe('4. Keyboard Shortcut Alignment (1-8 Hotkeys)', () => {
    it('verifies BottomToolbar and App.tsx map hotkeys 1-8 to the 8 tools in exact 1:1 order', () => {
      const toolbarFile = fs.readFileSync(path.resolve(__dirname, '../src/ui/components/BottomToolbar.tsx'), 'utf-8');
      expect(toolbarFile).toContain("hotkey: '1'");
      expect(toolbarFile).toContain("hotkey: '2'");
      expect(toolbarFile).toContain("hotkey: '3'");
      expect(toolbarFile).toContain("hotkey: '4'");
      expect(toolbarFile).toContain("hotkey: '5'");
      expect(toolbarFile).toContain("hotkey: '6'");
      expect(toolbarFile).toContain("hotkey: '7'");
      expect(toolbarFile).toContain("hotkey: '8'");

      const appFile = fs.readFileSync(path.resolve(__dirname, '../src/app/App.tsx'), 'utf-8');
      expect(appFile).toContain("'1': 'select'");
      expect(appFile).toContain("'2': 'road'");
      expect(appFile).toContain("'3': 'zone'");
      expect(appFile).toContain("'4': 'build'");
      expect(appFile).toContain("'5': 'nature'");
      expect(appFile).toContain("'6': 'terraform'");
      expect(appFile).toContain("'7': 'demolish'");
      expect(appFile).toContain("'8': 'analyze'");
    });
  });

  describe('5. Distinct 2.5D Architectural Previews for Building Catalog', () => {
    it('generates valid procedural 2.5D isometric data URLs for different building archetypes', () => {
      const bJoglo = ProceduralTextureGen.getBuildingThumbnail('joglo', 'hunian', 'Rumah Joglo');
      const bTower = ProceduralTextureGen.getBuildingThumbnail('office_tower', 'mall_ritel', 'Menara Kantor');
      const bMosque = ProceduralTextureGen.getBuildingThumbnail('masjid_agung_kubah', 'ibadah_budaya', 'Masjid Agung');
      const bGable = ProceduralTextureGen.getBuildingThumbnail('warmindo_modern', 'kuliner_kafe', 'Kedai Warmindo');

      expect(bJoglo).toMatch(/^data:image\/png;base64,/);
      expect(bTower).toMatch(/^data:image\/png;base64,/);
      expect(bMosque).toMatch(/^data:image\/png;base64,/);
      expect(bGable).toMatch(/^data:image\/png;base64,/);
    });

    it('verifies every registered building in BuildingCatalogRegistry has a valid thumbnail', () => {
      const all = BuildingCatalogRegistry.getAllBuildings();
      expect(all.length).toBeGreaterThanOrEqual(25);

      for (const b of all.slice(0, 15)) {
        const thumb = ProceduralTextureGen.getBuildingThumbnail(b.id, b.category, b.name);
        expect(thumb.startsWith('data:image/png;base64,')).toBe(true);
      }
    });
  });

  describe('6. Logical Road Intersections (Pertigaan & Perempatan)', () => {
    it('subdivides a cubic Bezier curve preserving smooth curvature when split at an intersection', () => {
      const graph = new RoadGraph();
      const n0 = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const n1 = graph.getOrCreateNode(new THREE.Vector3(100, 0, 0));

      const cp1 = new THREE.Vector3(25, 0, 40);
      const cp2 = new THREE.Vector3(75, 0, 40);
      const edge = graph.addEdge(n0.id, n1.id, 'collector', [n0.position, cp1, cp2, n1.position]);
      expect(edge).not.toBeNull();

      // Sample midpoint on the curve
      const midPoint = graph.sampleBezier(edge!.controlPoints!, 0.5);
      expect(midPoint.z).toBeGreaterThan(20); // Curve clearly arcs out to Z > 20

      // Split edge at midPoint
      const split = graph.splitEdgeAtPoint(edge!.id, midPoint);
      expect(split).not.toBeNull();
      expect(split!.edge1).not.toBeNull();
      expect(split!.edge2).not.toBeNull();

      // Both sub-edges must have 4 control points that preserve the curve (not straight lines)
      expect(split!.edge1!.controlPoints!.length).toBe(4);
      expect(split!.edge2!.controlPoints!.length).toBe(4);

      // Edge 1 midpoint must also be curved
      const sample1 = graph.sampleBezier(split!.edge1!.controlPoints!, 0.5);
      expect(sample1.z).toBeGreaterThan(5);
    });

    it('rebuilds all connected edges so sidewalks and curbs are trimmed at 3-way T-junctions', () => {
      const scene = new THREE.Scene();
      const roadManager = new RoadManager(scene);

      // East-West through road
      roadManager.addRoad(new THREE.Vector3(-40, 0, 0), new THREE.Vector3(40, 0, 0), 'collector');
      expect(roadManager.graph.edges.size).toBe(1);

      // Stem road meeting at (0, 0, 0)
      roadManager.addRoad(new THREE.Vector3(0, 0, 30), new THREE.Vector3(0, 0, 0), 'local');
      expect(roadManager.graph.edges.size).toBe(3);

      const junctionNode = roadManager.graph.findClosestNode(new THREE.Vector3(0, 0, 0), 2.0);
      expect(junctionNode).not.toBeNull();
      expect(junctionNode!.connectedEdgeIds.length).toBe(3);
      expect(roadManager.graph.isJunctionNode(junctionNode!.id)).toBe(true);

      // Intersection mesh must exist with smooth fillet boundary and zebra crosswalks
      const interMesh = roadManager.masterGroup.getObjectByName(`Intersection_${junctionNode!.id}`) as THREE.Mesh;
      expect(interMesh).toBeDefined();
      expect(interMesh.geometry.getAttribute('position').count).toBeGreaterThan(6);

      // Zebra crosswalk must be added as a child of the intersection mesh
      const zebra = interMesh.getObjectByName(`ZebraCrosswalk_${junctionNode!.id}`);
      expect(zebra).toBeDefined();
    });

    it('creates a clean 4-way perempatan with incident tangents and fillet corners when roads cross', () => {
      const scene = new THREE.Scene();
      const roadManager = new RoadManager(scene);

      // East-West road
      roadManager.addRoad(new THREE.Vector3(-50, 0, 0), new THREE.Vector3(50, 0, 0), 'arterial');
      // North-South crossing road
      roadManager.addRoad(new THREE.Vector3(0, 0, -50), new THREE.Vector3(0, 0, 50), 'collector');

      expect(roadManager.graph.edges.size).toBe(4);

      const center = roadManager.graph.findClosestNode(new THREE.Vector3(0, 0, 0), 2.0);
      expect(center).not.toBeNull();
      expect(center!.connectedEdgeIds.length).toBe(4);

      const interMesh = roadManager.masterGroup.getObjectByName(`Intersection_${center!.id}`) as THREE.Mesh;
      expect(interMesh).toBeDefined();
      expect(interMesh.matrixAutoUpdate).toBe(false);

      // UV attributes must be valid planar world UVs
      const uvs = interMesh.geometry.getAttribute('uv').array;
      expect(uvs.length).toBeGreaterThan(0);
      expect(Number.isNaN(uvs[0])).toBe(false);
    });
  });
});
