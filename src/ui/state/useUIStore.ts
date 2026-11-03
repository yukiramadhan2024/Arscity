import { create } from 'zustand';
import { Engine } from '../../core/engine/Engine';
import { WeatherType } from '../../world/WeatherSystem';
import { SolarSeason, getSolarSeasonDayOfYear } from '../../core/math/SolarPosition';
import type { SavedMapMeta } from '../../io/IndexedDBStorage';
import type { DslrLensType } from '../../core/engine/CinematicDroneController';

export type MainToolType = 'select' | 'road' | 'zone' | 'build' | 'nature' | 'analyze' | 'view' | 'terraform' | 'demolish';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type GlassStyle = 'clear' | 'tinted';
export type { GraphicsQuality } from '../../core/engine/GraphicsPresets';
import type { GraphicsQuality } from '../../core/engine/GraphicsPresets';
export type ViewMode = 'perspective' | 'topdown' | 'inspect';
export type AppScreen = 'auth' | 'login' | 'hub' | 'game';
export type CameraMode = 'orbit' | 'first_person' | 'cinematic_drone' | 'drone' | '2d' | 'fps';
export type ModalId =
  | 'glossary'
  | 'styles'
  | 'missions'
  | 'tutorial'
  | 'saveLoad'
  | 'settings'
  | 'customBuildingStudio'
  | 'loadTest'
  | 'realWorldExport'
  | 'quiz'
  | 'help';

interface UIState {
  engine: Engine | null;
  setEngine: (engine: Engine | null) => void;

  activeTool: MainToolType;
  setActiveTool: (tool: MainToolType) => void;

  timeOfDay: number; // 0.0 to 24.0
  setTimeOfDay: (hour: number) => void;

  dayOfYear: number;
  setDayOfYear: (day: number) => void;
  solarSeason: SolarSeason;
  setSolarSeason: (season: SolarSeason) => void;

  weather: WeatherType;
  setWeather: (weather: WeatherType) => void;

  gridSnap: number | boolean; // 1, 5, 10 or boolean toggle
  setGridSnap: (step: number | boolean) => void;

  gridVisible: boolean;
  toggleGridVisible: () => void;

  isTopDown: boolean;
  toggleTopDown: () => void;

  isInspectMode: boolean;
  toggleInspectMode: () => void;

  // Camera Modes: Orbit (God-View), First-Person Walkthrough, Cinematic Drone Tour
  cameraMode: CameraMode;
  setCameraMode: (mode: CameraMode) => void;
  active2DFloorIndex: number;
  set2DFloorIndex: (index: number) => void;
  isDroneTour: boolean;
  toggleDroneTour: () => void;

  // Video Recording & DSLR Photo Mode
  isRecordingVideo: boolean;
  recordingSeconds: number;
  startVideoRecording: () => void;
  stopVideoRecording: () => void;
  dslrLens: DslrLensType;
  setDslrLens: (lens: DslrLensType) => void;
  captureDslrPhoto: () => void;

  fps: number;
  setFps: (fps: number) => void;
  showFps: boolean;
  setShowFps: (show: boolean) => void;
  toggleShowFps: () => void;
  showLODOverlay: boolean;
  setShowLODOverlay: (show: boolean) => void;
  toggleShowLODOverlay: () => void;
  lodZoneCounts: {
    zone0: number;
    zone1: number;
    zone2: number;
    totalBuildings: number;
    totalLandscape?: number;
  };
  setLodZoneCounts: (counts: {
    zone0: number;
    zone1: number;
    zone2: number;
    totalBuildings: number;
    totalLandscape?: number;
  }) => void;
  showLotOverlays: boolean;
  setShowLotOverlays: (show: boolean) => void;
  toggleShowLotOverlays: () => void;
  adaptiveGlass: 'normal' | 'low';

  canUndo: boolean;
  canRedo: boolean;
  setHistoryState: (canUndo: boolean, canRedo: boolean) => void;

  // City statistics
  stats: {
    buildingCount: number;
    roadLengthKm: number;
    builtAreaM2: number;
    greenRatioPercent: number;
  };
  setStats: (stats: Partial<UIState['stats']>) => void;

  // iOS 27 Liquid Glass Settings
  themeMode: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setThemeMode: (mode: ThemeMode) => void;

