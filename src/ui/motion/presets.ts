import { Transition } from 'framer-motion';

/**
 * Standardized Framer-Motion presets for Arscity.
 * Provides cohesive physical feel (spring physics, smooth fades, press feedback).
 */

export const spring = {
  /** Responsive fluid motion for UI panels, sidebars, and docks */
  panel: {
    type: 'spring',
    stiffness: 420,
    damping: 34,
    mass: 0.9,
  } as Transition,

  /** Snappy feedback for toggles and small controls */
  snappy: {
    type: 'spring',
    stiffness: 520,
    damping: 38,
  } as Transition,

  /** Gentle floating animation */
  gentle: {
    type: 'spring',
    stiffness: 280,
    damping: 26,
  } as Transition,

  /** Micro-interaction: button scale down when pressed */
  press: {
    scale: 0.95,
  },

  /** Micro-interaction: subtle button elevation when hovered */
  hover: {
    scale: 1.04,
  },
} as const;

export const fade = {
  /** Standard modal entry & exit */
  modal: {
    initial: { opacity: 0, scale: 0.96, y: 10 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 10 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] } as Transition,
  },

  /** Overlay backdrop fade */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.15 } as Transition,
  },

  /** Popover or tooltip entrance */
  popover: {
    initial: { opacity: 0, scale: 0.94, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.94, y: 4 },
    transition: { duration: 0.14, ease: 'easeOut' } as Transition,
  },

  /** Dock & Toolbar vertical slide */
  dockUp: {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 24, scale: 0.98 },
    transition: spring.panel,
  },

  /** Left laboratory / side panel slide */
  slideLeft: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: spring.panel,
  },

  /** Right inspector panel slide */
  slideRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
    transition: spring.panel,
  },
} as const;
