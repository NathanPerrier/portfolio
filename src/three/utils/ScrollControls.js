import { gsap } from 'gsap';
import * as THREE from 'three';

export class ScrollControls {
    constructor(camera, objects, domElement) {
        this.camera = camera;
        this.objects = objects;
        this.domElement = domElement;
        this.currentIndex = 0;
        this.isAnimating = false;

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
            // Set height to allow scrolling through all objects
            content.style.height = `${this.objects.length * 100}vh`; 
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
        const newIndex = Math.round(scrollPercentage * (this.objects.length - 1));

        if (newIndex !== this.currentIndex) {
            this.currentIndex = newIndex;
            this.navigateTo(this.currentIndex);
        }
    }

    navigateTo(index) {
        if (index < 0 || index >= this.objects.length) {
            return;
        }

        this.isAnimating = true;
        const targetObject = this.objects[index];

        // Position to look at the object from a distance
        const offset = new THREE.Vector3(0, 1, 5); // Adjust offset as needed
        const targetPosition = new THREE.Vector3();
        targetObject.getWorldPosition(targetPosition);
        
        const cameraPosition = targetPosition.clone().add(offset);

        gsap.to(this.camera.position, {
            duration: 1.5,
            x: cameraPosition.x,
            y: cameraPosition.y,
            z: cameraPosition.z,
            ease: 'power2.inOut',
            onUpdate: () => {
                this.camera.lookAt(targetPosition);
            },
            onComplete: () => {
                this.isAnimating = false;
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
