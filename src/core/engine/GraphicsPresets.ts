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
    description: 'Blur kaca 16px, Soft Shadow 1024, resolusi seimbang untuk laptop.',
    pixelRatio: 1.5,
    shadowMapSize: 1024,
    shadowFrustumRadius: 85,
    shadowType: THREE.PCFSoftShadowMap,
    anisotropy: 4,
    postProcessing: false,
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
    description: 'Blur kaca 24px, PCF Soft Shadow 2048, kejernihan visual penuh dan tajam.',
    pixelRatio: 2.0,
    shadowMapSize: 2048,
    shadowFrustumRadius: 65,
    shadowType: THREE.PCFSoftShadowMap,
    anisotropy: 8,
    postProcessing: false,
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
    description: 'Bayangan 4K Ultra Crisp, Frustum 150m, 16x Anisotropic, Post-Processing (SSAO + Bloom), 25K Partikel Hujan, 1000 Undo Steps.',
    pixelRatio: 2.0,
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
