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
import { analytics } from './utils/analytics.js';

document.addEventListener('DOMContentLoaded', () => {
    // Track device information on page load
    analytics.trackDevice(device);
    
    // Reset audio manager to ensure fresh random track selection
    resetAudioManager();

    if (frameImage.complete) {
        initCursor();
    } else {
        frameImage.onload = initCursor;
    }

    // Check for device compatibility (touch-only devices OR width less than 768px)
    if (device.isTouchOnly || !device.isWidthCompatible) {
        const cursor = document.querySelector('.custom-cursor');
        if (cursor) {
            cursor.style.display = 'none';
        }

        const deviceMessage = document.getElementById('device-ui');
        const deviceDialog = document.getElementById('device-dialog');
        
        if (deviceMessage) {
            deviceMessage.style.display = 'flex';
        }
        
        // Update the dialog message if it's a width issue
        if (!device.isWidthCompatible && deviceDialog) {
            const dialogTitle = deviceDialog.querySelector('.title');
            const dialogMessage = deviceDialog.querySelector('p');
            
            dialogTitle.textContent = 'Screen Size Too Small';
            dialogMessage.textContent = 'This website requires a minimum screen width of 768px. Please use a larger screen or resize your browser window.';
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
            
            const loadStartTime = Date.now();
            const scene = await initScene();
            const loadEndTime = Date.now();
            const loadTime = loadEndTime - loadStartTime;
            
            // Track scene load time
            analytics.trackLoadTime(loadTime);
            
            const hudManager = new HudManager();

            // Pass hudManager to scene so it can track interactions
            if (scene && scene.setHudManager) {
                scene.setHudManager(hudManager);
            }
            initNesUI();

            clearTimeout(timeout);
        } catch (error) {
            console.error('Failed to initialize scene:', error);
            analytics.trackError(error.message, 'scene_initialization');
            clearTimeout(timeout);
            
            // Update timeout dialog with specific error message
            const dialogTitle = timeoutDialog.querySelector('.title');
            const dialogMessage = timeoutDialog.querySelector('p');
            
            if (error.message.includes('WebGL')) {
                dialogTitle.textContent = 'WebGL Not Supported';
                dialogMessage.innerHTML = 'WebGL is required to run this application.<br><br>' +
                    'Please ensure:<br>' +
                    '• Hardware acceleration is enabled in your browser<br>' +
                    '• Your graphics drivers are up to date<br>' +
                    '• Your browser supports WebGL (Chrome, Firefox, Edge recommended)<br><br>' +
                    'Alternatively, you can visit the simplified portfolio site.';
            } else {
                dialogTitle.textContent = 'Error Loading Scene';
                dialogMessage.innerHTML = (error.message || 'The scene failed to load. Please try refreshing.') +
                    '<br><br>Alternatively, you can visit the simplified portfolio site.';
            }
            
            timeoutDialog.style.display = 'flex';
        }
    }, 1500);
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
    const deviceMessage = document.getElementById('device-ui');
    const deviceDialog = document.getElementById('device-dialog');
    const isNowCompatible = window.innerWidth >= 768;
    
    // Update device width properties
    device.width = window.innerWidth;
    device.height = window.innerHeight;
    device.isWidthCompatible = isNowCompatible;
    
    // Show/hide device incompatibility dialog based on new width
    if (!isNowCompatible && !device.isTouchOnly) {
        if (deviceMessage) {
            deviceMessage.style.display = 'flex';
        }
        
        if (deviceDialog) {
            const dialogTitle = deviceDialog.querySelector('.title');
            const dialogMessage = deviceDialog.querySelector('p');
            
            dialogTitle.textContent = 'Screen Size Too Small';
            dialogMessage.textContent = 'This website requires a minimum screen width of 768px. Please use a larger screen or resize your browser window.';
        }
    } else if (isNowCompatible && !device.isTouchOnly) {
        // Hide the dialog if width is now compatible and device has keyboard/mouse
        if (deviceMessage) {
            deviceMessage.style.display = 'none';
        }
    }
});
