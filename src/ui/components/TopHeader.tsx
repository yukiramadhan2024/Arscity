import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../state/useUIStore';
import {
  Sun,
  Cloud,
  CloudRain,
  MoreHorizontal,
  X,
  Grid,
  RotateCcw,
  Compass,
  Sparkles,
  Check,
  Footprints,
  User,
  Video,
  Settings
} from 'lucide-react';
import { WeatherType } from '../../world/WeatherSystem';
import { SolarSeason, SOLAR_SEASONS } from '../../core/math/SolarPosition';
import { SPRING_TACTILE, SPRING_SHEET } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { showSnackbar } from '../state/useSnackbarStore';

const MAGNETIC_ANCHORS = [
  { hour: 7.0, label: '07:00 WIB (Pagi)' },
  { hour: 12.0, label: '12:00 WIB (Tengah Hari)' },
  { hour: 16.25, label: '16:15 WIB (Sore Emas)' },
  { hour: 19.0, label: '19:00 WIB (Malam)' },
];

const FpsDisplay: React.FC = React.memo(() => {
  const fps = useUIStore((s) => s.fps);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        background: 'rgba(16, 185, 129, 0.12)',
        border: '1px solid rgba(16, 185, 129, 0.28)',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '9999px',
          background: '#10B981',
          boxShadow: '0 0 8px rgba(16, 185, 129, 0.6)',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: '12px',
          fontWeight: 600,
          color: 'var(--label)',
          whiteSpace: 'nowrap',
          lineHeight: 1
        }}
      >
        {fps || 60} FPS
      </span>
    </div>
  );
});

const LodTelemetryDisplay: React.FC = React.memo(() => {
  const counts = useUIStore((s) => s.lodZoneCounts);
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '9999px',
        background: 'rgba(59, 130, 246, 0.12)',
        border: '1px solid rgba(59, 130, 246, 0.28)',
        whiteSpace: 'nowrap',
        flexShrink: 0
      }}
      title={`LOD 3-Zona: Z0 (<24m): ${counts.zone0} | Z1 (27-65m): ${counts.zone1} | Z2 (>65m): ${counts.zone2} (Total: ${counts.totalBuildings})`}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '9999px',
          background: '#3B82F6',
          boxShadow: '0 0 8px rgba(59, 130, 246, 0.6)',
          display: 'inline-block',
          flexShrink: 0
        }}
      />
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: '11px',
          fontWeight: 600,
          color: 'var(--label)',
          whiteSpace: 'nowrap',
          lineHeight: 1
        }}
      >
        LOD Z0:{counts.zone0} Z1:{counts.zone1} Z2:{counts.zone2}
      </span>
    </div>
  );
});

