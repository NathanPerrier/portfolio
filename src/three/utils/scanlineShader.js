import * as THREE from 'three';

export const ScanlineShader = {

	uniforms: {

		'tDiffuse': { value: null },
		'nIntensity': { value: 0.1 },
		'sIntensity': { value: 0.1 },
		'sCount': { value: 2048 }, // Reduced from 2048 for performance
		'time': { value: 0.0 },

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		uniform sampler2D tDiffuse;
		uniform float nIntensity;
		uniform float sIntensity;
		uniform float sCount;
		uniform float time;

		varying vec2 vUv;

		float rand(vec2 co){
			return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
		}

		void main() {

			vec4 color = texture2D( tDiffuse, vUv );
			float y = (vUv.y + time * 0.01) * sCount;
			float scanline = sin(y) * sIntensity;
			float noise = rand(vUv) * nIntensity;
			gl_FragColor = color + vec4(scanline + noise);

		}`

};
