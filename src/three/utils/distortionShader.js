import * as THREE from 'three';

export const DistortionShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'strength': { value: 0.15 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        varying vec2 vUv;

        void main() {

            vec2 centeredUv = vUv - 0.5;
            float r2 = dot(centeredUv, centeredUv);
            float scale = 1.0 - strength * 0.5;
            vec2 distortedUv = centeredUv * (1.0 + strength * r2) / scale + 0.5;

            gl_FragColor = texture2D(tDiffuse, clamp(distortedUv, 0.0, 1.0));

        }`
};
