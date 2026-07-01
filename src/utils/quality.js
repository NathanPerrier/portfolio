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
        // Shadows stay on: the room's point lights are very bright and the
        // dark look depends on shadow occlusion - disabling them washes out
        // the whole scene. Smaller maps keep the cost down.
        shadows: true,
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
