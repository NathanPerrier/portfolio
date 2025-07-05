import * as THREE from 'three';

class AudioManager {
  constructor() {
    this.listener = null;
    this.audioLoader = new THREE.AudioLoader();
    this.sounds = new Map();
    this.musicTracks = [];
    this.currentTrackIndex = 0;
    this.backgroundMusic = null;
    this.positionalAudios = new Map();
    this.isMuted = false;
    this.volume = .8;
    this.musicVolume = 1;
    this.effectsVolume = 0.4;
    
    // Radio track selection
    this.radioTrackSelected = false;
    this.selectedRadioTrack = null;
    this.radioAudioCreated = false;
    this.currentRadioAudio = null;
    this.playedTracks = new Set(); // Track which songs have been played
    
    this.init();
  }
  
  init() {
    // Initialize immediately but defer audio loading
    this.listener = new THREE.AudioListener();
    this.isInitialized = true;
    
    // Load audio files in background without blocking
    this.loadAudioAsync();
  }
  
  async loadAudioAsync() {
    try {
      // Load sound effects first (smaller files)
      await this.loadEffectSounds();
      
      // Don't preload radio music - let createRadioAudio() handle it
    } catch (error) {
      console.warn('Audio loading failed:', error);
    }
  }
  
  setCamera(camera) {
    if (this.listener) {
      camera.add(this.listener);
    }
  }
  
  async loadMusicTracks() {
    // Load all music tracks
    const trackPromises = [];
    for (let i = 1; i <= 16; i++) {
      const promise = this.loadSound(import.meta.env.BASE_URL + `assets/audio/music/track${i}.mp3`, `music_track_${i}`);
      trackPromises.push(promise);
    }
    
    await Promise.all(trackPromises);
    
    // Shuffle the playlist
    this.shufflePlaylist();
  }
  
  shufflePlaylist() {
    // Fisher-Yates shuffle
    const tracks = Array.from({ length: 16 }, (_, i) => i + 1);
    for (let i = tracks.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
    }
    this.musicTracks = tracks;
    this.currentTrackIndex = 0;
  }
  
  async playBackgroundMusic() {
    if (!this.musicTracks.length) {
      await this.loadMusicTracks();
    }
    
    this.playNextTrack();
  }
  
  playNextTrack() {
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }
    
    const trackNumber = this.musicTracks[this.currentTrackIndex];
    const audio = this.sounds.get(`music_track_${trackNumber}`);
    
