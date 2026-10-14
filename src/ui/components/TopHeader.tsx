import React from 'react';
import { useUIStore } from '../state/useUIStore';
import {
  Sun,
  Cloud,
  CloudRain,
  Eye,
  RotateCcw,
  Compass,
  Grid,
  BookOpen,
  Landmark,
  Award,
  Sparkles,
  Building,
  Route,
  Activity,
  Footprints
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
    isInspectMode,
    toggleInspectMode,
    isWalkMode,
    toggleWalkMode,
    fps,
    engine,
    stats,
    setShowGlossary,
    setShowStyles,
    setShowMissions,
    setShowTutorial,
    setShowLoadTest
  } = useUIStore();

  const formatTime = (h: number): string => {
    const hours = Math.floor(h);
    const mins = Math.floor((h - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')} WIB`;
  };

  const sunAlt = engine?.lightingSystem.currentSolarCoords.altitudeDegrees ?? 0;

  return (
    <header
      className="interactive"
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        right: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 50,
        pointerEvents: 'none'
      }}
    >
      {/* Top Left: Project Info, Metrics, & Learning Tools */}
      <div
        className="glass-surface glass-capsule interactive"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          gap: '10px'
        }}
      >
        {/* Project Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--fill-control-hover)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent)'
            }}
          >
            <Building size={16} strokeWidth={1.75} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)', letterSpacing: '-0.01em' }}>
              Arscity
            </div>
          </div>
        </div>

        <div className="divider-v" />

        {/* Live Metrics */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Bangunan Terbangun">
            <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--label)' }}>
              {stats.buildingCount}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>gedung</span>
          </div>
          <span style={{ color: 'var(--separator)' }}>•</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Panjang Ruas Jalan">
            <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--label)' }}>
              {stats.roadLengthKm.toFixed(1)}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>km jalan</span>
          </div>
          <span style={{ color: 'var(--separator)' }}>•</span>
          <button
            onClick={() => setShowLoadTest(true)}
            className="icon-btn"
            style={{
              padding: '2px 8px',
              height: '24px',
              borderRadius: 'var(--radius-capsule)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              fontWeight: 600,
              color: fps >= 55 ? 'var(--good, #34c759)' : fps >= 30 ? '#ff9500' : 'var(--bad, #ff3b30)',
              backgroundColor: 'var(--fill-control)'
            }}
            title="Buka Panel Uji Beban 300 Gedung & Telemetri Performa"
            aria-label="Panel Uji Beban"
          >
            <Activity size={12} strokeWidth={2} />
            <span className="tabular-nums">{fps} FPS</span>
          </button>
        </div>

        <div className="divider-v" />

        {/* Learning Hub Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => setShowGlossary(true)}
            className="icon-btn"
            title="Glosarium Arsitektur (KDB, KLB, GSB)"
            aria-label="Glosarium Arsitektur"
          >
            <BookOpen size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setShowStyles(true)}
            className="icon-btn"
            title="Pustaka Gaya Arsitektur Nusantara"
            aria-label="Pustaka Gaya Arsitektur Nusantara"
          >
            <Landmark size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setShowMissions(true)}
            className="icon-btn"
            title="Misi & Tantangan Kota"
            aria-label="Misi dan Tantangan Kota"
          >
            <Award size={16} strokeWidth={1.75} />
          </button>
          <button
            onClick={() => setShowTutorial(true)}
            className="icon-btn"
            title="Panduan Interaktif Pemula"
            aria-label="Panduan Interaktif Pemula"
          >
            <Sparkles size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {/* Top Right: Clock, Weather, Grid, & Camera */}
      <div
        className="glass-surface glass-capsule interactive"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '4px 12px',
          gap: '8px'
        }}
      >
        {/* Time of Day Slider & WIB Display */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '170px' }}>
          <Sun size={15} strokeWidth={1.75} style={{ color: 'var(--warn)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', lineHeight: '14px' }}>
              <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--label)' }}>
                {formatTime(timeOfDay)}
              </span>
              <span className="tabular-nums" style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                {sunAlt > 0 ? `+${sunAlt.toFixed(0)}°` : 'Malam'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="0.1"
              value={timeOfDay}
              onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
              className="ios-slider"
              style={{ margin: '2px 0 0 0', height: '4px' }}
              aria-label="Pengatur Waktu dan Posisi Matahari"
            />
          </div>
        </div>

        <div className="divider-v" />

        {/* Weather Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          {(
            [
              { type: 'clear' as WeatherType, icon: Sun, label: 'Cerah' },
              { type: 'overcast' as WeatherType, icon: Cloud, label: 'Mendung' },
              { type: 'rain' as WeatherType, icon: CloudRain, label: 'Hujan' }
            ] as const
          ).map((item) => (
            <button
              key={item.type}
              onClick={() => setWeather(item.type)}
              className={`icon-btn ${weather === item.type ? 'active' : ''}`}
              title={item.label}
              aria-label={item.label}
            >
              <item.icon size={15} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        <div className="divider-v" />

        {/* Grid Snap & Visibility */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={toggleGridVisible}
            className={`icon-btn ${gridVisible ? 'active' : ''}`}
            title={gridVisible ? 'Sembunyikan Grid' : 'Tampilkan Grid'}
            aria-label="Tombol Grid"
          >
            <Grid size={15} strokeWidth={1.75} />
          </button>
          {[1, 5, 10].map((step) => (
            <button
              key={step}
              onClick={() => setGridSnap(step)}
              className={`segmented-item ${gridSnap === step ? 'active' : ''}`}
              style={{ padding: '3px 8px', fontSize: '11px' }}
              title={`Snap Grid ${step}m`}
            >
              <span className="tabular-nums">{step}m</span>
            </button>
          ))}
        </div>

        <div className="divider-v" />

        {/* Camera Views: Reset, Top-down, Inspect */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={() => engine?.cameraController.resetCamera()}
            className="icon-btn"
            title="Reset Kamera"
            aria-label="Reset Kamera"
          >
            <RotateCcw size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={toggleTopDown}
            className={`icon-btn ${isTopDown ? 'active' : ''}`}
            title="Tampak Atas (Denah)"
            aria-label="Tampak Atas"
          >
            <Compass size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={toggleInspectMode}
            className={`icon-btn ${isInspectMode ? 'active' : ''}`}
            title="Mode Inspeksi Orbit Fasad"
            aria-label="Mode Inspeksi Orbit"
          >
            <Eye size={15} strokeWidth={1.75} />
          </button>
          <button
            onClick={toggleWalkMode}
            className={`icon-btn ${isWalkMode ? 'active' : ''}`}
            title="Mode Jalan Kaki 1.6m (Walk Mode)"
            aria-label="Mode Jalan Kaki 1.6m"
          >
            <Footprints size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};
