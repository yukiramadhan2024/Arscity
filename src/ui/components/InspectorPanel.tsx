import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { ROAD_PROFILES, RoadType } from '../../roads/RoadTypes';
import { RoofType, WallMaterialType } from '../../buildings/PrefabTypes';
import { ZONE_RULES, ZoneType, BUILDING_CODE_DISCLAIMER } from '../../zones/ZoneTypes';
import { getWhyPrincipleForContext, WhyPrinciple } from '../../education/WhyPrinciples';
import { CustomSelect, SelectOption } from './CustomSelect';
import {
  RemoveBuildingCommand,
  RemoveRoadCommand,
  RemoveLotCommand,
  SetLotZoneCommand,
  UpdateBuildingParamCommand
} from '../../core/commands/CityCommands';
import {
  X,
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
  Scissors
} from 'lucide-react';
import { structuralChecker } from '../../simulation/StructuralChecker';
import { costEstimator } from '../../simulation/CostEstimator';
import { roomStandardsRegistry } from '../../buildings/RoomStandards';
import { advancedBuildingCodeRegistry } from '../../zones/AdvancedBuildingCode';

const WhyCard: React.FC<{ principle: WhyPrinciple }> = ({ principle }) => {
  const [open, setOpen] = useState<boolean>(false);
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
          <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 500 }}>
            {principle.architecturalRule}
          </div>
        </div>
      )}
    </div>
  );
};

