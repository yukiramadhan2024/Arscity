import React, { useState } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { SPRING_TACTILE, SPRING_SHEET, APPLE_PRESS, APPLE_HOVER } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';
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
  Church,
  Trash2
} from 'lucide-react';
import { ProceduralTextureGen } from '../../materials/ProceduralTextureGen';
import { BuildingCatalogRegistry, BuildingCategory, BuildingCatalogItem } from '../../buildings/BuildingCatalogRegistry';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { ZONE_RULES, ZoneType } from '../../zones/ZoneTypes';
import { AutoZoningService } from '../../zones/AutoZoningService';
import { LandscapeType } from '../../world/LandscapeManager';
import { LandscapeSubToolbar } from './LandscapeSubToolbar';
import { TerraformSubToolbar } from './TerraformSubToolbar';
import { MAIN_TOOLS_I18N } from '../constants/i18n';
import { ContextualHintBar } from './ContextualHintBar';

interface ToolItem {
  id: MainToolType;
  label: string;
  icon: LucideIcon;
  hotkey: string;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: MAIN_TOOLS_I18N.select.label, icon: MousePointer, hotkey: 'V' },
  { id: 'road', label: MAIN_TOOLS_I18N.road.label, icon: Route, hotkey: 'R' },
  { id: 'zone', label: MAIN_TOOLS_I18N.zone.label, icon: LayoutGrid, hotkey: 'Z' },
  { id: 'build', label: MAIN_TOOLS_I18N.build.label, icon: Building2, hotkey: 'B' },
  { id: 'nature', label: MAIN_TOOLS_I18N.nature.label, icon: Trees, hotkey: 'T' },
  { id: 'terraform', label: MAIN_TOOLS_I18N.terraform.label, icon: Waves, hotkey: 'W' },
  { id: 'demolish', label: MAIN_TOOLS_I18N.demolish.label, icon: Trash2, hotkey: 'X' },
  { id: 'analyze', label: MAIN_TOOLS_I18N.analyze.label, icon: SlidersHorizontal, hotkey: 'A' },
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

