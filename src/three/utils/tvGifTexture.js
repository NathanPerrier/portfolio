import * as THREE from 'three';
import { THREE_GetGifTexture } from 'threejs-gif-texture';

export class TVGifTexture {
    constructor() {
        this.texture = null;
        this.gifTexture = null;
        this.material = null;
        this.screenMesh = null;
        this.tvMesh = null;
        this.originalMaterial = null;
        this.screenLight = null;
        this.animationId = null;
    }
    
    init(tvMesh) {
        this.tvMesh = tvMesh;
        
        // Load GIF texture using threejs-gif-texture
        THREE_GetGifTexture('/assets/images/tv.gif').then(texture => {
            console.log('TV GIF loaded successfully');
            this.gifTexture = texture;
            this.texture = texture;
            
            // Set texture properties
            this.texture.minFilter = THREE.LinearFilter;
            this.texture.magFilter = THREE.LinearFilter;
            
            // Update material if screen mesh exists
            if (this.screenMesh && this.screenMesh.material) {
                this.screenMesh.material.map = this.texture;
                this.screenMesh.material.needsUpdate = true;
            }
            
            // Start color sampling for dynamic lighting
            this.startColorSampling();
        }).catch(error => {
            console.error('Failed to load TV GIF:', error);
            this.createFallbackContent();
        });
        
        // Find or create screen mesh
        this.setupScreenMesh();
    }
    
    
    createFallbackContent() {
        // Create a simple colored texture as fallback
        const canvas = document.createElement('canvas');
        canvas.width = 380;
        canvas.height = 460;
        const ctx = canvas.getContext('2d');
        
        // Fill with dark screen color
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add "NO SIGNAL" text
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 30px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('NO SIGNAL', canvas.width / 2, canvas.height / 2);
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        
        // Update material if screen mesh exists
        if (this.screenMesh && this.screenMesh.material) {
            this.screenMesh.material.map = this.texture;
            this.screenMesh.material.needsUpdate = true;
        }
    }
    
    setupScreenMesh() {
        let screenMesh = null;
        const meshes = [];
        
        this.tvMesh.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
                const name = child.name.toLowerCase();
                if (name.includes('screen') || 
                    name.includes('display') ||
                    name.includes('monitor') ||
                    name.includes('crt')) {
                    screenMesh = child;
                }
            }
        });
        
        if (!screenMesh && meshes.length > 0) {
            // Look for screen-like mesh by dimensions
            for (const mesh of meshes) {
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                if (size.x > size.y && size.z < 0.5) {
                    screenMesh = mesh;
                    break;
                }
            }
        }
        
        if (!screenMesh) {
            console.warn('Could not find screen mesh in TV model, creating one');
            const geometry = new THREE.PlaneGeometry(1.24, 1.5); // 19:23 aspect ratio matching 380x460
            const material = new THREE.MeshBasicMaterial({
                map: this.texture,
                color: 0xffffff,
                side: THREE.DoubleSide, // Visible from both sides
                emissive: new THREE.Color(0xff0000),
                emissiveIntensity: 40,
                emissiveMap: this.texture
            });
            
            screenMesh = new THREE.Mesh(geometry, material);
            screenMesh.position.set(-0.15, 0.1, 0.95); // Adjusted position
            this.tvMesh.add(screenMesh);
        } else {
            // Update existing mesh material
            this.originalMaterial = screenMesh.material;
            screenMesh.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                color: 0xffffff,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(0xffffff),
                emissiveIntensity: 40.0,
                emissiveMap: this.texture,
                toneMapped: false  // Prevents tone mapping from dimming the emission
            });
        }
        
        this.screenMesh = screenMesh;
        
        // Add a point light to emit TV colors into the scene
        this.screenLight = new THREE.PointLight(0xffffff, 2, 10);
        this.screenLight.position.set(0, 0, 1); // Position in front of screen
        this.tvMesh.add(this.screenLight);
    }
    
    startColorSampling() {
        // Create a small canvas to sample the texture color
        const sampleCanvas = document.createElement('canvas');
        const sampleSize = 32; // Small size for performance
        sampleCanvas.width = sampleSize;
        sampleCanvas.height = sampleSize;
        const sampleCtx = sampleCanvas.getContext('2d');
        
        const animate = () => {
            if (!this.gifTexture || !this.screenLight) return;
            
            // The GIF texture updates automatically, we need to sample its dominant color
            // Since we can't directly access the GIF frames, we'll use the texture's image property
            if (this.gifTexture.image) {
                try {
                    // Draw the current frame to our sample canvas
                    sampleCtx.drawImage(this.gifTexture.image, 0, 0, sampleSize, sampleSize);
                    
                    // Get the image data
                    const imageData = sampleCtx.getImageData(0, 0, sampleSize, sampleSize);
                    const data = imageData.data;
                    
                    // Calculate average color
                    let r = 0, g = 0, b = 0;
                    let validPixels = 0;
                    
                    for (let i = 0; i < data.length; i += 4) {
                        // Skip very dark pixels
                        if (data[i] + data[i + 1] + data[i + 2] > 30) {
                            r += data[i];
                            g += data[i + 1];
                            b += data[i + 2];
                            validPixels++;
                        }
                    }
                    
                    if (validPixels > 0) {
                        r = Math.floor(r / validPixels) / 255;
                        g = Math.floor(g / validPixels) / 255;
                        b = Math.floor(b / validPixels) / 255;
                        
                        // Update the light color
                        this.screenLight.color.setRGB(r, g, b);
                        
                        // Adjust intensity based on brightness
                        const brightness = (r + g + b) / 3;
                        this.screenLight.intensity = 2 + brightness * 3;
                    }
                } catch (e) {
                    // Canvas might not be ready yet
                }
            }
            
            this.animationId = requestAnimationFrame(animate);
        };
        
        animate();
    }
    
    show() {
        console.log('TV show() called');
        
        if (this.screenMesh) {
            this.screenMesh.visible = true;
        }
        
        if (this.screenLight) {
            this.screenLight.visible = true;
        }
        
        // The GIF texture automatically plays when loaded
        // Start color sampling if not already running
        if (!this.animationId && this.gifTexture) {
            this.startColorSampling();
        }
    }
    
    hide() {
        // Note: The threejs-gif-texture doesn't provide pause/play methods
        // The GIF continues to animate in the background
        
        if (this.screenMesh) {
            this.screenMesh.visible = false;
        }
        
        if (this.screenLight) {
            this.screenLight.visible = false;
        }
        
        // Stop color sampling
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
}