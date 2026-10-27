import React, { useState } from 'react';
import { ARCHITECTURAL_STYLES, ArchitecturalStyle } from '../../education/StyleLibrary';
import { useUIStore } from '../state/useUIStore';
import { PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { X, Landmark, Sparkles, Check, ArrowRight } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface StyleLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StyleLibraryModal: React.FC<StyleLibraryModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalA11y(isOpen, onClose);
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
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="style-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
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
            <Landmark size={18} strokeWidth={1.75} style={{ color: '#007AFF' }} />
            <div>
              <div id="style-modal-title" style={{ fontSize: '15px', fontWeight: 600, color: '#0F172A' }}>
                Pustaka Gaya Arsitektur Nusantara
              </div>
              <div style={{ fontSize: '11px', color: '#475569' }}>
                Karakter bentuk atap, orientasi, dan material tropis lokal
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Tutup Pustaka Gaya"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Master - Detail Panes */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Style Selector List (Left) */}
          <div style={{ width: '270px', borderRight: '1px solid #CBD5E1', overflowY: 'auto', padding: '10px' }}>
            <div className="inset-group" style={{ marginBottom: 0 }}>
              {ARCHITECTURAL_STYLES.map((style) => {
                const isSelected = selectedStyle.id === style.id;
                return (
                  <div
                    key={style.id}
                    onClick={() => setSelectedStyle(style)}
                    className="inset-row inset-row-clickable"
                    style={{
                      background: isSelected ? 'rgba(0, 122, 255, 0.12)' : '#FFFFFF',
                      padding: '10px 12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: '#007AFF', fontWeight: 600 }}>
                        {style.badge}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: isSelected ? 700 : 500, color: isSelected ? '#007AFF' : '#0F172A', marginTop: '2px' }}>
                        {style.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748B' }}>
                        {style.originEra}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Style Details (Right) */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: 'transparent' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '17px', fontWeight: 600, color: '#0F172A' }}>
                  {selectedStyle.name}
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: '#FFFFFF',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    color: '#475569'
                  }}
                >
                  {selectedStyle.originEra}
                </span>
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: '#475569' }}>
                {selectedStyle.description}
              </p>
            </div>

            {/* Historical Context Callout */}
            <div className="inset-header" style={{ padding: '0 0 4px 0', color: '#007AFF' }}>
              KONTEKS SEJARAH & ADAPTASI IKLIM
            </div>
            <div className="inset-group">
              <div className="inset-row" style={{ background: '#FFFFFF' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#0F172A' }}>
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
                    <Check size={14} strokeWidth={2} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span style={{ color: '#0F172A' }}>{feat}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Material recommendations and Apply button */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: '#475569' }}>
                <span>Material: <strong style={{ color: '#0F172A' }}>{selectedStyle.recommendedMaterial}</strong></span>
                <span>•</span>
                <span>Atap: <strong style={{ color: '#0F172A' }}>{selectedStyle.recommendedRoof}</strong></span>
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
