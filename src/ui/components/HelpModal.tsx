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
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Geser Kamera (Pan)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            WASD / Klik Tengah
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Jarak Pandang (Zoom)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Scroll Mouse
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Rotasi Sudut (Orbit)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Klik Kanan Drag / Q & E
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Kemiringan Sudut (Tilt)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Shift + Drag Kanan
          </span>
        </div>
      </div>

      <div className="inset-header">PINTASAN EDITING &amp; ALAT RANCANG</div>
      <div className="inset-group">
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Pilih Alat Cepat (Sesuai Urutan Toolbar)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            1 - 8
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>Daftar Alat (1 s.d. 8)</span>
          <span style={{ fontSize: '11px', color: '#0A2E5B', fontWeight: 600 }}>
            1:Pilih • 2:Jalan • 3:Zona • 4:Bangun • 5:Lansekap • 6:Tanah • 7:Bongkar • 8:Analisis
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Rotasi Bangunan (90°)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            R
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Hapus Objek Terpilih</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Delete / Backspace
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Undo (Batalkan)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Ctrl + Z
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Redo (Ulangi)</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Ctrl + Y / Ctrl + Shift + Z
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Bantuan Ini</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            ? atau Shift + /
          </span>
        </div>
        <div className="inset-row">
          <span style={{ fontSize: '13px', color: '#0F172A', fontWeight: 500 }}>Keluar Mode / Batal</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#0F172A', background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '2px 8px', borderRadius: '6px', fontFamily: 'monospace' }}>
            Esc
          </span>
        </div>
      </div>

      <div className="inset-header">TIPS ARSITEKTUR TROPIS</div>
      <div className="inset-group">
        <div className="inset-row" style={{ background: '#FFFFFF' }}>
          <p style={{ fontSize: '12px', lineHeight: 1.5, color: '#475569', margin: 0 }}>
            Gunakan pengatur waktu di pojok kanan atas untuk melihat pergerakan bayangan matahari dari lintang Yogyakarta (-7.8° LS). Fasad yang menghadap Barat dan Timur menerima radiasi panas tertinggi.
          </p>
        </div>
      </div>
    </ModalSheet>
  );
};
