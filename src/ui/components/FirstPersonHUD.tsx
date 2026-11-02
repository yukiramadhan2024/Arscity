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
  Sun,
  Thermometer,
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
  Check,
  PackageOpen,
  HelpCircle
} from 'lucide-react';
import {
  FIRST_PERSON_FURNITURE_CATALOG,
  FIRST_PERSON_EXTERIOR_CATALOG,
  FIRST_PERSON_MATERIAL_PALETTE,
  FurnitureCatalogItem,
  ExteriorCatalogItem,
  getIndoorHotbarItems,
  getOutdoorHotbarItems
} from '../../buildings/FirstPersonFurnitureCatalog';

const FONT_SANS = "var(--font-sans, 'Space Grotesk', sans-serif)";
const FONT_MONO = "var(--font-mono, 'Space Mono', monospace)";

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
  const triggerRefresh = React.useCallback(() => setRefreshTrigger((p) => p + 1), []);

  const [furnitureCategory, setFurnitureCategory] = React.useState<string>('all');
  const [exteriorCategory, setExteriorCategory] = React.useState<string>('all');
  const [showGuide, setShowGuide] = React.useState<boolean>(false);
  const [activeMetricExplanation, setActiveMetricExplanation] = React.useState<'lux' | 'temp' | null>(null);
  const savedFovRef = React.useRef<number>(50);

  const filteredFurniture = React.useMemo(() => {
    if (furnitureCategory === 'all') return FIRST_PERSON_FURNITURE_CATALOG;
    return FIRST_PERSON_FURNITURE_CATALOG.filter((f) => f.category === furnitureCategory);
  }, [furnitureCategory]);

  const filteredExterior = React.useMemo(() => {
    if (exteriorCategory === 'all') return FIRST_PERSON_EXTERIOR_CATALOG;
    return FIRST_PERSON_EXTERIOR_CATALOG.filter((e) => e.category === exteriorCategory);
  }, [exteriorCategory]);

  // Synchronize controller callbacks
  React.useEffect(() => {
    if (!engine) return;
    const fp = engine.firstPersonController;
    const prevFp = fp?.onStateChanged;
    const prevDrone = engine.cinematicDroneController?.onStateChanged;
    const prevPhotoToggle = fp?.onTogglePhotoMode;

    if (fp) {
      fp.onStateChanged = () => {
        triggerRefresh();
      };
      fp.onTogglePhotoMode = (forceOpen?: boolean) => {
        const current = useUIStore.getState().isPhotoMode;
        const next = forceOpen !== undefined ? forceOpen : !current;
        setIsPhotoMode(next);
      };
    }
    if (engine.cinematicDroneController) {
      engine.cinematicDroneController.onStateChanged = () => {
        triggerRefresh();
      };
    }

    return () => {
      if (fp) {
        fp.onStateChanged = prevFp;
        fp.onTogglePhotoMode = prevPhotoToggle;
      }
      if (engine.cinematicDroneController) {
        engine.cinematicDroneController.onStateChanged = prevDrone;
      }
    };
  }, [engine, cameraMode, setIsPhotoMode, triggerRefresh]);

  // Synchronize DSLR Photo Mode lens FOV & Pointer Lock with FirstPersonController
  React.useEffect(() => {
    if (!engine || !isFirstPerson) return;
    const fp = engine.firstPersonController;
    const cam = engine.cameraController?.camera;

    if (fp) {
      fp.setPhotoModeActive(isPhotoMode);
    }

    if (cam) {
      if (isPhotoMode) {
        savedFovRef.current = cam.fov || 50;
        const lensSpec = DSLR_LENS_MAP[dslrLens];
        if (lensSpec) {
          cam.fov = lensSpec.fov;
          cam.updateProjectionMatrix();
        }
      } else if (savedFovRef.current) {
        cam.fov = savedFovRef.current;
        cam.updateProjectionMatrix();
      }
    }
  }, [engine, isFirstPerson, isPhotoMode]);

  React.useEffect(() => {
    if (!engine || !isFirstPerson || !isPhotoMode) return;
    const cam = engine.cameraController?.camera;
    const lensSpec = DSLR_LENS_MAP[dslrLens];
    if (cam && lensSpec) {
      cam.fov = lensSpec.fov;
      cam.updateProjectionMatrix();
    }
  }, [engine, isFirstPerson, isPhotoMode, dslrLens]);

  if (!isFirstPerson && !isDrone && !isRecordingVideo) {
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
  const hasHoveredFurniture = Boolean(fp?.hoveredFurniture);

  const hotbarItems: (FurnitureCatalogItem | ExteriorCatalogItem)[] = isInsideBuilding
    ? getIndoorHotbarItems()
    : getOutdoorHotbarItems();

  const getFurnitureIcon = (cat: string) => {
    switch (cat) {
      case 'living':
        return <Sofa size={14} strokeWidth={2} />;
      case 'bedroom':
        return <Bed size={14} strokeWidth={2} />;
      case 'dining':
        return <Utensils size={14} strokeWidth={2} />;
      case 'office':
        return <Laptop size={14} strokeWidth={2} />;
      case 'commercial':
        return <Coffee size={14} strokeWidth={2} />;
      case 'bathroom':
        return <Bath size={14} strokeWidth={2} />;
      default:
        return <Layers size={14} strokeWidth={2} />;
    }
  };

  const getExteriorIcon = (cat: string) => {
    switch (cat) {
      case 'building':
        return <Building2 size={14} strokeWidth={2} />;
      case 'flora':
        return <TreePine size={14} strokeWidth={2} />;
      default:
        return <Landmark size={14} strokeWidth={2} />;
    }
  };

  const closePhotoModeAndRelock = () => {
    setIsPhotoMode(false);
    if (fp) {
      fp.setPhotoModeActive(false);
    }
  };

  const keycapPillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 7px',
    borderRadius: '9999px',
    background: 'var(--fill-control)',
    color: 'var(--label-secondary)',
    fontSize: '10px',
    fontWeight: 600,
    fontFamily: FONT_SANS
  };

  const keycapCodeStyle: React.CSSProperties = {
    fontFamily: FONT_MONO,
    fontWeight: 700,
    fontSize: '10px',
    color: 'var(--accent)'
  };

  const reticleHighlighted = isPlacementValid || activeTool !== 'pointer' || hasHoveredFurniture;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 60,
        overflow: 'hidden',
        fontFamily: FONT_SANS
      }}
    >
      {/* 1. Futuristic Keybinds Capsule (Top Center — Zero Divider Lines) */}
      {isFirstPerson && !isPhotoMode && (
        <div
          className="glass-surface glass-capsule"
          style={{
            position: 'absolute',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '5px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--surface)',
            backdropFilter: 'blur(24px) saturate(180%)',
            boxShadow: 'var(--shadow-elevation-medium, 0 8px 24px rgba(15, 23, 42, 0.14))',
            fontSize: '11px',
            color: 'var(--label)',
            fontWeight: 600,
            pointerEvents: 'auto',
            borderRadius: '9999px',
            whiteSpace: 'nowrap',
            fontFamily: FONT_SANS
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (fp) fp.toggleDrawer();
              triggerRefresh();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--fill-control)',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer',
              color: 'var(--accent)',
              fontWeight: 700,
              fontSize: '10px',
              padding: '3px 9px',
              fontFamily: FONT_SANS
            }}
          >
            <PackageOpen size={12} strokeWidth={2.2} />
            <span style={{ fontFamily: FONT_MONO }}>[Tab]</span>
            <span>Katalog</span>
          </button>

          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[1-9]</span>
            <span>Slot</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[G]</span>
            <span>Geser</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[V]</span>
            <span>Salin</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[R]</span>
            <span>Putar</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[F]</span>
            <span>Duduk</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[X]</span>
            <span>Hapus</span>
          </span>
          <span style={keycapPillStyle}>
            <span style={keycapCodeStyle}>[P]</span>
            <span>Kamera</span>
          </span>

          <button
            type="button"
            onClick={() => {
              fp?.releasePointerLock();
              setShowGuide(true);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '22px',
              height: '22px',
              borderRadius: '50%',
              background: 'var(--fill-control)',
              border: 'none',
              color: 'var(--accent)',
              cursor: 'pointer'
            }}
            title="Panduan Kontrol Pejalan Kaki"
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
          <div
            style={{
              position: 'relative',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              border: reticleHighlighted
                ? '2px solid var(--accent)'
                : '1.5px solid rgba(248, 250, 252, 0.85)',
              boxShadow: reticleHighlighted
                ? '0 0 10px rgba(10, 132, 255, 0.65)'
                : '0 0 4px rgba(0, 0, 0, 0.45)',
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
                backgroundColor: reticleHighlighted ? 'var(--accent)' : '#F8FAFC'
              }}
            />
          </div>

          {reticleActionLabel && (
            <div
              style={{
                padding: '5px 12px',
                background: 'var(--surface)',
                backdropFilter: 'blur(20px) saturate(180%)',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.18)',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: FONT_SANS,
                color: isPlacementValid || hasHoveredFurniture || activeTool !== 'pointer'
                  ? 'var(--accent)'
                  : 'var(--bad, #EF4444)',
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
            right: '24px',
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface)',
            pointerEvents: 'auto'
          }}
        >
          <div
            style={{
              width: '9px',
              height: '9px',
              borderRadius: '50%',
              backgroundColor: 'var(--bad, #FF3B30)',
              animation: 'pulse 1s infinite'
            }}
          />
          <span
            style={{
              fontFamily: FONT_MONO,
              fontVariantNumeric: 'tabular-nums',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--bad, #FF3B30)',
              letterSpacing: '0.04em'
            }}
          >
            REC {formatRecTime(recordingSeconds)}
          </span>
          <button
            type="button"
            onClick={stopVideoRecording}
            style={{
              padding: '3px 9px',
              fontSize: '11px',
              fontFamily: FONT_SANS,
              fontWeight: 600,
              background: 'var(--bad, #FF3B30)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '9999px',
              cursor: 'pointer'
            }}
          >
            Selesai
          </button>
        </div>
      )}

      {/* 4. Compact Futuristic Room & Pedestrian Telemetry Card (Top Left — Zero Divider Lines) */}
      {isFirstPerson && !isPhotoMode && (
        <div
          className="glass-surface interactive"
          style={{
            position: 'absolute',
            top: '68px',
            left: '24px',
            width: isInsideBuilding ? '292px' : '248px',
            borderRadius: '18px',
            padding: '12px 14px',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            boxShadow: 'var(--shadow-elevation-medium, 0 10px 30px rgba(0, 0, 0, 0.22))',
            background: 'var(--surface)',
            backdropFilter: 'blur(26px) saturate(185%)',
            fontFamily: FONT_SANS
          }}
        >
          {isInsideBuilding && roomMetrics ? (
            <>
              {/* Header: Room Name & Floor Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '10px',
                      background: 'var(--fill-control)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      flexShrink: 0
                    }}
                  >
                    <Building2 size={15} strokeWidth={2} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--label)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {roomMetrics.roomName}
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: 'var(--label-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {insideBuildingName || 'Bangunan'}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    background: 'var(--fill-control)',
                    padding: '4px 8px',
                    borderRadius: '9999px',
                    flexShrink: 0
                  }}
                >
                  Lt.{currentFloor}/{totalFloors}
                </span>
              </div>

              {/* Streamlined 2-Pill Telemetry: Temperature °C & Lighting Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => {
                    fp?.releasePointerLock();
                    setActiveMetricExplanation('temp');
                  }}
                  style={{
                    background: 'var(--surface-raised)',
                    border: 'none',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontFamily: FONT_SANS
                  }}
                  title="Klik untuk info standar termal SNI"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--label-secondary)'
                    }}
                  >
                    <Thermometer size={11} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                    <span>Suhu</span>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--label)'
                    }}
                  >
                    {roomMetrics.temperatureC.toFixed(1)}°C
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color:
                        roomMetrics.temperatureC <= 27.6
                          ? 'var(--good, #10B981)'
                          : 'var(--warn, #F59E0B)'
                    }}
                  >
                    {roomMetrics.temperatureC <= 27.6 ? 'Termal Nyaman' : 'Hangat'}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fp?.releasePointerLock();
                    setActiveMetricExplanation('lux');
                  }}
                  style={{
                    background: 'var(--surface-raised)',
                    border: 'none',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                    fontFamily: FONT_SANS
                  }}
                  title="Klik untuk info standar pencahayaan SNI"
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '10px',
                      color: 'var(--label-secondary)'
                    }}
                  >
                    <Sun size={11} strokeWidth={2} style={{ color: 'var(--warn, #F59E0B)' }} />
                    <span>Cahaya</span>
                  </div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '13px',
                      fontWeight: 700,
                      color: 'var(--label)'
                    }}
                  >
                    {roomMetrics.lux} lx
                  </div>
                  <div
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      color:
                        roomMetrics.sniLuxStatus === 'Optimum (SNI)' || roomMetrics.sniLuxStatus === 'Cukup'
                          ? 'var(--good, #10B981)'
                          : 'var(--warn, #F59E0B)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {roomMetrics.sniLuxStatus}
                  </div>
                </button>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '10px',
                    background: 'var(--fill-control)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    flexShrink: 0
                  }}
                >
                  <Footprints size={15} strokeWidth={2} />
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                    Mode Pejalan Kaki
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                    {isSeated ? 'Duduk Ergonomis' : 'Skala Manusia 1:1'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <div
                  style={{
                    background: 'var(--surface-raised)',
                    borderRadius: '10px',
                    padding: '6px 8px'
                  }}
                >
                  <div style={{ fontSize: '9px', color: 'var(--label-secondary)' }}>Koordinat</div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--label)',
                      marginTop: '1px'
                    }}
                  >
                    {fp?.position.x.toFixed(1)}, {fp?.position.z.toFixed(1)}
                  </div>
                </div>

                <div
                  style={{
                    background: 'var(--surface-raised)',
                    borderRadius: '10px',
                    padding: '6px 8px'
                  }}
                >
                  <div style={{ fontSize: '9px', color: 'var(--label-secondary)' }}>Elevasi</div>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--label)',
                      marginTop: '1px'
                    }}
                  >
                    {fp?.position.y.toFixed(2)} m
                  </div>
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
            background: 'var(--scrim)',
            backdropFilter: 'blur(8px)',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            zIndex: 80,
            fontFamily: FONT_SANS
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
              background: 'var(--surface)',
              backdropFilter: 'blur(30px) saturate(190%)',
              boxShadow: '0 -16px 48px rgba(0, 0, 0, 0.35)',
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
                    background: 'var(--fill-control)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)'
                  }}
                >
                  <PackageOpen size={20} strokeWidth={2.2} />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--label)' }}>
                    Katalog Studio Arsitek & Desain Interior
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Pilih item untuk langsung mengunci bidikan dan memasang di ruangan
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  fp?.toggleDrawer(false);
                  triggerRefresh();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '9999px',
                  fontSize: '11px',
                  fontWeight: 600,
                  fontFamily: FONT_SANS,
                  background: 'var(--surface-raised)',
                  border: 'none',
                  color: 'var(--label)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer'
                }}
                title="Tutup Katalog dan Kunci Kursor (ESC)"
              >
                <X size={14} strokeWidth={2.2} />
                <span>Tutup</span>
                <span style={{ fontFamily: FONT_MONO, color: 'var(--accent)' }}>[ESC]</span>
              </button>
            </div>

            {/* Segmented Mode Tabs */}
            <div
              style={{
                display: 'flex',
                background: 'var(--fill-control)',
                borderRadius: '12px',
                padding: '3px',
                gap: '4px'
              }}
            >
              <button
                type="button"
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
                  fontFamily: FONT_SANS,
                  fontWeight: activeDockTab === 'furniture' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'furniture' ? 'var(--surface-raised)' : 'transparent',
                  border: 'none',
                  boxShadow: activeDockTab === 'furniture' ? '0 2px 8px rgba(0, 0, 0, 0.14)' : 'none',
                  color: activeDockTab === 'furniture' ? 'var(--accent)' : 'var(--label-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Sofa size={15} strokeWidth={2} />
                <span>Furnitur Interior ({isInsideBuilding ? 'Aktif' : 'Masuk Gedung'})</span>
              </button>

              <button
                type="button"
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
                  fontFamily: FONT_SANS,
                  fontWeight: activeDockTab === 'exterior' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'exterior' ? 'var(--surface-raised)' : 'transparent',
                  border: 'none',
                  boxShadow: activeDockTab === 'exterior' ? '0 2px 8px rgba(0, 0, 0, 0.14)' : 'none',
                  color: activeDockTab === 'exterior' ? 'var(--accent)' : 'var(--label-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <TreePine size={15} strokeWidth={2} />
                <span>Konstruksi & Lansekap</span>
              </button>

              <button
                type="button"
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
                  fontFamily: FONT_SANS,
                  fontWeight: activeDockTab === 'tools' ? 700 : 500,
                  borderRadius: '10px',
                  background: activeDockTab === 'tools' ? 'var(--surface-raised)' : 'transparent',
                  border: 'none',
                  boxShadow: activeDockTab === 'tools' ? '0 2px 8px rgba(0, 0, 0, 0.14)' : 'none',
                  color: activeDockTab === 'tools' ? 'var(--accent)' : 'var(--label-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Paintbrush size={15} strokeWidth={2} />
                <span>Alat Arsitek & Material</span>
              </button>
            </div>

            {/* TAB 1 CONTENT: FURNITURE CATALOG */}
            {activeDockTab === 'furniture' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, overflow: 'hidden' }}>
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
                      type="button"
                      key={chip.id}
                      onClick={() => setFurnitureCategory(chip.id)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontFamily: FONT_SANS,
                        borderRadius: '9999px',
                        background: furnitureCategory === chip.id ? 'var(--accent)' : 'var(--surface-raised)',
                        border: 'none',
                        color: furnitureCategory === chip.id ? '#FFFFFF' : 'var(--label-secondary)',
                        fontWeight: furnitureCategory === chip.id ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

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
                          background: isSelected ? 'var(--fill-control)' : 'var(--surface-raised)',
                          boxShadow: isSelected ? 'inset 0 0 0 2px var(--accent)' : 'none',
                          borderRadius: '14px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
                            {getFurnitureIcon(item.category)}
                            <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--label-secondary)' }}>
                              {item.category}
                            </span>
                          </div>
                          {item.isSeat && (
                            <span
                              style={{
                                fontFamily: FONT_MONO,
                                fontSize: '9px',
                                fontWeight: 700,
                                color: 'var(--good, #10B981)',
                                background: 'rgba(16, 185, 129, 0.14)',
                                padding: '2px 6px',
                                borderRadius: '9999px'
                              }}
                            >
                              DUDUK [F]
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                          {item.name}
                        </div>

                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)', lineHeight: '1.35' }}>
                          {item.description}
                        </div>

                        <div
                          style={{
                            fontFamily: FONT_MONO,
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: '9px',
                            color: 'var(--label-secondary)',
                            background: 'var(--fill-control)',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            marginTop: 'auto',
                            alignSelf: 'flex-start'
                          }}
                        >
                          {item.width}m × {item.depth}m × {item.height}m
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                  {[
                    { id: 'all', label: 'Semua' },
                    { id: 'building', label: 'Bangunan Tropis' },
                    { id: 'flora', label: 'Pohon & Flora' },
                    { id: 'street_furniture', label: 'Fasilitas Publik' }
                  ].map((chip) => (
                    <button
                      type="button"
                      key={chip.id}
                      onClick={() => setExteriorCategory(chip.id)}
                      style={{
                        padding: '5px 12px',
                        fontSize: '11px',
                        fontFamily: FONT_SANS,
                        borderRadius: '9999px',
                        background: exteriorCategory === chip.id ? 'var(--accent)' : 'var(--surface-raised)',
                        border: 'none',
                        color: exteriorCategory === chip.id ? '#FFFFFF' : 'var(--label-secondary)',
                        fontWeight: exteriorCategory === chip.id ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

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
                          background: isSelected ? 'var(--fill-control)' : 'var(--surface-raised)',
                          boxShadow: isSelected ? 'inset 0 0 0 2px var(--accent)' : 'none',
                          borderRadius: '14px',
                          padding: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px',
                          transition: 'all 0.12s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
                          {getExteriorIcon(item.category)}
                          <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--label-secondary)' }}>
                            {item.category === 'building' ? 'Gedung' : item.category === 'flora' ? 'Pohon' : 'Fasilitas'}
                          </span>
                        </div>

                        <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                          {item.name}
                        </div>

                        <div style={{ fontSize: '10px', color: 'var(--label-secondary)', lineHeight: '1.35' }}>
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                      <Paintbrush size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} />
                      <span>Pengecat Material Dinding & Lantai</span>
                      <span style={{ fontFamily: FONT_MONO, color: 'var(--accent)' }}>[C]</span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                      Klik material untuk langsung mengaktifkan kuas
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
                            background: isSelected ? 'var(--fill-control)' : 'var(--surface-raised)',
                            boxShadow: isSelected ? 'inset 0 0 0 2px var(--accent)' : 'none',
                            borderRadius: '12px',
                            padding: '9px 11px',
                            cursor: 'pointer'
                          }}
                        >
                          <div
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: mat.previewColor,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.18)',
                              flexShrink: 0
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--label)' }}>{mat.name}</span>
                            <span style={{ fontFamily: FONT_MONO, fontSize: '9px', color: 'var(--label-secondary)' }}>
                              R:{mat.roughness} M:{mat.metalness}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Laser Measure & Auto-Furnish Quick Cards (Zero Separator Lines) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => {
                      if (fp) {
                        fp.activeTool = 'laser_measure';
                        fp.toggleDrawer(false);
                        triggerRefresh();
                      }
                    }}
                    style={{
                      background: activeTool === 'laser_measure' ? 'var(--fill-control)' : 'var(--surface-raised)',
                      boxShadow: activeTool === 'laser_measure' ? 'inset 0 0 0 2px var(--accent)' : 'none',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'var(--fill-control)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent)',
                        flexShrink: 0
                      }}
                    >
                      <Ruler size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                        Pita Laser Pengukur Jarak <span style={{ fontFamily: FONT_MONO, color: 'var(--accent)' }}>[M]</span>
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Klik 2 titik di dunia untuk mengukur jarak presisi 3D
                      </div>
                    </div>
                  </div>

                  <div
                    onClick={() => {
                      if (fp && isInsideBuilding) {
                        fp.autoFurnishCurrentRoom();
                        fp.toggleDrawer(false);
                        triggerRefresh();
                      }
                    }}
                    style={{
                      background: 'var(--surface-raised)',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      cursor: isInsideBuilding ? 'pointer' : 'not-allowed',
                      opacity: isInsideBuilding ? 1 : 0.55,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '10px',
                        background: 'rgba(16, 185, 129, 0.14)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--good, #10B981)',
                        flexShrink: 0
                      }}
                    >
                      <Wand2 size={18} strokeWidth={2} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                        Tata Otomatis Ruangan
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)' }}>
                        Isi ruangan dengan paket perabot standar SNI
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. Futuristic Minimal Hotbar (Bottom Screen — Zero Divider Lines, Unique Slot Labels) */}
      {isFirstPerson && !isPhotoMode && !isDrawerOpen && (
        <div
          className="glass-surface interactive"
          style={{
            position: 'absolute',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
            height: '64px',
            background: 'var(--surface)',
            backdropFilter: 'blur(28px) saturate(190%)',
            boxShadow: 'var(--shadow-elevation-medium, 0 12px 36px rgba(0, 0, 0, 0.25))',
            borderRadius: '20px',
            padding: '7px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            pointerEvents: 'auto',
            fontFamily: FONT_SANS
          }}
        >
          {/* Left: Catalog Drawer Button */}
          <button
            type="button"
            onClick={() => {
              if (fp) fp.toggleDrawer(true);
              triggerRefresh();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'var(--fill-control)',
              border: 'none',
              borderRadius: '12px',
              color: 'var(--accent)',
              fontSize: '11px',
              fontWeight: 700,
              fontFamily: FONT_SANS,
              cursor: 'pointer'
            }}
            title="Buka Katalog Lengkap [Tab]"
          >
            <PackageOpen size={15} strokeWidth={2.2} />
            <span style={{ fontFamily: FONT_MONO }}>[Tab]</span>
            <span>Katalog</span>
          </button>

          {/* Center: 9 Curated Fast-Access Hotbar Slots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {hotbarItems.map((item, idx) => {
              const isSelected = isInsideBuilding
                ? selectedFurnitureId === item.id && activeTool === 'pointer'
                : selectedExteriorId === item.id && activeTool === 'pointer';

              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    if (fp) {
                      fp.selectHotbarIndex(idx);
                      fp.lockPointer();
                      triggerRefresh();
                    }
                  }}
                  style={{
                    position: 'relative',
                    width: '68px',
                    height: '50px',
                    borderRadius: '12px',
                    background: isSelected ? 'var(--fill-control)' : 'var(--surface-raised)',
                    border: 'none',
                    boxShadow: isSelected ? 'inset 0 0 0 2px var(--accent)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '3px 4px',
                    cursor: 'pointer',
                    color: isSelected ? 'var(--accent)' : 'var(--label)',
                    transition: 'all 0.12s ease',
                    fontFamily: FONT_SANS
                  }}
                  title={`[${idx + 1}] ${item.name}`}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: '3px',
                      left: '5px',
                      fontFamily: FONT_MONO,
                      fontVariantNumeric: 'tabular-nums',
                      fontSize: '9px',
                      fontWeight: 700,
                      color: isSelected ? 'var(--accent)' : 'var(--label-secondary)'
                    }}
                  >
                    {idx + 1}
                  </span>

                  <div style={{ marginTop: '5px' }}>
                    {isInsideBuilding
                      ? getFurnitureIcon((item as FurnitureCatalogItem).category)
                      : getExteriorIcon((item as ExteriorCatalogItem).category)}
                  </div>

                  <span
                    style={{
                      fontSize: '8.5px',
                      fontWeight: 600,
                      maxWidth: '62px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginTop: '2px',
                      fontFamily: FONT_SANS
                    }}
                  >
                    {item.shortLabel}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Quick Tools (Painter [C], Laser [M], Light [L], Photo [P], Floor, Exit) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              onClick={() => {
                if (fp) {
                  fp.cancelGrabFurniture();
                  fp.activeTool = activeTool === 'material_painter' ? 'pointer' : 'material_painter';
                  fp.clearLaserMeasure();
                  fp.lockPointer();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: activeTool === 'material_painter' ? 'var(--accent)' : 'var(--surface-raised)',
                color: activeTool === 'material_painter' ? '#FFFFFF' : 'var(--label)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Kuas Material Permukaan [C]"
            >
              <Paintbrush size={15} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (fp) {
                  fp.cancelGrabFurniture();
                  fp.activeTool = activeTool === 'laser_measure' ? 'pointer' : 'laser_measure';
                  if (fp.activeTool === 'pointer') fp.clearLaserMeasure();
                  fp.lockPointer();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: activeTool === 'laser_measure' ? 'var(--accent)' : 'var(--surface-raised)',
                color: activeTool === 'laser_measure' ? '#FFFFFF' : 'var(--label)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Pita Laser Pengukur Jarak [M]"
            >
              <Ruler size={15} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (fp) {
                  fp.toggleCeilingLight();
                  fp.lockPointer();
                  triggerRefresh();
                }
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: fp?.isCeilingLightOn ? 'rgba(245, 158, 11, 0.2)' : 'var(--surface-raised)',
                color: fp?.isCeilingLightOn ? 'var(--warn, #F59E0B)' : 'var(--label)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Lampu Plafon 2 Ruangan Terdekat [L]"
            >
              <Lightbulb size={15} strokeWidth={2} />
            </button>

            <button
              type="button"
              onClick={() => {
                if (fp) {
                  fp.setPhotoModeActive(true);
                }
                setIsPhotoMode(true);
              }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--surface-raised)',
                color: 'var(--label)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Mode Kamera DSLR [P]"
            >
              <Camera size={15} strokeWidth={2} />
            </button>

            {isInsideBuilding && totalFloors > 1 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--surface-raised)',
                  borderRadius: '10px',
                  padding: '4px 7px'
                }}
              >
                <span
                  style={{
                    fontFamily: FONT_MONO,
                    fontVariantNumeric: 'tabular-nums',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--accent)'
                  }}
                >
                  Lt.{currentFloor}/{totalFloors}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    fp?.traverseFloor('up');
                    fp?.lockPointer();
                    triggerRefresh();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Naik Lantai"
                >
                  <ChevronUp size={13} strokeWidth={2.5} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    fp?.traverseFloor('down');
                    fp?.lockPointer();
                    triggerRefresh();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '2px',
                    cursor: 'pointer',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Turun Lantai"
                >
                  <ChevronDown size={13} strokeWidth={2.5} />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                fp?.releasePointerLock();
                setCameraMode('orbit');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '8px 12px',
                background: 'var(--surface-raised)',
                border: 'none',
                borderRadius: '10px',
                color: 'var(--label)',
                fontSize: '11px',
                fontWeight: 600,
                fontFamily: FONT_SANS,
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

      {/* 7. DSLR Photo Mode Viewfinder: 4 Minimalist Corner Focus Brackets (Zero 3x3 Grid Lines) */}
      {isPhotoMode && (isFirstPerson || isDrone) && (
        <>
          <div
            style={{
              position: 'absolute',
              inset: '44px',
              pointerEvents: 'none'
            }}
          >
            {/* Top-Left Corner Bracket */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '28px',
                height: '28px',
                borderTop: '2px solid rgba(248, 250, 252, 0.85)',
                borderLeft: '2px solid rgba(248, 250, 252, 0.85)',
                borderTopLeftRadius: '6px'
              }}
            />
            {/* Top-Right Corner Bracket */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '28px',
                height: '28px',
                borderTop: '2px solid rgba(248, 250, 252, 0.85)',
                borderRight: '2px solid rgba(248, 250, 252, 0.85)',
                borderTopRightRadius: '6px'
              }}
            />
            {/* Bottom-Left Corner Bracket */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: '28px',
                height: '28px',
                borderBottom: '2px solid rgba(248, 250, 252, 0.85)',
                borderLeft: '2px solid rgba(248, 250, 252, 0.85)',
                borderBottomLeftRadius: '6px'
              }}
            />
            {/* Bottom-Right Corner Bracket */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: '28px',
                height: '28px',
                borderBottom: '2px solid rgba(248, 250, 252, 0.85)',
                borderRight: '2px solid rgba(248, 250, 252, 0.85)',
                borderBottomRightRadius: '6px'
              }}
            />

            {/* Minimal Center Focus Ring */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '14px',
                height: '14px',
                borderRadius: '50%',
                border: '1.5px solid rgba(248, 250, 252, 0.65)'
              }}
            />
          </div>

          {/* DSLR Bottom Control Capsule */}
          <div
            className="glass-surface glass-capsule interactive"
            style={{
              position: 'absolute',
              bottom: '28px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              pointerEvents: 'auto',
              background: 'var(--surface)',
              backdropFilter: 'blur(26px) saturate(185%)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-glass)',
              borderRadius: '9999px',
              fontFamily: FONT_SANS
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)', fontWeight: 600 }}>
                Lensa
              </span>
              {(['24mm', '35mm', '50mm', '85mm'] as DslrLensType[]).map((lens) => (
                <button
                  type="button"
                  key={lens}
                  onClick={() => setDslrLens(lens)}
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '4px 9px',
                    borderRadius: '9999px',
                    background: dslrLens === lens ? 'var(--accent)' : 'var(--surface-raised)',
                    border: 'none',
                    color: dslrLens === lens ? '#FFFFFF' : 'var(--label)',
                    cursor: 'pointer'
                  }}
                  title={DSLR_LENS_MAP[lens].desc}
                >
                  {lens}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={captureDslrPhoto}
              style={{
                padding: '6px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '9999px',
                fontSize: '12px',
                fontWeight: 700,
                fontFamily: FONT_SANS,
                cursor: 'pointer'
              }}
            >
              <Camera size={14} strokeWidth={2} />
              <span>Ambil Foto PNG</span>
            </button>

            <button
              type="button"
              onClick={closePhotoModeAndRelock}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: 'var(--surface-raised)',
                border: 'none',
                color: 'var(--label)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Tutup Mode Foto [P / ESC]"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>
        </>
      )}

      {/* 8. Pointer Lock Released Overlay */}
      {isFirstPerson && !isLocked && !isPhotoMode && !isDrawerOpen && !showGuide && !activeMetricExplanation && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'var(--scrim)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 40,
            pointerEvents: 'auto',
            fontFamily: FONT_SANS
          }}
          onClick={() => {
            if (fp) {
              fp.lockPointer();
            } else if (engine?.renderer?.domElement) {
              engine.renderer.domElement.requestPointerLock?.();
            }
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              backdropFilter: 'blur(28px)',
              borderRadius: '20px',
              padding: '24px 32px',
              boxShadow: '0 20px 48px rgba(15, 23, 42, 0.24)',
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
              if (fp) {
                fp.lockPointer();
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
                background: 'var(--fill-control)',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Footprints size={22} strokeWidth={1.75} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--label)', margin: '0 0 4px' }}>
                Navigasi Dijeda
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--label-secondary)', lineHeight: 1.45, margin: 0 }}>
                Kursor dilepas. Klik untuk mengunci kursor dan melanjutkan eksplorasi.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  if (fp) {
                    fp.lockPointer();
                  } else if (engine?.renderer?.domElement) {
                    engine.renderer.domElement.requestPointerLock?.();
                  }
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  fontFamily: FONT_SANS,
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
                  background: 'var(--surface-raised)',
                  color: 'var(--label)',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: FONT_SANS,
                  cursor: 'pointer'
                }}
              >
                Orbit <span style={{ fontFamily: FONT_MONO }}>[ESC]</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Controls Guide Modal */}
      {showGuide && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--scrim)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            pointerEvents: 'auto',
            fontFamily: FONT_SANS
          }}
          onClick={() => {
            setShowGuide(false);
            fp?.lockPointer();
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '480px',
              width: '92%',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.28)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'var(--fill-control)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Footprints size={18} strokeWidth={1.75} />
                </div>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--label)', margin: 0 }}>
                    Panduan Pejalan Kaki
                  </h3>
                  <p style={{ fontSize: '11px', color: 'var(--label-secondary)', margin: 0 }}>
                    Navigasi fisik • Interaksi ruang • Studio arsitek
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  fp?.lockPointer();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--label-secondary)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>
                  W A S D / Shift
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Berjalan mulus dan sprint di jalan maupun tangga
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>
                  Tab / B
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Buka katalog perabot, bangunan, dan material
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>
                  G / V / X
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Geser posisi, salin cepat, atau hapus perabot
                </div>
              </div>
              <div style={{ background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '12px' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 700, color: 'var(--accent)', marginBottom: '2px' }}>
                  C / M / L / P
                </div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Kuas material, pita laser, lampu plafon, kamera DSLR
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowGuide(false);
                fp?.lockPointer();
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '12px',
                background: 'var(--accent)',
                color: '#FFFFFF',
                border: 'none',
                fontSize: '13px',
                fontWeight: 700,
                fontFamily: FONT_SANS,
                cursor: 'pointer'
              }}
            >
              Lanjut Eksplorasi
            </button>
          </div>
        </div>
      )}

      {/* 10. SNI Microclimate Explanation Modal */}
      {activeMetricExplanation && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'var(--scrim)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100000,
            pointerEvents: 'auto',
            fontFamily: FONT_SANS
          }}
          onClick={() => {
            setActiveMetricExplanation(null);
            fp?.lockPointer();
          }}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: '18px',
              padding: '20px 24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              textAlign: 'left'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--label)', margin: 0 }}>
                {activeMetricExplanation === 'lux' && 'Standar Pencahayaan Ruangan (SNI)'}
                {activeMetricExplanation === 'temp' && 'Standar Kenyamanan Termal (°C)'}
              </h4>
              <button
                type="button"
                onClick={() => {
                  setActiveMetricExplanation(null);
                  fp?.lockPointer();
                }}
                style={{ background: 'transparent', border: 'none', color: 'var(--label-secondary)', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--label-secondary)', lineHeight: 1.55, margin: 0 }}>
              {activeMetricExplanation === 'lux' &&
                'Standar SNI 03-6197 menetapkan iluminasi 150–350 Lux untuk ruang hunian dan kerja. Bukaan jendela tropis dan lampu plafon 2700K menjaga kenyamanan visual tanpa silau.'}
              {activeMetricExplanation === 'temp' &&
                'Rentang kenyamanan termal operatif tropis berada di kisaran 24°C–27.6°C. Plafon tinggi dan ventilasi silang membantu melepas panas bangunan secara pasif.'}
            </p>
            <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => {
                  setActiveMetricExplanation(null);
                  fp?.lockPointer();
                }}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'var(--accent)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: FONT_SANS,
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
