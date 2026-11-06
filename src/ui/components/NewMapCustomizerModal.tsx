import React, { useState, useEffect } from 'react';
import {
  Compass,
  Layers,
  Trees,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  Check,
  X,
  ArrowRight,
  Mountain,
  Waves,
  Grid,
  Building2,
  FileText
} from 'lucide-react';
import { useUIStore } from '../state/useUIStore';
import type { CustomMapConfig } from '../../core/engine/Engine';

export const NewMapCustomizerModal: React.FC = () => {
  const isNewMapCustomizerOpen = useUIStore((s) => s.isNewMapCustomizerOpen);
  const closeNewMapCustomizer = useUIStore((s) => s.closeNewMapCustomizer);
  const engine = useUIStore((s) => s.engine);
  const setLoadingMap = useUIStore((s) => s.setLoadingMap);
  const setActiveMap = useUIStore((s) => s.setActiveMap);

  const [cityName, setCityName] = useState('Kota Tropis Nusantara');
  const [layoutTemplate, setLayoutTemplate] = useState<'blank_canvas' | 'malioboro_corridor' | 'modern_grid'>('blank_canvas');
  const [topography, setTopography] = useState<'flat_plain' | 'tropical_river_valley' | 'natural_hills'>('flat_plain');
  const [treeDensity, setTreeDensity] = useState<'none' | 'medium' | 'lush'>('medium');
  const [startTime, setStartTime] = useState<number>(8.5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isNewMapCustomizerOpen) return;
      if (e.key === 'Escape') {
        closeNewMapCustomizer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNewMapCustomizerOpen, closeNewMapCustomizer]);

  if (!isNewMapCustomizerOpen) return null;

  const handleBuildCity = async () => {
    if (!engine || isSubmitting) return;
    setIsSubmitting(true);
    setLoadingMap(true, 'Menyiapkan topografi, lanskap, dan tata ruang kota...');

    const config: CustomMapConfig = {
      cityName: cityName.trim() || 'Kota Tropis Nusantara',
      layoutTemplate,
      topography,
      treeDensity,
      startTime,
    };

    try {
      await engine.initializeCustomMap(config);
      setActiveMap('custom_map_active', config.cityName);
      useUIStore.setState({
        isLoggedIn: true,
        currentScreen: 'game',
        isMapHubOpen: false,
        isNewMapCustomizerOpen: false,
        timeOfDay: startTime,
      });
    } catch (err) {
      console.error('[NewMapCustomizerModal] Gagal menginisialisasi peta baru:', err);
    } finally {
      setIsSubmitting(false);
      setLoadingMap(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-map-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
      style={{
        zIndex: 120,
        background: 'rgba(7, 26, 56, 0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl overflow-hidden shadow-2xl transition-all"
        style={{
          background: 'rgba(239, 248, 253, 0.98)',
          border: '1.5px solid rgba(7, 26, 56, 0.18)',
          boxShadow: '0 24px 60px rgba(10, 46, 91, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-8 py-5 border-b"
          style={{
            background: 'rgba(7, 45, 89, 0.94)',
            borderColor: 'rgba(219, 242, 252, 0.18)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-md"
              style={{
                background: 'linear-gradient(135deg, #FD6E8E 0%, #E84D72 100%)',
                color: '#FFFFFF',
              }}
            >
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <span
                className="text-xs font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full"
                style={{
                  background: 'rgba(219, 242, 252, 0.16)',
                  color: '#DBF2FC',
                }}
              >
                GENERATOR KANVAS KOTA
              </span>
              <h2
                id="new-map-modal-title"
                className="text-xl font-bold text-white tracking-tight"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                Kustomisasi Peta Baru
              </h2>
            </div>
          </div>
          <button
            onClick={closeNewMapCustomizer}
            aria-label="Tutup kustomisasi peta"
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: 'rgba(219, 242, 252, 0.14)',
              color: '#DBF2FC',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-8 space-y-7 overflow-y-auto custom-scrollbar flex-1 text-slate-800">
          {/* 1. Nama Kota Baru */}
          <div>
            <label
              htmlFor="city-name-input"
              className="block text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: '#072D59' }}
            >
              Nama Distrik / Kota Baru
            </label>
            <div className="relative">
              <input
                id="city-name-input"
                type="text"
                value={cityName}
                onChange={(e) => setCityName(e.target.value)}
                placeholder="Masukkan nama kota visioner..."
                className="w-full px-4 py-3 rounded-2xl font-semibold text-sm transition-all focus:outline-none"
                style={{
                  background: '#FFFFFF',
                  color: '#072D59',
                  border: '1.5px solid rgba(7, 45, 89, 0.20)',
                  boxShadow: '0 2px 8px rgba(7, 45, 89, 0.04)',
                }}
              />
            </div>
          </div>

          {/* 2. Tata Ruang & Jaringan Jalan Awal */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2.5"
              style={{ color: '#072D59' }}
            >
              Tata Ruang & Jaringan Jalan Awal
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'blank_canvas',
                  title: 'Kanvas Kosong Murni',
                  desc: 'Tanah kosong bersih tanpa jalan/gedung bawaan, siap dibangun dari nol.',
                  icon: Layers,
                },
                {
                  id: 'malioboro_corridor',
                  title: 'Koridor Malioboro',
                  desc: 'Jaringan jalan utama dan tata bangunan heritage Yogyakarta terpadu.',
                  icon: Building2,
                },
                {
                  id: 'modern_grid',
                  title: 'Grid Arsitektur Modern',
                  desc: 'Jaringan jalan berpetak simetris 3x3 siap bangun dengan kavling teratur.',
                  icon: Grid,
                },
              ].map((opt) => {
                const IconComponent = opt.icon;
                const active = layoutTemplate === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayoutTemplate(opt.id as any)}
                    className="p-4 rounded-2xl text-left transition-all relative flex flex-col justify-between"
                    style={{
                      background: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                      border: active ? '2px solid #FD6E8E' : '1px solid rgba(7, 45, 89, 0.14)',
                      boxShadow: active
                        ? '0 6px 20px rgba(253, 110, 142, 0.25)'
                        : '0 2px 6px rgba(7, 45, 89, 0.04)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{
                            background: active ? '#FD6E8E' : 'rgba(7, 45, 89, 0.08)',
                            color: active ? '#FFFFFF' : '#072D59',
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        {active && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ background: '#FD6E8E' }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#072D59' }}>
                        {opt.title}
                      </div>
                      <div className="text-xs mt-1 text-slate-600 line-clamp-2">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Bentang Alam & Topografi */}
          <div>
            <label
              className="block text-xs font-bold uppercase tracking-wider mb-2.5"
              style={{ color: '#072D59' }}
            >
              Bentang Alam & Sungai (Topografi)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'flat_plain',
                  title: 'Dataran Rata Presisi',
                  desc: 'Tanah rata 100% pada elevasi nol untuk kemudahan konstruksi dan pengukuran.',
                  icon: FileText,
                },
                {
                  id: 'tropical_river_valley',
                  title: 'Lembah Sungai Tropis',
                  desc: 'Memahat alur sungai berair jernih membelah peta, jalan melintas otomatis menjadi jembatan.',
                  icon: Waves,
                },
                {
                  id: 'natural_hills',
                  title: 'Kontur Perbukitan Alami',
                  desc: 'Perbukitan landai alami di pinggiran distrik dengan lembah tengah yang siap bangun.',
                  icon: Mountain,
                },
              ].map((opt) => {
                const IconComponent = opt.icon;
                const active = topography === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setTopography(opt.id as any)}
                    className="p-4 rounded-2xl text-left transition-all relative flex flex-col justify-between"
                    style={{
                      background: active ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                      border: active ? '2px solid #FD6E8E' : '1px solid rgba(7, 45, 89, 0.14)',
                      boxShadow: active
                        ? '0 6px 20px rgba(253, 110, 142, 0.25)'
                        : '0 2px 6px rgba(7, 45, 89, 0.04)',
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{
                            background: active ? '#FD6E8E' : 'rgba(7, 45, 89, 0.08)',
                            color: active ? '#FFFFFF' : '#072D59',
                          }}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        {active && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                            style={{ background: '#FD6E8E' }}
                          >
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </div>
                      <div className="font-bold text-sm" style={{ color: '#072D59' }}>
                        {opt.title}
                      </div>
                      <div className="text-xs mt-1 text-slate-600 line-clamp-2">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. Kerapatan Pohon & Waktu Mulai (2 Kolom Bawah) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Kerapatan Pohon */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#072D59' }}
              >
                Kerapatan Pohon Awal
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'Tanpa Pohon' },
                  { id: 'medium', label: 'Sedang' },
                  { id: 'lush', label: 'Rimbun Tropis' },
                ].map((opt) => {
                  const active = treeDensity === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTreeDensity(opt.id as any)}
                      className="py-2.5 px-3 rounded-xl font-bold text-xs transition-all text-center"
                      style={{
                        background: active ? '#072D59' : '#FFFFFF',
                        color: active ? '#DBF2FC' : '#072D59',
                        border: active ? '2px solid #072D59' : '1px solid rgba(7, 45, 89, 0.16)',
                        boxShadow: active ? '0 4px 12px rgba(7, 45, 89, 0.20)' : 'none',
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Waktu Mulai */}
            <div>
              <label
                className="block text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#072D59' }}
              >
                Waktu Mulai Simulasi
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { time: 8.5, label: '08:30 WIB', sub: 'Pagi Cerah', icon: Sunrise },
                  { time: 12.0, label: '12:00 WIB', sub: 'Siang Terik', icon: Sun },
                  { time: 16.25, label: '16:15 WIB', sub: 'Sore Emas', icon: Sunset },
                ].map((opt) => {
                  const active = startTime === opt.time;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.time}
                      type="button"
                      onClick={() => setStartTime(opt.time)}
                      className="py-2.5 px-2 rounded-xl font-bold text-xs transition-all flex flex-col items-center gap-0.5"
                      style={{
                        background: active ? '#072D59' : '#FFFFFF',
                        color: active ? '#DBF2FC' : '#072D59',
                        border: active ? '2px solid #072D59' : '1px solid rgba(7, 45, 89, 0.16)',
                        boxShadow: active ? '0 4px 12px rgba(7, 45, 89, 0.20)' : 'none',
                      }}
                    >
                      <Icon className="w-3.5 h-3.5 mb-0.5" />
                      <span>{opt.label}</span>
                      <span className="text-[10px] font-normal opacity-80">{opt.sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-between px-8 py-5 border-t"
          style={{
            background: 'rgba(255, 255, 255, 0.85)',
            borderColor: 'rgba(7, 45, 89, 0.10)',
          }}
        >
          <button
            type="button"
            onClick={closeNewMapCustomizer}
            className="px-5 py-2.5 rounded-full font-bold text-sm transition-all"
            style={{
              color: '#072D59',
              background: 'rgba(7, 45, 89, 0.08)',
            }}
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleBuildCity}
            disabled={isSubmitting}
            className="flex items-center gap-2.5 px-7 py-3 rounded-full font-bold text-sm transition-all shadow-lg active:scale-95 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #FD6E8E 0%, #E84D72 100%)',
              color: '#FFFFFF',
              boxShadow: '0 8px 24px rgba(253, 110, 142, 0.42)',
            }}
          >
            <span>{isSubmitting ? 'Membangun Distrik...' : 'Bangun & Masuk ke Kota'}</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
};

