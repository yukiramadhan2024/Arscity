import React, { useState } from 'react';
import { MISSIONS, Mission, MissionProgress } from '../../education/MissionManager';
import { useUIStore } from '../state/useUIStore';
import { X, Award, Star, CheckCircle2, Circle, AlertCircle, Sparkles } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface MissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MissionModal: React.FC<MissionModalProps> = ({ isOpen, onClose }) => {
  const modalRef = useModalA11y(isOpen, onClose);
  const { engine, setTimeOfDay } = useUIStore();
  const [selectedMissionId, setSelectedMissionId] = useState<string>(
    engine?.missionManager.currentMissionId || MISSIONS[0].id
  );

  if (!isOpen) return null;

  const currentMission = MISSIONS.find((m) => m.id === selectedMissionId) || MISSIONS[0];
  const progress: MissionProgress = engine
    ? engine.missionManager.evaluate()
    : {
        missionId: currentMission.id,
        earnedStars: 0,
        starCompleted: [false, false, false],
        isFinished: false
      };

  const handleSelectMission = (missionId: string) => {
    setSelectedMissionId(missionId);
    if (engine) {
      engine.missionManager.selectMission(missionId);
    }
  };

  return (
    <div
      className="modal-overlay interactive"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="modal-sheet"
        style={{
          width: '760px',
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
              <Award size={20} color="#007AFF" strokeWidth={2.2} />
            </div>
            <div>
              <div id="mission-modal-title" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--lab-title-color)', letterSpacing: '-0.01em' }}>
                Misi & Tantangan Tata Kota Tropis
              </div>
              <div style={{ fontSize: '13px', color: 'var(--lab-subtitle-color)', marginTop: '2px' }}>
                Belajar prinsip perancangan melalui skenario praktis bertahap
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="icon-btn"
            aria-label="Tutup Misi"
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

        {/* Master - Detail Panes */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Mission List (Left) */}
          <div style={{ width: '270px', borderRight: '0.5px solid var(--separator)', overflowY: 'auto', padding: '10px' }}>
            <div className="inset-group" style={{ marginBottom: 0 }}>
              {MISSIONS.map((mission, idx) => {
                const isSelected = selectedMissionId === mission.id;
                const mProg = engine?.missionManager.progressMap.get(mission.id);
                const stars = mProg?.earnedStars ?? 0;

                return (
                  <div
                    key={mission.id}
                    onClick={() => handleSelectMission(mission.id)}
                    className="inset-row inset-row-clickable"
                    style={{
                      background: isSelected ? 'var(--fill-control-active)' : undefined,
                      padding: '10px 12px'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--label-secondary)', fontWeight: 600 }}>
                        MISI #{idx + 1}
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: isSelected ? 600 : 500, color: 'var(--label)', marginTop: '2px' }}>
                        {mission.title}
                      </div>
                      {/* Stars */}
                      <div style={{ display: 'flex', gap: '2px', marginTop: '4px' }}>
                        {[0, 1, 2].map((sIdx) => (
                          <Star
                            key={sIdx}
                            size={12}
                            strokeWidth={1.75}
                            fill={sIdx < stars ? 'var(--warn)' : 'transparent'}
                            style={{ color: sIdx < stars ? 'var(--warn)' : 'var(--label-tertiary)' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mission Details (Right) */}
          <div style={{ flex: 1, padding: '16px 20px', overflowY: 'auto', background: 'var(--surface)' }}>
            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--label)', marginBottom: '4px' }}>
                {currentMission.title}
              </div>
              <p style={{ fontSize: '13px', lineHeight: 1.5, color: 'var(--label-secondary)' }}>
                {currentMission.subtitle}
              </p>
            </div>

            {/* Target Objectives (Stars 1 to 3) */}
            <div className="inset-header" style={{ padding: '0 0 4px 0' }}>TARGET & SYARAT BINTANG</div>
            <div className="inset-group">
              {currentMission.starsRequired.map((requirementText: string, sIdx: number) => {
                const isCompleted = progress.starCompleted[sIdx];

                return (
                  <div key={sIdx} className="inset-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Star
                        size={16}
                        strokeWidth={1.75}
                        fill={isCompleted ? 'var(--warn)' : 'transparent'}
                        style={{ color: isCompleted ? 'var(--warn)' : 'var(--label-secondary)', flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--label)' }}>
                          Bintang {sIdx + 1}: {requirementText}
                        </div>
                      </div>
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 size={16} strokeWidth={2} style={{ color: 'var(--good)' }} />
                    ) : (
                      <Circle size={16} strokeWidth={1.5} style={{ color: 'var(--label-tertiary)' }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Architectural Learning Takeaway */}
            <div className="inset-header" style={{ padding: '0 0 4px 0', color: 'var(--accent)' }}>
              PELAJARAN ARSITEKTUR
            </div>
            <div className="inset-group">
              <div className="inset-row" style={{ background: 'var(--fill-control)' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label)' }}>
                  {currentMission.architecturalLesson}
                </p>
              </div>
            </div>

            {/* Hint */}
            {currentMission.hint && (
              <>
                <div className="inset-header" style={{ padding: '0 0 4px 0' }}>PETUNJUK PERANCANGAN</div>
                <div className="inset-group">
                  <div className="inset-row">
                    <p style={{ fontSize: '12px', lineHeight: 1.5, color: 'var(--label-secondary)' }}>
                      {currentMission.hint}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Footer buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button
                onClick={() => {
                  if (engine) {
                    setTimeOfDay(14.5);
                    engine.sunPathVisualizer?.setVisible(true);
                    onClose();
                  }
                }}
                className="ios-btn"
                style={{ padding: '8px 16px', fontSize: '13px', background: 'rgba(0, 122, 255, 0.1)', color: 'var(--accent)', borderColor: 'rgba(0, 122, 255, 0.3)', gap: '6px' }}
              >
                <Sparkles size={14} strokeWidth={1.75} />
                <span>Simulasikan Kondisi Misi</span>
              </button>
              <button
                onClick={onClose}
                className="ios-btn ios-btn-primary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Mulai Kerjakan Misi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
