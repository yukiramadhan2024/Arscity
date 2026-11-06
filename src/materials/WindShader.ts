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
      // Natural tropical wind sway based on vertex height and world/instance phase
      float instancePhase = 0.0;
      #ifdef USE_INSTANCING
        instancePhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;
      #endif
      float swayHeight = max(0.0, transformed.y - 0.85);
      float swayFactor = swayHeight * 0.11 * uWindStrength;
      
      float wave1 = sin(uTime * 2.2 + position.x * 0.75 + position.z * 0.55 + instancePhase);
      float wave2 = cos(uTime * 1.55 + position.z * 0.9 + position.y * 0.45 + instancePhase * 1.3);
      float leafFlutter = sin(uTime * 5.2 + position.x * 3.1 + position.y * 2.7 + instancePhase) * 0.045;

      transformed.x += (wave1 * 0.38 + wave2 * 0.18 + leafFlutter) * swayFactor;
      transformed.z += (wave2 * 0.34 + wave1 * 0.15 + leafFlutter) * swayFactor;
      `
    );
  };
}

/**
 * Procedural Subsurface Scattering (SSS) + Botanical Wind Shader for Multi-Layered Leafy Crowns.
 * Supports alpha-tested botanical leaf cluster cards, InstancedMesh phase variation, and warm
 * afternoon/sunlit leaf translucency.
 */
export function applyFoliageSubsurfaceShader(material: THREE.MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = WindShaderUniforms.uTime;
    shader.uniforms.uWindStrength = WindShaderUniforms.uWindStrength;

    shader.vertexShader = `
      uniform float uTime;
      uniform float uWindStrength;
      varying float vCanopyHeight;
    ` + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `
      #include <begin_vertex>
      float instancePhase = 0.0;
      #ifdef USE_INSTANCING
        instancePhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.53;
      #endif
      vCanopyHeight = clamp((transformed.y - 1.2) / 6.5, 0.0, 1.0);
      float swayHeight = max(0.0, transformed.y - 0.85);
      float swayFactor = swayHeight * 0.11 * uWindStrength;
      float wave1 = sin(uTime * 2.2 + position.x * 0.75 + position.z * 0.55 + instancePhase);
      float wave2 = cos(uTime * 1.55 + position.z * 0.9 + position.y * 0.45 + instancePhase * 1.3);
      float leafFlutter = sin(uTime * 5.2 + position.x * 3.1 + position.y * 2.7 + instancePhase) * 0.045;
      transformed.x += (wave1 * 0.38 + wave2 * 0.18 + leafFlutter) * swayFactor;
      transformed.z += (wave2 * 0.34 + wave1 * 0.15 + leafFlutter) * swayFactor;
      `
    );

    shader.fragmentShader = `
      varying float vCanopyHeight;
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `
      #include <dithering_fragment>
      // Soft two-sided SSS leaf transmission + natural young-shoot crown gradient
      vec3 sssSunDir = normalize(vec3(0.78, 0.52, 0.34));
      vec3 effNormal = normalize(normal);
      float sssBacklight = max(0.0, dot(-effNormal, sssSunDir) * 0.60 + 0.40);
      vec3 sssWarmGreen = vec3(0.52, 0.76, 0.24);
      float shootLift = mix(0.84, 1.14, vCanopyHeight);
      gl_FragColor.rgb *= shootLift;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb + sssWarmGreen * 0.24, sssBacklight * 0.38);
      `
    );
  };
}