export const BottomToolbar: React.FC = React.memo(() => {
  const engine = useUIStore((s) => s.engine);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const canUndo = useUIStore((s) => s.canUndo);
  const canRedo = useUIStore((s) => s.canRedo);
  const setCustomBuildingModalOpen = useUIStore((s) => s.setCustomBuildingModalOpen);
  const setShowCustomBuildingStudio = useUIStore((s) => s.setShowCustomBuildingStudio);

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
    { id: 'all', label: 'Semua', icon: LayoutGrid },
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
        zIndex: 'var(--z-hud)' as any,
        userSelect: 'none'
      }}
    >
      {/* Contextual Hint Bar (Spec A5: Nama alat aktif + langkah berikutnya + Esc) */}
      <ContextualHintBar />

      {/* Tier 1: Main Dock (Capsule Rounded-Full with Tools) */}
      <div
        className="arscity-glass-bar"
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: 'var(--radius-capsule)',
          zIndex: 'var(--z-hud)' as any
        }}
      >
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <motion.button
              key={tool.id}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              onClick={() => {
                if (activeTool === tool.id && tool.id !== 'select') {
                  setActiveTool('select');
                } else {
                  setActiveTool(tool.id);
                }
              }}
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '6px 16px',
                borderRadius: '9999px',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#007AFF' : '#334155',
                cursor: 'pointer',
                minWidth: '58px',
                zIndex: 1
              }}
              title={`${tool.label} (${tool.hotkey})`}
              aria-label={tool.label}
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-dock-active-pill"
                  layout="position"
                  transition={SPRING_TACTILE}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    border: '1px solid rgba(0, 122, 255, 0.40)',
                    background: 'rgba(0, 122, 255, 0.14)',
                    boxShadow: '0 1px 4px rgba(0, 122, 255, 0.15)',
                    zIndex: -1
                  }}
                />
              )}
              <Icon size={18} strokeWidth={isActive ? 2.2 : 1.75} style={{ color: isActive ? '#007AFF' : '#334155' }} />
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  letterSpacing: '-0.01em',
                  color: isActive ? '#007AFF' : '#334155'
                }}
              >
                {tool.label}
              </span>
            </motion.button>
          );
        })}

        <div style={{ width: '1px', height: '24px', background: '#CBD5E1', margin: '0 4px' }} />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <motion.button
            whileTap={canUndo ? { scale: 0.92 } : undefined}
            whileHover={canUndo ? { scale: 1.08 } : undefined}
            onPointerDown={() => {
              if (canUndo) proceduralAudio.playTaptic('light');
            }}
            disabled={!canUndo}
            onClick={handleUndo}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: '#334155',
              opacity: canUndo ? 1 : 0.35,
              cursor: canUndo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Batal (Ctrl + Z)"
            aria-label="Batal"
          >
            <Undo2 size={15} strokeWidth={2} style={{ color: '#334155' }} />
          </motion.button>
          <motion.button
            whileTap={canRedo ? { scale: 0.92 } : undefined}
            whileHover={canRedo ? { scale: 1.08 } : undefined}
            onPointerDown={() => {
              if (canRedo) proceduralAudio.playTaptic('light');
            }}
            disabled={!canRedo}
            onClick={handleRedo}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: '#334155',
              opacity: canRedo ? 1 : 0.35,
              cursor: canRedo ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Ulangi (Ctrl + Y)"
            aria-label="Ulangi"
          >
            <Redo2 size={15} strokeWidth={2} style={{ color: '#334155' }} />
          </motion.button>
        </div>
      </div>



      {/* Sub-toolbar Container anchored above the dock with absolute positioning */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(100% + 10px)',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 'max-content',
          maxWidth: 'min(920px, calc(100vw - 380px))',
          pointerEvents: 'none',
          zIndex: 'var(--z-hud)' as any
        }}
      >
        <div style={{ pointerEvents: 'auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <AnimatePresence mode="popLayout">
            {/* 2B. 'build' Mode: Full Building Catalog with Category Tabs & Search */}
            {activeTool === 'build' && (
              <motion.div
                key="subtoolbar-build"
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 16 }}
                transition={SPRING_SHEET}
                style={{
                  transformOrigin: 'bottom center',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '20px',
                  zIndex: 'var(--z-hud)' as any,
                  width: '100%'
                }}
                className="arscity-glass-bar"
              >
                {/* Controls Bar: Tabs, Search, Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Category Tabs */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto', paddingBottom: '2px' }}>
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isCatActive = activeCategory === cat.id;

                      return (
                        <motion.button
                          key={cat.id}
                          whileTap={{ scale: 0.95 }}
                          onPointerDown={() => proceduralAudio.playTaptic('selection')}
                          onClick={() => setActiveCategory(cat.id)}
                          style={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            border: 'none',
                            background: 'transparent',
                            color: isCatActive ? '#007AFF' : '#475569',
                            fontSize: '11px',
                            fontWeight: isCatActive ? 700 : 500,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            zIndex: 1
                          }}
                        >
                          {isCatActive && (
                            <motion.div
                              layoutId="activeBuildingCategoryPill"
                              transition={SPRING_TACTILE}
                              style={{
                                position: 'absolute',
                                inset: 0,
                                borderRadius: '9999px',
                                border: '1px solid rgba(10, 132, 255, 0.35)',
                                background: 'rgba(10, 132, 255, 0.14)',
                                zIndex: -1
                              }}
                            />
                          )}
                          <Icon size={12} strokeWidth={1.8} style={{ color: isCatActive ? '#007AFF' : '#64748B' }} />
                          <span>{cat.label}</span>
                        </motion.button>
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
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        borderRadius: '9999px',
                        padding: '3px 10px'
                      }}
                    >
                      <Search size={13} style={{ color: '#64748B' }} />
                      <input
                        type="text"
                        placeholder="Cari gedung..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          color: '#0F172A',
                          fontSize: '11px',
                          width: '100px'
                        }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onPointerDown={() => proceduralAudio.playTaptic('light')}
                      onClick={handleRotateBuilding}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(255, 255, 255, 0.85)',
                        border: '1px solid rgba(15, 23, 42, 0.12)',
                        color: '#0F172A',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                      title="Putar Orientasi Bangunan (R)"
                    >
                      <RotateCw size={12} />
                      <span>Putar (R)</span>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onPointerDown={() => proceduralAudio.playTaptic('light')}
                      onClick={() => setCustomBuildingModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 10px',
                        borderRadius: '9999px',
                        background: 'rgba(10, 132, 255, 0.14)',
                        border: '1px solid rgba(10, 132, 255, 0.35)',
                        color: '#007AFF',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                      title="Studio Rancang Bangunan (Studio CAD)"
                    >
                      <PenTool size={12} />
                      <span>+ Rancang</span>
                    </motion.button>

                    <button
                      onClick={() => setActiveTool('select')}
                      onPointerDown={() => proceduralAudio.playTaptic('light')}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'rgba(15, 23, 42, 0.06)',
                        border: 'none',
                        color: '#64748B',
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
                      <motion.div
                        key={item.id}
                        whileTap={{ scale: 0.96 }}
                        whileHover={{ scale: 1.02 }}
                        onPointerDown={() => proceduralAudio.playTaptic('light')}
                        onClick={() => handleSelectBuildingItem(item)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          flexShrink: 0,
                          width: '130px',
                          padding: '6px',
                          borderRadius: '14px',
                          background: isSelected
                            ? 'rgba(10, 132, 255, 0.10)'
                            : 'rgba(255, 255, 255, 0.85)',
                          border: isSelected
                            ? '1.5px solid #007AFF'
                            : '1px solid rgba(15, 23, 42, 0.08)',
                          boxShadow: isSelected ? '0 0 12px rgba(10, 132, 255, 0.25)' : '0 2px 6px rgba(15, 23, 42, 0.04)',
                          cursor: 'pointer'
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
                            background: '#E2E8F0'
                          }}
                        >
                          <img src={thumb} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div className="font-mono tabular-nums" style={{ fontSize: '9px', color: '#64748B' }}>
                          {item.defaultWidth}×{item.defaultDepth}m • {item.defaultFloors} Lt
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

        {/* 2C. 'road' Mode: Integrated Road Profiles & Draw Mode */}
        {activeTool === 'road' && (
          <motion.div
            key="subtoolbar-road"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={SPRING_SHEET}
            style={{
              transformOrigin: 'bottom center',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              zIndex: 'var(--z-hud)' as any
            }}
            className="arscity-glass-bar"
          >
            {/* Straight vs Bezier with layoutId spring indicator */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: '#E2E8F0', borderRadius: '9999px', padding: '2px', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onPointerDown={() => proceduralAudio.playTaptic('selection')}
                onClick={() => handleRoadDrawModeSelect('straight')}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'transparent',
                  color: roadDrawMode === 'straight' ? '#007AFF' : '#475569',
                  fontSize: '11px',
                  fontWeight: roadDrawMode === 'straight' ? 700 : 500,
                  cursor: 'pointer',
                  zIndex: 1
                }}
              >
                {roadDrawMode === 'straight' && (
                  <motion.div
                    layoutId="activeRoadDrawModePill"
                    transition={SPRING_TACTILE}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.12)',
                      zIndex: -1
                    }}
                  />
                )}
                <Minus size={13} />
                <span>Lurus</span>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onPointerDown={() => proceduralAudio.playTaptic('selection')}
                onClick={() => handleRoadDrawModeSelect('bezier')}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: 'none',
                  background: 'transparent',
                  color: roadDrawMode === 'bezier' ? '#007AFF' : '#475569',
                  fontSize: '11px',
                  fontWeight: roadDrawMode === 'bezier' ? 700 : 500,
                  cursor: 'pointer',
                  zIndex: 1
                }}
              >
                {roadDrawMode === 'bezier' && (
                  <motion.div
                    layoutId="activeRoadDrawModePill"
                    transition={SPRING_TACTILE}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '9999px',
                      background: 'rgba(255, 255, 255, 0.95)',
                      boxShadow: '0 1px 4px rgba(15, 23, 42, 0.12)',
                      zIndex: -1
                    }}
                  />
                )}
                <Spline size={13} />
                <span>Lengkung</span>
              </motion.button>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'rgba(15, 23, 42, 0.12)' }} />

            {/* Road Profiles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', overflowX: 'auto' }}>
              {(Object.keys(ROAD_PROFILES) as RoadType[]).map((rt) => {
                const prof = ROAD_PROFILES[rt];
                const isSel = roadType === rt;

                return (
                  <motion.button
                    key={rt}
                    whileTap={{ scale: 0.95 }}
                    onPointerDown={() => proceduralAudio.playTaptic('selection')}
                    onClick={() => handleRoadTypeSelect(rt)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: isSel ? '1.5px solid #007AFF' : '1px solid rgba(15, 23, 42, 0.08)',
                      background: isSel ? 'rgba(10, 132, 255, 0.14)' : 'rgba(255, 255, 255, 0.85)',
                      color: isSel ? '#007AFF' : '#475569',
                      fontSize: '11px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {prof.name.split(' (')[0]}
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveTool('select')}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.06)', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </motion.div>
        )}

        {/* 2D. 'zone' Mode: Integrated Zoning Palette */}
        {activeTool === 'zone' && (
          <motion.div
            key="subtoolbar-zone"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={SPRING_SHEET}
            style={{
              transformOrigin: 'bottom center',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '20px',
              zIndex: 'var(--z-hud)' as any
            }}
            className="arscity-glass-bar"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {(Object.keys(ZONE_RULES) as ZoneType[]).map((zt) => {
                const rule = ZONE_RULES[zt];
                const isSel = activeZone === zt;

                return (
                  <motion.button
                    key={zt}
                    whileTap={{ scale: 0.95 }}
                    onPointerDown={() => proceduralAudio.playTaptic('selection')}
                    onClick={() => handleZoneSelect(zt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      borderRadius: '9999px',
                      border: isSel ? '1.5px solid #007AFF' : '1px solid rgba(15, 23, 42, 0.08)',
                      background: isSel ? 'rgba(255, 255, 255, 0.95)' : 'transparent',
                      color: isSel ? '#0F172A' : '#475569',
                      boxShadow: isSel ? '0 1px 4px rgba(15, 23, 42, 0.10)' : 'none',
                      fontSize: '11px',
                      fontWeight: isSel ? 700 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: rule.color }} />
                    <span>{rule.name.split(' (')[0]}</span>
                  </motion.button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '20px', background: 'rgba(15, 23, 42, 0.12)' }} />

            {/* Lot Size Selector with layoutId indicator */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Kavling:</span>
              <div style={{ display: 'flex', alignItems: 'center', background: '#E2E8F0', borderRadius: '9999px', padding: '2px', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
                {[
                  { w: 12, l: 15, label: '12×15m' },
                  { w: 15, l: 20, label: '15×20m' },
                  { w: 20, l: 30, label: '20×30m' }
                ].map((sz) => {
                  const isSel = activeLotSize === sz.label;
                  return (
                    <motion.button
                      key={sz.label}
                      whileTap={{ scale: 0.95 }}
                      onPointerDown={() => proceduralAudio.playTaptic('selection')}
                      onClick={() => handleLotSizeChange(sz.w, sz.l, sz.label)}
                      style={{
                        position: 'relative',
                        padding: '3px 8px',
                        borderRadius: '9999px',
                        border: 'none',
                        background: 'transparent',
                        color: isSel ? '#007AFF' : '#475569',
                        fontSize: '11px',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer',
                        zIndex: 1
                      }}
                    >
                      {isSel && (
                        <motion.div
                          layoutId="activeLotSizePill"
                          transition={SPRING_TACTILE}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            borderRadius: '9999px',
                            background: 'rgba(255, 255, 255, 0.95)',
                            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.12)',
                            zIndex: -1
                          }}
                        />
                      )}
                      <span className="font-mono tabular-nums">{sz.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'rgba(15, 23, 42, 0.12)' }} />

            <motion.button
              whileTap={{ scale: 0.95 }}
              onPointerDown={() => proceduralAudio.playTaptic('medium')}
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
                background: 'rgba(52, 199, 89, 0.14)',
                border: '1px solid rgba(52, 199, 89, 0.4)',
                color: '#248A3D',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Bangun Seluruh Kavling Kosong Secara Otomatis"
            >
              <Sparkles size={12} />
              <span>Bangun Otomatis</span>
            </motion.button>

            <button
              onClick={() => setActiveTool('select')}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(15, 23, 42, 0.06)', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <X size={12} />
            </button>
          </motion.div>
        )}

        {/* 2E. 'nature' Mode: Tabbed 24-Item Aesthetic Landscape Palette */}
        {activeTool === 'nature' && (
          <motion.div
            key="subtoolbar-nature"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={SPRING_SHEET}
            style={{ transformOrigin: 'bottom center', width: '100%' }}
          >
            <LandscapeSubToolbar />
          </motion.div>
        )}

        {/* 2F. 'terraform' Mode: River & Terrain Sculptor Subtoolbar */}
        {activeTool === 'terraform' && (
          <TerraformSubToolbar key="subtoolbar-terraform" />
        )}

        {/* 2G. 'demolish' Mode: SimCity Bulldozer Banner */}
        {activeTool === 'demolish' && (
          <motion.div
            key="subtoolbar-demolish"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={SPRING_SHEET}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 16px',
              borderRadius: '9999px',
              background: 'rgba(239, 68, 68, 0.14)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 8px 32px rgba(239, 68, 68, 0.20)',
              color: '#dc2626',
              fontSize: '12px',
              fontWeight: 600,
            }}
          >
            <Trash2 size={15} className="text-red-500 animate-pulse" />
            <span>Mode Buldoser: Klik gedung, jalan, pohon, atau alur sungai untuk menghancurkan</span>
            <button
              onClick={() => setActiveTool('select')}
              style={{
                marginLeft: '6px',
                padding: '3px 10px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#b91c1c',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              Selesai
            </button>
          </motion.div>
        )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
});
