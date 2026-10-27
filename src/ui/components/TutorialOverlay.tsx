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
        style={{
          background: 'rgba(244, 247, 251, 0.95)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.95)',
          boxShadow: '0 12px 36px rgba(15, 23, 42, 0.12), 0 1px 3px rgba(15, 23, 42, 0.08)',
          padding: '14px 16px',
          borderRadius: '20px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} strokeWidth={1.75} style={{ color: '#007AFF' }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: '#007AFF', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Panduan • Langkah {currentStepIndex + 1}/{TUTORIAL_STEPS.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#334155'
            }}
            aria-label="Tutup Panduan"
          >
            <X size={13} strokeWidth={1.75} />
          </button>
        </div>

        {/* Title & Instruction */}
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
          {currentStep.title}
        </div>
        <p style={{ fontSize: '12px', color: '#334155', lineHeight: 1.5, margin: '0 0 10px 0' }}>
          {currentStep.instruction}
        </p>

        {/* Architectural Insight Callout */}
        <div
          style={{
            padding: '8px 10px',
            background: '#FFFFFF',
            borderRadius: '10px',
            border: '1px solid #CBD5E1',
            marginBottom: '12px',
            fontSize: '11px',
            color: '#475569',
            lineHeight: 1.4
          }}
        >
          <strong style={{ color: '#0F172A' }}>Prinsip Desain:</strong> {currentStep.architecturalInsight}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            onClick={handlePrev}
            disabled={isFirst}
            className="ios-btn"
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              opacity: isFirst ? 0.35 : 1,
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: '#0F172A'
            }}
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
