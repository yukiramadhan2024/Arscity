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
  LucideIcon
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

interface PresetCardItem {
  id: string;
  presetKey: 'joglo' | 'cafe' | 'noodle' | 'garden';
  buildingPreset?: string;
  tool: MainToolType;
  title: string;
  subtitle: string;
  focusBuildingId?: string;
}

const PRESET_CARDS: PresetCardItem[] = [
  {
    id: 'card_joglo',
    presetKey: 'joglo',
    buildingPreset: 'joglo',
    tool: 'build',
    title: 'Joglo Pavilion',
    subtitle: 'Traditional Modern',
    focusBuildingId: 'bld_joglo_yogyakarta'
  },
  {
    id: 'card_cafe',
    presetKey: 'cafe',
    buildingPreset: 'cafe_minimalis_kaca',
    tool: 'build',
    title: 'Tropical Cafe',
    subtitle: 'Commercial',
    focusBuildingId: 'bld_cafe_kopi_rasa'
  },
  {
    id: 'card_noodle',
    presetKey: 'noodle',
    buildingPreset: 'resto_mie_gacoan',
    tool: 'build',
    title: 'Noodle Restaurant',
    subtitle: 'Industrial',
    focusBuildingId: 'bld_mie_nusantara'
  },
  {
    id: 'card_garden',
    presetKey: 'garden',
    tool: 'nature',
    title: 'Garden Landscape',
    subtitle: 'Green Infrastructure',
  }
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

  const [activeCardId, setActiveCardId] = useState<string>('card_joglo');

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
    { id: 'kuliner_kafe', label: 'Kuliner & Kafe', icon: Coffee },
    { id: 'mall_ritel', label: 'Mall & Ritel', icon: ShoppingBag },
    { id: 'kampus_kos', label: 'Kampus & Kos', icon: GraduationCap },
    { id: 'budaya_hotel', label: 'Budaya & Hotel', icon: Hotel },
    { id: 'publik_hijau', label: 'Publik & Hijau', icon: Trees },
  ];

  const filteredBuildings = allBuildings.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCardClick = (card: PresetCardItem) => {
    setActiveCardId(card.id);
    setActiveTool(card.tool);

    if (engine) {
      if (card.buildingPreset) {
        engine.buildingTool.setPreset(card.buildingPreset);
        setSelectedBuildingKey(card.buildingPreset);
      }

      if (card.focusBuildingId) {
        const bld = engine.buildingManager.buildings.get(card.focusBuildingId);
        if (bld) {
          engine.cameraController.focusAt(bld.position.clone().add(new THREE.Vector3(0, 2.5, 0)), 32);
        }
      }
    }
  };

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
        zIndex: 45,
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
          background: 'rgba(15, 23, 42, 0.86)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          borderRadius: '9999px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          zIndex: 46
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
                  ? '1px solid rgba(56, 189, 248, 0.65)'
                  : '1px solid transparent',
                background: isActive
                  ? 'rgba(56, 189, 248, 0.25)'
                  : 'transparent',
                boxShadow: isActive
                  ? '0 0 16px rgba(56, 189, 248, 0.35)'
                  : 'none',
                color: isActive ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                minWidth: '58px'
              }}
              title={`${tool.label} (${tool.hotkey})`}
              aria-label={tool.label}
            >
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} style={{ color: isActive ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em'
                }}
              >
                {tool.label}
              </span>
            </button>
          );
        })}

        <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

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
              color: '#ffffff',
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
              color: '#ffffff',
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

      {/* Tier 2: Directly Below Main Dock (Zero Overlap & Zero Minimap Clash) */}
      {/* 2A. Default Idle or 'select' Mode: 4 Visual Preset Cards */}
      {activeTool === 'select' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45
          }}
        >
          {PRESET_CARDS.map((card) => {
            const isSelected = activeCardId === card.id;
            const thumbnail = ProceduralTextureGen.getPresetCardThumbnail(card.presetKey);

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  width: '136px',
                  padding: '6px',
                  borderRadius: '16px',
                  background: isSelected
                    ? 'rgba(56, 189, 248, 0.14)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isSelected
                    ? '1px solid rgba(56, 189, 248, 0.55)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: isSelected
                    ? '0 0 14px rgba(56, 189, 248, 0.28)'
                    : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '66px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    marginBottom: '6px',
                    background: '#0a0f1d'
                  }}
                >
                  <img
                    src={thumbnail}
                    alt={card.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {card.title}
                </div>
                <div style={{ fontSize: '9px', fontWeight: 500, color: '#38bdf8', letterSpacing: '0.01em' }}>
                  {card.subtitle}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2B. 'build' Mode: Full Building Catalog with Category Tabs & Search */}
      {activeTool === 'build' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45,
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
                      border: isCatActive ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid rgba(255, 255, 255, 0.08)',
                      background: isCatActive ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                      color: isCatActive ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                      fontSize: '11px',
                      fontWeight: isCatActive ? 600 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Icon size={12} strokeWidth={1.8} style={{ color: isCatActive ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)' }} />
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
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  borderRadius: '9999px',
                  padding: '3px 10px'
                }}
              >
                <Search size={13} style={{ color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Cari gedung..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#ffffff',
                    fontSize: '11px',
                    width: '100px'
                  }}
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.14)',
                  color: '#ffffff',
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
                  background: 'rgba(56, 189, 248, 0.18)',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  color: '#38bdf8',
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
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  color: '#94a3b8',
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
                      ? 'rgba(56, 189, 248, 0.16)'
                      : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected
                      ? '1px solid rgba(56, 189, 248, 0.65)'
                      : '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: isSelected ? '0 0 12px rgba(56, 189, 248, 0.3)' : 'none',
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
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div className="font-mono tabular-nums" style={{ fontSize: '9px', color: '#94a3b8' }}>
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
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45
          }}
        >
          {/* Straight vs Bezier */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.06)', borderRadius: '9999px', padding: '2px' }}>
            <button
              onClick={() => handleRoadDrawModeSelect('straight')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: 'none',
                background: roadDrawMode === 'straight' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                color: roadDrawMode === 'straight' ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
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
                background: roadDrawMode === 'bezier' ? 'rgba(56, 189, 248, 0.3)' : 'transparent',
                color: roadDrawMode === 'bezier' ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Spline size={13} />
              <span>Lengkung</span>
            </button>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

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
                    border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
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
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(226, 232, 240, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45
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
                    border: isSel ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid transparent',
                    background: isSel ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                    color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
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

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

          {/* Lot Size Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>Kavling:</span>
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
                    border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSel ? 'rgba(56, 189, 248, 0.22)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
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

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.15)' }} />

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
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(226, 232, 240, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45
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
                    border: isSel ? '1px solid rgba(56, 189, 248, 0.55)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: isSel ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                    color: isSel ? '#ffffff' : 'rgba(226, 232, 240, 0.85)',
                    fontSize: '11px',
                    fontWeight: isSel ? 600 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={13} strokeWidth={1.8} style={{ color: isSel ? '#38bdf8' : 'rgba(226, 232, 240, 0.85)' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setActiveTool('select')}
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(226, 232, 240, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* 2F. 'analyze' Mode: Quick Toggles (with AnalysisOverlay as Full Laboratory) */}
      {activeTool === 'analyze' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            background: 'rgba(15, 23, 42, 0.86)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.14)',
            borderRadius: '24px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.55)',
            zIndex: 45
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                if (engine?.sunPathVisualizer) {
                  engine.sunPathVisualizer.setVisible(!engine.sunPathVisualizer.isVisible);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Sun size={13} style={{ color: '#f59e0b' }} />
              <span>Busur Matahari</span>
            </button>

            <button
              onClick={() => {
                if (engine?.ventilationAnalyzer) {
                  engine.ventilationAnalyzer.setWindVisible(!engine.ventilationAnalyzer.isWindActive);
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Wind size={13} style={{ color: '#38bdf8' }} />
              <span>Pita Aliran Angin</span>
            </button>

            <button
              onClick={() => {
                if (engine?.lotManager) {
                  engine.lotManager.masterGroup.visible = !engine.lotManager.masterGroup.visible;
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <CheckCircle2 size={13} style={{ color: '#34c759' }} />
              <span>Batas Kavling & GSB</span>
            </button>
          </div>

          <button
            onClick={() => setActiveTool('select')}
            style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(226, 232, 240, 0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