  glassStyle: GlassStyle;
  setGlassStyle: (style: GlassStyle) => void;

  glassOpacity: number; // 0.35 - 0.95, default 0.60
  setGlassOpacity: (val: number) => void;

  textScale: number; // 0.9 - 1.3, default 1.0
  setTextScale: (val: number) => void;

  reduceMotion: boolean;
  setReduceMotion: (val: boolean) => void;

  cameraBobbing: boolean;
  setCameraBobbing: (val: boolean) => void;

  highContrast: boolean;
  setHighContrast: (val: boolean) => void;

  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;

  inspectorVisible: boolean;
  setInspectorVisible: (val: boolean) => void;

  isSideDockExpanded: boolean;
  setIsSideDockExpanded: (val: boolean) => void;

  // Centralized Modal Management (Single Modal Rule)
  activeModal: ModalId | null;
  openModal: (id: ModalId) => void;
  closeModal: () => void;
  showHelp: boolean;
  setShowHelp: (val: boolean) => void;

  // Education modals
  showGlossary: boolean;
  setShowGlossary: (val: boolean) => void;
  showStyles: boolean;
  setShowStyles: (val: boolean) => void;
  /** @deprecated Deprecated in v4.0: missions feature removed; retained for unit test backward compatibility */
  showMissions: boolean;
  /** @deprecated Deprecated in v4.0: missions feature removed; retained for unit test backward compatibility */
  setShowMissions: (val: boolean) => void;
  showTutorial: boolean;
  setShowTutorial: (val: boolean) => void;

  // Polish modals & modes
  showSaveLoad: boolean;
  setShowSaveLoad: (val: boolean) => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  isPhotoMode: boolean;
  setIsPhotoMode: (val: boolean) => void;
  graphicsQuality: GraphicsQuality;
  setGraphicsQuality: (val: GraphicsQuality) => void;
  soundEnabled: boolean;
  toggleSound: () => void;

  // Mousepad sensitivity (0.2x to 3.0x, default 1.0x)
  mousepadSensitivity: number;
  setMousepadSensitivity: (val: number) => void;

  // Custom building designer studio modal
  isCustomBuildingModalOpen: boolean;
  setCustomBuildingModalOpen: (val: boolean) => void;
  showCustomBuildingStudio: boolean;
  setShowCustomBuildingStudio: (val: boolean) => void;

  // Active Terrain Mode
  activeTerrainMode: 'raise' | 'lower' | 'flatten' | 'river';
  setActiveTerrainMode: (mode: 'raise' | 'lower' | 'flatten' | 'river') => void;

  // Milestone T3 Load Test Modal
  showLoadTest: boolean;
  setShowLoadTest: (val: boolean) => void;

  // Milestone T6: Real-World CAD/3D Exporter & Underlay modal
  showRealWorldExport: boolean;
  setShowRealWorldExport: (val: boolean) => void;

  // Milestone T6: Walk Mode (1.6m eye level)
  isWalkMode: boolean;
  toggleWalkMode: () => void;

  // Milestone T7: Architectural Pre/Post Quiz
  /** @deprecated Deprecated in v4.0: quiz feature removed; retained for unit test backward compatibility */
  showQuiz: boolean;
  /** @deprecated Deprecated in v4.0: quiz feature removed; retained for unit test backward compatibility */
  setShowQuiz: (val: boolean) => void;

  // Authentication & Screen Navigation
  isLoggedIn: boolean;
  userEmail: string | null;
  currentScreen: AppScreen;
  setCurrentScreen: (screen: AppScreen) => void;
  login: (email: string) => void;
  loginAsGuest: () => void;
  logout: () => void;

  // World Hub & Map Loading Pipeline
  isMapHubOpen: boolean;
  isLoadingMap: boolean;
  loadingMapMessage: string;
  activeMapId: string;
  activeMapName: string;
  savedMapsList: SavedMapMeta[];
  openMapHub: () => void;
  closeMapHub: () => void;
  startGame: () => void;
  setLoadingMap: (loading: boolean, message?: string) => void;
  setActiveMap: (id: string, name: string) => void;
  setSavedMapsList: (list: SavedMapMeta[]) => void;
  refreshSavedMaps: () => Promise<void>;
  loadMap: (mapType: 'empty' | 'malioboro' | 'saved', mapId?: string, mapName?: string) => Promise<boolean>;
}

