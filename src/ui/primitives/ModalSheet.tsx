import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LucideIcon } from 'lucide-react';
import { fade } from '../motion/presets';
import { IconButton } from './IconButton';
import { proceduralAudio } from '../../audio/ProceduralAudio';

export interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  width?: string | number;
  maxHeight?: string | number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  ariaLabel?: string;
}

import { useModalA11y } from '../hooks/useModalA11y';

export const ModalSheet: React.FC<ModalSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: TitleIcon,
  width = '520px',
  maxHeight = '88vh',
  children,
  footer,
  ariaLabel,
}) => {
  const modalRef = useModalA11y(isOpen, onClose);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={fade.backdrop.initial}
          animate={fade.backdrop.animate}
          exit={fade.backdrop.exit}
          transition={fade.backdrop.transition}
          className="modal-overlay interactive"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 'var(--z-modal, 50)' as any,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            background: 'var(--overlay)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
          }}
        >
          <motion.div
            ref={modalRef}
            key="modal-sheet"
            initial={fade.modal.initial}
            animate={fade.modal.animate}
            exit={fade.modal.exit}
            transition={fade.modal.transition}
            className="modal-sheet"
            style={{
              transformOrigin: 'left center',
              width: typeof width === 'number' ? `${width}px` : width,
              maxWidth: '94vw',
              maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
              background: 'var(--surface)',
              borderRadius: 'var(--radius-xl, 20px)',
              border: '1px solid var(--hairline)',
              boxShadow: '0 0 0 1px rgba(15, 23, 42, 0.08), 0 20px 50px rgba(15, 23, 42, 0.16)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backdropFilter: 'blur(var(--glass-blur, 20px))',
              WebkitBackdropFilter: 'blur(var(--glass-blur, 20px))',
            }}
          >
            {/* Header */}
            <div
              className="modal-sheet-header"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid var(--hairline)',
                background: 'var(--surface-raised)',
                gap: '12px',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                {TitleIcon && (
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--fill-control)',
                      border: '1px solid var(--hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--accent)',
                      flexShrink: 0,
                    }}
                  >
                    <TitleIcon size={17} strokeWidth={1.75} />
                  </div>
                )}
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: 'var(--label)',
                      letterSpacing: '-0.01em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {title}
                  </h2>
                  {subtitle && (
                    <p
                      style={{
                        margin: '2px 0 0 0',
                        fontSize: '11px',
                        color: 'var(--label-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              <IconButton
                icon={X}
                size="sm"
                variant="ghost"
                onClick={onClose}
                onPointerDown={() => proceduralAudio.playTaptic('light')}
                className="modal-close-btn hit-slop-8"
                aria-label="Tutup jendela"
                title="Tutup (Esc)"
              />
            </div>

            {/* Scrollable Body */}
            <div
              className="modal-sheet-body"
              style={{
                padding: '20px',
                overflowY: 'auto',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {children}
            </div>

            {/* Optional Footer */}
            {footer && (
              <div
                className="modal-sheet-footer"
                style={{
                  padding: '12px 20px',
                  borderTop: '1px solid var(--hairline)',
                  background: 'var(--surface-raised)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  flexShrink: 0,
                }}
              >
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
