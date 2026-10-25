import { Transition } from 'framer-motion';
import { SPRING_TACTILE, SPRING_SHEET, SPRING_RUBBER, APPLE_PRESS, APPLE_HOVER } from './appleSprings';

export * from './appleSprings';

/**
 * Standardized Framer-Motion presets for Arscity.
 * Provides cohesive physical feel (Apple pure spring physics, no fixed durations).
 */

export const spring = {
  /** Responsive fluid motion for UI panels, sidebars, and docks */
  panel: {
    type: 'spring',
    stiffness: 420,
    damping: 34,
    mass: 0.8,
  } as Transition,

  /** Snappy feedback for toggles and small controls (Apple Tactile) */
  snappy: SPRING_TACTILE,

  /** Elastic bounce for camera boundaries & sliders (Apple Rubber) */
  rubber: SPRING_RUBBER,

  /** Apple Sheet spring for modals, InspectorPanel, and Analysis Lab */
  sheet: SPRING_SHEET,

  /** Gentle floating animation */
  gentle: {
    type: 'spring',
    stiffness: 280,
    damping: 26,
    mass: 1.0,
  } as Transition,

  /** Micro-interaction: button scale down when pressed (iOS haptic compression) */
  press: {
    scale: 0.95,
  },

  /** Micro-interaction: subtle button elevation when hovered */
  hover: {
    scale: 1.04,
    transition: SPRING_TACTILE,
  },
} as const;

export const fade = {
  /** Standard modal entry & exit using pure Apple Sheet spring */
  modal: {
    initial: { opacity: 0, scale: 0.96, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 12 },
    transition: SPRING_SHEET,
  },

  /** Overlay backdrop fade using responsive spring */
  backdrop: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { type: 'spring', stiffness: 500, damping: 40, mass: 0.6 } as Transition,
  },

  /** Popover or tooltip entrance using pure Apple Tactile spring */
  popover: {
    initial: { opacity: 0, scale: 0.94, y: 4 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.94, y: 4 },
    transition: SPRING_TACTILE,
  },

  /** Dock & Toolbar vertical slide */
  dockUp: {
    initial: { opacity: 0, y: 24, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 24, scale: 0.98 },
    transition: SPRING_SHEET,
  },

  /** Left laboratory / side panel slide */
  slideLeft: {
    initial: { opacity: 0, x: -24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -24 },
    transition: SPRING_SHEET,
  },

  /** Right inspector panel slide */
  slideRight: {
    initial: { opacity: 0, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 24 },
    transition: SPRING_SHEET,
  },
} as const;

