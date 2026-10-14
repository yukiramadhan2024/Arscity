import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { PREFAB_CATALOG } from '../../buildings/PrefabTypes';
import { RotateCw, Home, Building2, Landmark, LayoutGrid, PenTool, Check, X } from 'lucide-react';

export const BuildingCatalogBar: React.FC = () => {
  const { activeTool, engine, setShowCustomBuildingStudio } = useUIStore();
  const [mode, setMode] = useState<'prefab' | 'custom'>('prefab');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedKey, setSelectedKey] = useState<string>('house_36');
  const [isDrawingFootprint, setIsDrawingFootprint] = useState<boolean>(false);

  if (activeTool !== 'build') return null;

  const presets = Object.values(PREFAB_CATALOG).filter(
    (p) => activeCategory === 'all' || p.category === activeCategory
  );

  const handleSelectPreset = (key: string) => {
    setSelectedKey(key);
    engine?.buildingTool.setPreset(key);
  };

  const handleRotate = () => {
    engine?.buildingTool.rotate();
  };

  const handleStartDrawFootprint = () => {
    if (!engine) return;
    setIsDrawingFootprint(true);
    engine.footprintTool.startDrawing();
  };

  const handleFinishFootprint = () => {
    if (!engine) return;
    setIsDrawingFootprint(false);
    engine.footprintTool.finishPolygon();
  };

  const handleCancelFootprint = () => {
    if (!engine) return;
    setIsDrawingFootprint(false);
    engine.footprintTool.cancelDrawing();
  };

  const handleTemplateShape = (shape: 'rect' | 'L' | 'U') => {
    if (!engine) return;
    const center = engine.raycastManager.snappedPoint.clone();
    engine.footprintTool.createTemplateBuilding(shape, center);
  };

  return (
    <div className="sub-dock-wrapper">
      <div
        className="glass-surface interactive"
        style={{
          borderRadius: '24px',
          padding: '10px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          maxWidth: '820px',
          width: '92%'
        }}
      >
        {/* Top Switcher: Prefab vs Desainer Kustom */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="segmented-control">
            <button
              onClick={() => {
                setMode('prefab');
                handleCancelFootprint();
              }}
              className={`segmented-item ${mode === 'prefab' ? 'active' : ''}`}
            >
              <Building2 size={14} strokeWidth={1.75} />
              <span>Katalog Prefab</span>
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`segmented-item ${mode === 'custom' ? 'active' : ''}`}
            >
              <PenTool size={14} strokeWidth={1.75} />
              <span>Desainer Denah</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowCustomBuildingStudio(true)}
              className="ios-btn"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                borderColor: 'var(--accent)'
              }}
              title="Buka Studio Bangunan & Tekstur Kustom"
            >
              <span>+ Rancang Gedung Sendiri</span>
            </button>

            {mode === 'prefab' && (
              <button
                onClick={handleRotate}
                className="ios-btn"
                style={{ padding: '4px 10px', fontSize: '12px' }}
                title="Putar Arah Bangunan 90° (R)"
                aria-label="Putar Bangunan"
              >
                <RotateCw size={14} strokeWidth={1.75} />
                <span>Putar 90°</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode 1: Prefab Catalog */}
        {mode === 'prefab' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[
                { id: 'all', label: 'Semua', icon: LayoutGrid },
                { id: 'residential', label: 'Hunian', icon: Home },
                { id: 'commercial', label: 'Komersial', icon: Building2 },
                { id: 'public', label: 'Fasilitas Umum', icon: Landmark }
              ].map((cat) => {
                const Icon = cat.icon;
                const isSel = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`segmented-item ${isSel ? 'active' : ''}`}
                    style={{ fontSize: '11px', padding: '3px 8px' }}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '2px'
              }}
            >
              {presets.map((p) => {
                const isSel = selectedKey === p.key;

                return (
                  <button
                    key={p.key}
                    onClick={() => handleSelectPreset(p.key)}
                    style={{
                      minWidth: '150px',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: '12px',
                      border: isSel ? '1.5px solid var(--accent)' : '0.5px solid var(--separator)',
                      background: isSel ? 'var(--fill-control-active)' : 'var(--surface)',
                      color: 'var(--label)',
                      transition: 'all 120ms ease-out',
                      outline: 'none'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>
                      {p.name}
                    </div>
                    <div className="tabular-nums" style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                      {p.defaultWidth}×{p.defaultLength}m • {p.defaultFloorCount} Lt
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* Mode 2: Custom Footprint Designer */}
        {mode === 'custom' && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isDrawingFootprint ? (
                <button
                  onClick={handleStartDrawFootprint}
                  className="ios-btn ios-btn-primary"
                  style={{ padding: '6px 14px' }}
                >
                  <PenTool size={14} strokeWidth={1.75} />
                  <span>Mulai Gambar Denah</span>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={handleFinishFootprint}
                    className="ios-btn"
                    style={{ background: 'var(--good)', color: '#ffffff' }}
                  >
                    <Check size={14} strokeWidth={2} />
                    <span>Selesai</span>
                  </button>
                  <button
                    onClick={handleCancelFootprint}
                    className="ios-btn ios-btn-destructive"
                  >
                    <X size={14} strokeWidth={2} />
                    <span>Batal</span>
                  </button>
                  <span style={{ fontSize: '11px', color: 'var(--label-secondary)', marginLeft: '4px' }}>
                    Klik titik sudut pada kisi tanah untuk membentuk poligon.
                  </span>
                </div>
              )}
            </div>

            {/* Quick Shape Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Bentuk Dasar:</span>
              <div className="segmented-control">
                <button
                  onClick={() => handleTemplateShape('rect')}
                  className="segmented-item"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Persegi
                </button>
                <button
                  onClick={() => handleTemplateShape('L')}
                  className="segmented-item"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Bentuk L
                </button>
                <button
                  onClick={() => handleTemplateShape('U')}
                  className="segmented-item"
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                >
                  Bentuk U
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
