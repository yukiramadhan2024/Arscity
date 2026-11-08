import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export interface InteractiveDioramaCanvasProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * InteractiveDioramaCanvas - Swiss Architectural 3D Launchpad Diorama
 *
 * Renders an interactive, real-time Three.js architectural model showcase:
 * - Axonometric / Isometric architectural perspective
 * - Stepped terrain podium with modular grid laser-lines
 * - Modernist tropical pavilion, cantilevered tower, and timber pergola
 * - Real-time lighting with Crimson Pink accent rim-lights
 * - Interactive mouse hover tilt & click-drag orbit with smooth damping
 * - Full memory cleanup and WebGL lifecycle management
 */
export const InteractiveDioramaCanvas: React.FC<InteractiveDioramaCanvasProps> = ({
  className = '',
  style = {},
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [azimuthDeg, setAzimuthDeg] = useState<number>(35);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 560;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#DBF2FC');
    scene.fog = new THREE.FogExp2('#DBF2FC', 0.016);

    // 2. Camera setup - Isometric perspective
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(22, 19, 22);
    camera.lookAt(0, 3.2, 0);

    // 3. Renderer setup
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      container.appendChild(renderer.domElement);
    } catch {
      return;
    }

    // 4. Lighting setup - Studio Architectural Lighting
    const ambientLight = new THREE.AmbientLight('#EBF7FD', 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight('#FFFFFF', 2.0);
    sunLight.position.set(16, 28, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Soft Seal Blue Fill Light
    const fillLight = new THREE.DirectionalLight('#9ADCF9', 0.85);
    fillLight.position.set(-18, 14, -14);
    scene.add(fillLight);

    // Crimson Pink Accent Rim Light
    const rimLight = new THREE.DirectionalLight('#FD6E8E', 1.1);
    rimLight.position.set(-10, 8, 20);
    scene.add(rimLight);

    // 5. Materials
    const navyPlinthMat = new THREE.MeshStandardMaterial({
      color: '#072D59',
      roughness: 0.7,
      metalness: 0.2,
    });
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#E8F5FC',
      roughness: 0.85,
      metalness: 0.05,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#FFFFFF',
      roughness: 0.6,
      metalness: 0.1,
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: '#133F6E',
      roughness: 0.4,
      metalness: 0.6,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#67C6FF',
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
      reflectivity: 0.9,
    });
    const timberMat = new THREE.MeshStandardMaterial({
      color: '#D4A373',
      roughness: 0.65,
      metalness: 0.1,
    });
    const crimsonAccentMat = new THREE.MeshStandardMaterial({
      color: '#FD6E8E',
      roughness: 0.35,
      metalness: 0.15,
    });
    const foliageMat = new THREE.MeshStandardMaterial({
      color: '#2A9D8F',
      roughness: 0.9,
      metalness: 0.0,
    });
    const gridLineMat = new THREE.LineBasicMaterial({
      color: '#072D59',
      transparent: true,
      opacity: 0.18,
    });

    const modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // 6. Model Construction - Swiss / Modernist Tropical Architectural Ensemble
    // A. Stepped Base Pedestal & Modular Site Plinth
    const plinthGeo = new THREE.BoxGeometry(16, 0.9, 16);
    const plinthMesh = new THREE.Mesh(plinthGeo, navyPlinthMat);
    plinthMesh.position.y = -0.45;
    plinthMesh.receiveShadow = true;
    modelGroup.add(plinthMesh);

    const groundPlateGeo = new THREE.BoxGeometry(15.4, 0.15, 15.4);
    const groundPlate = new THREE.Mesh(groundPlateGeo, groundMat);
    groundPlate.position.y = 0.075;
    groundPlate.receiveShadow = true;
    modelGroup.add(groundPlate);

    // Architectural Modular Grid Lines on Plinth
    const gridPoints: THREE.Vector3[] = [];
    const gridSize = 14;
    const step = 2.0;
    for (let i = -gridSize / 2; i <= gridSize / 2; i += step) {
      gridPoints.push(new THREE.Vector3(i, 0.16, -gridSize / 2));
      gridPoints.push(new THREE.Vector3(i, 0.16, gridSize / 2));
      gridPoints.push(new THREE.Vector3(-gridSize / 2, 0.16, i));
      gridPoints.push(new THREE.Vector3(gridSize / 2, 0.16, i));
    }
    const gridGeo = new THREE.BufferGeometry().setFromPoints(gridPoints);
    const gridLines = new THREE.LineSegments(gridGeo, gridLineMat);
    modelGroup.add(gridLines);

    // B. Terraced Topographic Plate
    const terraceGeo = new THREE.BoxGeometry(10, 0.25, 9);
    const terrace = new THREE.Mesh(terraceGeo, groundMat);
    terrace.position.set(-1.5, 0.28, -1.5);
    terrace.receiveShadow = true;
    terrace.castShadow = true;
    modelGroup.add(terrace);

    // C. Main Architectural Tower (Interlocking Volumetric Masses)
    const towerCoreGeo = new THREE.BoxGeometry(4.2, 7.5, 3.8);
    const towerCore = new THREE.Mesh(towerCoreGeo, concreteMat);
    towerCore.position.set(-1.8, 3.75 + 0.4, -1.8);
    towerCore.castShadow = true;
    towerCore.receiveShadow = true;
    modelGroup.add(towerCore);

    // Cantilevered Upper Studio Box
    const cantileverGeo = new THREE.BoxGeometry(4.8, 2.6, 5.0);
    const cantilever = new THREE.Mesh(cantileverGeo, darkSteelMat);
    cantilever.position.set(-1.4, 6.4 + 0.4, -1.2);
    cantilever.castShadow = true;
    cantilever.receiveShadow = true;
    modelGroup.add(cantilever);

    // Large Ribbon Windows on Cantilever
    const windowGeo = new THREE.BoxGeometry(4.86, 1.4, 4.2);
    const ribbonWindow = new THREE.Mesh(windowGeo, glassMat);
    ribbonWindow.position.set(-1.4, 6.4 + 0.4, -1.2);
    modelGroup.add(ribbonWindow);

    // Architectural Louvers / Brise-Soleil (Vertical timber slats on facade)
    const louverGeo = new THREE.BoxGeometry(0.08, 2.3, 0.4);
    for (let lx = -3.2; lx <= -0.2; lx += 0.5) {
      const louver = new THREE.Mesh(louverGeo, timberMat);
      louver.position.set(lx, 6.4 + 0.4, 1.45);
      louver.castShadow = true;
      modelGroup.add(louver);
    }

    // D. Cantilevered Crimson Pink Roof Canopy
    const roofCanopyGeo = new THREE.BoxGeometry(5.8, 0.22, 5.8);
    const roofCanopy = new THREE.Mesh(roofCanopyGeo, crimsonAccentMat);
    roofCanopy.position.set(-1.4, 7.85 + 0.4, -1.2);
    roofCanopy.castShadow = true;
    modelGroup.add(roofCanopy);

    // E. Low-Slung Tropical Pendopo / Open Pavilion (Right Side)
    const pavilionBaseGeo = new THREE.BoxGeometry(5.5, 0.2, 6.2);
    const pavilionBase = new THREE.Mesh(pavilionBaseGeo, timberMat);
    pavilionBase.position.set(3.4, 0.25, 1.5);
    pavilionBase.receiveShadow = true;
    modelGroup.add(pavilionBase);

    // Slender Steel Columns
    const colGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 12);
    const colCoords = [
      [1.1, 1.5, -1.0],
      [1.1, 1.5, 4.0],
      [5.7, 1.5, -1.0],
      [5.7, 1.5, 4.0],
    ];
    colCoords.forEach(([cx, cy, cz]) => {
      const col = new THREE.Mesh(colGeo, darkSteelMat);
      col.position.set(cx, cy, cz);
      col.castShadow = true;
      modelGroup.add(col);
    });

    // Floating Timber Pavilion Roof with Subtle Overhang
    const pavilionRoofGeo = new THREE.BoxGeometry(6.2, 0.18, 6.8);
    const pavilionRoof = new THREE.Mesh(pavilionRoofGeo, concreteMat);
    pavilionRoof.position.set(3.4, 2.9, 1.5);
    pavilionRoof.castShadow = true;
    modelGroup.add(pavilionRoof);

    // Inner Warm Timber Ceiling Deck
    const ceilingGeo = new THREE.BoxGeometry(5.8, 0.06, 6.4);
    const ceiling = new THREE.Mesh(ceilingGeo, timberMat);
    ceiling.position.set(3.4, 2.78, 1.5);
    modelGroup.add(ceiling);

    // Pavilion Interior Furniture Mock (Bench & Table)
    const tableGeo = new THREE.BoxGeometry(1.8, 0.5, 0.9);
    const table = new THREE.Mesh(tableGeo, darkSteelMat);
    table.position.set(3.4, 0.55, 1.5);
    table.castShadow = true;
    modelGroup.add(table);

    // F. Architectural Paving / Water Feature Basin
    const waterGeo = new THREE.BoxGeometry(3.0, 0.08, 3.2);
    const waterMat = new THREE.MeshStandardMaterial({
      color: '#67C6FF',
      roughness: 0.1,
      metalness: 0.8,
    });
    const pool = new THREE.Mesh(waterGeo, waterMat);
    pool.position.set(0.8, 0.18, -3.2);
    pool.receiveShadow = true;
    modelGroup.add(pool);

    // G. Minimalist Architectural Trees (Stylized Cones & Spheres)
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, 1.6, 8);
    const foliageSphereGeo = new THREE.SphereGeometry(0.85, 12, 10);
    const foliageConeGeo = new THREE.ConeGeometry(0.75, 1.9, 10);

    const treeData = [
      { x: -5.2, z: 2.8, type: 'cone', scale: 1.1 },
      { x: -4.4, z: 4.6, type: 'sphere', scale: 0.9 },
      { x: 5.6, z: -4.0, type: 'sphere', scale: 1.2 },
      { x: 4.0, z: -4.8, type: 'cone', scale: 0.85 },
      { x: -4.8, z: -5.0, type: 'sphere', scale: 1.0 },
    ];

    treeData.forEach((t) => {
      const trunk = new THREE.Mesh(trunkGeo, timberMat);
      trunk.position.set(t.x, 0.8, t.z);
      trunk.castShadow = true;
      modelGroup.add(trunk);

      const foliage = new THREE.Mesh(
        t.type === 'cone' ? foliageConeGeo : foliageSphereGeo,
        foliageMat
      );
      foliage.position.set(t.x, t.type === 'cone' ? 2.0 : 1.9, t.z);
      foliage.scale.setScalar(t.scale);
      foliage.castShadow = true;
      modelGroup.add(foliage);
    });

    // 7. Interactive Mouse / Touch Orbit & Damping
    let targetRotationY = 0.65;
    let targetRotationX = 0.0;
    let currentRotationY = 0.65;
    let currentRotationX = 0.0;
    let isPointerDown = false;
    let prevPointerX = 0;
    let prevPointerY = 0;
    let autoRotate = true;

    const handlePointerDown = (e: PointerEvent) => {
      isPointerDown = true;
      setIsDragging(true);
      autoRotate = false;
      prevPointerX = e.clientX;
      prevPointerY = e.clientY;
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (isPointerDown) {
        const deltaX = e.clientX - prevPointerX;
        const deltaY = e.clientY - prevPointerY;
        prevPointerX = e.clientX;
        prevPointerY = e.clientY;

        targetRotationY += deltaX * 0.007;
        targetRotationX = Math.max(-0.4, Math.min(0.4, targetRotationX + deltaY * 0.005));
      } else {
        // Gentle parallax on hover
        const rect = container.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
        if (!autoRotate) {
          targetRotationY += normX * 0.0008;
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      isPointerDown = false;
      setIsDragging(false);
      autoRotate = true;
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
    };

    const domElement = renderer.domElement;
    domElement.style.width = '100%';
    domElement.style.height = '100%';
    domElement.style.display = 'block';
    domElement.style.cursor = 'grab';
    domElement.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 8. Animation Loop
    let animId: number = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (autoRotate && !isPointerDown) {
        targetRotationY += 0.22 * dt;
      }

      currentRotationY += (targetRotationY - currentRotationY) * 0.08;
      currentRotationX += (targetRotationX - currentRotationX) * 0.08;

      modelGroup.rotation.y = currentRotationY;
      modelGroup.rotation.x = currentRotationX;

      // Update telemetry display degrees
      const deg = Math.round((((currentRotationY * 180) / Math.PI) % 360) + 360) % 360;
      setAzimuthDeg(deg);

      renderer?.render(scene, camera);
    };
    animId = requestAnimationFrame(animate);

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: nw, height: nh } = entry.contentRect;
        if (nw > 0 && nh > 0 && renderer) {
          camera.aspect = nw / nh;
          camera.updateProjectionMatrix();
          renderer.setSize(nw, nh);
        }
      }
    });
    resizeObserver.observe(container);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      domElement.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (renderer) {
        renderer.dispose();
        if (renderer.domElement && renderer.domElement.parentNode) {
          renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
      }

      // Dispose Geometries and Materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    };
  }, []);

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none ${className}`}
      style={{
        background: 'linear-gradient(135deg, #DBF2FC 0%, #CDEBFA 100%)',
        ...style,
      }}
    >
      {/* 3D WebGL Canvas Mount */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Swiss Architectural HUD Overlays */}
      {/* Top Left: Technical Scale & Projection Pill */}
      <div
        className="absolute top-4 left-4 pointer-events-none flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(7, 45, 89, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(219, 242, 252, 0.28)',
          color: '#DBF2FC',
          fontSize: '11px',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
        }}
      >
        <span className="w-2 h-2 rounded-full bg-[#FD6E8E] animate-pulse" />
        <span>LIVE 3D VIEWPORT</span>
        <span style={{ color: 'rgba(219, 242, 252, 0.5)' }}>•</span>
        <span>1:500 AXO</span>
      </div>

      {/* Top Right: Engine Version & Studio Tag */}
      <div
        className="absolute top-4 right-4 pointer-events-none hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full"
        style={{
          background: 'rgba(219, 242, 252, 0.82)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(7, 45, 89, 0.16)',
          color: '#072D59',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span>ARSCITY STUDIO</span>
        <span style={{ color: '#FD6E8E' }}>v4.0</span>
      </div>

      {/* Bottom Left: Live Telemetry Rotation & Scale Info */}
      <div
        className="absolute bottom-4 left-4 pointer-events-none flex flex-col gap-0.5"
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          color: '#072D59',
          textShadow: '0 1px 2px rgba(219, 242, 252, 0.8)',
        }}
      >
        <div className="font-bold tracking-wider">TROPICAL MODULAR ARCHETYPE</div>
        <div style={{ color: 'rgba(7, 45, 89, 0.72)' }}>
          AZIMUTH: {String(azimuthDeg).padStart(3, '0')}° • ELEV: +18.5m • GRID: 2.0m
        </div>
      </div>

      {/* Bottom Right: Interactive Drag Cue */}
      <div
        className="absolute bottom-4 right-4 pointer-events-none px-2.5 py-1 rounded-md text-[10px] font-bold"
        style={{
          background: isDragging ? '#FD6E8E' : 'rgba(7, 45, 89, 0.85)',
          color: isDragging ? '#072D59' : '#DBF2FC',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease',
        }}
      >
        {isDragging ? 'ROTASI AKTIF' : 'DRAG UNTUK ROTASI 3D'}
      </div>

      {/* Four Precision Crosshairs in the Corners */}
      <div className="absolute top-2 left-2 text-[#072D59] opacity-30 text-[10px] select-none pointer-events-none font-mono">+</div>
      <div className="absolute top-2 right-2 text-[#072D59] opacity-30 text-[10px] select-none pointer-events-none font-mono">+</div>
      <div className="absolute bottom-2 left-2 text-[#072D59] opacity-30 text-[10px] select-none pointer-events-none font-mono">+</div>
      <div className="absolute bottom-2 right-2 text-[#072D59] opacity-30 text-[10px] select-none pointer-events-none font-mono">+</div>
    </div>
  );
};

export default InteractiveDioramaCanvas;

