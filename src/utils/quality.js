import { device } from './device.js';

// Rendering/physics quality tiers. Phones get the mobile tier; tablets and
// desktops keep full quality (scanlines stay everywhere - they carry the
// site's CRT identity and cost one cheap fullscreen pass).
const tiers = {
    high: {
        pixelRatioCap: 2,
        antialias: true,
        shadows: true,
        shadowMapSize: 512,
        bloom: true,
        distortion: true,
        scanlines: true,
        anisotropy: 4,
        physicsIterations: 5,
        particleDensity: 1,
    },
    mobile: {
        pixelRatioCap: 1.5,
        antialias: false,
        shadows: false,
        shadowMapSize: 256,
        bloom: false,
        distortion: false,
        scanlines: true,
        anisotropy: 2,
        physicsIterations: 4,
        particleDensity: 0.4,
    },
};

export const quality = device.isTouchPrimary && device.isSmallScreen
    ? tiers.mobile
    : tiers.high;
