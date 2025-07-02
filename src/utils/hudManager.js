import { gsap } from 'gsap';
import { getAudioManager } from './AudioManager.js';
import { getAchievementManager } from './achievementManager.js';
import { analytics } from './analytics.js';

class HudManager {
  constructor() {
    this.startTime = Date.now();
    this.timeElement = document.getElementById('time-spent');
    this.visitElement = document.getElementById('visit-count');
    this.progressBar = document.getElementById('exploration-progress');
    this.progressText = document.getElementById('progress-text');
    this.uiContainer = document.getElementById('ui-container');
    
    this.interactedObjects = new Set();
    this.totalInteractables = 8;
    
    this.navButtons = {
      terminal: document.getElementById('terminal-btn'),
      projects: document.getElementById('projects-btn'),
      arcade: document.getElementById('arcade-btn')
    };
    
    this.init();
  }
  
  init() {
    // Initialize visit count from Google Analytics or localStorage
    this.updateVisitCount();
    
    // Start time tracking
    this.startTimeTracking();
    
    // Setup nav button listeners
    this.setupNavListeners();
    
    // Sync with saved achievements
    this.syncWithSavedAchievements();
    
    // Show HUD with animation
    this.showHUD();
  }
  
  showHUD() {
    gsap.to(this.uiContainer, {
      opacity: 1,
      duration: 1,
      delay: 0.5,
      ease: "power2.inOut"
    });
  }
  
  hideHUD() {
    gsap.to(this.uiContainer, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    });
  }
  
  updateVisitCount() {
    // Try to get visit count from localStorage (simple implementation)
    let visits = parseInt(localStorage.getItem('portfolio_visits') || '0');
    visits++;
    localStorage.setItem('portfolio_visits', visits.toString());
    
    // Format with leading zeros
    this.visitElement.textContent = visits.toString().padStart(6, '0');
  }
  
  startTimeTracking() {
    setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
      const minutes = Math.floor(elapsed / 60);
      const seconds = elapsed % 60;
      
      this.timeElement.textContent = 
        `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }
  
  setTotalInteractables(count) {
    this.totalInteractables = count;
    this.updateProgress();
  }
  
  addInteraction(objectName) {
    if (!this.interactedObjects.has(objectName)) {
      this.interactedObjects.add(objectName);
      this.updateProgress();
      
      // Track progress in analytics
      analytics.trackProgress(this.interactedObjects.size, this.totalInteractables);
      
      // Play a sound effect if available
      this.playProgressSound();

      const achievementManager = getAchievementManager();
      achievementManager.checkObjectDiscovery(objectName);
    }
  }
  
  updateProgress() {
    const progress = this.totalInteractables > 0 
      ? (this.interactedObjects.size / this.totalInteractables) * 100 
      : 0;
    
    this.progressBar.value = progress;
    this.progressText.textContent = `${this.interactedObjects.size}/${this.totalInteractables}`;
    
    // Achievement check
    if (this.interactedObjects.size === this.totalInteractables && this.totalInteractables > 0) {
      this.onFullExploration();
    }
    
    // Check for all discovered achievement
    const achievementManager = getAchievementManager();
    achievementManager.checkAllDiscovered(this.interactedObjects.size);
  }
  
  setupNavListeners() {
    Object.entries(this.navButtons).forEach(([key, button]) => {
      if (button) {
        button.addEventListener('click', () => {
          const audioManager = getAudioManager();
          audioManager.playSound('button_press');
          this.handleNavClick(key);
        });
        
        button.addEventListener('mouseenter', () => {
          const audioManager = getAudioManager();
          audioManager.playSound('button_hover', 0.3);
        });
      }
    });
  }
  
  handleNavClick(target) {
    // Emit custom event for the scene to handle
    window.dispatchEvent(new CustomEvent('hud-nav-click', { 
      detail: { target } 
    }));
  }
  
  playProgressSound() {
    const audioManager = getAudioManager();
    audioManager.playSound('coin');
  }
  
  syncWithSavedAchievements() {
    try {
      const saved = localStorage.getItem('portfolio_achievements');
      if (saved) {
        const unlockedAchievements = JSON.parse(saved);
        
        // Map achievement IDs back to object names to populate interactedObjects
        const achievementToObjectMap = {
          'computerTerminal': 'computerTerminal_interactive',
          'computerWebsite': 'computerWebsite_interactive', 
          'whiteBoard': 'whiteBoard_interactive',
          'arcade': 'arcade_interactive',
          'tv': 'tv_interactive',
          'github': 'github_interactive',
          'linkedin': 'linkedin_interactive',
          'radio': 'radio_interactive'
        };
        
        unlockedAchievements.forEach(achievementId => {
          const objectName = achievementToObjectMap[achievementId];
          if (objectName) {
            this.interactedObjects.add(objectName);
          }
        });
        
        // Update progress bar
        this.updateProgress();
      }
    } catch (e) {
      console.error('Failed to sync with saved achievements:', e);
    }
  }

  onFullExploration() {
    const audioManager = getAudioManager();
    audioManager.playSound('success');
    
    // Could show a special message or unlock something
    window.dispatchEvent(new CustomEvent('achievement-unlocked', { 
      detail: { achievement: 'full-exploration' } 
    }));
  }
}

export default HudManager;