export const TopHeader: React.FC = React.memo(() => {
  const timeOfDay = useUIStore((s) => s.timeOfDay);
  const setTimeOfDay = useUIStore((s) => s.setTimeOfDay);
  const weather = useUIStore((s) => s.weather);
  const setWeather = useUIStore((s) => s.setWeather);
  const solarSeason = useUIStore((s) => s.solarSeason);
  const setSolarSeason = useUIStore((s) => s.setSolarSeason);
  const gridSnap = useUIStore((s) => s.gridSnap);
  const setGridSnap = useUIStore((s) => s.setGridSnap);
  const gridVisible = useUIStore((s) => s.gridVisible);
  const toggleGridVisible = useUIStore((s) => s.toggleGridVisible);
  const isTopDown = useUIStore((s) => s.isTopDown);
  const toggleTopDown = useUIStore((s) => s.toggleTopDown);
  const engine = useUIStore((s) => s.engine);
  // Deprecated in v4.0: setShowMissions removed
  const setShowTutorial = useUIStore((s) => s.setShowTutorial);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const setCameraMode = useUIStore((s) => s.setCameraMode);
  const active2DFloorIndex = useUIStore((s) => s.active2DFloorIndex);
  const set2DFloorIndex = useUIStore((s) => s.set2DFloorIndex);
  const showFps = useUIStore((s) => s.showFps);
  const showLODOverlay = useUIStore((s) => s.showLODOverlay);
  const setShowSettings = useUIStore((s) => s.setShowSettings);

  const [showUtilityMenu, setShowUtilityMenu] = useState<boolean>(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState<boolean>(false);
  const [weatherMenuLeft, setWeatherMenuLeft] = useState<number>(175);
  const headerRef = useRef<HTMLElement | null>(null);
  const weatherButtonRef = useRef<HTMLButtonElement | null>(null);
  const [isNarrowScreen, setIsNarrowScreen] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth < 1440);

  const syncWeatherPopoverPosition = () => {
    if (headerRef.current && weatherButtonRef.current) {
      const hRect = headerRef.current.getBoundingClientRect();
      const bRect = weatherButtonRef.current.getBoundingClientRect();
      setWeatherMenuLeft(Math.max(40, (bRect.left - hRect.left) + (bRect.width / 2)));
    }
  };

  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 1440);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const lastHourRef = useRef<number>(Math.floor(timeOfDay));
  const lastSnappedRef = useRef<number | null>(null);

  const handleTimeSliderChange = (rawVal: number) => {
    let finalVal = rawVal;
    let isSnapped = false;
    const SNAP_RADIUS = 0.16; // ~10 minutes snap catchment

    for (const anchor of MAGNETIC_ANCHORS) {
      if (Math.abs(rawVal - anchor.hour) <= SNAP_RADIUS) {
        finalVal = anchor.hour;
        isSnapped = true;
        if (lastSnappedRef.current !== anchor.hour) {
          proceduralAudio.playTaptic('selection');
          lastSnappedRef.current = anchor.hour;
        }
        break;
      }
    }

    if (!isSnapped) {
      lastSnappedRef.current = null;
      // Bunyikan detak selection halus saat slider waktu melewati jam bulat (tiap 1 jam)
      const currentIntHour = Math.floor(rawVal);
      if (currentIntHour !== lastHourRef.current) {
        proceduralAudio.playTaptic('selection');
        lastHourRef.current = currentIntHour;
      }
    }

    setTimeOfDay(finalVal);
    engine?.sunPathVisualizer?.setVisible(true);
  };

  const formatTime = (h: number): string => {
    const hours = Math.floor(h);
    const mins = Math.floor((h - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} WIB`;
  };

  const weatherOptions: Array<{ id: WeatherType; label: string; icon: React.ElementType }> = [
    { id: 'clear', label: 'Cerah', icon: Sun },
    { id: 'overcast', label: 'Berawan', icon: Cloud },
    { id: 'rain', label: 'Hujan', icon: CloudRain }
  ];

  const currentWeather = weatherOptions.find((w) => w.id === weather) || weatherOptions[0];
  const WeatherIcon = currentWeather.icon;

  const handleWeatherChange = (newWeather: WeatherType) => {
    setWeather(newWeather);
    const labels: Record<WeatherType, { title: string; detail: string }> = {
      clear: { title: 'Cuaca Cerah', detail: 'Simulasi Termal Optimum' },
      overcast: { title: 'Cuaca Berawan', detail: 'Cahaya Difusi Lembut' },
      rain: { title: 'Cuaca Hujan', detail: 'Pendinginan Alami Aktif' },
      fog: { title: 'Cuaca Berkabut', detail: 'Jarak Pandang Terbatas' }
    };
    const info = labels[newWeather] || { title: 'Cuaca Diperbarui', detail: newWeather };
    showSnackbar({
      variant: 'info',
      title: info.title,
      detail: info.detail,
      groupKey: 'weather_status'
    });
  };

  const cycleWeather = () => {
    const next: Record<WeatherType, WeatherType> = {
      clear: 'overcast',
      overcast: 'rain',
      rain: 'clear',
      fog: 'clear'
    };
    handleWeatherChange(next[weather] || 'clear');
  };

  const handleCameraModeChange = (mode: '2d' | 'orbit' | 'first_person' | 'cinematic_drone', label: string) => {
    setCameraMode(mode);
    const details: Record<string, string> = {
      '2d': 'Denah ortografis 90 derajat masterplan kota',
      orbit: 'Putar dengan Drag Kanan • Zoom Roll',
      first_person: 'Gunakan WASD untuk berjalan',
      cinematic_drone: 'Navigasi halus ketinggian dinamis'
    };
    showSnackbar({
      variant: 'info',
      title: `Mode ${label} Aktif`,
      detail: details[mode],
      groupKey: 'camera_mode_status'
    });
  };

  return (
    <>
      {/* Kapsul Kaca Navy Terpusat — Outer wrapper 100% transparan, single capsule overflow hidden */}
      <header
        ref={headerRef}
        className="top-header interactive"
        style={{
          position: 'fixed',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'max-content',
          maxWidth: 'calc(100vw - 32px)',
          zIndex: 50,
          pointerEvents: 'auto',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none'
        }}
      >
        <div
          className="top-header-capsule arscity-navy-panel"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 18px',
            borderRadius: '9999px',
            overflow: 'hidden',
            backgroundClip: 'padding-box',
            userSelect: 'none'
          }}
        >
          {/* Bagian Kiri: Jam Matahari & Slider Waktu dengan Magnetic Snap & Low Touch Latency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sun size={16} strokeWidth={2.2} style={{ color: '#F59E0B', flexShrink: 0 }} />
            <span
              className="font-mono tabular-nums"
              style={{
                fontSize: '12px',
                color: 'var(--label)',
                fontWeight: 600,
                minWidth: '70px',
                letterSpacing: '-0.01em'
              }}
            >
              {formatTime(timeOfDay)}
            </span>
            {!isNarrowScreen && (
            <input
              type="range"
              min="5.0"
              max="20.0"
              step="0.05"
              value={timeOfDay}
              onChange={(e) => handleTimeSliderChange(parseFloat(e.target.value))}
              onPointerDown={() => {
                proceduralAudio.playTaptic('light');
                engine?.setUIInteractionActive(true);
                engine?.sunPathVisualizer?.setVisible(true);
              }}
              onPointerUp={() => {
                engine?.setUIInteractionActive(false);
                setTimeout(() => {
                  engine?.sunPathVisualizer?.setVisible(false);
                }, 2000);
              }}
              aria-label="Pengatur Waktu Matahari"
              style={{
                width: '100px',
                height: '4px',
                borderRadius: '9999px',
                accentColor: 'var(--accent)',
                background: 'var(--fill-control)',
                cursor: 'pointer',
                margin: 0
              }}
            />
            )}
          </div>

          {/* Bagian Tengah: Tombol Cuaca Interaktif Langsung (Cerah, Berawan, Hujan) */}
          <div style={{ position: 'relative' }}>
            <motion.button
              ref={weatherButtonRef}
              onClick={() => {
                syncWeatherPopoverPosition();
                setShowWeatherMenu(!showWeatherMenu);
                cycleWeather();
              }}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: showWeatherMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: '1px solid var(--border)',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: 'var(--label)',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
              }}
              title="Klik untuk mengganti cuaca (Cerah, Berawan, Hujan)"
              aria-label={`Cuaca: ${currentWeather.label}`}
            >
              <WeatherIcon size={15} strokeWidth={2} style={{ color: 'currentColor' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--label)', whiteSpace: 'nowrap' }}>
                {currentWeather.label}
              </span>
            </motion.button>
          </div>

          {/* Mode Kamera: Orbit / Pejalan Kaki / Drone View dengan Apple Spring Pill */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: 'var(--fill-control)',
              borderRadius: '9999px',
              padding: '2px',
              gap: '2px',
              border: '1px solid var(--border)'
            }}
          >
            {[
              { id: '2d' as const, label: '2D Denah', icon: Grid },
              { id: 'orbit' as const, label: '3D Orbit', icon: Compass },
              { id: 'first_person' as const, label: 'Pejalan Kaki', icon: Footprints },
              { id: 'cinematic_drone' as const, label: 'Drone', icon: Video }
            ].map((m) => {
              const IconComp = m.icon;
              const isActive = cameraMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  onClick={() => handleCameraModeChange(m.id, m.label)}
                  onPointerDown={() => proceduralAudio.playTaptic('selection')}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: 'transparent',
                    color: isActive ? '#FFFFFF' : 'var(--label)',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '11px',
                    border: 'none',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    zIndex: 1
                  }}
                  title={`Aktifkan mode kamera ${m.label}`}
                  aria-label={m.label}
                >
                  {isActive && (
                    <motion.div
                      layoutId="top-header-camera-pill"
                      layout="position"
                      transition={SPRING_TACTILE}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '9999px',
                        background: '#FD6E8E',
                        border: '1.5px solid #072D59',
                        boxShadow: '2px 2px 0px #072D59',
                        zIndex: -1
                      }}
                    />
                  )}
                  <IconComp size={15} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? '#072D59' : 'var(--label-secondary)' }} />
                  <span style={{ color: isActive ? '#072D59' : 'inherit', fontWeight: isActive ? 800 : 500 }}>{m.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* T5.6: Pemilih Lantai Denah 2D Bertingkat (Lt. 1, Lt. 2, Lt. 3, Lt. 4) */}
          {cameraMode === '2d' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: 'var(--fill-control)',
                borderRadius: '9999px',
                padding: '2px 4px',
                border: '1px solid var(--border)'
              }}
            >
              {[1, 2, 3, 4].map((fl) => {
                const isSelected = active2DFloorIndex === fl - 1;
                return (
                  <motion.button
                    key={fl}
                    onClick={() => {
                      set2DFloorIndex(fl - 1);
                      proceduralAudio.playTaptic('selection');
                    }}
                    whileTap={{ scale: 0.95 }}
                    whileHover={{ scale: 1.02 }}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '9999px',
                      background: isSelected ? 'var(--accent)' : 'transparent',
                      color: isSelected ? 'var(--on-accent)' : 'var(--label)',
                      boxShadow: isSelected ? 'var(--shadow-accent)' : 'none',
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      border: 'none',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    title={`Potongan horizontal lantai ${fl} (+${((fl - 1) * 3.6 + 2.2).toFixed(1).replace('.', ',')} m)`}
                    aria-label={`Lantai ${fl}`}
                  >
                    Lt. {fl}
                  </motion.button>
                );
              })}
            </div>
          )}

          {/* Bagian Kanan: Status FPS & Tombol Menu Kontrol Cepat */}
          <div
            className="whitespace-nowrap"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {showFps && <FpsDisplay />}
            {showLODOverlay && <LodTelemetryDisplay />}

            {/* Tombol Pengaturan Cepat */}
            <motion.button
              onClick={() => setShowSettings(true)}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: 'var(--fill-control)',
                border: '1px solid var(--border)',
                color: 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              title="Buka Pengaturan Kota"
              aria-label="Pengaturan Cepat"
            >
              <Settings size={14} style={{ color: 'currentColor' }} />
            </motion.button>

            {/* Menu Popover Trigger Button */}
            <motion.button
              onClick={() => setShowUtilityMenu(!showUtilityMenu)}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.04 }}
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: showUtilityMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: '1px solid var(--border)',
                color: showUtilityMenu ? 'var(--accent)' : 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              title="Kontrol Cepat Viewport & Grid"
              aria-label="Kontrol Cepat"
            >
              <MoreHorizontal size={14} style={{ color: 'currentColor' }} />
            </motion.button>
          </div>
        </div>

        {/* Quick 3-Choice Weather Popover (Rendered outside capsule so overflow:hidden never clips) */}
        <AnimatePresence>
          {showWeatherMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={SPRING_SHEET}
              style={{
                position: 'absolute',
                top: '48px',
                left: `${weatherMenuLeft}px`,
                transform: 'translateX(-50%)',
                transformOrigin: 'top center',
                background: 'var(--surface-raised)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-popover)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                zIndex: 'var(--z-hud-popover)' as any
              }}
            >
              <div style={{ display: 'flex', gap: '4px' }}>
                {weatherOptions.map((opt) => {
                  const OptIcon = opt.icon;
                  const isSel = weather === opt.id;
                  return (
                    <motion.button
                      key={opt.id}
                      onClick={() => {
                        handleWeatherChange(opt.id);
                        setShowWeatherMenu(false);
                      }}
                      onPointerDown={() => proceduralAudio.playTaptic('selection')}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.02 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 10px',
                        borderRadius: '9999px',
                        background: isSel ? 'var(--accent)' : 'var(--fill-control)',
                        border: isSel ? '1px solid var(--accent)' : '1px solid var(--separator)',
                        boxShadow: isSel ? 'var(--shadow-accent)' : 'none',
                        color: isSel ? 'var(--on-accent)' : 'var(--label)',
                        fontSize: '11px',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <OptIcon size={13} style={{ color: isSel ? 'var(--on-accent)' : 'currentColor' }} />
                      <span>{opt.label}</span>
                    </motion.button>
                  );
                })}
              </div>

              <div style={{ marginTop: '8px', paddingTop: '2px' }}>
                <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--label-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                  Musim Surya & Deklinasi
                </div>
                <div style={{ display: 'flex', gap: '3px', background: 'var(--fill-control)', border: 'none', padding: '2px', borderRadius: '8px' }}>
                  {(['equinox_mar', 'solstice_jun', 'solstice_dec'] as SolarSeason[]).map((s) => {
                    const info = SOLAR_SEASONS[s];
                    const isSel = solarSeason === s;
                    return (
                      <motion.button
                        key={s}
                        onClick={() => {
                          setSolarSeason(s);
                          setShowWeatherMenu(false);
                        }}
                        onPointerDown={() => proceduralAudio.playTaptic('selection')}
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.02 }}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '5px',
                          background: isSel ? 'var(--accent)' : 'transparent',
                          border: 'none',
                          color: isSel ? '#FFFFFF' : 'var(--label)',
                          fontSize: '10px',
                          fontWeight: isSel ? 700 : 500,
                          fontFamily: 'var(--font-mono)',
                          cursor: 'pointer',
                          textAlign: 'center',
                          whiteSpace: 'nowrap'
                        }}
                        title={info.description}
                      >
                        {info.shortLabel}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Menu Popover "Kontrol Cepat" dengan Apple Sheet Spring */}
        <AnimatePresence>
          {showUtilityMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={SPRING_SHEET}
              style={{
                position: 'absolute',
                top: '48px',
                right: '0',
                width: '270px',
                transformOrigin: 'top right',
                background: 'var(--surface)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid var(--border-glass)',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-glass)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 'var(--z-hud-popover)' as any
              }}
            >
              {/* Header Popover */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Kontrol Cepat
                </span>
                <button
                  onClick={() => setShowUtilityMenu(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--label-secondary)', cursor: 'pointer', padding: 0 }}
                  aria-label="Tutup Kontrol Cepat"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Slider Waktu (khusus saat layar sempit / collapsed) */}
              {isNarrowScreen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingBottom: '4px', borderBottom: '1px solid var(--separator)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'var(--label)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sun size={13} style={{ color: '#F59E0B' }} />
                      Waktu Matahari:
                    </span>
                    <span className="font-mono tabular-nums" style={{ fontSize: '11px', color: 'var(--label)', fontWeight: 600 }}>
                      {formatTime(timeOfDay)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5.0"
                    max="20.0"
                    step="0.05"
                    value={timeOfDay}
                    onChange={(e) => handleTimeSliderChange(parseFloat(e.target.value))}
                    onPointerDown={() => {
                      proceduralAudio.playTaptic('light');
                      engine?.setUIInteractionActive(true);
                      engine?.sunPathVisualizer?.setVisible(true);
                    }}
                    onPointerUp={() => {
                      engine?.setUIInteractionActive(false);
                      setTimeout(() => {
                        engine?.sunPathVisualizer?.setVisible(false);
                      }, 2000);
                    }}
                    aria-label="Pengatur Waktu Matahari Popover"
                    style={{
                      width: '100%',
                      height: '4px',
                      borderRadius: '9999px',
                      accentColor: 'var(--accent)',
                      background: 'var(--fill-control)',
                      cursor: 'pointer',
                      margin: 0
                    }}
                  />
                </div>
              )}

              {/* Kontrol Grid Spasial */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: 'var(--label)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Grid size={13} style={{ color: 'var(--accent)' }} />
                    Snap Grid:
                  </span>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    {[1, 5, 10].map((step) => {
                      const isSel = gridSnap === step;
                      return (
                        <button
                          key={step}
                          onClick={() => setGridSnap(step)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '12px',
                            background: isSel ? 'var(--accent-subtle)' : 'var(--fill-control)',
                            border: 'none',
                            color: isSel ? 'var(--accent)' : 'var(--label)',
                            fontSize: '11px',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                          }}
                        >
                          {step}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Toggle Garis Grid */}
                <button
                  onClick={toggleGridVisible}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '12px',
                    background: 'var(--fill-control)',
                    border: 'none',
                    color: 'var(--label)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                  }}
                >
                  <span>Tampilkan Garis Grid</span>
                  <span style={{ color: gridVisible ? 'var(--accent)' : 'var(--label-tertiary)', fontWeight: 700 }}>
                    {gridVisible ? 'Aktif' : 'Mati'}
                  </span>
                </button>
              </div>

              {/* Kontrol Sudut Pandang Kamera */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={toggleTopDown}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      background: isTopDown ? 'var(--accent-subtle)' : 'var(--fill-control)',
                      border: 'none',
                      color: isTopDown ? 'var(--accent)' : 'var(--label)',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                    }}
                    title="Ganti Sudut Pandang 2D Tegak Lurus / 3D Isometrik"
                  >
                    <Compass size={13} style={{ color: 'var(--accent)' }} />
                    <span>{isTopDown ? 'Mode 2D' : 'Mode 3D'}</span>
                  </button>

                  <button
                    onClick={() => {
                      engine?.cameraController.resetCamera();
                      setShowUtilityMenu(false);
                    }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '12px',
                      background: 'var(--fill-control)',
                      border: 'none',
                      color: 'var(--label)',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)'
                    }}
                    title="Reset Posisi Kamera ke Pusat Kota"
                  >
                    <RotateCcw size={13} style={{ color: 'var(--icon)' }} />
                    <span>Reset Kamera</span>
                  </button>
                </div>
              </div>

              {/* Tutorial Kota */}
              <div>
                <button
                  onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    background: 'var(--fill-control)',
                    border: 'none',
                    color: 'var(--label)',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
                    width: '100%'
                  }}
                >
                  <Sparkles size={13} style={{ color: 'var(--accent)' }} />
                  <span>Tutorial</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
});
