import React, { useState } from 'react';
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
  Globe,
  User,
  Video
} from 'lucide-react';
import { WeatherType } from '../../world/WeatherSystem';

export const TopHeader: React.FC = () => {
  const {
    timeOfDay,
    setTimeOfDay,
    weather,
    setWeather,
    gridSnap,
    setGridSnap,
    gridVisible,
    toggleGridVisible,
    isTopDown,
    toggleTopDown,
    fps,
    engine,
    setShowMissions,
    setShowTutorial,
    cameraMode,
    setCameraMode
  } = useUIStore();

  const [showUtilityMenu, setShowUtilityMenu] = useState<boolean>(false);
  const [showWeatherMenu, setShowWeatherMenu] = useState<boolean>(false);

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
          {/* Bagian Kiri: Jam Matahari & Slider Waktu */}
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
              min="5.5"
              max="18.5"
              step="0.05"
              value={timeOfDay}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTimeOfDay(val);
                engine?.sunPathVisualizer?.setVisible(true);
              }}
              onPointerDown={() => engine?.sunPathVisualizer?.setVisible(true)}
              onPointerUp={() => {
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
            <button
              onClick={() => {
                setShowWeatherMenu(!showWeatherMenu);
                cycleWeather();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                background: showWeatherMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: showWeatherMenu ? '1px solid var(--accent)' : '1px solid var(--hairline-soft)',
                borderRadius: 'var(--radius-capsule)',
                cursor: 'pointer',
                color: 'var(--label)',
                transition: 'all 0.15s ease'
              }}
              title="Klik untuk mengganti cuaca (Cerah, Berawan, Hujan)"
              aria-label={`Cuaca: ${currentWeather.label}`}
            >
              <WeatherIcon size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: 'var(--label)', whiteSpace: 'nowrap' }}>
                {currentWeather.label}
              </span>
            </button>

            {/* Quick 3-Choice Weather Popover */}
            {showWeatherMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '36px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--surface-strong)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid var(--hairline)',
                  borderRadius: 'var(--radius-sub)',
                  boxShadow: 'var(--shadow-popover)',
                  padding: '4px',
                  display: 'flex',
                  gap: '4px',
                  zIndex: 'var(--z-hud-popover)' as any
                }}
              >
                {weatherOptions.map((opt) => {
                  const OptIcon = opt.icon;
                  const isSel = weather === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setWeather(opt.id);
                        setShowWeatherMenu(false);
                      }}
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>


          {/* Mode Kamera: Orbit / Pejalan Kaki / Drone View */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(226, 232, 240, 0.75)',
              borderRadius: '9999px',
              padding: '2px',
              gap: '2px'
            }}
          >
            {[
              { id: 'orbit' as const, label: 'Orbit', icon: Globe },
              { id: 'first_person' as const, label: 'Pejalan Kaki', icon: User },
              { id: 'cinematic_drone' as const, label: 'Drone View', icon: Video }
            ].map((m) => {
              const IconComp = m.icon;
              const isActive = cameraMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setCameraMode(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    background: isActive ? '#FFFFFF' : 'transparent',
                    color: isActive ? '#0F172A' : '#64748B',
                    fontWeight: isActive ? 700 : 500,
                    fontSize: '11px',
                    border: 'none',
                    boxShadow: isActive ? '0 1px 3px rgba(15, 23, 42, 0.12)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap'
                  }}
                  title={`Aktifkan mode kamera ${m.label}`}
                  aria-label={m.label}
                >
                  <IconComp size={15} strokeWidth={2} style={{ color: isActive ? '#007AFF' : 'inherit' }} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Bagian Kanan: Status FPS & Tombol Menu Kontrol Cepat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

            {/* Menu Popover Trigger Button */}
            <button
              onClick={() => setShowUtilityMenu(!showUtilityMenu)}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: showUtilityMenu ? 'var(--accent-subtle)' : 'var(--fill-control)',
                border: 'none',
                color: 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.15s ease'
              }}
              title="Kontrol Cepat Viewport & Grid"
              aria-label="Kontrol Cepat"
            >
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>

        {/* Menu Popover "Kontrol Cepat" (Tanpa Duplikasi Tombol Dock Kiri) */}
        {showUtilityMenu && (
          <div
            style={{
              position: 'absolute',
              top: '48px',
              right: '0',
              width: '260px',
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
          </div>
        )}
      </header>
    </>
  );
};
