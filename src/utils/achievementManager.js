import { getAudioManager } from './AudioManager.js';
import { analytics } from './analytics.js';

class AchievementManager {
  constructor() {
    this.achievements = {
      // Discovery achievements for each object
      computerTerminal: {
        id: 'computerTerminal',
        title: 'Terminal Master',
        description: 'Discovered the computer terminal!',
        icon: '💻'
      },
      computerWebsite: {
        id: 'computerWebsite',
        title: 'Web Explorer',
        description: 'Found the portfolio website!',
        icon: '🌐'
      },
      whiteBoard: {
        id: 'whiteBoard',
        title: 'Board Meeting',
        description: 'Discovered the whiteboard!',
        icon: '📋'
      },
      arcade: {
        id: 'arcade',
        title: 'Game On!',
        description: 'Found the arcade machine!',
        icon: '🕹️'
      },
      tv: {
        id: 'tv',
        title: 'Channel Surfer',
        description: 'Discovered the TV!',
        icon: '📺'
      },
      github: {
        id: 'github',
        title: 'Code Hunter',
        description: 'Found the GitHub link!',
        icon: '🐙'
      },
      linkedin: {
        id: 'linkedin',
        title: 'Professional',
        description: 'Discovered the LinkedIn link!',
        icon: '💼'
      },
      radio: {
        id: 'radio',
        title: 'DJ Mode',
        description: 'Found the radio!',
        icon: '📻'
      },
      // Completion achievement
      allDiscovered: {
        id: 'allDiscovered',
        title: 'Portfolio Master!',
        description: 'Discovered all 8 interactive objects!',
        icon: '🏆'
      }
    };
    
    this.unlockedAchievements = new Set();
    this.achievementQueue = [];
    this.isShowingAchievement = false;
    this.achievementContainer = null;
    
    // Load saved achievements
    this.loadAchievements();
    
    // Create achievement container when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.createAchievementContainer());
    } else {
      this.createAchievementContainer();
    }
  }
  
  createAchievementContainer() {
    // Get the existing achievement container from HTML
    this.achievementContainer = document.getElementById('achievement-container');
    this.achievementIcon = document.getElementById('achievement-icon');
    this.achievementTitleText = document.getElementById('achievement-title-text');
    this.achievementDescription = document.getElementById('achievement-description');
  }
  
  updateAchievementContent(achievement) {
    // Update the content of the existing HTML elements
    if (this.achievementIcon) {
      this.achievementIcon.textContent = achievement.icon;
    }
    if (this.achievementTitleText) {
      this.achievementTitleText.textContent = achievement.title;
    }
    if (this.achievementDescription) {
      this.achievementDescription.textContent = achievement.description;
    }
  }
  
  showAchievement(achievement) {
    if (!this.achievementContainer) {
      this.createAchievementContainer();
    }
    
    // Update content
    this.updateAchievementContent(achievement);
    
    // Play achievement sound
    const audioManager = getAudioManager();
    audioManager.playSound('success');
    
    // Show with CSS class
    this.achievementContainer.classList.add('show');
    
    // Hide after 5 seconds
    setTimeout(() => {
      this.achievementContainer.classList.remove('show');
      setTimeout(() => {
        this.isShowingAchievement = false;
        this.processQueue();
      }, 1000); // Wait for transition to complete
    }, 5000);
  }
  
  processQueue() {
    if (this.achievementQueue.length > 0 && !this.isShowingAchievement) {
      this.isShowingAchievement = true;
      const achievement = this.achievementQueue.shift();
      this.showAchievement(achievement);
    }
  }
  
  unlock(achievementId) {
    if (!this.unlockedAchievements.has(achievementId) && this.achievements[achievementId]) {
      this.unlockedAchievements.add(achievementId);
      this.saveAchievements();
      
      const achievement = this.achievements[achievementId];
      
      // Track achievement unlock in analytics
      analytics.trackAchievement(achievement.title, achievement.description);
      
      // Queue the achievement
      this.achievementQueue.push(achievement);
      
      if (!this.isShowingAchievement) {
        this.processQueue();
      }
      
      return true;
    } 
    return false;
  }
  
  // Map object names to achievement IDs
  getAchievementIdForObject(objectName) {
    // Use a more flexible approach to handle numbered suffixes
    if (objectName.includes('computerTerminal_interactive')) {
      return 'computerTerminal';
    }
    if (objectName.includes('computerWebsite_interactive')) {
      return 'computerWebsite';
    }
    if (objectName.includes('whiteBoard_interactive')) {
      return 'whiteBoard';
    }
    if (objectName.includes('arcade_interactive')) {
      return 'arcade';
    }
    if (objectName.includes('tv_interactive')) {
      return 'tv';
    }
    if (objectName.includes('github_interactive')) {
      return 'github';
    }
    if (objectName.includes('linkedin_interactive')) {
      return 'linkedin';
    }
    if (objectName.includes('radio_interactive')) {
      return 'radio';
    }
    
    return null;
  }
  
  checkObjectDiscovery(objectName) {
    const achievementId = this.getAchievementIdForObject(objectName);
    if (achievementId) {
      this.unlock(achievementId);
    } 
  }
  
  checkAllDiscovered(discoveredCount) {
    if (discoveredCount === 8 && !this.unlockedAchievements.has('allDiscovered')) {
      // Small delay to let the last object achievement show first
      setTimeout(() => {
        this.unlock('allDiscovered');
      }, 1000);
    }
  }
  
  saveAchievements() {
    localStorage.setItem('portfolio_achievements', JSON.stringify([...this.unlockedAchievements]));
  }
  
  loadAchievements() {
    try {
      const saved = localStorage.getItem('portfolio_achievements');
      if (saved) {
        this.unlockedAchievements = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load achievements:', e);
    }
  }
  
  reset() {
    this.unlockedAchievements.clear();
    localStorage.removeItem('portfolio_achievements');
  }
  
  // Add to window for easy testing
  setupTestCommands() {
    window.achievementManager = this;
    window.resetAchievements = () => this.reset();
    window.testAchievement = (id) => this.unlock(id || 'computerTerminal');
  }
}

// Singleton instance
let achievementManager = null;

export function getAchievementManager() {
  if (!achievementManager) {
    achievementManager = new AchievementManager();
  }
  return achievementManager;
}

export default AchievementManager;