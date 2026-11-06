import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Engine } from '../core/engine/Engine';
import { useUIStore } from '../ui/state/useUIStore';
import { HudLayout } from '../ui/components/HudLayout';
import { HelpModal } from '../ui/components/HelpModal';
import { GlossaryModal } from '../ui/components/GlossaryModal';
import { StyleLibraryModal } from '../ui/components/StyleLibraryModal';
import { TutorialOverlay } from '../ui/components/TutorialOverlay';
import { SaveLoadModal } from '../ui/components/SaveLoadModal';
import { SettingsModal } from '../ui/components/SettingsModal';
import { CustomBuildingCreatorModal } from '../ui/components/CustomBuildingCreatorModal';
import { OnboardingModal } from '../ui/components/OnboardingModal';
import { PhotoModeOverlay } from '../ui/components/PhotoModeOverlay';
import { LoadTestModal } from '../ui/components/LoadTestModal';
import { RealWorldExportModal } from '../ui/components/RealWorldExportModal';
import { LoginPage } from '../ui/components/LoginPage';
import { WorldHubModal } from '../ui/components/WorldHubModal';
import { FirstPersonHUD } from '../ui/components/FirstPersonHUD';
import { SnackbarHost } from '../ui/components/SnackbarHost';
import { NewMapCustomizerModal } from '../ui/components/NewMapCustomizerModal';

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const {
    isLoggedIn,
    currentScreen,
    isMapHubOpen,
    login,
    loginAsGuest,
    cameraMode,
    setEngine,
    setFps,
    setStats,
    setHistoryState,
    showGlossary,
    setShowGlossary,
    showStyles,
    setShowStyles,
    showTutorial,
    setShowTutorial,
    showSaveLoad,
    setShowSaveLoad,
    showSettings,
    setShowSettings,
    isCustomBuildingModalOpen,
    setCustomBuildingModalOpen,
    showCustomBuildingStudio,
    setShowCustomBuildingStudio,
    showLoadTest,
    setShowLoadTest,
    isPhotoMode,
    setIsPhotoMode,
    showRealWorldExport,
    setShowRealWorldExport,
    isWalkMode,
    toggleWalkMode,
    showHelp,
    setShowHelp,
  } = useUIStore();
  const [, setSelectionTrigger] = useState<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new Engine(containerRef.current);
    engine.onFpsUpdate = (fps) => setFps(fps);
    engine.onRoadStatsChanged = (roadLengthKm) => setStats({ roadLengthKm });
    engine.onBuildingStatsChanged = (buildingCount, builtAreaM2) => setStats({ buildingCount, builtAreaM2 });
    engine.onSelectionChanged = () => setSelectionTrigger((prev) => prev + 1);
    engine.lotManager.onLotsUpdated = () => setSelectionTrigger((prev) => prev + 1);
    engine.onHistoryStateChanged = (canUndo, canRedo) => setHistoryState(canUndo, canRedo);
    engine.cameraController.mousepadSensitivity = useUIStore.getState().mousepadSensitivity;
    engine.start();

    setEngine(engine);
    if (typeof window !== 'undefined') {
      (window as any).__ARSCITY_ENGINE__ = engine;
      (window as any).__ARSCITY_UI_STORE__ = useUIStore;
      (window as any).__ARSCITY_THREE__ = THREE;
      (window as any).THREE = THREE;
    }

    // QA & Visual Benchmarking Automation (?autoload=malioboro&time=16.25&azimuth=45&elevation=35)
    if (typeof window !== 'undefined' && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      const autoMap = params.get('autoload');
      if (autoMap) {
        useUIStore.setState({ isLoggedIn: true, currentScreen: 'game', isMapHubOpen: false });
        engine.loadMap(autoMap as any).then(() => {
          const t = parseFloat(params.get('time') || '16.25');
          engine.setTimeOfDay(t, 172);
          useUIStore.setState({ timeOfDay: t });
          const cam = engine.cameraController;
          const azDeg = parseFloat(params.get('azimuth') || '45');
          const elDeg = parseFloat(params.get('elevation') || '35');
          const dist = parseFloat(params.get('dist') || '85');
          const az = (azDeg * Math.PI) / 180;
          const pol = ((90 - elDeg) * Math.PI) / 180;
          cam.setOrbitView(new THREE.Vector3(0, 0, 0), dist, az, pol, true);
        });
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          engine.redo();
        } else {
          engine.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        engine.redo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        engine.duplicateSelection();
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowHelp(!useUIStore.getState().showHelp);
      } else if (e.key === 'Escape') {
        setShowHelp(false);
        setIsPhotoMode(false);
        if (useUIStore.getState().activeTool !== 'select') {
          useUIStore.getState().setActiveTool('select');
        }
      } else if (!e.ctrlKey && !e.metaKey && !e.altKey && (useUIStore.getState().cameraMode === 'orbit' || useUIStore.getState().cameraMode === '2d')) {
        // Quick Tool Switching Hotkeys (1-8) matching exact visual order of BottomToolbar
        const toolMap: Record<string, import('../ui/state/useUIStore').MainToolType> = {
          '1': 'select',     // 1. Pilih
          '2': 'road',       // 2. Jalan
          '3': 'zone',       // 3. Zona
          '4': 'build',      // 4. Bangun
          '5': 'nature',     // 5. Lansekap
          '6': 'terraform',  // 6. Tanah dan Air
          '7': 'demolish',   // 7. Bongkar
          '8': 'analyze'     // 8. Analisis
        };
        const targetTool = toolMap[e.key];
        if (targetTool) {
          e.preventDefault();
          useUIStore.getState().setActiveTool(targetTool);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      engine.dispose();
      setEngine(null);
    };
  }, [setEngine, setFps, setStats, setHistoryState, setIsPhotoMode]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Layer 1: Content Layer (3D Canvas Viewport Fullscreen) */}
      <div id="canvas-container" ref={containerRef} />

      {/* Gerbang Masuk 1: Glassmorphic Auth / Sign-Up / Login Screen Gateway (Layar 1) */}
      {(!isLoggedIn || currentScreen === 'auth' || currentScreen === 'login') && (
        <LoginPage />
      )}

      {/* Gerbang Masuk 2: World Hub / Map Launcher Screen (Layar 2) */}
      {isLoggedIn && (currentScreen === 'hub' || isMapHubOpen) && (
        <WorldHubModal />
      )}

      {/* Layar 3: In-Game UI Controls & Modals (Hanya saat sesi game aktif) */}
      {isLoggedIn && currentScreen === 'game' && !isMapHubOpen && (
        <>
          <FirstPersonHUD />

          {!isPhotoMode && (cameraMode === 'orbit' || cameraMode === '2d') && (
            <HudLayout onOpenHelp={() => setShowHelp(true)} />
          )}

          {/* Dedicated Help Modal */}
          <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

          {/* Onboarding Liquid Glass Modal */}
          <OnboardingModal />

          {/* Architectural Education Modals */}
          <GlossaryModal isOpen={showGlossary} onClose={() => setShowGlossary(false)} />
          <StyleLibraryModal isOpen={showStyles} onClose={() => setShowStyles(false)} />
          <TutorialOverlay isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

          {/* Polish Modals & Photo Mode */}
          <PhotoModeOverlay />
          <SaveLoadModal isOpen={showSaveLoad} onClose={() => setShowSaveLoad(false)} />
          <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
          <LoadTestModal isOpen={showLoadTest} onClose={() => setShowLoadTest(false)} />
          <RealWorldExportModal
            isOpen={showRealWorldExport}
            onClose={() => setShowRealWorldExport(false)}
          />
        </>
      )}

      {/* Studio Rancang Bangunan (Studio CAD) - Top-Level Fullscreen Layer (z-index: 99999) */}
      {(isCustomBuildingModalOpen || showCustomBuildingStudio) && (
        <CustomBuildingCreatorModal
          isOpen={true}
          onClose={() => {
            setCustomBuildingModalOpen(false);
            setShowCustomBuildingStudio(false);
          }}
        />
      )}

      {/* Modal Kustomisasi Peta Baru (Tahap 2) */}
      <NewMapCustomizerModal />

      {/* Global Apple Dynamic Island Feedback Host */}
      <SnackbarHost />
    </div>
  );
};
