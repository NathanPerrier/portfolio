import * as THREE from 'three';
import { ArcadeGame } from '../../utils/arcadeGame.js';

export class ArcadeScreenTexture {
    constructor() {
        this.game = null;
        this.canvas = null;
        this.texture = null;
        this.material = null;
        this.screenMesh = null;
        this.isActive = false;
        this.animationId = null;
    }
    
    init(arcadeMesh) {
        // Create off-screen canvas for the game
        this.canvas = document.createElement('canvas');
        this.canvas.width = 320;
        this.canvas.height = 120;
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.NearestFilter;
        
        // Find the screen mesh in the arcade model
        let screenMesh = null;
        const meshes = [];
        
        arcadeMesh.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
                
                // Look for a mesh that might be the screen by name
                const name = child.name.toLowerCase();
                if (name.includes('screen') || 
                    name.includes('display') ||
                    name.includes('monitor') ||
                    name.includes('crt')) {
                    screenMesh = child;
                    console.log('Found screen mesh by name:', child.name);
                }
            }
        });
        
        // If no screen found by name, look for one by position/size
        if (!screenMesh && meshes.length > 0) {
            console.log('Arcade meshes found:', meshes.map(m => m.name));
            
            // Find a mesh that's positioned like a screen (front-facing, elevated)
            for (const mesh of meshes) {
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                
                // Check if mesh is elevated and forward-facing
                if (worldPos.y > 1 && worldPos.z < 1) {
                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = box.getSize(new THREE.Vector3());
                    
                    // Check for screen-like dimensions
                    if (size.x > 0.5 && size.x < 2 && 
                        size.y > 0.5 && size.y < 2 && 
                        size.z < 0.5) {
                        screenMesh = mesh;
                        console.log('Found potential screen mesh:', mesh.name, 'at position:', worldPos);
                        break;
                    }
                }
            }
        }
        
        if (!screenMesh) {
            console.warn('Could not find screen mesh in arcade model');
            // Create a screen mesh if none found
            const geometry = new THREE.PlaneGeometry(1.28, 0.48); // 8:3 aspect ratio
            const material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.FrontSide,
                emissive: new THREE.Color(0x111111),
                emissiveIntensity: 0.2
            });
            screenMesh = new THREE.Mesh(geometry, material);
            screenMesh.position.set(0, .875, .7475);
            // Tilt the screen up by rotating around X axis
            screenMesh.rotation.x = -0.4; // Negative rotation tilts up
            arcadeMesh.add(screenMesh);
        } else {
            // Replace the screen mesh's material with our texture
            this.originalMaterial = screenMesh.material;
            screenMesh.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.FrontSide,
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 0.5
            });
        }
        
        this.screenMesh = screenMesh;
        
        // Initialize game
        this.game = new ArcadeGame();
        this.game.canvas = this.canvas;
        this.game.ctx = this.canvas.getContext('2d');
        this.game.canvas.width = 320;
        this.game.canvas.height = 120;
        
        // Initialize audio context
        this.game.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Set up controls
        this.game.setupControls();
        
        // Initialize game state
        this.game.reset();
        
        // Draw attract mode
        this.drawAttractMode();
    }
    
    drawAttractMode() {
        const ctx = this.canvas.getContext('2d');
        
        // Clear with black
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw attract text
        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('RETRO BREAKOUT', this.canvas.width / 2, this.canvas.height / 2 - 20);
        
        ctx.font = 'bold 12px monospace';
        ctx.fillText('CLICK TO PLAY', this.canvas.width / 2, this.canvas.height / 2 + 10);
        
        ctx.font = '10px monospace';
        ctx.fillText('← → MOVE • SPACE RESTART', this.canvas.width / 2, this.canvas.height / 2 + 30);
        
        // Update texture
        this.texture.needsUpdate = true;
    }
    
    show() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        // Reset and start game
        this.game.reset();
        this.game.start(); // This starts the game's own loop
    }
    
    hide() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Stop game
        if (this.game) {
            this.game.stop(); // This properly stops the game's loop
        }
        
        // Show attract mode again
        this.drawAttractMode();
    }
    
    update() {
        // Only update the texture, the game has its own update loop
        if (this.isActive && this.texture) {
            this.texture.needsUpdate = true;
        }
    }
}