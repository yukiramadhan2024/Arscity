import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../state/useUIStore';
import { CustomSelect } from './CustomSelect';
import { RoofType, WallMaterialType, BuildingInstance } from '../../buildings/PrefabTypes';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { AddBuildingCommand } from '../../core/commands/CityCommands';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import {
  X,
  Building2,
  Sparkles,
  Rotate3d
} from 'lucide-react';

interface Building3DLivePreviewProps {
  width: number;
  length: number;
  floorCount: number;
  floorHeight: number;
  wallMaterial: WallMaterialType;
  wallColor: string;
  roofType: RoofType;
  roofMaterial: string;
  roofOverhang: number;
}

/**
 * Interactive Live 3D Building Preview Canvas
 * Renders real-time architectural model with sun lighting, meter grid,
 * and mouse-drag orbit rotation.
 */
const Building3DLivePreview: React.FC<Building3DLivePreviewProps> = ({
  width,
  length,
  floorCount,
  floorHeight,
  wallMaterial,
  wallColor,
  roofType,
  roofMaterial,
  roofOverhang
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yawRef = useRef<number>(-0.6);
  const pitchRef = useRef<number>(0.38);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomFactorRef = useRef<number>(1.0);

  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const baseDistanceRef = useRef<number>(20);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3, 0));
  const [sceneReady, setSceneReady] = useState<boolean>(false);

  // Helper to recursively dispose geometries and materials of an Object3D hierarchy
  const disposeHierarchy = (node: THREE.Object3D) => {
    node.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => mat?.dispose());
          } else {
            mesh.material?.dispose();
          }
        }
      }
    });
  };

  // 1. WebGL Renderer & Scene Lifecycle (Mount / Unmount)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const widthPx = container.clientWidth || 520;
    const heightPx = 220;

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(38, widthPx / heightPx, 0.1, 150);
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance'
      });
      renderer.setSize(widthPx, heightPx);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.warn('Live 3D Preview: WebGL context could not be created:', e);
      return;
    }

    // Lighting Setup (Afternoon Tropical Sun & Ambient)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff8f0, 0x94a3b8, 0.45);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    sunLight.position.set(18, 28, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Ground Meter Grid
    const grid = new THREE.GridHelper(36, 36, 0x0A84FF, 0xCBD5E1);
    grid.position.y = 0;
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    gridMat.opacity = 0.55;
    scene.add(grid);

    // Shadow receiver disc
    const shadowGeo = new THREE.PlaneGeometry(40, 40);
    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.22 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Dynamic Building Group
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    // Animation & Render Loop
    let animId: number;
    const render = () => {
      if (!isDraggingRef.current) {
        yawRef.current += 0.0025;
      }

      const dist = baseDistanceRef.current * zoomFactorRef.current;
      const yaw = yawRef.current;
      const pitch = pitchRef.current;
      const target = targetLookAtRef.current;

      const camX = target.x + dist * Math.cos(pitch) * Math.sin(yaw);
      const camY = target.y + dist * Math.sin(pitch);
      const camZ = target.z + dist * Math.cos(pitch) * Math.cos(yaw);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(target);

      renderer.render(scene, camera);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    // ResizeObserver for dynamic container dimensions
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width || container.clientWidth || 520;
          const h = 220;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);
    }

    setSceneReady(true);

    return () => {
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      disposeHierarchy(buildingGroup);
      grid.geometry.dispose();
      gridMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      buildingGroupRef.current = null;
    };
  }, []);

  // 2. Dynamic Model Rebuild (Triggered whenever dimensions, materials, or roof change)
  useEffect(() => {
    const buildingGroup = buildingGroupRef.current;
    if (!sceneReady || !buildingGroup) return;

    // Explicitly dispose all BufferGeometry and Material on old preview meshes before adding new meshes
    disposeHierarchy(buildingGroup);
    while (buildingGroup.children.length > 0) {
      buildingGroup.remove(buildingGroup.children[0]);
    }

    const matLib = MaterialLibrary.getInstance();

    // Isolated cloned materials for preview to prevent VRAM accumulation & preserve materialCache
    const plinthMat = matLib.getMaterial('concrete', { color: '#64748B', roughness: 0.88 }).clone();
    const wallMat = matLib.getMaterial(wallMaterial, { color: wallColor }).clone();
    const frameMat = matLib.getMaterial('frame').clone();
    const glassMat = matLib.getMaterial('glass').clone();
    const roofMatName = roofMaterial === 'clay_tile' ? 'roof_tile' : roofMaterial === 'dark_zinc' ? 'dark_metal' : 'concrete';
    const roofMat = matLib.getMaterial(roofMatName, { color: roofMaterial === 'dark_zinc' ? '#1E293B' : undefined }).clone();

    // Plinth foundation
    const plinthH = 0.35;
    const plinthGeo = new THREE.BoxGeometry(width + 0.35, plinthH, length + 0.35);
    const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
    plinthMesh.position.y = plinthH * 0.5;
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    buildingGroup.add(plinthMesh);

    // Floors & Walls
    for (let f = 0; f < floorCount; f++) {
      const floorBaseY = plinthH + f * floorHeight;

      // Intermediate floor slab
      if (f > 0) {
        const slabGeo = new THREE.BoxGeometry(width + 0.15, 0.22, length + 0.15);
        const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
        slabMesh.position.y = floorBaseY;
        slabMesh.castShadow = true;
        slabMesh.receiveShadow = true;
        buildingGroup.add(slabMesh);
      }

      // Main floor volume
      const floorGeo = new THREE.BoxGeometry(width, floorHeight - (f > 0 ? 0.22 : 0), length);
      const floorMesh = new THREE.Mesh(floorGeo, wallMat);
      floorMesh.position.y = floorBaseY + (floorHeight - (f > 0 ? 0.22 : 0)) * 0.5;
      floorMesh.castShadow = true;
      floorMesh.receiveShadow = true;
      buildingGroup.add(floorMesh);

      // Architectural Windows & Doors
      const winH = 1.4;
      const winW = Math.min(2.4, width * 0.35);
      const winY = floorBaseY + floorHeight * 0.55;

      // Front window/door (+Z)
      if (f === 0) {
        // Entrance Door
        const doorGeo = new THREE.BoxGeometry(1.8, 2.2, 0.08);
        const doorMesh = new THREE.Mesh(doorGeo, frameMat);
        doorMesh.position.set(0, floorBaseY + 1.1, length * 0.5 + 0.04);
        buildingGroup.add(doorMesh);

        const glassGeo = new THREE.BoxGeometry(1.5, 1.9, 0.04);
        const doorGlass = new THREE.Mesh(glassGeo, glassMat);
        doorGlass.position.set(0, floorBaseY + 1.1, length * 0.5 + 0.05);
        buildingGroup.add(doorGlass);
      } else {
        // Balcony Window & Glass Railing
        const winGeo = new THREE.BoxGeometry(winW * 1.6, winH, 0.08);
        const winMesh = new THREE.Mesh(winGeo, frameMat);
        winMesh.position.set(0, winY, length * 0.5 + 0.04);
        buildingGroup.add(winMesh);

        const railGeo = new THREE.BoxGeometry(width * 0.85, 0.9, 0.04);
        const railMesh = new THREE.Mesh(railGeo, glassMat);
        railMesh.position.set(0, floorBaseY + 0.45, length * 0.5 + 0.15);
        buildingGroup.add(railMesh);
      }

      // Side windows (±X)
      [-1, 1].forEach((side) => {
        const sideWinGeo = new THREE.BoxGeometry(0.08, winH, Math.min(2.0, length * 0.35));
        const sideWinMesh = new THREE.Mesh(sideWinGeo, frameMat);
        sideWinMesh.position.set(side * (width * 0.5 + 0.04), winY, 0);
        buildingGroup.add(sideWinMesh);
      });
    }

    // Roof on Top
    const roofBaseY = plinthH + floorCount * floorHeight;
    const rw = width + roofOverhang * 2;
    const rl = length + roofOverhang * 2;

    if (roofType === 'flat') {
      // Modern Flat Roof Terrace with Parapet
      const slabGeo = new THREE.BoxGeometry(rw, 0.28, rl);
      const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
      slabMesh.position.y = roofBaseY + 0.14;
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      buildingGroup.add(slabMesh);

      // Parapet perimeter
      const parapetH = 0.45;
      const pThick = 0.18;
      const pMat = wallMat;
      [-1, 1].forEach((s) => {
        const pGeo = new THREE.BoxGeometry(rw, parapetH, pThick);
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(0, roofBaseY + 0.28 + parapetH * 0.5, s * (rl * 0.5 - pThick * 0.5));
        buildingGroup.add(pMesh);
      });
      [-1, 1].forEach((s) => {
        const pGeo = new THREE.BoxGeometry(pThick, parapetH, rl - pThick * 2);
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(s * (rw * 0.5 - pThick * 0.5), roofBaseY + 0.28 + parapetH * 0.5, 0);
        buildingGroup.add(pMesh);
      });
    } else if (roofType === 'joglo') {
      // Nusantara Joglo Brunjung Tiered Roof
      const eaveH = 1.2;
      const eaveGeo = new THREE.ConeGeometry(Math.hypot(rw, rl) * 0.52, eaveH, 4);
      eaveGeo.rotateY(Math.PI / 4);
      const eaveMesh = new THREE.Mesh(eaveGeo, roofMat);
      eaveMesh.scale.set(rw / Math.hypot(rw, rl), 1, rl / Math.hypot(rw, rl));
      eaveMesh.position.set(0, roofBaseY + eaveH * 0.5, 0);
      eaveMesh.castShadow = true;
      buildingGroup.add(eaveMesh);

      const crownH = 2.4;
      const crownW = rw * 0.52;
      const crownL = rl * 0.52;
      const crownGeo = new THREE.ConeGeometry(Math.hypot(crownW, crownL) * 0.5, crownH, 4);
      crownGeo.rotateY(Math.PI / 4);
      const crownMesh = new THREE.Mesh(crownGeo, roofMat);
      crownMesh.scale.set(crownW / Math.hypot(crownW, crownL), 1, crownL / Math.hypot(crownW, crownL));
      crownMesh.position.set(0, roofBaseY + eaveH + crownH * 0.5 - 0.2, 0);
      crownMesh.castShadow = true;
      buildingGroup.add(crownMesh);

      const finialGeo = new THREE.BoxGeometry(crownW * 0.65, 0.18, 0.18);
      const finialMat = matLib.getMaterial('wood', { color: '#B45309' }).clone();
      const finialMesh = new THREE.Mesh(finialGeo, finialMat);
      finialMesh.position.set(0, roofBaseY + eaveH + crownH - 0.15, 0);
      buildingGroup.add(finialMesh);
    } else if (roofType === 'gable') {
      const roofH = Math.min(rw, rl) * 0.42;
      const gableGeo = new THREE.CylinderGeometry(0, rw * 0.5, roofH, 3, 1, false);
      gableGeo.rotateZ(Math.PI / 2);
      gableGeo.rotateY(Math.PI / 2);
      const gableMesh = new THREE.Mesh(gableGeo, roofMat);
      gableMesh.scale.set(1, 1, rl / rw);
      gableMesh.position.set(0, roofBaseY + roofH * 0.5, 0);
      gableMesh.castShadow = true;
      buildingGroup.add(gableMesh);
    } else if (roofType === 'dome') {
      const domeR = Math.min(rw, rl) * 0.45;
      const domeGeo = new THREE.SphereGeometry(domeR, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMesh = new THREE.Mesh(domeGeo, roofMat);
      domeMesh.position.set(0, roofBaseY, 0);
      domeMesh.castShadow = true;
      buildingGroup.add(domeMesh);
    } else {
      const roofH = Math.min(rw, rl) * 0.38;
      const hipGeo = new THREE.ConeGeometry(Math.hypot(rw, rl) * 0.5, roofH, 4);
      hipGeo.rotateY(Math.PI / 4);
      const hipMesh = new THREE.Mesh(hipGeo, roofMat);
      hipMesh.scale.set(rw / Math.hypot(rw, rl), 1, rl / Math.hypot(rw, rl));
      hipMesh.position.set(0, roofBaseY + roofH * 0.5, 0);
      hipMesh.castShadow = true;
      buildingGroup.add(hipMesh);
    }

    // 1.65m Scale Human Silhouette for Proportion Reference
    const humanGroup = new THREE.Group();
    const torsoMat = new THREE.MeshBasicMaterial({ color: 0x0A84FF });
    const torsoGeo = new THREE.CylinderGeometry(0.18, 0.14, 1.2, 8);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 0.6;
    humanGroup.add(torso);

    const headGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const head = new THREE.Mesh(headGeo, torsoMat);
    head.position.y = 1.35;
    humanGroup.add(head);

    humanGroup.position.set(width * 0.5 + 0.8, 0, length * 0.5 + 0.4);
    buildingGroup.add(humanGroup);

    // Update camera target and distance
    const totalBldH = floorCount * floorHeight + 3.0;
    baseDistanceRef.current = Math.hypot(width, totalBldH, length) * 1.45;
    targetLookAtRef.current.set(0, totalBldH * 0.45, 0);
  }, [sceneReady, width, length, floorCount, floorHeight, wallMaterial, wallColor, roofType, roofMaterial, roofOverhang]);

  // Pointer drag controls for 3D orbit
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    yawRef.current -= dx * 0.012;
    pitchRef.current = Math.max(0.12, Math.min(1.4, pitchRef.current + dy * 0.012));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.0015;
    zoomFactorRef.current = Math.max(0.65, Math.min(2.2, zoomFactorRef.current + zoomDelta));
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '220px',
        borderRadius: '20px',
        overflow: 'hidden',
        position: 'relative',
        background: 'radial-gradient(circle at 50% 30%, #F1F5F9 0%, #E2E8F0 100%)',
        border: '1px solid rgba(255, 255, 255, 0.9)',
        boxShadow: 'inset 0 2px 10px rgba(15, 23, 42, 0.06)',
        marginBottom: '14px',
        cursor: 'grab',
        touchAction: 'none'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />

      {/* Top-left Indicator */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 2px 6px rgba(15, 23, 42, 0.06)',
          pointerEvents: 'none'
        }}
      >
        <Rotate3d size={13} style={{ color: '#007AFF' }} />
        <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', letterSpacing: '0.02em' }}>
          LIVE 3D PREVIEW
        </span>
      </div>

      {/* Bottom-right Hint */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '10px',
          color: '#475569',
          padding: '2px 8px',
          borderRadius: '6px',
          background: 'rgba(255, 255, 255, 0.75)',
          pointerEvents: 'none'
        }}
      >
        Drag putar • Scroll zoom
      </div>
    </div>
  );
};

