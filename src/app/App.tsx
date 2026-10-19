import React, { useEffect, useRef, useState } from 'react';
import { Engine } from '../core/engine/Engine';
import { useUIStore } from '../ui/state/useUIStore';
import { TopHeader } from '../ui/components/TopHeader';
import { BottomToolbar } from '../ui/components/BottomToolbar';
import { RoadSubToolbar } from '../ui/components/RoadSubToolbar';
import { BuildingCatalogBar } from '../ui/components/BuildingCatalogBar';
import { ZoneSubToolbar } from '../ui/components/ZoneSubToolbar';
import { LandscapeSubToolbar } from '../ui/components/LandscapeSubToolbar';
import { AnalysisOverlay } from '../ui/components/AnalysisOverlay';
import { InspectorPanel } from '../ui/components/InspectorPanel';
import { Minimap } from '../ui/components/Minimap';
import { GlossaryModal } from '../ui/components/GlossaryModal';
import { StyleLibraryModal } from '../ui/components/StyleLibraryModal';
import { MissionModal } from '../ui/components/MissionModal';
import { TutorialOverlay } from '../ui/components/TutorialOverlay';
import { SaveLoadModal } from '../ui/components/SaveLoadModal';
import { SettingsModal } from '../ui/components/SettingsModal';
import { CustomBuildingCreatorModal } from '../ui/components/CustomBuildingCreatorModal';
import { OnboardingModal } from '../ui/components/OnboardingModal';
import { PhotoModeOverlay } from '../ui/components/PhotoModeOverlay';
import { SideUtilityDock } from '../ui/components/SideUtilityDock';
import { LoadTestModal } from '../ui/components/LoadTestModal';
import { RealWorldExportModal } from '../ui/components/RealWorldExportModal';
import { ArchitectureQuizModal } from '../education/ArchitectureQuizModal';
import { LoginPage } from '../ui/components/LoginPage';
import { WorldHubModal } from '../ui/components/WorldHubModal';
import { SpatialCursorTooltip } from '../ui/components/SpatialCursorTooltip';
import { FirstPersonHUD } from '../ui/components/FirstPersonHUD';
import { HelpCircle, X, Keyboard, Compass } from 'lucide-react';

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
    setShowQuiz
  } = useUIStore();
  const [showHelp, setShowHelp] = useState<boolean>(false);
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
        setShowHelp((prev) => !prev);
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

          {!isPhotoMode && (
            <div className="ui-overlay">
              <TopHeader />
              <SpatialCursorTooltip />

              {/* In God-View / Orbit mode, render construction toolbars and minimap */}
              {cameraMode === 'orbit' && (
                <>
                  {/* Side Utility Dock (Save/Load, Photo Mode, Settings, Help) */}
                  <SideUtilityDock onOpenHelp={() => setShowHelp(true)} />

                  {/* 2D Minimap Radar */}
                  <Minimap />

                  {/* Analysis Lab Overlay (Dedicated Left Laboratory) */}
                  <AnalysisOverlay />

                  {/* Property Inspector Panel */}
                  <InspectorPanel />

                  {/* Bottom Toolbar Dock */}
                  <BottomToolbar />
                </>
              )}
            </div>
          )}

          {/* Help Modal */}
          {showHelp && (
            <div className="modal-overlay interactive" role="dialog" aria-modal="true">
              <div
                className="modal-sheet"
                style={{
                  width: '520px',
                  maxWidth: '92vw',
                  maxHeight: '85vh'
                }}
              >
                <div className="modal-sheet-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Keyboard size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                        Pintasan Keyboard
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                        Navigasi kamera dan alat rancang cepat
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setShowHelp(false)} className="icon-btn" aria-label="Tutup Bantuan">
                    <X size={16} strokeWidth={1.75} />
                  </button>
                </div>

                <div className="modal-sheet-body">
                  <div className="inset-header">NAVIGASI KAMERA</div>
                  <div className="inset-group">
                    <div className="inset-row">
                      <span style={{ fontSize: '13px', color: 'var(--label)' }}>Geser Kamera (Pan)</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                        WASD / Klik Tengah
                      </span>
                    </div>
                    <div className="inset-row">
                      <span style={{ fontSize: '13px', color: 'var(--label)' }}>Jarak Pandang (Zoom)</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                        Scroll Mouse
                      </span>
                    </div>
                    <div className="inset-row">
                      <span style={{ fontSize: '13px', color: 'var(--label)' }}>Rotasi Sudut (Orbit)</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                        Klik Kanan Drag / Q & E
                      </span>
                    </div>
                    <div className="inset-row">
                      <span style={{ fontSize: '13px', color: 'var(--label)' }}>Kemiringan Sudut (Tilt)</span>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
                        Shift + Drag Kanan
                      </span>
                    </div>
                  </div>

                  <div className="inset-header">TIPS ARSITEKTUR TROPIS</div>
                  <div className="inset-group">
                    <div className="inset-row" style={{ background: 'var(--fill-control)' }}>
                      <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label)' }}>
                        Gunakan pengatur waktu di pojok kanan atas untuk melihat pergerakan bayangan matahari dari lintang Yogyakarta (-7.8° LS). Fasad yang menghadap Barat dan Timur menerima panas tertinggi.
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button
                      onClick={() => setShowHelp(false)}
                      className="ios-btn ios-btn-primary"
                      style={{ padding: '8px 22px', fontSize: '13px' }}
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
