import React, { useState } from 'react';
import { TUTORIAL_STEPS, TutorialStep } from '../../education/TutorialManager';
import { useUIStore, MainToolType } from '../state/useUIStore';
import { Sparkles, ChevronRight, ChevronLeft, X, CheckCircle2 } from 'lucide-react';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ isOpen, onClose }) => {
  const { setActiveTool } = useUIStore();
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isFirst = currentStepIndex === 0;
  const isLast = currentStepIndex === TUTORIAL_STEPS.length - 1;

  const handleNext = () => {
    if (!isLast) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      const nextStep = TUTORIAL_STEPS[nextIdx];
      if (nextStep.toolToActivate) {
        setActiveTool(nextStep.toolToActivate as MainToolType);
      }
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (!isFirst) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      const prevStep = TUTORIAL_STEPS[prevIdx];
      if (prevStep.toolToActivate) {
        setActiveTool(prevStep.toolToActivate as MainToolType);
      }
    }
  };

  return (
    <div
      className="interactive"
      style={{
        position: 'absolute',
        bottom: '80px',
        left: '16px',
        width: '340px',
        zIndex: 60
      }}
    >
      <div
        className="glass-surface"
        style={{
          padding: '14px 16px',
          borderRadius: 'var(--radius-panel)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Panduan • Langkah {currentStepIndex + 1}/{TUTORIAL_STEPS.length}
            </span>
          </div>
          <button onClick={onClose} className="icon-btn" style={{ width: '24px', height: '24px' }} aria-label="Tutup Panduan">
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Title & Instruction */}
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--label)', marginBottom: '4px' }}>
          {currentStep.title}
        </div>
        <p style={{ fontSize: '12px', color: 'var(--label)', lineHeight: 1.5, margin: '0 0 10px 0' }}>
          {currentStep.instruction}
        </p>

        {/* Architectural Insight Callout */}
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--surface)',
            borderRadius: '10px',
            border: '0.5px solid var(--separator)',
            marginBottom: '12px',
            fontSize: '11px',
            color: 'var(--label-secondary)',
            lineHeight: 1.4
          }}
        >
          <strong style={{ color: 'var(--label)' }}>Prinsip Desain:</strong> {currentStep.architecturalInsight}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="ios-btn"
            style={{ padding: '4px 10px', fontSize: '12px', opacity: isFirst ? 0.35 : 1 }}
          >
            <ChevronLeft size={14} strokeWidth={1.75} />
            <span>Sebelumnya</span>
          </button>

          <button
            onClick={handleNext}
            className="ios-btn ios-btn-primary"
            style={{ padding: '4px 14px', fontSize: '12px' }}
          >
            {isLast ? (
              <>
                <span>Selesai</span>
                <CheckCircle2 size={14} strokeWidth={2} />
              </>
            ) : (
              <>
                <span>Lanjut</span>
                <ChevronRight size={14} strokeWidth={1.75} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
