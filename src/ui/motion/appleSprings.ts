import { Transition } from 'framer-motion';

/**
 * Standard Apple iOS Physics Spring Configurations
 * 
 * Sesuai panduan Apple Human Interface Guidelines:
 * Menghilangkan durasi tetap (fixed duration) dan kurva bezier artifisial,
 * menggantikannya dengan simulasi diferensial fisika pegas harmonik teredam murni.
 */

/**
 * a. SPRING_TACTILE (stiffness: 520, damping: 32, mass: 0.7)
 * Untuk respons ultra cepat saat tombol ditekan, toggle bergeser, dan indikator pil aktif berpindah.
 */
export const SPRING_TACTILE: Transition = {
  type: 'spring',
  stiffness: 500,
  damping: 34,
  mass: 0.7,
};

/**
 * b. SPRING_SHEET (stiffness: 340, damping: 30, mass: 1.0)
 * Untuk pembukaan modal sheet, InspectorPanel, dan kartu Laboratorium Analisis.
 */
export const SPRING_SHEET: Transition = {
  type: 'spring',
  stiffness: 340,
  damping: 30,
  mass: 1.0,
};

/**
 * c. SPRING_RUBBER (stiffness: 260, damping: 24, mass: 1.1)
 * Untuk pantulan batas kamera (rubber-band bounce), overscroll, dan penggeser (sliders).
 */
export const SPRING_RUBBER: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 24,
  mass: 1.1,
};

/**
 * Micro-interaction constants untuk kompresi fisik Apple iOS
 */
export const APPLE_PRESS = {
  scale: 0.95,
} as const;

export const APPLE_HOVER = {
  scale: 1.02,
} as const;
