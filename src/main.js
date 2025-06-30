import './css/style.css'
import './css/theme.css'
import "nes.css/css/nes.min.css";
import { initScene } from './three/scene.js';

document.addEventListener('DOMContentLoaded', async () => {
  const timeoutDialog = document.getElementById('timeout-dialog');
  const timeoutDuration = 10000; // 10 seconds

  const timeout = setTimeout(() => {
    timeoutDialog.showModal();
  }, timeoutDuration);

  try {
    await initScene();
    clearTimeout(timeout);
  } catch (error) {
    console.error('Failed to initialize scene:', error);
    clearTimeout(timeout);
    timeoutDialog.showModal();
  }
});