    if (audio) {
      this.backgroundMusic = new THREE.Audio(this.listener);
      this.backgroundMusic.setBuffer(audio);
      this.backgroundMusic.setVolume(this.musicVolume);
      this.backgroundMusic.setLoop(false);
      
      // Play next track when this one ends
      this.backgroundMusic.onEnded = () => {
        this.currentTrackIndex = (this.currentTrackIndex + 1) % this.musicTracks.length;
        if (this.currentTrackIndex === 0) {
          this.shufflePlaylist();
        }
        this.playNextTrack();
      };
      
      if (!this.isMuted) {
        this.backgroundMusic.play();
      }
    }
  }
  
  async loadSound(url, name) {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          this.sounds.set(name, buffer);
          resolve(buffer);
        },
        undefined,
        (error) => {
          console.error(`Failed to load sound: ${url}`, error);
          reject(error);
        }
      );
    });
  }
  
  async loadEffectSounds() {
    // Load commonly used sound effects
    const effectsToLoad = [
      { name: 'button_press', file: '09_select1.wav' },
      { name: 'button_hover', file: '05_cursor1.wav' },
      { name: 'control_lock', file: '58_locker.wav' },
      { name: 'control_unlock', file: '07_pause1.wav' },
      { name: 'interact', file: '10_select2.wav' },
      { name: 'coin', file: '13_item1.wav' },
      { name: 'error', file: '32_error.wav' },
      { name: 'success', file: '24_levelclear.wav' },
      { name: 'walk', file: '21_walk1.wav' }
    ];
    
    const promises = effectsToLoad.map(({ name, file }) => 
      this.loadSound(import.meta.env.BASE_URL + `assets/audio/effects/${file}`, name)
    );
    
    await Promise.all(promises);
  }
  
  playSound(soundName, volume = null) {
    if (this.isMuted || !this.listener) return;
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return;
    }
    
    const audio = new THREE.Audio(this.listener);
    audio.setBuffer(buffer);
    audio.setVolume(volume || this.effectsVolume);
    
    // Resume audio context if needed
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume().then(() => {
        audio.play();
      });
    } else {
      audio.play();
    }
    
    return audio;
  }
  
  createPositionalAudio(object, soundName, options = {}) {
    if (!this.listener) return null;
    
    const objectKey = object.name || object.uuid;
    
    // Check if this object already has positional audio
    const existing = this.positionalAudios.get(objectKey);
    if (existing) {
      console.warn(`Positional audio already exists for ${objectKey}, returning existing`);
      return existing;
    }
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) {
      console.warn(`Sound not found: ${soundName}`);
      return null;
    }
    
    const positionalAudio = new THREE.PositionalAudio(this.listener);
    positionalAudio.setBuffer(buffer);
    positionalAudio.setRefDistance(options.refDistance || 1);
    positionalAudio.setMaxDistance(options.maxDistance || 10);
    positionalAudio.setRolloffFactor(options.rolloffFactor || 1);
    positionalAudio.setVolume(options.volume || this.effectsVolume);
    positionalAudio.setLoop(options.loop || false);
    
    object.add(positionalAudio);
    this.positionalAudios.set(objectKey, positionalAudio);
    
    return positionalAudio;
  }
  
  async createRadioAudio(radioObject) {
    const radioKey = radioObject.name || radioObject.uuid;
    
    // Global check to prevent any radio audio creation if already done
    if (this.radioAudioCreated) {
      return this.positionalAudios.get(radioKey);
    }
    
    // Check if radio already has audio to prevent duplicates
    const existingAudio = this.positionalAudios.get(radioKey);
    if (existingAudio) {
      return existingAudio;
    }
    
    // Generate random track only once per session
    if (!this.radioTrackSelected) {
      this.selectedRadioTrack = Math.floor(Math.random() * 16) + 1;
      this.radioTrackSelected = true;
      this.playedTracks.add(this.selectedRadioTrack); // Mark as played
    } 
    
    const trackKey = 'radio_music';
    
    if (!this.sounds.has(trackKey)) {
      try {
        await this.loadSound(import.meta.env.BASE_URL + `assets/audio/music/track${this.selectedRadioTrack}.mp3`, trackKey);
      } catch (error) {
        console.warn('Failed to load radio music:', error);
        return null;
      }
    } 
    
    const radioAudio = this.createPositionalAudio(radioObject, trackKey, {
      refDistance: 5,
      maxDistance: 25,
      rolloffFactor: 0.7,
      volume: 0.8,
      loop: false  // Don't loop - we'll handle track changes manually
    });
    
    if (radioAudio) {
      this.radioAudioCreated = true; // Mark radio audio as created globally
      this.currentRadioAudio = radioAudio; // Store reference for shuffling
      
      // Set up track shuffling when song ends
      radioAudio.onEnded = () => {
        this.playNextRadioTrack();
      };
      
      if (!this.isMuted) {
        // Resume audio context if needed before playing
        if (this.listener.context.state === 'suspended') {
          this.listener.context.resume().then(() => {
            radioAudio.play();
          });
        } else {
          radioAudio.play();
        }
      } 
    }
    
    return radioAudio;
  }
  
  async playNextRadioTrack() {
    if (!this.currentRadioAudio) return;
    
    // Stop current audio
    this.currentRadioAudio.stop();
    
    // Select next random track (avoid recently played ones if possible)
    let nextTrack;
    let attempts = 0;
    
    do {
      nextTrack = Math.floor(Math.random() * 16) + 1;
      attempts++;
    } while (this.playedTracks.has(nextTrack) && attempts < 20);
    
    // If we've played all tracks, reset the played tracks set
    if (this.playedTracks.size >= 16) {
      this.playedTracks.clear();
    }
    
    this.playedTracks.add(nextTrack);
    
    // Load and play the new track
    try {
      const newTrackKey = `radio_track_${nextTrack}`;
      
      // Load new track if not already loaded
      if (!this.sounds.has(newTrackKey)) {
        await this.loadSound(import.meta.env.BASE_URL + `assets/audio/music/track${nextTrack}.mp3`, newTrackKey);
      }
      
      // Update the current audio buffer
      this.currentRadioAudio.setBuffer(this.sounds.get(newTrackKey));
      
      // Set up the ended callback for continuous shuffling
      this.currentRadioAudio.onEnded = () => {
        this.playNextRadioTrack();
      };
      
      // Play the new track if not muted
      if (!this.isMuted) {
        this.currentRadioAudio.play();
      }
      
    } catch (error) {
      console.warn(`Failed to load next track ${nextTrack}:`, error);
      // Retry with a different track
      setTimeout(() => this.playNextRadioTrack(), 1000);
    }
  }
  
  toggleRadio(radioKey) {    
    // Always use radio_interactive_2 as the key since that's where the audio is attached
    const audioKey = 'radio_interactive_2';
    const audio = this.positionalAudios.get(audioKey);
    
    if (audio) {
      if (audio.isPlaying) {
        audio.pause();
        return false;
      } else {
        // Resume audio context if needed before playing
        if (this.listener.context.state === 'suspended') {
          this.listener.context.resume().then(() => {
            audio.play();
          });
        } else {
          audio.play();
        }
        return true;
      }
    } else {
      console.warn(`No audio found for radio key: ${audioKey}`);
    }
    return false;
  }
  
  toggleMute() {
    this.isMuted = !this.isMuted;
    
    // Mute/unmute background music
    if (this.backgroundMusic) {
      if (this.isMuted) {
        this.backgroundMusic.pause();
      } else {
        this.backgroundMusic.play();
      }
    }
    
    // Mute/unmute all positional audio
    this.positionalAudios.forEach(audio => {
      if (this.isMuted) {
        if (audio.isPlaying) {
          audio.pause();
        }
      } else {
        if (!audio.isPlaying && audio.getLoop()) {
          audio.play();
        }
      }
    });
    
    return this.isMuted;
  }
  
  setMasterVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.listener.setMasterVolume(this.volume);
  }
  
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.setVolume(this.musicVolume);
    }
  }
  
  setEffectsVolume(volume) {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }
  
  dispose() {
    // Stop all audio
    if (this.backgroundMusic) {
      this.backgroundMusic.stop();
    }
    
    this.positionalAudios.forEach(audio => {
      if (audio.isPlaying) {
        audio.stop();
      }
    });
    
    // Clear references
    this.sounds.clear();
    this.positionalAudios.clear();
    this.musicTracks = [];
  }
}

// Singleton instance
let audioManagerInstance = null;

export function getAudioManager() {
  if (!audioManagerInstance) {
    audioManagerInstance = new AudioManager();
  }
  return audioManagerInstance;
}

// Force new instance on page load
export function resetAudioManager() {
  if (audioManagerInstance) {
    audioManagerInstance.dispose();
  }
  audioManagerInstance = null;
}

export default AudioManager;