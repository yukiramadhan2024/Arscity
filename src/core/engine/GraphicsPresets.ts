import * as THREE from 'three';

export type GraphicsQuality = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsPresetConfig {
  id: GraphicsQuality;
  name: string;
  badge: string;
  description: string;
  pixelRatio: number;
  shadowMapSize: number;
  shadowFrustumRadius: number;
  shadowType: THREE.ShadowMapType;
  anisotropy: number | 'max';
  postProcessing: boolean;
  rainParticleCount: number;
  propDrawDistance: number;
  maxUndoHistory: number;
  keepGlassBlur: boolean;
  glassBlurPx: string;
}

export const GRAPHICS_PRESETS: Record<GraphicsQuality, GraphicsPresetConfig> = {
  low: {
    id: 'low',
    name: 'Low (Hemat Daya)',
    badge: 'Eco',
    description: 'Tanpa bayangan 3D, tanpa blur kaca (solid A 0.94), efisiensi maksimum baterai.',
    pixelRatio: 1.0,
    shadowMapSize: 0,
    shadowFrustumRadius: 0,
    shadowType: THREE.BasicShadowMap,
    anisotropy: 1,
    postProcessing: false,
    rainParticleCount: 1000,
    propDrawDistance: 150,
    maxUndoHistory: 100,
    keepGlassBlur: false,
    glassBlurPx: '0px',
  },
  medium: {
    id: 'medium',
    name: 'Medium (Standar)',
    badge: 'Balanced',
    description: 'Blur kaca 16px, Soft Shadow 1024, AO kontak ringan (GTAO), performa seimbang.',
    pixelRatio: 1.5,
    shadowMapSize: 1024,
    shadowFrustumRadius: 85,
    shadowType: THREE.PCFSoftShadowMap,
    anisotropy: 4,
    postProcessing: true,
    rainParticleCount: 2500,
    propDrawDistance: 250,
    maxUndoHistory: 200,
    keepGlassBlur: true,
    glassBlurPx: '16px',
  },
  high: {
    id: 'high',
    name: 'High (Optimal)',
    badge: 'Quality',
    description: 'Blur kaca 24px, PCF Soft Shadow 2048, GTAO kontak penuh, Anti-Aliasing SMAA.',
    pixelRatio: 1.5,
    shadowMapSize: 2048,
    shadowFrustumRadius: 75,
    shadowType: THREE.PCFSoftShadowMap,
    anisotropy: 8,
    postProcessing: true,
    rainParticleCount: 6000,
    propDrawDistance: 400,
    maxUndoHistory: 300,
    keepGlassBlur: true,
    glassBlurPx: '24px',
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra (RTX / High-VRAM)',
    badge: 'RTX 3070',
    description: 'Bayangan 4K Ultra Crisp, Frustum 150m, 16x Anisotropic, GTAO + SMAA + Bloom Halus, 25K Partikel Hujan.',
    pixelRatio: 1.5,
    shadowMapSize: 4096,
    shadowFrustumRadius: 150,
    shadowType: THREE.PCFSoftShadowMap,
    anisotropy: 'max',
    postProcessing: true,
    rainParticleCount: 25000,
    propDrawDistance: 600,
    maxUndoHistory: 1000,
    keepGlassBlur: true,
    glassBlurPx: '24px',
  },
};
