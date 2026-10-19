import * as THREE from 'three';

/**
 * Procedural Wind Vertex Shader for Tropical Vegetation (Trembesi trees & plants).
 * Injects GPU-accelerated vertex swaying into Three.js MeshStandardMaterial
 * with 0 CPU overhead.
 */
export const WindShaderUniforms = {
  uTime: { value: 0.0 },
  uWindStrength: { value: 1.0 },
};

export function updateWindTime(deltaTime: number, strength: number = 1.0): void {
  WindShaderUniforms.uTime.value += deltaTime;
  WindShaderUniforms.uWindStrength.value = strength;
}

export function applyWindShader(material: THREE.Material): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WindShaderUniforms.uTime;
    shader.uniforms.uWindStrength = WindShaderUniforms.uWindStrength;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      // Natural tropical wind sway based on vertex height and world position
      float swayHeight = max(0.0, transformed.y - 1.2);
      float swayFactor = swayHeight * 0.14 * uWindStrength;
      
      float wave1 = sin(uTime * 2.4 + position.x * 0.7 + position.z * 0.5);
      float wave2 = cos(uTime * 1.6 + position.z * 0.9 + position.y * 0.4);
      float waveMicro = sin(uTime * 4.5 + position.y * 2.0) * 0.05;

      transformed.x += (wave1 * 0.4 + wave2 * 0.2 + waveMicro) * swayFactor;
      transformed.z += (wave2 * 0.35 + wave1 * 0.15 + waveMicro) * swayFactor;
      `
    );
  };
}

/**
 * Procedural Subsurface Scattering (SSS) Shader for Tropical Multi-Layered Foliage
 * Mimics leaf light transmission under low-angle Golden Hour sun (16:15 WIB):
 * Warm yellow-green (#7CB342) translucency when lit, deep forest green (#2E4F1E) in shadow.
 */
export function applyFoliageSubsurfaceShader(material: THREE.MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WindShaderUniforms.uTime;
    shader.uniforms.uWindStrength = WindShaderUniforms.uWindStrength;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float swayHeight = max(0.0, transformed.y - 1.2);
      float swayFactor = swayHeight * 0.14 * uWindStrength;
      float wave1 = sin(uTime * 2.4 + position.x * 0.7 + position.z * 0.5);
      float wave2 = cos(uTime * 1.6 + position.z * 0.9 + position.y * 0.4);
      float waveMicro = sin(uTime * 4.5 + position.y * 2.0) * 0.05;
      transformed.x += (wave1 * 0.4 + wave2 * 0.2 + waveMicro) * swayFactor;
      transformed.z += (wave2 * 0.35 + wave1 * 0.15 + waveMicro) * swayFactor;
      `
    );

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      // SSS leaf transmission glow for afternoon sunlight
      vec3 sssSunDir = normalize(vec3(0.85, 0.45, 0.35));
      float sssBacklight = max(0.0, dot(-vNormal, sssSunDir) * 0.65 + 0.35);
      vec3 sssWarmGreen = vec3(0.486, 0.702, 0.259); // #7CB342
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + sssWarmGreen * 0.28, sssBacklight * 0.42);
      `
    );
  };
}

