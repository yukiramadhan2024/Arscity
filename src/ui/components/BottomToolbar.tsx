import React, { useRef, useState, useEffect } from 'react';
import { useUIStore, MainToolType } from '../state/useUIStore';
import {
  MousePointer,
  Route,
  LayoutGrid,
  Building2,
  Trees,
  SlidersHorizontal,
  Layers,
  Undo2,
  Redo2,
  LucideIcon
} from 'lucide-react';

interface ToolItem {
  id: MainToolType;
  label: string;
  icon: LucideIcon;
  hotkey: string;
}

const TOOLS: ToolItem[] = [
  { id: 'select', label: 'Pilih', icon: MousePointer, hotkey: 'V' },
  { id: 'road', label: 'Jalan', icon: Route, hotkey: 'R' },
  { id: 'zone', label: 'Zonasi', icon: LayoutGrid, hotkey: 'Z' },
  { id: 'build', label: 'Bangun', icon: Building2, hotkey: 'B' },
  { id: 'nature', label: 'Lanskap', icon: Trees, hotkey: 'T' },
  { id: 'analyze', label: 'Analisis', icon: SlidersHorizontal, hotkey: 'A' },
  { id: 'view', label: 'Lapisan', icon: Layers, hotkey: 'L' }
];

export const BottomToolbar: React.FC = () => {
  const {
    engine,
    activeTool,
    setActiveTool,
    canUndo,
    canRedo
  } = useUIStore();

  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [lensPosition, setLensPosition] = useState<{ left: number; width: number }>({ left: 6, width: 54 });

  useEffect(() => {
    const activeBtn = buttonRefs.current[activeTool];
    if (activeBtn) {
      setLensPosition({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth
      });
    }
  }, [activeTool]);

  const handleUndo = () => {
    engine?.commandManager.undo();
  };

  const handleRedo = () => {
    engine?.commandManager.redo();
  };

  return (
    <div className="dock-wrapper">
      <div className="glass-surface dock-container interactive">
        {/* Sliding Liquid Glass Lens */}
        <div
          className="dock-lens"
          style={{
            left: `${lensPosition.left}px`,
            width: `${lensPosition.width}px`
          }}
        />

        {/* Main Architectural & Urban Tools */}
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;

          return (
            <button
              key={tool.id}
              ref={(el) => (buttonRefs.current[tool.id] = el)}
              onClick={() => setActiveTool(tool.id)}
              className={`dock-btn ${isActive ? 'active' : ''}`}
              title={`${tool.label} (${tool.hotkey})`}
              aria-label={tool.label}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span className="dock-btn-label">{tool.label}</span>
            </button>
          );
        })}

        <div className="divider-v" style={{ height: '24px', margin: '0 4px', zIndex: 2 }} />

        {/* Undo / Redo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', zIndex: 2 }}>
          <button
            disabled={!canUndo}
            onClick={handleUndo}
            className="icon-btn"
            style={{ opacity: canUndo ? 1 : 0.35, cursor: canUndo ? 'pointer' : 'not-allowed' }}
            title="Batal (Ctrl + Z)"
            aria-label="Batal"
          >
            <Undo2 size={16} strokeWidth={1.75} />
          </button>
          <button
            disabled={!canRedo}
            onClick={handleRedo}
            className="icon-btn"
            style={{ opacity: canRedo ? 1 : 0.35, cursor: canRedo ? 'pointer' : 'not-allowed' }}
            title="Ulangi (Ctrl + Y)"
            aria-label="Ulangi"
          >
            <Redo2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </div>
  );
};
