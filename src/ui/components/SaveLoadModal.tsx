import React, { useState, useEffect } from 'react';
import { useUIStore } from '../state/useUIStore';
import { LocalStorageManager, SlotMetadata } from '../../io/LocalStorageManager';
import { JsonExporter } from '../../io/JsonExporter';
import { ScreenshotExporter } from '../../io/ScreenshotExporter';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import {
  X,
  Save,
  Download,
  Upload,
  FileCode2,
  Trash2,
  RotateCcw,
  CheckCircle2,
  HardDrive
} from 'lucide-react';

import { useModalA11y } from '../hooks/useModalA11y';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveLoadModal: React.FC<SaveLoadModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalA11y(isOpen, onClose);
  const { engine } = useUIStore();
  const [slots, setSlots] = useState<SlotMetadata[]>([]);
  const [activeSlotId, setActiveSlotId] = useState<string>('slot_1');
  const [cityNameInput, setCityNameInput] = useState<string>('Kota Tropis Asri');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      LocalStorageManager.listSlots().then(setSlots);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleSaveSlot = async (slotId: string) => {
    if (!engine) return;
    const res = await LocalStorageManager.saveToSlot(slotId, engine, cityNameInput);
    if (res.success) {
      const updated = await LocalStorageManager.listSlots();
      setSlots(updated);
      showNotification(`Tersimpan di ${slotId === 'autosave' ? 'Simpan Otomatis' : `Slot #${slotId.split('_')[1]}`}`);
      proceduralAudio.playClick();
    } else {
      showNotification(`Gagal menyimpan: ${res.error || 'Kesalahan sistem'}`);
    }
  };

  const handleLoadSlot = async (slotId: string) => {
    if (!engine) return;
    const res = await LocalStorageManager.loadFromSlot(slotId, engine);
    if (res.success) {
      showNotification(`Kota berhasil dimuat dari ${slotId}`);
      proceduralAudio.playClick();
      onClose();
    } else {
      showNotification(`Gagal memuat: ${res.error || 'Data tidak valid'}`);
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    await LocalStorageManager.deleteSlot(slotId);
    const updated = await LocalStorageManager.listSlots();
    setSlots(updated);
    showNotification(`Slot ${slotId} berhasil dikosongkan.`);
    proceduralAudio.playDemolish();
  };

  const handleExportJson = () => {
    if (!engine) return;
    JsonExporter.exportCityToJson(engine);
    showNotification('Berkas JSON berhasil diunduh');
    proceduralAudio.playClick();
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !engine) return;

    const res = await JsonExporter.importCityFromJson(file, engine);
    if (res.success) {
      showNotification('Kota berhasil diimpor dari berkas JSON');
      proceduralAudio.playClick();
      onClose();
    } else {
      showNotification(`Gagal mengimpor: ${res.error || 'Pastikan file JSON valid.'}`);
    }
  };

  const handleExportSvg = () => {
    if (!engine) return;
    ScreenshotExporter.exportFloorPlanToSvg(engine);
    showNotification('Denah 2D SVG berhasil diunduh');
    proceduralAudio.playClick();
  };

  const formatDate = (ts: number): string => {
    if (!ts) return 'Belum ada data';
    const d = new Date(ts);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saveload-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="modal-sheet"
        style={{
          width: '740px',
          maxWidth: '92vw',
          maxHeight: '85vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(10, 132, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <HardDrive size={20} color="#007AFF" strokeWidth={2.2} />
            </div>
            <div>
              <div id="saveload-modal-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lab-title-color)', letterSpacing: '-0.01em' }}>
                Simpan & Muat Kota
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lab-subtitle-color)', marginTop: '2px' }}>
                Arsip penyimpanan lokal dan ekspor denah arsitektur
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Tutup Dialog"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: 'var(--fill-control)',
              border: '1px solid var(--hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--label-secondary)',
              transition: 'all 0.15s ease'
            }}
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(52, 199, 89, 0.12)',
              borderBottom: '0.5px solid rgba(52, 199, 89, 0.25)',
              color: 'var(--good)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={14} strokeWidth={2} />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Body */}
        <div className="modal-sheet-body">
          {/* City Name Row */}
          <div className="inset-group">
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)', width: '90px' }}>Nama Kota:</span>
              <input
                type="text"
                value={cityNameInput}
                onChange={(e) => setCityNameInput(e.target.value)}
                placeholder="Ketik nama kota..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--label)',
                  fontSize: '13px',
                  fontWeight: 500,
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Slot Grid */}
          <div className="inset-header">SLOT PENYIMPANAN LOKAL</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            {slots.map((slot) => {
              const isSelected = activeSlotId === slot.slotId;
              return (
                <div
                  key={slot.slotId}
                  onClick={() => setActiveSlotId(slot.slotId)}
                  className="inset-group"
                  style={{
                    padding: '12px 14px',
                    borderColor: isSelected ? 'var(--accent)' : undefined,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    marginBottom: 0
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label)' }}>
                      {slot.name}
                    </span>
                    {slot.isEmpty ? (
                      <span style={{ fontSize: '11px', color: 'var(--label-tertiary)' }}>Kosong</span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--good)', fontWeight: 600 }}>Tersimpan</span>
                    )}
                  </div>

                  <div className="tabular-nums" style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                    Waktu: {formatDate(slot.timestamp)}
                  </div>

                  {!slot.isEmpty && (
                    <div className="tabular-nums" style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                      {slot.buildingCount} Gedung • {slot.roadCount} Ruas • {slot.lotCount} Kavling
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSaveSlot(slot.slotId);
                      }}
                      className="ios-btn ios-btn-primary"
                      style={{ flex: 1, padding: '4px', fontSize: '11px' }}
                    >
                      <Save size={12} strokeWidth={1.75} />
                      <span>Simpan</span>
                    </button>

                    <button
                      disabled={slot.isEmpty}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSlot(slot.slotId);
                      }}
                      className="ios-btn"
                      style={{ flex: 1, padding: '4px', fontSize: '11px', opacity: slot.isEmpty ? 0.35 : 1 }}
                    >
                      <RotateCcw size={12} strokeWidth={1.75} />
                      <span>Muat</span>
                    </button>

                    {!slot.isEmpty && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSlot(slot.slotId);
                        }}
                        className="ios-btn ios-btn-destructive"
                        style={{ padding: '4px 8px' }}
                        title="Hapus Simpanan"
                        aria-label="Hapus"
                      >
                        <Trash2 size={12} strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Import / Export File Utilities */}
          <div className="inset-header">EKSPOR & IMPOR BERKAS</div>
          <div className="inset-group">
            <div className="inset-row inset-row-clickable" onClick={handleExportJson}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Unduh File JSON Kota</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Cadangan format terbuka</div>
                </div>
              </div>
            </div>

            <div className="inset-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', cursor: 'pointer' }}>
                <Upload size={15} strokeWidth={1.75} style={{ color: 'var(--good)' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Impor File JSON Kota</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Buka file tata ruang arscity</div>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            <div className="inset-row inset-row-clickable" onClick={handleExportSvg}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode2 size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500 }}>Ekspor Denah 2D Bervektor (SVG)</div>
                  <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>Blueprint denah arsitektur</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
