import React from 'react';
import { useUIStore } from '../state/useUIStore';
import { DSLR_LENS_MAP, DslrLensType } from '../../core/engine/CinematicDroneController';
import { Camera, Video, Square, X, Compass, Footprints, Play, Pause, Sparkles, Building2, ChevronUp, ChevronDown, Film, Plus, Trash2, Armchair, Sun, Wind, Volume2, Thermometer, RefreshCw } from 'lucide-react';

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

  const isLocked = engine?.firstPersonController?.isPointerLocked ?? false;
  const isUnderRoof = engine?.firstPersonController?.isUnderRoof ?? false;
  const isInsideBuilding = Boolean(
    engine?.firstPersonController?.insideBuildingId ||
    engine?.firstPersonController?.insideBuildingName
  );
  const currentFloor = engine?.firstPersonController?.currentFloor ?? 1;
  const totalFloors = engine?.firstPersonController?.totalFloors ?? 1;
  const insideBuildingName = engine?.firstPersonController?.insideBuildingName ?? '';
  const roomMetrics = isInsideBuilding ? engine?.firstPersonController?.getCurrentRoomMetrics() : null;
  const isSeated = engine?.firstPersonController?.isSeated ?? false;
  const nearbySeat = engine?.firstPersonController?.nearbySeat ?? null;

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
      {/* 1. First-Person Reticle */}
      {isFirstPerson && !isPhotoMode && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 255, 255, 0.85)',
              boxShadow: '0 0 4px rgba(0, 0, 0, 0.6)'
            }}
          />
        </div>
      )}

      {/* 2. Recording Status Badge */}
      {isRecordingVideo && (
        <div
          className="glass-surface glass-capsule"
          style={{
            position: 'absolute',
            top: '80px',
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

      {/* 3. Drone Free-Fly & Keyframe Director Pill */}
      {isDrone && !isPhotoMode && (
        <>
          <div
            className="glass-surface glass-capsule interactive"
            style={{
              position: 'absolute',
              top: '80px',
              right: '24px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              pointerEvents: 'auto'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                {engine?.cinematicDroneController.isActive
                  ? engine.cinematicDroneController.subMode === 'custom_tour'
                    ? 'Tur Custom'
                    : 'Tur Landmark'
                  : 'Drone Free-Fly'}
              </span>
            </div>

            {!engine?.cinematicDroneController.isActive ? (
              <>
                <button
                  onClick={() => {
                    if (!engine) return;
                    engine.cinematicDroneController.addKeyframe(
                      undefined,
                      engine.lightingSystem.currentHour
                    );
                    triggerRefresh();
                  }}
                  className="ios-btn"
                  style={{ padding: '3px 9px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Simpan posisi, sudut pandang, dan jam matahari drone saat ini sebagai keyframe"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  <span>Tambah Titik Keyframe Kamera ({engine?.cinematicDroneController.customKeyframes.length || 0})</span>
                </button>

                {(engine?.cinematicDroneController.customKeyframes.length || 0) >= 2 && (
                  <button
                    onClick={() => {
                      if (!engine) return;
                      engine.cinematicDroneController.startCustomTour(30);
                      triggerRefresh();
                    }}
                    className="ios-btn ios-btn-primary"
                    style={{ padding: '3px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Putar tur sinematik melewati titik-titik keyframe buatan"
                  >
                    <Film size={12} strokeWidth={2} />
                    <span>Putar Tur Sinematik</span>
                  </button>
                )}

                {(engine?.cinematicDroneController.customKeyframes.length || 0) > 0 && (
                  <button
                    onClick={() => {
                      engine?.cinematicDroneController.clearKeyframes();
                      triggerRefresh();
                    }}
                    className="icon-btn"
                    title="Hapus semua titik keyframe"
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    engine?.cinematicDroneController.togglePause();
                    triggerRefresh();
                  }}
                  className="icon-btn"
                  title="Jeda / Lanjutkan Tur"
                >
                  {engine?.cinematicDroneController.isPaused ? (
                    <Play size={14} strokeWidth={2} />
                  ) : (
                    <Pause size={14} strokeWidth={2} />
                  )}
                </button>

                <button
                  onClick={() => {
                    engine?.cinematicDroneController.stopTour();
                    triggerRefresh();
                  }}
                  className="ios-btn"
                  style={{ padding: '3px 10px', fontSize: '11px' }}
                >
                  Hentikan Tur
                </button>
              </>
            )}

            <button
              onClick={() => setCameraMode('orbit')}
              className="icon-btn"
              title="Keluar ke Mode Orbit Arsitek"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>

          {/* Bottom Drone Free-Fly Info Pill */}
          {!engine?.cinematicDroneController.isActive && (
            <div
              className="glass-surface glass-capsule interactive"
              style={{
                position: 'absolute',
                bottom: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                padding: '8px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                pointerEvents: 'auto',
                fontSize: '12px',
                color: 'var(--label)'
              }}
            >
              <span>WASD: Terbang • E/Space: Naik • Q/C: Turun • Scroll: Kecepatan ({Math.round(engine?.cameraController?.droneSpeed || 12)} m/s)</span>
            </div>
          )}
        </>
      )}

      {/* 4. First-Person Navigation Help Pill */}
      {isFirstPerson && !isPhotoMode && (
        <div
          className="glass-surface glass-capsule interactive"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            pointerEvents: 'auto'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--label)' }}>
            <Footprints size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <span>
              {isSeated
                ? 'Sedang Duduk (0.45m) • Tekan WASD / Space / E untuk Berdiri'
                : 'WASD: Jalan • Shift: Lari • Space: Lompat'}
            </span>
          </div>

          {nearbySeat && !isSeated && (
            <button
              onClick={() => {
                if (engine?.firstPersonController && nearbySeat) {
                  engine.firstPersonController.sitDown(nearbySeat);
                }
              }}
              className="ios-btn ios-btn-primary"
              style={{
                padding: '3px 10px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(56, 189, 248, 0.2)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)'
              }}
              title="Duduk di Kursi (Tombol E)"
            >
              <Armchair size={13} strokeWidth={2} />
              <span>Duduk [E] — {nearbySeat.label}</span>
            </button>
          )}

          {isInsideBuilding && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '3px 10px',
                borderRadius: '8px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent)',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--accent)'
              }}
            >
              <Building2 size={13} strokeWidth={2} />
              <span>
                Lantai {currentFloor} / {totalFloors}{insideBuildingName ? ` — ${insideBuildingName}` : ''}
              </span>
              {totalFloors > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                  <button
                    onClick={() => engine?.firstPersonController.traverseFloor('up')}
                    className="icon-btn"
                    style={{ padding: '2px 4px', height: 'auto', color: 'var(--accent)' }}
                    title="Naik Tangga / Lantai (Tombol R)"
                  >
                    <ChevronUp size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => engine?.firstPersonController.traverseFloor('down')}
                    className="icon-btn"
                    style={{ padding: '2px 4px', height: 'auto', color: 'var(--accent)' }}
                    title="Turun Tangga / Lantai (Tombol F)"
                  >
                    <ChevronDown size={12} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => {
                      const next = currentFloor < totalFloors ? currentFloor + 1 : 1;
                      engine?.firstPersonController.goToFloor(next);
                    }}
                    className="ios-btn ios-btn-primary"
                    style={{ padding: '2px 7px', fontSize: '10px', height: 'auto', display: 'flex', alignItems: 'center', gap: '3px' }}
                    title="Inti Lift Cepat (Tombol E)"
                  >
                    Lift [E]
                  </button>
                  {totalFloors > 2 && (
                    <select
                      value={currentFloor}
                      onChange={(e) => engine?.firstPersonController.goToFloor(Number(e.target.value))}
                      style={{
                        background: 'transparent',
                        color: 'var(--accent)',
                        border: '1px solid var(--accent)',
                        borderRadius: '4px',
                        fontSize: '10px',
                        padding: '1px 3px',
                        fontFamily: '"JetBrains Mono", monospace'
                      }}
                      title="Pilih Lantai Langsung"
                    >
                      {Array.from({ length: totalFloors }, (_, i) => i + 1).map((fl) => (
                        <option key={fl} value={fl} style={{ background: '#1e293b', color: '#fff' }}>
                          Lt {fl}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          {isUnderRoof && !isInsideBuilding && (
            <span
              style={{
                fontSize: '11px',
                background: 'var(--accent-subtle)',
                color: 'var(--accent)',
                padding: '2px 6px',
                borderRadius: '6px',
                fontWeight: 600
              }}
            >
              Dalam Ruangan
            </span>
          )}

          {!isLocked ? (
            <button
              onClick={() => engine?.firstPersonController.lockPointer()}
              className="ios-btn ios-btn-primary"
              style={{ padding: '4px 10px', fontSize: '11px' }}
            >
              Kunci Kursor (Look)
            </button>
          ) : (
            <span style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Tekan ESC untuk lepas</span>
          )}

          <button
            onClick={() => {
              if (document.pointerLockElement) {
                document.exitPointerLock();
              }
              setCameraMode('orbit');
            }}
            className="ios-btn ios-btn-primary"
            style={{ padding: '4px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Kembali ke Mode Orbit Arsitek (God-Eye)"
          >
            <X size={13} strokeWidth={2} />
            <span>Keluar ke God-Eye</span>
          </button>
        </div>
      )}

      {/* 5. DSLR Photo Mode Viewfinder & Controls */}
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
            {/* Horizontal lines */}
            <div style={{ position: 'absolute', top: '33.33%', left: 0, right: 0, borderTop: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
            <div style={{ position: 'absolute', top: '66.66%', left: 0, right: 0, borderTop: '0.5px dashed rgba(255, 255, 255, 0.2)' }} />
            {/* Vertical lines */}
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
              pointerEvents: 'auto'
            }}
          >
            {/* Lens Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--label-secondary)', fontWeight: 600 }}>Lensa:</span>
              {(['24mm', '50mm', '85mm'] as DslrLensType[]).map((lens) => (
                <button
                  key={lens}
                  onClick={() => setDslrLens(lens)}
                  className={`segmented-item ${dslrLens === lens ? 'active' : ''}`}
                  style={{ fontSize: '11px', padding: '3px 8px' }}
                  title={DSLR_LENS_MAP[lens].desc}
                >
                  {lens}
                </button>
              ))}
            </div>

            <div className="divider-v" />

            {/* Shutter Button */}
            <button
              onClick={captureDslrPhoto}
              className="ios-btn ios-btn-primary"
              style={{ padding: '6px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Camera size={15} strokeWidth={2} />
              <span>Ambil Foto (PNG)</span>
            </button>

            {/* Close Photo Mode */}
            <button
              onClick={() => setIsPhotoMode(false)}
              className="icon-btn"
              title="Tutup Mode Foto"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </>
      )}
      {/* 5. Indoor Micro-Room Telemetry Card (Laboratory Glass Card) */}
      {isFirstPerson && !isPhotoMode && isInsideBuilding && roomMetrics && (
        <div
          className="glass-surface interactive"
          style={{
            position: 'absolute',
            top: '80px',
            left: '24px',
            width: '280px',
            borderRadius: '12px',
            padding: '12px 14px',
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--hairline-soft)'
          }}
        >
          {/* Header: Building & Floor & Room */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--hairline)', paddingBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={15} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)' }}>
                  {insideBuildingName || 'Bangunan'}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--label-secondary)', fontFamily: 'var(--font-mono)' }}>
                  Lantai {currentFloor} dari {totalFloors} ? {roomMetrics.roomName}
                </div>
              </div>
            </div>
          </div>

          {/* Environmental Telemetry Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
            {/* Lux */}
            <div style={{ background: 'var(--fill-control)', padding: '6px 8px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--label-secondary)', fontSize: '10px' }}>
                <Sun size={12} strokeWidth={1.75} style={{ color: '#f59e0b' }} />
                <span>Cahaya Alami</span>
              </div>
              <div className="tabular-nums font-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)', marginTop: '2px' }}>
                {roomMetrics.lux} Lux
              </div>
              <div style={{ fontSize: '9px', color: roomMetrics.sniLuxStatus === 'Optimum (SNI)' ? 'var(--good)' : 'var(--warn)' }}>
                {roomMetrics.sniLuxStatus}
              </div>
            </div>

            {/* Thermal & ACH */}
            <div style={{ background: 'var(--fill-control)', padding: '6px 8px', borderRadius: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--label-secondary)', fontSize: '10px' }}>
                <Wind size={12} strokeWidth={1.75} style={{ color: '#06b6d4' }} />
                <span>Suhu & Udara</span>
              </div>
              <div className="tabular-nums font-mono" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--label)', marginTop: '2px' }}>
                {roomMetrics.temperatureC.toFixed(1)} ?C
              </div>
              <div style={{ fontSize: '9px', color: 'var(--label-secondary)' }}>
                {roomMetrics.ach.toFixed(1)} ACH (Sirkulasi)
              </div>
            </div>

            {/* Noise Level */}
            <div style={{ gridColumn: 'span 2', background: 'var(--fill-control)', padding: '6px 8px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--label-secondary)', fontSize: '10px' }}>
                <Volume2 size={12} strokeWidth={1.75} />
                <span>Akustik Interior:</span>
              </div>
              <span className="tabular-nums font-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--good)' }}>
                {roomMetrics.noiseDba} dBA (Tenang)
              </span>
            </div>
          </div>

          {/* Interactive Variant & Lighting Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--hairline)', paddingTop: '6px' }}>
            <button
              onClick={() => {
                if (engine?.firstPersonController) {
                  engine.firstPersonController.cycleInteriorVariant();
                  triggerRefresh();
                }
              }}
              className="ios-btn"
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--fill-control)',
                borderRadius: '6px',
                border: '1px solid var(--hairline-soft)',
                color: 'var(--label)'
              }}
              title="Ganti tata letak furnitur ruangan [Pintasan: G]"
            >
              <span>[G] Tata Letak:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                {roomMetrics.interiorVariantName.split(': ')[1] || roomMetrics.interiorVariantName}
              </span>
            </button>

            <button
              onClick={() => {
                if (engine?.firstPersonController) {
                  engine.firstPersonController.toggleCeilingLight();
                  triggerRefresh();
                }
              }}
              className="ios-btn"
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: engine?.firstPersonController?.isCeilingLightOn ? 'rgba(245, 158, 11, 0.2)' : 'var(--fill-control)',
                borderRadius: '6px',
                border: engine?.firstPersonController?.isCeilingLightOn ? '1px solid #f59e0b' : '1px solid var(--hairline-soft)',
                color: engine?.firstPersonController?.isCeilingLightOn ? '#f59e0b' : 'var(--label)'
              }}
              title="Saklar lampu plafon hangat 2700K [Pintasan: L]"
            >
              <span>[L] Lampu 2700K:</span>
              <span style={{ fontWeight: 700 }}>
                {engine?.firstPersonController?.isCeilingLightOn ? 'MENYALA' : 'PADAM'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
