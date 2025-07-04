import * as THREE from 'three';

export class WhiteboardManager {
    constructor() {
        this.canvas = null;
        this.context = null;
        this.texture = null;
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.currentTool = 'marker';
        this.currentColor = '#00000060';
        this.markerSize = 8;
        this.canvasSize = 1024;
        this.whiteboardMesh = null;
        this.uiContainer = null;
        this.camera = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    init(whiteboardMesh, camera) {
        this.whiteboardMesh = whiteboardMesh;
        this.camera = camera;
        
        // Create offscreen canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;
        this.context = this.canvas.getContext('2d');
        
        // Set off-white background to reduce brightness
        this.context.fillStyle = '#f5f5f5';
        this.context.fillRect(0, 0, this.canvasSize, this.canvasSize);

        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.flipY = false; // Prevent upside-down texture
        this.texture.needsUpdate = true;
        
        // Apply texture to whiteboard
        // Find the actual mesh if this is a group
        let targetMesh = whiteboardMesh;
        if (whiteboardMesh.type === 'Group') {
            whiteboardMesh.traverse((child) => {
                if (child.isMesh && child.name.includes('whiteBoard')) {
                    targetMesh = child;
                }
            });
        }
        
        if (targetMesh.material) {
            // Apply the canvas texture
            targetMesh.material.map = this.texture;
            targetMesh.material.transparent = true; // Enable transparency for eraser
            targetMesh.material.alphaTest = 0.1; // 
            targetMesh.material.needsUpdate = true;
            
            // Reduce emissive intensity to make it less bright
            if (targetMesh.material.emissive) {
                targetMesh.material.emissive.setHex(0x404040);
                targetMesh.material.emissiveIntensity = 0.5;
            }
        }
        
        // Create UI controls
        this.createUI();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    createUI() {
        // Create UI container
        this.uiContainer = document.createElement('div');
        this.uiContainer.id = 'whiteboard-controls';
        this.uiContainer.className = 'nes-container with-title';
        this.uiContainer.style.cssText = `
            position: absolute;
            bottom: 25%;
            left: 50%;
            transform: translateX(-50%);
            display: none;
            opacity: 0.9;
            border: none;
            padding: 10px;
            min-width: 400px;
            pointer-events: all;
            z-index: 1000;
        `;
        
        // Tools container
        const toolsContainer = document.createElement('div');
        toolsContainer.style.cssText = 'display: flex; gap: 10px; align-items: center; justify-content: center;';
        
        // Color buttons
        const colors = [
            { color: '#00000060', name: 'Black' },
            { color: '#ff000060', name: 'Red' },
            { color: '#0066cc60', name: 'Blue' },
            { color: '#00880060', name: 'Green' },
            { color: '#ff990060', name: 'Orange' }
        ];
        
        colors.forEach(({ color, name }) => {
            const btn = document.createElement('button');
            btn.className = 'nes-btn';
            btn.style.cssText = `
                width: 40px;
                height: 40px;
                background-color: ${color};
                border: 2px solid white;
                padding: 0;
            `;
            btn.title = name;
            btn.onclick = () => this.selectColor(color);
            toolsContainer.appendChild(btn);
        });
        
        // Separator
        const separator = document.createElement('div');
        separator.style.cssText = 'width: 2px; height: 40px; background: white; margin: 0 10px;';
        toolsContainer.appendChild(separator);
        
        // Clear button
        const clearBtn = document.createElement('button');
        clearBtn.className = 'nes-btn is-error';
        clearBtn.textContent = '🗑️';
        clearBtn.title = 'Clear All';
        clearBtn.style.opacity = '0.7';
        clearBtn.style.fontSize = '20px';
        clearBtn.onclick = () => this.clearBoard();
        toolsContainer.appendChild(clearBtn);
        
        this.uiContainer.appendChild(toolsContainer);
        
        // Add to UI content div
        const uiContent = document.getElementById('ui-content');
        if (uiContent) {
            uiContent.appendChild(this.uiContainer);
        }
    }

    setupEventListeners() {
        // Handle mouse events on the canvas overlay
        const overlay = document.createElement('div');
        overlay.id = 'whiteboard-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 70%;
            z-index: 50;
            cursor: none;
            display: none;
            pointer-events: auto;
        `;
        document.body.appendChild(overlay);
        
        overlay.addEventListener('mousedown', this.startDrawing.bind(this));
        overlay.addEventListener('mousemove', this.draw.bind(this));
        overlay.addEventListener('mouseup', this.stopDrawing.bind(this));
        overlay.addEventListener('mouseleave', this.stopDrawing.bind(this));
        
        // Touch support
        overlay.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            overlay.dispatchEvent(mouseEvent);
        });
        
        overlay.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            overlay.dispatchEvent(mouseEvent);
        });
        
        overlay.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            overlay.dispatchEvent(mouseEvent);
        });
    }

    show() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'block';
        } else {
            console.error('No UI container found!');
        }

        const overlay = document.getElementById('whiteboard-overlay');
        if (overlay) {
            overlay.style.display = 'block';
        } else {
            console.error('No overlay found!');
        }
    }

    hide() {
        if (this.uiContainer) {
            this.uiContainer.style.display = 'none';
        }
        const overlay = document.getElementById('whiteboard-overlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
        this.stopDrawing();
    }

    selectColor(color) {
        this.currentColor = color;
        this.currentTool = 'marker';
        document.getElementById('whiteboard-overlay').style.cursor = 'crosshair';
    }

    clearBoard() {
        this.context.fillStyle = '#f5f5f5';
        this.context.fillRect(0, 0, this.canvasSize, this.canvasSize);
        this.texture.needsUpdate = true;
    }

    getWhiteboardScreenBounds() {
        if (!this.whiteboardMesh || !this.camera) return null;
        
        // Get the actual mesh if it's a group
        let targetMesh = this.whiteboardMesh;
        if (this.whiteboardMesh.type === 'Group') {
            this.whiteboardMesh.traverse((child) => {
                if (child.isMesh && child.name.includes('whiteBoard')) {
                    targetMesh = child;
                }
            });
        }
        
        // Get bounding box of the whiteboard
        const box = new THREE.Box3().setFromObject(targetMesh);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        
        // Project the corners to screen space
        const corners = [
            new THREE.Vector3(center.x - size.x/2, center.y + size.y/2, center.z),
            new THREE.Vector3(center.x + size.x/2, center.y + size.y/2, center.z),
            new THREE.Vector3(center.x + size.x/2, center.y - size.y/2, center.z),
            new THREE.Vector3(center.x - size.x/2, center.y - size.y/2, center.z)
        ];
        
        const screenCorners = corners.map(corner => {
            const projected = corner.clone().project(this.camera);
            return {
                x: (projected.x + 1) * window.innerWidth / 2,
                y: (-projected.y + 1) * window.innerHeight / 2
            };
        });
        
        // Calculate bounds
        const minX = Math.min(...screenCorners.map(c => c.x));
        const maxX = Math.max(...screenCorners.map(c => c.x));
        const minY = Math.min(...screenCorners.map(c => c.y));
        const maxY = Math.max(...screenCorners.map(c => c.y));
        
        return {
            left: minX,
            top: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    startDrawing(e) {
        this.isDrawing = true;
        
        const bounds = this.getWhiteboardScreenBounds();
        if (!bounds) {
            // Fallback to old method if bounds can't be calculated
            const x = (e.clientX / window.innerWidth) * this.canvasSize;
            const normalizedY = e.clientY / (window.innerHeight * 0.7);
            const y = (1 - normalizedY) * this.canvasSize;
            this.lastX = x;
            this.lastY = y;
            return;
        }
        
        // Map mouse position relative to whiteboard bounds
        const relativeX = (e.clientX - bounds.left) / bounds.width;
        const relativeY = (e.clientY - bounds.top) / bounds.height;
        
        // Clamp to [0, 1] range
        const clampedX = Math.max(0, Math.min(1, relativeX));
        const clampedY = Math.max(0, Math.min(1, relativeY));
        
        // Convert to canvas coordinates
        const x = clampedX * this.canvasSize;
        const y = clampedY * this.canvasSize;
        
        this.lastX = x;
        this.lastY = y;
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const bounds = this.getWhiteboardScreenBounds();
        let x, y;
        
        if (!bounds) {
            // Fallback to old method if bounds can't be calculated
            x = (e.clientX / window.innerWidth) * this.canvasSize;
            const normalizedY = e.clientY / (window.innerHeight * 0.7);
            y = (1 - normalizedY) * this.canvasSize;
        } else {
            // Map mouse position relative to whiteboard bounds
            const relativeX = (e.clientX - bounds.left) / bounds.width;
            const relativeY = (e.clientY - bounds.top) / bounds.height;
            
            // Clamp to [0, 1] range
            const clampedX = Math.max(0, Math.min(1, relativeX));
            const clampedY = Math.max(0, Math.min(1, relativeY));
            
            // Convert to canvas coordinates
            x = clampedX * this.canvasSize;
            y = clampedY * this.canvasSize;
        }
        
        // Draw with marker
        this.context.strokeStyle = this.currentColor;
        this.context.lineWidth = this.markerSize;
        this.context.lineCap = 'round';
        this.context.lineJoin = 'round';
        
        this.context.beginPath();
        this.context.moveTo(this.lastX, this.lastY);
        this.context.lineTo(x, y);
        this.context.stroke();
        
        this.lastX = x;
        this.lastY = y;
        
        this.texture.needsUpdate = true;
    }

    stopDrawing() {
        this.isDrawing = false;
    }
}

// Create singleton instance
export const whiteboardManager = new WhiteboardManager();