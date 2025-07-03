import { getAudioManager } from '../../utils/AudioManager.js';
import { analytics } from '../../utils/analytics.js';
import { whiteboardManager } from '../../utils/whiteboard.js';

//adjust y for height

export const objectProperties = {
  'computerTerminal_interactive': {
    reposition: true,
    position: { x: -1.2, y: 4.9, z: -4.5 }, 
    lookAt: { x: -1.2, y: 4.9, z: -5 },  
    action: () => {
      console.log('Computer terminal action!');
    }
  },
  'computerWebsite_interactive': {
    reposition: true,
    position: { x: -4.25, y: 5, z: -4 }, 
    lookAt: { x: -5.25, y: 5, z: -5 }, 
    action: () => {
      console.log('Computer website action!');
    }
  },
  'whiteBoard_interactive': {
    reposition: true,
    position: { x: 9, y: 5.5, z: 0 }, 
    lookAt: { x: 9, y: 5.5, z: -5 }, 
    action: (object, camera) => {
      if (!whiteboardManager.whiteboardMesh) {
        whiteboardManager.init(object, camera);
      }
      whiteboardManager.show();
    }
  },
  'arcade_interactive': {
    reposition: true,
    position: { x: 19, y: 5.5, z: -3 }, 
    lookAt: { x: 19, y: 5, z: -5 }, 
    action: (object) => {
      if (object.userData.arcadeScreen) {
        object.userData.arcadeScreen.show();
        analytics.trackInteraction('arcade', 'play_game');
      }
    }
  },
  'tv_interactive': {
    reposition: true,
    position: { x: 11, y: 5.5, z: 14 }, 
    lookAt: { x: 15, y: 5, z: 14 }, 
    action: (object) => {
      if (object.userData.tvScreen) {
        object.userData.tvScreen.show();
      }
    }
  },
  'github_interactive': {
    reposition: false,
    action: () => {
      analytics.trackExternalLink('GitHub', 'https://github.com/nathanperrier');
      window.open('https://github.com/nathanperrier', '_blank');
    },
  },
  'linkedin_interactive': {
    reposition: false,
    action: () => {
      analytics.trackExternalLink('LinkedIn', 'https://www.linkedin.com/in/nathan-perrier23/');
      window.open('https://www.linkedin.com/in/nathan-perrier23/', '_blank');
    },
  },
  'radio_interactive': {
    reposition: false,
    action: () => {
      const audioManager = getAudioManager();
      const isPlaying = audioManager.toggleRadio();
      analytics.trackMusicToggle(isPlaying);
    }
  },
  'radio_interactive_1': {
    reposition: false,
    action: () => {
      const audioManager = getAudioManager();
      const isPlaying = audioManager.toggleRadio();
      analytics.trackMusicToggle(isPlaying);
    }
  },
  'radio_interactive_2': {
    reposition: false,
    action: () => {
      const audioManager = getAudioManager();
      const isPlaying = audioManager.toggleRadio();
      analytics.trackMusicToggle(isPlaying);
    }
  },
};
