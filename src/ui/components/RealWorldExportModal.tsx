import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { RealWorldExporter } from '../../io/RealWorldExporter';
import { UnderlaySettings } from '../../world/UnderlayPlanManager';
import { X, FileCode, Box, Image, Download, Upload, Check, Eye } from 'lucide-react';

interface RealWorldExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RealWorldExportModal: React.FC<RealWorldExportModalProps> = ({ isOpen, onClose }) => {
  const { engine } = useUIStore();
  const [underlayFile, setUnderlayFile] = useState<string | null>(null);
  const [underlaySettings, setUnderlaySettings] = useState<UnderlaySettings>({
    visible: true,
    opacity: 0.65,
    widthM: 60.0,
    lengthM: 60.0,
    offsetX: 0,
    offsetZ: 0,
    rotationDeg: 0
  });

  if (!isOpen || !engine) return null;

  const handleExportDXF = () => {
    const dxfString = RealWorldExporter.exportFloorPlanToDXF(
      engine.buildingManager,
      engine.lotManager,
      engine.roadManager
    );
    RealWorldExporter.downloadDXF(dxfString, 'arscity_denah_2d.dxf');
  };

  const handleExportGLTF = () => {
    RealWorldExporter.exportToGLTF(engine.scene, 'arscity_kota_3d.gltf');
  };

  const handleExportOBJ = () => {
    RealWorldExporter.exportToOBJ(engine.scene, 'arscity_kota_3d.obj');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUnderlayFile(file.name);
    await engine.underlayPlanManager.loadPlanFromFile(file);
    setUnderlaySettings(engine.underlayPlanManager.settings);
  };

  const handleUpdateUnderlay = (updates: Partial<UnderlaySettings>) => {
    const next = { ...underlaySettings, ...updates };
    setUnderlaySettings(next);
    engine.underlayPlanManager.updateTransform(updates);
  };

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '540px',
          maxWidth: '92vw',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileCode size={18} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Jembatan Dunia Nyata (CAD & 3D Export)
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Interoperabilitas AutoCAD, SketchUp, Blender, dan Gambar Denah
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Modal">
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-sheet-body">
          {/* Section 1: Ekspor 2D CAD & 3D */}
          <div className="inset-header">EKSPOR GAMBAR KERJA & MODEL 3D</div>
          <div className="inset-group">
            {/* DXF */}
            <div className="inset-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Gambar Denah AutoCAD 2D (.DXF)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Garis kavling, dinding luar, partisi dalam 15cm, dan label ruang
                </div>
              </div>
              <button
                onClick={handleExportDXF}
                className="ios-btn ios-btn-primary"
                style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
              >
                <Download size={13} strokeWidth={1.75} />
                <span>Unduh DXF</span>
              </button>
            </div>

            {/* glTF */}
            <div className="inset-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Model 3D Standar Web (.glTF)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Format universal untuk Blender, Three.js, dan engine rendering
                </div>
              </div>
              <button
                onClick={handleExportGLTF}
                className="ios-btn"
                style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
              >
                <Box size={13} strokeWidth={1.75} />
                <span>Unduh glTF</span>
              </button>
            </div>

            {/* OBJ */}
            <div className="inset-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Model Geometri Wavefront (.OBJ)</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  Kompatibel dengan SketchUp, Rhino, ArchiCAD, dan Revit
                </div>
              </div>
              <button
                onClick={handleExportOBJ}
                className="ios-btn"
                style={{ fontSize: '12px', padding: '5px 12px', gap: '6px' }}
              >
                <Download size={13} strokeWidth={1.75} />
                <span>Unduh OBJ</span>
              </button>
            </div>
          </div>

          {/* Section 2: Impor Gambar Denah Underlay (Tracing) */}
          <div className="inset-header">IMPOR GAMBAR DENAH SEBAGAI DASAR JIPLAK (UNDERLAY)</div>
          <div className="inset-group">
            <div className="inset-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Unggah Gambar Denah Arsitektur</div>
                <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                  {underlayFile ? `Berkas aktif: ${underlayFile}` : 'Pilih file PNG atau JPG denah rumah/site plan dari komputermu'}
                </div>
              </div>
              <label className="ios-btn" style={{ fontSize: '12px', padding: '5px 12px', gap: '6px', cursor: 'pointer' }}>
                <Upload size={13} strokeWidth={1.75} />
                <span>Pilih Berkas</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleFileUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {engine.underlayPlanManager.hasUnderlay() && (
              <>
                {/* Opacity Slider */}
                <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--label-secondary)' }}>Transparansi Gambar</span>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>
                      {Math.round(underlaySettings.opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={underlaySettings.opacity}
                    onChange={(e) => handleUpdateUnderlay({ opacity: parseFloat(e.target.value) })}
                    className="ios-slider"
                    aria-label="Transparansi Underlay"
                  />
                </div>

                {/* Dimension Width/Length */}
                <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: 'var(--label-secondary)' }}>Skala Ukuran Denah (Lebar)</span>
                    <span className="tabular-nums" style={{ fontWeight: 600 }}>
                      {underlaySettings.widthM} m
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={underlaySettings.widthM}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      handleUpdateUnderlay({ widthM: v, lengthM: v });
                    }}
                    className="ios-slider"
                    aria-label="Ukuran Underlay"
                  />
                </div>
              </>
            )}

            <div className="inset-footer">
              Gambar denah diproyeksikan langsung pada permukaan tanah untuk mempermudah jiplak (*tracing*) jalan dan tapak bangunan dengan skala presisi.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              onClick={onClose}
              className="ios-btn ios-btn-primary"
              style={{ padding: '8px 22px', fontSize: '13px' }}
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