export const InspectorPanel: React.FC = () => {
  const { engine, inspectorVisible, setInspectorVisible } = useUIStore();

  const selectedEdgeId = engine?.roadManager?.selectedEdgeId;
  const selectedBuilding = engine?.buildingManager?.getSelectedBuilding();
  const selectedLot = engine?.lotManager?.getSelectedLot();

  if (!engine || !inspectorVisible || (!selectedEdgeId && !selectedBuilding && !selectedLot)) {
    return null;
  }

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
      engine.lotManager.selectLot(null);
    };

    return (
      <aside className="inspector-panel interactive">
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
          <div className="inset-header">PARAMETER TATA RUANG</div>
          <div className="inset-group">
            {/* KDB */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>KDB (Kepadatan Dasar)</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: m.kdbPercent > rule.maxKDB ? 'var(--bad)' : 'var(--good)' }}>
                  {m.kdbPercent}% / maks {rule.maxKDB}%
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--fill-control)', borderRadius: '9999px' }}>
                <div
                  style={{
                    width: `${Math.min(100, m.kdbPercent)}%`,
                    height: '100%',
                    background: m.kdbPercent > rule.maxKDB ? 'var(--bad)' : 'var(--good)',
                    borderRadius: '9999px'
                  }}
                />
              </div>
            </div>

            {/* KLB */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>KLB (Lantai Total)</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: m.klbRatio > rule.maxKLB ? 'var(--bad)' : 'var(--label)' }}>
                  {m.klbRatio} / maks {rule.maxKLB}
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--fill-control)', borderRadius: '9999px' }}>
                <div
                  style={{
                    width: `${Math.min(100, (m.klbRatio / rule.maxKLB) * 100)}%`,
                    height: '100%',
                    background: m.klbRatio > rule.maxKLB ? 'var(--bad)' : 'var(--accent)',
                    borderRadius: '9999px'
                  }}
                />
              </div>
            </div>

            {/* KDH */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>KDH (Ruang Hijau Resapan)</span>
                <span className="tabular-nums" style={{ fontWeight: 600, color: m.kdhPercent < rule.minKDH ? 'var(--bad)' : 'var(--good)' }}>
                  {m.kdhPercent}% / min {rule.minKDH}%
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'var(--fill-control)', borderRadius: '9999px' }}>
                <div
                  style={{
                    width: `${Math.min(100, m.kdhPercent)}%`,
                    height: '100%',
                    background: m.kdhPercent < rule.minKDH ? 'var(--bad)' : 'var(--good)',
                    borderRadius: '9999px'
                  }}
                />
              </div>
            </div>

            {/* GSB Depan */}
            <div className="inset-row">
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>GSB Depan (ke Jalan)</span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: m.gsbFrontActualM < rule.minGSBFront ? 'var(--bad)' : 'var(--good)' }}>
                {m.gsbFrontActualM} m / min {rule.minGSBFront} m
              </span>
            </div>

            {/* GSB Samping */}
            <div className="inset-row">
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>GSB Samping (Bebas Api)</span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: m.gsbSideActualM < rule.minGSBSide ? 'var(--bad)' : 'var(--label)' }}>
                {m.gsbSideActualM} m / min {rule.minGSBSide} m
              </span>
            </div>

            {/* GSB Belakang */}
            <div className="inset-row">
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>GSB Belakang</span>
              <span className="tabular-nums" style={{ fontSize: '12px', fontWeight: 600, color: m.gsbRearActualM < rule.minGSBRear ? 'var(--bad)' : 'var(--label)' }}>
                {m.gsbRearActualM} m / min {rule.minGSBRear} m
              </span>
            </div>
          </div>

          {/* Area Metrics */}
          <div className="inset-header">LUAS & DIMENSI</div>
          <div className="inset-group">
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Luas Kavling</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {lot.areaM2} m²
              </span>
            </div>
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Tapak Terbangun</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {m.groundFootprintM2} m²
              </span>
            </div>
          </div>

          {/* Violations Advice List */}
          {lot.violations.length > 0 && (
            <>
              <div className="inset-header" style={{ color: 'var(--bad)' }}>REKOMENDASI PERBAIKAN</div>
              {lot.violations.map((v, i) => (
                <div key={i} className="inset-group" style={{ borderColor: 'rgba(255,59,48,0.3)' }}>
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

          {/* Why Principle Card */}
          <WhyCard principle={getWhyPrincipleForContext({ hasLotViolations: hasViolations })} />

          {/* Actions */}
          <div style={{ marginTop: '12px' }}>
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
      </aside>
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
      <aside className="inspector-panel interactive">
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
          {/* Quick Metrics */}
          <div className="inset-header">METRIK BANGUNAN</div>
          <div className="inset-group">
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Luas Tapak</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {footprintArea} m²
              </span>
            </div>
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Luas Total Lantai</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {totalFloorArea} m²
              </span>
            </div>
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)' }}>Tinggi Total</span>
              <span className="tabular-nums" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                {totalHeight.toFixed(1)} m
              </span>
            </div>
          </div>

          {/* Sliders */}
          <div className="inset-header">DIMENSI & LANTAI</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Lebar</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{bld.width} m</span>
              </div>
              <input
                type="range"
                min="4"
                max="35"
                step="1"
                value={bld.width}
                onChange={(e) => handleWidthChange(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Lebar Bangunan"
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Panjang</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{bld.length} m</span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="1"
                value={bld.length}
                onChange={(e) => handleLengthChange(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Panjang Bangunan"
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Jumlah Lantai</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{bld.floorCount} Lantai</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={bld.floorCount}
                onChange={(e) => handleFloorCountChange(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Jumlah Lantai Bangunan"
              />
            </div>
          </div>

          {/* Materials & Roof */}
          <div className="inset-header">ARSITEKTUR & MATERIAL</div>
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
                  <div key={idx} className="inset-row" style={{ justifyContent: 'space-between', padding: '6px 14px' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500 }}>{room.name}</div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Plafon: {room.ceilingHeight || 3.2} m • {room.isCompliant ? '✓ Standar SNI' : '⚠ Di bawah SNI'}
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

                  {s.hasSoftStory && (
                    <div className="inset-row" style={{ background: 'rgba(255, 59, 48, 0.08)' }}>
                      <AlertCircle size={15} strokeWidth={1.75} style={{ color: 'var(--bad)' }} />
                      <span style={{ fontSize: '11px', color: 'var(--bad)', fontWeight: 500 }}>
                        Peringatan: Tingkat lunak (Soft Story) terdeteksi. Berikan bresing atau dinding geser.
                      </span>
                    </div>
                  )}

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

          {/* ESTIMASI BIAYA BANGUNAN (RAB) */}
          {(() => {
            const cost = costEstimator.estimateBuildingCost(bld);
            return (
              <>
                <div className="inset-header">ESTIMASI BIAYA BANGUNAN (RAB)</div>
                <div className="inset-group">
                  <div className="inset-row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Total Anggaran (RAB)</span>
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

                  <div className="inset-footer">
                    Label: Angka di atas adalah ilustrasi edukatif, bukan acuan harga pasar riil.
                  </div>
                </div>
              </>
            );
          })()}

          {/* Why Principle Card */}
          <WhyCard principle={getWhyPrincipleForContext({ isBuildingSelected: true, roofType: bld.roofType })} />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={handleInspectFacade}
              className="ios-btn"
              style={{ flex: 1, height: '36px' }}
            >
              <Eye size={15} strokeWidth={1.75} />
              <span>Inspeksi Fasad</span>
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
      </aside>
    );
  }

  // 3. Road Inspector
  const edge = engine.roadManager.graph.edges.get(selectedEdgeId!);
  if (!edge) return null;

  const profile = { ...ROAD_PROFILES[edge.type], ...edge.customProfile };

  const handleTypeChange = (newType: RoadType) => {
    edge.type = newType;
    engine.roadManager.rebuildEdgeMesh(edge.id);
  };

  const handleToggleTrees = () => {
    const cur = edge.customProfile?.hasTrees ?? profile.hasTrees;
    edge.customProfile = { ...edge.customProfile, hasTrees: !cur };
    engine.roadManager.rebuildEdgeMesh(edge.id);
  };

  const handleToggleLights = () => {
    const cur = edge.customProfile?.hasStreetLights ?? profile.hasStreetLights;
    edge.customProfile = { ...edge.customProfile, hasStreetLights: !cur };
    engine.roadManager.rebuildEdgeMesh(edge.id);
  };

  const handleDeleteRoad = () => {
    engine.executeCommand(new RemoveRoadCommand(engine, edge.id));
    engine.roadManager.selectEdge(null);
  };

  const handleCloseRoad = () => {
    engine.roadManager.selectEdge(null);
  };

  return (
    <aside className="inspector-panel interactive">
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
    </aside>
  );
};
