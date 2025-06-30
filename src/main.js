import "nes.css/css/nes.min.css";
import './css/style.css';
import './css/theme.css';
import './css/cursor.css';

import { initScene } from './three/scene.js';
import { initCursor, frameImage } from './utils/cursor.js';
import { initNesUI } from './ui/welcome.js';

document.addEventListener('DOMContentLoaded', () => {

    if (frameImage.complete) {
        initCursor();
    } else {
        frameImage.onload = initCursor;
    }

    setTimeout(async () => {
        const timeoutDialog = document.getElementById('timeout-dialog');
        const timeoutDuration = 10000; // 10 seconds

        const timeout = setTimeout(() => {
            
            timeoutDialog.showModal();
        }, timeoutDuration);

        try {
            await initScene();
            initNesUI();
            clearTimeout(timeout);
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            clearTimeout(timeout);
            timeoutDialog.showModal();
        }
    }, 1500);
});
