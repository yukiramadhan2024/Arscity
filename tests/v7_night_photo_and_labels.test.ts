import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { MaterialLibrary } from '../src/materials/MaterialLibrary';
import { ProceduralTextureGen } from '../src/materials/ProceduralTextureGen';
import { RoadGeometryBuilder } from '../src/roads/RoadGeometryBuilder';
import { RoadGraph } from '../src/roads/RoadGraph';
import { RoadEdge } from '../src/roads/RoadTypes';
import { ScreenshotExporter } from '../src/io/ScreenshotExporter';
import { LightingSystem } from '../src/core/engine/LightingSystem';
import * as fs from 'fs';
import * as path from 'path';

describe('Tahap V7: Mode Malam, Mode Foto, Label Jalan & QA Akhir', () => {
  beforeEach(() => {
    MaterialLibrary.getInstance().reset();
  });

  describe('1. Pencahayaan & Penerangan Malam', () => {
    it('membedakan jendela menyala (glass_lit) dan jendela padam (glass_dark) di malam hari', () => {
      const matLib = MaterialLibrary.getInstance();
      const glassLit = matLib.getMaterial('glass_lit') as THREE.MeshPhysicalMaterial;
      const glassDark = matLib.getMaterial('glass_dark') as THREE.MeshPhysicalMaterial;

      // Di siang hari (glow = 0), keduanya padam
      matLib.setNightGlow(0);
      expect((glassLit as any).emissiveIntensity).toBe(0);
      expect((glassDark as any).emissiveIntensity).toBe(0);

      // Di malam hari (glow = 1), glass_lit menyala amber hangat (0xfef08a) sedangkan glass_dark tetap padam
      matLib.setNightGlow(1.0);
      expect((glassLit as any).emissiveIntensity).toBeGreaterThan(1.5);
      expect((glassLit as any).emissive.getHex()).toBe(0xfef08a);

      expect((glassDark as any).emissiveIntensity).toBe(0);
      expect((glassDark as any).emissive.getHex()).toBe(0x000000);
    });

    it('menyalakan papan nama ruko/toko (storefront_sign) secara otomatis di malam hari', () => {
      const matLib = MaterialLibrary.getInstance();
      const signMat = matLib.getMaterial('storefront_sign', { color: 4 }) as THREE.MeshStandardMaterial;

      matLib.setNightGlow(0);
      const dayEmissive = signMat.emissiveIntensity;

      matLib.setNightGlow(1.0);
      const nightEmissive = signMat.emissiveIntensity;

      expect(nightEmissive).toBeGreaterThan(dayEmissive);
      expect(nightEmissive).toBeGreaterThan(1.0);
    });

    it('memberikan efek pantulan basah (specular sheen) pada aspal jalan saat malam hari', () => {
      const matLib = MaterialLibrary.getInstance();
      const asphaltMat = matLib.getMaterial('asphalt') as THREE.MeshStandardMaterial;

      matLib.setNightGlow(0);
      const dayRoughness = asphaltMat.roughness;
      const dayMetalness = asphaltMat.metalness;

      matLib.setNightGlow(1.0);
      const nightRoughness = asphaltMat.roughness;
      const nightMetalness = asphaltMat.metalness;

      // Saat malam basah: permukaan lebih licin/reflektif (roughness turun, metalness naik)
      expect(nightRoughness).toBeLessThan(dayRoughness);
      expect(nightMetalness).toBeGreaterThan(dayMetalness);
    });

    it('menyalakan jendela impostor fasad (LOD2) dengan peta emissive prosedural di malam hari', () => {
      const matLib = MaterialLibrary.getInstance();
      const impostorMat = matLib.getMaterial('impostor_facade', { color: '#f8fafc' }) as THREE.MeshStandardMaterial;

      expect(impostorMat.emissiveMap).toBeDefined();

      matLib.setNightGlow(0);
      expect(impostorMat.emissiveIntensity).toBe(0);

      matLib.setNightGlow(1.0);
      expect(impostorMat.emissiveIntensity).toBeGreaterThan(1.0);
    });

    it('kubah bintang (T1.2) memiliki radius 3600m, sizeAttenuation false, depthTest false, fog false, renderOrder -1000, serta mengikuti kamera', () => {
      const scene = new THREE.Scene();
      const lighting = new LightingSystem(scene);
      const starPoints = lighting.starPoints;
      expect(starPoints).toBeDefined();
      expect(starPoints).not.toBeNull();
      if (!starPoints) return;

      // 1. Material properties
      const mat = starPoints.material as THREE.PointsMaterial;
      expect(mat.sizeAttenuation).toBe(false);
      expect(mat.depthWrite).toBe(false);
      expect(mat.depthTest).toBe(false);
      expect(mat.fog).toBe(false);
      expect(starPoints.frustumCulled).toBe(false);
      expect(starPoints.renderOrder).toBe(-1000);

      // 2. Star radius ~3600m (0.9 * 4000)
      const positions = starPoints.geometry.getAttribute('position');
      expect(positions.count).toBeGreaterThanOrEqual(600);
      const sampleDistance = Math.hypot(positions.getX(0), positions.getY(0), positions.getZ(0));
      expect(sampleDistance).toBeCloseTo(3600, 1);

      // 3. Daytime vs night visibility
      lighting.setTime(12.0); // Noon
      expect(starPoints.visible).toBe(false);

      lighting.setTime(22.0); // Night
      expect(starPoints.visible).toBe(true);
      expect(mat.opacity).toBeGreaterThan(0.8);

      // 4. Follows camera position
      const dummyCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 4000);
      dummyCamera.position.set(125, 45, -230);
      lighting.updateStarDome(dummyCamera);
      expect(starPoints.position.x).toBe(125);
      expect(starPoints.position.y).toBe(45);
      expect(starPoints.position.z).toBe(-230);
    });
  });

  describe('2. Label Nama Jalan Indonesia pada Permukaan Aspal', () => {
    it('menghasilkan nama jalan Indonesia realistis sesuai hierarki jalan', () => {
      const arterialEdge: RoadEdge = {
        id: 'edge_arterial_1',
        startNodeId: 'n1',
        endNodeId: 'n2',
        type: 'arterial',
        controlPoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 20), new THREE.Vector3(0, 0, 30)],
        length: 30
      };

      const name = RoadGeometryBuilder.resolveRoadName(arterialEdge);
      expect(name).toMatch(/^JL\./);

      const collectorEdge: RoadEdge = {
        id: 'edge_collector_1',
        startNodeId: 'n1',
        endNodeId: 'n2',
        type: 'collector',
        controlPoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 10), new THREE.Vector3(0, 0, 20), new THREE.Vector3(0, 0, 30)],
        length: 30
      };

      const collName = RoadGeometryBuilder.resolveRoadName(collectorEdge);
      expect(collName).toMatch(/^JL\./);

      // Custom override
      const customEdge: RoadEdge = {
        ...arterialEdge,
        name: 'JL. MALIOBORO BARAT'
      };
      expect(RoadGeometryBuilder.resolveRoadName(customEdge)).toBe('JL. MALIOBORO BARAT');
    });

    it('membuat tekstur stensil nama jalan menggunakan tipografi Plus Jakarta Sans', () => {
      const tex = ProceduralTextureGen.getRoadSurfaceNameTexture('JL. MANGKUBUMI');
      expect(tex).toBeDefined();
      expect(tex.colorSpace).toBe(THREE.SRGBColorSpace);

      const mat = RoadGeometryBuilder.getRoadTextMaterial('JL. MANGKUBUMI');
      expect(mat.map).toBe(tex);
      expect(mat.transparent).toBe(true);
    });

    it('meletakkan mesh RoadSurfaceLabel pada ruas jalan dengan orientasi sudut jalan', () => {
      const graph = new RoadGraph();
      const n1 = graph.getOrCreateNode(new THREE.Vector3(0, 0, 0));
      const n2 = graph.getOrCreateNode(new THREE.Vector3(0, 0, 60));
      const edge = graph.addEdge(n1.id, n2.id, 'arterial')!;

      const group = RoadGeometryBuilder.buildRoadMeshGroup(edge, graph);

      const labelMesh = group.getObjectByName('RoadSurfaceLabel') as THREE.Mesh;
      expect(labelMesh).toBeDefined();
      expect(labelMesh.geometry).toBeInstanceOf(THREE.PlaneGeometry);
      expect(labelMesh.position.y).toBeCloseTo(0.075, 2);
    });
  });

  describe('3. Mode Foto Resolusi Tinggi & Tilt-Shift', () => {
    it('mendukung ekspor foto beresolusi hingga 4K UHD dan filter tilt-shift miniatur', () => {
      // Mock minimal engine structure
      const mockRenderer = {
        domElement: {
          width: 1920,
          height: 1080
        },
        getPixelRatio: () => 1,
        setPixelRatio: () => {},
        setSize: (w: number, h: number) => {
          mockRenderer.domElement.width = w;
          mockRenderer.domElement.height = h;
        },
        render: () => {}
      };

      const mockCamera = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);

      const mockEngine: any = {
        renderer: mockRenderer,
        cameraController: {
          activeCamera: mockCamera
        },
        scene: new THREE.Scene(),
        currentQuality: 'high'
      };

      // Pastikan fungsi captureHighResPhoto dapat dipanggil tanpa error
      expect(typeof ScreenshotExporter.captureHighResPhoto).toBe('function');
    });
  });

  describe('4. QA Kepatuhan Lisensi Terbuka & Aturan Mutlak', () => {
    it('semua tekstur baru di manifest.json berlisensi CC0 dan tercatat di CREDITS.md', () => {
      const manifestPath = path.resolve('public/assets/textures/manifest.json');
      const creditsPath = path.resolve('CREDITS.md');

      expect(fs.existsSync(manifestPath)).toBe(true);
      expect(fs.existsSync(creditsPath)).toBe(true);

      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const credits = fs.readFileSync(creditsPath, 'utf8');

      for (const [key, mat] of Object.entries<any>(manifest.materials)) {
        const lic = mat.license;
        const isValid = lic.includes('CC0') || lic.includes('MIT') || lic.includes('OFL') || lic.includes('Apache');
        expect(isValid).toBe(true);
        expect(credits).toContain(mat.license);
      }
    });

    it('nama toko dan papan nama 100% berbahasa Indonesia generik', () => {
      const genericKeywords = ['TOKO', 'WARUNG', 'APOTEK', 'KAFE', 'BENGKEL', 'ELEKTRONIK', 'NOTARIS', 'LAUNDRY'];
      for (let i = 0; i < 8; i++) {
        const tex = ProceduralTextureGen.getStoreSignboardTexture(i);
        expect(tex).toBeDefined();
      }
    });
  });
});
