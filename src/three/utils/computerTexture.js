import * as THREE from 'three';
import html2canvas from 'html2canvas';

export class ComputerTexture {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            src: config.src || '/terminal/index.html',
            width: config.width || 1024,
            height: config.height || 768,
            screenWidth: config.screenWidth || 1.9,
            screenHeight: config.screenHeight || 1.65,
            screenPosition: config.screenPosition || { x: 0, y: 0.7, z: 1 },
            emissiveColor: config.emissiveColor || 0x00ff00,
            emissiveIntensity: config.emissiveIntensity || 15,
            enableKeyboard: config.enableKeyboard || false,
            enableMouse: config.enableMouse || false,
            backgroundColor: config.backgroundColor || '#000'
        };
        
        this.canvas = null;
        this.texture = null;
        this.material = null;
        this.screenMesh = null;
        this.isActive = false;
        this.iframe = null;
        this.updateInterval = null;
        this.previewInterval = null;
        this.inputProxy = null;
        this.isInputActive = false;
        this.isMouseActive = false;
        this.mouseOverlay = null;
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.renderQueue = false;
        this.activationTimeout = null; // Track activation timeout
    }
    
    init(computerMesh) {
        // Create off-screen canvas for rendering website
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        
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
            // Create a screen mesh with configured dimensions
            const geometry = new THREE.PlaneGeometry(this.config.screenWidth, this.config.screenHeight);
            const material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(this.config.emissiveColor),
                emissiveIntensity: this.config.emissiveIntensity
            });
            screenMesh = new THREE.Mesh(geometry, material);
            // Position the screen relative to computer
            screenMesh.position.set(
                this.config.screenPosition.x,
                this.config.screenPosition.y,
                this.config.screenPosition.z
            );
            
            computerMesh.add(screenMesh);
        } else {
            // Replace the screen mesh's material with our texture
            this.originalMaterial = screenMesh.material;
            screenMesh.material = new THREE.MeshBasicMaterial({
                map: this.texture,
                side: THREE.DoubleSide,
                emissive: new THREE.Color(this.config.emissiveColor),
                emissiveIntensity: this.config.emissiveIntensity
            });
        }
        
        this.screenMesh = screenMesh;
        this.material = screenMesh.material;
        
        // Create hidden iframe for rendering HTML
        this.createIframe();
        
        // Create input proxy only if keyboard is enabled
        if (this.config.enableKeyboard) {
            this.createInputProxy();
        }
        
        this.renderIframeToCanvas();
    }
    
    createIframe() {
        // Create a hidden iframe
        this.iframe = document.createElement('iframe');
        this.iframe.src = this.config.src;
        this.iframe.style.position = 'absolute';
        this.iframe.style.left = '-9999px';
        this.iframe.style.width = this.config.width + 'px';
        this.iframe.style.height = this.config.height + 'px';
        this.iframe.style.border = 'none';
        this.iframe.style.background = '#000';
        
        // Initially disable pointer events if mouse is enabled
        if (this.config.enableMouse) {
            this.iframe.style.pointerEvents = 'none';
        }
        
        document.body.appendChild(this.iframe);
    }
    
    startPreviewMode() {
        // Clear any existing intervals
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
        }
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }
        
        // Initial render
        this.renderIframeToCanvas();
        
        // Update every 10 seconds in preview mode
        this.previewInterval = setInterval(() => {
            if (this.isActive && !this.isInputActive && !this.isMouseActive) {
                this.renderIframeToCanvas();
            }
        }, 10000000);
    }
    
    startRendering() {
        // Clear any existing intervals
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }
        
        // Use requestAnimationFrame with throttling instead of setInterval
        const render = () => {
            const now = performance.now();
            const timeSinceLastRender = now - this.lastRenderTime;
            
            // Only render if enough time has passed
            if (timeSinceLastRender >= 100) {
                this.renderIframeToCanvas();
                this.lastRenderTime = now;
            }
            
            if (this.isActive) {
                this.updateInterval = requestAnimationFrame(render);
            }
        };
        
        render();
    }
    
    renderIframeToCanvas() {
        // Prevent overlapping renders
        if (this.isRendering) {
            this.renderQueue = true;
            return;
        }
        
        this.isRendering = true;
        
        try {
            // Access iframe document
            const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
            
            if (!iframeDoc || !iframeDoc.body) {
                console.warn('Iframe document not accessible');
                this.isRendering = false;
                return;
            }
            
            // Use html2canvas with optimized settings
            html2canvas(iframeDoc.body, {
                width: this.config.width,
                height: this.config.height,
                backgroundColor: this.config.backgroundColor,
                scale: 1, // Fixed scale for performance
                logging: false,
                useCORS: true,
                allowTaint: true,
                imageTimeout: 0, // Disable image loading timeout
                removeContainer: true, // Clean up after rendering
                foreignObjectRendering: false // Faster rendering
            }).then((canvasResult) => {
                // Draw the result to our texture canvas
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.drawImage(canvasResult, 0, 0, this.canvas.width, this.canvas.height);
                
                // Update texture
                this.texture.needsUpdate = true;
                
                this.isRendering = false;
                
                // Process queued render if any
                if (this.renderQueue) {
                    this.renderQueue = false;
                    this.renderIframeToCanvas();
                }
            }).catch((error) => {
                console.error('Error with html2canvas:', error);
                this.isRendering = false;
                // Fallback rendering
                this.drawFallbackContent();
            });
        } catch (error) {
            console.error('Error rendering iframe:', error);
            this.isRendering = false;
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

        // Start preview mode with 10-second updates
        this.startPreviewMode();
    }

    activateMouse() {
        if (!this.config.enableMouse) return;

        // Make iframe visible for interaction but transparent
        if (this.iframe) {
            this.iframe.style.pointerEvents = 'auto';
            
            // Send message to iframe content
            if (this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage('activateMouse', '*');
            }
        }
        
        this.isMouseActive = true;
        
        // Switch to full rendering mode when mouse is activated
        if (this.isActive) {
            this.startRendering();
        }
    }

    deactivateMouse() {
        if (!this.config.enableMouse) return;

        // Hide iframe again
        if (this.iframe) {
            this.iframe.style.pointerEvents = 'none';
            
            // Send message to iframe content
            if (this.iframe.contentWindow) {
                this.iframe.contentWindow.postMessage('deactivateMouse', '*');
            }
        }
        
        this.isMouseActive = false;
        
        // Switch back to preview mode if still active but no input is active
        if (this.isActive && !this.isInputActive) {
            this.startPreviewMode();
        }
    }
    
    hide() {
        if (!this.isActive) return;
        
        this.isActive = false;
        
        // Deactivate keyboard input if enabled
        if (this.config.enableKeyboard && this.isInputActive) {
            this.deactivateInput();
        }
        
        // Clear any pending activation
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Deactivate mouse if enabled
        if (this.config.enableMouse) {
            this.deactivateMouse();
        }
        
        // Send deactivation message to iframe
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage('deactivate', '*');
        }
        
        // Stop rendering updates
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clear preview interval if running
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
    }
    
    deactivateInput() {
        if (!this.config.enableKeyboard) return;
        
        // Clear any pending activation timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Only deactivate keyboard input, keep screen visible
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage('deactivate', '*');
        }
        this.isInputActive = false;
        
        // Remove keyboard listeners properly
        this.removeKeyboardHandlers();
        
        // Switch back to preview mode if still active but no mouse is active
        if (this.isActive && !this.isMouseActive) {
            this.startPreviewMode();
        }
    }
    
    createInputProxy() {
        // Remove any existing handlers first
        this.removeKeyboardHandlers();
        
        // Create keyboard event handlers that forward to iframe
        this.keydownHandler = (e) => {
            // Double-check that input is actually active
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            
            // Special handling for Escape key
            if (e.key === 'Escape') {
                this.deactivateInput();
                return;
            }
            
            // Forward the event to the iframe
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
                    const terminalInput = iframeDoc.getElementById('terminal-input');
                    
                    if (terminalInput) {
                        // Create a synthetic event in the iframe
                        const event = new KeyboardEvent('keydown', {
                            key: e.key,
                            keyCode: e.keyCode,
                            which: e.which,
                            shiftKey: e.shiftKey,
                            ctrlKey: e.ctrlKey,
                            altKey: e.altKey,
                            metaKey: e.metaKey,
                            bubbles: true
                        });
                        
                        terminalInput.dispatchEvent(event);
                        
                        // For printable characters, update the input value
                        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                            terminalInput.value += e.key;
                            // Move cursor to end
                            terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
                        } else if (e.key === 'Backspace') {
                            terminalInput.value = terminalInput.value.slice(0, -1);
                        }
                        
                        e.preventDefault();
                        e.stopPropagation();
                    }
                } catch (error) {
                    console.error('Error forwarding keyboard event:', error);
                }
            }
        };
        
        this.keyupHandler = (e) => {
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            e.preventDefault();
            e.stopPropagation();
        };
        
        this.keypressHandler = (e) => {
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            e.preventDefault();
            e.stopPropagation();
        };
    }
    
    removeKeyboardHandlers() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
        }
        if (this.keyupHandler) {
            document.removeEventListener('keyup', this.keyupHandler, true);
        }
        if (this.keypressHandler) {
            document.removeEventListener('keypress', this.keypressHandler, true);
        }
    }
    
    activateInput() {
        if (!this.config.enableKeyboard || this.isInputActive) return;
        
        // Clear any existing activation timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Remove any existing handlers first to prevent duplicates
        this.removeKeyboardHandlers();
        
        this.isInputActive = true;
        
        // Add keyboard listeners
        document.addEventListener('keydown', this.keydownHandler, true);
        document.addEventListener('keyup', this.keyupHandler, true);
        document.addEventListener('keypress', this.keypressHandler, true);
        
        // Send activation message to iframe
        if (this.iframe && this.iframe.contentWindow) {
            this.iframe.contentWindow.postMessage('activate', '*');
        }
        
        // Switch to full rendering mode when input is activated
        if (this.isActive) {
            this.startRendering();
        }
    }
    
    // Method to schedule delayed activation
    scheduleActivation(delay = 500) {
        if (!this.config.enableKeyboard) return;
        
        // Clear any existing timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
        }
        
        // Set new timeout
        this.activationTimeout = setTimeout(() => {
            this.activateInput();
            this.activationTimeout = null;
        }, delay);
    }
    
    update() {
        // Texture updates are handled by the render interval
        // This method is here for consistency with other texture classes
    }
    
    dispose() {
        // Clean up all resources
        this.hide();
        this.removeKeyboardHandlers();
        
        // Clear any intervals and timeouts
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
        
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
        }
        
        if (this.texture) {
            this.texture.dispose();
        }
        
        if (this.canvas) {
            this.canvas = null;
        }
    }
    
}