import React, { useState } from 'react';
import { ARCHITECTURAL_STYLES, ArchitecturalStyle } from '../../education/StyleLibrary';
import { useUIStore } from '../state/useUIStore';
import { PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { X, Landmark, Sparkles, Check, ArrowRight } from 'lucide-react';

interface StyleLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StyleLibraryModal: React.FC<StyleLibraryModalProps> = ({ isOpen, onClose }) => {
  const { engine, setActiveTool } = useUIStore();
  const [selectedStyle, setSelectedStyle] = useState<ArchitecturalStyle>(ARCHITECTURAL_STYLES[0]);

  if (!isOpen) return null;

  const handleApplyStyle = (style: ArchitecturalStyle) => {
    if (!engine) return;
    if (PREFAB_CATALOG[style.suggestedPrefabId]) {
      engine.buildingTool.setPreset(style.suggestedPrefabId);
      setActiveTool('build');
      onClose();
    }
  };

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '820px',
          maxWidth: '92vw',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Landmark size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Pustaka Gaya Arsitektur Nusantara
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Karakter bentuk atap, orientasi, dan material tropis lokal
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Pustaka Gaya">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Master - Detail Panes */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Style Selector List (Left) */}
          <div style={{ width: '270px', borderRight: '0.5px solid var(--separator)', overflowY: 'auto', padding: '10px' }}>
            <div className="inset-group" style={{ marginBottom: 0 }}>
              {ARCHITECTURAL_STYLES.map((style) => {
                const isSelected = selectedStyle.id === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className="inset-row inset-row-clickable"
                    style={{
                      background: isSelected ? 'var(--fill-control-active)' : undefined,
                      padding: '10px 12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600 }}>
                        {style.badge}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500, color: 'var(--label)', marginTop: '2px' }}>
                        {style.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                        {style.originEra}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Style Details (Right) */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: 'var(--surface)' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label)' }}>
                  {selectedStyle.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'var(--fill-control)',
                    borderRadius: '6px',
                    color: 'var(--label-secondary)'
                  }}
                >
                  {selectedStyle.originEra}
                </span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--label-secondary)' }}>
                {selectedStyle.description}
              </p>
            </div>

            {/* Historical Context Callout */}
            <div className="inset-header" style={{ padding: '0 0 4px 0', color: 'var(--accent)' }}>
              KONTEKS SEJARAH & ADAPTASI IKLIM
            </div>
            <div className="inset-group">
              <div className="inset-row" style={{ background: 'var(--fill-control)' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label)' }}>
                  {selectedStyle.historicalContext}
                </p>
              </div>
            </div>

            {/* Signature Features */}
            <div className="inset-header" style={{ padding: '0 0 4px 0' }}>CIRI KHAS ARSITEKTUR</div>
            <div className="inset-group">
              {selectedStyle.signatureFeatures.map((feat, idx) => (
                <div key={idx} className="inset-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <Check size={14} strokeWidth={2} style={{ color: 'var(--good)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--label)' }}>{feat}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Material recommendations and Apply button */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '0.5px solid var(--separator)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--label-secondary)' }}>
                <span>Material: <strong>{selectedStyle.recommendedMaterial}</strong></span>
                <span>•</span>
                <span>Atap: <strong>{selectedStyle.recommendedRoof}</strong></span>
              </div>

              <button
                onClick={() => handleApplyStyle(selectedStyle)}
                className="ios-btn ios-btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                <span>Terapkan & Bangun</span>
                <ArrowRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
