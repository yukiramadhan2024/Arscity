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
  Church
} from 'lucide-react';
import { ProceduralTextureGen } from '../../materials/ProceduralTextureGen';
import { BuildingCatalogRegistry, BuildingCategory, BuildingCatalogItem } from '../../buildings/BuildingCatalogRegistry';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { ZONE_RULES, ZoneType } from '../../zones/ZoneTypes';
import { AutoZoningService } from '../../zones/AutoZoningService';
import { LandscapeType } from '../../world/LandscapeManager';
import { LandscapeSubToolbar } from './LandscapeSubToolbar';

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

export const BottomToolbar: React.FC = React.memo(() => {
  const engine = useUIStore((s) => s.engine);
  const activeTool = useUIStore((s) => s.activeTool);
  const setActiveTool = useUIStore((s) => s.setActiveTool);
  const canUndo = useUIStore((s) => s.canUndo);
  const canRedo = useUIStore((s) => s.canRedo);
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
        flexDirection: 'column-reverse',
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
                color: isActive ? 'var(--accent)' : 'var(--label)',
                cursor: 'pointer',
                minWidth: '58px',
                zIndex: 1
              }}
              title={`${tool.label} (${tool.hotkey})`}
              aria-label={tool.label}
            >
              {isActive && (
                <motion.div
                  layoutId="activeBottomToolPill"
                  transition={SPRING_TACTILE}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '9999px',
                    border: '1px solid var(--accent)',
                    background: 'var(--accent-subtle)',
                    boxShadow: '0 0 16px rgba(var(--accent-rgb, 10, 132, 255), 0.35)',
                    zIndex: -1
                  }}
                />
              )}
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
            </motion.button>
          );
        })}

        <div style={{ width: '1px', height: '24px', background: 'var(--separator)', margin: '0 4px' }} />

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
          </motion.button>
        </div>
      </div>



      {/* Sub-toolbars with Apple interruptible spring transitions & bottom origin morphing */}
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
                        color: isCatActive ? 'var(--accent)' : 'var(--label)',
                        fontSize: '11px',
                        fontWeight: isCatActive ? 600 : 500,
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
                            border: '1px solid var(--accent)',
                            background: 'var(--accent-subtle)',
                            zIndex: -1
                          }}
                        />
                      )}
                      <Icon size={12} strokeWidth={1.8} style={{ color: isCatActive ? 'var(--accent)' : 'var(--label-secondary)' }} />
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
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onPointerDown={() => proceduralAudio.playTaptic('light')}
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
                </motion.button>

                <button
                  onClick={() => setActiveTool('select')}
                  onPointerDown={() => proceduralAudio.playTaptic('light')}
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
                        ? 'var(--accent-subtle)'
                        : 'var(--fill-control)',
                      border: isSelected
                        ? '1px solid var(--accent)'
                        : '1px solid var(--hairline)',
                      boxShadow: isSelected ? '0 0 12px rgba(var(--accent-rgb, 10, 132, 255), 0.3)' : 'none',
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
              background: 'var(--surface)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              border: '1px solid var(--hairline)',
              borderRadius: 'var(--radius-panel)',
              boxShadow: 'var(--shadow-glass)',
              zIndex: 'var(--z-hud)' as any
            }}
          >
            {/* Straight vs Bezier with layoutId spring indicator */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', background: 'var(--fill-control)', borderRadius: '9999px', padding: '2px' }}>
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
                  color: roadDrawMode === 'straight' ? 'var(--accent)' : 'var(--label)',
                  fontSize: '11px',
                  fontWeight: 600,
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
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent)',
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
                  color: roadDrawMode === 'bezier' ? 'var(--accent)' : 'var(--label)',
                  fontSize: '11px',
                  fontWeight: 600,
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
                      background: 'var(--accent-subtle)',
                      border: '1px solid var(--accent)',
                      zIndex: -1
                    }}
                  />
                )}
                <Spline size={13} />
                <span>Lengkung</span>
              </motion.button>
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

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
                  </motion.button>
                );
              })}
            </div>

            <button
              onClick={() => setActiveTool('select')}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--fill-control)', border: 'none', color: 'var(--label-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
                  </motion.button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

            {/* Lot Size Selector with layoutId indicator */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Kavling:</span>
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
                      color: isSel ? 'var(--accent)' : 'var(--label)',
                      fontSize: '11px',
                      fontWeight: isSel ? 600 : 500,
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
                          border: '1px solid var(--accent)',
                          background: 'var(--accent-subtle)',
                          zIndex: -1
                        }}
                      />
                    )}
                    <span className="font-mono tabular-nums">{sz.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <div style={{ width: '1px', height: '20px', background: 'var(--separator)' }} />

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
            </motion.button>

            <button
              onClick={() => setActiveTool('select')}
              onPointerDown={() => proceduralAudio.playTaptic('light')}
              style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--fill-control)', border: 'none', color: 'var(--label-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
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
      </AnimatePresence>
    </div>
  );
});
