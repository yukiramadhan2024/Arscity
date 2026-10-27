import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { ScreenshotExporter } from '../../io/ScreenshotExporter';
import { Camera, X } from 'lucide-react';

export const PhotoModeOverlay: React.FC = () => {
  const { engine, isPhotoMode, setIsPhotoMode } = useUIStore();

  if (!isPhotoMode) return null;

  const handleCapture = () => {
    if (!engine) return;
    ScreenshotExporter.captureScreenshot(engine);
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '16px'
      }}
    >
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div
          className="interactive"
          style={{
            background: 'rgba(244, 247, 251, 0.95)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
            borderRadius: '9999px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Camera size={15} strokeWidth={1.75} style={{ color: '#007AFF' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#0F172A' }}>
            Mode Foto Arsitektur
          </span>
          <span style={{ fontSize: '11px', color: '#475569' }}>
            (Resolusi Tinggi Tanpa Antarmuka)
          </span>
        </div>

        <button
          onClick={() => setIsPhotoMode(false)}
          className="ios-btn interactive"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: '#FFFFFF',
            border: '1px solid #CBD5E1',
            color: '#0F172A',
            borderRadius: '9999px'
          }}
        >
          <X size={14} strokeWidth={1.75} />
          <span>Keluar (Esc)</span>
        </button>
      </div>

      {/* Center Rule of Thirds subtle lines */}
      <div
        style={{
          position: 'absolute',
          top: '15%',
          left: '15%',
          width: '70%',
          height: '70%',
          border: '0.5px solid rgba(15, 23, 42, 0.15)',
          pointerEvents: 'none'
        }}
      >
        <div style={{ position: 'absolute', top: '33.3%', left: 0, width: '100%', height: '0.5px', background: 'rgba(15, 23, 42, 0.12)' }} />
        <div style={{ position: 'absolute', top: '66.6%', left: 0, width: '100%', height: '0.5px', background: 'rgba(15, 23, 42, 0.12)' }} />
        <div style={{ position: 'absolute', left: '33.3%', top: 0, height: '100%', width: '0.5px', background: 'rgba(15, 23, 42, 0.12)' }} />
        <div style={{ position: 'absolute', left: '66.6%', top: 0, height: '100%', width: '0.5px', background: 'rgba(15, 23, 42, 0.12)' }} />
      </div>

      {/* Bottom Shutter Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          className="interactive"
          style={{
            background: 'rgba(244, 247, 251, 0.95)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
            borderRadius: '9999px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <button
            onClick={handleCapture}
            className="ios-btn ios-btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 600
            }}
          >
            <Camera size={16} strokeWidth={1.75} />
            <span>Ambil Foto PNG</span>
          </button>
        </div>
      </div>
    </div>
  );
};