const STORAGE_KEY_SETTINGS = 'arscity_ios27_settings';
const STORAGE_KEY_ONBOARDING = 'arscity_ios27_onboarded';
const STORAGE_KEY_AUTH = 'arscity_auth_session';

const loadSavedAuth = () => {
  try {
    // Purge legacy persisted auth from localStorage so browser refresh won't bypass login
    localStorage.removeItem(STORAGE_KEY_AUTH);
    const raw = sessionStorage.getItem(STORAGE_KEY_AUTH);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && data.isLoggedIn) {
        return { isLoggedIn: true, userEmail: data.userEmail || 'Pengguna Arscity' };
      }
    }
  } catch {}
  return { isLoggedIn: false, userEmail: null };
};

const savedAuth = typeof window !== 'undefined' ? loadSavedAuth() : { isLoggedIn: false, userEmail: null };

const loadSavedSettings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SETTINGS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore storage read errors
  }
  return {};
};

const savedSettings = loadSavedSettings();
const initialThemeMode: ThemeMode = (savedSettings.themeMode === 'light' || savedSettings.themeMode === 'dark' || savedSettings.themeMode === 'auto') ? savedSettings.themeMode : 'light';
const initialGlassStyle: GlassStyle = savedSettings.glassStyle || 'clear';
const initialGlassOpacity: number = typeof savedSettings.glassOpacity === 'number' ? savedSettings.glassOpacity : 0.60;
const initialTextScale: number = typeof savedSettings.textScale === 'number' ? savedSettings.textScale : 1.0;
const initialReduceMotion: boolean = !!savedSettings.reduceMotion;
const initialCameraBobbing: boolean = savedSettings.cameraBobbing !== false;
const initialHighContrast: boolean = !!savedSettings.highContrast;
const initialMousepadSensitivity: number = typeof savedSettings.mousepadSensitivity === 'number' ? savedSettings.mousepadSensitivity : 1.0;
const initialGraphicsQuality: GraphicsQuality = savedSettings.graphicsQuality || 'ultra';
const hasOnboarded = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ONBOARDING) === 'true' : true;

const applyThemeTokensToDOM = (
  theme: 'light' | 'dark',
  glassStyle: GlassStyle,
  opacity: number,
  quality: GraphicsQuality,
  textScale: number,
  reduceMotion: boolean,
  highContrast: boolean
) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-glass', glassStyle);
  root.setAttribute('data-contrast', highContrast ? 'high' : 'normal');
  root.setAttribute('data-reduced-motion', reduceMotion ? 'true' : 'false');
  root.style.setProperty('--glass-opacity', opacity.toFixed(2));
  const blurValue = quality === 'low' ? '0px' : quality === 'ultra' ? '24px' : quality === 'high' ? '16px' : '12px';
  root.style.setProperty('--glass-blur', blurValue);
  root.style.setProperty('--font-scale', '1.0');
};

let lowFpsStartTime: number | null = null;

