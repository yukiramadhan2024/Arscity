import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useUIStore } from '../state/useUIStore';
import { CustomSelect } from './CustomSelect';
import { RoofType, WallMaterialType, BuildingInstance } from '../../buildings/PrefabTypes';
import { StudioCreationMode } from '../../buildings/CustomBuildingModel';
import { registerCustomStudioFurniture } from '../../buildings/FirstPersonFurnitureCatalog';
import {
  MassingShapeType,
  WindowStyleType,
  generateFloorsForMassingShape,
  calculateBuildingAreas
} from '../../buildings/CustomBuildingModel';
import {
  TROPICAL_STYLE_PRESETS,
  validateBuildingDesign,
  generateCuratedRandomDesign,
  formatMeters,
  formatArea,
  CustomBuildingConfig
} from '../../buildings/CustomBuildingValidator';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { AddBuildingCommand } from '../../core/commands/CityCommands';
import { MaterialLibrary } from '../../materials/MaterialLibrary';
import { showSnackbar } from '../state/useSnackbarStore';
import {
  X,
  Building2,
  Sparkles,
  Rotate3d,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
  Ruler,
  Play,
  Pause,
  Sun,
  RotateCcw,
  Focus,
  Home,
  Palette,
  Grid,
  Wand2,
  Check,
  Sliders,
  Columns,
  Box,
  Download,
  Star,
  Trash2,
  Plus,
  Bookmark,
  ChevronDown,
  Pencil,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { ArscityLogo } from './ArscityLogo';
import { useModalA11y } from '../hooks/useModalA11y';

/**
 * T5.4: Creates high-resolution canvas text billboard sprites for 3D CAD dimensions
 * Uses exactly 512 x 112 pixel canvas base scaled by devicePixelRatio, centered text, anti-collision.
 */
export function createTextSprite(
  text: string,
  bgColor = 'rgba(240, 245, 250, 0.96)',
  textColor = '#0F172A',
  borderColor = '#007AFF'
): THREE.Sprite {
  const dpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
  const baseW = 512;
  const baseH = 112;

  let canvas: any;
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    canvas = document.createElement('canvas');
    canvas.width = Math.round(baseW * dpr);
    canvas.height = Math.round(baseH * dpr);
  } else {
    canvas = {
      width: Math.round(baseW * dpr),
      height: Math.round(baseH * dpr),
      getContext: () => null
    };
  }

  const ctx = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null;
  if (ctx) {
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, baseW, baseH);
    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 4;
    const r = 24;
    const x = 6, y = 6, w = baseW - 12, h = baseH - 12;

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

    ctx.fillStyle = textColor;
    // Rata tengah, font size fits long label "+11,96 m (Puncak Atap)" cleanly
    const fontSize = text.length > 18 ? 32 : 36;
    ctx.font = `bold ${fontSize}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, baseW / 2, baseH / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  // Anti-collision: depthTest: true with depthWrite: false prevents sprites from covering each other blindly
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: true, depthWrite: false });
  const sprite = new THREE.Sprite(spriteMat);
  const sprH = 1.12;
  const sprW = 5.12;
  sprite.scale.set(sprW, sprH, 1);
  return sprite;
}

/**
 * Creates Architectural Compass Ring on the grid floor with U (N), T (E), S (S), B (W)
 */
function createArchitecturalCompassRing(radius: number, theme: 'light' | 'blueprint' = 'light'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ArchitecturalCompassRing';

  const ringGeo = new THREE.RingGeometry(radius - 0.08, radius + 0.08, 96);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: theme === 'blueprint' ? 0x38bdf8 : 0x007aff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.20
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = 0.02;
  group.add(ring);

  // 4 Cardinal markers: Utara, Timur, Selatan, Barat
  const cardinalDirs = [
    { label: 'Utara', pos: new THREE.Vector3(0, 0.04, -radius - 1.2), color: '#007AFF' },
    { label: 'Timur', pos: new THREE.Vector3(radius + 1.2, 0.04, 0), color: '#0F172A' },
    { label: 'Selatan', pos: new THREE.Vector3(0, 0.04, radius + 1.2), color: '#0F172A' },
    { label: 'Barat', pos: new THREE.Vector3(-radius - 1.2, 0.04, 0), color: '#0F172A' }
  ];

  for (const c of cardinalDirs) {
    const sp = createTextSprite(
      c.label,
      theme === 'blueprint' ? 'rgba(10, 26, 47, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      theme === 'blueprint' ? '#38bdf8' : c.color,
      theme === 'blueprint' ? '#38bdf8' : '#007AFF'
    );
    sp.position.copy(c.pos);
    sp.scale.set(2.8, 0.7, 1);
    group.add(sp);
  }

  // Cross hair ticks along compass ring
  const ticksPoints: THREE.Vector3[] = [
    new THREE.Vector3(0, 0.03, -radius - 0.5),
    new THREE.Vector3(0, 0.03, -radius + 0.5),
    new THREE.Vector3(radius - 0.5, 0.03, 0),
    new THREE.Vector3(radius + 0.5, 0.03, 0),
    new THREE.Vector3(0, 0.03, radius - 0.5),
    new THREE.Vector3(0, 0.03, radius + 0.5),
    new THREE.Vector3(-radius - 0.5, 0.03, 0),
    new THREE.Vector3(-radius + 0.5, 0.03, 0)
  ];
  const tickGeo = new THREE.BufferGeometry().setFromPoints(ticksPoints);
  const tickMat = new THREE.LineBasicMaterial({
    color: theme === 'blueprint' ? 0x38bdf8 : 0x007aff,
    transparent: true,
    opacity: 0.20
  });
  group.add(new THREE.LineSegments(tickGeo, tickMat));

  return group;
}

/**
 * T5.4: Creates 3D Sun Celestial Arc & Indicator following 08:00, 12:00, 16:00
 * The yellow sun ball is elevated above the highest roof point + 1.5m to avoid intersecting.
 */
export function createSunCelestialArc(
  radius: number,
  zenithHeight: number,
  sunHour: '08:00' | '12:00' | '16:00',
  highestRoofY: number = 0
): THREE.Group {
  const group = new THREE.Group();
  group.name = 'SunCelestialArc';

  // Prompt rule: "Bola matahari kuning dinaikkan ke atas titik tertinggi atap plus 1,5 m sehingga tidak menancap."
  const minSunY = highestRoofY + 1.5;
  const effectiveZenith = Math.max(zenithHeight, minSunY + 4.0);

  const curvePoints: THREE.Vector3[] = [];
  const segments = 48;
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI;
    const x = Math.cos(theta) * radius;
    const y = Math.max(minSunY * 0.4, Math.sin(theta) * effectiveZenith);
    curvePoints.push(new THREE.Vector3(x, y, 0));
  }
  const arcGeo = new THREE.BufferGeometry().setFromPoints(curvePoints);
  const arcMat = new THREE.LineDashedMaterial({
    color: 0xf59e0b,
    dashSize: 0.8,
    gapSize: 0.4,
    transparent: true,
    opacity: 0.20
  });
  const arcLine = new THREE.Line(arcGeo, arcMat);
  arcLine.computeLineDistances();
  group.add(arcLine);

  let sunTheta = Math.PI / 2;
  if (sunHour === '08:00') sunTheta = Math.PI / 6;
  if (sunHour === '16:00') sunTheta = (5 * Math.PI) / 6;

  const sunX = Math.cos(sunTheta) * radius;
  const rawSunY = Math.sin(sunTheta) * effectiveZenith;
  const sunY = Math.max(minSunY, rawSunY);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
  );
  sunMesh.name = 'SunBallMesh';
  sunMesh.position.set(sunX, sunY, 0);
  sunMesh.userData = { sunHour, sunY, highestRoofY, minSunY };
  group.add(sunMesh);

  const haloMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.65, 0.95, 24),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
  );
  haloMesh.position.set(sunX, sunY, 0);
  group.add(haloMesh);

  const sunBadge = createTextSprite(
    `SURYA ${sunHour} WIB`,
    'rgba(254, 243, 199, 0.95)',
    '#B45309',
    '#F59E0B'
  );
  sunBadge.position.set(sunX, sunY + 1.25, 0);
  sunBadge.scale.set(3.0, 0.75, 1);
  group.add(sunBadge);

  return group;
}

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
  isFullScreenCAD?: boolean;
  onToggleFullScreenCAD?: () => void;
  viewPreset?: 'iso' | 'top' | 'front' | 'side';
  renderMode?: 'pbr' | 'cad' | 'clay';
  isWireframeBlueprint?: boolean;
  isAutoRotate?: boolean;
  sunHour?: '08:00' | '12:00' | '16:00';
  cadTheme?: 'light' | 'blueprint';
  onResetCamera?: () => void;
  onWidthChange?: (newWidth: number) => void;
  onLengthChange?: (newLength: number) => void;
  onFloorCountChange?: (newFloorCount: number) => void;
  onCanvasReady?: (canvas: HTMLCanvasElement) => void;

  // Custom Architectural Features (v3.3.0)
  massingShape?: MassingShapeType | string;
  windowStyle?: WindowStyleType | string;
  hasBalcony?: boolean;
  hasSunLouvers?: boolean;
  hasVerticalGarden?: boolean;
  hasFrontArcade?: boolean;
  useBasePlinthMaterial?: boolean;
  baseMaterial?: string;
  mullionColor?: string;
  hasSkylight?: boolean;
  hasSolarPV?: boolean;
  showScaleFigure?: boolean;
  showDetailDims?: boolean;
}

/**
 * Interactive Live 3D Building Preview & CAD Viewport
 * Professional architectural workspace (like Autodesk Forma / ArchiCAD).
 * Features:
 * - Architectural Daylight Slate background (or blueprint mode)
 * - Dual-scale architectural grid (1.0m thin + 5.0m thick)
 * - Dynamic 3D dimension lines & vertical elevation pole with floor markers
 * - Rich sun lighting (HemisphereLight 1.35 + key & fill lights) so roofs are never black
 * - Overhang ridge, window mullions, entrance terrace/canopy, and 1.70m scale figure
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
  roofOverhang,
  isFullScreenCAD = false,
  onToggleFullScreenCAD,
  viewPreset = 'iso',
  renderMode = 'pbr',
  isWireframeBlueprint = false,
  isAutoRotate = true,
  sunHour = '12:00',
  cadTheme = 'light',
  onResetCamera,
  onWidthChange,
  onLengthChange,
  onFloorCountChange,
  onCanvasReady,
  massingShape = 'box',
  windowStyle = 'modern_ribbon',
  hasBalcony = true,
  hasSunLouvers = false,
  hasVerticalGarden = false,
  hasFrontArcade = false,
  useBasePlinthMaterial = false,
  baseMaterial = 'stone_plinth',
  mullionColor = '#1e293b',
  hasSkylight = false,
  hasSolarPV = false,
  showScaleFigure = false,
  showDetailDims = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const yawRef = useRef<number>(-0.785);
  const pitchRef = useRef<number>(0.52);
  const isDraggingRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const zoomFactorRef = useRef<number>(1.0);

  const viewPresetRef = useRef(viewPreset);
  viewPresetRef.current = viewPreset;
  const isAutoRotateRef = useRef(isAutoRotate);
  isAutoRotateRef.current = isAutoRotate;
  const widthRef = useRef(width);
  widthRef.current = width;
  const lengthRef = useRef(length);
  lengthRef.current = length;
  const floorCountRef = useRef(floorCount);
  floorCountRef.current = floorCount;
  const floorHeightRef = useRef(floorHeight);
  floorHeightRef.current = floorHeight;

  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const activeGizmoRef = useRef<'width' | 'length' | 'floors' | null>(null);
  const startDragPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const initialValRef = useRef<{ width: number; length: number; floorCount: number }>({ width, length, floorCount });
  const gizmoGroupRef = useRef<THREE.Group | null>(null);

  const buildingGroupRef = useRef<THREE.Group | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const baseDistanceRef = useRef<number>(20);
  const targetLookAtRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 3, 0));
  const [sceneReady, setSceneReady] = useState<boolean>(false);

  // Effective render mode: automatically switches to 'cad' blueprint when cadTheme is blueprint
  const effectiveRenderMode: 'pbr' | 'cad' | 'clay' =
    cadTheme === 'blueprint' ? 'cad' : isWireframeBlueprint ? 'cad' : renderMode;

  // Reset camera to standard architectural isometric perspective
  const handleResetCamera = () => {
    yawRef.current = -0.785;
    pitchRef.current = 0.52;
    zoomFactorRef.current = 1.0;
    proceduralAudio.playTaptic('selection');
    if (onResetCamera) onResetCamera();
  };

  // Update camera orientation when viewPreset changes
  useEffect(() => {
    if (viewPreset === 'iso') {
      yawRef.current = -0.785; // 45 deg
      pitchRef.current = 0.52;  // ~30 deg elevation
    } else if (viewPreset === 'top') {
      yawRef.current = 0;
      pitchRef.current = 1.55;  // Looking directly down
    } else if (viewPreset === 'front') {
      yawRef.current = 0;
      pitchRef.current = 0.05;  // Eye level facing +Z
    } else if (viewPreset === 'side') {
      yawRef.current = -Math.PI / 2; // Facing +X
      pitchRef.current = 0.05;
    }
  }, [viewPreset]);

  // Update sun position & colors when sunHour changes
  useEffect(() => {
    const sun = sunLightRef.current;
    const fill = fillLightRef.current;
    if (!sun || !fill) return;

    if (sunHour === '08:00') {
      sun.position.set(26, 18, 14);
      sun.color.setHex(0xfff3e0);
      sun.intensity = 1.85;
      fill.position.set(-18, 18, -14);
      fill.color.setHex(0xdbeafe);
    } else if (sunHour === '12:00') {
      sun.position.set(4, 38, 4);
      sun.color.setHex(0xffffff);
      sun.intensity = 2.1;
      fill.position.set(-4, 18, -4);
      fill.color.setHex(0xe0f2fe);
    } else {
      // 16:00
      sun.position.set(-24, 18, 16);
      sun.color.setHex(0xffedd5);
      sun.intensity = 1.85;
      fill.position.set(20, 18, -12);
      fill.color.setHex(0xdbeafe);
    }
  }, [sunHour]);

  // Update background color when cadTheme changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    scene.background = new THREE.Color(cadTheme === 'blueprint' ? 0x0a1120 : 0xe8eef5);
  }, [cadTheme]);

  // Helper to recursively dispose geometries, materials, and textures
  const disposeObject3D = (obj: THREE.Object3D) => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          mats.forEach((mat) => {
            if (mat) {
              if ((mat as any).map) (mat as any).map.dispose();
              mat.dispose();
            }
          });
        }
      } else if ((child as THREE.Sprite).isSprite) {
        const sprite = child as THREE.Sprite;
        if (sprite.material) {
          if (sprite.material.map) sprite.material.map.dispose();
          sprite.material.dispose();
        }
      }
    });
  };

  // 1. WebGL Renderer & Scene Lifecycle (Mount / Unmount)
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const widthPx = Math.max(300, container.clientWidth || 520);
    const heightPx = Math.max(200, container.clientHeight || 240);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(cadTheme === 'blueprint' ? 0x0a1120 : 0xe8eef5);
    sceneRef.current = scene;

    const cameraPerspective = new THREE.PerspectiveCamera(38, widthPx / heightPx, 0.1, 500);
    const aspect = widthPx / heightPx;
    const initialViewSize = 28;
    const cameraOrtho = new THREE.OrthographicCamera(
      -initialViewSize * aspect * 0.5,
      initialViewSize * aspect * 0.5,
      initialViewSize * 0.5,
      -initialViewSize * 0.5,
      0.1,
      500
    );
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true
      });
      renderer.setSize(widthPx, heightPx);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (onCanvasReady) {
        onCanvasReady(canvas);
      }
    } catch (e) {
      console.warn('Live 3D Preview: WebGL context could not be created:', e);
      return;
    }

    // Professional CAD Lighting Rig:
    // 1. AmbientLight 0.65 ensures fill
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    // 2. HemisphereLight 1.35 illuminates all underside roofs and overhangs
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x94a3b8, 1.35);
    scene.add(hemiLight);

    // 3. Key Sun DirectionalLight
    const sunLight = new THREE.DirectionalLight(0xfffaed, 1.85);
    sunLight.position.set(4, 38, 4);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);
    sunLightRef.current = sunLight;

    // 4. Fill DirectionalLight from opposing angle to eradicate pitch-black shadow facets
    const fillLight = new THREE.DirectionalLight(0xdbeafe, 0.95);
    fillLight.position.set(-18, 20, -16);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    // Dual-Scale Architectural CAD Grid:
    // Minor 1.0m grid (thin)
    const gridMinor = new THREE.GridHelper(60, 60, 0x94a3b8, cadTheme === 'blueprint' ? 0x1e293b : 0xcbd5e1);
    gridMinor.position.y = 0;
    const gridMatMinor = gridMinor.material as THREE.LineBasicMaterial;
    gridMatMinor.transparent = true;
    gridMatMinor.opacity = 0.12;
    scene.add(gridMinor);

    // Major 5.0m grid (thick)
    const gridMajor = new THREE.GridHelper(60, 12, 0x007aff, cadTheme === 'blueprint' ? 0x38bdf8 : 0x94a3b8);
    gridMajor.position.y = 0.005;
    const gridMatMajor = gridMajor.material as THREE.LineBasicMaterial;
    gridMatMajor.transparent = true;
    gridMatMajor.opacity = 0.18;
    scene.add(gridMajor);

    // Coordinate Axes Helper (X: Red, Y: Green, Z: Blue)
    const axes = new THREE.AxesHelper(3.5);
    axes.position.set(-12, 0.02, -12);
    scene.add(axes);

    // Soft architectural ground shadow receiver plane
    const shadowGeo = new THREE.PlaneGeometry(80, 80);
    const shadowMat = new THREE.ShadowMaterial({ opacity: cadTheme === 'blueprint' ? 0.35 : 0.16 });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.01;
    shadowMesh.receiveShadow = true;
    scene.add(shadowMesh);

    // Dynamic Building Group
    const buildingGroup = new THREE.Group();
    scene.add(buildingGroup);
    buildingGroupRef.current = buildingGroup;

    // Horizontal architectural cut plane set at 2.2m from floor base for top plan view
    const plinthH = 0.35;
    const floorCutPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), plinthH + 2.2);

    // Animation & Render Loop
    let animId: number;
    const render = () => {
      let activeCam: THREE.Camera = cameraPerspective;
      renderer.localClippingEnabled = true;

      const curPreset = viewPresetRef.current;
      const curW = widthRef.current;
      const curL = lengthRef.current;
      const curF = floorCountRef.current;
      const curFH = floorHeightRef.current;
      const curAspect = (container.clientWidth || widthPx) / Math.max(1, container.clientHeight || heightPx);

      if (curPreset === 'top') {
        activeCam = cameraOrtho;
        renderer.clippingPlanes = [floorCutPlane];
        const viewSize = Math.max(curW, curL) * 1.65 * zoomFactorRef.current;
        cameraOrtho.left = -viewSize * curAspect * 0.5;
        cameraOrtho.right = viewSize * curAspect * 0.5;
        cameraOrtho.top = viewSize * 0.5;
        cameraOrtho.bottom = -viewSize * 0.5;
        cameraOrtho.updateProjectionMatrix();

        cameraOrtho.position.set(targetLookAtRef.current.x, targetLookAtRef.current.y + 120, targetLookAtRef.current.z);
        cameraOrtho.up.set(0, 0, -1);
        cameraOrtho.lookAt(targetLookAtRef.current);
      } else if (curPreset === 'front') {
        activeCam = cameraOrtho;
        renderer.clippingPlanes = [];
        const viewSize = Math.max(curW, curF * curFH + 4) * 1.55 * zoomFactorRef.current;
        cameraOrtho.left = -viewSize * curAspect * 0.5;
        cameraOrtho.right = viewSize * curAspect * 0.5;
        cameraOrtho.top = viewSize * 0.5;
        cameraOrtho.bottom = -viewSize * 0.5;
        cameraOrtho.updateProjectionMatrix();

        cameraOrtho.position.set(targetLookAtRef.current.x, targetLookAtRef.current.y, targetLookAtRef.current.z + 120);
        cameraOrtho.up.set(0, 1, 0);
        cameraOrtho.lookAt(targetLookAtRef.current);
      } else if (curPreset === 'side') {
        activeCam = cameraOrtho;
        renderer.clippingPlanes = [];
        const viewSize = Math.max(curL, curF * curFH + 4) * 1.55 * zoomFactorRef.current;
        cameraOrtho.left = -viewSize * curAspect * 0.5;
        cameraOrtho.right = viewSize * curAspect * 0.5;
        cameraOrtho.top = viewSize * 0.5;
        cameraOrtho.bottom = -viewSize * 0.5;
        cameraOrtho.updateProjectionMatrix();

        cameraOrtho.position.set(targetLookAtRef.current.x + 120, targetLookAtRef.current.y, targetLookAtRef.current.z);
        cameraOrtho.up.set(0, 1, 0);
        cameraOrtho.lookAt(targetLookAtRef.current);
      } else {
        // 'iso' 3D orbit perspective
        activeCam = cameraPerspective;
        renderer.clippingPlanes = [];
        if (!isDraggingRef.current && isAutoRotateRef.current) {
          yawRef.current += 0.002;
        }

        const dist = baseDistanceRef.current * zoomFactorRef.current;
        const yaw = yawRef.current;
        const pitch = pitchRef.current;
        const target = targetLookAtRef.current;

        const camX = target.x + dist * Math.cos(pitch) * Math.sin(yaw);
        const camY = target.y + dist * Math.sin(pitch);
        const camZ = target.z + dist * Math.cos(pitch) * Math.cos(yaw);

        cameraPerspective.position.set(camX, camY, camZ);
        cameraPerspective.up.set(0, 1, 0);
        cameraPerspective.lookAt(target);
      }

      activeCameraRef.current = activeCam;
      renderer.render(scene, activeCam);
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    // ResizeObserver for dynamic container dimensions
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = Math.max(200, entry.contentRect.width || container.clientWidth || 520);
          const h = Math.max(150, entry.contentRect.height || container.clientHeight || 240);
          cameraPerspective.aspect = w / h;
          cameraPerspective.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      });
      resizeObserver.observe(container);
    }

    setSceneReady(true);

    return () => {
      cancelAnimationFrame(animId);
      if (resizeObserver) resizeObserver.disconnect();
      disposeObject3D(scene);
      renderer.dispose();
      buildingGroupRef.current = null;
      sceneRef.current = null;
    };
  }, []);

  // 2. Dynamic Model Rebuild (Triggered whenever dimensions, materials, or roof change)
  useEffect(() => {
    const buildingGroup = buildingGroupRef.current;
    if (!sceneReady || !buildingGroup) return;

    // Cleanly remove and dispose old children
    disposeObject3D(buildingGroup);
    while (buildingGroup.children.length > 0) {
      buildingGroup.remove(buildingGroup.children[0]);
    }

    const matLib = MaterialLibrary.getInstance();

    // Isolated materials
    let plinthMat: THREE.Material;
    let wallMat: THREE.Material;
    let frameMat: THREE.Material;
    let glassMat: THREE.Material;
    let roofMat: THREE.Material;
    let ridgeMat: THREE.Material;

    if (effectiveRenderMode === 'cad') {
      const blueprintMat = new THREE.MeshBasicMaterial({
        color: 0x007aff,
        wireframe: true,
        transparent: true,
        opacity: 0.85
      });
      plinthMat = blueprintMat;
      wallMat = blueprintMat;
      frameMat = blueprintMat;
      glassMat = new THREE.MeshBasicMaterial({ color: 0x007aff, transparent: true, opacity: 0.25 });
      roofMat = blueprintMat;
      ridgeMat = blueprintMat;
    } else if (effectiveRenderMode === 'clay') {
      const clayMat = new THREE.MeshStandardMaterial({
        color: 0xf8fafc,
        roughness: 0.95,
        metalness: 0.05
      });
      plinthMat = clayMat;
      wallMat = clayMat;
      frameMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.85 });
      glassMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2, metalness: 0.1 });
      roofMat = clayMat;
      ridgeMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 });
    } else {
      // PBR Realistis
      plinthMat = matLib.getMaterial('concrete', { color: '#64748B', roughness: 0.88 }).clone();
      wallMat = matLib.getMaterial(wallMaterial, { color: wallColor }).clone();
      frameMat = matLib.getMaterial('frame').clone();
      // Sky blue reflecting architectural glass
      glassMat = new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.15,
        metalness: 0.35,
        transparent: true,
        opacity: 0.65
      });

      // T5.4: Roof materials: Terracotta #B45309 for clay tile, Steel #475569 for zinc/metal (no pitch black)
      if (roofMaterial === 'dark_zinc' || roofMaterial === 'steel') {
        roofMat = matLib.getMaterial('metal', { color: 0x475569, roughness: 0.45, metalness: 0.65 }).clone();
        ridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.5 });
      } else if (roofMaterial === 'clay_tile' || roofMaterial === 'terracotta') {
        roofMat = matLib.getMaterial('roof_tile', { color: 0xb45309 }).clone();
        ridgeMat = matLib.getMaterial('roof_tile', { color: 0xb45309 }).clone();
      } else {
        roofMat = matLib.getMaterial('concrete', { color: '#475569', roughness: 0.85 }).clone();
        ridgeMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
      }
    }

    // Edge outline helper for architectural CAD accent
    const addCadEdges = (mesh: THREE.Mesh, color: number = 0x007aff, opacity: number = 0.55) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry, 28);
      const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
      mesh.add(line);
    };

    // ==========================================
    // PROCEDURAL 3D MASSING & ARCHITECTURE (v3.3.0)
    // Supports 5 Massing Shapes: box, l_shape, courtyard_u, stepped_podium, cantilever
    // Supports 5 Window Styles: modern_ribbon, curtain_wall, javanese_krepyak, colonial_arch, minimalist_slot
    // Supports: Balcony, Sun Louvers, Vertical Garden, Front Arcade, Base Plinth Material, Solar PV, Skylight
    // ==========================================
    const plinthH = 0.35;
    const halfW = width * 0.5;
    const halfL = length * 0.5;

    // 1. Plinth Foundation (Footprint Ground Slab)
    if (massingShape === 'l_shape') {
      const mwW = width * 0.55;
      const swW = width * 0.45;
      const swL = length * 0.55;

      const p1Geo = new THREE.BoxGeometry(mwW + 0.35, plinthH, length + 0.35);
      const p1Mesh = new THREE.Mesh(p1Geo, plinthMat);
      p1Mesh.position.set(-halfW + mwW * 0.5, plinthH * 0.5, 0);
      addCadEdges(p1Mesh, 0x64748b, 0.4);
      buildingGroup.add(p1Mesh);

      const p2Geo = new THREE.BoxGeometry(swW + 0.35, plinthH, swL + 0.35);
      const p2Mesh = new THREE.Mesh(p2Geo, plinthMat);
      p2Mesh.position.set(halfW - swW * 0.5, plinthH * 0.5, -halfL + swL * 0.5);
      addCadEdges(p2Mesh, 0x64748b, 0.4);
      buildingGroup.add(p2Mesh);

      // Outdoor Terrace Deck on cutout corner
      const patioGeo = new THREE.BoxGeometry(swW, 0.12, length - swL);
      const patioMat = matLib.getMaterial('wood', { color: '#78350f' });
      const patioMesh = new THREE.Mesh(patioGeo, patioMat);
      patioMesh.position.set(halfW - swW * 0.5, 0.06, halfL - (length - swL) * 0.5);
      patioMesh.receiveShadow = true;
      buildingGroup.add(patioMesh);

      // Structural corner pillar & tie beams supporting roof overhang
      const totalWallH = floorCount * floorHeight;
      const colGeo = new THREE.BoxGeometry(0.35, totalWallH, 0.35);
      const colMesh = new THREE.Mesh(colGeo, plinthMat);
      colMesh.position.set(halfW - 0.25, plinthH + totalWallH * 0.5, halfL - 0.25);
      colMesh.castShadow = true;
      addCadEdges(colMesh, 0x007aff, 0.5);
      buildingGroup.add(colMesh);

      const beamGeoX = new THREE.BoxGeometry(swW, 0.3, 0.35);
      const beamMeshX = new THREE.Mesh(beamGeoX, plinthMat);
      beamMeshX.position.set(halfW - swW * 0.5, plinthH + totalWallH - 0.15, halfL - 0.25);
      addCadEdges(beamMeshX, 0x007aff, 0.4);
      buildingGroup.add(beamMeshX);

      const beamGeoZ = new THREE.BoxGeometry(0.35, 0.3, length - swL);
      const beamMeshZ = new THREE.Mesh(beamGeoZ, plinthMat);
      beamMeshZ.position.set(halfW - 0.25, plinthH + totalWallH - 0.15, halfL - (length - swL) * 0.5);
      addCadEdges(beamMeshZ, 0x007aff, 0.4);
      buildingGroup.add(beamMeshZ);
    } else if (massingShape === 'courtyard_u') {
      const wingW = width * 0.34;
      const rearL = length * 0.35;

      // Left wing plinth
      const plMesh = new THREE.Mesh(new THREE.BoxGeometry(wingW + 0.35, plinthH, length + 0.35), plinthMat);
      plMesh.position.set(-halfW + wingW * 0.5, plinthH * 0.5, 0);
      addCadEdges(plMesh, 0x64748b, 0.4);
      buildingGroup.add(plMesh);

      // Right wing plinth
      const prMesh = new THREE.Mesh(new THREE.BoxGeometry(wingW + 0.35, plinthH, length + 0.35), plinthMat);
      prMesh.position.set(halfW - wingW * 0.5, plinthH * 0.5, 0);
      addCadEdges(prMesh, 0x64748b, 0.4);
      buildingGroup.add(prMesh);

      // Rear bridge plinth
      const pbMesh = new THREE.Mesh(new THREE.BoxGeometry(width - wingW * 2 + 0.35, plinthH, rearL + 0.35), plinthMat);
      pbMesh.position.set(0, plinthH * 0.5, -halfL + rearL * 0.5);
      addCadEdges(pbMesh, 0x64748b, 0.4);
      buildingGroup.add(pbMesh);

      // Courtyard grass/garden plate in center
      const courtW = width - wingW * 2;
      const courtL = length - rearL;
      const grassMat = new THREE.MeshStandardMaterial({ color: 0x4d7c0f, roughness: 0.9 });
      const grassMesh = new THREE.Mesh(new THREE.BoxGeometry(courtW, 0.08, courtL), grassMat);
      grassMesh.position.set(0, 0.04, halfL - courtL * 0.5);
      buildingGroup.add(grassMesh);

      // Structural columns at courtyard front openings supporting roof eave
      const totalWallH = floorCount * floorHeight;
      const colGeo = new THREE.BoxGeometry(0.35, totalWallH, 0.35);
      [-1, 1].forEach((side) => {
        const cMesh = new THREE.Mesh(colGeo, plinthMat);
        cMesh.position.set(side * (courtW * 0.5 - 0.2), plinthH + totalWallH * 0.5, halfL - 0.25);
        cMesh.castShadow = true;
        addCadEdges(cMesh, 0x007aff, 0.5);
        buildingGroup.add(cMesh);
      });

      const headerBeamGeo = new THREE.BoxGeometry(courtW, 0.35, 0.35);
      const headerBeamMesh = new THREE.Mesh(headerBeamGeo, plinthMat);
      headerBeamMesh.position.set(0, plinthH + totalWallH - 0.175, halfL - 0.25);
      addCadEdges(headerBeamMesh, 0x007aff, 0.5);
      buildingGroup.add(headerBeamMesh);
    } else if (massingShape === 'cantilever') {
      const cDepth = Math.min(2.0, length * 0.22);
      const groundL = length - cDepth;
      // Ground plinth recessed
      const plinthGeo = new THREE.BoxGeometry(width + 0.35, plinthH, groundL + 0.35);
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.set(0, plinthH * 0.5, -halfL + groundL * 0.5);
      addCadEdges(plinthMesh, 0x64748b, 0.4);
      buildingGroup.add(plinthMesh);

      // Front covered driveway/porch slab
      const porchGeo = new THREE.BoxGeometry(width + 0.35, 0.12, cDepth);
      const porchMesh = new THREE.Mesh(porchGeo, plinthMat);
      porchMesh.position.set(0, 0.06, halfL - cDepth * 0.5);
      addCadEdges(porchMesh, 0x64748b, 0.3);
      buildingGroup.add(porchMesh);
    } else {
      // Box & Stepped Podium base plinth
      const plinthGeo = new THREE.BoxGeometry(width + 0.35, plinthH, length + 0.35);
      const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
      plinthMesh.position.y = plinthH * 0.5;
      plinthMesh.castShadow = true;
      plinthMesh.receiveShadow = true;
      addCadEdges(plinthMesh, 0x64748b, 0.4);
      buildingGroup.add(plinthMesh);
    }

    // 2. Floors & Multi-Volume Massing
    for (let f = 0; f < floorCount; f++) {
      const floorBaseY = plinthH + f * floorHeight;
      const flNetH = floorHeight - (f > 0 ? 0.22 : 0);
      const flCenterY = floorBaseY + flNetH * 0.5;

      // Two-Material Wall Plinth Option: Floor 0 uses baseMaterial if enabled
      const curFloorWallMat =
        f === 0 && useBasePlinthMaterial && baseMaterial
          ? matLib.getMaterial(baseMaterial, { color: wallColor }).clone()
          : wallMat;

      // Slabs and Volumes per massing shape
      if (massingShape === 'l_shape') {
        const mwW = width * 0.55;
        const swW = width * 0.45;
        const swL = length * 0.55;

        // Main wing volume
        const mGeo = new THREE.BoxGeometry(mwW, flNetH, length);
        const mMesh = new THREE.Mesh(mGeo, curFloorWallMat);
        mMesh.position.set(-halfW + mwW * 0.5, flCenterY, 0);
        mMesh.castShadow = true;
        mMesh.receiveShadow = true;
        addCadEdges(mMesh, 0x007aff, 0.45);
        buildingGroup.add(mMesh);

        // Side wing volume
        const sGeo = new THREE.BoxGeometry(swW, flNetH, swL);
        const sMesh = new THREE.Mesh(sGeo, curFloorWallMat);
        sMesh.position.set(halfW - swW * 0.5, flCenterY, -halfL + swL * 0.5);
        sMesh.castShadow = true;
        sMesh.receiveShadow = true;
        addCadEdges(sMesh, 0x007aff, 0.45);
        buildingGroup.add(sMesh);

        // Intermediate floor slabs
        if (f > 0) {
          const s1 = new THREE.Mesh(new THREE.BoxGeometry(mwW + 0.15, 0.22, length + 0.15), plinthMat);
          s1.position.set(-halfW + mwW * 0.5, floorBaseY, 0);
          addCadEdges(s1, 0x007aff, 0.35);
          buildingGroup.add(s1);

          const s2 = new THREE.Mesh(new THREE.BoxGeometry(swW + 0.15, 0.22, swL + 0.15), plinthMat);
          s2.position.set(halfW - swW * 0.5, floorBaseY, -halfL + swL * 0.5);
          addCadEdges(s2, 0x007aff, 0.35);
          buildingGroup.add(s2);
        }
      } else if (massingShape === 'courtyard_u') {
        const wingW = width * 0.34;
        const rearL = length * 0.35;

        // Left wing
        const lwMesh = new THREE.Mesh(new THREE.BoxGeometry(wingW, flNetH, length), curFloorWallMat);
        lwMesh.position.set(-halfW + wingW * 0.5, flCenterY, 0);
        addCadEdges(lwMesh, 0x007aff, 0.45);
        buildingGroup.add(lwMesh);

        // Right wing
        const rwMesh = new THREE.Mesh(new THREE.BoxGeometry(wingW, flNetH, length), curFloorWallMat);
        rwMesh.position.set(halfW - wingW * 0.5, flCenterY, 0);
        addCadEdges(rwMesh, 0x007aff, 0.45);
        buildingGroup.add(rwMesh);

        // Rear bridge
        const rbMesh = new THREE.Mesh(new THREE.BoxGeometry(width - wingW * 2, flNetH, rearL), curFloorWallMat);
        rbMesh.position.set(0, flCenterY, -halfL + rearL * 0.5);
        addCadEdges(rbMesh, 0x007aff, 0.45);
        buildingGroup.add(rbMesh);
      } else if (massingShape === 'stepped_podium') {
        const isPodiumFloor = f < (floorCount >= 4 ? 2 : 1);
        const curW = isPodiumFloor ? width : width * 0.70;
        const curL = isPodiumFloor ? length : length * 0.70;

        // Intermediate slab
        if (f > 0) {
          const prevW = (f - 1) < (floorCount >= 4 ? 2 : 1) ? width : width * 0.70;
          const prevL = (f - 1) < (floorCount >= 4 ? 2 : 1) ? length : length * 0.70;
          const slabGeo = new THREE.BoxGeometry(prevW + 0.15, 0.22, prevL + 0.15);
          const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
          slabMesh.position.y = floorBaseY;
          addCadEdges(slabMesh, 0x007aff, 0.35);
          buildingGroup.add(slabMesh);

          // If transition floor, add rooftop terrace deck with railing around setback
          if (f === (floorCount >= 4 ? 2 : 1)) {
            const terraceRail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.9, length), glassMat);
            terraceRail.position.set(0, floorBaseY + 0.45, 0);
            buildingGroup.add(terraceRail);
          }
        }

        const floorGeo = new THREE.BoxGeometry(curW, flNetH, curL);
        const floorMesh = new THREE.Mesh(floorGeo, curFloorWallMat);
        floorMesh.position.set(0, flCenterY, 0);
        floorMesh.castShadow = true;
        floorMesh.receiveShadow = true;
        addCadEdges(floorMesh, 0x007aff, 0.5);
        buildingGroup.add(floorMesh);
      } else if (massingShape === 'cantilever') {
        const cDepth = Math.min(2.0, length * 0.22);
        const curL = f === 0 ? length - cDepth : length;
        const curZ = f === 0 ? -halfL + curL * 0.5 : 0;

        if (f > 0) {
          const slabGeo = new THREE.BoxGeometry(width + 0.15, 0.22, length + 0.15);
          const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
          slabMesh.position.set(0, floorBaseY, 0);
          addCadEdges(slabMesh, 0x007aff, 0.4);
          buildingGroup.add(slabMesh);

          // Cantilever support bracket underneath floor 1
          if (f === 1) {
            [-1, 1].forEach((dir) => {
              const bGeo = new THREE.BoxGeometry(0.3, 0.3, cDepth);
              const bMesh = new THREE.Mesh(bGeo, frameMat);
              bMesh.position.set(dir * (halfW * 0.75), floorBaseY - 0.15, halfL - cDepth * 0.5);
              buildingGroup.add(bMesh);
            });
          }
        }

        const floorGeo = new THREE.BoxGeometry(width, flNetH, curL);
        const floorMesh = new THREE.Mesh(floorGeo, curFloorWallMat);
        floorMesh.position.set(0, flCenterY, curZ);
        floorMesh.castShadow = true;
        floorMesh.receiveShadow = true;
        addCadEdges(floorMesh, 0x007aff, 0.5);
        buildingGroup.add(floorMesh);
      } else {
        // Standard Classic Box
        if (f > 0) {
          const slabGeo = new THREE.BoxGeometry(width + 0.15, 0.22, length + 0.15);
          const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
          slabMesh.position.y = floorBaseY;
          addCadEdges(slabMesh, 0x007aff, 0.4);
          buildingGroup.add(slabMesh);
        }

        const floorGeo = new THREE.BoxGeometry(width, flNetH, length);
        const floorMesh = new THREE.Mesh(floorGeo, curFloorWallMat);
        floorMesh.position.y = flCenterY;
        floorMesh.castShadow = true;
        floorMesh.receiveShadow = true;
        addCadEdges(floorMesh, 0x007aff, 0.5);
        buildingGroup.add(floorMesh);
      }

      // 3. Doors & Windows Based on Selected windowStyle
      const frontZ = (massingShape === 'cantilever' && f === 0) ? (halfL - Math.min(2.0, length * 0.22)) : halfL;
      const winY = floorBaseY + floorHeight * 0.55;

      if (f === 0) {
        // Entrance Door
        const doorGeo = new THREE.BoxGeometry(1.8, 2.2, 0.08);
        const doorMesh = new THREE.Mesh(doorGeo, frameMat);
        doorMesh.position.set(0, floorBaseY + 1.1, frontZ + 0.04);
        addCadEdges(doorMesh, 0x007aff);
        buildingGroup.add(doorMesh);

        const glassGeo = new THREE.BoxGeometry(1.5, 1.9, 0.04);
        const doorGlass = new THREE.Mesh(glassGeo, glassMat);
        doorGlass.position.set(0, floorBaseY + 1.1, frontZ + 0.05);
        buildingGroup.add(doorGlass);

        // Entrance Porch Platform & Canopy
        const porchW = Math.min(3.6, width * 0.45);
        const porchD = 1.6;
        const porchGeo = new THREE.BoxGeometry(porchW, 0.18, porchD);
        const porchMesh = new THREE.Mesh(porchGeo, plinthMat);
        porchMesh.position.set(0, 0.09, frontZ + porchD * 0.5);
        buildingGroup.add(porchMesh);

        const canopyW = Math.min(3.2, width * 0.42);
        const canopyD = 1.4;
        const canopyMesh = new THREE.Mesh(new THREE.BoxGeometry(canopyW, 0.12, canopyD), plinthMat);
        canopyMesh.position.set(0, floorBaseY + 2.3, frontZ + canopyD * 0.5);
        buildingGroup.add(canopyMesh);

        // Arcade Pillars along ground floor if hasFrontArcade enabled
        if (hasFrontArcade) {
          const arcW = width * 0.85;
          const arcCols = Math.max(2, Math.floor(width / 3.2));
          const arcMat = useBasePlinthMaterial && baseMaterial ? matLib.getMaterial(baseMaterial) : frameMat;
          for (let c = 0; c <= arcCols; c++) {
            const cx = -arcW * 0.5 + (arcW / arcCols) * c;
            const colMesh = new THREE.Mesh(new THREE.BoxGeometry(0.35, floorHeight - 0.2, 0.35), arcMat);
            colMesh.position.set(cx, floorBaseY + (floorHeight - 0.2) * 0.5, frontZ + 1.2);
            colMesh.castShadow = true;
            addCadEdges(colMesh, 0x007aff, 0.4);
            buildingGroup.add(colMesh);
          }
        }
      } else {
        // Upper floor windows styled by windowStyle
        const winSpanW = Math.min(width * 0.72, 4.2);
        if (windowStyle === 'curtain_wall') {
          // Floor-to-ceiling glass curtain wall
          const cwGeo = new THREE.BoxGeometry(winSpanW, floorHeight - 0.3, 0.08);
          const cwMesh = new THREE.Mesh(cwGeo, glassMat);
          cwMesh.position.set(0, floorBaseY + (floorHeight - 0.3) * 0.5 + 0.15, frontZ + 0.05);
          buildingGroup.add(cwMesh);

          // Vertical & Horizontal Mullions
          [-0.35, 0, 0.35].forEach((mRatio) => {
            const mulV = new THREE.Mesh(new THREE.BoxGeometry(0.05, floorHeight - 0.3, 0.06), frameMat);
            mulV.position.set(winSpanW * mRatio, floorBaseY + (floorHeight - 0.3) * 0.5 + 0.15, frontZ + 0.06);
            buildingGroup.add(mulV);
          });
        } else if (windowStyle === 'javanese_krepyak') {
          // Teak wood frame with jalusi louver slats
          const teakMat = matLib.getMaterial('wood', { color: '#78350f' });
          const winFrame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.6, 0.08), teakMat);
          winFrame.position.set(0, winY, frontZ + 0.04);
          buildingGroup.add(winFrame);

          for (let s = -3; s <= 3; s++) {
            const slat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.06), teakMat);
            slat.position.set(0, winY + s * 0.18, frontZ + 0.06);
            buildingGroup.add(slat);
          }
        } else if (windowStyle === 'colonial_arch') {
          // High arched windows with white plaster mouldings
          const archFrameMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.6 });
          const archGeo = new THREE.BoxGeometry(1.8, 2.0, 0.08);
          const archMesh = new THREE.Mesh(archGeo, archFrameMat);
          archMesh.position.set(0, winY + 0.1, frontZ + 0.04);
          buildingGroup.add(archMesh);

          const archGlass = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.7, 0.04), glassMat);
          archGlass.position.set(0, winY + 0.1, frontZ + 0.05);
          buildingGroup.add(archGlass);
        } else if (windowStyle === 'minimalist_slot') {
          // Narrow vertical slit windows
          [-0.8, 0, 0.8].forEach((xSlot) => {
            const slotFrame = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.8, 0.08), frameMat);
            slotFrame.position.set(xSlot, winY, frontZ + 0.04);
            buildingGroup.add(slotFrame);

            const slotGlass = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.6, 0.04), glassMat);
            slotGlass.position.set(xSlot, winY, frontZ + 0.05);
            buildingGroup.add(slotGlass);
          });
        } else {
          // modern_ribbon (Horizontal strip window with dividers)
          const ribbonGeo = new THREE.BoxGeometry(winSpanW, 1.1, 0.08);
          const ribbonMesh = new THREE.Mesh(ribbonGeo, frameMat);
          ribbonMesh.position.set(0, winY, frontZ + 0.04);
          buildingGroup.add(ribbonMesh);

          const ribbonGlass = new THREE.Mesh(new THREE.BoxGeometry(winSpanW - 0.1, 0.95, 0.04), glassMat);
          ribbonGlass.position.set(0, winY, frontZ + 0.05);
          buildingGroup.add(ribbonGlass);

          [-0.3, 0.3].forEach((rx) => {
            const div = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.95, 0.06), frameMat);
            div.position.set(winSpanW * rx, winY, frontZ + 0.06);
            buildingGroup.add(div);
          });
        }

        // 4. Balcony (hasBalcony)
        if (hasBalcony) {
          const balW = Math.min(width * 0.75, 4.8);
          const balD = 0.9;
          const balSlab = new THREE.Mesh(new THREE.BoxGeometry(balW, 0.15, balD), plinthMat);
          balSlab.position.set(0, floorBaseY + 0.075, frontZ + balD * 0.5);
          balSlab.castShadow = true;
          addCadEdges(balSlab, 0x007aff, 0.4);
          buildingGroup.add(balSlab);

          const balRail = new THREE.Mesh(new THREE.BoxGeometry(balW, 0.9, 0.04), glassMat);
          balRail.position.set(0, floorBaseY + 0.525, frontZ + balD);
          addCadEdges(balRail, 0x007aff, 0.5);
          buildingGroup.add(balRail);
        }

        // 5. Vertical Garden Planter Box (hasVerticalGarden)
        if (hasVerticalGarden) {
          const plantW = Math.min(width * 0.70, 4.2);
          const plantMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.8 });
          const planterBox = new THREE.Mesh(new THREE.BoxGeometry(plantW, 0.25, 0.28), plinthMat);
          const pZ = hasBalcony ? frontZ + 1.05 : frontZ + 0.18;
          planterBox.position.set(0, floorBaseY + 0.2, pZ);
          buildingGroup.add(planterBox);

          const foliage = new THREE.Mesh(new THREE.BoxGeometry(plantW - 0.08, 0.24, 0.30), plantMat);
          foliage.position.set(0, floorBaseY + 0.36, pZ);
          buildingGroup.add(foliage);
        }

        // 6. Secondary Skin Sun Louvers (hasSunLouvers)
        if (hasSunLouvers) {
          const louvW = width * 0.85;
          const louvCount = Math.max(5, Math.floor(louvW / 0.42));
          const teakMat = matLib.getMaterial('wood', { color: '#78350f' });
          for (let l = 0; l <= louvCount; l++) {
            const lx = -louvW * 0.5 + (louvW / louvCount) * l;
            const louv = new THREE.Mesh(new THREE.BoxGeometry(0.05, floorHeight - 0.25, 0.15), teakMat);
            louv.position.set(lx, floorBaseY + (floorHeight - 0.25) * 0.5 + 0.1, frontZ + 0.35);
            louv.castShadow = true;
            buildingGroup.add(louv);
          }
        }
      }
    }

    // 4. Roof on Top with Overhang, Ridge, Skylight, and Solar PV
    const roofBaseY = plinthH + floorCount * floorHeight;
    const rw = width + roofOverhang * 2;
    const rl = length + roofOverhang * 2;

    if (roofType === 'flat') {
      const slabGeo = new THREE.BoxGeometry(rw, 0.28, rl);
      const slabMesh = new THREE.Mesh(slabGeo, plinthMat);
      slabMesh.position.y = roofBaseY + 0.14;
      slabMesh.castShadow = true;
      slabMesh.receiveShadow = true;
      addCadEdges(slabMesh, 0x007aff, 0.6);
      buildingGroup.add(slabMesh);

      const parapetH = 0.45;
      const pThick = 0.18;
      const pMat = wallMat;
      [-1, 1].forEach((s) => {
        const pGeo = new THREE.BoxGeometry(rw, parapetH, pThick);
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(0, roofBaseY + 0.28 + parapetH * 0.5, s * (rl * 0.5 - pThick * 0.5));
        addCadEdges(pMesh, 0x007aff, 0.5);
        buildingGroup.add(pMesh);
      });
      [-1, 1].forEach((s) => {
        const pGeo = new THREE.BoxGeometry(pThick, parapetH, rl - pThick * 2);
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(s * (rw * 0.5 - pThick * 0.5), roofBaseY + 0.28 + parapetH * 0.5, 0);
        addCadEdges(pMesh, 0x007aff, 0.5);
        buildingGroup.add(pMesh);
      });
    } else if (roofType === 'joglo') {
      const eaveH = 1.2;
      const eaveGeo = new THREE.ConeGeometry(Math.hypot(rw, rl) * 0.52, eaveH, 4);
      eaveGeo.rotateY(Math.PI / 4);
      const eaveMesh = new THREE.Mesh(eaveGeo, roofMat);
      eaveMesh.scale.set(rw / Math.hypot(rw, rl), 1, rl / Math.hypot(rw, rl));
      eaveMesh.position.set(0, roofBaseY + eaveH * 0.5, 0);
      eaveMesh.castShadow = true;
      addCadEdges(eaveMesh, 0x007aff, 0.7);
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
      addCadEdges(crownMesh, 0x007aff, 0.8);
      buildingGroup.add(crownMesh);

      // 3D Ridge Cap on Joglo Crown
      const finialGeo = new THREE.BoxGeometry(crownW * 0.65, 0.20, 0.20);
      const finialMesh = new THREE.Mesh(finialGeo, ridgeMat);
      finialMesh.position.set(0, roofBaseY + eaveH + crownH - 0.15, 0);
      finialMesh.castShadow = true;
      addCadEdges(finialMesh, 0x007aff, 0.6);
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
      addCadEdges(gableMesh, 0x007aff, 0.7);
      buildingGroup.add(gableMesh);

      // 3D Ridge Cap (Bumbungan Pelana)
      const ridgeGeo = new THREE.BoxGeometry(0.24, 0.18, rl + 0.1);
      const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeMesh.position.set(0, roofBaseY + roofH + 0.08, 0);
      ridgeMesh.castShadow = true;
      addCadEdges(ridgeMesh, 0x007aff, 0.6);
      buildingGroup.add(ridgeMesh);
    } else if (roofType === 'sawtooth') {
      const teeth = Math.max(2, Math.floor(rl / 3));
      const toothL = rl / teeth;
      const toothH = Math.min(rw, rl) * 0.32;
      for (let t = 0; t < teeth; t++) {
        const zOffset = -rl * 0.5 + toothL * (t + 0.5);
        const toothGeo = new THREE.CylinderGeometry(0, toothL * 0.5, toothH, 3, 1, false);
        toothGeo.rotateZ(Math.PI / 2);
        toothGeo.rotateY(Math.PI / 2);
        const toothMesh = new THREE.Mesh(toothGeo, roofMat);
        toothMesh.scale.set(rw / toothL, 1, 1);
        toothMesh.position.set(0, roofBaseY + toothH * 0.5, zOffset);
        toothMesh.castShadow = true;
        addCadEdges(toothMesh, 0x007aff, 0.6);
        buildingGroup.add(toothMesh);
      }
    } else if (roofType === 'butterfly') {
      const roofH = Math.min(rw, rl) * 0.30;
      const wingW = rw * 0.52;
      [-1, 1].forEach((side) => {
        const wingGeo = new THREE.BoxGeometry(wingW, 0.16, rl);
        const wingMesh = new THREE.Mesh(wingGeo, roofMat);
        wingMesh.position.set(side * wingW * 0.5, roofBaseY + roofH * 0.5, 0);
        wingMesh.rotation.z = -side * Math.atan2(roofH, wingW);
        wingMesh.castShadow = true;
        addCadEdges(wingMesh, 0x007aff, 0.6);
        buildingGroup.add(wingMesh);
      });
    } else if (roofType === 'dome') {
      const domeR = Math.min(rw, rl) * 0.45;
      const domeGeo = new THREE.SphereGeometry(domeR, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const domeMesh = new THREE.Mesh(domeGeo, roofMat);
      domeMesh.position.set(0, roofBaseY, 0);
      domeMesh.castShadow = true;
      addCadEdges(domeMesh, 0x007aff, 0.6);
      buildingGroup.add(domeMesh);

      // Top Dome Finial
      const finialGeo = new THREE.CylinderGeometry(0.08, 0.14, 0.8, 8);
      const finialMesh = new THREE.Mesh(finialGeo, ridgeMat);
      finialMesh.position.set(0, roofBaseY + domeR + 0.4, 0);
      buildingGroup.add(finialMesh);
    } else {
      // Hip Roof (Limasan)
      const roofH = Math.min(rw, rl) * 0.38;
      const hipGeo = new THREE.ConeGeometry(Math.hypot(rw, rl) * 0.5, roofH, 4);
      hipGeo.rotateY(Math.PI / 4);
      const hipMesh = new THREE.Mesh(hipGeo, roofMat);
      hipMesh.scale.set(rw / Math.hypot(rw, rl), 1, rl / Math.hypot(rw, rl));
      hipMesh.position.set(0, roofBaseY + roofH * 0.5, 0);
      hipMesh.castShadow = true;
      addCadEdges(hipMesh, 0x007aff, 0.7);
      buildingGroup.add(hipMesh);

      // 3D Ridge Cap (Bumbungan Limasan)
      const ridgeLen = Math.max(0.6, rl - rw) + 0.2;
      const ridgeGeo = new THREE.BoxGeometry(0.24, 0.18, ridgeLen);
      const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
      ridgeMesh.position.set(0, roofBaseY + roofH + 0.06, 0);
      ridgeMesh.castShadow = true;
      addCadEdges(ridgeMesh, 0x007aff, 0.6);
      buildingGroup.add(ridgeMesh);
    }

    // Solar PV Panels (hasSolarPV)
    if (hasSolarPV) {
      const solarMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.65, roughness: 0.25 });
      const pvCols = Math.max(1, Math.floor(width / 2.5));
      const pvRows = Math.max(1, Math.floor(length / 2.5));
      for (let ix = 0; ix < pvCols; ix++) {
        for (let iz = 0; iz < pvRows; iz++) {
          const px = -halfW + (width / (pvCols + 1)) * (ix + 1);
          const pz = -halfL + (length / (pvRows + 1)) * (iz + 1);
          const pvMesh = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 1.1), solarMat);
          pvMesh.position.set(px, roofBaseY + (roofType === 'flat' ? 0.35 : 0.8), pz);
          pvMesh.rotation.x = -Math.PI / 14;
          pvMesh.castShadow = true;
          buildingGroup.add(pvMesh);
        }
      }
    }

    // Skylight (hasSkylight)
    if (hasSkylight) {
      const skyMesh = new THREE.Mesh(new THREE.BoxGeometry(width * 0.35, 0.08, length * 0.35), glassMat);
      skyMesh.position.set(0, roofBaseY + (roofType === 'flat' ? 0.32 : 1.2), 0);
      addCadEdges(skyMesh, 0x007aff, 0.8);
      buildingGroup.add(skyMesh);
    }

    // 1.70m Scale Human Silhouette for Proportion Reference (Optional toggle, off by default)
    if (showScaleFigure) {
      const humanGroup = new THREE.Group();
      const humanMat = new THREE.MeshStandardMaterial({
        color: 0x007aff,
        roughness: 0.3,
        metalness: 0.2
      });

      // Legs (two 0.75m cylinders)
      [-0.1, 0.1].forEach((xOff) => {
        const legGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.75, 8);
        const legMesh = new THREE.Mesh(legGeo, humanMat);
        legMesh.position.set(xOff, 0.375, 0);
        humanGroup.add(legMesh);
      });

      // Torso (0.65m cylinder)
      const torsoGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.65, 8);
      const torso = new THREE.Mesh(torsoGeo, humanMat);
      torso.position.y = 1.075;
      humanGroup.add(torso);

      // Head (0.13m sphere)
      const headGeo = new THREE.SphereGeometry(0.13, 12, 12);
      const head = new THREE.Mesh(headGeo, humanMat);
      head.position.y = 1.55;
      humanGroup.add(head);

      humanGroup.position.set(width * 0.25 + 0.8, 0, length * 0.5 + 1.4);
      buildingGroup.add(humanGroup);
    }

    // ========================================================
    // LIVE 3D CAD DIMENSION LINES & ELEVATION MARKERS
    // ========================================================
    const dimLineMat = new THREE.LineBasicMaterial({
      color: 0x007aff,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    // 1. Front Dimension Line: <--- Lebar: W.0 m --->
    const frontZ = length * 0.5 + 1.4;
    const frontLineGeo = new THREE.BufferGeometry().setFromPoints([
      // Left extension
      new THREE.Vector3(-halfW, 0.05, length * 0.5 + 0.1),
      new THREE.Vector3(-halfW, 0.05, frontZ + 0.25),
      // Right extension
      new THREE.Vector3(halfW, 0.05, length * 0.5 + 0.1),
      new THREE.Vector3(halfW, 0.05, frontZ + 0.25),
      // Main span line
      new THREE.Vector3(-halfW, 0.05, frontZ),
      new THREE.Vector3(halfW, 0.05, frontZ),
      // Left 45° tick
      new THREE.Vector3(-halfW - 0.25, 0.05, frontZ - 0.25),
      new THREE.Vector3(-halfW + 0.25, 0.05, frontZ + 0.25),
      // Right 45° tick
      new THREE.Vector3(halfW - 0.25, 0.05, frontZ - 0.25),
      new THREE.Vector3(halfW + 0.25, 0.05, frontZ + 0.25),
    ]);
    const frontLine = new THREE.LineSegments(frontLineGeo, dimLineMat);
    buildingGroup.add(frontLine);

    const widthSprite = createTextSprite(`<--- Lebar: ${formatMeters(width, 1)} --->`);
    widthSprite.position.set(0, 0.85, frontZ);
    buildingGroup.add(widthSprite);

    // 2. Side Dimension Line: <--- Panjang: L,0 m --->
    const sideX = -halfW - 1.4;
    const sideLineGeo = new THREE.BufferGeometry().setFromPoints([
      // Near extension
      new THREE.Vector3(-halfW - 0.1, 0.05, -halfL),
      new THREE.Vector3(sideX - 0.25, 0.05, -halfL),
      // Far extension
      new THREE.Vector3(-halfW - 0.1, 0.05, halfL),
      new THREE.Vector3(sideX - 0.25, 0.05, halfL),
      // Main span line
      new THREE.Vector3(sideX, 0.05, -halfL),
      new THREE.Vector3(sideX, 0.05, halfL),
      // Near 45° tick
      new THREE.Vector3(sideX - 0.25, 0.05, -halfL - 0.25),
      new THREE.Vector3(sideX + 0.25, 0.05, -halfL + 0.25),
      // Far 45° tick
      new THREE.Vector3(sideX - 0.25, 0.05, halfL - 0.25),
      new THREE.Vector3(sideX + 0.25, 0.05, halfL + 0.25),
    ]);
    const sideLine = new THREE.LineSegments(sideLineGeo, dimLineMat);
    buildingGroup.add(sideLine);

    const lengthSprite = createTextSprite(`<--- Panjang: ${formatMeters(length, 1)} --->`);
    lengthSprite.position.set(sideX, 0.85, 0);
    buildingGroup.add(lengthSprite);

    // 3. Vertical Elevation Pole with Floor Markers
    const poleX = halfW + 1.8;
    const totalBldHeight = roofBaseY + (roofType === 'flat' ? 0.35 : Math.min(rw, rl) * 0.42);

    const polePoints: THREE.Vector3[] = [
      new THREE.Vector3(poleX, 0, 0),
      new THREE.Vector3(poleX, totalBldHeight + 0.5, 0)
    ];

    // ±0,00 m Ground Floor
    polePoints.push(
      new THREE.Vector3(poleX - 0.4, 0.05, 0),
      new THREE.Vector3(poleX + 0.4, 0.05, 0)
    );
    const groundSprite = createTextSprite('±0,00 m (Lt. 1)');
    groundSprite.position.set(poleX + 2.5, 0.35, 0);
    buildingGroup.add(groundSprite);

    // Floor Level Markers (only display intermediate floors when floorCount <= 4 or detail enabled to avoid vertical label stacking)
    if (floorCount <= 4 || showDetailDims) {
      for (let f = 1; f < floorCount; f++) {
        const fY = plinthH + f * floorHeight;
        polePoints.push(
          new THREE.Vector3(poleX - 0.4, fY, 0),
          new THREE.Vector3(poleX + 0.4, fY, 0)
        );
        const floorSprite = createTextSprite(`+${formatMeters(fY)} (Lt. ${f + 1})`);
        floorSprite.position.set(poleX + 2.5, fY, 0);
        buildingGroup.add(floorSprite);
      }
    }

    // Roof Peak Marker
    polePoints.push(
      new THREE.Vector3(poleX - 0.4, totalBldHeight, 0),
      new THREE.Vector3(poleX + 0.4, totalBldHeight, 0)
    );
    const roofSprite = createTextSprite(`+${formatMeters(totalBldHeight)} (Puncak Atap)`);
    roofSprite.position.set(poleX + 2.5, totalBldHeight, 0);
    buildingGroup.add(roofSprite);

    const poleGeo = new THREE.BufferGeometry().setFromPoints(polePoints);
    const poleMesh = new THREE.LineSegments(poleGeo, dimLineMat);
    buildingGroup.add(poleMesh);

    // 4. L-Shape Structural Corner Pillar & Tie Beams (Fix floating roof over terrace deck)
    if (massingShape === 'l_shape') {
      const swW = width * 0.45;
      const swL = length * 0.55;
      const totalWallH = floorCount * floorHeight;

      // Outdoor wooden terrace deck on the cutout corner
      const patioGeo = new THREE.BoxGeometry(swW, 0.12, length - swL);
      const patioMat = matLib.getMaterial('wood', { color: '#78350f' });
      const patioMesh = new THREE.Mesh(patioGeo, patioMat);
      patioMesh.position.set(halfW - swW * 0.5, 0.06, halfL - (length - swL) * 0.5);
      patioMesh.receiveShadow = true;
      buildingGroup.add(patioMesh);

      // Structural corner column
      const colGeo = new THREE.BoxGeometry(0.35, totalWallH, 0.35);
      const colMesh = new THREE.Mesh(colGeo, frameMat);
      colMesh.position.set(halfW - 0.25, plinthH + totalWallH * 0.5, halfL - 0.25);
      colMesh.castShadow = true;
      addCadEdges(colMesh, 0x007aff, 0.6);
      buildingGroup.add(colMesh);

      // Structural tie beams connecting column to building wings
      const beamGeoX = new THREE.BoxGeometry(swW, 0.3, 0.35);
      const beamMeshX = new THREE.Mesh(beamGeoX, frameMat);
      beamMeshX.position.set(halfW - swW * 0.5, plinthH + totalWallH - 0.15, halfL - 0.25);
      addCadEdges(beamMeshX, 0x007aff, 0.5);
      buildingGroup.add(beamMeshX);

      const beamGeoZ = new THREE.BoxGeometry(0.35, 0.3, length - swL);
      const beamMeshZ = new THREE.Mesh(beamGeoZ, frameMat);
      beamMeshZ.position.set(halfW - 0.25, plinthH + totalWallH - 0.15, halfL - (length - swL) * 0.5);
      addCadEdges(beamMeshZ, 0x007aff, 0.5);
      buildingGroup.add(beamMeshZ);
    }

    // 5. Architectural Compass Ring on the Ground
    const compassRadius = Math.max(width, length) * 0.72 + 3.2;
    const compassGroup = createArchitecturalCompassRing(compassRadius, cadTheme);
    compassGroup.position.set(0, 0.015, 0);
    buildingGroup.add(compassGroup);

    // 6. Sun Celestial Arc with Moving Sun
    const zenithH = Math.max(14, floorCount * floorHeight + 6);
    const sunArcGroup = createSunCelestialArc(compassRadius * 1.08, zenithH, sunHour, totalBldHeight);
    buildingGroup.add(sunArcGroup);

    // 7. Direct 3D Gizmo Handles (Width, Length, Floors)
    const gizmoGroup = new THREE.Group();
    gizmoGroup.name = 'CAD_GIZMOS';

    // Width Handle (Sisi Depan: Panah Lebar)
    const wGizmo = new THREE.Group();
    wGizmo.position.set(halfW + 0.8, 0.4, halfL + 0.8);
    const wMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0, 0.9, 12),
      new THREE.MeshStandardMaterial({
        color: 0x007aff,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x0033aa,
        emissiveIntensity: 0.3
      })
    );
    wMesh.rotation.z = -Math.PI / 2;
    wMesh.userData = { isGizmo: true, gizmoType: 'width' };
    wGizmo.add(wMesh);

    const wRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0x60a5fa })
    );
    wRing.rotation.y = Math.PI / 2;
    wRing.userData = { isGizmo: true, gizmoType: 'width' };
    wGizmo.add(wRing);

    const wLabel = createTextSprite('↔ Tarik Lebar', '#007AFF', '#FFFFFF', '#60A5FA');
    wLabel.position.set(0, 0.95, 0);
    wLabel.scale.set(2.4, 0.6, 1);
    wLabel.userData = { isGizmo: true, gizmoType: 'width' };
    wGizmo.add(wLabel);
    gizmoGroup.add(wGizmo);

    // Length Handle (Sisi Kanan: Panah Panjang)
    const lGizmo = new THREE.Group();
    lGizmo.position.set(-halfW - 0.8, 0.4, halfL + 0.8);
    const lMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0, 0.9, 12),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0x065f46,
        emissiveIntensity: 0.3
      })
    );
    lMesh.rotation.x = Math.PI / 2;
    lMesh.userData = { isGizmo: true, gizmoType: 'length' };
    lGizmo.add(lMesh);

    const lRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.55, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    lRing.rotation.x = Math.PI / 2;
    lRing.userData = { isGizmo: true, gizmoType: 'length' };
    lGizmo.add(lRing);

    const lLabel = createTextSprite('↕ Tarik Panjang', '#10B981', '#FFFFFF', '#34D399');
    lLabel.position.set(0, 0.95, 0);
    lLabel.scale.set(2.4, 0.6, 1);
    lLabel.userData = { isGizmo: true, gizmoType: 'length' };
    lGizmo.add(lLabel);
    gizmoGroup.add(lGizmo);

    // Floors Handle (Puncak: Panah Lantai)
    const fGizmo = new THREE.Group();
    fGizmo.position.set(0, totalBldHeight + 0.9, 0);
    const fMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0, 1.1, 12),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.2,
        metalness: 0.8,
        emissive: 0xb45309,
        emissiveIntensity: 0.3
      })
    );
    fMesh.userData = { isGizmo: true, gizmoType: 'floors' };
    fGizmo.add(fMesh);

    const fRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.65, 0.08, 12, 24),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    fRing.rotation.x = Math.PI / 2;
    fRing.userData = { isGizmo: true, gizmoType: 'floors' };
    fGizmo.add(fRing);

    const fLabel = createTextSprite('▲ Tarik Lantai', '#F59E0B', '#FFFFFF', '#FBBF24');
    fLabel.position.set(0, 1.15, 0);
    fLabel.scale.set(2.4, 0.6, 1);
    fLabel.userData = { isGizmo: true, gizmoType: 'floors' };
    fGizmo.add(fLabel);
    gizmoGroup.add(fGizmo);

    buildingGroup.add(gizmoGroup);
    gizmoGroupRef.current = gizmoGroup;

    // Update camera target and distance
    const totalBldH = floorCount * floorHeight + 3.0;
    baseDistanceRef.current = Math.hypot(width, totalBldH, length) * (isFullScreenCAD ? 1.65 : 1.45);
    targetLookAtRef.current.set(0, totalBldH * 0.45, 0);
  }, [
    sceneReady,
    width,
    length,
    floorCount,
    floorHeight,
    wallMaterial,
    wallColor,
    roofType,
    roofMaterial,
    roofOverhang,
    effectiveRenderMode,
    isFullScreenCAD,
    cadTheme,
    massingShape,
    windowStyle,
    hasBalcony,
    hasSunLouvers,
    hasVerticalGarden,
    hasFrontArcade,
    useBasePlinthMaterial,
    baseMaterial,
    mullionColor,
    hasSkylight,
    hasSolarPV,
    sunHour
  ]);

  // Pointer drag controls for 3D orbit and Direct Gizmo Handles
  const handlePointerDown = (e: React.PointerEvent) => {
    const container = containerRef.current;
    const camera = activeCameraRef.current;
    const gizmoGroup = gizmoGroupRef.current;

    if (container && camera && gizmoGroup) {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

      const intersects = raycaster.intersectObjects(gizmoGroup.children, true);
      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData?.isGizmo && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj && hitObj.userData?.isGizmo) {
          activeGizmoRef.current = hitObj.userData.gizmoType;
          startDragPosRef.current = { x: e.clientX, y: e.clientY };
          initialValRef.current = {
            width: widthRef.current,
            length: lengthRef.current,
            floorCount: floorCountRef.current
          };
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          proceduralAudio.playTaptic('selection');
          return;
        }
      }
    }

    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (activeGizmoRef.current) {
      const dx = e.clientX - startDragPosRef.current.x;
      const dy = e.clientY - startDragPosRef.current.y;
      if (activeGizmoRef.current === 'width') {
        const delta = Math.round((dx - dy * 0.4) / 16);
        const nextW = Math.max(4, Math.min(36, initialValRef.current.width + delta));
        if (nextW !== widthRef.current) {
          onWidthChange?.(nextW);
        }
      } else if (activeGizmoRef.current === 'length') {
        const delta = Math.round((-dy + dx * 0.4) / 16);
        const nextL = Math.max(4, Math.min(40, initialValRef.current.length + delta));
        if (nextL !== lengthRef.current) {
          onLengthChange?.(nextL);
        }
      } else if (activeGizmoRef.current === 'floors') {
        const delta = Math.round(-dy / 28);
        const nextF = Math.max(1, Math.min(18, initialValRef.current.floorCount + delta));
        if (nextF !== floorCountRef.current) {
          onFloorCountChange?.(nextF);
        }
      }
      return;
    }

    // Hover cursor state over gizmos
    const container = containerRef.current;
    const camera = activeCameraRef.current;
    const gizmoGroup = gizmoGroupRef.current;
    if (container && camera && gizmoGroup && !isDraggingRef.current) {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersects = raycaster.intersectObjects(gizmoGroup.children, true);
      if (intersects.length > 0) {
        container.style.cursor = 'grab';
      } else {
        container.style.cursor = 'default';
      }
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    yawRef.current -= dx * 0.010;
    pitchRef.current = Math.max(0.04, Math.min(1.52, pitchRef.current + dy * 0.010));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeGizmoRef.current) {
      activeGizmoRef.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      return;
    }
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.0015;
    zoomFactorRef.current = Math.max(0.4, Math.min(3.2, zoomFactorRef.current + zoomDelta));
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: isFullScreenCAD ? '100%' : '240px',
        borderRadius: isFullScreenCAD ? '0' : '20px',
        overflow: 'hidden',
        position: 'relative',
        background: cadTheme === 'blueprint' ? '#0A1120' : '#E8EEF5',
        border: isFullScreenCAD ? 'none' : '1.5px solid rgba(15, 23, 42, 0.08)',
        boxShadow: isFullScreenCAD ? 'none' : '0 4px 20px rgba(15, 23, 42, 0.06)',
        marginBottom: isFullScreenCAD ? '0' : '14px',
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

      {/* Top-left Floating Single Metric Chip */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          left: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '9999px',
          background: 'rgba(255, 255, 255, 0.90)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(15, 23, 42, 0.08)',
          boxShadow: '0 2px 10px rgba(15, 23, 42, 0.06)',
          pointerEvents: 'none'
        }}
      >
        <Rotate3d size={13} style={{ color: '#007AFF' }} />
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A' }}>
          Skala 1:1 Metrik
        </span>
      </div>

      {/* Viewport Floating Controls: Reset Camera */}
      <div style={{ position: 'absolute', top: '12px', right: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={handleResetCamera}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '6px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.90)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(15, 23, 42, 0.1)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
            color: '#334155',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Reset Kamera ke Tampilan Standar (Fit to View)"
        >
          <Focus size={13} style={{ color: '#007AFF' }} />
          <span>Fit Kamera</span>
        </button>
      </div>

      {/* Bottom-right Architectural Scale Bar & Controls (No overlap with left telemetry) */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10
        }}
      >
        <div
          style={{
            padding: '5px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
            fontSize: '11px',
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            pointerEvents: 'none'
          }}
        >
          <span style={{ fontWeight: 600 }}>Skala: 0</span>
          <span style={{ borderBottom: '2px solid #007AFF', width: '28px', display: 'inline-block' }} />
          <span style={{ fontWeight: 600 }}>5m</span>
          <span style={{ borderBottom: '2px solid #007AFF', width: '28px', display: 'inline-block' }} />
          <span style={{ fontWeight: 600 }}>10m</span>
        </div>

        <div
          style={{
            padding: '5px 12px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(15, 23, 42, 0.08)',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
            fontSize: '11px',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            pointerEvents: 'none'
          }}
        >
          <span>Tarik: Orbit 3D</span>
          <span>•</span>
          <span>Gulir: Zoom</span>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// VISUAL SVG GRID CARD & FACADE ACCESSORIES
// (Identitas Laboratorium Analisis Arscity)
// ==========================================

interface VisualOptionCardProps<T extends string> {
  id: T;
  label: string;
  subtitle?: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: (id: T) => void;
}

const VisualOptionCard = <T extends string>({
  id,
  label,
  subtitle,
  icon,
  isSelected,
  onSelect
}: VisualOptionCardProps<T>) => (
  <button
    type="button"
    onClick={() => {
      onSelect(id);
      proceduralAudio.playTaptic('selection');
    }}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '10px 6px',
      borderRadius: '12px',
      border: isSelected ? '2px solid #007AFF' : 'none',
      background: isSelected ? 'rgba(10, 132, 255, 0.10)' : '#FFFFFF',
      color: isSelected ? '#007AFF' : '#1E293B',
      boxShadow: isSelected ? '0 2px 8px rgba(0, 122, 255, 0.20)' : '0 2px 10px rgba(15, 23, 42, 0.04)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      minHeight: '74px',
      gap: '4px',
      width: '100%'
    }}
  >
    <div style={{ color: isSelected ? '#007AFF' : '#64748B' }}>
      {icon}
    </div>
    <div style={{ fontSize: '11px', fontWeight: isSelected ? 700 : 600, lineHeight: 1.2 }}>
      {label}
    </div>
    {subtitle && (
      <div style={{ fontSize: '9px', color: isSelected ? '#007AFF' : '#94A3B8', lineHeight: 1.1 }}>
        {subtitle}
      </div>
    )}
  </button>
);

const FacadeToggleRow: React.FC<{
  label: string;
  description: string;
  checked: boolean;
  onChange: (val: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div
    onClick={() => {
      onChange(!checked);
      proceduralAudio.playTaptic('light');
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '10px 12px',
      borderRadius: '12px',
      background: checked ? 'rgba(10, 132, 255, 0.08)' : '#FFFFFF',
      border: checked ? '1.5px solid rgba(10, 132, 255, 0.35)' : 'none',
      boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
      cursor: 'pointer',
      transition: 'all 0.15s ease'
    }}
  >
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', paddingRight: '8px' }}>
      <span style={{ fontSize: '12px', fontWeight: 700, color: checked ? '#007AFF' : '#0F172A' }}>
        {label}
      </span>
      <span style={{ fontSize: '10px', color: '#64748B' }}>
        {description}
      </span>
    </div>
    <div
      style={{
        width: '38px',
        height: '22px',
        borderRadius: '9999px',
        background: checked ? '#007AFF' : '#CBD5E1',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: checked ? 'flex-end' : 'flex-start',
        transition: 'all 0.2s ease',
        flexShrink: 0
      }}
    >
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          background: '#FFFFFF',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  </div>
);

const MASSING_OPTIONS: { id: MassingShapeType; label: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    id: 'box',
    label: 'Persegi Klasik',
    subtitle: 'Massa bersih & efisien',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M16 4L27 10.5V21.5L16 28L5 21.5V10.5L16 4Z" />
        <path d="M16 4V28M5 10.5L16 17L27 10.5" />
      </svg>
    )
  },
  {
    id: 'l_shape',
    label: 'Bentuk L',
    subtitle: 'Sayap teras & taman',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 6H15V17H25V26H7V6Z" />
        <circle cx="20" cy="11" r="3" stroke="#22c55e" strokeWidth="1.5" />
      </svg>
    )
  },
  {
    id: 'courtyard_u',
    label: 'Bentuk U',
    subtitle: 'Taman dalam tropis',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 7H13V18H19V7H26V26H6V7Z" />
        <circle cx="16" cy="12" r="2.5" fill="#22c55e" stroke="none" />
      </svg>
    )
  },
  {
    id: 'stepped_podium',
    label: 'Podium & Menara',
    subtitle: 'Dek teras bertingkat',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="18" width="24" height="9" rx="1" />
        <rect x="9" y="5" width="14" height="13" rx="1" />
        <line x1="4" y1="18" x2="28" y2="18" stroke="#007AFF" />
      </svg>
    )
  },
  {
    id: 'cantilever',
    label: 'Kantilever Modern',
    subtitle: 'Lantai 2 melayang',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="16" width="14" height="11" rx="1" />
        <rect x="9" y="5" width="18" height="11" rx="1" stroke="#007AFF" />
        <line x1="23" y1="16" x2="23" y2="27" strokeDasharray="2 2" />
      </svg>
    )
  }
];

const WINDOW_OPTIONS: { id: WindowStyleType; label: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    id: 'modern_ribbon',
    label: 'Modern Ribbon',
    subtitle: 'Kaca horizontal lebar',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="10" width="24" height="12" rx="2" />
        <line x1="12" y1="10" x2="12" y2="22" />
        <line x1="20" y1="10" x2="20" y2="22" />
        <line x1="4" y1="16" x2="28" y2="16" stroke="#007AFF" />
      </svg>
    )
  },
  {
    id: 'curtain_wall',
    label: 'Curtain Wall',
    subtitle: 'Dinding kaca penuh',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="4" width="22" height="24" rx="1" />
        <line x1="12" y1="4" x2="12" y2="28" />
        <line x1="19" y1="4" x2="19" y2="28" />
        <line x1="5" y1="12" x2="27" y2="12" />
        <line x1="5" y1="20" x2="27" y2="20" />
      </svg>
    )
  },
  {
    id: 'javanese_krepyak',
    label: 'Krepyak Jawa',
    subtitle: 'Kisi jalusi kayu jati',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="6" y="5" width="20" height="22" rx="1" />
        <line x1="16" y1="5" x2="16" y2="27" />
        <line x1="8" y1="10" x2="14" y2="12" stroke="#D97706" />
        <line x1="8" y1="14" x2="14" y2="16" stroke="#D97706" />
        <line x1="8" y1="18" x2="14" y2="20" stroke="#D97706" />
        <line x1="18" y1="10" x2="24" y2="12" stroke="#D97706" />
        <line x1="18" y1="14" x2="24" y2="16" stroke="#D97706" />
        <line x1="18" y1="18" x2="24" y2="20" stroke="#D97706" />
      </svg>
    )
  },
  {
    id: 'colonial_arch',
    label: 'Lengkung Kolonial',
    subtitle: 'Klasik Malioboro',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M7 27V14C7 8.5 11 4 16 4C21 4 25 8.5 25 14V27H7Z" />
        <line x1="16" y1="4" x2="16" y2="27" />
        <line x1="7" y1="15" x2="25" y2="15" />
        <line x1="7" y1="21" x2="25" y2="21" />
      </svg>
    )
  },
  {
    id: 'minimalist_slot',
    label: 'Slot Minimalis',
    subtitle: 'Bukaan ramping dalam',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="5" width="24" height="22" rx="2" fill="rgba(15,23,42,0.06)" />
        <rect x="7" y="9" width="4" height="14" rx="0.5" fill="#007AFF" />
        <rect x="14" y="9" width="4" height="14" rx="0.5" fill="#007AFF" />
        <rect x="21" y="9" width="4" height="14" rx="0.5" fill="#007AFF" />
      </svg>
    )
  }
];

const ROOF_OPTIONS: { id: RoofType; label: string; subtitle: string; icon: React.ReactNode }[] = [
  {
    id: 'hip',
    label: 'Limasan Tropis',
    subtitle: 'Perisai 4 sisi penepis tempias',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <polygon points="16,6 28,24 4,24" />
        <line x1="16" y1="6" x2="16" y2="24" stroke="#007AFF" />
        <line x1="11" y1="15" x2="21" y2="15" />
      </svg>
    )
  },
  {
    id: 'joglo',
    label: 'Joglo Nusantara',
    subtitle: 'Atap brunjung warisan Jawa',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 24L7 16H25L29 24H3Z" />
        <path d="M10 16L12 7H20L22 16" stroke="#007AFF" />
        <line x1="11" y1="7" x2="21" y2="7" stroke="#007AFF" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'gable',
    label: 'Pelana Gable',
    subtitle: 'Miring 2 sisi sirkulasi udara',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 22L16 8L28 22H4Z" />
        <line x1="16" y1="8" x2="16" y2="26" stroke="#007AFF" />
      </svg>
    )
  },
  {
    id: 'flat',
    label: 'Datar Parapet',
    subtitle: 'Plat beton roof garden',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="8" width="24" height="5" rx="1" fill="#007AFF" fillOpacity="0.2" />
        <rect x="6" y="13" width="20" height="13" rx="1" />
        <line x1="4" y1="6" x2="4" y2="8" strokeWidth="2" />
        <line x1="28" y1="6" x2="28" y2="8" strokeWidth="2" />
      </svg>
    )
  },
  {
    id: 'sawtooth',
    label: 'Gergaji Sawtooth',
    subtitle: 'Bukaan utara industrial',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 22L10 12V22L18 12V22L26 12V22H4Z" />
        <line x1="10" y1="12" x2="10" y2="22" stroke="#007AFF" />
        <line x1="18" y1="12" x2="18" y2="22" stroke="#007AFF" />
      </svg>
    )
  },
  {
    id: 'butterfly',
    label: 'Kupu-kupu Butterfly',
    subtitle: 'Sayap ganda tadah hujan',
    icon: (
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 10L16 20L28 10L28 14L16 24L4 14Z" fill="#007AFF" fillOpacity="0.2" />
        <path d="M4 10L16 20L28 10" stroke="#007AFF" strokeWidth="2" />
        <line x1="16" y1="20" x2="16" y2="26" />
      </svg>
    )
  }
];

export interface CustomBuildingCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NumberSliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  defaultValue: number;
  onChange: (val: number) => void;
}

const NumberSliderControl: React.FC<NumberSliderControlProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  defaultValue,
  onChange
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: '#FFFFFF',
        padding: '10px 12px',
        borderRadius: '12px',
        border: 'none',
        boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: '#334155', fontWeight: 600 }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
            }}
            style={{
              width: '54px',
              padding: '2px 6px',
              borderRadius: '6px',
              border: '1px solid rgba(15, 23, 42, 0.15)',
              background: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 700,
              color: '#007AFF',
              textAlign: 'right'
            }}
          />
          <span style={{ fontSize: '11px', color: '#64748B' }}>{unit}</span>
          <button
            type="button"
            onClick={() => onChange(defaultValue)}
            title="Atur Ulang ke Nilai Bawaan"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '5px',
              background: 'var(--fill-control)',
              border: 'none',
              color: 'var(--label-tertiary)',
              cursor: 'pointer'
            }}
          >
            <RotateCcw size={10} />
          </button>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#007AFF', height: '4px', cursor: 'pointer' }}
      />
    </div>
  );
};

export const CustomBuildingCreatorModal: React.FC<CustomBuildingCreatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const modalRef = useModalA11y(isOpen, onClose);
  const engine = useUIStore((s) => s.engine);
  const setActiveTool = useUIStore((s) => s.setActiveTool);

  useEffect(() => {
    if (isOpen && engine) {
      engine.setLowPowerMode(true);
      return () => {
        engine.setLowPowerMode(false);
      };
    }
  }, [isOpen, engine]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'massing' | 'facade' | 'roof' | 'material'>('massing');

  // Building General & Dimensions
  const [studioMode, setStudioMode] = useState<StudioCreationMode>('building');
  const [buildingName, setBuildingName] = useState<string>('Villa Tropis Kustom');
  const [width, setWidth] = useState<number>(10);
  const [length, setLength] = useState<number>(12);
  const [floorCount, setFloorCount] = useState<number>(2);
  const [floorHeight] = useState<number>(3.2);

  // Tahap 2: 5 Massing Shapes
  const [massingShape, setMassingShape] = useState<MassingShapeType>('box');

  // Tahap 3: 5 Window Styles & Facade Accessories
  const [windowStyle, setWindowStyle] = useState<WindowStyleType>('modern_ribbon');
  const [hasBalcony, setHasBalcony] = useState<boolean>(true);
  const [hasSunLouvers, setHasSunLouvers] = useState<boolean>(false);
  const [hasVerticalGarden, setHasVerticalGarden] = useState<boolean>(false);
  const [hasFrontArcade, setHasFrontArcade] = useState<boolean>(false);

  // Materials & Textures
  const [wallMaterial, setWallMaterial] = useState<WallMaterialType>('plaster');
  const [wallColor, setWallColor] = useState<string>('#f8fafc');
  const [useBasePlinthMaterial, setUseBasePlinthMaterial] = useState<boolean>(false);
  const [baseMaterial, setBaseMaterial] = useState<string>('brick');
  const [mullionColor] = useState<string>('#1e293b');

  // Roof & Climate Features
  const [roofType, setRoofType] = useState<RoofType>('hip');
  const [roofMaterial, setRoofMaterial] = useState<string>('clay_tile');
  const [roofOverhang, setRoofOverhang] = useState<number>(1.2);
  const [hasSkylight, setHasSkylight] = useState<boolean>(false);
  const [hasSolarPV, setHasSolarPV] = useState<boolean>(false);

  // CAD Studio Controls & Tools
  const [cadViewPreset, setCadViewPreset] = useState<'iso' | 'top' | 'front' | 'side'>('iso');
  const [renderMode, setRenderMode] = useState<'pbr' | 'cad' | 'clay'>('pbr');
  const [cadTheme, setCadTheme] = useState<'light' | 'blueprint'>('light');
  const [sunHour, setSunHour] = useState<'08:00' | '12:00' | '16:00'>('12:00');
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(true);

  // Studio UI Dropdowns & Confirmations
  const [showRenderMenu, setShowRenderMenu] = useState<boolean>(false);
  const [showSunMenu, setShowSunMenu] = useState<boolean>(false);
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showExitConfirm, setShowExitConfirm] = useState<boolean>(false);
  const [showScaleFigure, setShowScaleFigure] = useState<boolean>(false);
  const [showDetailDims, setShowDetailDims] = useState<boolean>(false);

  // Hierarchical ESC key listener: closes menus first, then prompts exit confirmation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showRenderMenu || showSunMenu || showMoreMenu) {
          setShowRenderMenu(false);
          setShowSunMenu(false);
          setShowMoreMenu(false);
        } else if (showExitConfirm) {
          setShowExitConfirm(false);
        } else {
          setShowExitConfirm(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, showRenderMenu, showSunMenu, showMoreMenu, showExitConfirm]);

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

  // Exact 100% elevation sync with 3D viewport markers
  const plinthH = 0.35;
  const wallHeight = plinthH + floorCount * floorHeight;
  const rw = width + roofOverhang * 2;
  const rl = length + roofOverhang * 2;
  const roofHeightOffset =
    roofType === 'flat'
      ? 0.35
      : roofType === 'joglo'
      ? 3.6
      : roofType === 'sawtooth' || roofType === 'butterfly'
      ? Math.min(rw, rl) * 0.32
      : Math.min(rw, rl) * 0.42;
  const roofPeakHeight = wallHeight + roofHeightOffset;

  const { kdb: footprintArea, klb: totalFloorArea } = calculateBuildingAreas(
    width,
    length,
    floorCount,
    massingShape
  );

  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // User Custom Presets in LocalStorage
  interface UserCustomPreset {
    id: string;
    label: string;
    createdAt: number;
    config: {
      buildingName: string;
      massingShape: MassingShapeType;
      width: number;
      length: number;
      floorCount: number;
      floorHeight: number;
      windowStyle: WindowStyleType;
      roofType: RoofType;
      roofMaterial: string;
      roofOverhang: number;
      wallMaterial: WallMaterialType;
      wallColor: string;
      hasBalcony: boolean;
      hasSunLouvers: boolean;
      hasVerticalGarden: boolean;
      hasFrontArcade: boolean;
      useBasePlinthMaterial: boolean;
      baseMaterial: string;
      hasSkylight: boolean;
      hasSolarPV: boolean;
    };
  }

  const [userPresets, setUserPresets] = useState<UserCustomPreset[]>(() => {
    try {
      const saved = localStorage.getItem('arscity_custom_user_presets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const handleSaveUserPreset = () => {
    const defaultName = buildingName.trim() || `Desain Kustom ${userPresets.length + 1}`;
    const name = window.prompt('Simpan ke Koleksi Saya — Masukkan Nama Desain:', defaultName);
    if (!name || !name.trim()) return;

    const newPreset: UserCustomPreset = {
      id: `user_preset_${Date.now()}`,
      label: name.trim(),
      createdAt: Date.now(),
      config: {
        buildingName: name.trim(),
        massingShape,
        width,
        length,
        floorCount,
        floorHeight,
        windowStyle,
        roofType,
        roofMaterial,
        roofOverhang,
        wallMaterial,
        wallColor,
        hasBalcony,
        hasSunLouvers,
        hasVerticalGarden,
        hasFrontArcade,
        useBasePlinthMaterial,
        baseMaterial: baseMaterial || 'andesite',
        hasSkylight,
        hasSolarPV
      }
    };

    const updated = [...userPresets, newPreset];
    setUserPresets(updated);
    try {
      localStorage.setItem('arscity_custom_user_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menyimpan preset ke localStorage:', e);
    }
    proceduralAudio.playTaptic('selection');
    showSnackbar({
      variant: 'success',
      title: 'Preset Disimpan',
      detail: name.trim(),
      groupKey: 'cad_save_preset',
    });
  };

  const handleDeleteUserPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = userPresets.filter((p) => p.id !== id);
    setUserPresets(updated);
    try {
      localStorage.setItem('arscity_custom_user_presets', JSON.stringify(updated));
    } catch (e) {
      console.warn('Gagal menghapus preset dari localStorage:', e);
    }
    proceduralAudio.playTaptic('light');
  };

  const handleApplyUserPreset = (p: UserCustomPreset) => {
    const c = p.config;
    setBuildingName(c.buildingName);
    setMassingShape(c.massingShape);
    setWidth(c.width);
    setLength(c.length);
    setFloorCount(c.floorCount);
    setWindowStyle(c.windowStyle);
    setRoofType(c.roofType);
    setRoofMaterial(c.roofMaterial);
    setRoofOverhang(c.roofOverhang);
    setWallMaterial(c.wallMaterial);
    setWallColor(c.wallColor);
    setHasBalcony(c.hasBalcony);
    setHasSunLouvers(c.hasSunLouvers);
    setHasVerticalGarden(c.hasVerticalGarden);
    setHasFrontArcade(c.hasFrontArcade);
    setUseBasePlinthMaterial(c.useBasePlinthMaterial);
    setBaseMaterial(c.baseMaterial);
    setHasSkylight(c.hasSkylight);
    setHasSolarPV(c.hasSolarPV);
    proceduralAudio.playTaptic('selection');
    showSnackbar({
      variant: 'info',
      title: `Preset ${p.label} Diterapkan`,
      groupKey: 'cad_preset_applied',
    });
  };

  const handleExportBlueprintSheet = () => {
    const sourceCanvas = exportCanvasRef.current;
    if (!sourceCanvas) return;

    const sheet = document.createElement('canvas');
    sheet.width = 1600;
    sheet.height = 1100;
    const ctx = sheet.getContext('2d');
    if (!ctx) return;

    // Background (Deep blueprint technical blue)
    ctx.fillStyle = cadTheme === 'blueprint' ? '#071224' : '#0B192C';
    ctx.fillRect(0, 0, sheet.width, sheet.height);

    // Draw 3D CAD Viewport
    ctx.drawImage(sourceCanvas, 24, 24, 1552, 800);

    // Blueprint Technical Frame Borders
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, 1560, 1060);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 1;
    ctx.strokeRect(24, 24, 1552, 1052);

    // Architectural Title Block (Kop Gambar Kerja)
    const kopY = 836;
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(24, kopY, 1552, 240);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.strokeRect(24, kopY, 1552, 240);

    // Header Divider
    ctx.beginPath();
    ctx.moveTo(24, kopY + 54);
    ctx.lineTo(1576, kopY + 54);
    ctx.stroke();

    // Title & Project Heading
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('ARSCITY ARCHITECTURAL CAD STUDIO — LEMBAR GAMBAR KERJA', 44, kopY + 36);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`DOKUMEN CAD: ARS-${Date.now().toString(36).toUpperCase()}`, 1240, kopY + 36);

    // 4 Data Columns
    // Column 1: Identitas & Massa
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('NAMA RANCANGAN:', 44, kopY + 84);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 15px monospace';
    ctx.fillText(buildingName || 'Bangunan Kustom', 44, kopY + 104);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('BENTUK MASSA:', 44, kopY + 138);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(MASSING_OPTIONS.find((m) => m.id === massingShape)?.label || massingShape, 44, kopY + 158);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('GAYA BUKAAN:', 44, kopY + 192);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(WINDOW_OPTIONS.find((w) => w.id === windowStyle)?.label || windowStyle, 44, kopY + 212);

    // Column 2: Dimensi & Elevasi
    const col2X = 420;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('DIMENSI TAPAK (P × L):', col2X, kopY + 84);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${width}.00 m × ${length}.00 m`, col2X, kopY + 104);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('JUMLAH LANTAI:', col2X, kopY + 138);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${floorCount} Lantai (@ ${floorHeight.toFixed(2)}m)`, col2X, kopY + 158);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('ELEVASI PUNCAK:', col2X, kopY + 192);
    ctx.fillStyle = '#34D399';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`+${roofPeakHeight.toFixed(2)} m (Dinding +${wallHeight.toFixed(2)}m)`, col2X, kopY + 212);

    // Column 3: Koefisien KDB & KLB
    const col3X = 820;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('LUAS TAPAK DASAR (KDB):', col3X, kopY + 84);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${footprintArea} m²`, col3X, kopY + 108);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('TOTAL LUAS LANTAI (KLB):', col3X, kopY + 144);
    ctx.fillStyle = '#60A5FA';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(`${totalFloorArea} m²`, col3X, kopY + 168);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('TERITISAN ATAP TROPIS:', col3X, kopY + 196);
    ctx.fillStyle = '#FBBF24';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(`${roofOverhang.toFixed(2)} meter`, col3X, kopY + 216);

    // Column 4: Material & Pengesahan
    const col4X = 1200;
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('SISTEM ATAP & DINDING:', col4X, kopY + 84);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '13px monospace';
    ctx.fillText(`${roofType.toUpperCase()} (${roofMaterial})`, col4X, kopY + 104);
    ctx.fillText(`${wallMaterial.toUpperCase()} (${wallColor})`, col4X, kopY + 124);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px monospace';
    ctx.fillText('TANGGAL GAMBAR:', col4X, kopY + 158);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '13px monospace';
    ctx.fillText(new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' }), col4X, kopY + 178);

    ctx.fillStyle = '#10B981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('✓ DISAHKAN UNTUK PEMBANGUNAN KOTA', col4X, kopY + 212);

    // Export to PNG Download
    const filename = `${(buildingName || 'Bangunan_Kustom').replace(/\s+/g, '_')}_Lembar_Kerja_CAD.png`;
    const link = document.createElement('a');
    link.download = filename;
    link.href = sheet.toDataURL('image/png');
    link.click();
    proceduralAudio.playTaptic('selection');
    showSnackbar({
      variant: 'info',
      title: 'Blueprint Diunduh',
      detail: filename,
      groupKey: 'cad_blueprint_exported',
    });
  };

  // 6 Curated Tropical Architectural Style Presets (B4)
  const PRESETS = TROPICAL_STYLE_PRESETS.map((style) => ({
    id: style.id,
    label: style.name,
    apply: () => {
      const c = style.config;
      setBuildingName(c.buildingName);
      setMassingShape(c.massingShape);
      setWidth(c.width);
      setLength(c.length);
      setFloorCount(c.floorCount);
      setWindowStyle(c.windowStyle);
      setRoofType(c.roofType);
      setRoofMaterial(c.roofMaterial);
      setRoofOverhang(c.roofOverhang);
      setWallMaterial(c.wallMaterial);
      setWallColor(c.wallColor);
      setHasBalcony(c.hasBalcony);
      setHasSunLouvers(c.hasSunLouvers);
      setHasVerticalGarden(c.hasVerticalGarden);
      setHasFrontArcade(c.hasFrontArcade);
      setUseBasePlinthMaterial(c.useBasePlinthMaterial);
      setBaseMaterial(c.baseMaterial);
      setHasSkylight(c.hasSkylight);
      setHasSolarPV(c.hasSolarPV);
      proceduralAudio.playTaptic('selection');
      showSnackbar({
        variant: 'info',
        title: `Gaya ${style.name} Diterapkan`,
        detail: style.description,
        groupKey: 'cad_style_applied',
      });
    }
  }));

  // Rule-Based Curated Generator (B4: always produces structurally sound designs)
  const handleRandomizeDesign = () => {
    const randomized = generateCuratedRandomDesign();
    setBuildingName(randomized.buildingName);
    setMassingShape(randomized.massingShape);
    setWidth(randomized.width);
    setLength(randomized.length);
    setFloorCount(randomized.floorCount);
    setWindowStyle(randomized.windowStyle);
    setRoofType(randomized.roofType);
    setRoofMaterial(randomized.roofMaterial);
    setRoofOverhang(randomized.roofOverhang);
    setWallMaterial(randomized.wallMaterial);
    setWallColor(randomized.wallColor);
    setHasBalcony(randomized.hasBalcony);
    setHasSunLouvers(randomized.hasSunLouvers);
    setHasVerticalGarden(randomized.hasVerticalGarden);
    setHasFrontArcade(randomized.hasFrontArcade);
    setUseBasePlinthMaterial(randomized.useBasePlinthMaterial);
    setBaseMaterial(randomized.baseMaterial);
    setHasSkylight(randomized.hasSkylight);
    setHasSolarPV(randomized.hasSolarPV);

    proceduralAudio.playTaptic('selection');
    showSnackbar({
      variant: 'info',
      title: 'Desain Terkurasi Diterapkan',
      detail: `${randomized.buildingName} • Parameter tervalidasi arsitektur`,
      groupKey: 'cad_randomized',
    });
  };

  const [validationModal, setValidationModal] = useState<{
    warnings: string[];
    correctedConfig: CustomBuildingConfig;
  } | null>(null);

  const executePlacement = (cfg: CustomBuildingConfig) => {
    if (!engine) return;

    const customId = `custom_bld_${Date.now()}`;
    const instance: Partial<BuildingInstance> = {
      id: customId,
      presetKey: 'custom_designer',
      name: cfg.buildingName || 'Bangunan Kustom',
      category: 'residential',
      width: cfg.width,
      length: cfg.length,
      floorCount: cfg.floorCount,
      floorHeight: cfg.floorHeight,
      roofType: cfg.roofType,
      roofOverhang: cfg.roofOverhang,
      wallMaterial: cfg.wallMaterial,
      wallColor: cfg.wallColor,
      roofMaterial: cfg.roofMaterial as any,
      massingShape: cfg.massingShape,
      windowStyle: cfg.windowStyle,
      hasBalcony: cfg.hasBalcony,
      hasSunLouvers: cfg.hasSunLouvers,
      hasVerticalGarden: cfg.hasVerticalGarden,
      hasFrontArcade: cfg.hasFrontArcade,
      useBasePlinthMaterial: cfg.useBasePlinthMaterial,
      baseMaterial: cfg.baseMaterial,
      mullionColor,
      hasSkylight: cfg.hasSkylight
    };

    if (engine.buildingTool) {
      engine.buildingTool.setCustomTemplate(instance);
    }
    engine.setActiveTool('build');
    useUIStore.getState().setActiveTool('build');

    proceduralAudio.playTaptic('selection');
    showSnackbar({
      variant: 'success',
      title: 'Desain Kustom Siap Ditempatkan di Kota',
      detail: `${cfg.buildingName || 'Bangunan Kustom'} • Klik di peta untuk membangun`,
      groupKey: 'cad_ready_to_build',
    });
    onClose();
  };

  const handleCreateAndPlace = () => {
    const currentConfig: CustomBuildingConfig = {
      buildingName,
      massingShape,
      width,
      length,
      floorCount,
      floorHeight,
      windowStyle,
      roofType,
      roofMaterial,
      roofOverhang,
      wallMaterial,
      wallColor,
      hasBalcony,
      hasSunLouvers,
      hasVerticalGarden,
      hasFrontArcade,
      useBasePlinthMaterial,
      baseMaterial,
      hasSkylight,
      hasSolarPV
    };

    const validation = validateBuildingDesign(currentConfig);
    if (!validation.isValid) {
      setValidationModal({
        warnings: validation.warnings,
        correctedConfig: validation.correctedConfig
      });
      return;
    }

    if (studioMode === 'furniture') {
      registerCustomStudioFurniture({
        id: `custom_fur_${Date.now()}`,
        name: buildingName || 'Furnitur Kustom',
        category: 'decor',
        width: Math.min(3.0, width),
        depth: Math.min(3.0, length),
        height: Math.min(2.5, floorHeight),
        color: wallColor
      });
      showSnackbar({
        variant: 'success',
        title: 'Furnitur Kustom Tersimpan',
        detail: `"${buildingName}" berhasil ditambahkan ke Katalog Studio First-Person!`,
        groupKey: 'furniture_saved'
      });
      proceduralAudio.playTaptic('medium');
      onClose();
      return;
    }

    if (studioMode === 'pavilion') {
      if (engine) {
        engine.landscapeManager.addItem({
          id: `pavilion_${Date.now()}`,
          type: 'pavilion_garden_gazebo',
          position: engine.cameraController.target.clone(),
          width,
          length,
          radius: Math.max(width, length) * 0.5
        });
        showSnackbar({
          variant: 'success',
          title: 'Paviliun Taman Berhasil Dibangun',
          detail: `"${buildingName}" telah ditempatkan di lanskap kota!`,
          groupKey: 'pavilion_placed'
        });
        proceduralAudio.playTaptic('medium');
        onClose();
        return;
      }
    }

    executePlacement(currentConfig);
  };

  // The 4 Segmented Control Tabs
  const TABS = [
    { id: 'massing', label: 'Massa & Bentuk', icon: Box },
    { id: 'facade', label: 'Fasad & Bukaan', icon: Columns },
    { id: 'roof', label: 'Atap & Iklim', icon: Home },
    { id: 'material', label: 'Material & Warna', icon: Palette }
  ];

  // Inspector Content Renderer for Tab System
  const renderTabContent = () => {
    switch (activeTab) {
      case 'massing':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Visual Cards: Bentuk Massa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Bentuk Massa Bangunan
                </label>
                <span style={{ fontSize: '10px', color: '#007AFF', fontFamily: 'monospace', fontWeight: 600 }}>
                  {MASSING_OPTIONS.find((m) => m.id === massingShape)?.label}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {MASSING_OPTIONS.slice(0, 3).map((opt) => (
                  <VisualOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    isSelected={massingShape === opt.id}
                    onSelect={setMassingShape}
                  />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {MASSING_OPTIONS.slice(3).map((opt) => (
                  <VisualOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    isSelected={massingShape === opt.id}
                    onSelect={setMassingShape}
                  />
                ))}
              </div>
            </div>

            {/* Slider Lebar */}
            <NumberSliderControl
              label="Lebar Massa (Depan)"
              value={width}
              min={4}
              max={36}
              step={1}
              unit="m"
              defaultValue={10}
              onChange={setWidth}
            />

            {/* Slider Panjang */}
            <NumberSliderControl
              label="Panjang Massa (Samping)"
              value={length}
              min={4}
              max={40}
              step={1}
              unit="m"
              defaultValue={12}
              onChange={setLength}
            />

            {/* Slider Jumlah Lantai */}
            <NumberSliderControl
              label="Jumlah Lantai"
              value={floorCount}
              min={1}
              max={18}
              step={1}
              unit="Lt"
              defaultValue={2}
              onChange={setFloorCount}
            />
          </div>
        );

      case 'facade':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Visual Cards: Gaya Jendela */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Gaya Bukaan & Jendela
                </label>
                <span style={{ fontSize: '10px', color: '#007AFF', fontFamily: 'monospace', fontWeight: 600 }}>
                  {WINDOW_OPTIONS.find((w) => w.id === windowStyle)?.label}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {WINDOW_OPTIONS.slice(0, 3).map((opt) => (
                  <VisualOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    isSelected={windowStyle === opt.id}
                    onSelect={setWindowStyle}
                  />
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {WINDOW_OPTIONS.slice(3).map((opt) => (
                  <VisualOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    isSelected={windowStyle === opt.id}
                    onSelect={setWindowStyle}
                  />
                ))}
              </div>
            </div>

            {/* 4 Facade Accessory Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                Aksesori & Elemen Fasad Tropis
              </label>

              <FacadeToggleRow
                label="Balkon Terbuka Lantai Atas"
                description="Pelat teras menjorok dengan railing kaca/besi hitam"
                checked={hasBalcony}
                onChange={setHasBalcony}
              />

              <FacadeToggleRow
                label="Kisi Peneduh Surya (Secondary Skin)"
                description="Sirip kayu vertikal pelindung panas matahari siang"
                checked={hasSunLouvers}
                onChange={setHasSunLouvers}
              />

              <FacadeToggleRow
                label="Tanaman Vertikal & Planter Box"
                description="Kotak tanaman hijau di sepanjang tepi balkon & bukaan"
                checked={hasVerticalGarden}
                onChange={setHasVerticalGarden}
              />

              <FacadeToggleRow
                label="Kolom Arkade Teras Lantai 1"
                description="Deretan tiang kolom penyangga naungan pejalan kaki"
                checked={hasFrontArcade}
                onChange={setHasFrontArcade}
              />
            </div>
          </div>
        );

      case 'roof':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Visual Cards: Bentuk Atap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                  Bentuk Geometri Atap
                </label>
                <span style={{ fontSize: '10px', color: '#007AFF', fontFamily: 'monospace', fontWeight: 600 }}>
                  {ROOF_OPTIONS.find((r) => r.id === roofType)?.label}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                {ROOF_OPTIONS.map((opt) => (
                  <VisualOptionCard
                    key={opt.id}
                    id={opt.id}
                    label={opt.label}
                    subtitle={opt.subtitle}
                    icon={opt.icon}
                    isSelected={roofType === opt.id}
                    onSelect={setRoofType}
                  />
                ))}
              </div>
            </div>

            {/* Slider Overhang Teritisan */}
            <NumberSliderControl
              label="Teritisan / Overhang Peneduh"
              value={roofOverhang}
              min={0.4}
              max={2.5}
              step={0.1}
              unit="m"
              defaultValue={1.2}
              onChange={setRoofOverhang}
            />

            {/* Fitur Iklim & Energi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>
                Fitur Iklim & Energi Ramah Lingkungan
              </label>

              <FacadeToggleRow
                label="Skylight Kaca Atas"
                description="Penerangan alami atap untuk hemat konsumsi energi listrik"
                checked={hasSkylight}
                onChange={setHasSkylight}
              />

              <FacadeToggleRow
                label="Panel Surya / Solar PV Rooftop"
                description="Deretan sel fotovoltaik penghasil listrik energi terbarukan"
                checked={hasSolarPV}
                onChange={setHasSolarPV}
              />
            </div>
          </div>
        );

      case 'material':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Tekstur Dinding Utama */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Tekstur Dinding Utama</label>
              <CustomSelect<WallMaterialType>
                value={wallMaterial}
                onChange={setWallMaterial}
                options={[
                  { value: 'plaster', label: 'Plester & Cat Halus', badge: 'Halus', description: 'Permukaan plester kapur tropis modern' },
                  { value: 'brick', label: 'Bata Merah Ekspos', badge: 'Tekstur', description: 'Pola bata merah alami berkarakter' },
                  { value: 'concrete', label: 'Beton Cor Board-Formed', badge: 'Brutalis', description: 'Serat cetakan papan kayu pada beton' },
                  { value: 'wood', label: 'Kayu Jati Kisi Vertikal', badge: 'Tropis', description: 'Slat kayu jati penangkal panas' }
                ]}
              />
            </div>

            {/* Palet Warna Dinding */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Palet Warna Dinding</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.hex}
                    type="button"
                    onClick={() => setWallColor(pal.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px',
                      borderRadius: '10px',
                      border: wallColor === pal.hex ? '1.5px solid #007AFF' : '1px solid rgba(15, 23, 42, 0.1)',
                      background: wallColor === pal.hex ? 'rgba(10, 132, 255, 0.12)' : 'rgba(255, 255, 255, 0.95)',
                      color: '#0F172A',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: pal.hex, border: '1px solid rgba(0,0,0,0.2)', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pal.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Kombinasi 2 Material (Lantai Dasar vs Lantai Atas) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
              <FacadeToggleRow
                label="Dinding Kombinasi 2 Material"
                description="Lantai dasar memakai material aksen batu/bata kokoh"
                checked={useBasePlinthMaterial}
                onChange={setUseBasePlinthMaterial}
              />

              {useBasePlinthMaterial && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(255, 255, 255, 0.85)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(10, 132, 255, 0.25)' }}>
                  <label style={{ fontSize: '11px', color: '#007AFF', fontWeight: 700 }}>Material Lantai Dasar (Base Plinth)</label>
                  <CustomSelect<string>
                    value={baseMaterial}
                    onChange={setBaseMaterial}
                    options={[
                      { value: 'andesite', label: 'Batu Candi Andesit Hitam', badge: 'Kokoh', description: 'Batu alam vulkanik khas candi & tropis' },
                      { value: 'brick', label: 'Bata Merah Ekspos', badge: 'Tekstur', description: 'Tekstur terakota alami berkarakter' },
                      { value: 'concrete', label: 'Beton Cor Ekspos', badge: 'Industrial', description: 'Beton abu minimalis kontemporer' },
                      { value: 'wood', label: 'Kayu Jati Kisi', badge: 'Alami', description: 'Panel kayu jati hangat' }
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Material Atap */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
              <label style={{ fontSize: '11px', color: '#475569', fontWeight: 700, textTransform: 'uppercase' }}>Material Penutup Atap</label>
              <CustomSelect<string>
                value={roofMaterial}
                onChange={setRoofMaterial}
                options={[
                  { value: 'clay_tile', label: 'Genteng Terakota Alami', badge: 'Terakota', description: 'Genteng bakar terakota hangat #B45309 peredam panas' },
                  { value: 'dark_zinc', label: 'Atap Baja Slate', badge: 'Baja', description: 'Tekstur atap baja warna slate #475569 kontemporer' },
                  { value: 'concrete_slab', label: 'Plat Beton Abu', badge: 'Minimalis', description: 'Tekstur semen ekspos halus' }
                ]}
              />
            </div>
          </div>
        );
    }
  };

  // ==========================================
  // RENDER: FULL-SCREEN ARCHITECTURAL CAD STUDIO (100% Viewport)
  // (Identitas Laboratorium Analisis Arscity)
  // ==========================================
  return (
    <div
      ref={modalRef}
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: cadTheme === 'blueprint' ? '#0A1120' : '#E8EEF5',
        color: cadTheme === 'blueprint' ? '#FFFFFF' : '#0F172A'
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cad-studio-title"
    >
      {/* Top CAD Header Bar (Laboratorium Analisis Glass) */}
        <div
          style={{
            height: '56px',
            padding: '0 20px',
            background: 'rgba(240, 245, 250, 0.90)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            zIndex: 20
          }}
        >
          {/* Left: Studio Branding & Building Name Input without wrapping */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ArscityLogo size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span id="cad-studio-title" style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                  Studio CAD
                </span>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    type="text"
                    value={buildingName}
                    onChange={(e) => setBuildingName(e.target.value)}
                    style={{
                      fontSize: '12px',
                      padding: '3px 8px 3px 22px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.85)',
                      border: '1px solid rgba(15, 23, 42, 0.15)',
                      color: '#0F172A',
                      fontWeight: 600,
                      width: '180px',
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    placeholder="Nama Desain"
                    title="Klik untuk mengubah nama desain"
                  />
                  <Pencil size={11} style={{ position: 'absolute', left: '7px', color: '#64748B', pointerEvents: 'none' }} />
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#64748B', marginTop: '1px' }}>
                {formatMeters(width, 1)} × {formatMeters(length, 1)} • {floorCount} Lantai • Puncak +{formatMeters(roofPeakHeight, 2)}
              </div>
            </div>
          </div>

          {/* Mode Studio Creation: 1. Gedung, 2. Furnitur Kustom, 3. Paviliun Taman */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#E2E8F0',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid rgba(15, 23, 42, 0.06)'
            }}
          >
            {[
              { id: 'building' as const, label: 'Mode Gedung' },
              { id: 'furniture' as const, label: 'Mode Furnitur' },
              { id: 'pavilion' as const, label: 'Mode Paviliun' }
            ].map((m) => {
              const isSel = studioMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setStudioMode(m.id);
                    proceduralAudio.playTaptic('selection');
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isSel ? '#007AFF' : 'transparent',
                    color: isSel ? '#FFFFFF' : '#334155',
                    boxShadow: isSel ? '0 1px 3px rgba(0, 122, 255, 0.3)' : 'none',
                    fontSize: '11px',
                    fontWeight: isSel ? 700 : 600,
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Center: Segmented Control Tampilan */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: '#E2E8F0',
              padding: '3px',
              borderRadius: '9999px',
              border: '1px solid rgba(15, 23, 42, 0.06)'
            }}
          >
            {[
              { id: 'iso', label: '3D' },
              { id: 'top', label: 'Denah' },
              { id: 'front', label: 'Depan' },
              { id: 'side', label: 'Samping' }
            ].map((preset) => {
              const isSel = cadViewPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setCadViewPreset(preset.id as any);
                    proceduralAudio.playTaptic('selection');
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    border: 'none',
                    background: isSel ? '#007AFF' : 'transparent',
                    color: isSel ? '#FFFFFF' : '#334155',
                    boxShadow: isSel ? '0 1px 3px rgba(0, 122, 255, 0.3)' : 'none',
                    fontSize: '11px',
                    fontWeight: isSel ? 700 : 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          {/* Right: Dropdowns & Actions (Max 5 Controls on screen) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            {/* 1. Render Mode Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowRenderMenu(!showRenderMenu);
                  setShowSunMenu(false);
                  setShowMoreMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(15, 23, 42, 0.1)',
                  background: renderMode !== 'pbr' ? 'rgba(0, 122, 255, 0.12)' : 'rgba(255, 255, 255, 0.9)',
                  color: renderMode !== 'pbr' ? '#007AFF' : '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <span>Render: {renderMode === 'pbr' ? 'Realistis' : renderMode === 'cad' ? 'Garis Teknis' : 'Maket Putih'}</span>
                <ChevronDown size={12} />
              </button>
              {showRenderMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '4px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    zIndex: 100,
                    minWidth: '150px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  {[
                    { id: 'pbr', label: 'Realistis (PBR)' },
                    { id: 'cad', label: 'Garis Teknis' },
                    { id: 'clay', label: 'Maket Putih' }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setRenderMode(m.id as any);
                        setShowRenderMenu(false);
                        proceduralAudio.playTaptic('selection');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: renderMode === m.id ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                        color: renderMode === m.id ? '#007AFF' : '#1E293B',
                        fontSize: '11px',
                        fontWeight: renderMode === m.id ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Sun Hour Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowSunMenu(!showSunMenu);
                  setShowRenderMenu(false);
                  setShowMoreMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(15, 23, 42, 0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Pilih jam simulasi bayangan matahari"
              >
                <Sun size={12} color="#F59E0B" />
                <span>{sunHour} WIB</span>
                <ChevronDown size={12} />
              </button>
              {showSunMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '4px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    zIndex: 100,
                    minWidth: '130px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  {[
                    { id: '08:00', label: '08:00 Pagi' },
                    { id: '12:00', label: '12:00 Siang' },
                    { id: '16:00', label: '16:00 Sore' }
                  ].map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() => {
                        setSunHour(sh.id as any);
                        setShowSunMenu(false);
                        proceduralAudio.playTaptic('selection');
                      }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: sunHour === sh.id ? 'rgba(0, 122, 255, 0.1)' : 'transparent',
                        color: sunHour === sh.id ? '#007AFF' : '#1E293B',
                        fontSize: '11px',
                        fontWeight: sunHour === sh.id ? 700 : 500,
                        textAlign: 'left',
                        cursor: 'pointer'
                      }}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. More Menu Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowRenderMenu(false);
                  setShowSunMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(15, 23, 42, 0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  color: '#334155',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Menu tambahan"
              >
                <span>Lainnya</span>
                <ChevronDown size={12} />
              </button>
              {showMoreMenu && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    padding: '4px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    border: '1px solid rgba(15, 23, 42, 0.08)',
                    zIndex: 100,
                    minWidth: '220px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsAutoRotate(!isAutoRotate);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {isAutoRotate ? <Pause size={13} color="#007AFF" /> : <Play size={13} color="#64748B" />}
                    <span>{isAutoRotate ? 'Jeda putaran kamera' : 'Putar rotasi otomatis'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCadTheme(cadTheme === 'light' ? 'blueprint' : 'light');
                      setShowMoreMenu(false);
                      proceduralAudio.playTaptic('light');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Box size={13} color="#64748B" />
                    <span>Latar: {cadTheme === 'light' ? 'Blueprint Gelap' : 'Studio Terang'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowScaleFigure(!showScaleFigure);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Ruler size={13} color={showScaleFigure ? '#007AFF' : '#64748B'} />
                    <span>Acuan Skala Manusia ({showScaleFigure ? 'Aktif' : 'Nonaktif'})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDetailDims(!showDetailDims);
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#1E293B',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Grid size={13} color={showDetailDims ? '#007AFF' : '#64748B'} />
                    <span>Dimensi Detail Lantai ({showDetailDims ? 'Tampil' : 'Sederhana'})</span>
                  </button>

                  <div style={{ height: '1px', background: 'var(--separator)', margin: '2px 0' }} />

                  <button
                    type="button"
                    onClick={() => {
                      handleExportBlueprintSheet();
                      setShowMoreMenu(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '7px 10px',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'transparent',
                      color: '#007AFF',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    <Download size={13} color="#007AFF" />
                    <span>Unduh Lembar Kerja (PNG)</span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Primary: Bangun di Kota */}
            <button
              type="button"
              onClick={handleCreateAndPlace}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '10px',
                background: '#007AFF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '12px',
                fontWeight: 700,
                boxShadow: '0 2px 8px rgba(0, 122, 255, 0.28)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Sparkles size={14} />
              <span>{studioMode === 'furniture' ? 'Simpan ke Katalog Furnitur' : studioMode === 'pavilion' ? 'Tempatkan Paviliun di Peta' : 'Bangun di Kota'}</span>
            </button>

            {/* 5. Keluar Studio */}
            <button
              type="button"
              onClick={() => setShowExitConfirm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.90)',
                color: '#334155',
                border: '1px solid rgba(15, 23, 42, 0.12)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Keluar Studio CAD (ESC)"
            >
              <X size={14} strokeWidth={2} />
              <span>Keluar</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
          {/* Left: 3D CAD Viewport */}
          <div style={{ flex: 1, height: '100%', position: 'relative' }}>
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
              isFullScreenCAD={true}
              viewPreset={cadViewPreset}
              renderMode={renderMode}
              isAutoRotate={isAutoRotate}
              sunHour={sunHour}
              cadTheme={cadTheme}
              onWidthChange={setWidth}
              onLengthChange={setLength}
              onFloorCountChange={setFloorCount}
              onCanvasReady={(cvs) => {
                exportCanvasRef.current = cvs;
              }}
              massingShape={massingShape}
              windowStyle={windowStyle}
              hasBalcony={hasBalcony}
              hasSunLouvers={hasSunLouvers}
              hasVerticalGarden={hasVerticalGarden}
              hasFrontArcade={hasFrontArcade}
              useBasePlinthMaterial={useBasePlinthMaterial}
              baseMaterial={baseMaterial}
              mullionColor={mullionColor}
              hasSkylight={hasSkylight}
              hasSolarPV={hasSolarPV}
              showScaleFigure={showScaleFigure}
              showDetailDims={showDetailDims}
            />

            {/* Floating Architectural HUD Callouts (Bottom Telemetry Bar - Correct KDB/KLB) */}
            {(() => {
              const selectedLot = engine?.lotManager?.getSelectedLot();
              const lotArea = selectedLot?.areaM2 || null;
              const kdbPercent = lotArea ? Math.round((footprintArea / lotArea) * 100) : null;
              const klbRatio = lotArea ? (totalFloorArea / lotArea).toFixed(2) : null;

              return (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '20px',
                    background: 'rgba(240, 245, 250, 0.92)',
                    backdropFilter: 'blur(28px)',
                    WebkitBackdropFilter: 'blur(28px)',
                    border: '1.5px solid rgba(255, 255, 255, 0.9)',
                    borderRadius: '18px',
                    padding: '10px 18px',
                    boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    zIndex: 10
                  }}
                >
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Luas Lantai Dasar</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>{formatArea(footprintArea)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Total Luas Lantai</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF' }}>{formatArea(totalFloorArea)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Koefisien KDB / KLB</div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: lotArea ? '#007AFF' : '#64748B' }}>
                      {lotArea ? `KDB ${kdbPercent}% • KLB ${klbRatio?.replace('.', ',')}x` : 'Pilih kavling di kota'}
                    </div>
                  </div>
                  <div title="Plafon tinggi (min 3.0 m) memfasilitasi efek cerobong termal untuk sirkulasi udara sejuk di iklim tropis">
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Tinggi Dinding</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#248A3D' }}>{formatMeters(wallHeight, 2)}</div>
                  </div>
                  <div title="Kemiringan atap curam mempercepat aliran air hujan lebat dan mengurangi akumulasi panas radiasi matahari">
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Puncak Atap</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#007AFF' }}>+{formatMeters(roofPeakHeight, 2)}</div>
                  </div>
                  <div title="Overhang min 1.0 m membayangi bukaan jendela dari terik matahari khatulistiwa dan tampias hujan lebat">
                    <div style={{ fontSize: '10px', color: '#64748B', fontWeight: 600 }}>Teritisan Tropis</div>
                    <div className="tabular-nums" style={{ fontSize: '15px', fontWeight: 700, color: '#D97706' }}>{formatMeters(roofOverhang, 1)}</div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Right: Floating Glass Parameter Sidebar (Laboratorium Analisis Inspector - 400px) */}
          <div
            style={{
              width: '400px',
              minWidth: '380px',
              maxWidth: '400px',
              background: 'rgba(240, 245, 250, 0.94)',
              backdropFilter: 'blur(28px)',
              WebkitBackdropFilter: 'blur(28px)',
              borderLeft: '1px solid rgba(15, 23, 42, 0.08)',
              height: '100%',
              maxHeight: 'calc(100vh - 56px)',
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              color: '#0F172A',
              zIndex: 15
            }}
          >
            {/* Quick Inspiration Presets & Randomizer Bar */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Preset Cepat & Koleksi
                </span>
                <button
                  type="button"
                  onClick={handleRandomizeDesign}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '8px',
                    background: 'rgba(10, 132, 255, 0.12)',
                    border: '1px solid rgba(10, 132, 255, 0.25)',
                    color: '#007AFF',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  title="Acak Kombinasi Desain Unik"
                >
                  <Wand2 size={12} />
                  <span>Acak Desain</span>
                </button>
              </div>

              {/* Presets List: + Simpan Preset, Built-in, and User Presets */}
              <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '4px' }}>
                {/* 1. Button + Simpan Preset */}
                <button
                  type="button"
                  onClick={handleSaveUserPreset}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: '1.5px dashed #007AFF',
                    background: 'rgba(10, 132, 255, 0.08)',
                    color: '#007AFF',
                    fontSize: '10.5px',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  title="Simpan konfigurasi gedung saat ini ke Koleksi Saya"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>+ Simpan Preset</span>
                </button>

                {/* 2. Built-in Presets */}
                {PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      preset.apply();
                      proceduralAudio.playTaptic('selection');
                      showSnackbar({
                        variant: 'info',
                        title: `Preset ${preset.label} Diterapkan`,
                        groupKey: 'cad_preset_applied',
                      });
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(15, 23, 42, 0.1)',
                      background: buildingName === preset.label ? '#007AFF' : 'rgba(255, 255, 255, 0.85)',
                      color: buildingName === preset.label ? '#FFFFFF' : '#334155',
                      fontSize: '10.5px',
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      flexShrink: 0,
                      boxShadow: buildingName === preset.label ? '0 1px 4px rgba(0, 122, 255, 0.25)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {preset.label}
                  </button>
                ))}

                {/* 3. User Custom Presets from LocalStorage */}
                {userPresets.map((up) => {
                  const isSelected = buildingName === up.label;
                  return (
                    <div
                      key={up.id}
                      onClick={() => handleApplyUserPreset(up)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        border: isSelected ? '1.5px solid #007AFF' : '1px solid rgba(16, 185, 129, 0.4)',
                        background: isSelected ? '#007AFF' : 'rgba(16, 185, 129, 0.12)',
                        color: isSelected ? '#FFFFFF' : '#047857',
                        fontSize: '10.5px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s ease'
                      }}
                      title={`Preset Koleksi Saya: ${up.label}`}
                    >
                      <Bookmark size={10} />
                      <span>{up.label}</span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteUserPreset(up.id, e)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: isSelected ? '#FFFFFF' : '#047857',
                          cursor: 'pointer',
                          padding: '0 2px',
                          fontSize: '12px',
                          lineHeight: 1,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title="Hapus preset ini dari Koleksi"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4-Category Segmented Control Tab Bar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '3px',
                background: '#E2E8F0',
                padding: '3px',
                borderRadius: '12px'
              }}
            >
              {TABS.map((tab) => {
                const isSel = activeTab === tab.id;
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id as any);
                      proceduralAudio.playTaptic('selection');
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '6px 2px',
                      borderRadius: '9px',
                      border: 'none',
                      background: isSel ? '#FFFFFF' : 'transparent',
                      color: isSel ? '#007AFF' : '#64748B',
                      boxShadow: isSel ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none',
                      fontSize: '10px',
                      fontWeight: isSel ? 700 : 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconComp size={14} strokeWidth={isSel ? 2.5 : 1.75} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Tab Inspector Content */}
            <div style={{ flex: 1 }}>
              {renderTabContent()}
            </div>

            {/* SNI Tropical Building Code Compliance Checklist Strip */}
            <div
              style={{
                marginTop: '12px',
                background: '#FFFFFF',
                borderRadius: '12px',
                padding: '12px',
                border: 'none',
                boxShadow: '0 2px 10px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Pemeriksaan Standar Tropis SNI
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Teritisan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  {roofOverhang >= 1.0 ? (
                    <CheckCircle2 size={14} color="#30D158" />
                  ) : (
                    <AlertCircle size={14} color="#F59E0B" />
                  )}
                  <span style={{ color: '#1E293B', fontWeight: 500 }}>
                    Teritisan: {roofOverhang >= 1.0 ? 'Optimal (≥1.0m)' : 'Pendek (<1.0m)'}
                  </span>
                </div>
                {/* Plafon */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  {floorHeight >= 3.0 ? (
                    <CheckCircle2 size={14} color="#30D158" />
                  ) : (
                    <AlertCircle size={14} color="#F59E0B" />
                  )}
                  <span style={{ color: '#1E293B', fontWeight: 500 }}>
                    Tinggi Plafon: {floorHeight >= 3.0 ? 'Ventilasi Sejuk (≥3.0m)' : 'Rendah (<3.0m)'}
                  </span>
                </div>
                {/* Bukaan */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                  <CheckCircle2 size={14} color="#30D158" />
                  <span style={{ color: '#1E293B', fontWeight: 500 }}>
                    Bukaan Alami: {hasSunLouvers ? 'Kisi Peneduh Aktif' : 'Standar Pencahayaan Cukup'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Architectural Validation Warning Dialog (B4) */}
        {validationModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--scrim)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100001
            }}
            onClick={() => setValidationModal(null)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '440px',
                width: '92%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                textAlign: 'left'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.12)',
                    color: '#D97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Catatan Validasi Arsitektur
                  </h3>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Ditemukan ketidaksesuaian proporsi atau standar tropis
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.06)',
                  border: '1px solid rgba(245, 158, 11, 0.2)',
                  borderRadius: '10px',
                  padding: '10px 12px',
                  marginBottom: '18px',
                  maxHeight: '160px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                {validationModal.warnings.map((w, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '11.5px', color: '#92400E' }}>
                    <span style={{ fontWeight: 700 }}>•</span>
                    <span>{w}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const corrected = validationModal.correctedConfig;
                    setValidationModal(null);
                    setWidth(corrected.width);
                    setLength(corrected.length);
                    setFloorCount(corrected.floorCount);
                    setRoofType(corrected.roofType);
                    setRoofOverhang(corrected.roofOverhang);
                    setHasBalcony(corrected.hasBalcony);
                    setHasSunLouvers(corrected.hasSunLouvers);
                    executePlacement(corrected);
                  }}
                  style={{
                    width: '100%',
                    padding: '9px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#007AFF',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)'
                  }}
                >
                  Perbaiki Otomatis & Bangun
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const cfg: CustomBuildingConfig = {
                        buildingName,
                        massingShape,
                        width,
                        length,
                        floorCount,
                        floorHeight,
                        windowStyle,
                        roofType,
                        roofMaterial,
                        roofOverhang,
                        wallMaterial,
                        wallColor,
                        hasBalcony,
                        hasSunLouvers,
                        hasVerticalGarden,
                        hasFrontArcade,
                        useBasePlinthMaterial,
                        baseMaterial,
                        hasSkylight,
                        hasSolarPV
                      };
                      setValidationModal(null);
                      executePlacement(cfg);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '10px',
                      border: '1px solid rgba(15, 23, 42, 0.15)',
                      background: '#F8FAFC',
                      color: '#475569',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Tetap Bangun dengan Catatan
                  </button>

                  <button
                    type="button"
                    onClick={() => setValidationModal(null)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid rgba(15, 23, 42, 0.12)',
                      background: 'transparent',
                      color: '#64748B',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Exit Confirmation Dialog */}
        {showExitConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'var(--scrim)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100000
            }}
            onClick={() => setShowExitConfirm(false)}
          >
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '24px',
                maxWidth: '380px',
                width: '90%',
                boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
                border: '1px solid rgba(15, 23, 42, 0.1)',
                textAlign: 'center'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}
              >
                <AlertCircle size={24} />
              </div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
                Keluar dari Studio CAD?
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
                Desain yang belum dibangun di kota atau disimpan ke Koleksi Saya akan diatur ulang.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowExitConfirm(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    background: '#F1F5F9',
                    color: '#334155',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Lanjut Merancang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowExitConfirm(false);
                    onClose();
                  }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#EF4444',
                    color: '#FFFFFF',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Keluar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
};

export const CustomBuildingStudioModal = CustomBuildingCreatorModal;
export type CustomBuildingStudioModalProps = CustomBuildingCreatorModalProps;

