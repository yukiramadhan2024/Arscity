import React, { useState } from 'react';
import { GLOSSARY_DATA, GlossaryEntry } from '../../education/GlossaryData';
import { Search, X, BookOpen, Compass, Sparkles, Ruler } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface GlossaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTermId?: string;
}

export const GlossaryModal: React.FC<GlossaryModalProps> = ({ isOpen, onClose, initialTermId }) => {
  const modalRef = useModalA11y(isOpen, onClose);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [activeEntry, setActiveEntry] = useState<GlossaryEntry>(
    initialTermId
      ? GLOSSARY_DATA.find((e) => e.id === initialTermId) || GLOSSARY_DATA[0]
      : GLOSSARY_DATA[0]
  );

  if (!isOpen) return null;

  const categories = ['Semua', 'Regulasi & Tata Kota', 'Elemen Arsitektur', 'Kenyamanan & Iklim Tropis', 'Gambar Kerja'];

  const filteredEntries = GLOSSARY_DATA.filter((entry) => {
    const matchesSearch =
      entry.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (entry.abbreviation && entry.abbreviation.toLowerCase().includes(searchTerm.toLowerCase())) ||
      entry.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'Semua' || entry.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const renderIllustration = (type: GlossaryEntry['illustrationType']) => {
    switch (type) {
      case 'kdb':
        return (
          <div
            style={{
              width: '100%',
              height: '130px',
              background: 'var(--fill-control)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid var(--separator)'
            }}
          >
            <div
              style={{
                width: '160px',
                height: '84px',
                border: '1.5px dashed var(--label-secondary)',
                borderRadius: '8px',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  left: '6px',
                  fontSize: '9px',
                  color: 'var(--label-secondary)',
                  fontWeight: 600
                }}
              >
                Kavling (100%)
              </span>
              <div
                style={{
                  width: '96px',
                  height: '52px',
                  background: 'rgba(0, 122, 255, 0.15)',
                  border: '1.5px solid var(--accent)',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 600 }}>
                  Tapak (≤ 60%)
                </span>
              </div>
            </div>
            <span style={{ fontSize: '10px', color: 'var(--good)', marginTop: '6px', fontWeight: 500 }}>
              Area Terbuka Hijau Resapan (≥ 40%)
            </span>
          </div>
        );
      case 'overhang':
        return (
          <div
            style={{
              width: '100%',
              height: '130px',
              background: 'var(--fill-control)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid var(--separator)'
            }}
          >
            <svg width="220" height="100" viewBox="0 0 220 100">
              <circle cx="20" cy="20" r="10" fill="#f59e0b" />
              <line x1="26" y1="26" x2="65" y2="60" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
              <polygon points="50,42 160,20 190,42 170,42 155,28 65,42" fill="#c2410c" />
              <rect x="75" y="42" width="80" height="50" fill="#64748b" />
              <rect x="90" y="52" width="25" height="26" fill="#38bdf8" />
              <line x1="50" y1="45" x2="75" y2="45" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="50" y="58" fill="#38bdf8" fontSize="9" fontWeight="600">
                Teritisan 1.5m
              </text>
            </svg>
          </div>
        );
      case 'ventilation':
        return (
          <div
            style={{
              width: '100%',
              height: '130px',
              background: 'var(--fill-control)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid var(--separator)'
            }}
          >
            <svg width="200" height="90" viewBox="0 0 200 90">
              <rect x="30" y="15" width="140" height="55" fill="none" stroke="#64748b" strokeWidth="1.5" rx="6" />
              <rect x="30" y="30" width="4" height="26" fill="#38bdf8" />
              <rect x="166" y="30" width="4" height="26" fill="#38bdf8" />
              <path d="M 10 42 Q 50 30 100 42 T 190 42" fill="none" stroke="#007AFF" strokeWidth="2.5" />
              <polygon points="186,38 194,42 186,46" fill="#007AFF" />
              <text x="56" y="80" fill="var(--label-secondary)" fontSize="10" fontWeight="500">
                Sirkulasi Silang Alami
              </text>
            </svg>
          </div>
        );
      default:
        return (
          <div
            style={{
              width: '100%',
              height: '130px',
              background: 'var(--fill-control)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              border: '0.5px solid var(--separator)'
            }}
          >
            <Compass size={32} strokeWidth={1.75} style={{ color: 'var(--accent)', marginBottom: '6px' }} />
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
              Prinsip Kenyamanan Tropis
            </span>
          </div>
        );
    }
  };

  return (
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="glossary-modal-title"
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(10, 132, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <BookOpen size={20} color="#007AFF" strokeWidth={2.2} />
            </div>
            <div>
              <div id="glossary-modal-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lab-title-color)', letterSpacing: '-0.01em' }}>
                Glosarium Arsitektur & Tata Kota
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lab-subtitle-color)', marginTop: '2px' }}>
                Standar dan regulasi tata ruang tropis Indonesia
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Tutup Glosarium"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--fill-control)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--label-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div style={{ padding: '12px 18px', borderBottom: '0.5px solid var(--separator)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative', width: '100%' }}>
            <Search size={14} strokeWidth={1.75} style={{ position: 'absolute', left: '10px', top: '9px', color: 'var(--label-secondary)' }} />
            <input
              type="text"
              placeholder="Cari istilah (KDB, KLB, GSB, Teritisan)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                background: 'var(--fill-control)',
                border: '0.5px solid var(--separator)',
                borderRadius: '8px',
                padding: '7px 10px 7px 32px',
                color: 'var(--label)',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`segmented-item ${selectedCategory === cat ? 'active' : ''}`}
                style={{ fontSize: '11px', padding: '3px 10px', whiteSpace: 'nowrap' }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Master - Detail Panes */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Master List */}
          <div style={{ width: '270px', borderRight: '0.5px solid var(--separator)', overflowY: 'auto', padding: '10px' }}>
            <div className="inset-group" style={{ marginBottom: 0 }}>
              {filteredEntries.map((entry) => {
                const isSelected = activeEntry.id === entry.id;
                return (
                  <div
                    key={entry.id}
                    onClick={() => setActiveEntry(entry)}
                    className="inset-row inset-row-clickable"
                    style={{
                      background: isSelected ? 'var(--fill-control-active)' : undefined,
                      padding: '8px 12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: 'var(--label)' }}>
                        {entry.term}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        {entry.category}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail Pane */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label)' }}>
                  {activeEntry.term}
                </span>
                {activeEntry.abbreviation && (
                  <span
                    style={{
                      padding: '2px 8px',
                      background: 'rgba(0, 122, 255, 0.12)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--accent)',
                      fontWeight: 600
                    }}
                  >
                    {activeEntry.abbreviation}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>{activeEntry.category}</span>
            </div>

            {/* Illustration */}
            <div style={{ margin: '12px 0' }}>
              {renderIllustration(activeEntry.illustrationType)}
            </div>

            {/* Formula (if any) */}
            {activeEntry.formula && (
              <div
                style={{
                  padding: '8px 12px',
                  background: 'var(--fill-control)',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  fontSize: '12px',
                  color: 'var(--label)',
                  fontFamily: 'monospace',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Ruler size={13} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <span>{activeEntry.formula}</span>
              </div>
            )}

            {/* Definition */}
            <div style={{ marginBottom: '14px' }}>
              <div className="inset-header" style={{ padding: '0 0 4px 0' }}>DEFINISI</div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--label)' }}>
                {activeEntry.definition}
              </p>
            </div>

            {/* Tropical Context */}
            <div>
              <div className="inset-header" style={{ padding: '0 0 4px 0', color: 'var(--accent)' }}>
                PENERAPAN DI IKLIM TROPIS
              </div>
              <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label-secondary)' }}>
                {activeEntry.tropicalContext}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
