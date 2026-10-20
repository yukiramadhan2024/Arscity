import React, { useState } from 'react';
import * as THREE from 'three';
import { useUIStore, MainToolType } from '../state/useUIStore';
import {
  MousePointer,
  Route,
  LayoutGrid,
  Building2,
  Trees,
  SlidersHorizontal,
  Undo2,
  Redo2,
  Search,
  RotateCw,
  X,
  Home,
  Coffee,
  ShoppingBag,
  GraduationCap,
  Hotel,
  PenTool,
  Minus,
  Spline,
  Sparkles,
  Droplets,
  Flower2,
  Grid,
  Waves,
  CircleDot,
  Droplet,
  Sun,
  Wind,
  CheckCircle2,
  Scissors,
  Ruler,
  LucideIcon,
  ShieldCheck,
  HeartPulse,
  Factory,
  Bus,
  Zap,
  Church
} from 'lucide-react';
import { ProceduralTextureGen } from '../../materials/ProceduralTextureGen';
import { BuildingCatalogRegistry, BuildingCategory, BuildingCatalogItem } from '../../buildings/BuildingCatalogRegistry';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { ZONE_RULES, ZoneType } from '../../zones/ZoneTypes';
import { AutoZoningService } from '../../zones/AutoZoningService';
import { LandscapeType } from '../../world/LandscapeManager';

interface ToolItem {
  id: MainToolType;
  label: string;
  icon: LucideIcon;
  hotkey: string;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: 'Select', icon: MousePointer, hotkey: 'V' },
  { id: 'road', label: 'Road', icon: Route, hotkey: 'R' },
  { id: 'zone', label: 'Zoning', icon: LayoutGrid, hotkey: 'Z' },
  { id: 'build', label: 'Building Catalog', icon: Building2, hotkey: 'B' },
  { id: 'nature', label: 'Landscape', icon: Trees, hotkey: 'T' },
  { id: 'analyze', label: 'Analysis', icon: SlidersHorizontal, hotkey: 'A' },
];



const LANDSCAPE_ITEMS: Array<{ type: LandscapeType; label: string; icon: LucideIcon }> = [
  { type: 'grass_garden', label: 'Taman Rumput', icon: Flower2 },
  { type: 'paving_block', label: 'Paving Block', icon: Grid },
  { type: 'shade_tree', label: 'Pohon Peneduh', icon: Trees },
  { type: 'river_segment', label: 'Sungai & Talud', icon: Waves },
  { type: 'retention_pond', label: 'Kolam Retensi', icon: Droplet },
  { type: 'bioswale_channel', label: 'Bioswale', icon: Spline },
  { type: 'well', label: 'Sumur Resapan', icon: Droplets },
  { type: 'biopore', label: 'Biopori', icon: CircleDot }
];

