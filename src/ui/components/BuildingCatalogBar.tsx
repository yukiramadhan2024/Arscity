import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { BuildingCatalogRegistry, BuildingCategory, BuildingCatalogItem } from '../../buildings/BuildingCatalogRegistry';
import { UpdateBuildingParamCommand } from '../../core/commands/CityCommands';
import {
  RotateCw,
  Home,
  Building2,
  Landmark,
  LayoutGrid,
  PenTool,
  Check,
  X,
  Search,
  Coffee,
  Utensils,
  ShoppingBag,
  Store,
  GraduationCap,
  Library,
  BookOpen,
  Compass,
  Hotel,
  Bus,
  Train,
  Trees,
  Warehouse,
  Flame,
  Cross,
  Boxes,
  Film,
  ShieldCheck,
  Scale,
  Mail,
  HeartPulse,
  Factory,
  Plane,
  Ship,
  GitCommit,
  TrendingUp,
  Zap,
  Sun,
  Droplets,
  Recycle,
  Trash2,
  Radio,
  Church,
  Theater,
  Palette,
  Maximize2,
  Trophy,
  Dumbbell
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Home,
  Building2,
  Landmark,
  LayoutGrid,
  Coffee,
  Utensils,
  ShoppingBag,
  Store,
  GraduationCap,
  Library,
  BookOpen,
  Compass,
  Hotel,
  Bus,
  Train,
  Trees,
  Warehouse,
  Flame,
  Cross,
  Boxes,
  Film,
  ShieldCheck,
  Scale,
  Mail,
  HeartPulse,
  Factory,
  Plane,
  Ship,
  GitCommit,
  TrendingUp,
  Zap,
  Sun,
  Droplets,
  Recycle,
  Trash2,
  Radio,
  Church,
  Theater,
  Palette,
  Maximize2,
  Trophy,
  Dumbbell
};

function renderCatalogIcon(iconName: string, size = 14) {
  const IconComponent = ICON_MAP[iconName] || Building2;
  return <IconComponent size={size} strokeWidth={1.75} />;
}

