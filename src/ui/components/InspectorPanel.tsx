import React, { useState } from 'react';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { SPRING_SHEET } from '../motion/appleSprings';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { useUIStore } from '../state/useUIStore';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { RoofType, WallMaterialType } from '../../buildings/PrefabTypes';
import { BuildingCatalogRegistry } from '../../buildings/BuildingCatalogRegistry';
import { ZONE_RULES, ZoneType, BUILDING_CODE_DISCLAIMER } from '../../zones/ZoneTypes';
import { getWhyPrincipleForContext, WhyPrinciple } from '../../education/WhyPrinciples';
import { CustomSelect, SelectOption } from './CustomSelect';
import {
  RemoveBuildingCommand,
  RemoveRoadCommand,
  RemoveLotCommand,
  SetLotZoneCommand,
  UpdateBuildingParamCommand,
  UpdateRoadEdgeCommand
} from '../../core/commands/CityCommands';
import {
  X,
  Copy,
  Trash2,
  Route,
  Building,
  Eye,
  CheckCircle2,
  MapPin,
  AlertCircle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Coins,
  Layers,
  ShieldAlert,
  Hammer,
  Scissors,
  Sparkles,
  Droplets,
  Thermometer,
  Wind,
  Wand2,
  Sun,
  Zap,
  Activity,
  DraftingCompass
} from 'lucide-react';
import { structuralChecker } from '../../simulation/StructuralChecker';
import { costEstimator } from '../../simulation/CostEstimator';
import { runoffSimulator } from '../../simulation/RunoffSimulator';
import { AutoZoningService } from '../../zones/AutoZoningService';
import { AutoFixService } from '../../zones/AutoFixService';
import { roomStandardsRegistry } from '../../buildings/RoomStandards';
import { advancedBuildingCodeRegistry } from '../../zones/AdvancedBuildingCode';

const WhyCard: React.FC<{ principle: WhyPrinciple; targetPos?: THREE.Vector3 }> = ({ principle, targetPos }) => {
  const [open, setOpen] = useState<boolean>(false);
  const { engine, setTimeOfDay } = useUIStore();

  const handleSimulateInViewport = () => {
    if (!engine) return;
    // Set time to 15:00 WIB (afternoon sun on west facade)
    setTimeOfDay(15.0);
    engine.sunPathVisualizer?.setVisible(true);

    if (targetPos) {
      engine.cameraController.focusAt(targetPos, 28);
    }
  };

  return (
    <div className="inset-group" style={{ marginBottom: '12px' }}>
      <button
        onClick={() => setOpen(!open)}
        className="inset-row inset-row-clickable"
        style={{ width: '100%', border: 'none', textAlign: 'left' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HelpCircle size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
            Prinsip Arsitektur Tropis
          </span>
        </div>
        {open ? <ChevronUp size={15} strokeWidth={1.75} /> : <ChevronDown size={15} strokeWidth={1.75} />}
      </button>
      {open && (
        <div style={{ padding: '10px 14px 14px 14px', fontSize: '12px', color: 'var(--label)', lineHeight: 1.5, background: 'var(--surface)' }}>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{principle.question}</div>
          <div style={{ color: 'var(--label-secondary)', marginBottom: '8px' }}>{principle.explanation}</div>
          <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500, marginBottom: '10px' }}>
            {principle.architecturalRule}
          </div>
          <button
            onClick={handleSimulateInViewport}
            className="ios-btn"
            style={{
              width: '100%',
              padding: '6px 12px',
              fontSize: '12px',
              gap: '6px',
              background: 'rgba(0, 122, 255, 0.1)',
              color: 'var(--accent)',
              borderColor: 'rgba(0, 122, 255, 0.3)'
            }}
          >
            <Sparkles size={13} strokeWidth={1.75} />
            <span>Simulasikan di Viewport (15:00 WIB)</span>
          </button>
        </div>
      )}
    </div>
  );
};

