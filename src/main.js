import "nes.css/css/nes.min.css";
import './css/style.css';
import './css/theme.css';
import './css/cursor.css';
import './css/touch.css';

import { initScene } from './three/scene.js';
import {
    initCursor,
    frameImage,
    promoteCursorForDialog,
    restoreCursorAfterDialog
} from './utils/cursor.js';
import { initNesUI } from './utils/welcomeDialog.js';
import HudManager from './utils/hudManager.js';
import { device } from './utils/device.js';
import { resetAudioManager } from './utils/AudioManager.js';
import { analytics } from './utils/analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    // Track device information on page load
    analytics.trackDevice(device);
    
    // Reset audio manager to ensure fresh random track selection
    resetAudioManager();

    // CSS hook for input mode (joystick HUD, cursor, dialog sizing)
    document.body.classList.add(device.isTouchPrimary ? 'input-touch' : 'input-mouse');

    // Custom cursor only makes sense with a fine pointer
    if (!device.isTouchPrimary) {
        if (frameImage.complete) {
            initCursor();
        } else {
            frameImage.onload = initCursor;
        }
    }

    const timeoutUI = document.getElementById('timeout-ui');
    const timeoutDialog = document.getElementById('timeout-dialog');
    const refreshSceneButton = document.getElementById('refresh-scene-btn');
    const loadingScreen = document.getElementById('loading-screen');
    const uiContainer = document.getElementById('ui-container');

    const hideRecoveryDialog = () => {
        if (timeoutDialog?.open && typeof timeoutDialog.close === 'function') {
            timeoutDialog.close();
        } else {
            timeoutDialog?.removeAttribute('open');
        }
        restoreCursorAfterDialog(timeoutDialog);
        if (timeoutUI) timeoutUI.style.display = 'none';
    };

    const showRecoveryDialog = () => {
        // The loading layer otherwise sits above the recovery dialog.
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (timeoutUI) timeoutUI.style.display = 'flex';

        if (timeoutDialog && !timeoutDialog.open) {
            if (typeof timeoutDialog.showModal === 'function') {
                timeoutDialog.showModal();
            } else {
                timeoutDialog.setAttribute('open', '');
            }
        }
        promoteCursorForDialog(timeoutDialog);
    };

    refreshSceneButton?.addEventListener('click', () => window.location.reload());
    timeoutDialog?.addEventListener('close', () => {
        restoreCursorAfterDialog(timeoutDialog);
        if (timeoutUI) timeoutUI.style.display = 'none';
    });

    async function startExperience() {
        const timeout = window.setTimeout(showRecoveryDialog, 55000);

        try {
            if (uiContainer) {
                uiContainer.style.transition = 'opacity 0.3s ease-in-out';
            }

            const loadStartTime = Date.now();
            const scene = await initScene();
            analytics.trackLoadTime(Date.now() - loadStartTime);

            const hudManager = new HudManager();
            scene?.setHudManager?.(hudManager);
            initNesUI();

            window.clearTimeout(timeout);
            hideRecoveryDialog();
        } catch (error) {
            const message = error instanceof Error
                ? error.message
                : 'The scene failed to load. Please try refreshing.';
            console.error('Failed to initialize scene:', error);
            analytics.trackError(message, 'scene_initialization');
            window.clearTimeout(timeout);

            const dialogTitle = document.getElementById('timeout-dialog-title');
            const dialogMessage = document.getElementById('timeout-dialog-description');
            if (message.includes('WebGL')) {
                if (dialogTitle) dialogTitle.textContent = 'WebGL Not Supported';
                if (dialogMessage) {
                    dialogMessage.textContent = `WebGL is required to run this application.\n\nPlease ensure:\n• Hardware acceleration is enabled in your browser\n• Your graphics drivers are up to date\n• Your browser supports WebGL (Chrome, Firefox, or Edge recommended)\n\nYou can still browse the standard portfolio.`;
                }
            } else {
                if (dialogTitle) dialogTitle.textContent = 'Error Loading Scene';
                if (dialogMessage) {
                    dialogMessage.textContent = `${message}\n\nYou can still browse the standard portfolio.`;
                }
            }

            showRecoveryDialog();
        }
    }

    startExperience();
});

// Track session time when user leaves
window.addEventListener('beforeunload', () => {
    analytics.trackSessionTime();
});

// Global error handler
window.addEventListener('error', (event) => {
    analytics.trackError(event.error?.message || event.message, 'global_error');
});

// Handle window resize events
window.addEventListener('resize', () => {
    device.width = window.innerWidth;
    device.height = window.innerHeight;
    device.isWidthCompatible = window.innerWidth >= 768;
    device.isSmallScreen = window.innerWidth < 768;
});