export const useUIStore = create<UIState>((set, get) => {
  const calculateResolvedTheme = (mode: ThemeMode, hour: number): 'light' | 'dark' => {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const initialHour = 16.25; // 16:15 WIB Golden Hour Default
  const initialResolved = calculateResolvedTheme(initialThemeMode, initialHour);

  // Sync with OS theme changes when themeMode === 'auto'
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      const state = get();
      if (state.themeMode === 'auto') {
        const resolved = mq.matches ? 'dark' : 'light';
        set({ resolvedTheme: resolved });
        applyThemeTokensToDOM(
          resolved,
          state.glassStyle,
          state.glassOpacity,
          state.graphicsQuality,
          state.textScale,
          state.reduceMotion,
          state.highContrast
        );
      }
    });
  }

  // Apply initial settings immediately to document
  applyThemeTokensToDOM(
    initialResolved,
    initialGlassStyle,
    initialGlassOpacity,
    initialGraphicsQuality,
    initialTextScale,
    initialReduceMotion,
    initialHighContrast
  );

  const saveSettings = () => {
    try {
      const state = get();
      localStorage.setItem(
        STORAGE_KEY_SETTINGS,
        JSON.stringify({
          themeMode: state.themeMode,
          glassStyle: state.glassStyle,
          glassOpacity: state.glassOpacity,
          textScale: state.textScale,
          reduceMotion: state.reduceMotion,
          cameraBobbing: state.cameraBobbing,
          highContrast: state.highContrast,
          graphicsQuality: state.graphicsQuality,
          mousepadSensitivity: state.mousepadSensitivity
        })
      );
    } catch (e) {
      // Ignore storage write errors
    }
  };

  return {
    engine: null,
    setEngine: (engine) => {
      set({ engine });
      if (engine) {
        engine.setGraphicsQuality(get().graphicsQuality);
        engine.onCameraModeChanged = (mode) => {
          set({
            cameraMode: mode,
            isWalkMode: mode === 'first_person',
            isDroneTour: mode === 'cinematic_drone'
          });
        };
        engine.cinematicDroneController.onRecordingStateChanged = (isRecording, seconds) => {
          set({ isRecordingVideo: isRecording, recordingSeconds: seconds });
        };
        engine.onLODZoneCountsChanged = (counts) => {
          if (get().showLODOverlay) {
            set({ lodZoneCounts: counts });
          }
        };
      }
    },

    activeTool: 'select',
    setActiveTool: (activeTool) => {
      set({ activeTool });
      const engine = get().engine;
      if (engine) {
        engine.setActiveTool(activeTool);
        if (activeTool === 'terraform') {
          const mode = get().activeTerrainMode || 'river';
          if (engine.terraformTool) engine.terraformTool.setMode(mode);
          if (engine.terrainTool) engine.terrainTool.setMode(mode);
        }
      }
    },

    timeOfDay: initialHour,
    setTimeOfDay: (timeOfDay) => {
      const currentMode = get().themeMode;
      const nextResolved = calculateResolvedTheme(currentMode, timeOfDay);
      if (nextResolved !== get().resolvedTheme) {
        set({ resolvedTheme: nextResolved });
        applyThemeTokensToDOM(
          nextResolved,
          get().glassStyle,
          get().glassOpacity,
          get().graphicsQuality,
          get().textScale,
          get().reduceMotion,
          get().highContrast
        );
      }
      set({ timeOfDay });
      get().engine?.setTimeOfDay(timeOfDay, get().dayOfYear);
    },

    dayOfYear: 172,
    setDayOfYear: (dayOfYear) => {
      set({ dayOfYear });
      get().engine?.setTimeOfDay(get().timeOfDay, dayOfYear);
    },

    solarSeason: 'solstice_jun' as SolarSeason,
    setSolarSeason: (solarSeason: SolarSeason) => {
      const day = getSolarSeasonDayOfYear(solarSeason);
      set({ solarSeason, dayOfYear: day });
      get().engine?.setTimeOfDay(get().timeOfDay, day);
    },

    weather: 'clear',
    setWeather: (weather) => {
      set({ weather });
      get().engine?.setWeather(weather);
    },

    gridSnap: 1,
    setGridSnap: (gridSnap) => {
      set({ gridSnap });
      if (typeof gridSnap === 'number') {
        get().engine?.setGridSnap(gridSnap);
      }
    },

    gridVisible: true,
    toggleGridVisible: () => {
      const next = !get().gridVisible;
      set({ gridVisible: next });
      get().engine?.toggleGrid(next);
    },

    isTopDown: false,
    toggleTopDown: () => {
      const engine = get().engine;
      if (engine) {
        engine.cameraController.toggleTopDown();
        set({ isTopDown: engine.cameraController.isOrthographic });
      }
    },

    isInspectMode: false,
    toggleInspectMode: () => {
      const engine = get().engine;
      if (engine) {
        engine.cameraController.isInspectMode = !engine.cameraController.isInspectMode;
        set({ isInspectMode: engine.cameraController.isInspectMode });
      }
    },

    cameraMode: 'orbit',
    active2DFloorIndex: 0,
    set2DFloorIndex: (index: number) => {
      const engine = get().engine;
      if (engine && typeof engine.set2DFloor === 'function') {
        engine.set2DFloor(index);
      }
      set({ active2DFloorIndex: index });
    },
    setCameraMode: (mode) => {
      const engine = get().engine;
      if (engine) {
        if (mode === '2d') {
          if (!engine.is2DPlanMode) {
            engine.setCameraMode('2d');
          }
        } else {
          if (engine.is2DPlanMode) {
            engine.set2DPlanMode(false);
          }
          const engineMode = mode === 'drone' ? 'cinematic_drone' : (mode === 'fps' ? 'first_person' : mode);
          engine.setCameraMode(engineMode);
        }
      }
      set({
        cameraMode: mode,
        isTopDown: mode === '2d',
        isWalkMode: mode === 'first_person' || mode === 'fps',
        isDroneTour: mode === 'cinematic_drone' || mode === 'drone'
      });
    },

    isWalkMode: false,
    toggleWalkMode: () => {
      const current = get().cameraMode;
      const nextMode = current === 'first_person' ? 'orbit' : 'first_person';
      get().setCameraMode(nextMode);
    },

    isDroneTour: false,
    toggleDroneTour: () => {
      const current = get().cameraMode;
      const nextMode = current === 'cinematic_drone' ? 'orbit' : 'cinematic_drone';
      get().setCameraMode(nextMode);
    },

    isRecordingVideo: false,
    recordingSeconds: 0,
    startVideoRecording: () => {
      const engine = get().engine;
      if (engine) {
        const ok = engine.cinematicDroneController.startVideoRecording();
        if (ok) {
          set({ isRecordingVideo: true, recordingSeconds: 0 });
        }
      }
    },
    stopVideoRecording: () => {
      const engine = get().engine;
      if (engine) {
        engine.cinematicDroneController.stopVideoRecording();
      }
      set({ isRecordingVideo: false });
    },

    isPhotoMode: false,
    setIsPhotoMode: (isPhotoMode) => set({ isPhotoMode }),

    dslrLens: '50mm',
    setDslrLens: (dslrLens) => {
      set({ dslrLens });
      const engine = get().engine;
      if (engine) {
        engine.cinematicDroneController.setDslrLens(dslrLens);
      }
    },

    captureDslrPhoto: () => {
      const engine = get().engine;
      if (engine) {
        engine.cinematicDroneController.capturePhoto(get().activeMapName || 'Arscity');
      }
    },

    fps: 60,
    adaptiveGlass: 'normal',
    setFps: (fps) => {
      const state = get();
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      let nextAdaptive = state.adaptiveGlass;

      if (fps < 48) {
        if (!lowFpsStartTime || now < lowFpsStartTime) {
          lowFpsStartTime = now;
        } else if (now - lowFpsStartTime >= 3000 && state.adaptiveGlass !== 'low') {
          nextAdaptive = 'low';
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-adaptive-glass', 'low');
          }
        }
      } else if (fps >= 54) {
        lowFpsStartTime = null;
        if (state.adaptiveGlass !== 'normal') {
          nextAdaptive = 'normal';
          if (typeof document !== 'undefined') {
            document.documentElement.setAttribute('data-adaptive-glass', 'normal');
          }
        }
      }

      set({ fps, adaptiveGlass: nextAdaptive });
    },

    showFps: true,
    setShowFps: (showFps) => set({ showFps }),
    toggleShowFps: () => set((s) => ({ showFps: !s.showFps })),

    showLODOverlay: false,
    setShowLODOverlay: (showLODOverlay) => {
      set({ showLODOverlay });
      if (showLODOverlay) {
        const counts = get().engine?.getLODZoneCounts?.();
        if (counts) set({ lodZoneCounts: counts });
      }
    },
    toggleShowLODOverlay: () => {
      const next = !get().showLODOverlay;
      set({ showLODOverlay: next });
      if (next) {
        const counts = get().engine?.getLODZoneCounts?.();
        if (counts) set({ lodZoneCounts: counts });
      }
    },
    lodZoneCounts: { zone0: 0, zone1: 0, zone2: 0, totalBuildings: 0, totalLandscape: 0 },
    setLodZoneCounts: (lodZoneCounts) => set({ lodZoneCounts }),

    showLotOverlays: false,
    setShowLotOverlays: (showLotOverlays) => set({ showLotOverlays }),
    toggleShowLotOverlays: () => set((s) => ({ showLotOverlays: !s.showLotOverlays })),

    canUndo: false,
    canRedo: false,
    setHistoryState: (canUndo, canRedo) => set({ canUndo, canRedo }),

    stats: {
      buildingCount: 0,
      roadLengthKm: 0,
      builtAreaM2: 0,
      greenRatioPercent: 100
    },
    setStats: (newStats) =>
      set((state) => ({ stats: { ...state.stats, ...newStats } })),

    // iOS 27 Liquid Glass Settings
    themeMode: initialThemeMode,
    resolvedTheme: initialResolved,
    setThemeMode: (themeMode) => {
      const resolved = calculateResolvedTheme(themeMode, get().timeOfDay);
      set({ themeMode, resolvedTheme: resolved });
      applyThemeTokensToDOM(
        resolved,
        get().glassStyle,
        get().glassOpacity,
        get().graphicsQuality,
        get().textScale,
        get().reduceMotion,
        get().highContrast
      );
      saveSettings();
    },

    glassStyle: initialGlassStyle,
    setGlassStyle: (glassStyle) => {
      set({ glassStyle });
      applyThemeTokensToDOM(
        get().resolvedTheme,
        glassStyle,
        get().glassOpacity,
        get().graphicsQuality,
        get().textScale,
        get().reduceMotion,
        get().highContrast
      );
      saveSettings();
    },

    glassOpacity: initialGlassOpacity,
    setGlassOpacity: (glassOpacity) => {
      const clamped = Math.max(0.35, Math.min(0.95, glassOpacity));
      set({ glassOpacity: clamped });
      applyThemeTokensToDOM(
        get().resolvedTheme,
        get().glassStyle,
        clamped,
        get().graphicsQuality,
        get().textScale,
        get().reduceMotion,
        get().highContrast
      );
      saveSettings();
    },

    textScale: initialTextScale,
    setTextScale: (textScale) => {
      const clamped = Math.max(0.9, Math.min(1.3, textScale));
      set({ textScale: clamped });
      applyThemeTokensToDOM(
        get().resolvedTheme,
        get().glassStyle,
        get().glassOpacity,
        get().graphicsQuality,
        clamped,
        get().reduceMotion,
        get().highContrast
      );
      saveSettings();
    },

    reduceMotion: initialReduceMotion,
    setReduceMotion: (reduceMotion) => {
      set({ reduceMotion });
      applyThemeTokensToDOM(
        get().resolvedTheme,
        get().glassStyle,
        get().glassOpacity,
        get().graphicsQuality,
        get().textScale,
        reduceMotion,
        get().highContrast
      );
      saveSettings();
    },

    cameraBobbing: initialCameraBobbing,
    setCameraBobbing: (cameraBobbing) => {
      set({ cameraBobbing });
      saveSettings();
    },

    highContrast: initialHighContrast,
    setHighContrast: (highContrast) => {
      set({ highContrast });
      applyThemeTokensToDOM(
        get().resolvedTheme,
        get().glassStyle,
        get().glassOpacity,
        get().graphicsQuality,
        get().textScale,
        get().reduceMotion,
        highContrast
      );
      saveSettings();
    },

    showOnboarding: !hasOnboarded,
    setShowOnboarding: (showOnboarding) => {
      set({ showOnboarding });
      if (!showOnboarding) {
        try {
          localStorage.setItem(STORAGE_KEY_ONBOARDING, 'true');
        } catch (e) {
          // Ignore
        }
      }
    },

    inspectorVisible: true,
    setInspectorVisible: (inspectorVisible) => set({ inspectorVisible }),

    isSideDockExpanded: false,
    setIsSideDockExpanded: (isSideDockExpanded) => set({ isSideDockExpanded }),

    // Centralized Modal Management (Single Modal Rule)
    activeModal: null,
    openModal: (id) => {
      set({
        activeModal: id,
        showGlossary: id === 'glossary',
        showStyles: id === 'styles',
        showMissions: id === 'missions',
        showTutorial: id === 'tutorial',
        showSaveLoad: id === 'saveLoad',
        showSettings: id === 'settings',
        showCustomBuildingStudio: id === 'customBuildingStudio',
        isCustomBuildingModalOpen: id === 'customBuildingStudio',
        showLoadTest: id === 'loadTest',
        showRealWorldExport: id === 'realWorldExport',
        showQuiz: id === 'quiz',
        showHelp: id === 'help',
      });
    },
    closeModal: () => {
      set({
        activeModal: null,
        showGlossary: false,
        showStyles: false,
        showMissions: false,
        showTutorial: false,
        showSaveLoad: false,
        showSettings: false,
        showCustomBuildingStudio: false,
        isCustomBuildingModalOpen: false,
        showLoadTest: false,
        showRealWorldExport: false,
        showQuiz: false,
        showHelp: false,
      });
    },

    showHelp: false,
    setShowHelp: (val) => {
      if (val) get().openModal('help');
      else if (get().activeModal === 'help') get().closeModal();
      else set({ showHelp: false });
    },

    showGlossary: false,
    setShowGlossary: (val) => {
      if (val) get().openModal('glossary');
      else if (get().activeModal === 'glossary') get().closeModal();
      else set({ showGlossary: false });
    },

    showStyles: false,
    setShowStyles: (val) => {
      if (val) get().openModal('styles');
      else if (get().activeModal === 'styles') get().closeModal();
      else set({ showStyles: false });
    },

    showMissions: false,
    setShowMissions: (val) => {
      if (val) get().openModal('missions');
      else if (get().activeModal === 'missions') get().closeModal();
      else set({ showMissions: false });
    },

    showTutorial: false,
    setShowTutorial: (val) => {
      if (val) get().openModal('tutorial');
      else if (get().activeModal === 'tutorial') get().closeModal();
      else set({ showTutorial: false });
    },

    showSaveLoad: false,
    setShowSaveLoad: (val) => {
      if (val) get().openModal('saveLoad');
      else if (get().activeModal === 'saveLoad') get().closeModal();
      else set({ showSaveLoad: false });
    },

    showSettings: false,
    setShowSettings: (val) => {
      if (val) get().openModal('settings');
      else if (get().activeModal === 'settings') get().closeModal();
      else set({ showSettings: false });
    },

    isCustomBuildingModalOpen: false,
    setCustomBuildingModalOpen: (val) => {
      if (val) get().openModal('customBuildingStudio');
      else if (get().activeModal === 'customBuildingStudio') get().closeModal();
      else set({ isCustomBuildingModalOpen: false, showCustomBuildingStudio: false });
    },

    showCustomBuildingStudio: false,
    setShowCustomBuildingStudio: (val) => {
      get().setCustomBuildingModalOpen(val);
    },

    activeTerrainMode: 'river',
    setActiveTerrainMode: (mode) => {
      set({ activeTerrainMode: mode });
      const engine = get().engine;
      if (engine) {
        if (engine.terraformTool) engine.terraformTool.setMode(mode);
        if ((engine as any).terrainTool) (engine as any).terrainTool.setMode(mode);
      }
    },

    showLoadTest: false,
    setShowLoadTest: (val) => {
      if (val) get().openModal('loadTest');
      else if (get().activeModal === 'loadTest') get().closeModal();
      else set({ showLoadTest: false });
    },

    showRealWorldExport: false,
    setShowRealWorldExport: (val) => {
      if (val) get().openModal('realWorldExport');
      else if (get().activeModal === 'realWorldExport') get().closeModal();
      else set({ showRealWorldExport: false });
    },

    showQuiz: false,
    setShowQuiz: (val) => {
      if (val) get().openModal('quiz');
      else if (get().activeModal === 'quiz') get().closeModal();
      else set({ showQuiz: false });
    },

    graphicsQuality: initialGraphicsQuality,
    setGraphicsQuality: (graphicsQuality) => {
      set({ graphicsQuality });
      get().engine?.setGraphicsQuality(graphicsQuality);
      saveSettings();
      applyThemeTokensToDOM(
        get().resolvedTheme,
        get().glassStyle,
        get().glassOpacity,
        graphicsQuality,
        get().textScale,
        get().reduceMotion,
        get().highContrast
      );
    },

    soundEnabled: true,
    toggleSound: () => {
      const next = !get().soundEnabled;
      set({ soundEnabled: next });
    },

    mousepadSensitivity: initialMousepadSensitivity,
    setMousepadSensitivity: (mousepadSensitivity) => {
      set({ mousepadSensitivity });
      if (get().engine) {
        get().engine!.cameraController.mousepadSensitivity = mousepadSensitivity;
      }
      saveSettings();
    },

    // Authentication & Screen Navigation
    isLoggedIn: savedAuth.isLoggedIn,
    userEmail: savedAuth.userEmail,
    currentScreen: savedAuth.isLoggedIn ? 'hub' : 'auth',
    setCurrentScreen: (currentScreen: AppScreen) => set({ currentScreen }),
    login: (email: string) => {
      try {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ isLoggedIn: true, userEmail: email }));
      } catch {}
      set({ isLoggedIn: true, userEmail: email, currentScreen: 'hub', isMapHubOpen: true });
      get().refreshSavedMaps();
    },
    loginAsGuest: () => {
      const guestEmail = 'Tamu Demo Arscity';
      try {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify({ isLoggedIn: true, userEmail: guestEmail }));
      } catch {}
      set({ isLoggedIn: true, userEmail: guestEmail, currentScreen: 'hub', isMapHubOpen: true });
      get().refreshSavedMaps();
    },
    logout: () => {
      try {
        localStorage.removeItem(STORAGE_KEY_AUTH);
        sessionStorage.removeItem(STORAGE_KEY_AUTH);
      } catch {}
      set({ isLoggedIn: false, userEmail: null, currentScreen: 'auth', isMapHubOpen: false });
    },

    // World Hub & Map Loading Pipeline
    isMapHubOpen: true,
    isLoadingMap: false,
    loadingMapMessage: 'Menyiapkan geometri jalan & bangunan...',
    activeMapId: 'empty_map',
    activeMapName: 'Map Kosong Baru',
    savedMapsList: [],
    openMapHub: () => {
      set({ currentScreen: 'hub', isMapHubOpen: true });
      get().refreshSavedMaps();
    },
    closeMapHub: () => {
      set({ currentScreen: 'game', isMapHubOpen: false });
    },
    startGame: () => {
      set({ currentScreen: 'game', isMapHubOpen: false });
    },
    setLoadingMap: (isLoadingMap: boolean, loadingMapMessage: string = 'Menyiapkan geometri jalan & bangunan...') => {
      set({ isLoadingMap, loadingMapMessage });
    },
    setActiveMap: (activeMapId: string, activeMapName: string) => {
      set({ activeMapId, activeMapName });
    },
    setSavedMapsList: (savedMapsList: SavedMapMeta[]) => {
      set({ savedMapsList });
    },
    refreshSavedMaps: async () => {
      try {
        const { IndexedDBStorage } = await import('../../io/IndexedDBStorage');
        const list = await IndexedDBStorage.listSavedMaps();
        set({ savedMapsList: list });
      } catch (err) {
        console.warn('[useUIStore] Failed to refresh saved maps list:', err);
      }
    },
    loadMap: async (mapType: 'empty' | 'malioboro' | 'saved', mapId?: string, mapName?: string): Promise<boolean> => {
      const store = get();
      store.setLoadingMap(
        true,
        mapType === 'malioboro'
          ? 'Menyiapkan koridor Malioboro & arsitektur Joglo...'
          : mapType === 'empty'
          ? 'Mengosongkan lahan & menyiapkan grid 3D...'
          : 'Memuat data peta tersimpan...'
      );
      try {
        let success = false;
        if (store.engine) {
          success = await store.engine.loadMap(mapType, mapId);
        }
        const resolvedName =
          mapName ||
          (mapType === 'malioboro'
            ? 'Koridor Malioboro Yogyakarta'
            : mapType === 'empty'
            ? 'Map Kosong Baru'
            : 'Peta Tersimpan');
        const resolvedId =
          mapId ||
          (mapType === 'malioboro'
            ? 'malioboro_preset'
            : mapType === 'empty'
            ? 'empty_map'
            : 'saved_map');

        set({
          activeMapId: resolvedId,
          activeMapName: resolvedName,
          currentScreen: 'game',
          isMapHubOpen: false,
        });

        // Delay 400ms for smooth glass transition animation
        await new Promise((r) => setTimeout(r, 400));
        set({ isLoadingMap: false });
        return success;
      } catch (err) {
        console.error('[useUIStore] loadMap failed:', err);
        set({ isLoadingMap: false });
        return false;
      }
    }
  };
});

if (typeof window !== 'undefined' && window.matchMedia) {
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const handleMediaChange = () => {
    const state = useUIStore.getState();
    if (state.themeMode === 'auto') {
      const resolved = mq.matches ? 'dark' : 'light';
      if (resolved !== state.resolvedTheme) {
        state.setThemeMode('auto');
      }
    }
  };
  if (mq.addEventListener) {
    mq.addEventListener('change', handleMediaChange);
  } else if ((mq as any).addListener) {
    (mq as any).addListener(handleMediaChange);
  }
}

