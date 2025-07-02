import "nes.css/css/nes.min.css";
import './css/style.css';
import './css/theme.css';
import './css/cursor.css';

import { initScene } from './three/scene.js';
import { initCursor, frameImage } from './utils/cursor.js';
import { initNesUI } from './utils/welcomeDialog.js';
import HudManager from './utils/hudManager.js';
import { device } from './utils/device.js';
import { resetAudioManager } from './utils/AudioManager.js';

document.addEventListener('DOMContentLoaded', () => {
    // Reset audio manager to ensure fresh random track selection
    resetAudioManager();

    if (frameImage.complete) {
        initCursor();
    } else {
        frameImage.onload = initCursor;
    }

    if (device.isTouchOnly) {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            cursor.style.display = 'none';
        }

        const deviceMessage = document.getElementById('device-ui');

        if (deviceMessage) {
            deviceMessage.style.display = 'flex';
        }
    }

    setTimeout(async () => {
        const timeoutDialog = document.getElementById('timeout-ui');
        const uiContainer = document.getElementById('ui-container');

        const timeoutDuration = 10000; // 10 seconds
        const timeout = setTimeout(() => {    
            timeoutDialog.style.display = 'flex';
        }, timeoutDuration);
        
        try {
            uiContainer.style.transition = 'opacity 0.3s ease-in-out';
        
            const scene = await initScene();
            const hudManager = new HudManager();

            // Pass hudManager to scene so it can track interactions
            if (scene && scene.setHudManager) {
                scene.setHudManager(hudManager);
            }
            initNesUI();

            clearTimeout(timeout);
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            clearTimeout(timeout);
            timeoutDialog.style.display = 'flex';
        }
    }, 1500);
});
