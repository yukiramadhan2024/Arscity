import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ScreenshotExporter } from '../../io/ScreenshotExporter';
import { Camera, X, Sliders, Stamp } from 'lucide-react';

export const PhotoModeOverlay: React.FC = () => {
  const { engine, isPhotoMode, setIsPhotoMode, cameraMode } = useUIStore();
  const [resolution, setResolution] = useState<'1080p' | '1440p' | '4k'>('1080p');
  const [enableTiltShift, setEnableTiltShift] = useState<boolean>(false);
  const [showWatermark, setShowWatermark] = useState<boolean>(true);

  if (!isPhotoMode || cameraMode !== 'orbit') return null;

  const handleCapture = () => {
    if (!engine) return;
    ScreenshotExporter.captureHighResPhoto(engine, {
      resolution,
      enableTiltShift,
      showWatermark,
      accumulationPasses: resolution === '4k' ? 2 : 2
    });
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
            background: 'var(--surface)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-glass)',
            borderRadius: '9999px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Camera size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
            Mode Foto Arsitektur
          </span>
          <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
            (Resolusi Tinggi Hingga 4K Tanpa Antarmuka)
          </span>
        </div>

        <button
          onClick={() => setIsPhotoMode(false)}
          className="ios-btn interactive"
          style={{
            padding: '6px 14px',
            fontSize: '12px',
            background: 'var(--surface-raised)',
            border: '1px solid var(--border)',
            color: 'var(--label)',
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
          border: '0.5px solid var(--hairline)',
          pointerEvents: 'none'
        }}
      >
        <div style={{ position: 'absolute', top: '33.3%', left: 0, width: '100%', height: '0.5px', background: 'var(--hairline)' }} />
        <div style={{ position: 'absolute', top: '66.6%', left: 0, width: '100%', height: '0.5px', background: 'var(--hairline)' }} />
        <div style={{ position: 'absolute', left: '33.3%', top: 0, height: '100%', width: '0.5px', background: 'var(--hairline)' }} />
        <div style={{ position: 'absolute', left: '66.6%', top: 0, height: '100%', width: '0.5px', background: 'var(--hairline)' }} />
      </div>

      {/* Bottom Shutter & Controls Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div
          className="interactive"
          style={{
            background: 'var(--surface)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-glass)',
            borderRadius: '9999px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          {/* Resolution Selector */}
          <div style={{ display: 'flex', background: 'var(--fill-control)', borderRadius: '9999px', padding: '2px', gap: '2px' }}>
            {(['1080p', '1440p', '4k'] as const).map((res) => (
              <button
                key={res}
                onClick={() => setResolution(res)}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '9999px',
                  background: resolution === res ? 'var(--accent)' : 'transparent',
                  color: resolution === res ? 'var(--on-accent)' : 'var(--label-secondary)',
                  boxShadow: resolution === res ? 'var(--shadow-accent)' : 'none',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {res.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

          {/* Tilt Shift Toggle */}
          <button
            onClick={() => setEnableTiltShift(!enableTiltShift)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: enableTiltShift ? 'var(--accent-soft)' : 'transparent',
              color: enableTiltShift ? 'var(--accent)' : 'var(--label-secondary)',
              border: enableTiltShift ? '1px solid var(--accent)' : '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Sliders size={13} strokeWidth={1.75} />
            <span>Tilt-Shift Miniatur</span>
          </button>

          {/* Watermark Toggle */}
          <button
            onClick={() => setShowWatermark(!showWatermark)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '9999px',
              background: showWatermark ? 'var(--fill-control)' : 'transparent',
              color: showWatermark ? 'var(--label)' : 'var(--label-tertiary)',
              border: '1px solid transparent',
              cursor: 'pointer'
            }}
          >
            <Stamp size={13} strokeWidth={1.75} />
            <span>Tanda Air Studio</span>
          </button>

          <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

          {/* Shutter Button */}
          <button
            onClick={handleCapture}
            className="ios-btn ios-btn-primary"
            style={{
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 700,
              borderRadius: '9999px',
              background: 'var(--accent)',
              color: 'var(--on-accent)',
              boxShadow: 'var(--shadow-accent)'
            }}
          >
            <Camera size={16} strokeWidth={1.75} />
            <span>Ambil Foto ({resolution.toUpperCase()})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
