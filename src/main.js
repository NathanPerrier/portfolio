import './style.css'
import { initScene } from './three/scene.js';

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initScene();
  }, 2000);
});