export const BottomToolbar: React.FC = () => {
  const {
    engine,
    activeTool,
    setActiveTool,
    canUndo,
    canRedo,
    setShowCustomBuildingStudio
  } = useUIStore();

  // Building Catalog Sub-tier state
  const [activeCategory, setActiveCategory] = useState<'all' | BuildingCategory>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBuildingKey, setSelectedBuildingKey] = useState<string>('joglo');

  // Road Sub-tier state
  const [roadType, setRoadType] = useState<RoadType>('collector');
  const [roadDrawMode, setRoadDrawMode] = useState<'straight' | 'bezier'>('straight');

  // Zone Sub-tier state
  const [activeZone, setActiveZone] = useState<ZoneType>('residential');
  const [activeLotSize, setActiveLotSize] = useState<string>('15×20m');

  const handleLotSizeChange = (w: number, l: number, label: string) => {
    setActiveLotSize(label);
    engine?.zoneTool.setLotSize(w, l);
  };

  // Landscape Sub-tier state
  const [activeLandscape, setActiveLandscape] = useState<LandscapeType>('grass_garden');

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
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });


  const handleSelectBuildingItem = (item: BuildingCatalogItem) => {
    setSelectedBuildingKey(item.id);
    engine?.buildingTool.setPreset(item.id);
  };

  const handleRotateBuilding = () => {
    engine?.buildingTool.rotate();
  };

  const handleRoadTypeSelect = (t: RoadType) => {
    setRoadType(t);
    engine?.roadTool.setRoadType(t);
  };

  const handleRoadDrawModeSelect = (m: 'straight' | 'bezier') => {
    setRoadDrawMode(m);
    engine?.roadTool.setDrawMode(m);
  };

  const handleZoneSelect = (z: ZoneType) => {
    setActiveZone(z);
    engine?.zoneTool.setZoneType(z);
  };

  const handleLandscapeSelect = (l: LandscapeType) => {
    setActiveLandscape(l);
    engine?.landscapeTool.setType(l);
  };

  const handleUndo = () => {
    engine?.commandManager.undo();
  };

  const handleRedo = () => {
    engine?.commandManager.redo();
  };

  return (
    <div
      className="interactive"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '10px',
        zIndex: 'var(--z-hud)' as any,
        userSelect: 'none',
        maxWidth: 'min(920px, calc(100vw - 380px))'
      }}
    >
      {/* Tier 1: Main Dock (Capsule Rounded-Full with 6 Tools) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          background: 'var(--surface)',
          backdropFilter: 'blur(var(--glass-blur))',
          WebkitBackdropFilter: 'blur(var(--glass-blur))',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-capsule)',
          boxShadow: 'var(--shadow-glass)',
          zIndex: 'var(--z-hud)' as any
        }}
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              onClick={() => {
                if (activeTool === tool.id && tool.id !== 'select') {
                  setActiveTool('select');
                } else {
                  setActiveTool(tool.id);
                }
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: isActive
                  ? '1px solid var(--accent)'
                  : '1px solid transparent',
                background: isActive
                  ? 'var(--accent-subtle)'
                  : 'transparent',
                boxShadow: isActive
                  ? '0 0 16px rgba(var(--accent-rgb, 10, 132, 255), 0.35)'
                  : 'none',
                color: isActive ? 'var(--accent)' : 'var(--label)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                minWidth: '58px'
              }}
              title={`${tool.label} (${tool.hotkey})`}
              aria-label={tool.label}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} style={{ color: isActive ? 'var(--accent)' : 'var(--label)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  color: isActive ? 'var(--accent)' : 'var(--label)'
                }}
              >
                {tool.label}
              </span>
            </button>
          );
        })}

        <div style={{ width: '1px', height: '24px', background: 'var(--separator)', margin: '0 4px' }} />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            disabled={!canUndo}
            onClick={handleUndo}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--label)',
              opacity: canUndo ? 0.9 : 0.3,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Batal (Ctrl + Z)"
            aria-label="Batal"
          >
            <Undo2 size={15} strokeWidth={2} />
          </button>
          <button
            disabled={!canRedo}
            onClick={handleRedo}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--label)',
              opacity: canRedo ? 0.9 : 0.3,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Ulangi (Ctrl + Y)"
            aria-label="Ulangi"
          >
            <Redo2 size={15} strokeWidth={2} />
          </button>
        </div>
      </div>



      {/* 2B. 'build' Mode: Full Building Catalog with Category Tabs & Search */}
      {activeTool === 'build' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 14px',
            background: 'var(--surface)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-glass)',
            zIndex: 'var(--z-hud)' as any,
            width: '100%'
          }}
        >
          {/* Controls Bar: Tabs, Search, Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            {/* Category Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isCatActive = activeCategory === cat.id;

                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: isCatActive ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                      background: isCatActive ? 'var(--accent-subtle)' : 'var(--fill-control)',
                      color: isCatActive ? 'var(--accent)' : 'var(--label)',
                      fontSize: '11px',
                      fontWeight: isCatActive ? 600 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={12} strokeWidth={1.8} style={{ color: isCatActive ? 'var(--accent)' : 'var(--label-secondary)' }} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Action Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline)',
                  borderRadius: '9999px',
                  padding: '3px 10px'
                }}
              >
                <Search size={13} style={{ color: 'var(--label-secondary)' }} />
                <input
                  type="text"
                  placeholder="Cari gedung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--label)',
                    fontSize: '11px',
                    width: '100px'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'transparent', border: 'none', color: 'var(--label-secondary)', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>

              <button
                onClick={handleRotateBuilding}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline)',
                  color: 'var(--label)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Putar Orientasi Bangunan (R)"
              >
                <RotateCw size={12} />
                <span>Putar (R)</span>
              </button>

              <button
                onClick={() => setShowCustomBuildingStudio(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  background: 'var(--accent-subtle)',
                  border: '1px solid var(--accent)',
                  color: 'var(--accent)',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
                title="Rancang Gedung Sendiri"
              >
                <PenTool size={12} />
                <span>+ Rancang</span>
              </button>

              <button
                onClick={() => setActiveTool('select')}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--fill-control)',
                  border: 'none',
                  color: 'var(--label-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                title="Tutup Katalog"
              >
                <X size={13} />
              </button>
            </div>
          </div>

          {/* Buildings Horizontal Card Carousel */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              overflowX: 'auto',
              padding: '4px 2px',
              maxHeight: '145px',
              scrollbarWidth: 'thin'
            }}
          >
            {filteredBuildings.slice(0, 36).map((item) => {
              const isSelected = selectedBuildingKey === item.id;
              const thumb = ProceduralTextureGen.getBuildingThumbnail(item.id, item.category, item.name);

              return (
                <div
                  key={item.id}
                  onClick={() => handleSelectBuildingItem(item)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flexShrink: 0,
                    width: '130px',
                    padding: '6px',
                    borderRadius: '14px',
                    background: isSelected
                      ? 'var(--accent-subtle)'
                      : 'var(--fill-control)',
                    border: isSelected
                      ? '1px solid var(--accent)'
                      : '1px solid var(--hairline)',
                    boxShadow: isSelected ? '0 0 12px rgba(var(--accent-rgb, 10, 132, 255), 0.3)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  title={item.description}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '56px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '5px',
                      background: '#090d16'
                    }}
                  >
                    <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '9px', color: 'var(--label-secondary)' }}>
                    {item.defaultWidth}×{item.defaultDepth}m • {item.defaultFloors} Lt
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2C. 'road' Mode: Integrated Road Profiles & Draw Mode */}
      {activeTool === 'road' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--surface)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-glass)',
            zIndex: 'var(--z-hud)' as any
          }}
        >
          {/* Straight vs Bezier */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'var(--fill-control)', borderRadius: '9999px', padding: '2px' }}>
            <button
              onClick={() => handleRoadDrawModeSelect('straight')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                background: roadDrawMode === 'straight' ? 'var(--accent-subtle)' : 'transparent',
                color: roadDrawMode === 'straight' ? 'var(--accent)' : 'var(--label)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Minus size={13} />
              <span>Lurus</span>
            </button>
            <button
              onClick={() => handleRoadDrawModeSelect('bezier')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                background: roadDrawMode === 'bezier' ? 'var(--accent-subtle)' : 'transparent',
                color: roadDrawMode === 'bezier' ? 'var(--accent)' : 'var(--label)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Spline size={13} />
              <span>Lengkung</span>
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

          {/* Road Profiles */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
            {(Object.keys(ROAD_PROFILES) as RoadType[]).map((rt) => {
              const prof = ROAD_PROFILES[rt];
              const isSel = roadType === rt;

              return (
                <button
                  key={rt}
                  onClick={() => handleRoadTypeSelect(rt)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: isSel ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                    background: isSel ? 'var(--accent-subtle)' : 'var(--fill-control)',
                    color: isSel ? 'var(--accent)' : 'var(--label)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {prof.name.split(' (')[0]}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTool('select')}
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--fill-control)', border: 'none', color: 'var(--label-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 2D. 'zone' Mode: Integrated Zoning Palette */}
      {activeTool === 'zone' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--surface)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-glass)',
            zIndex: 'var(--z-hud)' as any
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {(Object.keys(ZONE_RULES) as ZoneType[]).map((zt) => {
              const rule = ZONE_RULES[zt];
              const isSel = activeZone === zt;

              return (
                <button
                  key={zt}
                  onClick={() => handleZoneSelect(zt)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: isSel ? '1px solid var(--accent)' : '1px solid transparent',
                    background: isSel ? 'var(--fill-control-active)' : 'transparent',
                    color: isSel ? 'var(--label)' : 'var(--label-secondary)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: rule.color }} />
                  <span>{rule.name.split(' (')[0]}</span>
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

          {/* Lot Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Kavling:</span>
            {[
              { w: 12, l: 15, label: '12×15m' },
              { w: 15, l: 20, label: '15×20m' },
              { w: 20, l: 30, label: '20×30m' }
            ].map((sz) => {
              const isSel = activeLotSize === sz.label;
              return (
                <button
                  key={sz.label}
                  onClick={() => handleLotSizeChange(sz.w, sz.l, sz.label)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '9999px',
                    border: isSel ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                    background: isSel ? 'var(--accent-subtle)' : 'var(--fill-control)',
                    color: isSel ? 'var(--accent)' : 'var(--label)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer'
                  }}
                >
                  <span className="font-mono tabular-nums">{sz.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

          <button
            onClick={() => {
              if (!engine) return;
              const cmd = AutoZoningService.createAutoDevelopAllLotsCommand(engine);
              if (cmd) engine.executeCommand(cmd);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 10px',
              borderRadius: '9999px',
              background: 'rgba(52, 199, 89, 0.16)',
              border: '1px solid rgba(52, 199, 89, 0.4)',
              color: '#34c759',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            title="Bangun Seluruh Kavling Kosong Secara Otomatis"
          >
            <Sparkles size={12} />
            <span>Bangun Otomatis</span>
          </button>

          <button
            onClick={() => setActiveTool('select')}
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--fill-control)', border: 'none', color: 'var(--label-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 2E. 'nature' Mode: Integrated Landscape Palette */}
      {activeTool === 'nature' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'var(--surface)',
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-panel)',
            boxShadow: 'var(--shadow-glass)',
            zIndex: 'var(--z-hud)' as any
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
            {LANDSCAPE_ITEMS.map((item) => {
              const Icon = item.icon;
              const isSel = activeLandscape === item.type;

              return (
                <button
                  key={item.type}
                  onClick={() => handleLandscapeSelect(item.type)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    border: isSel ? '1px solid var(--accent)' : '1px solid var(--hairline)',
                    background: isSel ? 'var(--accent-subtle)' : 'var(--fill-control)',
                    color: isSel ? 'var(--accent)' : 'var(--label)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={13} strokeWidth={1.8} style={{ color: isSel ? 'var(--accent)' : 'var(--label-secondary)' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTool('select')}
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--fill-control)', border: 'none', color: 'var(--label-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}


    </div>
  );
};
