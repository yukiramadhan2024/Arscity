/**
 * GpuDiagnostics.ts - Hardware routing and GPU telemetry detection using WEBGL_debug_renderer_info.
 * Detects discrete GPUs (such as NVIDIA GeForce RTX 3070 / AMD Radeon) vs Integrated GPUs.
 */

export interface GpuDiagnostics {
  renderer: string;
  vendor: string;
  isDiscreteGpu: boolean;
  maxAnisotropy: number;
  maxTextureSize: number;
  tier: 'integrated' | 'discrete' | 'unknown';
  description: string;
}

export function detectGpuDiagnostics(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null,
  maxAnisotropy: number = 1
): GpuDiagnostics {
  if (!gl) {
    return {
      renderer: 'WebGL Virtual Context',
      vendor: 'Arscity Engine',
      isDiscreteGpu: false,
      maxAnisotropy,
      maxTextureSize: 4096,
      tier: 'unknown',
      description: 'Headless / Virtual Context',
    };
  }

  let unmaskedRenderer = 'Standard WebGL Renderer';
  let unmaskedVendor = 'WebGL Vendor';

  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (ext) {
      const r = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL);
      const v = gl.getParameter(ext.UNMASKED_VENDOR_WEBGL);
      if (r) unmaskedRenderer = String(r);
      if (v) unmaskedVendor = String(v);
    } else {
      const r = gl.getParameter(gl.RENDERER);
      const v = gl.getParameter(gl.VENDOR);
      if (r) unmaskedRenderer = String(r);
      if (v) unmaskedVendor = String(v);
    }
  } catch (err) {
    console.warn('[GpuDiagnostics] Failed to query WEBGL_debug_renderer_info:', err);
  }

  const lowerRenderer = unmaskedRenderer.toLowerCase();
  const lowerVendor = unmaskedVendor.toLowerCase();

  // Identification of Discrete GPU (NVIDIA RTX/GTX, AMD Radeon)
  const isNvidia =
    lowerRenderer.includes('nvidia') ||
    lowerVendor.includes('nvidia') ||
    lowerRenderer.includes('geforce') ||
    lowerRenderer.includes('rtx') ||
    lowerRenderer.includes('gtx');

  const isAmd =
    lowerRenderer.includes('radeon') ||
    lowerVendor.includes('amd') ||
    lowerRenderer.includes('advanced micro devices');

  const isDiscrete =
    isNvidia ||
    isAmd ||
    (!lowerRenderer.includes('intel') &&
      !lowerRenderer.includes('uhd') &&
      !lowerRenderer.includes('iris') &&
      !lowerRenderer.includes('microsoft basic') &&
      !lowerRenderer.includes('swiftshader'));

  let maxTextureSize = 4096;
  try {
    const s = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (typeof s === 'number') maxTextureSize = s;
  } catch {}

  const tier: 'integrated' | 'discrete' | 'unknown' = isDiscrete
    ? 'discrete'
    : lowerRenderer.includes('intel') || lowerRenderer.includes('uhd') || lowerRenderer.includes('iris')
    ? 'integrated'
    : 'unknown';

  let description = unmaskedRenderer;
  if (isDiscrete) {
    description = `${unmaskedRenderer} (Discrete GPU • High VRAM)`;
  } else if (tier === 'integrated') {
    description = `${unmaskedRenderer} (Integrated GPU)`;
  }

  return {
    renderer: unmaskedRenderer,
    vendor: unmaskedVendor,
    isDiscreteGpu: isDiscrete,
    maxAnisotropy,
    maxTextureSize,
    tier,
    description,
  };
}
