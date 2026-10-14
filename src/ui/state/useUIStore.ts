import { create } from 'zustand';
import { Engine } from '../../core/engine/Engine';
import { WeatherType } from '../../world/WeatherSystem';

export type MainToolType = 'select' | 'road' | 'zone' | 'build' | 'nature' | 'analyze' | 'view';
export type ThemeMode = 'auto' | 'light' | 'dark';
export type GlassStyle = 'clear' | 'tinted';
export type GraphicsQuality = 'low' | 'medium' | 'high';
export type ViewMode = 'perspective' | 'topdown' | 'inspect';

interface UIState {
  engine: Engine | null;
  setEngine: (engine: Engine | null) => void;

  activeTool: MainToolType;
  setActiveTool: (tool: MainToolType) => void;

  timeOfDay: number; // 0.0 to 24.0
  setTimeOfDay: (hour: number) => void;

  dayOfYear: number;
  setDayOfYear: (day: number) => void;

  weather: WeatherType;
  setWeather: (weather: WeatherType) => void;

  gridSnap: number; // 1, 5, 10
  setGridSnap: (step: number) => void;

  gridVisible: boolean;
  toggleGridVisible: () => void;

  isTopDown: boolean;
  toggleTopDown: () => void;

  isInspectMode: boolean;
  toggleInspectMode: () => void;

  fps: number;
  setFps: (fps: number) => void;

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

  highContrast: boolean;
  setHighContrast: (val: boolean) => void;

  showOnboarding: boolean;
  setShowOnboarding: (val: boolean) => void;

  inspectorVisible: boolean;
  setInspectorVisible: (val: boolean) => void;

  // Education modals
  showGlossary: boolean;
  setShowGlossary: (val: boolean) => void;
  showStyles: boolean;
  setShowStyles: (val: boolean) => void;
  showMissions: boolean;
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
  showCustomBuildingStudio: boolean;
  setShowCustomBuildingStudio: (val: boolean) => void;

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
  showQuiz: boolean;
  setShowQuiz: (val: boolean) => void;
}

const STORAGE_KEY_SETTINGS = 'arscity_ios27_settings';
const STORAGE_KEY_ONBOARDING = 'arscity_ios27_onboarded';

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
const initialThemeMode: ThemeMode = savedSettings.themeMode || 'auto';
const initialGlassStyle: GlassStyle = savedSettings.glassStyle || 'clear';
const initialGlassOpacity: number = typeof savedSettings.glassOpacity === 'number' ? savedSettings.glassOpacity : 0.60;
const initialTextScale: number = typeof savedSettings.textScale === 'number' ? savedSettings.textScale : 1.0;
const initialReduceMotion: boolean = !!savedSettings.reduceMotion;
const initialHighContrast: boolean = !!savedSettings.highContrast;
const initialMousepadSensitivity: number = typeof savedSettings.mousepadSensitivity === 'number' ? savedSettings.mousepadSensitivity : 1.0;
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
  root.style.setProperty('--glass-blur', quality === 'low' ? '0px' : quality === 'medium' ? '16px' : '24px');
  root.style.setProperty('--font-scale', textScale.toFixed(2));
};

export const useUIStore = create<UIState>((set, get) => {
  const calculateResolvedTheme = (mode: ThemeMode, hour: number): 'light' | 'dark' => {
    if (mode === 'light') return 'light';
    if (mode === 'dark') return 'dark';
    // Auto: daytime in Indonesia (06:00 to 18:00 WIB) is light, night is dark
    return hour >= 6.0 && hour < 18.0 ? 'light' : 'dark';
  };

  const initialHour = 10.0;
  const initialResolved = calculateResolvedTheme(initialThemeMode, initialHour);

  // Apply initial settings immediately to document
  applyThemeTokensToDOM(
    initialResolved,
    initialGlassStyle,
    initialGlassOpacity,
    'medium',
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
          highContrast: state.highContrast
        })
      );
    } catch (e) {
      // Ignore storage write errors
    }
  };

  return {
    engine: null,
    setEngine: (engine) => set({ engine }),

    activeTool: 'select',
    setActiveTool: (activeTool) => {
      set({ activeTool });
      get().engine?.setActiveTool(activeTool);
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

    weather: 'clear',
    setWeather: (weather) => {
      set({ weather });
      get().engine?.setWeather(weather);
    },

    gridSnap: 1,
    setGridSnap: (gridSnap) => {
      set({ gridSnap });
      get().engine?.setGridSnap(gridSnap);
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

    fps: 60,
    setFps: (fps) => set({ fps }),

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

    // Education modals
    showGlossary: false,
    setShowGlossary: (showGlossary) => set({ showGlossary }),

    showStyles: false,
    setShowStyles: (showStyles) => set({ showStyles }),

    showMissions: false,
    setShowMissions: (showMissions) => set({ showMissions }),

    showTutorial: false,
    setShowTutorial: (showTutorial) => set({ showTutorial }),

    // Polish modals & modes
    showSaveLoad: false,
    setShowSaveLoad: (showSaveLoad) => set({ showSaveLoad }),

    showSettings: false,
    setShowSettings: (showSettings) => set({ showSettings }),

    isPhotoMode: false,
    setIsPhotoMode: (isPhotoMode) => set({ isPhotoMode }),

    graphicsQuality: 'medium',
    setGraphicsQuality: (graphicsQuality) => {
      set({ graphicsQuality });
      get().engine?.setGraphicsQuality(graphicsQuality);
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

    showCustomBuildingStudio: false,
    setShowCustomBuildingStudio: (showCustomBuildingStudio) => set({ showCustomBuildingStudio }),

    showLoadTest: false,
    setShowLoadTest: (showLoadTest) => set({ showLoadTest }),

    showRealWorldExport: false,
    setShowRealWorldExport: (showRealWorldExport) => set({ showRealWorldExport }),

    isWalkMode: false,
    toggleWalkMode: () => {
      const engine = get().engine;
      if (engine) {
        const isWalk = engine.cameraController.toggleWalkMode();
        set({ isWalkMode: isWalk });
      }
    },

    showQuiz: false,
    setShowQuiz: (showQuiz) => set({ showQuiz })
  };
});
