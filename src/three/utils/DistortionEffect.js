import { Effect } from 'postprocessing';
import { Uniform } from 'three';

const fragmentShader = `
    uniform float strength;

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec2 centeredUv = uv - 0.5;
        float r2 = dot(centeredUv, centeredUv);
        vec2 distortedUv = centeredUv * (1.0 + strength * r2) + 0.5;

        outputColor = texture2D(inputBuffer, clamp(distortedUv, 0.0, 1.0));
    }
`;

export class DistortionEffect extends Effect {
    constructor({ strength = 0.15 } = {}) {
        super('DistortionEffect', fragmentShader, {
            uniforms: new Map([
                ['strength', new Uniform(strength)]
            ])
        });
    }
}
