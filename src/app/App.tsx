import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../core/engine/Engine';
import { useUIStore } from '../ui/state/useUIStore';
import { HudLayout } from '../ui/components/HudLayout';
import { HelpModal } from '../ui/components/HelpModal';
import { GlossaryModal } from '../ui/components/GlossaryModal';
import { StyleLibraryModal } from '../ui/components/StyleLibraryModal';
import { MissionModal } from '../ui/components/MissionModal';
import { TutorialOverlay } from '../ui/components/TutorialOverlay';
import { SaveLoadModal } from '../ui/components/SaveLoadModal';
import { SettingsModal } from '../ui/components/SettingsModal';
import { CustomBuildingCreatorModal } from '../ui/components/CustomBuildingCreatorModal';
import { OnboardingModal } from '../ui/components/OnboardingModal';
import { PhotoModeOverlay } from '../ui/components/PhotoModeOverlay';
import { LoadTestModal } from '../ui/components/LoadTestModal';
import { RealWorldExportModal } from '../ui/components/RealWorldExportModal';
import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';
import { LoginPage } from '../ui/components/LoginPage';
import { WorldHubModal } from '../ui/components/WorldHubModal';
import { FirstPersonHUD } from '../ui/components/FirstPersonHUD';

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
    showMissions,
    setShowMissions,
    showTutorial,
    setShowTutorial,
    showSaveLoad,
    setShowSaveLoad,
    showSettings,
    setShowSettings,
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
    showQuiz,
    setShowQuiz,
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
      } else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShowHelp(!useUIStore.getState().showHelp);
      } else if (e.key === 'Escape') {
        setShowHelp(false);
        setIsPhotoMode(false);
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

          {!isPhotoMode && cameraMode === 'orbit' && (
            <HudLayout onOpenHelp={() => setShowHelp(true)} />
          )}

          {/* Dedicated Help Modal */}
          <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

          {/* Onboarding Liquid Glass Modal */}
          <OnboardingModal />

          {/* Architectural Education Modals */}
          <GlossaryModal isOpen={showGlossary} onClose={() => setShowGlossary(false)} />
          <StyleLibraryModal isOpen={showStyles} onClose={() => setShowStyles(false)} />
          <MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} />
          <TutorialOverlay isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

          {/* Polish Modals & Photo Mode */}
          <PhotoModeOverlay />
          <SaveLoadModal isOpen={showSaveLoad} onClose={() => setShowSaveLoad(false)} />
          <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
          <CustomBuildingCreatorModal
            isOpen={showCustomBuildingStudio}
            onClose={() => setShowCustomBuildingStudio(false)}
          />
          <LoadTestModal isOpen={showLoadTest} onClose={() => setShowLoadTest(false)} />
          <RealWorldExportModal
            isOpen={showRealWorldExport}
            onClose={() => setShowRealWorldExport(false)}
          />
          <ArchitectureQuizModal
            isOpen={showQuiz}
            onClose={() => setShowQuiz(false)}
          />

          {/* Mode Jalan Kaki (Walk Mode 1.6m) Floating HUD */}
          {isWalkMode && (
            <aside
              className="glass-surface interactive"
              style={{
                position: 'absolute',
                bottom: '88px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 18px',
                borderRadius: 'var(--radius-capsule)',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                zIndex: 60,
                border: '1px solid var(--accent)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
              }}
              aria-label="Status Mode Jalan Kaki"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--good, #34c759)',
                    boxShadow: '0 0 8px var(--good, #34c759)'
                  }}
                />
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                  Mode Jalan Kaki 1.6m
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
                Gunakan WASD untuk melangkah, geser mouse untuk melihat arah
              </span>
              <button
                onClick={toggleWalkMode}
                className="ios-btn ios-btn-primary"
                style={{ padding: '4px 14px', fontSize: '11px' }}
              >
                Keluar ke God-Eye
              </button>
            </aside>
          )}
        </>
      )}
    </div>
  );
};
