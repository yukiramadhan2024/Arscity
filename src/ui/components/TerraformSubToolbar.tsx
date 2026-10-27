import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Waves, ArrowUp, ArrowDown, Minus, X, Eye, EyeOff } from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import { TerraformBrushMode } from '../../tools/TerraformTool';
import { SPRING_SHEET } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';

export const TerraformSubToolbar: React.FC = () => {
  const engine = useUIStore((s) => s.engine);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const activeTerrainMode = useUIStore((s) => s.activeTerrainMode);
  const setActiveTerrainMode = useUIStore((s) => s.setActiveTerrainMode);

  const [brushRadius, setBrushRadius] = useState<number>(14);
  const [brushStrength, setBrushStrength] = useState<number>(1.2);
  const [contourActive, setContourActive] = useState<boolean>(true);

  if (activeTool !== 'terraform') {
    return null;
  }

  const handleToggleContour = () => {
    const next = !contourActive;
    setContourActive(next);
    engine?.terrain?.setContourLinesVisible(next);
    proceduralAudio.playTaptic('light');
  };

  const handleSelectMode = (mode: TerraformBrushMode) => {
    setActiveTerrainMode(mode);
    if (engine) {
      if (engine.terraformTool) engine.terraformTool.setMode(mode);
      if (engine.terrainTool) engine.terrainTool.setMode(mode);
      engine.setActiveTool('terraform');
    }
    proceduralAudio.playTaptic('selection');
  };

  const handleRadiusChange = (r: number) => {
    setBrushRadius(r);
    engine?.terraformTool?.setRadius(r);
  };

  const handleStrengthChange = (s: number) => {
    setBrushStrength(s);
    engine?.terraformTool?.setStrength(s);
  };

  const modes: Array<{
    id: TerraformBrushMode;
    label: string;
    sublabel: string;
    icon: React.ElementType;
    activeColor: string;
    activeBg: string;
  }> = [
    {
      id: 'river',
      label: 'Buat Sungai',
      sublabel: 'Gali Alur Berair',
      icon: Waves,
      activeColor: '#0284C7',
      activeBg: 'rgba(14, 165, 233, 0.16)'
    },
    {
      id: 'raise',
      label: 'Naikkan Bukit',
      sublabel: 'Bentuk Puncak',
      icon: ArrowUp,
      activeColor: '#16A34A',
      activeBg: 'rgba(34, 197, 94, 0.16)'
    },
    {
      id: 'lower',
      label: 'Turunkan Lembah',
      sublabel: 'Bentuk Cekungan',
      icon: ArrowDown,
      activeColor: '#0284C7',
      activeBg: 'rgba(2, 132, 199, 0.16)'
    },
    {
      id: 'flatten',
      label: 'Ratakan Tanah',
      sublabel: 'Elevasi Nol',
      icon: Minus,
      activeColor: '#D97706',
      activeBg: 'rgba(245, 158, 11, 0.16)'
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 16 }}
      transition={SPRING_SHEET}
      className="arscity-glass-bar"
      style={{
        width: '490px',
        maxWidth: '92vw',
        borderRadius: '20px',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}
    >
      {/* Top Header & Close Button */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '6px',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: 'rgba(14, 165, 233, 0.14)',
              border: '1px solid rgba(14, 165, 233, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0284C7'
            }}
          >
            <Waves size={16} />
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Terraform & Pembuatan Sungai
            </div>
            <div style={{ fontSize: '10px', color: '#64748B' }}>
              Tarik kuas di atas tanah untuk menggali sungai atau mengubah kontur
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            proceduralAudio.playTaptic('light');
            setActiveTool('select');
          }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.06)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748B',
            cursor: 'pointer'
          }}
          title="Tutup Panel Terraform"
        >
          <X size={13} />
        </button>
      </div>

      {/* 4 Tool Modes Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
        {modes.map((m) => {
          const isSelected = activeTerrainMode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => handleSelectMode(m.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '8px 4px',
                borderRadius: '12px',
                border: isSelected ? `1.5px solid ${m.activeColor}` : '1px solid rgba(15, 23, 42, 0.08)',
                background: isSelected ? m.activeBg : 'rgba(255, 255, 255, 0.85)',
                boxShadow: isSelected ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={16} style={{ color: isSelected ? m.activeColor : '#475569' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isSelected ? 700 : 600,
                  color: isSelected ? m.activeColor : '#0F172A',
                  whiteSpace: 'nowrap'
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: '9px', color: isSelected ? m.activeColor : '#64748B' }}>
                {m.sublabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sliders for Radius and Strength */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
          background: 'rgba(255, 255, 255, 0.70)',
          padding: '8px 10px',
          borderRadius: '12px',
          border: '1px solid rgba(15, 23, 42, 0.06)'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#475569',
              fontFamily: 'monospace'
            }}
          >
            <span>Radius Kuas</span>
            <span style={{ color: '#0284C7', fontWeight: 700 }}>{brushRadius}m</span>
          </div>
          <input
            type="range"
            min={6}
            max={36}
            step={2}
            value={brushRadius}
            onChange={(e) => handleRadiusChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#0284C7', height: '4px', cursor: 'pointer' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#475569',
              fontFamily: 'monospace'
            }}
          >
            <span>Kecepatan Pahat</span>
            <span style={{ color: '#0284C7', fontWeight: 700 }}>{brushStrength.toFixed(1)}x</span>
          </div>
          <input
            type="range"
            min={0.4}
            max={3.0}
            step={0.2}
            value={brushStrength}
            onChange={(e) => handleStrengthChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#0284C7', height: '4px', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Topographic Contour Lines Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid rgba(15, 23, 42, 0.06)',
          fontSize: '11px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#334155' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: contourActive ? '#16A34A' : '#94A3B8',
              boxShadow: contourActive ? '0 0 6px rgba(22, 163, 74, 0.6)' : 'none'
            }}
          />
          <span style={{ fontWeight: 600 }}>Garis Kontur Topografi</span>
        </div>
        <button
          onClick={handleToggleContour}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            border: contourActive ? '1px solid rgba(22, 163, 74, 0.4)' : '1px solid rgba(15, 23, 42, 0.1)',
            background: contourActive ? 'rgba(34, 197, 94, 0.14)' : 'rgba(15, 23, 42, 0.05)',
            color: contourActive ? '#15803D' : '#64748B',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          {contourActive ? <Eye size={12} /> : <EyeOff size={12} />}
          <span>{contourActive ? 'Aktif' : 'Nonaktif'}</span>
        </button>
      </div>
    </motion.div>
  );
};
