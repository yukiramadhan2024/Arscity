import React, { useState, useRef } from 'react';
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
  Award,
  Sparkles,
  Check,
  Footprints,
  User,
  Video
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
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '12px',
          fontWeight: 600,
          color: '#0F172A',
          whiteSpace: 'nowrap',
          lineHeight: 1
        }}
      >
        {fps || 60} FPS
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
  const setShowMissions = useUIStore((s) => s.setShowMissions);
  const setShowTutorial = useUIStore((s) => s.setShowTutorial);
  const cameraMode = useUIStore((s) => s.cameraMode);
  const setCameraMode = useUIStore((s) => s.setCameraMode);
  const showFps = useUIStore((s) => s.showFps);

  const [showUtilityMenu, setShowUtilityMenu] = useState<boolean>(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState<boolean>(false);

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

  const handleCameraModeChange = (mode: 'orbit' | 'first_person' | 'cinematic_drone', label: string) => {
    setCameraMode(mode);
    const details: Record<string, string> = {
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
      {/* Kapsul Kaca Gelap Terpusat (Unified Dark Slate Glass) */}
      <header
        className="top-header interactive"
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 'var(--z-hud)' as any,
          pointerEvents: 'auto'
        }}
      >
        <div
          className="top-header-capsule arscity-glass-bar"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 18px',
            borderRadius: 'var(--radius-capsule)',
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
                color: '#0F172A',
                fontWeight: 600,
                minWidth: '70px',
                letterSpacing: '-0.01em'
              }}
            >
              {formatTime(timeOfDay)}
            </span>
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
                accentColor: '#007AFF',
                background: '#CBD5E1',
                cursor: 'pointer',
                margin: 0
              }}
            />
          </div>

          {/* Bagian Tengah: Tombol Cuaca Interaktif Langsung (Cerah, Berawan, Hujan) */}
          <div style={{ position: 'relative' }}>
            <motion.button
              onClick={() => {
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
                background: showWeatherMenu ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                border: showWeatherMenu ? '1px solid rgba(0, 122, 255, 0.40)' : '1px solid #CBD5E1',
                borderRadius: 'var(--radius-capsule)',
                cursor: 'pointer',
                color: '#0F172A',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
              }}
              title="Klik untuk mengganti cuaca (Cerah, Berawan, Hujan)"
              aria-label={`Cuaca: ${currentWeather.label}`}
            >
              <WeatherIcon size={15} strokeWidth={2} style={{ color: '#007AFF' }} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap' }}>
                {currentWeather.label}
              </span>
            </motion.button>

            {/* Quick 3-Choice Weather Popover with Apple Spring */}
            <AnimatePresence>
              {showWeatherMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -6 }}
                  transition={SPRING_SHEET}
                  style={{
                    position: 'absolute',
                    top: '36px',
                    left: '50%',
                    transformOrigin: 'top center',
                    background: 'rgba(244, 247, 251, 0.96)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.95)',
                    borderRadius: '16px',
                    boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
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
                            borderRadius: '8px',
                            background: isSel ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                            border: isSel ? '1px solid rgba(0, 122, 255, 0.40)' : '1px solid #CBD5E1',
                            color: isSel ? '#007AFF' : '#334155',
                            fontSize: '11px',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <OptIcon size={13} style={{ color: isSel ? '#007AFF' : '#334155' }} />
                          <span>{opt.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Segmented Control Musim Surya (Mar / Jun / Des) */}
                  <div style={{ borderTop: '1px solid #CBD5E1', marginTop: '4px', paddingTop: '4px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: '#475569', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                      Musim Surya & Deklinasi
                    </div>
                    <div style={{ display: 'flex', gap: '3px', background: '#E2E8F0', border: '1px solid #CBD5E1', padding: '2px', borderRadius: '6px' }}>
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
                              background: isSel ? '#007AFF' : 'transparent',
                              border: 'none',
                              color: isSel ? '#FFFFFF' : '#334155',
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
          </div>

          {/* Mode Kamera: Orbit / Pejalan Kaki / Drone View dengan Apple Spring Pill */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              background: '#E2E8F0',
              borderRadius: '9999px',
              padding: '2px',
              gap: '2px',
              border: '1px solid #CBD5E1'
            }}
          >
            {[
              { id: 'orbit' as const, label: 'Orbit', icon: Compass },
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
                    color: isActive ? '#FFFFFF' : '#1E293B',
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
                        background: '#007AFF',
                        boxShadow: '0 2px 6px rgba(0, 122, 255, 0.35)',
                        zIndex: -1
                      }}
                    />
                  )}
                  <IconComp size={15} strokeWidth={2} style={{ color: isActive ? '#FFFFFF' : '#334155' }} />
                  <span>{m.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Bagian Kanan: Status FPS & Tombol Menu Kontrol Cepat */}
          <div
            className="whitespace-nowrap"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            {showFps && <FpsDisplay />}

            {/* Widget Misi Aktif & Skor Kota Ringkas (A6) */}
            <motion.button
              onClick={() => {
                setShowMissions(true);
                proceduralAudio.playTaptic('selection');
              }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: '#FFFFFF',
                border: '1px solid #CBD5E1',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Buka Misi & Indeks Skor Kota"
            >
              <Award size={13} style={{ color: '#007AFF' }} />
              <span>Misi & Skor</span>
            </motion.button>

            {/* Menu Popover Trigger Button dengan Invisible Touch Padding */}
            <motion.button
              onClick={() => setShowUtilityMenu(!showUtilityMenu)}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.08 }}
              className="hit-slop-8"
              style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: showUtilityMenu ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                border: showUtilityMenu ? '1px solid rgba(0, 122, 255, 0.40)' : '1px solid #CBD5E1',
                color: showUtilityMenu ? '#007AFF' : '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.06)'
              }}
              title="Kontrol Cepat Viewport & Grid"
              aria-label="Kontrol Cepat"
            >
              <MoreHorizontal size={14} />
            </motion.button>
          </div>
        </div>

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
                background: 'rgba(244, 247, 251, 0.96)',
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 'var(--z-hud-popover)' as any
              }}
            >
              {/* Header Popover */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid #CBD5E1' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Kontrol Cepat
                </span>
                <button
                  onClick={() => setShowUtilityMenu(false)}
                  style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: 0 }}
                  aria-label="Tutup Kontrol Cepat"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Kontrol Grid Spasial */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#0F172A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Grid size={13} style={{ color: '#007AFF' }} />
                    Snap Grid:
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1, 5, 10].map((step) => {
                      const isSel = gridSnap === step;
                      return (
                        <button
                          key={step}
                          onClick={() => setGridSnap(step)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: isSel ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                            border: isSel ? '1px solid rgba(0, 122, 255, 0.40)' : '1px solid #CBD5E1',
                            color: isSel ? '#007AFF' : '#0F172A',
                            fontSize: '11px',
                            fontWeight: isSel ? 700 : 500,
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)'
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
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <span>Tampilkan Garis Grid</span>
                  <span style={{ color: gridVisible ? '#007AFF' : '#64748B', fontWeight: 700 }}>
                    {gridVisible ? 'Aktif' : 'Mati'}
                  </span>
                </button>
              </div>

              {/* Kontrol Sudut Pandang Kamera */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid #CBD5E1' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={toggleTopDown}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isTopDown ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                      border: isTopDown ? '1px solid rgba(0, 122, 255, 0.40)' : '1px solid #CBD5E1',
                      color: isTopDown ? '#007AFF' : '#0F172A',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                    }}
                    title="Ganti Sudut Pandang 2D Tegak Lurus / 3D Isometrik"
                  >
                    <Compass size={13} style={{ color: '#007AFF' }} />
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
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      color: '#0F172A',
                      fontSize: '11px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                    }}
                    title="Reset Posisi Kamera ke Pusat Kota"
                  >
                    <RotateCcw size={13} style={{ color: '#334155' }} />
                    <span>Reset Kamera</span>
                  </button>
                </div>
              </div>

              {/* Misi & Tutorial Kota */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '6px', borderTop: '1px solid #CBD5E1' }}>
                <button
                  onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <Award size={13} style={{ color: '#F59E0B' }} />
                  <span>Misi Kota</span>
                </button>
                <button
                  onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    color: '#0F172A',
                    fontSize: '11px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)'
                  }}
                >
                  <Sparkles size={13} style={{ color: '#007AFF' }} />
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
