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

const MAGNETIC_ANCHORS = [
  { hour: 7.0, label: '07:00 WIB (Pagi)' },
  { hour: 12.0, label: '12:00 WIB (Tengah Hari)' },
  { hour: 16.25, label: '16:15 WIB (Sore Emas)' },
  { hour: 19.0, label: '19:00 WIB (Malam)' },
];

const FpsDisplay: React.FC = React.memo(() => {
  const fps = useUIStore((s) => s.fps);
  return (
    <span
      className="font-mono tabular-nums font-semibold"
      style={{
        fontSize: '11px',
        color: 'var(--good)',
        letterSpacing: '0.04em'
      }}
    >
      {fps || 60} FPS | ULTRA RTX
    </span>
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

  const cycleWeather = () => {
    const next: Record<WeatherType, WeatherType> = {
      clear: 'overcast',
      overcast: 'rain',
      rain: 'clear',
      fog: 'clear'
    };
    setWeather(next[weather] || 'clear');
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
          className="top-header-capsule"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 18px',
            background: 'var(--surface)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-capsule)',
            boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08), 0 20px 50px rgba(15, 23, 42, 0.16)',
            userSelect: 'none'
          }}
        >
          {/* Bagian Kiri: Jam Matahari & Slider Waktu dengan Magnetic Snap & Low Touch Latency */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sun size={16} strokeWidth={2.2} style={{ color: '#FFB347', flexShrink: 0 }} />
            <span
              className="font-mono tabular-nums font-semibold"
              style={{
                fontSize: '12px',
                color: 'var(--label)',
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
                accentColor: 'var(--accent)',
                background: 'var(--fill-control-active)',
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
                background: showWeatherMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: showWeatherMenu ? '1px solid var(--accent)' : '1px solid var(--hairline-soft)',
                borderRadius: 'var(--radius-capsule)',
                cursor: 'pointer',
                color: 'var(--label)'
              }}
              title="Klik untuk mengganti cuaca (Cerah, Berawan, Hujan)"
              aria-label={`Cuaca: ${currentWeather.label}`}
            >
              <WeatherIcon size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--label)', whiteSpace: 'nowrap' }}>
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
                    background: 'var(--surface-strong)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid var(--hairline)',
                    borderRadius: 'var(--radius-sub)',
                    boxShadow: 'var(--shadow-popover)',
                    padding: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
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
                            setWeather(opt.id);
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
                            background: isSel ? 'var(--accent)' : 'transparent',
                            border: 'none',
                            color: isSel ? '#FFFFFF' : 'var(--label)',
                            fontSize: '11px',
                            fontWeight: isSel ? 600 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          <OptIcon size={13} />
                          <span>{opt.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Segmented Control Musim Surya (Mar / Jun / Des) */}
                  <div style={{ borderTop: '1px solid var(--hairline)', marginTop: '4px', paddingTop: '4px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 600, color: 'var(--label-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em', fontFamily: 'var(--font-mono)' }}>
                      Musim Surya & Deklinasi
                    </div>
                    <div style={{ display: 'flex', gap: '3px', background: 'var(--fill-control)', padding: '2px', borderRadius: '6px' }}>
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
                              fontWeight: isSel ? 600 : 500,
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
              background: 'var(--fill-control)',
              borderRadius: '9999px',
              padding: '2px',
              gap: '2px',
              border: '1px solid var(--hairline-soft)'
            }}
          >
            {[
              { id: 'orbit' as const, label: 'Orbit', icon: Compass },
              { id: 'first_person' as const, label: 'Pejalan Kaki', icon: Footprints },
              { id: 'cinematic_drone' as const, label: 'Drone View', icon: Video }
            ].map((m) => {
              const IconComp = m.icon;
              const isActive = cameraMode === m.id;
              return (
                <motion.button
                  key={m.id}
                  onClick={() => setCameraMode(m.id)}
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
                    color: isActive ? 'var(--label)' : 'var(--label-secondary)',
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
                      layoutId="activeCameraModePill"
                      transition={SPRING_TACTILE}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: '9999px',
                        background: 'var(--surface)',
                        boxShadow: '0 1px 4px rgba(0, 0, 0, 0.14), 0 0 0 1px var(--hairline)',
                        zIndex: -1
                      }}
                    />
                  )}
                  <IconComp size={15} strokeWidth={2} style={{ color: isActive ? 'var(--accent)' : 'inherit' }} />
                  <span>{m.label}</span>
                </motion.button>
              );
            })}
          </div>

          {/* Bagian Kanan: Status FPS & Tombol Menu Kontrol Cepat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FpsDisplay />

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
                background: showUtilityMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: showUtilityMenu ? '1px solid var(--accent)' : '1px solid var(--hairline-soft)',
                color: showUtilityMenu ? 'var(--accent)' : 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
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
                width: '260px',
                transformOrigin: 'top right',
                background: 'var(--surface-strong)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-inset)',
              boxShadow: 'var(--shadow-popover)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 'var(--z-hud-popover)' as any
            }}
          >
            {/* Header Popover */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--separator)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--label-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
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

            {/* Kontrol Grid Spasial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--label)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Grid size={13} style={{ color: 'var(--accent)' }} />
                  Snap Grid:
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[1, 5, 10].map((step) => (
                    <button
                      key={step}
                      onClick={() => setGridSnap(step)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: gridSnap === step ? 'var(--accent)' : 'var(--fill-control)',
                        border: 'none',
                        color: gridSnap === step ? '#FFFFFF' : 'var(--label)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      {step}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle Garis Grid */}
              <button
                onClick={toggleGridVisible}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '8px',
                  background: 'var(--fill-control)',
                  border: 'none',
                  color: 'var(--label)',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <span>Tampilkan Garis Grid</span>
                <span style={{ color: gridVisible ? 'var(--good)' : 'var(--label-secondary)', fontWeight: 600 }}>
                  {gridVisible ? 'Aktif' : 'Mati'}
                </span>
              </button>
            </div>

            {/* Kontrol Sudut Pandang Kamera */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--separator)' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={toggleTopDown}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '6px',
                    borderRadius: '8px',
                    background: isTopDown ? 'var(--accent-subtle)' : 'var(--fill-control)',
                    border: isTopDown ? '1px solid var(--accent)' : 'none',
                    color: isTopDown ? 'var(--accent)' : 'var(--label)',
                    fontSize: '11px',
                    cursor: 'pointer'
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
                    padding: '6px',
                    borderRadius: '8px',
                    background: 'var(--fill-control)',
                    border: 'none',
                    color: 'var(--label)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="Reset Posisi Kamera ke Pusat Kota"
                >
                  <RotateCcw size={13} />
                  <span>Reset Kamera</span>
                </button>
              </div>
            </div>

            {/* Misi & Tutorial Kota */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '6px', borderTop: '1px solid var(--separator)' }}>
              <button
                onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'var(--fill-control)',
                  border: 'none',
                  color: 'var(--label)',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Award size={13} style={{ color: 'var(--warn)' }} />
                <span>Misi Kota</span>
              </button>
              <button
                onClick={() => { setShowTutorial(true); setShowUtilityMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'var(--fill-control)',
                  border: 'none',
                  color: 'var(--label)',
                  fontSize: '11px',
                  cursor: 'pointer'
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