export interface CustomBuildingCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomBuildingCreatorModal: React.FC<CustomBuildingCreatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { engine, setActiveTool } = useUIStore();

  const [buildingName, setBuildingName] = useState<string>('Villa Tropis Kustom');
  const [width, setWidth] = useState<number>(10);
  const [length, setLength] = useState<number>(12);
  const [floorCount, setFloorCount] = useState<number>(2);
  const [floorHeight] = useState<number>(3.2);

  // Materials & Textures
  const [wallMaterial, setWallMaterial] = useState<WallMaterialType>('plaster');
  const [wallColor, setWallColor] = useState<string>('#f8fafc');
  const [roofType, setRoofType] = useState<RoofType>('hip');
  const [roofMaterial, setRoofMaterial] = useState<string>('dark_zinc');
  const [roofOverhang, setRoofOverhang] = useState<number>(1.2);

  if (!isOpen) return null;

  const COLOR_PALETTES = [
    { label: 'Putih Murni', hex: '#f8fafc' },
    { label: 'Abu Semen', hex: '#e2e8f0' },
    { label: 'Krem Pasir', hex: '#fef3c7' },
    { label: 'Bata Merah', hex: '#9a3412' },
    { label: 'Kayu Jati', hex: '#78350f' },
    { label: 'Arang Gelap', hex: '#1e293b' },
    { label: 'Hijau Sage', hex: '#4d7c0f' },
    { label: 'Biru Arsitek', hex: '#0284c7' }
  ];

  const footprintArea = width * length;
  const totalFloorArea = footprintArea * floorCount;
  const totalHeight = floorCount * floorHeight + (roofType === 'flat' ? 0.4 : 2.8);

  const handleCreateAndPlace = () => {
    if (!engine) return;

    const customId = `custom_bld_${Date.now()}`;
    const targetPos = engine.cameraController.target.clone();

    const instance: BuildingInstance = {
      id: customId,
      presetKey: 'custom_designer',
      name: buildingName || 'Bangunan Kustom',
      category: 'residential',
      position: targetPos,
      rotationY: 0,
      width,
      length,
      floorCount,
      floorHeight,
      roofType,
      roofOverhang,
      wallMaterial,
      wallColor,
      roofMaterial: roofMaterial as any
    };

    // Execute via command manager
    engine.executeCommand(new AddBuildingCommand(engine, instance));
    proceduralAudio.playPlaceBuilding();

    // Select the newly built custom building
    engine.buildingManager.selectBuilding(customId);
    setActiveTool('select');
    onClose();
  };

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '580px',
          maxWidth: '92vw',
          maxHeight: '88vh'
        }}
      >
        {/* Header - Laboratorium Analisis Style */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(10, 132, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#007AFF'
              }}
            >
              <Building2 size={20} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lab-title-color)' }}>
                Studio Bangunan & Tekstur Kustom
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lab-subtitle-color)' }}>
                Rancang proporsi massa, material tekstur, dan fasad sendiri
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Studio">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-sheet-body" style={{ overflowY: 'auto', padding: '16px' }}>
          {/* Live 3D Building Preview (Tinggi 220px, Lebar Penuh) */}
          <Building3DLivePreview
            width={width}
            length={length}
            floorCount={floorCount}
            floorHeight={floorHeight}
            wallMaterial={wallMaterial}
            wallColor={wallColor}
            roofType={roofType}
            roofMaterial={roofMaterial}
            roofOverhang={roofOverhang}
          />

          {/* Quick Metrics Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '12px 16px',
              borderRadius: '20px',
              marginBottom: '16px',
              background: 'rgba(255, 255, 255, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>TAPAK DASAR</div>
              <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {footprintArea} m²
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(15, 23, 42, 0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>TOTAL LANTAI</div>
              <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF' }}>
                {totalFloorArea} m²
              </div>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(15, 23, 42, 0.08)' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>TINGGI MASSA</div>
              <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                {totalHeight.toFixed(1)} m
              </div>
            </div>
          </div>

          {/* Section 1: Nama & Dimensi */}
          <div className="inset-header" style={{ color: '#475569', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em' }}>NAMA & MASSA BANGUNAN</div>
          <div className="inset-group">
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: '#475569', minWidth: '95px', fontWeight: 600 }}>Nama Desain</span>
              <input
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                style={{
                  flex: 1,
                  background: '#FFFFFF',
                  border: '1.5px solid rgba(15, 23, 42, 0.14)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#0F172A',
                  outline: 'none',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)'
                }}
              />
            </div>

            {/* Slider Lebar */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Lebar Massa (Depan)</span>
                <span className="tabular-nums font-mono font-bold" style={{ color: '#0F172A' }}>{width} meter</span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="1"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Lebar Massa"
              />
            </div>

            {/* Slider Panjang */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Panjang Massa (Samping)</span>
                <span className="tabular-nums font-mono font-bold" style={{ color: '#0F172A' }}>{length} meter</span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="1"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Panjang Massa"
              />
            </div>

            {/* Slider Jumlah Lantai */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Jumlah Lantai</span>
                <span className="tabular-nums font-mono font-bold" style={{ color: '#0F172A' }}>{floorCount} Lantai</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={floorCount}
                onChange={(e) => setFloorCount(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Jumlah Lantai"
              />
            </div>
          </div>

          {/* Section 2: Tekstur Dinding & Warna */}
          <div className="inset-header" style={{ color: '#475569', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em' }}>TEKSTUR MATERIAL DINDING</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Tekstur Dinding</span>
              <CustomSelect<WallMaterialType>
                value={wallMaterial}
                onChange={setWallMaterial}
                options={[
                  { value: 'plaster', label: 'Plester & Cat Halus', badge: 'Halus', description: 'Permukaan plester kapur tropis' },
                  { value: 'brick', label: 'Bata Merah Ekspos', badge: 'Tekstur', description: 'Pola bata merah alami berkarakter' },
                  { value: 'concrete', label: 'Beton Cor Board-Formed', badge: 'Brutalis', description: 'Serat cetakan papan kayu pada beton' },
                  { value: 'wood', label: 'Kayu Jati Kisi Vertikal', badge: 'Tropis', description: 'Slat kayu jati penangkal panas' }
                ]}
              />
            </div>

            {/* Warna Dinding */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Palet Warna Dinding</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.hex}
                    type="button"
                    onClick={() => setWallColor(pal.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '10px',
                      border: wallColor === pal.hex ? '1.5px solid #007AFF' : '1px solid rgba(15, 23, 42, 0.14)',
                      background: wallColor === pal.hex ? 'rgba(10, 132, 255, 0.08)' : '#FFFFFF',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: pal.hex,
                        border: '1px solid rgba(0,0,0,0.2)'
                      }}
                    />
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A' }}>{pal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Bentuk & Tekstur Atap */}
          <div className="inset-header" style={{ color: '#475569', fontWeight: 700, fontSize: '11px', letterSpacing: '0.06em' }}>BENTUK & TEKSTUR ATAP TROPIS</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Bentuk Atap</span>
              <CustomSelect<RoofType>
                value={roofType}
                onChange={setRoofType}
                options={[
                  { value: 'hip', label: 'Limasan Tropis (Perisai 4 Sisi)', description: 'Aerodinamis dan efektif menepis tempias air' },
                  { value: 'gable', label: 'Pelana Tropis (2 Sisi Miring)', description: 'Sirkulasi udara optimal dan konstruksi efisien' },
                  { value: 'joglo', label: 'Joglo Tradisional Nusantara', description: 'Atap brunjung bertingkat warisan Jawa' },
                  { value: 'flat', label: 'Dak Datar Beton Modern', description: 'Plat beton fungsional untuk roof garden' },
                  { value: 'dome', label: 'Kubah Tropis', description: 'Atap kubah lengkung fasilitas publik' }
                ]}
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: '#475569', fontWeight: 600 }}>Tekstur Atap</span>
              <CustomSelect<string>
                value={roofMaterial}
                onChange={setRoofMaterial}
                options={[
                  { value: 'dark_zinc', label: 'Dark Zinc Standing Seam', badge: 'Modern', description: 'Tekstur metal seng gelap kontemporer' },
                  { value: 'clay_tile', label: 'Genteng Tanah Liat Alami', badge: 'Tropis', description: 'Genteng bakar coklat peredam panas' },
                  { value: 'concrete_slab', label: 'Plat Beton Abu', badge: 'Minimalis', description: 'Tekstur semen ekspos halus' }
                ]}
              />
            </div>

            {/* Overhang teritisan */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Teritisan / Overhang (Peneduh)</span>
                <span className="tabular-nums font-mono font-bold" style={{ color: '#0F172A' }}>{roofOverhang.toFixed(1)} meter</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={roofOverhang}
                onChange={(e) => setRoofOverhang(parseFloat(e.target.value))}
                className="ios-slider"
                aria-label="Teritisan Overhang"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleCreateAndPlace}
              className="ios-btn ios-btn-primary"
              style={{ flex: 1, height: '40px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Sparkles size={16} strokeWidth={2} />
              <span>Bangun di Titik Kamera</span>
            </button>
            <button
              onClick={onClose}
              className="ios-btn"
              style={{ padding: '0 16px', height: '40px' }}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CustomBuildingStudioModal = CustomBuildingCreatorModal;
export type CustomBuildingStudioModalProps = CustomBuildingCreatorModalProps;
