import React from 'react';
import { Keyboard } from 'lucide-react';
import { ModalSheet } from '../primitives/ModalSheet';

export interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  return (
    <ModalSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Pintasan Keyboard"
      subtitle="Navigasi kamera dan alat rancang cepat"
      icon={Keyboard}
      width="540px"
      footer={
        <button
          onClick={onClose}
          className="ios-btn ios-btn-primary"
          style={{ padding: '8px 22px', fontSize: '13px' }}
        >
          Tutup
        </button>
      }
    >
      <div className="inset-header">NAVIGASI KAMERA</div>
      <div className="inset-group">
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Geser Kamera (Pan)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            WASD / Klik Tengah
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Jarak Pandang (Zoom)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Scroll Mouse
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Rotasi Sudut (Orbit)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Klik Kanan Drag / Q & E
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Kemiringan Sudut (Tilt)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Shift + Drag Kanan
          </span>
        </div>
      </div>

      <div className="inset-header">PINTASAN EDITING</div>
      <div className="inset-group">
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Undo (Batalkan)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Ctrl + Z
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Redo (Ulangi)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Ctrl + Y / Ctrl + Shift + Z
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Bantuan Ini</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            ? atau Shift + /
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: 'var(--label)' }}>Keluar Mode / Batal</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)', fontFamily: 'monospace' }}>
            Esc
          </span>
        </div>
      </div>

      <div className="inset-header">TIPS ARSITEKTUR TROPIS</div>
      <div className="inset-group">
        <div className="inset-row" style={{ background: 'var(--fill-control)' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label)', margin: 0 }}>
            Gunakan pengatur waktu di pojok kanan atas untuk melihat pergerakan bayangan matahari dari lintang Yogyakarta (-7.8° LS). Fasad yang menghadap Barat dan Timur menerima radiasi panas tertinggi.
          </p>
        </div>
      </div>
    </ModalSheet>
  );
};
