import "nes.css/css/nes.min.css";
import './css/style.css';
import './css/theme.css';
import './css/cursor.css';

import { initScene } from './three/scene.js';
import { initCursor, frameImage } from './utils/cursor.js';
import { initNesUI } from './utils/welcomeDialog.js';

document.addEventListener('DOMContentLoaded', () => {

    if (frameImage.complete) {
        initCursor();
    } else {
        frameImage.onload = initCursor;
    }

    setTimeout(async () => {
        const timeoutDialog = document.getElementById('timeout-ui');
        const uiContainer = document.getElementById('ui-container');

        const timeoutDuration = 10000; // 10 seconds

        const timeout = setTimeout(() => {
            
            timeoutDialog.style.display = 'flex';
        }, timeoutDuration);
        
        try {
            await initScene();

            uiContainer.style.opacity = '1';
            uiContainer.style.transition = 'opacity 0.3s ease-in-out';
            initNesUI();

            clearTimeout(timeout);
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            clearTimeout(timeout);
            timeoutDialog.style.display = 'flex';
        }
    }, 1500);
});
