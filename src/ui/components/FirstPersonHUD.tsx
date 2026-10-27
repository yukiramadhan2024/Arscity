import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { DSLR_LENS_MAP, DslrLensType } from '../../core/engine/CinematicDroneController';
import {
  Camera,
  X,
  Footprints,
  Building2,
  ChevronUp,
  ChevronDown,
  Trash2,
  Sun,
  Wind,
  Volume2,
  Paintbrush,
  Ruler,
  Lightbulb,
  Sofa,
  Bed,
  Utensils,
  Laptop,
  Coffee,
  TreePine,
  Landmark,
  Bath,
  Layers,
  Wand2,
  Sparkles,
  Check,
  PackageOpen,
  HelpCircle
} from 'lucide-react';
import {
  FIRST_PERSON_FURNITURE_CATALOG,
  FIRST_PERSON_EXTERIOR_CATALOG,
  FIRST_PERSON_MATERIAL_PALETTE,
  FurnitureCatalogItem,
  ExteriorCatalogItem
} from '../../buildings/FirstPersonFurnitureCatalog';

export const FirstPersonHUD: React.FC = () => {
  const {
    cameraMode,
    setCameraMode,
    isPhotoMode,
    setIsPhotoMode,
    dslrLens,
    setDslrLens,
    captureDslrPhoto,
    isRecordingVideo,
    recordingSeconds,
    stopVideoRecording,
    engine
  } = useUIStore();

  const isFirstPerson = cameraMode === 'first_person';
  const isDrone = cameraMode === 'cinematic_drone';

  const [, setRefreshTrigger] = React.useState(0);
  const triggerRefresh = () => setRefreshTrigger((p) => p + 1);

  const [furnitureCategory, setFurnitureCategory] = React.useState<string>('all');
  const [exteriorCategory, setExteriorCategory] = React.useState<string>('all');
  const [showGuide, setShowGuide] = React.useState<boolean>(false);
  const [activeMetricExplanation, setActiveMetricExplanation] = React.useState<string | null>(null);
  const [showHotkeyHelp, setShowHotkeyHelp] = React.useState<boolean>(true);

  // Filtered lists for the studio drawer (Hooks called unconditionally at top)
  const filteredFurniture = React.useMemo(() => {
    if (furnitureCategory === 'all') return FIRST_PERSON_FURNITURE_CATALOG;
    return FIRST_PERSON_FURNITURE_CATALOG.filter((f) => f.category === furnitureCategory);
  }, [furnitureCategory]);

  const filteredExterior = React.useMemo(() => {
    if (exteriorCategory === 'all') return FIRST_PERSON_EXTERIOR_CATALOG;
    return FIRST_PERSON_EXTERIOR_CATALOG.filter((e) => e.category === exteriorCategory);
  }, [exteriorCategory]);

  React.useEffect(() => {
    if (!engine) return;
    const prevFp = engine.firstPersonController?.onStateChanged;
    const prevDrone = engine.cinematicDroneController?.onStateChanged;

    if (engine.firstPersonController) {
      engine.firstPersonController.onStateChanged = () => {
        triggerRefresh();
      };
    }
    if (engine.cinematicDroneController) {
      engine.cinematicDroneController.onStateChanged = () => {
        triggerRefresh();
      };
    }

    return () => {
      if (engine.firstPersonController) engine.firstPersonController.onStateChanged = prevFp;
      if (engine.cinematicDroneController) engine.cinematicDroneController.onStateChanged = prevDrone;
    };
  }, [engine, cameraMode]);

  if (!isFirstPerson && !isDrone && !isPhotoMode && !isRecordingVideo) {
    return null;
  }

  const formatRecTime = (sec: number): string => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fp = engine?.firstPersonController;
  const isLocked = fp?.isPointerLocked ?? false;
  const isDrawerOpen = fp?.isDrawerOpen ?? false;
  const isInsideBuilding = Boolean(fp?.insideBuildingId || fp?.insideBuildingName);
  const currentFloor = fp?.currentFloor ?? 1;
  const totalFloors = fp?.totalFloors ?? 1;
  const insideBuildingName = fp?.insideBuildingName ?? '';
  const roomMetrics = isInsideBuilding ? fp?.getCurrentRoomMetrics() : null;
  const isSeated = fp?.isSeated ?? false;

  const activeDockTab = fp?.activeDockTab ?? (isInsideBuilding ? 'furniture' : 'exterior');
  const selectedFurnitureId = fp?.selectedFurnitureId ?? 'sofa_l';
  const selectedExteriorId = fp?.selectedExteriorId ?? 'tree_tabebuya_pink';
  const selectedMaterialId = fp?.selectedMaterialId ?? 'wood_teak';
  const activeTool = fp?.activeTool ?? 'pointer';
  const isPlacementValid = fp?.isPlacementValid ?? false;
  const reticleActionLabel = fp?.reticleActionLabel ?? null;

  // 9 Hotbar items depending on environment
  const hotbarItems = isInsideBuilding
    ? FIRST_PERSON_FURNITURE_CATALOG.slice(0, 9)
    : FIRST_PERSON_EXTERIOR_CATALOG.slice(0, 9);

  const getFurnitureIcon = (cat: string) => {
    switch (cat) {
      case 'living': return <Sofa size={14} strokeWidth={2} />;
      case 'bedroom': return <Bed size={14} strokeWidth={2} />;
      case 'dining': return <Utensils size={14} strokeWidth={2} />;
      case 'office': return <Laptop size={14} strokeWidth={2} />;
      case 'commercial': return <Coffee size={14} strokeWidth={2} />;
      case 'bathroom': return <Bath size={14} strokeWidth={2} />;
      default: return <Layers size={14} strokeWidth={2} />;
    }
  };

  const getExteriorIcon = (cat: string) => {
    switch (cat) {
      case 'building': return <Building2 size={14} strokeWidth={2} />;
      case 'flora': return <TreePine size={14} strokeWidth={2} />;
      default: return <Landmark size={14} strokeWidth={2} />;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
        overflow: 'hidden'
      }}
    >
      {/* 1. Sleek Keybinds Cheat Sheet HUD Capsule (Top Center) */}
      {isFirstPerson && !isPhotoMode && (
        <div
          className="glass-surface glass-capsule"
          style={{
            position: 'absolute',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '5px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
            fontSize: '11px',
            color: '#0F172A',
            fontWeight: 600,
            pointerEvents: 'auto',
            borderRadius: '9999px',
            whiteSpace: 'nowrap'
          }}
        >
          {showHotkeyHelp ? (
            <>
              <button
                onClick={() => {
                  if (fp) fp.toggleDrawer();
                  triggerRefresh();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#007AFF',
                  fontWeight: 700,
                  padding: 0
                }}
              >
                <PackageOpen size={13} strokeWidth={2.2} />
                <span>[Tab] Katalog</span>
              </button>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[1-9]</b> Slot</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[R]</b> Putar</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[Klik]</b> Pasang</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[F]</b> Duduk</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[X]</b> Hapus</span>
              <span style={{ color: '#CBD5E1' }}>•</span>
              <span><b style={{ color: '#007AFF' }}>[Esc]</b> Kursor</span>
            </>
          ) : (
            <span style={{ color: '#64748B' }}>Pejalan Kaki Aktif</span>
          )}

          <div style={{ width: '1px', height: '14px', background: '#E2E8F0', margin: '0 2px' }} />

          {/* Toggle / Help Button */}
          <button
            type="button"
            onClick={() => setShowGuide(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              background: 'rgba(0, 122, 255, 0.12)',
              border: 'none',
              color: '#007AFF',
              cursor: 'pointer'
            }}
            title="Buka Panduan Kontrol Lengkap (?)"
          >
            <HelpCircle size={12} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* 2. Precision Interactive Aiming Reticle (Center Screen) */}
      {isFirstPerson && !isPhotoMode && !isDrawerOpen && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          {/* Aiming Ring & Dot */}
          <div
            style={{
              position: 'relative',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: isPlacementValid || activeTool !== 'pointer'
                ? '2px solid #007AFF'
                : '1.5px solid rgba(255, 255, 255, 0.85)',
              boxShadow: isPlacementValid || activeTool !== 'pointer'
                ? '0 0 10px rgba(0, 122, 255, 0.75)'
                : '0 0 4px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <div
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: isPlacementValid || activeTool !== 'pointer' ? '#007AFF' : '#FFFFFF'
              }}
            />
          </div>

          {/* Contextual Reticle Action Badge */}
          {reticleActionLabel && (
            <div
              style={{
                padding: '5px 12px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(16px)',
                border: isPlacementValid ? '1px solid rgba(0, 122, 255, 0.35)' : '1px solid #CBD5E1',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.12)',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                color: isPlacementValid ? '#007AFF' : '#EF4444',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isPlacementValid && <Check size={12} strokeWidth={2.5} />}
              <span>{reticleActionLabel}</span>
            </div>
          )}
        </div>
      )}

      {/* 3. Recording Status Badge */}
      {isRecordingVideo && (
        <div
          className="glass-surface glass-capsule"
          style={{
            position: 'absolute',
            top: '76px',
            left: '24px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            border: '1px solid #ff3b30',
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#ff3b30',
              animation: 'pulse 1s infinite'
            }}
          />
          <span
            className="tabular-nums"
            style={{ fontSize: '12px', fontWeight: 700, color: '#ff3b30', letterSpacing: '0.05em' }}
          >
            REC {formatRecTime(recordingSeconds)}
          </span>
          <button
            onClick={stopVideoRecording}
            className="ios-btn"
            style={{
              padding: '2px 8px',
              fontSize: '11px',
              background: '#ff3b30',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              marginLeft: '4px'
            }}
          >
            Selesai
          </button>
        </div>
      )}

      {/* 4. Telemetry Card: Indoor Micro-Room OR Outdoor Street Mode (Top Left) */}
      {isFirstPerson && !isPhotoMode && (
        <div
          className="glass-surface interactive"
          style={{
            position: 'absolute',
            top: '76px',
            left: '24px',
            width: isInsideBuilding ? '290px' : '260px',
            borderRadius: '16px',
            padding: '12px 14px',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 30px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.95)',
            background: 'rgba(255, 255, 255, 0.92)',
            backdropFilter: 'blur(24px) saturate(180%)'
          }}
        >
          {isInsideBuilding && roomMetrics ? (
            <>
              {/* Header: Building & Floor & Room */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #E2E8F0',
                  paddingBottom: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={16} strokeWidth={2} style={{ color: '#007AFF' }} />
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      {insideBuildingName || 'Bangunan'}
                    </div>
                    <div style={{ fontSize: '10px', color: '#475569' }}>
                      Lantai {currentFloor} dari {totalFloors} • {roomMetrics.roomName}
                    </div>
                  </div>
                </div>
              </div>

              {/* Environmental Telemetry Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                {/* Lux */}
                <div
                  onClick={() => setActiveMetricExplanation('lux')}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s ease' }}
                  title="Klik untuk penjelasan standar pencahayaan SNI"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#475569', fontSize: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Sun size={12} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
                      <span>Cahaya</span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#007AFF' }}>Kenapa?</span>
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {roomMetrics.lux} Lux
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: roomMetrics.lux >= 200 ? '#10b981' : '#f59e0b' }}>
                    {roomMetrics.lux >= 200 ? 'Terang Cukup (SNI)' : 'Cahaya Redup'}
                  </div>
                </div>

                {/* ACH Ventilation */}
                <div
                  onClick={() => setActiveMetricExplanation('ach')}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s ease' }}
                  title="Klik untuk penjelasan standar ventilasi SNI"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#475569', fontSize: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Wind size={12} strokeWidth={1.75} style={{ color: '#007AFF' }} />
                      <span>Ventilasi</span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#007AFF' }}>Kenapa?</span>
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {roomMetrics.ach} ACH
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: roomMetrics.ach >= 4 ? '#10b981' : '#f59e0b' }}>
                    {roomMetrics.ach >= 4 ? 'Ventilasi Baik (SNI)' : 'Sirkulasi Rendah'}
                  </div>
                </div>

                {/* Temperature */}
                <div
                  onClick={() => setActiveMetricExplanation('temp')}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s ease' }}
                  title="Klik untuk penjelasan standar kenyamanan termal SNI"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#475569', fontSize: '10px' }}>
                    <span style={{ color: '#475569' }}>Suhu Ruang</span>
                    <span style={{ fontSize: '9px', color: '#007AFF' }}>Kenapa?</span>
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {roomMetrics.temperatureC.toFixed(1)}°C
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: roomMetrics.temperatureC <= 27.5 ? '#10b981' : '#f59e0b' }}>
                    {roomMetrics.temperatureC <= 27.5 ? 'Termal Nyaman' : 'Hangat'}
                  </div>
                </div>

                {/* Noise dBA */}
                <div
                  onClick={() => setActiveMetricExplanation('noise')}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '6px 8px', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.12s ease' }}
                  title="Klik untuk penjelasan standar akustik SNI"
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#475569', fontSize: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Volume2 size={12} strokeWidth={1.75} style={{ color: '#8b5cf6' }} />
                      <span>Akustik</span>
                    </div>
                    <span style={{ fontSize: '9px', color: '#007AFF' }}>Kenapa?</span>
                  </div>
                  <div className="tabular-nums" style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', marginTop: '2px' }}>
                    {roomMetrics.noiseDba} dBA
                  </div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: roomMetrics.noiseDba < 50 ? '#10b981' : '#f59e0b' }}>
                    {roomMetrics.noiseDba < 50 ? 'Tenang (SNI)' : 'Cukup Tenang'}
                  </div>
                </div>
              </div>

              {/* Layout Variant Indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#334155'
                }}
              >
                <span>Layout:</span>
                <span style={{ fontWeight: 600, color: '#007AFF' }}>{roomMetrics.interiorVariantName}</span>
              </div>
            </>
          ) : (
            <>
              {/* Outdoor Mode Telemetry */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
                <Footprints size={16} strokeWidth={2} style={{ color: '#007AFF' }} />
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                    Mode Pejalan Kaki (Outdoor)
                  </div>
                  <div style={{ fontSize: '10px', color: '#475569' }}>
                    Eksplorasi Skala Manusia 1:1
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#475569' }}>
                <div>Posisi: <b style={{ color: '#0F172A' }}>({fp?.position.x.toFixed(1)}, {fp?.position.z.toFixed(1)})</b></div>
                <div>Elevasi Tanah: <b style={{ color: '#0F172A' }}>{fp?.position.y.toFixed(2)} m</b></div>
                <div style={{ color: '#007AFF', fontWeight: 600, marginTop: '2px' }}>
                  {isSeated ? 'Sedang Duduk Santai' : 'Tekan [Tab] untuk Buka Katalog Arsitek'}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* 5. The Arscity Architect Studio Drawer (Frosted Glass Full Drawer on [Tab] or [B]) */}
      {isFirstPerson && !isPhotoMode && isDrawerOpen && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.28)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 80
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              fp?.toggleDrawer(false);
              triggerRefresh();
            }
          }}
        >
          <div
            style={{
              width: '92%',
              maxWidth: '960px',
              height: '520px',
              background: 'rgba(255, 255, 255, 0.94)',
              backdropFilter: 'blur(30px) saturate(190%)',
              border: '1px solid rgba(255, 255, 255, 0.98)',
              borderBottom: 'none',
              boxShadow: '0 -16px 48px rgba(15, 23, 42, 0.18)',
              borderTopLeftRadius: '24px',
              borderTopRightRadius: '24px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              animation: 'slideUp 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(0, 122, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#007AFF'
                  }}
                >
                  <PackageOpen size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A' }}>
                    Katalog Studio Arsitek & Desain Interior
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Pilih perabot, konstruksi kota, atau alat material untuk dipasang
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => {
                    fp?.toggleDrawer(false);
                    triggerRefresh();
                  }}
                  className="icon-btn"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '9999px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Tutup Katalog dan Kembali ke Game (ESC)"
                >
                  <X size={14} strokeWidth={2.2} />
                  <span>Tutup [ESC]</span>
                </button>
              </div>
            </div>

            {/* Segmented Mode Tabs (Tab 1, Tab 2, Tab 3) */}
            <div
              style={{
                display: 'flex',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '3px',
                gap: '4px'
              }}
            >
              <button
                onClick={() => {
                  if (fp) {
                    fp.activeDockTab = 'furniture';
                    fp.activeTool = 'pointer';
                    triggerRefresh();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: activeDockTab === 'furniture' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'furniture' ? '#FFFFFF' : 'transparent',
                  border: activeDockTab === 'furniture' ? '1px solid #CBD5E1' : 'none',
                  boxShadow: activeDockTab === 'furniture' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                  color: activeDockTab === 'furniture' ? '#007AFF' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Sofa size={15} strokeWidth={2} />
                <span>Tab 1: Furnitur Interior ({isInsideBuilding ? 'Di Dalam Gedung' : 'Perlu Masuk Gedung'})</span>
              </button>

              <button
                onClick={() => {
                  if (fp) {
                    fp.activeDockTab = 'exterior';
                    fp.activeTool = 'pointer';
                    triggerRefresh();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: activeDockTab === 'exterior' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'exterior' ? '#FFFFFF' : 'transparent',
                  border: activeDockTab === 'exterior' ? '1px solid #CBD5E1' : 'none',
                  boxShadow: activeDockTab === 'exterior' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                  color: activeDockTab === 'exterior' ? '#007AFF' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <TreePine size={15} strokeWidth={2} />
                <span>Tab 2: Konstruksi Kota & Lansekap (Eksterior)</span>
              </button>

              <button
                onClick={() => {
                  if (fp) {
                    fp.activeDockTab = 'tools';
                    triggerRefresh();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: activeDockTab === 'tools' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'tools' ? '#FFFFFF' : 'transparent',
                  border: activeDockTab === 'tools' ? '1px solid #CBD5E1' : 'none',
                  boxShadow: activeDockTab === 'tools' ? '0 2px 8px rgba(15, 23, 42, 0.08)' : 'none',
                  color: activeDockTab === 'tools' ? '#007AFF' : '#475569',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Paintbrush size={15} strokeWidth={2} />
                <span>Tab 3: Alat Arsitek & Material</span>
              </button>
            </div>

            {/* TAB 1 CONTENT: FURNITURE CATALOG */}
            {activeDockTab === 'furniture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
                {/* Category Filter Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'living', label: 'Ruang Tamu' },
                    { id: 'bedroom', label: 'Kamar Tidur' },
                    { id: 'dining', label: 'Dapur & Makan' },
                    { id: 'office', label: 'Kantor' },
                    { id: 'commercial', label: 'Komersial' },
                    { id: 'bathroom', label: 'Kamar Mandi' },
                    { id: 'decor', label: 'Dekorasi & Lampu' }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setFurnitureCategory(chip.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '9999px',
                        background: furnitureCategory === chip.id ? 'rgba(0, 122, 255, 0.14)' : '#F1F5F9',
                        border: furnitureCategory === chip.id ? '1px solid #007AFF' : '1px solid #E2E8F0',
                        color: furnitureCategory === chip.id ? '#007AFF' : '#475569',
                        fontWeight: furnitureCategory === chip.id ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Grid of Furniture Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}
                >
                  {filteredFurniture.map((item) => {
                    const isSelected = selectedFurnitureId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (fp) {
                            fp.selectedFurnitureId = item.id;
                            fp.activeDockTab = 'furniture';
                            fp.activeTool = 'pointer';
                            fp.toggleDrawer(false);
                            triggerRefresh();
                          }
                        }}
                        style={{
                          background: isSelected ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                          border: isSelected ? '2px solid #007AFF' : '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF' }}>
                            {getFurnitureIcon(item.category)}
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                              {item.category}
                            </span>
                          </div>
                          {item.isSeat && (
                            <span style={{ fontSize: '9px', fontWeight: 700, color: '#10B981', background: '#ECFDF5', padding: '1px 5px', borderRadius: '4px' }}>
                              DUDUK [F]
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                          {item.name}
                        </div>

                        <div style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.3' }}>
                          {item.description}
                        </div>

                        <div style={{ fontSize: '9px', color: '#94A3B8', marginTop: 'auto', paddingTop: '4px', borderTop: '1px dashed #F1F5F9' }}>
                          Dimensi: {item.width}m × {item.depth}m × {item.height}m
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2 CONTENT: EXTERIOR CONSTRUCTION */}
            {activeDockTab === 'exterior' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
                {/* Category Filter Chips */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'building', label: 'Bangunan Tropis' },
                    { id: 'flora', label: 'Pohon & Flora' },
                    { id: 'street_furniture', label: 'Fasilitas Publik' }
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      onClick={() => setExteriorCategory(chip.id)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11px',
                        borderRadius: '9999px',
                        background: exteriorCategory === chip.id ? 'rgba(0, 122, 255, 0.14)' : '#F1F5F9',
                        border: exteriorCategory === chip.id ? '1px solid #007AFF' : '1px solid #E2E8F0',
                        color: exteriorCategory === chip.id ? '#007AFF' : '#475569',
                        fontWeight: exteriorCategory === chip.id ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {/* Grid of Exterior Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                    gap: '10px',
                    overflowY: 'auto',
                    paddingRight: '4px'
                  }}
                >
                  {filteredExterior.map((item) => {
                    const isSelected = selectedExteriorId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          if (fp) {
                            fp.selectedExteriorId = item.id;
                            fp.activeDockTab = 'exterior';
                            fp.activeTool = 'pointer';
                            fp.toggleDrawer(false);
                            triggerRefresh();
                          }
                        }}
                        style={{
                          background: isSelected ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                          border: isSelected ? '2px solid #007AFF' : '1px solid #E2E8F0',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#007AFF' }}>
                          {getExteriorIcon(item.category)}
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#64748B' }}>
                            {item.category === 'building' ? 'Gedung' : item.category === 'flora' ? 'Pohon' : 'Fasilitas'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                          {item.name}
                        </div>

                        <div style={{ fontSize: '10px', color: '#64748B', lineHeight: '1.3' }}>
                          {item.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 3 CONTENT: TOOLS & MATERIAL SURFACE PAINTER */}
            {activeDockTab === 'tools' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
                {/* Material Surface Painter */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>
                      <Paintbrush size={15} strokeWidth={2} style={{ color: '#007AFF' }} />
                      <span>Pengecat Material Dinding & Lantai ([C])</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748B' }}>
                      Klik material untuk langsung mengaktifkan kuas arsitek
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                    {FIRST_PERSON_MATERIAL_PALETTE.map((mat) => {
                      const isSelected = selectedMaterialId === mat.id && activeTool === 'material_painter';
                      return (
                        <div
                          key={mat.id}
                          onClick={() => {
                            if (fp) {
                              fp.selectedMaterialId = mat.id;
                              fp.activeTool = 'material_painter';
                              fp.clearLaserMeasure();
                              fp.toggleDrawer(false);
                              triggerRefresh();
                            }
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: isSelected ? 'rgba(0, 122, 255, 0.12)' : '#FFFFFF',
                            border: isSelected ? '2px solid #007AFF' : '1px solid #E2E8F0',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: mat.previewColor,
                              border: '1px solid #CBD5E1',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#0F172A' }}>{mat.name}</span>
                            <span style={{ fontSize: '9px', color: '#64748B' }}>Rough: {mat.roughness} • Metal: {mat.metalness}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Laser Measure & Quick Actions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '10px' }}>
                  {/* Laser Measure Tool */}
                  <div
                    onClick={() => {
                      if (fp) {
                        fp.activeTool = 'laser_measure';
                        fp.toggleDrawer(false);
                        triggerRefresh();
                      }
                    }}
                    style={{
                      background: activeTool === 'laser_measure' ? 'rgba(0, 122, 255, 0.12)' : '#FFFFFF',
                      border: activeTool === 'laser_measure' ? '2px solid #007AFF' : '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 122, 255, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007AFF' }}>
                      <Ruler size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Pita Laser Pengukur Jarak ([M])</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Klik 2 titik di dunia untuk mengukur jarak presisi 3D</div>
                    </div>
                  </div>

                  {/* Auto-Furnish Current Room */}
                  <div
                    onClick={() => {
                      if (fp) {
                        fp.autoFurnishCurrentRoom();
                        fp.toggleDrawer(false);
                        triggerRefresh();
                      }
                    }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      cursor: isInsideBuilding ? 'pointer' : 'not-allowed',
                      opacity: isInsideBuilding ? 1 : 0.6,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                      <Wand2 size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A' }}>Tata Otomatis Ruangan (Auto-Furnish)</div>
                      <div style={{ fontSize: '10px', color: '#64748B' }}>Isi ruang tamu dengan paket perabot standar SNI</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Refined Single Minimal Hotbar (Bottom Screen) */}
      {isFirstPerson && !isPhotoMode && !isDrawerOpen && (
        <div
          className="glass-surface interactive"
          style={{
            position: 'absolute',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '62px',
            background: 'rgba(255, 255, 255, 0.94)',
            backdropFilter: 'blur(28px) saturate(190%)',
            border: '1px solid rgba(255, 255, 255, 0.98)',
            boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12)',
            borderRadius: '18px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            pointerEvents: 'auto'
          }}
        >
          {/* Left: Catalog Drawer Button & Active Category Pill */}
          <button
            onClick={() => {
              if (fp) fp.toggleDrawer(true);
              triggerRefresh();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: 'rgba(0, 122, 255, 0.12)',
              border: '1px solid rgba(0, 122, 255, 0.35)',
              borderRadius: '12px',
              color: '#007AFF',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Buka Katalog Lengkap [Tab]"
          >
            <PackageOpen size={15} strokeWidth={2.2} />
            <span>[Tab] Katalog</span>
          </button>

          <div style={{ width: '1px', height: '28px', background: '#E2E8F0' }} />

          {/* Center: 9 Fast-Access Hotbar Slots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hotbarItems.map((item, idx) => {
              const isSelected = isInsideBuilding
                ? selectedFurnitureId === item.id && activeTool === 'pointer'
                : selectedExteriorId === item.id && activeTool === 'pointer';

              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (fp) {
                      fp.selectHotbarIndex(idx);
                      triggerRefresh();
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: isSelected ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                    border: isSelected ? '2px solid #007AFF' : '1px solid #CBD5E1',
                    boxShadow: isSelected ? '0 0 10px rgba(0, 122, 255, 0.35)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2px',
                    cursor: 'pointer',
                    color: isSelected ? '#007AFF' : '#0F172A',
                    transition: 'all 0.12s ease'
                  }}
                  title={`[${idx + 1}] ${item.name}`}
                >
                  {/* Slot Number Badge */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '2px',
                      left: '4px',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: isSelected ? '#007AFF' : '#64748B'
                    }}
                  >
                    {idx + 1}
                  </span>

                  {/* Icon */}
                  <div style={{ marginTop: '4px' }}>
                    {isInsideBuilding
                      ? getFurnitureIcon((item as FurnitureCatalogItem).category)
                      : getExteriorIcon((item as ExteriorCatalogItem).category)}
                  </div>

                  {/* Mini Name */}
                  <span
                    style={{
                      fontSize: '8px',
                      fontWeight: 700,
                      maxWidth: '42px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px'
                    }}
                  >
                    {item.name.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ width: '1px', height: '28px', background: '#E2E8F0' }} />

          {/* Right: Quick Tools (Painter [C], Laser [M], Light [L], Elev/Floor, Exit) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Material Painter Toggle */}
            <button
              onClick={() => {
                if (fp) {
                  fp.activeTool = activeTool === 'material_painter' ? 'pointer' : 'material_painter';
                  fp.clearLaserMeasure();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: activeTool === 'material_painter' ? '#007AFF' : '#FFFFFF',
                color: activeTool === 'material_painter' ? '#FFFFFF' : '#0F172A',
                border: activeTool === 'material_painter' ? '1px solid #007AFF' : '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Kuas Material Permukaan [C]"
            >
              <Paintbrush size={15} strokeWidth={2} />
            </button>

            {/* Laser Measure Toggle */}
            <button
              onClick={() => {
                if (fp) {
                  fp.activeTool = activeTool === 'laser_measure' ? 'pointer' : 'laser_measure';
                  if (fp.activeTool === 'pointer') fp.clearLaserMeasure();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: activeTool === 'laser_measure' ? '#007AFF' : '#FFFFFF',
                color: activeTool === 'laser_measure' ? '#FFFFFF' : '#0F172A',
                border: activeTool === 'laser_measure' ? '1px solid #007AFF' : '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Pita Laser Pengukur Jarak [M]"
            >
              <Ruler size={15} strokeWidth={2} />
            </button>

            {/* Ceiling Light Toggle */}
            <button
              onClick={() => {
                if (fp) {
                  fp.toggleCeilingLight();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: fp?.isCeilingLightOn ? 'rgba(245, 158, 11, 0.2)' : '#FFFFFF',
                color: fp?.isCeilingLightOn ? '#b45309' : '#0F172A',
                border: fp?.isCeilingLightOn ? '1px solid #f59e0b' : '1px solid #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Lampu Plafon Warm 2700K [L]"
            >
              <Lightbulb size={15} strokeWidth={2} />
            </button>

            {/* Multi-Floor Elevation Navigator (If inside building) */}
            {isInsideBuilding && totalFloors > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '3px 6px'
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#007AFF' }}>
                  Lt. {currentFloor}/{totalFloors}
                </span>
                <button
                  onClick={() => {
                    fp?.traverseFloor('up');
                    triggerRefresh();
                  }}
                  className="icon-btn"
                  style={{ padding: '2px 4px', height: 'auto', color: '#007AFF' }}
                  title="Naik Lantai"
                >
                  <ChevronUp size={12} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => {
                    fp?.traverseFloor('down');
                    triggerRefresh();
                  }}
                  className="icon-btn"
                  style={{ padding: '2px 4px', height: 'auto', color: '#007AFF' }}
                  title="Turun Lantai"
                >
                  <ChevronDown size={12} strokeWidth={2.5} />
                </button>
              </div>
            )}

            {/* Exit to Orbit Button */}
            <button
              onClick={() => {
                if (document.pointerLockElement) {
                  document.exitPointerLock();
                }
                setCameraMode('orbit');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 12px',
                background: '#F1F5F9',
                border: '1px solid #CBD5E1',
                borderRadius: '10px',
                color: '#0F172A',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Keluar ke Mode Orbit (ESC)"
            >
              <X size={13} strokeWidth={2} />
              <span>Orbit</span>
            </button>
          </div>
        </div>
      )}

      {/* 7. DSLR Photo Mode Viewfinder & Controls */}
      {isPhotoMode && (
        <>
          {/* Rule of Thirds Grid */}
          <div
            style={{
              position: 'absolute',
              inset: '40px',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              pointerEvents: 'none'
            }}
          >
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, borderTop: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
            <div style={{ position: 'absolute', left: '33.33%', top: 0, bottom: 0, borderLeft: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
            <div style={{ position: 'absolute', left: '66.66%', top: 0, bottom: 0, borderLeft: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
          </div>

          {/* DSLR Bottom Control Bar */}
          <div
            className="glass-surface glass-capsule interactive"
            style={{
              position: 'absolute',
              bottom: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              pointerEvents: 'auto',
              background: 'rgba(244, 247, 251, 0.94)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              borderRadius: '9999px'
            }}
          >
            {/* Lens Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#475569', fontWeight: 600 }}>Lensa:</span>
              {(['24mm', '50mm', '85mm'] as DslrLensType[]).map((lens) => (
                <button
                  key={lens}
                  onClick={() => setDslrLens(lens)}
                  className={`segmented-item ${dslrLens === lens ? 'active' : ''}`}
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: dslrLens === lens ? 'rgba(0, 122, 255, 0.14)' : '#FFFFFF',
                    border: dslrLens === lens ? '1px solid #007AFF' : '1px solid #CBD5E1',
                    color: dslrLens === lens ? '#007AFF' : '#0F172A',
                    cursor: 'pointer'
                  }}
                  title={DSLR_LENS_MAP[lens].desc}
                >
                  {lens}
                </button>
              ))}
            </div>

            <div style={{ width: '1px', height: '20px', background: '#CBD5E1' }} />

            {/* Shutter Button */}
            <button
              onClick={captureDslrPhoto}
              className="ios-btn ios-btn-primary"
              style={{
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: '#007AFF',
                color: '#FFFFFF',
                borderRadius: '8px'
              }}
            >
              <Camera size={15} strokeWidth={2} />
              <span>Ambil Foto (PNG)</span>
            </button>

            {/* Close Photo Mode */}
            <button
              onClick={() => setIsPhotoMode(false)}
              className="icon-btn"
              title="Tutup Mode Foto"
              style={{ color: '#0F172A' }}
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </>
      )}

      {/* 8. Pointer Lock Released Overlay (Esc Handling - D2) */}
      {isFirstPerson && !isLocked && !isPhotoMode && !isDrawerOpen && !showGuide && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.35)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
            pointerEvents: 'auto'
          }}
          onClick={() => {
            if (engine?.firstPersonController) {
              engine.firstPersonController.lockPointer();
            } else if (engine?.renderer?.domElement) {
              engine.renderer.domElement.requestPointerLock?.();
            }
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              backdropFilter: 'blur(28px)',
              borderRadius: '20px',
              padding: '24px 32px',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.16)',
              border: '1px solid rgba(255, 255, 255, 0.95)',
              textAlign: 'center',
              maxWidth: '380px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer'
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (engine?.firstPersonController) {
                engine.firstPersonController.lockPointer();
              } else if (engine?.renderer?.domElement) {
                engine.renderer.domElement.requestPointerLock?.();
              }
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: 'rgba(0, 122, 255, 0.12)',
                color: '#007AFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Footprints size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: '0 0 4px' }}>
                Navigasi Dijeda
              </h3>
              <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.4, margin: 0 }}>
                Kursor dilepas. Klik di mana saja untuk mengunci kursor dan melanjutkan eksplorasi.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (engine?.firstPersonController) {
                    engine.firstPersonController.lockPointer();
                  } else if (engine?.renderer?.domElement) {
                    engine.renderer.domElement.requestPointerLock?.();
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: '#007AFF',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Lanjut Eksplorasi
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCameraMode('orbit');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid rgba(15, 23, 42, 0.12)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Kembali ke Orbit (ESC)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Welcome / Controls Guide Modal (D1) */}
      {showGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
          onClick={() => setShowGuide(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '460px',
              width: '92%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(0, 122, 255, 0.12)', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Footprints size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Panduan Pejalan Kaki
                  </h3>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: 0 }}>
                    Kontrol navigasi & interaksi arsitektur
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowGuide(false)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>W • A • S • D</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Bergerak maju, kiri, mundur, kanan</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>Gerakan Mouse</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Melihat sekeliling ruangan & jalan</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>F • Interaksi</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Duduk di kursi, buka pintu</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>X • Hapus</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Hapus perabot yang dibidik</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>Tab / B • Katalog</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Buka drawer perabot lengkap</div>
              </div>
              <div style={{ background: '#F8FAFC', padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#007AFF', marginBottom: '2px' }}>1 sampai 9 • Hotbar</div>
                <div style={{ fontSize: '11px', color: '#334155' }}>Akses cepat perabot favorit</div>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 122, 255, 0.08)', padding: '10px 12px', borderRadius: '12px', border: '1px solid rgba(0, 122, 255, 0.2)', fontSize: '11px', color: '#007AFF', lineHeight: 1.4 }}>
              <b>Tips:</b> Tekan <b>Esc</b> kapan saja untuk melepas kunci mouse. Klik layar untuk melanjutkan navigasi.
            </div>

            <button
              onClick={() => setShowGuide(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                background: '#007AFF',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Mulai Eksplorasi
            </button>
          </div>
        </div>
      )}

      {/* 10. SNI Microclimate Explanation Modal (D4) */}
      {activeMetricExplanation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000
          }}
          onClick={() => setActiveMetricExplanation(null)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '20px 24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(15, 23, 42, 0.1)',
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                {activeMetricExplanation === 'lux' && 'Pencahayaan Alami (Lux)'}
                {activeMetricExplanation === 'ach' && 'Ventilasi Silang Alami (ACH)'}
                {activeMetricExplanation === 'temp' && 'Kenyamanan Termal Ruang (°C)'}
                {activeMetricExplanation === 'noise' && 'Tingkat Kebisingan (dBA)'}
              </h4>
              <button
                onClick={() => setActiveMetricExplanation(null)}
                style={{ background: 'transparent', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, margin: 0 }}>
              {activeMetricExplanation === 'lux' &&
                'Standar SNI 03-6197 menetapkan iluminasi minimum 150-250 Lux untuk ruang hunian dan 350 Lux untuk ruang kerja. Memaksimalkan cahaya siang hari melalui jendela dan bukaan teritisan mengurangi beban listrik lampu secara signifikan.'}
              {activeMetricExplanation === 'ach' &&
                'Air Changes per Hour (ACH) mengukur frekuensi pergantian volume udara ruangan dalam satu jam. Standar SNI merekomendasikan 4-6 ACH di iklim tropis lembap agar udara senantiasa segar, mencegah kelembapan tinggi, dan menghambat pertumbuhan jamur.'}
              {activeMetricExplanation === 'temp' &&
                'Rentang kenyamanan termal operatif di Indonesia adalah 24°C - 27°C. Plafon tinggi dan sirkulasi alami membantu membuang panas atap melalui efek cerobong termal tanpa bergantung penuh pada AC.'}
              {activeMetricExplanation === 'noise' &&
                'Baku tingkat kebisingan lingkungan hunian menurut SNI adalah 45-55 dBA. Suasana tenang meningkatkan produktivitas dan kualitas istirahat penghuni bangunan.'}
            </p>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveMetricExplanation(null)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  background: '#007AFF',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
