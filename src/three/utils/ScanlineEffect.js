import { Effect } from 'postprocessing';
import { Uniform } from 'three';

const fragmentShader = `
    uniform float nIntensity;
    uniform float sIntensity;
    uniform float sCount;

    void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        float y = uv.y * sCount;
        float scanline = sin(y) * sIntensity;
        float noise = rand(uv) * nIntensity;
        outputColor = inputColor + vec4(scanline + noise);
    }
`;

export class ScanlineEffect extends Effect {
    constructor({ nIntensity = 0.1, sIntensity = 0.1, sCount = 2048 } = {}) {
        super('ScanlineEffect', fragmentShader, {
            uniforms: new Map([
                ['nIntensity', new Uniform(nIntensity)],
                ['sIntensity', new Uniform(sIntensity)],
                ['sCount', new Uniform(sCount)]
            ])
        });
    }
}