export const BuildingCatalogBar: React.FC = () => {
  const { activeTool, engine, setShowCustomBuildingStudio } = useUIStore();
  const [mode, setMode] = useState<'prefab' | 'custom'>('prefab');
  const [activeCategory, setActiveCategory] = useState<'all' | BuildingCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedKey, setSelectedKey] = useState<string>('house_36');
  const [isDrawingFootprint, setIsDrawingFootprint] = useState<boolean>(false);

  if (activeTool !== 'build') return null;

  const allBuildings = BuildingCatalogRegistry.getAllBuildings();
  const totalCount = allBuildings.length;

  const categories: Array<{ id: 'all' | BuildingCategory; label: string; icon: React.ElementType }> = [
    { id: 'all', label: `Semua (${totalCount})`, icon: LayoutGrid },
    { id: 'hunian', label: 'Hunian', icon: Home },
    { id: 'pemerintahan_keamanan', label: 'Pemerintahan', icon: ShieldCheck },
    { id: 'pendidikan', label: 'Pendidikan', icon: GraduationCap },
    { id: 'kesehatan', label: 'Kesehatan', icon: HeartPulse },
    { id: 'perdagangan_jasa', label: 'Perdagangan & Jasa', icon: ShoppingBag },
    { id: 'industri_logistik', label: 'Industri & Logistik', icon: Factory },
    { id: 'transportasi', label: 'Transportasi', icon: Bus },
    { id: 'utilitas', label: 'Utilitas', icon: Zap },
    { id: 'ibadah_budaya', label: 'Ibadah & Budaya', icon: Church },
    { id: 'rekreasi_terbuka', label: 'Rekreasi & Terbuka', icon: Trees },
  ];

  const categoryBuildings = BuildingCatalogRegistry.getBuildingsByCategory(activeCategory);
  const filteredBuildings = categoryBuildings.filter((item) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

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
          maxWidth: '860px',
          width: '94%',
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
          color: '#F8FAFC'
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
            {/* Category Filter Pills and Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexWrap: 'nowrap'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                  scrollbarWidth: 'none',
                  flex: 1,
                  minWidth: 0
                }}
              >
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const isSel = activeCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`segmented-item ${isSel ? 'active' : ''}`}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)'
                      }}
                    >
                      <Icon size={12} strokeWidth={1.75} />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Search Input */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  position: 'relative',
                  width: '135px',
                  flexShrink: 0
                }}
              >
                <Search
                  size={12}
                  strokeWidth={1.75}
                  style={{
                    position: 'absolute',
                    left: '8px',
                    color: 'var(--label-secondary)',
                    pointerEvents: 'none'
                  }}
                />
                <input
                  type="text"
                  placeholder="Cari Bangunan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '3px 22px 3px 26px',
                    fontSize: '11px',
                    borderRadius: '8px',
                    width: '100%',
                    background: 'var(--surface)',
                    border: '0.5px solid var(--separator)',
                    color: 'var(--label)',
                    outline: 'none'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '6px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--label-secondary)',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex'
                    }}
                    title="Hapus Pencarian"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
            </div>

            {/* Horizontal Scrollable Building Cards */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '4px',
                minHeight: '58px'
              }}
            >
              {filteredBuildings.length === 0 ? (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--label-secondary)',
                    padding: '8px 12px'
                  }}
                >
                  Tidak ada bangunan yang cocok dengan kata kunci &ldquo;{searchQuery}&rdquo;.
                </div>
              ) : (
                filteredBuildings.map((p) => {
                  const isSel = selectedKey === p.id;

                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        handleSelectPreset(p.id);
                        const selBld = engine?.buildingManager.getSelectedBuilding();
                        if (selBld && engine) {
                          engine.buildingManager.revertBuildingPreview(selBld.id);
                          engine.executeCommand(
                            new UpdateBuildingParamCommand(
                              engine,
                              selBld.id,
                              {
                                width: selBld.width,
                                length: selBld.length,
                                floorCount: selBld.floorCount,
                                roofType: selBld.roofType
                              },
                              {
                                width: p.defaultWidth,
                                length: p.defaultLength ?? p.defaultDepth,
                                floorCount: p.defaultFloors ?? p.defaultFloorCount ?? 1,
                                roofType: (p.defaultRoofType || p.roofStyle || selBld.roofType) as any
                              },
                              `Terapkan Preset ${p.name}`
                            )
                          );
                        }
                      }}
                      onMouseEnter={() => {
                        const selBld = engine?.buildingManager.getSelectedBuilding();
                        if (selBld && engine) {
                          engine.buildingManager.previewBuildingChanges(selBld.id, {
                            width: p.defaultWidth,
                            length: p.defaultLength ?? p.defaultDepth,
                            floorCount: p.defaultFloors ?? p.defaultFloorCount ?? 1,
                            roofType: (p.defaultRoofType || p.roofStyle || selBld.roofType) as any
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        const selBld = engine?.buildingManager.getSelectedBuilding();
                        if (selBld && engine) {
                          engine.buildingManager.revertBuildingPreview(selBld.id);
                        }
                      }}
                      title={`${p.name}: ${p.description}`}
                      style={{
                        minWidth: '160px',
                        maxWidth: '200px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        borderRadius: '12px',
                        border: isSel ? '1.5px solid var(--accent)' : '0.5px solid var(--separator)',
                        background: isSel ? 'var(--fill-control-active)' : 'var(--surface)',
                        color: 'var(--label)',
                        transition: 'all 120ms ease-out',
                        outline: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        flexShrink: 0
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <span
                          style={{
                            color: isSel ? 'var(--accent)' : 'var(--label-secondary)',
                            display: 'inline-flex',
                            flexShrink: 0
                          }}
                        >
                          {renderCatalogIcon(p.icon, 13)}
                        </span>
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {p.name}
                        </span>
                      </div>
                      <div
                        className="tabular-nums"
                        style={{
                          fontSize: '11px',
                          color: 'var(--label-secondary)',
                          paddingLeft: '19px'
                        }}
                      >
                        {p.defaultWidth}×{p.defaultDepth}m • {p.defaultFloors} Lt
                      </div>
                    </button>
                  );
                })
              )}
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
