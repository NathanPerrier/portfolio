import * as THREE from 'three';
import html2canvas from 'html2canvas';

export class ComputerTerminalTexture {
    constructor() {
        this.canvas = null;
        this.texture = null;
        this.material = null;
        this.screenMesh = null;
        this.isActive = false;
        this.iframe = null;
        this.updateInterval = null;
        this.src = '/terminal/test.html'; 
    }
    
    init(computerMesh) {
        // Create off-screen canvas for rendering website
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;  // Higher resolution for crisp text
        this.canvas.height = 768;
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        
        // Find the screen mesh in the computer model
        let screenMesh = null;
        const meshes = [];
        
        computerMesh.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
                
                // Look for a mesh that might be the screen by name
                const name = child.name.toLowerCase();
                if (name.includes('screen') || 
                    name.includes('display') ||
                    name.includes('monitor')) {
                    screenMesh = child;
                    console.log('Found screen mesh by name:', child.name);
                }
            }
        });
        
        // If no screen found by name, look for one by position/size
        if (!screenMesh && meshes.length > 0) {
            console.log('Computer terminal meshes found:', meshes.map(m => m.name));
            
            // Find a mesh that's positioned like a screen
            for (const mesh of meshes) {
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                
                // Check if mesh is positioned like a monitor screen
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                
                // Look for screen-like dimensions
                if (size.x > 0.3 && size.x < 1.5 && 
                    size.y > 0.3 && size.y < 1.5 && 
                    size.z < 0.3) {
                    screenMesh = mesh;
                    console.log('Found potential screen mesh:', mesh.name, 'at position:', worldPos);
                    break;
                }
            }
        }
        
        if (!screenMesh) {
            console.warn('Could not find screen mesh in computer model, creating one');
            // Create a screen mesh with 4:3 aspect ratio (doubled size)
            const geometry = new THREE.PlaneGeometry(1.9, 1.65);
            const material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(0x00ff00),
                emissiveIntensity: 15
            });
            screenMesh = new THREE.Mesh(geometry, material);
            // Position the screen relative to computer terminal
            screenMesh.position.set(0, .7, 1);
            
            computerMesh.add(screenMesh);
        } else {
            // Replace the screen mesh's material with our texture
            this.originalMaterial = screenMesh.material;
            screenMesh.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(0x00ff00),
                emissiveIntensity: 15
            });
        }
        
        this.screenMesh = screenMesh;
        this.material = screenMesh.material;
        
        // Create hidden iframe for rendering HTML
        this.createIframe();
        
        // Always show the screen (computer terminals are always on)
        this.show();
    }
    
    createIframe() {
        // Create a hidden iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = this.src; // Default to test.html
        this.iframe.style.position = 'absolute';
        this.iframe.style.left = '-9999px';
        this.iframe.style.width = '1024px';
        this.iframe.style.height = '768px';
        this.iframe.style.border = 'none';
        this.iframe.style.background = 'white';
        document.body.appendChild(this.iframe);
    }
    
    
    startRendering() {
        // Clear any existing interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Render iframe content to canvas at 30fps
        this.updateInterval = setInterval(() => {
            this.renderIframeToCanvas();
        }, 33);
    }
    
    renderIframeToCanvas() {
        try {
            // Access iframe document
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            
            if (!iframeDoc || !iframeDoc.body) {
                console.warn('Iframe document not accessible');
                return;
            }
            
            // Use html2canvas to render the iframe content
            html2canvas(iframeDoc.body, {
                width: 1024,
                height: 768,
                backgroundColor: '#000',
                scale: window.devicePixelRatio || 1,
                logging: false,
                useCORS: true,
                allowTaint: true
            }).then((canvasResult) => {
                // Draw the result to our texture canvas
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.drawImage(canvasResult, 0, 0, this.canvas.width, this.canvas.height);
                
                // Update texture
                this.texture.needsUpdate = true;
            }).catch((error) => {
                console.error('Error with html2canvas:', error);
                // Fallback rendering
                this.drawFallbackContent();
            });
        } catch (error) {
            console.error('Error rendering iframe:', error);
            this.drawFallbackContent();
        }
    }
    
    drawFallbackContent() {
        const ctx = this.canvas.getContext('2d');
        
        // Red background to match test.html
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.texture.needsUpdate = true;
    }
    
    drawErrorScreen(error) {
        const ctx = this.canvas.getContext('2d');
        
        // Terminal error theme
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px monospace';
        ctx.fillText('ERROR:', 20, 30);
        ctx.font = '16px monospace';
        ctx.fillText(error, 20, 60);
        
        this.texture.needsUpdate = true;
    }
    

    show() {
        if (this.isActive) return;
        
        this.isActive = true;
        
        this.startRendering();
    }
    
    update() {
        // Texture updates are handled by the render interval
        // This method is here for consistency with other texture classes
    }
    
}