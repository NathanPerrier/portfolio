import { gsap } from 'gsap';
import * as THREE from 'three';
import { objectProperties } from './objectProperties.js';
import { cleanString } from '../../utils/string.js';

export class ScrollControls {
    constructor(camera, objects, domElement) {
        this.camera = camera;
        this.objects = objects;
        this.domElement = domElement;
        this.currentIndex = 0;
        this.isAnimating = false;
        
        // Filter objects to only include those with zoom positions or actions
        this.zoomableObjects = this.objects.filter(obj => {
            const properties = objectProperties[cleanString(obj.name)];
            return properties && (properties.zoomPosition || properties.action);
        });
        
        console.log('Mobile: Found interactive objects:', this.zoomableObjects.map(obj => obj.name));

        // Add a wrapper for scroll events if it doesn't exist
        if (!document.getElementById('scroll-container')) {
            const wrapper = document.createElement('div');
            wrapper.id = 'scroll-container';
            wrapper.style.position = 'fixed';
            wrapper.style.top = '0';
            wrapper.style.left = '0';
            wrapper.style.width = '100%';
            wrapper.style.height = '100vh';
            wrapper.style.overflowY = 'scroll';
            wrapper.style.zIndex = '9999'; // Make sure it's on top
            
            const content = document.createElement('div');
            // Set height to allow scrolling through all zoomable objects
            content.style.height = `${this.zoomableObjects.length * 100}vh`; 
            wrapper.appendChild(content);
            document.body.appendChild(wrapper);
            this.scrollContainer = wrapper;
        } else {
            this.scrollContainer = document.getElementById('scroll-container');
        }


        this.scrollContainer.addEventListener('scroll', this.onScroll.bind(this));
        this.navigateTo(0); // Move to the first object initially
    }

    onScroll(event) {
        if (this.isAnimating) {
            return;
        }

        const scrollTop = this.scrollContainer.scrollTop;
        const scrollHeight = this.scrollContainer.scrollHeight - this.scrollContainer.clientHeight;
        const scrollPercentage = scrollTop / scrollHeight;
        
        // Determine the target index based on scroll position
        const newIndex = Math.round(scrollPercentage * (this.zoomableObjects.length - 1));

        if (newIndex !== this.currentIndex) {
            this.currentIndex = newIndex;
            this.navigateTo(this.currentIndex);
        }
    }

    navigateTo(index) {
        if (index < 0 || index >= this.zoomableObjects.length) {
            return;
        }

        this.isAnimating = true;
        const targetObject = this.zoomableObjects[index];
        const properties = objectProperties[cleanString(targetObject.name)];
        
        if (!properties) {
            console.warn('Mobile: No properties for object:', targetObject.name);
            this.isAnimating = false;
            return;
        }

        console.log('Mobile: Navigating to object:', targetObject.name);

        // If object has no zoom position, just execute action immediately
        if (!properties.zoomPosition) {
            console.log('Mobile: No zoom position, executing action immediately');
            if (properties.action) {
                properties.action(targetObject);
            }
            
            // Dispatch interaction event for HUD tracking
            window.dispatchEvent(new CustomEvent('object-interacted', { 
                detail: { objectName: targetObject.name } 
            }));
            
            this.isAnimating = false;
            return;
        }

        // Use provided zoom and look-at positions
        const zoomPosition = properties.zoomPosition;
        const lookAtPosition = properties.lookAtPosition || new THREE.Box3().setFromObject(targetObject).getCenter(new THREE.Vector3());

        gsap.to(this.camera.position, {
            duration: 1.5,
            x: zoomPosition.x,
            y: zoomPosition.y,
            z: zoomPosition.z,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.camera.lookAt(lookAtPosition);
            },
            onComplete: () => {
                this.isAnimating = false;
                
                // Execute action after reaching the position
                if (properties.action) {
                    console.log('Mobile: Executing action for:', targetObject.name);
                    properties.action(targetObject);
                }
                
                // Dispatch interaction event for HUD tracking
                window.dispatchEvent(new CustomEvent('object-interacted', { 
                    detail: { objectName: targetObject.name } 
                }));
            },
        });
    }

    dispose() {
        this.scrollContainer.removeEventListener('scroll', this.onScroll.bind(this));
        const scrollContainer = document.getElementById('scroll-container');
        if(scrollContainer) {
            scrollContainer.remove();
        }
    }

    update() {
        // No update needed for scroll controls
    }
}
