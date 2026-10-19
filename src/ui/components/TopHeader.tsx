import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  Sun,
  Cloud,
  CloudRain,
  ShieldCheck,
  MoreHorizontal,
  X,
  Grid,
  RotateCcw,
  Compass,
  Award,
  Sparkles,
  Check
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
    setShowTutorial
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

  // Logika Kepatuhan Regulasi Tata Ruang Kota
  // Menghitung persentase kepatuhan bangunan kota terhadap regulasi teknis (GSB, KDB, KLB, Tinggi, Batas Kavling)
  const lotsWithBuildings = engine?.lotManager?.lots.size
    ? Array.from(engine.lotManager.lots.values()).filter((l) => l.containedBuildingIds && l.containedBuildingIds.length > 0)
    : [];

  const buildingViolatedLots = lotsWithBuildings.filter((l) => {
    return l.violations && l.violations.some((v) =>
      v.code === 'GSB_FRONT' ||
      v.code === 'GSB_SIDE' ||
      v.code === 'GSB_REAR' ||
      v.code === 'KDB' ||
      v.code === 'KLB' ||
      v.code === 'HEIGHT' ||
      v.code === 'OUT_OF_BOUNDS' ||
      v.code === 'CROSS_LOTS'
    );
  });

  // Jika belum ada bangunan yang melanggar aturan (atau semua bangunan patuh), tampilkan Regulasi 100%
  const compliancePercent = lotsWithBuildings.length > 0
    ? Math.round(((lotsWithBuildings.length - buildingViolatedLots.length) / lotsWithBuildings.length) * 100)
    : 100;

  const complianceColor =
    compliancePercent >= 80
      ? '#34C759'
      : compliancePercent >= 50
      ? '#FF9500'
      : '#FF3B30';

  return (
    <>
      {/* Kapsul Kaca Gelap Terpusat (Unified Dark Slate Glass) */}
      <header
        className="interactive"
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 50,
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '6px 18px',
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '9999px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
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
                color: '#F8FAFC',
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
                accentColor: '#0A84FF',
                background: 'rgba(10, 132, 255, 0.35)',
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
                background: showWeatherMenu ? 'rgba(10, 132, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                border: showWeatherMenu ? '1px solid rgba(10, 132, 255, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '9999px',
                cursor: 'pointer',
                color: '#F8FAFC',
                transition: 'all 0.15s ease'
              }}
              title="Klik untuk mengganti cuaca (Cerah, Berawan, Hujan)"
              aria-label={`Cuaca: ${currentWeather.label}`}
            >
              <WeatherIcon size={15} strokeWidth={2} style={{ color: '#0A84FF' }} />
              <span style={{ fontSize: '12px', fontWeight: 500, color: '#F8FAFC', whiteSpace: 'nowrap' }}>
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
                  background: 'rgba(15, 23, 42, 0.95)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  borderRadius: '12px',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)',
                  padding: '4px',
                  display: 'flex',
                  gap: '4px',
                  zIndex: 100
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
                        background: isSel ? '#0A84FF' : 'transparent',
                        border: 'none',
                        color: isSel ? '#FFFFFF' : '#CBD5E1',
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

          {/* Indikator Kepatuhan Regulasi Tata Ruang Kota */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 4px',
              borderLeft: '1px solid rgba(255, 255, 255, 0.12)',
              borderRight: '1px solid rgba(255, 255, 255, 0.12)',
              paddingLeft: '12px',
              paddingRight: '12px'
            }}
            title={`Kepatuhan Regulasi Kota: ${compliancePercent}% (${lotsWithBuildings.length - buildingViolatedLots.length}/${lotsWithBuildings.length || 1} kavling patuh)`}
          >
            <ShieldCheck size={14} strokeWidth={2.2} style={{ color: complianceColor }} />
            <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500, letterSpacing: '0.02em' }}>
              Regulasi
            </span>
            <span
              className="font-mono tabular-nums font-bold"
              style={{
                fontSize: '12px',
                color: complianceColor
              }}
            >
              {compliancePercent}%
            </span>
          </div>

          {/* Bagian Kanan: Status FPS & Tombol Menu Kontrol Cepat */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              className="font-mono tabular-nums font-semibold"
              style={{
                fontSize: '11px',
                color: '#34C759',
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
                background: showUtilityMenu ? 'rgba(10, 132, 255, 0.35)' : 'rgba(255, 255, 255, 0.08)',
                border: 'none',
                color: '#F8FAFC',
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
              background: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.14)',
              borderRadius: '16px',
              boxShadow: '0 16px 40px rgba(0, 0, 0, 0.65)',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              zIndex: 100
            }}
          >
            {/* Header Popover */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Kontrol Cepat
              </span>
              <button
                onClick={() => setShowUtilityMenu(false)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 0 }}
                aria-label="Tutup Kontrol Cepat"
              >
                <X size={14} />
              </button>
            </div>

            {/* Kontrol Grid Spasial */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#CBD5E1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Grid size={13} style={{ color: '#0A84FF' }} />
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
                        background: gridSnap === step ? '#0A84FF' : 'rgba(255,255,255,0.06)',
                        border: 'none',
                        color: gridSnap === step ? '#FFFFFF' : '#CBD5E1',
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#F8FAFC',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <span>Tampilkan Garis Grid</span>
                <span style={{ color: gridVisible ? '#34C759' : '#94A3B8', fontWeight: 600 }}>
                  {gridVisible ? 'Aktif' : 'Mati'}
                </span>
              </button>
            </div>

            {/* Kontrol Sudut Pandang Kamera */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
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
                    background: isTopDown ? 'rgba(10, 132, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                    border: isTopDown ? '1px solid rgba(10, 132, 255, 0.5)' : 'none',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                  title="Ganti Sudut Pandang 2D Tegak Lurus / 3D Isometrik"
                >
                  <Compass size={13} style={{ color: '#0A84FF' }} />
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
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: 'none',
                    color: '#F8FAFC',
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={() => { setShowMissions(true); setShowUtilityMenu(false); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '5px',
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#CBD5E1',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Award size={13} style={{ color: '#FF9500' }} />
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
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  color: '#CBD5E1',
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
              >
                <Sparkles size={13} style={{ color: '#0A84FF' }} />
                <span>Tutorial</span>
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
