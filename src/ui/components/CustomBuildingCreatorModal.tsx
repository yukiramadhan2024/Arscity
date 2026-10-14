import React, { useState } from 'react';
import { useUIStore } from '../state/useUIStore';
import { CustomSelect } from './CustomSelect';
import { RoofType, WallMaterialType, BuildingInstance } from '../../buildings/PrefabTypes';
import { proceduralAudio } from '../../audio/ProceduralAudio';
import { AddBuildingCommand } from '../../core/commands/CityCommands';
import {
  X,
  Building2,
  Layers,
  Palette,
  Check,
  Sparkles,
  Maximize2,
  Home,
  Sliders
} from 'lucide-react';

interface CustomBuildingCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomBuildingCreatorModal: React.FC<CustomBuildingCreatorModalProps> = ({
  isOpen,
  onClose
}) => {
  const { engine, setActiveTool } = useUIStore();

  const [buildingName, setBuildingName] = useState<string>('Villa Tropis Kustom');
  const [width, setWidth] = useState<number>(10);
  const [length, setLength] = useState<number>(12);
  const [floorCount, setFloorCount] = useState<number>(2);
  const [floorHeight, setFloorHeight] = useState<number>(3.2);

  // Materials & Textures
  const [wallMaterial, setWallMaterial] = useState<WallMaterialType>('plaster');
  const [wallColor, setWallColor] = useState<string>('#f8fafc');
  const [roofType, setRoofType] = useState<RoofType>('hip');
  const [roofMaterial, setRoofMaterial] = useState<string>('dark_zinc');
  const [roofOverhang, setRoofOverhang] = useState<number>(1.2);

  if (!isOpen) return null;

  const COLOR_PALETTES = [
    { label: 'Putih Murni', hex: '#f8fafc' },
    { label: 'Abu Semen', hex: '#e2e8f0' },
    { label: 'Krem Pasir', hex: '#fef3c7' },
    { label: 'Bata Merah', hex: '#9a3412' },
    { label: 'Kayu Jati', hex: '#78350f' },
    { label: 'Arang Gelap', hex: '#1e293b' },
    { label: 'Hijau Sage', hex: '#4d7c0f' },
    { label: 'Biru Arsitek', hex: '#0284c7' }
  ];

  const footprintArea = width * length;
  const totalFloorArea = footprintArea * floorCount;
  const totalHeight = floorCount * floorHeight + (roofType === 'flat' ? 0.4 : 2.8);

  const handleCreateAndPlace = () => {
    if (!engine) return;

    const customId = `custom_bld_${Date.now()}`;
    const targetPos = engine.cameraController.target.clone();

    const instance: BuildingInstance = {
      id: customId,
      presetKey: 'custom_designer',
      name: buildingName || 'Bangunan Kustom',
      category: 'residential',
      position: targetPos,
      rotationY: 0,
      width,
      length,
      floorCount,
      floorHeight,
      roofType,
      roofOverhang,
      wallMaterial,
      wallColor,
      roofMaterial: roofMaterial as any
    };

    // Execute via command manager
    engine.executeCommand(new AddBuildingCommand(engine, instance));
    proceduralAudio.playPlaceBuilding();

    // Select the newly built custom building
    engine.buildingManager.selectBuilding(customId);
    setActiveTool('select');
    onClose();
  };

  const handleArmBuildingTool = () => {
    if (!engine) return;

    // Set custom building properties onto buildingTool
    engine.buildingTool.activePresetKey = 'house_2story'; // Base template
    // Switch to build tool
    setActiveTool('build');
    onClose();
  };

  return (
    <div className="modal-overlay interactive" role="dialog" aria-modal="true">
      <div
        className="modal-sheet"
        style={{
          width: '560px',
          maxWidth: '92vw',
          maxHeight: '88vh'
        }}
      >
        {/* Header */}
        <div className="modal-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--accent-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)'
              }}
            >
              <Building2 size={18} strokeWidth={2} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--label)' }}>
                Studio Bangunan & Tekstur Kustom
              </div>
              <div style={{ fontSize: '11px', color: 'var(--label-secondary)' }}>
                Rancang proporsi massa, material tekstur, dan fasad sendiri
              </div>
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="Tutup Studio">
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-sheet-body" style={{ overflowY: 'auto', padding: '16px' }}>
          {/* Quick Metrics Bar */}
          <div
            className="glass-surface"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '10px 14px',
              borderRadius: '14px',
              marginBottom: '14px',
              border: '0.5px solid var(--separator)'
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--label-secondary)', fontWeight: 500 }}>TAPAK DASAR</div>
              <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--label)' }}>
                {footprintArea} m²
              </div>
            </div>
            <div className="divider-v" style={{ height: '24px' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--label-secondary)', fontWeight: 500 }}>TOTAL LANTAI</div>
              <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--accent)' }}>
                {totalFloorArea} m²
              </div>
            </div>
            <div className="divider-v" style={{ height: '24px' }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '10px', color: 'var(--label-secondary)', fontWeight: 500 }}>TINGGI MASSA</div>
              <div className="tabular-nums" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--label)' }}>
                {totalHeight.toFixed(1)} m
              </div>
            </div>
          </div>

          {/* Section 1: Nama & Dimensi */}
          <div className="inset-header">NAMA & MASSA BANGUNAN</div>
          <div className="inset-group">
            <div className="inset-row">
              <span style={{ fontSize: '13px', color: 'var(--label-secondary)', minWidth: '90px' }}>Nama Desain</span>
              <input
                type="text"
                value={buildingName}
                onChange={(e) => setBuildingName(e.target.value)}
                style={{
                  flex: 1,
                  background: 'var(--fill-control)',
                  border: '0.5px solid var(--separator)',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '13px',
                  color: 'var(--label)',
                  outline: 'none'
                }}
              />
            </div>

            {/* Slider Lebar */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Lebar Massa (Depan)</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{width} meter</span>
              </div>
              <input
                type="range"
                min="4"
                max="36"
                step="1"
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Lebar Massa"
              />
            </div>

            {/* Slider Panjang */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Panjang Massa (Samping)</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{length} meter</span>
              </div>
              <input
                type="range"
                min="4"
                max="40"
                step="1"
                value={length}
                onChange={(e) => setLength(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Panjang Massa"
              />
            </div>

            {/* Slider Jumlah Lantai */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Jumlah Lantai</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{floorCount} Lantai</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={floorCount}
                onChange={(e) => setFloorCount(parseInt(e.target.value))}
                className="ios-slider"
                aria-label="Jumlah Lantai"
              />
            </div>
          </div>

          {/* Section 2: Tekstur Dinding & Warna */}
          <div className="inset-header">TEKSTUR MATERIAL DINDING</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tekstur Dinding</span>
              <CustomSelect<WallMaterialType>
                value={wallMaterial}
                onChange={setWallMaterial}
                options={[
                  { value: 'plaster', label: 'Plester & Cat Halus', badge: 'Halus', description: 'Permukaan plester kapur tropis' },
                  { value: 'brick', label: 'Bata Merah Ekspos', badge: 'Tekstur', description: 'Pola bata merah alami berkarakter' },
                  { value: 'concrete', label: 'Beton Cor Board-Formed', badge: 'Brutalis', description: 'Serat cetakan papan kayu pada beton' },
                  { value: 'wood', label: 'Kayu Jati Kisi Vertikal', badge: 'Tropis', description: 'Slat kayu jati penangkal panas' }
                ]}
              />
            </div>

            {/* Warna Dinding */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Palet Warna Dinding</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {COLOR_PALETTES.map((pal) => (
                  <button
                    key={pal.hex}
                    type="button"
                    onClick={() => setWallColor(pal.hex)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      border: wallColor === pal.hex ? '1.5px solid var(--accent)' : '0.5px solid var(--separator)',
                      background: 'var(--fill-control)',
                      cursor: 'pointer'
                    }}
                  >
                    <span
                      style={{
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: pal.hex,
                        border: '1px solid rgba(0,0,0,0.15)'
                      }}
                    />
                    <span style={{ fontSize: '11px', color: 'var(--label)' }}>{pal.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Bentuk & Tekstur Atap */}
          <div className="inset-header">BENTUK & TEKSTUR ATAP TROPIS</div>
          <div className="inset-group">
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Bentuk Atap</span>
              <CustomSelect<RoofType>
                value={roofType}
                onChange={setRoofType}
                options={[
                  { value: 'hip', label: 'Limasan Tropis (Perisai 4 Sisi)', description: 'Aerodinamis dan efektif menepis tempias air' },
                  { value: 'gable', label: 'Pelana Tropis (2 Sisi Miring)', description: 'Sirkulasi udara optimal dan konstruksi efisien' },
                  { value: 'joglo', label: 'Joglo Tradisional Nusantara', description: 'Atap brunjung bertingkat warisan Jawa' },
                  { value: 'flat', label: 'Dak Datar Beton Modern', description: 'Plat beton fungsional untuk roof garden' },
                  { value: 'dome', label: 'Kubah Tropis', description: 'Atap kubah lengkung fasilitas publik' }
                ]}
              />
            </div>

            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--label-secondary)' }}>Tekstur Atap</span>
              <CustomSelect<string>
                value={roofMaterial}
                onChange={setRoofMaterial}
                options={[
                  { value: 'dark_zinc', label: 'Dark Zinc Standing Seam', badge: 'Modern', description: 'Tekstur metal seng gelap kontemporer' },
                  { value: 'clay_tile', label: 'Genteng Tanah Liat Alami', badge: 'Tropis', description: 'Genteng bakar coklat peredam panas' },
                  { value: 'concrete_slab', label: 'Plat Beton Abu', badge: 'Minimalis', description: 'Tekstur semen ekspos halus' }
                ]}
              />
            </div>

            {/* Overhang teritisan */}
            <div className="inset-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span style={{ color: 'var(--label-secondary)' }}>Teritisan / Overhang (Peneduh)</span>
                <span className="tabular-nums" style={{ fontWeight: 600 }}>{roofOverhang.toFixed(1)} meter</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.2"
                step="0.1"
                value={roofOverhang}
                onChange={(e) => setRoofOverhang(parseFloat(e.target.value))}
                className="ios-slider"
                aria-label="Teritisan Overhang"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              onClick={handleCreateAndPlace}
              className="ios-btn ios-btn-primary"
              style={{ flex: 1, height: '40px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <Sparkles size={16} strokeWidth={2} />
              <span>Bangun di Titik Kamera</span>
            </button>
            <button
              onClick={onClose}
              className="ios-btn"
              style={{ padding: '0 16px', height: '40px' }}
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