export const InspectorPanel: React.FC = () => {
  const { engine, inspectorVisible, setInspectorVisible, setCustomBuildingModalOpen } = useUIStore();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showAdvancedPhysics, setShowAdvancedPhysics] = useState<boolean>(false);

  const selectedEdgeId = engine?.roadManager?.selectedEdgeId;
  const selectedBuilding = engine?.buildingManager?.getSelectedBuilding();
  const selectedLot = engine?.lotManager?.getSelectedLot();
  const hasSelection = Boolean(selectedEdgeId || selectedBuilding || selectedLot);

  // SimCity & Tahap 3: Only display when an object is selected on 3D canvas
  if (!hasSelection) {
    return null;
  }

  const targetLot = selectedLot || (selectedBuilding && engine?.lotManager ? engine.lotManager.getLotForBuilding(selectedBuilding.id) : null);
  const hasViolations = Boolean(targetLot && targetLot.violations.length > 0);

  const handleAutoFix = () => {
    if (!engine || !targetLot) return;
    const bld = targetLot.containedBuildingIds.length > 0
      ? engine.buildingManager.buildings.get(targetLot.containedBuildingIds[0])
      : selectedBuilding;
    if (bld) {
      AutoFixService.applyAutoFix(engine, targetLot, bld);
    }
  };

  // Compute metrics for the 4-block capsule
  let kdbDisplay = 54;
  let gsbDisplay = 'VALID';
  let isGsbValid = true;
  let kdhDisplay = 32;
  let tempDisplay = '28.5';

  if (selectedLot) {
    kdbDisplay = Math.round(selectedLot.metrics.kdbPercent || 54);
    kdhDisplay = Math.round(selectedLot.metrics.kdhPercent || 32);
    isGsbValid = !selectedLot.violations.some(v => v.code.startsWith('GSB'));
    gsbDisplay = isGsbValid ? 'VALID' : 'VIOLATION';
  } else if (selectedBuilding && engine?.lotManager) {
    const parentLot = engine.lotManager.getLotForBuilding(selectedBuilding.id);
    if (parentLot) {
      kdbDisplay = Math.round(parentLot.metrics.kdbPercent || 54);
      kdhDisplay = Math.round(parentLot.metrics.kdhPercent || 32);
      isGsbValid = !parentLot.violations.some(v => v.code.startsWith('GSB'));
      gsbDisplay = isGsbValid ? 'VALID' : 'VIOLATION';
    }
  }

  // If not expanded, always display the 1:1 Slim Vertical Capsule with Laboratorium Analisis frame
  if (!isExpanded) {
    return (
      <motion.aside
        className="inspector-panel interactive arscity-glass-bar"
        initial={{ opacity: 0, x: 28, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 28, scale: 0.96 }}
        transition={SPRING_SHEET}
        style={{
          transformOrigin: 'right center',
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '180px',
          background: 'var(--surface)',
          backdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
          WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(180%)',
          border: '1px solid var(--hairline)',
          borderRadius: '24px',
          boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.09), 0 20px 50px rgba(15, 23, 42, 0.16)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          zIndex: 'var(--z-hud)' as any,
          userSelect: 'none',
          color: 'var(--label)'
        }}
      >
        {/* Blok 1: KDB */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label-secondary)', letterSpacing: '0.04em' }}>KDB</span>
            <span className="font-mono tabular-nums font-bold" style={{ fontSize: '18px', color: 'var(--label)' }}>
              {kdbDisplay}%
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'var(--fill-control-active)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(5, kdbDisplay))}%`, height: '100%', background: '#34C759', borderRadius: '9999px' }} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--separator)' }} />

        {/* Blok 2: GSB */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label-secondary)', letterSpacing: '0.04em' }}>GSB</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {isGsbValid ? (
                <CheckCircle2 size={15} strokeWidth={2.2} style={{ color: 'var(--good)' }} />
              ) : (
                <AlertCircle size={15} strokeWidth={2.2} style={{ color: 'var(--bad)' }} />
              )}
              <span
                className="font-mono font-bold"
                style={{ fontSize: '12px', color: isGsbValid ? 'var(--good)' : 'var(--bad)', letterSpacing: '0.05em' }}
              >
                {gsbDisplay}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9.5px', color: 'var(--label-tertiary)', lineHeight: 1.2 }}>
            <span style={{ display: 'inline-block', width: '12px', height: '0', borderTop: `2px dashed ${isGsbValid ? 'var(--good)' : 'var(--bad)'}`, flexShrink: 0 }} />
            <span>{isGsbValid ? 'Garis putus hijau: Batas GSB aman' : 'Garis putus merah: Pelanggaran batas GSB'}</span>
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--separator)' }} />

        {/* Blok 3: KDH */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label-secondary)', letterSpacing: '0.04em' }}>KDH</span>
            <span className="font-mono tabular-nums font-bold" style={{ fontSize: '18px', color: 'var(--label)' }}>
              {kdhDisplay}%
            </span>
          </div>
          <div style={{ width: '100%', height: '5px', background: 'var(--fill-control-active)', borderRadius: '9999px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, Math.max(5, kdhDisplay))}%`, height: '100%', background: '#34C759', borderRadius: '9999px' }} />
          </div>
        </div>

        <div style={{ height: '1px', background: 'var(--separator)' }} />

        {/* Blok 4: Termometer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Thermometer size={16} strokeWidth={2.2} style={{ color: '#007AFF' }} />
            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label-secondary)' }}>SUHU</span>
          </div>
          <span className="font-mono tabular-nums font-bold" style={{ fontSize: '15px', color: 'var(--label)' }}>
            {tempDisplay}°C
          </span>
        </div>

        {/* SimCity 1-Click Action: Auto-Fix when violations exist */}
        {hasViolations && (
          <button
            onClick={handleAutoFix}
            style={{
              marginTop: '2px',
              padding: '7px 8px',
              background: 'rgba(52, 199, 89, 0.18)',
              border: '1px solid rgba(52, 199, 89, 0.45)',
              borderRadius: '12px',
              color: '#34C759',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              transition: 'all 0.2s ease',
              width: '100%'
            }}
            title="Koreksi Otomatis Pelanggaran Regulasi"
            aria-label="Koreksi Otomatis"
          >
            <Wand2 size={13} strokeWidth={2} />
            <span>Koreksi Otomatis</span>
          </button>
        )}

        <button
          onClick={() => setIsExpanded(true)}
          style={{
            marginTop: hasViolations ? '0px' : '2px',
            padding: '7px 8px',
            background: 'var(--accent)',
            border: 'none',
            borderRadius: '12px',
            color: '#FFFFFF',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            boxShadow: '0 2px 8px rgba(10, 132, 255, 0.35)',
            transition: 'all 0.15s ease',
            width: '100%'
          }}
          title="Buka Inspeksi Objek Terpilih"
          aria-label="Detail Objek"
        >
          <span>Detail Objek</span>
        </button>
      </motion.aside>
    );
  }

  // Expanded View: Full Inspector Details
  if (!engine) return null;

  // 1. Lot / Parcel Inspector
  if (selectedLot) {
    const lot = selectedLot;
    const rule = ZONE_RULES[lot.zone];
    const m = lot.metrics;
    const hasViolations = lot.violations.length > 0;

    const handleZoneChange = (z: ZoneType) => {
      engine.executeCommand(new SetLotZoneCommand(engine, lot.id, lot.zone, z));
    };

    const handleDeleteLot = () => {
      engine.executeCommand(new RemoveLotCommand(engine, lot));
      engine.lotManager.selectLot(null);
    };

    const handleClose = () => {
      setIsExpanded(false);
    };

    return (
      <motion.aside
        className="inspector-panel interactive arscity-glass-bar"
        initial={{ opacity: 0, x: 28, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 28, scale: 0.96 }}
        transition={SPRING_SHEET}
        style={{ transformOrigin: 'right center' }}
      >
        {/* Thin Glass Header */}
        <div className="glass-surface inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={16} strokeWidth={1.75} style={{ color: rule.color }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {lot.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                {rule.name}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="icon-btn" aria-label="Tutup Panel">
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Solid Inset Grouped Body */}
        <div className="inspector-body">
          {/* Status Row */}
          <div className="inset-group">
            <div className="inset-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {hasViolations ? (
                  <AlertCircle size={16} strokeWidth={1.75} style={{ color: 'var(--bad)' }} />
                ) : (
                  <ShieldCheck size={16} strokeWidth={1.75} style={{ color: 'var(--good)' }} />
                )}
                <span style={{ fontSize: '12px', fontWeight: 600, color: hasViolations ? 'var(--bad)' : 'var(--good)' }}>
                  {hasViolations ? `${lot.violations.length} Pelanggaran Regulasi` : 'Memenuhi Standar Regulasi'}
                </span>
              </div>
            </div>
          </div>

          {/* Building Code Metrics: Inset Group with Gauges */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">PARAMETER TATA RUANG</div>
          <div className="inset-group">
            {/* KDB */}
            <div
              className="inset-row inset-row-clickable"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px', cursor: 'pointer' }}
              onMouseEnter={() => {
                const bld = lot.containedBuildingIds.length > 0 ? engine.buildingManager.buildings.get(lot.containedBuildingIds[0]) : null;
                if (bld) engine.spatialHighlighter.highlightFootprint(bld);
              }}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">KDB (Kepadatan Dasar)</span>
                <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.kdbPercent > rule.maxKDB ? 'var(--bad)' : 'var(--good)' }}>
                  {m.kdbPercent.toFixed(1)}% / maks {rule.maxKDB}%
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, m.kdbPercent)}%`,
                    height: '100%',
                    background: m.kdbPercent > rule.maxKDB ? 'var(--bad)' : 'var(--good)',
                    borderRadius: '9999px',
                    transition: 'width 250ms ease-out'
                  }}
                />
              </div>
            </div>

            {/* KLB */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">KLB (Lantai Total)</span>
                <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.klbRatio > rule.maxKLB ? 'var(--bad)' : 'var(--label)' }}>
                  {m.klbRatio.toFixed(1)} / maks {rule.maxKLB}
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (m.klbRatio / Math.max(0.1, rule.maxKLB)) * 100)}%`,
                    height: '100%',
                    background: m.klbRatio > rule.maxKLB ? 'var(--bad)' : 'var(--accent)',
                    borderRadius: '9999px',
                    transition: 'width 250ms ease-out'
                  }}
                />
              </div>
            </div>

            {/* KDH */}
            <div
              className="inset-row inset-row-clickable"
              style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px', cursor: 'pointer' }}
              onMouseEnter={() => engine.spatialHighlighter.highlightGreenArea(lot)}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">KDH (Ruang Hijau Resapan)</span>
                <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.kdhPercent < rule.minKDH ? 'var(--bad)' : 'var(--good)' }}>
                  {m.kdhPercent.toFixed(1)}% / min {rule.minKDH}%
                </span>
              </div>
              <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, m.kdhPercent)}%`,
                    height: '100%',
                    background: m.kdhPercent < rule.minKDH ? 'var(--bad)' : 'var(--good)',
                    borderRadius: '9999px',
                    transition: 'width 250ms ease-out'
                  }}
                />
              </div>
            </div>

            {/* GSB Depan */}
            <div
              className="inset-row inset-row-clickable"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => engine.spatialHighlighter.highlightSetback(lot, 'front')}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">GSB Depan (ke Jalan)</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.gsbFrontActualM < rule.minGSBFront ? 'var(--bad)' : 'var(--good)' }}>
                {m.gsbFrontActualM.toFixed(1)} m / min {rule.minGSBFront.toFixed(1)} m
              </span>
            </div>

            {/* GSB Samping */}
            <div
              className="inset-row inset-row-clickable"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => engine.spatialHighlighter.highlightSetback(lot, 'side')}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">GSB Samping (Bebas Api)</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.gsbSideActualM < rule.minGSBSide ? 'var(--bad)' : 'var(--label)' }}>
                {m.gsbSideActualM.toFixed(1)} m / min {rule.minGSBSide.toFixed(1)} m
              </span>
            </div>

            {/* GSB Belakang */}
            <div
              className="inset-row inset-row-clickable"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => engine.spatialHighlighter.highlightSetback(lot, 'rear')}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">GSB Belakang</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: m.gsbRearActualM < rule.minGSBRear ? 'var(--bad)' : 'var(--label)' }}>
                {m.gsbRearActualM.toFixed(1)} m / min {rule.minGSBRear.toFixed(1)} m
              </span>
            </div>
          </div>

          {/* Area Metrics */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">LUAS & DIMENSI</div>
          <div className="inset-group">
            <div className="inset-row">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Luas Kavling</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: 'var(--label)' }}>
                {lot.areaM2.toFixed(1)} m²
              </span>
            </div>
            <div className="inset-row">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tapak Terbangun</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: 'var(--label)' }}>
                {m.groundFootprintM2.toFixed(1)} m²
              </span>
            </div>
          </div>

          {/* Violations Advice List */}
          {lot.violations.length > 0 && (
            <>
              <div className="inset-header" style={{ color: 'var(--bad)' }}>REKOMENDASI PERBAIKAN</div>
              {lot.violations.map((v, i) => (
                <div
                  key={i}
                  className="inset-group"
                  style={{ borderColor: 'rgba(255,59,48,0.3)', cursor: 'pointer' }}
                  onClick={() => {
                    const center = new THREE.Vector3(lot.position.x, 0, lot.position.z);
                    const size = new THREE.Vector3(lot.width, 4, lot.length);
                    engine.highlightViolation(center, size, 2000);
                  }}
                  title="Klik untuk menyorot lokasi kavling yang melanggar"
                >
                  <div className="inset-row" style={{ background: 'rgba(255,59,48,0.06)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bad)' }}>{v.title}</span>
                  </div>
                  <div style={{ padding: '8px 14px', fontSize: '12px', color: 'var(--label-secondary)', lineHeight: 1.4 }}>
                    {v.message}
                    <div style={{ marginTop: '4px', color: 'var(--accent)', fontWeight: 500 }}>
                      Saran: {v.advice}
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Change Zone Type */}
          <div className="inset-header">PERUNTUKAN ZONA</div>
          <div className="inset-group">
            <div className="inset-row" style={{ padding: '6px' }}>
              <CustomSelect<ZoneType>
                value={lot.zone}
                onChange={handleZoneChange}
                options={(Object.keys(ZONE_RULES) as ZoneType[]).map((zt) => ({
                  value: zt,
                  label: ZONE_RULES[zt].name
                }))}
              />
            </div>
          </div>

          {/* Lot Hydrology & Neighbor Runoff Spillover */}
          {(() => {
            const flood = runoffSimulator.evaluateLotFlooding(lot, engine.landscapeManager, 60.0, engine.lotManager);
            return (
              <>
                <div className="inset-header">HIDROLOGI KAWASAN & RESAPAN AIR</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Droplets size={15} strokeWidth={1.75} style={{ color: flood.riskLevel === 'safe' ? 'var(--good)' : flood.riskLevel === 'warning' ? 'var(--warn)' : 'var(--bad)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Genangan Air Hujan Ekstrem</span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: flood.riskLevel === 'safe' ? 'var(--good)' : flood.riskLevel === 'warning' ? 'var(--warn)' : 'var(--bad)' }}>
                      {flood.floodDepthCm.toFixed(1)} cm ({flood.riskLevel === 'safe' ? 'Aman' : flood.riskLevel === 'warning' ? 'Waspada' : 'Banjir'})
                    </span>
                  </div>
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Infrastruktur Resapan</span>
                    <span className="tabular-nums">{flood.wellCount} Sumur • {flood.bioporeCount} Biopori</span>
                  </div>
                  {flood.neighborRunoffSurplusM3Hr > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--bad)' }}>
                      <span>Beban Limpasan Air Tetangga</span>
                      <span className="tabular-nums">+{flood.neighborRunoffSurplusM3Hr.toFixed(1)} m³/jam</span>
                    </div>
                  )}
                  {flood.neighborAbsorptionAidM3Hr > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--good)' }}>
                      <span>Bantuan Serapan Air Tetangga</span>
                      <span className="tabular-nums">-{flood.neighborAbsorptionAidM3Hr.toFixed(1)} m³/jam</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* Why Principle Card */}
          <WhyCard principle={getWhyPrincipleForContext({ hasLotViolations: hasViolations })} targetPos={lot.position} />

          {/* Actions */}
          <div style={{ marginTop: '12px' }}>
            {/* Smart Auto-Fix Button */}
            {lot.containedBuildingIds && lot.containedBuildingIds.length > 0 && (() => {
              const bld = engine.buildingManager.buildings.get(lot.containedBuildingIds[0]);
              const canFix = bld && (hasViolations || AutoFixService.canAutoFix(lot, bld));
              if (!canFix) return null;
              return (
                <button
                  onClick={() => {
                    AutoFixService.applyAutoFix(engine, lot, bld);
                  }}
                  className="ios-btn ios-btn-primary"
                  style={{ width: '100%', height: '36px', marginBottom: '8px' }}
                >
                  <Wand2 size={15} strokeWidth={1.75} />
                  <span>Sesuaikan Otomatis ke Standar Regulasi</span>
                </button>
              );
            })()}

            {(!lot.containedBuildingIds || lot.containedBuildingIds.length === 0) && (
              <button
                onClick={() => {
                  const cmd = AutoZoningService.createAutoDevelopLotCommand(engine, lot.id);
                  if (cmd) engine.executeCommand(cmd);
                }}
                className="ios-btn ios-btn-primary"
                style={{ width: '100%', height: '36px', marginBottom: '8px' }}
              >
                <Sparkles size={15} strokeWidth={1.75} />
                <span>Kembangkan Kavling Otomatis</span>
              </button>
            )}
            <button
              onClick={() => setCustomBuildingModalOpen(true)}
              className="ios-btn"
              style={{ width: '100%', height: '36px', marginBottom: '8px' }}
              title="Studio Rancang Bangunan (Studio CAD)"
            >
              <DraftingCompass size={15} strokeWidth={1.75} />
              <span>Studio Rancang Bangunan (Studio CAD)</span>
            </button>
            <button
              onClick={handleDeleteLot}
              className="ios-btn ios-btn-destructive"
              style={{ width: '100%', height: '36px' }}
            >
              <Trash2 size={15} strokeWidth={1.75} />
              <span>Hapus Kavling Ini</span>
            </button>
          </div>

          {/* Educational Disclaimer */}
          <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: 'var(--radius-sub)', background: 'var(--fill-control)', fontSize: '11px', color: 'var(--label-secondary)', lineHeight: 1.4, textAlign: 'center' }}>
            {BUILDING_CODE_DISCLAIMER}
          </div>
        </div>
      </motion.aside>
    );
  }

  // 2. Building Inspector
  if (selectedBuilding) {
    const bld = selectedBuilding;

    const handleWidthChange = (val: number) => {
      engine.executeCommand(new UpdateBuildingParamCommand(engine, bld.id, { width: bld.width }, { width: val }, 'Ubah Lebar Bangunan'));
    };

    const handleLengthChange = (val: number) => {
      engine.executeCommand(new UpdateBuildingParamCommand(engine, bld.id, { length: bld.length }, { length: val }, 'Ubah Panjang Bangunan'));
    };

    const handleFloorCountChange = (val: number) => {
      engine.executeCommand(new UpdateBuildingParamCommand(engine, bld.id, { floorCount: bld.floorCount }, { floorCount: val }, 'Ubah Jumlah Lantai'));
    };

    const handleRoofChange = (roof: RoofType) => {
      engine.executeCommand(new UpdateBuildingParamCommand(engine, bld.id, { roofType: bld.roofType }, { roofType: roof }, 'Ubah Tipe Atap'));
    };

    const handleMaterialChange = (mat: WallMaterialType) => {
      engine.executeCommand(new UpdateBuildingParamCommand(engine, bld.id, { wallMaterial: bld.wallMaterial }, { wallMaterial: mat }, 'Ubah Material Dinding'));
    };

    const handleToggleSolarPv = () => {
      const nextVal = !bld.hasRooftopSolar;
      engine.executeCommand(
        new UpdateBuildingParamCommand(
          engine,
          bld.id,
          { hasRooftopSolar: bld.hasRooftopSolar },
          { hasRooftopSolar: nextVal },
          'Pasang Panel Surya Atap (Solar PV)'
        )
      );
    };

    const handleInspectFacade = () => {
      engine.cameraController.focusAt(bld.position, 30);
      engine.cameraController.isInspectMode = true;
    };

    const handleDeleteBuilding = () => {
      engine.executeCommand(new RemoveBuildingCommand(engine, bld));
      engine.buildingManager.selectBuilding(null);
    };

    const handleClose = () => {
      engine.buildingManager.selectBuilding(null);
    };

    const footprintArea = bld.width * bld.length;
    const totalFloorArea = footprintArea * bld.floorCount;
    const totalHeight = bld.floorCount * bld.floorHeight + 2.5;

    return (
      <motion.aside
        className="inspector-panel interactive arscity-glass-bar"
        initial={{ opacity: 0, x: 28, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 28, scale: 0.96 }}
        transition={SPRING_SHEET}
        style={{ transformOrigin: 'right center' }}
      >
        {/* Thin Glass Header */}
        <div className="glass-surface inspector-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {bld.name}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Parameter Bangunan
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="icon-btn" aria-label="Tutup Panel">
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Solid Inset Grouped Body */}
        <div className="inspector-body">
          {/* Mode Gambar Kerja Ortografis (Fitur v3.1) */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">GAMBAR KERJA ARSITEKTUR</div>
          <div className="inset-group" style={{ padding: '6px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
              <button
                onClick={() => engine?.setArchitecturalWorkMode('3d', bld)}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline-soft)',
                  color: 'var(--label)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
                title="Tampilan Perspektif 3D Orbit Bebas"
              >
                3D
              </button>
              <button
                onClick={() => engine?.setArchitecturalWorkMode('plan', bld)}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline-soft)',
                  color: 'var(--label)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
                title="Denah Ortografis Datar (Top-down Plan View)"
              >
                Denah
              </button>
              <button
                onClick={() => engine?.setArchitecturalWorkMode('section', bld)}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline-soft)',
                  color: 'var(--label)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
                title="Potongan Melintang A-A Vertikal Datar"
              >
                Potongan
              </button>
              <button
                onClick={() => engine?.setArchitecturalWorkMode('elevation', bld)}
                style={{
                  padding: '5px 2px',
                  borderRadius: '6px',
                  background: 'var(--fill-control)',
                  border: '1px solid var(--hairline-soft)',
                  color: 'var(--label)',
                  fontSize: '10px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
                title="Tampak Depan Ortografis Datar (Front Elevation)"
              >
                Tampak
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">METRIK BANGUNAN</div>
          <div className="inset-group">
            <div
              className="inset-row inset-row-clickable"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => engine.spatialHighlighter.highlightFootprint(bld)}
              onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
            >
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Luas Tapak</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: 'var(--label)' }}>
                {footprintArea.toFixed(1)} m²
              </span>
            </div>
            <div className="inset-row">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Luas Total Lantai</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: 'var(--label)' }}>
                {totalFloorArea.toFixed(1)} m²
              </span>
            </div>
            <div className="inset-row">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Tinggi Total</span>
              <span className="text-sm font-mono tabular-nums font-medium" style={{ color: 'var(--label)' }}>
                {totalHeight.toFixed(1)} m
              </span>
            </div>
          </div>

          {/* Sliders */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">DIMENSI & LANTAI</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Lebar</span>
                <span className="text-sm font-mono tabular-nums font-medium">{bld.width.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="4"
                max="35"
                step="1"
                value={bld.width}
                onPointerDown={() => engine?.setUIInteractionActive(true)}
                onPointerUp={() => engine?.setUIInteractionActive(false)}
                onChange={(e) => {
                  handleWidthChange(parseInt(e.target.value));
                  proceduralAudio.playTaptic('selection');
                }}
                className="ios-slider"
                aria-label="Lebar Bangunan"
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Panjang</span>
                <span className="text-sm font-mono tabular-nums font-medium">{bld.length.toFixed(1)} m</span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="1"
                value={bld.length}
                onPointerDown={() => engine?.setUIInteractionActive(true)}
                onPointerUp={() => engine?.setUIInteractionActive(false)}
                onChange={(e) => {
                  handleLengthChange(parseInt(e.target.value));
                  proceduralAudio.playTaptic('selection');
                }}
                className="ios-slider"
                aria-label="Panjang Bangunan"
              />
            </div>

            {(() => {
              const limits = BuildingCatalogRegistry.getFloorLimits(bld.presetKey);
              return (
                <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Jumlah Lantai</span>
                    <span className="text-sm font-mono tabular-nums font-medium">{bld.floorCount} Lantai</span>
                  </div>
                  <input
                    type="range"
                    min={limits.minFloors}
                    max={limits.maxFloors}
                    step="1"
                    value={bld.floorCount}
                    onPointerDown={() => engine?.setUIInteractionActive(true)}
                    onPointerUp={() => engine?.setUIInteractionActive(false)}
                    onChange={(e) => {
                      handleFloorCountChange(parseInt(e.target.value));
                      proceduralAudio.playTaptic('selection');
                    }}
                    className="ios-slider"
                    aria-label="Jumlah Lantai Bangunan"
                  />
                </div>
              );
            })()}
          </div>

          {/* Materials & Roof */}
          <div className="inset-header text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">ARSITEKTUR & MATERIAL</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tipe Atap</span>
              <CustomSelect<RoofType>
                value={bld.roofType}
                onChange={handleRoofChange}
                options={[
                  { value: 'gable', label: 'Pelana Tropis', description: 'Atap miring 2 sisi' },
                  { value: 'hip', label: 'Limasan Tropis', description: 'Atap perisai 4 sisi' },
                  { value: 'joglo', label: 'Joglo Tradisional', description: 'Atap brunjung bertingkat' },
                  { value: 'flat', label: 'Dak Datar Beton', description: 'Plat beton modern' },
                  { value: 'dome', label: 'Kubah', description: 'Kubah lengkung' }
                ]}
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px', padding: '10px 14px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tekstur Dinding</span>
              <CustomSelect<WallMaterialType>
                value={bld.wallMaterial}
                onChange={handleMaterialChange}
                options={[
                  { value: 'plaster', label: 'Plester & Cat Halus', badge: 'Halus' },
                  { value: 'brick', label: 'Bata Merah Ekspos', badge: 'Tekstur' },
                  { value: 'concrete', label: 'Beton Cor Board-Formed', badge: 'Brutalis' },
                  { value: 'wood', label: 'Kayu Jati Kisi Vertikal', badge: 'Tropis' }
                ]}
              />
            </div>
          </div>

          {/* TATA RUANG INTERIOR & DENAH RUANG */}
          <div className="inset-header">DENAH & TATA RUANG INTERIOR</div>
          <div className="inset-group">
            {bld.interiorLayouts && bld.interiorLayouts.length > 0 && bld.interiorLayouts[0].rooms.length > 0 ? (
              <>
                <div className="inset-row" style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--separator)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>Ruang (Lantai 1)</span>
                  <button
                    onClick={() => {
                      const isPlanActive = engine.sectionCutManager.currentMode === 'floor_plan';
                      if (isPlanActive) {
                        engine.sectionCutManager.setCutMode('none');
                        engine.floorPlanAnnotationOverlay?.setVisible(false);
                      } else {
                        engine.sectionCutManager.setCutHeight(1.8);
                        engine.sectionCutManager.setCutMode('floor_plan');
                        engine.floorPlanAnnotationOverlay?.setVisible(true, 1.8);
                      }
                    }}
                    className="ios-btn"
                    style={{ fontSize: '11px', padding: '3px 8px', gap: '4px' }}
                  >
                    <Scissors size={12} strokeWidth={1.75} />
                    <span>Mode Denah</span>
                  </button>
                </div>
                {bld.interiorLayouts[0].rooms.map((room, idx) => (
                  <div
                    key={idx}
                    className="inset-row inset-row-clickable"
                    style={{ justifyContent: 'space-between', padding: '6px 14px', cursor: 'pointer' }}
                    onMouseEnter={() => engine.spatialHighlighter.highlightRoom(bld, room.name)}
                    onMouseLeave={() => engine.spatialHighlighter.clearHighlight()}
                    onClick={() => {
                      const cos = Math.cos(bld.rotationY);
                      const sin = Math.sin(bld.rotationY);
                      const rx = bld.position.x + (room.labelPosition.x * cos - room.labelPosition.y * sin);
                      const rz = bld.position.z + (room.labelPosition.x * sin + room.labelPosition.y * cos);
                      const roomCenter = new THREE.Vector3(rx, 1.2, rz);
                      const roomSide = Math.max(2, Math.sqrt(room.areaM2));
                      const roomSize = new THREE.Vector3(roomSide, room.ceilingHeight || 3.0, roomSide);
                      engine.highlightViolation(roomCenter, roomSize, 2000);
                    }}
                    title="Klik untuk menyorot tata letak ruang ini"
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{room.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Plafon: <span className="tabular-nums">{room.ceilingHeight || 3.2}</span> m • {room.isCompliant ? '[SNI Lolos]' : '[SNI Di Bawah Standar]'}
                      </div>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: room.isCompliant ? 'var(--good)' : 'var(--warn)' }}>
                      {room.areaM2.toFixed(1)} m²
                    </span>
                  </div>
                ))}
              </>
            ) : (
              <div className="inset-row" style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>
                Denah interior sedang dibuat otomatis...
              </div>
            )}
          </div>

          {/* ANALISIS REKAYASA & FISIKA BANGUNAN (ACCORDION PROGRESSIVE DISCLOSURE) */}
          <div className="inset-group" style={{ marginTop: '12px', marginBottom: '8px' }}>
            <button
              onClick={() => setShowAdvancedPhysics(!showAdvancedPhysics)}
              className="inset-row inset-row-clickable"
              style={{ width: '100%', border: 'none', textAlign: 'left', justifyContent: 'space-between', cursor: 'pointer' }}
              aria-expanded={showAdvancedPhysics}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                  Analisis Rekayasa & Fisika
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  {showAdvancedPhysics ? 'Sembunyikan' : 'Buka Detail (5)'}
                </span>
                {showAdvancedPhysics ? <ChevronUp size={15} strokeWidth={1.75} /> : <ChevronDown size={15} strokeWidth={1.75} />}
              </div>
            </button>
          </div>

          {showAdvancedPhysics && (
            <>
              {/* KETAHANAN STRUKTUR & SEISMIK GEMPA */}
              {(() => {
                const s = structuralChecker.evaluateBuilding(bld);
                return (
                  <>
                    <div className="inset-header">KETAHANAN STRUKTUR & SEISMIK GEMPA</div>
                    <div className="inset-group">
                      <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={16} strokeWidth={1.75} style={{ color: s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)' }} />
                          <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Skor Ketahanan Seismik</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Acuan SNI 1726 & SNI 2847</div>
                      </div>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: s.score >= 75 ? 'var(--good)' : s.score >= 50 ? 'var(--warn)' : 'var(--bad)' }}>
                      {s.score}/100 ({s.rating})
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Bentang Terpanjang</span>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: s.maxSpanM > 6.0 ? 'var(--warn)' : 'var(--label)' }}>
                      {s.maxSpanM.toFixed(1)} m {s.maxSpanM > 6.0 ? '(Perlu Kolom Antara)' : '(Aman)'}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Rasio Bentuk Denah</span>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600 }}>
                      {s.aspectRatio}:1 {s.aspectRatio > 3 ? '(Pipih/Torsi Tinggi)' : '(Simetris Seimbang)'}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Pondasi & Beban Gedung</div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>{s.foundationType}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: s.isFoundationAdequate ? 'var(--good)' : 'var(--warn)' }}>
                        -{s.foundationDepthM.toFixed(1)} m ({bld.floorCount} Lantai)
                      </div>
                      <div style={{ fontSize: '10px', color: s.isFoundationAdequate ? 'var(--good)' : 'var(--bad)', fontWeight: 600 }}>
                        {s.isFoundationAdequate ? 'Aman (SNI 8460:2017)' : 'Pondasi Belum Memadai'}
                      </div>
                    </div>
                  </div>

                  {s.hasSoftStory && (
                    <div
                      className="inset-row inset-row-clickable"
                      style={{ background: 'rgba(255, 59, 48, 0.08)', cursor: 'pointer' }}
                      onClick={() => {
                        engine.highlightViolation(bld.position, new THREE.Vector3(bld.width + 1, 3.5, bld.length + 1), 2000);
                      }}
                      title="Klik untuk menyorot tingkat lunak (Soft Story)"
                    >
                      <AlertCircle size={15} strokeWidth={1.75} style={{ color: 'var(--bad)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--bad)', fontWeight: 500 }}>
                        Peringatan: Tingkat lunak (Soft Story) terdeteksi. Klik untuk menyorot lantai.
                      </span>
                    </div>
                  )}

                  <div className="inset-row" style={{ marginTop: '6px' }}>
                    <button
                      onClick={() => {
                        if (structuralChecker.isShaking()) {
                          structuralChecker.stopEarthquakeShakeTest();
                        } else {
                          structuralChecker.triggerEarthquakeShakeTest(engine);
                        }
                      }}
                      className="action-button-secondary"
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: structuralChecker.isShaking() ? 'rgba(255, 59, 48, 0.2)' : 'var(--fill-control)',
                        borderColor: structuralChecker.isShaking() ? 'var(--bad)' : 'var(--separator-opaque)',
                        color: structuralChecker.isShaking() ? 'var(--bad)' : 'var(--label)'
                      }}
                    >
                      <Activity size={14} strokeWidth={2} />
                      <span>{structuralChecker.isShaking() ? 'Hentikan Simulasi Gempa' : 'Simulasikan Gempa bumi Mw 6.3'}</span>
                    </button>
                  </div>

                  <div className="inset-footer">
                    Edukasi Gempa Yogyakarta 2006: Keruntuhan rumah terbanyak diakibatkan hilangnya ikatan ring balok dan kegagalan sambungan kolom-balok.
                  </div>
                </div>
              </>
            );
          })()}

          {/* ATURAN BANGUNAN LANJUTAN (T6.2: Tinggi vs Lebar Jalan & Tangga Darurat) */}
          {(() => {
            const violations = advancedBuildingCodeRegistry.evaluateBuilding(bld, engine.roadManager);
            const totalH = bld.floorCount * (bld.floorHeight || 3.2) + 2.5;
            const hasViolations = violations.length > 0;

            return (
              <>
                <div className="inset-header">ATURAN BANGUNAN LANJUTAN (T6)</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Tinggi vs Lebar Jalan</div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Permen PUPR: H maks ≤ {advancedBuildingCodeRegistry.config.heightToRoadWidthRatio}x lebar jalan
                      </div>
                    </div>
                    <span
                      className="tabular-nums"
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: violations.some(v => v.code === 'HEIGHT_TO_ROAD_WIDTH') ? 'var(--bad)' : 'var(--good)'
                      }}
                    >
                      {totalH.toFixed(1)} m {violations.some(v => v.code === 'HEIGHT_TO_ROAD_WIDTH') ? '(Melampaui Batas)' : '(Sesuai)'}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 600 }}>Tangga Darurat Kebakaran</div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Wajib untuk gedung ≥ {advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold} lantai
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: bld.floorCount >= advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold ? 'var(--warn)' : 'var(--good)'
                      }}
                    >
                      {bld.floorCount >= advancedBuildingCodeRegistry.config.emergencyStairsFloorThreshold ? 'Wajib Dilengkapi' : 'Tidak Wajib'}
                    </span>
                  </div>

                  {hasViolations && (
                    <div className="inset-row" style={{ background: 'rgba(255, 59, 48, 0.08)', flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                      {violations.map((v, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <AlertCircle size={14} style={{ color: 'var(--bad)', flexShrink: 0, marginTop: '2px' }} />
                          <div style={{ fontSize: '11px', color: 'var(--bad)', lineHeight: 1.4 }}>
                            <strong>{v.title}:</strong> {v.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* IKLIM MIKRO & DIFUSI TERMAL TROPIS */}
          {(() => {
            const tReport = engine.ventilationAnalyzer.analyzeBuilding(bld.id);
            if (!tReport) return null;
            return (
              <>
                <div className="inset-header">IKLIM MIKRO & DIFUSI TERMAL TROPIS</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Thermometer size={15} strokeWidth={1.75} style={{ color: tReport.comfortRating === 'Nyaman Alami' ? 'var(--good)' : tReport.comfortRating === 'Hangat' ? 'var(--warn)' : 'var(--bad)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Suhu Dalam Ruang</span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: tReport.comfortRating === 'Nyaman Alami' ? 'var(--good)' : 'var(--warn)' }}>
                      {tReport.indoorEstimatedTempC.toFixed(1)}°C (Luar: {tReport.outdoorTempC.toFixed(1)}°C)
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Ventilasi Silang (Cross-Vent)</span>
                    <span style={{ color: tReport.hasCrossVentilation ? 'var(--good)' : 'var(--warn)', fontWeight: 600 }}>
                      {tReport.hasCrossVentilation ? 'Tersedia (Optimal)' : 'Tidak Ada (Perlu Jendela)'}
                    </span>
                  </div>

                  {tReport.neighborhoodCoolingC > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--good)' }}>
                      <span>Efek Peneduh Kawasan Sekitar</span>
                      <span className="tabular-nums">-{tReport.neighborhoodCoolingC.toFixed(1)}°C</span>
                    </div>
                  )}

                  {tReport.neighborhoodHeatIslandC > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--bad)' }}>
                      <span>Beban Panas Urban Heat Island Tetangga</span>
                      <span className="tabular-nums">+{tReport.neighborhoodHeatIslandC.toFixed(1)}°C</span>
                    </div>
                  )}

                  {tReport.neighborhoodRunoffSurplusM3Hr > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--warn)' }}>
                      <span>Beban Limpasan Air Tetangga</span>
                      <span className="tabular-nums">+{tReport.neighborhoodRunoffSurplusM3Hr.toFixed(1)} m³/jam</span>
                    </div>
                  )}

                  {tReport.neighborhoodWaterAbsorptionAidM3Hr > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--good)' }}>
                      <span>Bantuan Resapan Air Tetangga</span>
                      <span className="tabular-nums">-{tReport.neighborhoodWaterAbsorptionAidM3Hr.toFixed(1)} m³/jam</span>
                    </div>
                  )}

                  {tReport.riverCoolingBonusC !== undefined && tReport.riverCoolingBonusC > 0 && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--accent)' }}>
                      <span>Bonus Sempadan Sungai (GSS Hijau)</span>
                      <span className="tabular-nums">-{tReport.riverCoolingBonusC.toFixed(1)}°C</span>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* PENCAHAYAAN ALAMI SIANG HARI (SNI 03-2396-2001) */}
          {(() => {
            const dl = engine.solarAnalyzer.evaluateDaylightAutonomy(bld);
            const statusColor = dl.status === 'optimal' ? 'var(--good)' : dl.status === 'adequate' ? 'var(--accent)' : 'var(--warn)';

            return (
              <>
                <div className="inset-header">PENCAHAYAAN ALAMI SIANG HARI (SNI 03-2396)</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Sun size={15} strokeWidth={1.75} style={{ color: statusColor }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Daylight Autonomy</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>Kecukupan Cahaya Alami</div>
                      </div>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: statusColor }}>
                      {dl.daylightAutonomyScore}% ({dl.statusLabel})
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Rasio Tebal / Tinggi Plafon</span>
                    <span className="tabular-nums">{dl.depthToHeightRatio}:1</span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Taman Dalam (Inner Courtyard)</span>
                    <span style={{ color: dl.hasCourtyard ? 'var(--good)' : 'var(--label)', fontWeight: 500 }}>
                      {dl.hasCourtyard ? 'Tersedia' : 'Tidak Ada'}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Bukaan Atap (Sawtooth / Skylight)</span>
                    <span style={{ color: dl.hasSkylightOrSawtooth ? 'var(--good)' : 'var(--label)', fontWeight: 500 }}>
                      {dl.hasSkylightOrSawtooth ? 'Tersedia' : 'Tidak Ada'}
                    </span>
                  </div>

                  {dl.recommendations.length > 0 && (
                    <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--label-secondary)', lineHeight: 1.4, borderTop: '1px solid var(--separator)' }}>
                      {dl.recommendations[0]}
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* PANEL SURYA ATAP (ROOFTOP SOLAR PV) */}
          {(() => {
            const solar = engine.solarAnalyzer.estimateRooftopSolar(bld);
            const isInstalled = Boolean(bld.hasRooftopSolar);

            return (
              <>
                <div className="inset-header">ENERGI MANDIRI: PANEL SURYA ATAP (SOLAR PV)</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Zap size={15} strokeWidth={1.75} style={{ color: isInstalled ? 'var(--accent)' : 'var(--label-secondary)' }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>Pasang Solar PV Atap</div>
                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                          Iradiasi Yogya: ~4.8 kWh/m²/hari
                        </div>
                      </div>
                    </div>
                    <label className="ios-switch">
                      <input
                        type="checkbox"
                        checked={isInstalled}
                        onChange={handleToggleSolarPv}
                        aria-label="Pasang Panel Surya Atap"
                      />
                      <span className="ios-switch-slider" />
                    </label>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Kapasitas Daya Puncak</span>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: isInstalled ? 'var(--accent)' : 'var(--label)' }}>
                      {solar.installedCapacityKwp} kWp
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Estimasi Produksi Energi</span>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: isInstalled ? 'var(--good)' : 'var(--label)' }}>
                      {solar.annualGenerationKwh.toLocaleString('id-ID')} kWh/tahun
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Potensi Hemat Tagihan Listrik 10 Thn</span>
                    <span className="tabular-nums" style={{ fontWeight: 600, color: 'var(--good)' }}>
                      {costEstimator.formatRupiah(solar.tenYearSavingsIdr)}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>Reduksi Emisi Karbon Bersih</span>
                    <span className="tabular-nums">{solar.co2ReductionTonsPerYear} ton CO₂/tahun</span>
                  </div>

                  <div className="inset-footer">
                    {isInstalled
                      ? 'Panel surya aktif memangkas pengeluaran operasional listrik (OPEX) gedung selama 10 tahun.'
                      : 'Aktifkan switch di atas untuk memotong biaya listrik AC dari anggaran OPEX gedung.'}
                  </div>
                </div>
              </>
            );
          })()}

          {/* ESTIMASI BIAYA BANGUNAN & SIKLUS HIDUP 10 TAHUN (CAPEX vs OPEX) */}
          {(() => {
            const cost = costEstimator.estimateBuildingCost(bld);
            const gradeColor = cost.tropicalEfficiencyGrade === 'A' ? 'var(--good)' : cost.tropicalEfficiencyGrade === 'B' ? 'var(--accent)' : cost.tropicalEfficiencyGrade === 'C' ? 'var(--warn)' : 'var(--bad)';

            return (
              <>
                <div className="inset-header">BIAYA SIKLUS HIDUP (CAPEX vs OPEX 10 TAHUN)</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Biaya Bangun Awal (CAPEX)</span>
                    </div>
                    <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>
                      {cost.formattedTotal}
                    </span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Struktur Beton & Pondasi</span>
                    <span className="tabular-nums">{costEstimator.formatRupiah(cost.structureCost)}</span>
                  </div>
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Dinding & Plesteran</span>
                    <span className="tabular-nums">{costEstimator.formatRupiah(cost.wallsCost)}</span>
                  </div>
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Rangka & Penutup Atap</span>
                    <span className="tabular-nums">{costEstimator.formatRupiah(cost.roofCost)}</span>
                  </div>
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Finishing Lantai & Plafon</span>
                    <span className="tabular-nums">{costEstimator.formatRupiah(cost.finishingCost)}</span>
                  </div>
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Listrik AC Bulanan</span>
                    <span className="tabular-nums">{cost.formattedMonthlyAcCost}</span>
                  </div>
                  {cost.hasSolarPv && (
                    <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--good)' }}>
                      <span>• Penghematan Solar PV (10 Tahun)</span>
                      <span className="tabular-nums">-{costEstimator.formatRupiah(cost.solarTenYearSavingsIdr)}</span>
                    </div>
                  )}
                  <div className="inset-row" style={{ justifyContent: 'space-between', fontSize: '11px', color: 'var(--label-secondary)' }}>
                    <span>• Estimasi OPEX 10 Tahun (Energi & Rawat)</span>
                    <span className="tabular-nums">{cost.formattedTenYearOpex}</span>
                  </div>

                  <div className="inset-row" style={{ justifyContent: 'space-between', borderTop: '1px solid var(--separator)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>Peringkat Efisiensi Tropis</span>
                    <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: gradeColor }}>
                      Grade {cost.tropicalEfficiencyGrade}
                    </span>
                  </div>

                  <div style={{ padding: '8px 14px', fontSize: '11px', color: 'var(--label-secondary)', lineHeight: 1.4 }}>
                    {cost.efficiencyExplanation}
                    {cost.tenYearSavingsVsBaselineIdr > 0 && (
                      <div style={{ marginTop: '4px', color: 'var(--good)', fontWeight: 600 }}>
                        Hemat {costEstimator.formatRupiah(cost.tenYearSavingsVsBaselineIdr)} dalam 10 tahun dibanding desain tanpa ventilasi.
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
            </>
          )}

          {/* Why Principle Card */}
          <WhyCard principle={getWhyPrincipleForContext({ isBuildingSelected: true, roofType: bld.roofType })} targetPos={bld.position} />

          {/* Smart Auto-Fix Button for Building */}
          {(() => {
            const lot = engine.lotManager?.getLotForBuilding(bld.id);
            const canFix = lot && (lot.violations.length > 0 || AutoFixService.canAutoFix(lot, bld));
            if (!canFix) return null;
            return (
              <button
                onClick={() => {
                  AutoFixService.applyAutoFix(engine, lot, bld);
                }}
                className="ios-btn ios-btn-primary"
                style={{ width: '100%', height: '36px', marginTop: '12px' }}
              >
                <Wand2 size={15} strokeWidth={1.75} />
                <span>Sesuaikan Otomatis ke Standar Regulasi</span>
              </button>
            );
          })()}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => setCustomBuildingModalOpen(true)}
              className="ios-btn"
              style={{ flex: 1, height: '36px' }}
              title="Studio Rancang Bangunan (Studio CAD)"
            >
              <DraftingCompass size={15} strokeWidth={1.75} />
              <span>Studio CAD</span>
            </button>
            <button
              onClick={handleInspectFacade}
              className="ios-btn"
              style={{ flex: 1, height: '36px' }}
            >
              <Eye size={15} strokeWidth={1.75} />
              <span>Inspeksi Fasad</span>
            </button>
            <button
              onClick={() => engine?.duplicateSelection()}
              className="ios-btn"
              style={{ height: '36px' }}
              title="Duplikasi Bangunan (Ctrl+D)"
              aria-label="Duplikasi Bangunan"
            >
              <Copy size={15} strokeWidth={1.75} />
            </button>
            <button
              onClick={handleDeleteBuilding}
              className="ios-btn ios-btn-destructive"
              style={{ height: '36px' }}
              title="Hapus Bangunan Ini"
              aria-label="Hapus Bangunan"
            >
              <Trash2 size={15} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </motion.aside>
    );
  }

  // 3. Road Inspector
  const edge = engine.roadManager.graph.edges.get(selectedEdgeId!);
  if (!edge) return null;

  const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };

  const handleTypeChange = (newType: RoadType) => {
    engine.executeCommand(new UpdateRoadEdgeCommand(engine, edge.id, { type: newType }));
  };

  const handleToggleTrees = () => {
    const cur = edge.customProfile?.hasTrees ?? profile.hasTrees;
    engine.executeCommand(new UpdateRoadEdgeCommand(engine, edge.id, { customProfile: { hasTrees: !cur } }));
  };

  const handleToggleLights = () => {
    const cur = edge.customProfile?.hasStreetLights ?? profile.hasStreetLights;
    engine.executeCommand(new UpdateRoadEdgeCommand(engine, edge.id, { customProfile: { hasStreetLights: !cur } }));
  };

  const handleDeleteRoad = () => {
    engine.executeCommand(new RemoveRoadCommand(engine, edge.id));
    engine.roadManager.selectEdge(null);
  };

  const handleCloseRoad = () => {
    engine.roadManager.selectEdge(null);
  };

  return (
    <motion.aside
      className="inspector-panel interactive arscity-glass-bar"
      initial={{ opacity: 0, x: 28, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 28, scale: 0.96 }}
      transition={SPRING_SHEET}
      style={{ transformOrigin: 'right center' }}
    >
      {/* Thin Glass Header */}
      <div className="glass-surface inspector-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Route size={16} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
              Properti Jalan
            </div>
            <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
              Ruas #{edge.id.slice(-4)}
            </div>
          </div>
        </div>
        <button onClick={handleCloseRoad} className="icon-btn" aria-label="Tutup Panel">
          <X size={15} strokeWidth={1.75} />
        </button>
      </div>

      {/* Solid Inset Grouped Body */}
      <div className="inspector-body">
        <div className="inset-header">KLASIFIKASI RUAS JALAN</div>
        <div className="inset-group">
          <div className="inset-row" style={{ padding: '6px' }}>
            <CustomSelect<RoadType>
              value={edge.type}
              onChange={handleTypeChange}
              options={(Object.keys(ROAD_PROFILES) as RoadType[]).map((t) => ({
                value: t,
                label: ROAD_PROFILES[t].name,
                badge: `${ROAD_PROFILES[t].width}m`
              }))}
            />
          </div>
        </div>

        <div className="inset-header">SPESIFIKASI TEKNIS</div>
        <div className="inset-group">
          <div className="inset-row">
            <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Lebar Badan Jalan</span>
            <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
              {profile.width} m ({profile.laneCount} Lajur)
            </span>
          </div>
          <div className="inset-row">
            <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Lebar Trotoar</span>
            <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
              {profile.sidewalkWidth > 0 ? `${profile.sidewalkWidth} m (Kiri & Kanan)` : 'Tanpa Trotoar'}
            </span>
          </div>
          <div className="inset-row">
            <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Panjang Ruas</span>
            <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
              {edge.length.toFixed(1)} m
            </span>
          </div>
          <div className="inset-row">
            <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Batas Kecepatan</span>
            <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
              {profile.speedLimit} km/jam
            </span>
          </div>
        </div>

        <div className="inset-header">PERLENGKAPAN JALAN TROPIS</div>
        <div className="inset-group">
          <div className="inset-row inset-row-clickable" onClick={handleToggleTrees}>
            <span style={{ fontSize: '13px' }}>Pohon Peneduh Trotoar</span>
            {profile.hasTrees ? (
              <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--good)' }} />
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tidak Ada</span>
            )}
          </div>
          <div className="inset-row inset-row-clickable" onClick={handleToggleLights}>
            <span style={{ fontSize: '13px' }}>Penerangan Jalan Umum</span>
            {profile.hasStreetLights ? (
              <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--good)' }} />
            ) : (
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tidak Ada</span>
            )}
          </div>
        </div>

        {/* Why Principle Card */}
        <WhyCard principle={getWhyPrincipleForContext({ isRoadSelected: true })} />

        {/* Delete */}
        <div style={{ marginTop: '12px' }}>
          <button
            onClick={handleDeleteRoad}
            className="ios-btn ios-btn-destructive"
            style={{ width: '100%', height: '36px' }}
          >
            <Trash2 size={15} strokeWidth={1.75} />
            <span>Hapus Ruas Jalan</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
};
