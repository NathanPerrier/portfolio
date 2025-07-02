import * as THREE from 'three';

import { objectProperties } from './objectProperties.js';
import { cleanString } from '../../utils/string.js';

export function createInteractionHandler(camera, interactiveObjects, controls, audioManager = null) {
    const raycaster = new THREE.Raycaster();
    let lastIntersected = null;
    let isRepositioned = false;
    let isAnimating = false;
    let repositionedObject = null;
    let controlsRef = controls;
    let clickDebounceTimeout = null;
    let windowFocusDebounceTimeout = null;
    
    const originalCameraState = {
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion()
    };

    const backButton = document.getElementById('back-button')
    
    // Add click event listener to back button
    if (backButton) {
        backButton.addEventListener('click', (e) => {
             if (audioManager) {
                audioManager.playSound('control_lock');
            }

            e.stopPropagation(); 
            returnToOriginalPosition();
        });
    }
    
    // Add window focus event listener for external link debounce
    window.addEventListener('focus', () => {
        // Set debounce when window regains focus (user returns from external link)
        windowFocusDebounceTimeout = setTimeout(() => {
            windowFocusDebounceTimeout = null;
        }, 3000); // 2-second debounce after returning from external link
    });

    function showBackButton() {
        if (backButton) {
            backButton.style.transition = 'opacity 0.3s ease-in-out';
            backButton.style.opacity = '1';
        }
    }

    function hideBackButton() {
        if (backButton) {
            backButton.style.opacity = '0';
        }
    }

    function update() {
        if (isRepositioned || isAnimating) return;

        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (lastIntersected && lastIntersected !== repositionedObject) {
            lastIntersected.userData.outline.visible = false;
        }

        let previousIntersected = lastIntersected;
        lastIntersected = null;

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            if (selectedObject.userData.outline) {
                selectedObject.userData.outline.visible = true;
                if (previousIntersected !== selectedObject && audioManager) {
                    audioManager.playSound('button_hover', 0.2);
                }
                lastIntersected = selectedObject;
            }
        }
    }

    function calculateRepositionPoint(object) {
        // Check if custom position and lookAt are defined for this object
        const properties = objectProperties[cleanString(object.name)];
        
        if (properties && properties.position && properties.lookAt) {
            // Use custom position and lookAt if defined
            return {
                position: new THREE.Vector3(
                    properties.position.x,
                    properties.position.y,
                    properties.position.z
                ),
                lookAt: new THREE.Vector3(
                    properties.lookAt.x,
                    properties.lookAt.y,
                    properties.lookAt.z
                )
            };
        }
        
        // Default calculation if no custom position is defined
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        
        // Calculate position in front of the object based on object's orientation
        const distance = Math.max(size.x, size.y, size.z) * 1.5 + 2;
        
        // Get object's world position and rotation
        const objectWorldPosition = new THREE.Vector3();
        object.getWorldPosition(objectWorldPosition);
        
        // Calculate forward direction from object (negative Z in object space)
        const forward = new THREE.Vector3(0, 0, -1);
        forward.applyQuaternion(object.quaternion);
        
        // Position camera in front of object
        const cameraPosition = objectWorldPosition.clone().add(forward.multiplyScalar(distance));
        cameraPosition.y = objectWorldPosition.y + 1; // Slightly above object center
        
        return {
            position: cameraPosition,
            lookAt: objectWorldPosition
        };
    }

    function repositionCamera(object) {
        if (isAnimating) return;
        
        isAnimating = true;
        repositionedObject = object;

        // Play interaction sound
        if (audioManager) {
            audioManager.playSound('interact');
        }

        // Dispatch interaction event
        window.dispatchEvent(new CustomEvent('object-interacted', { 
            detail: { objectName: object.name } 
        }));

        // Disable controls
        if (controlsRef && controlsRef.isLocked) {
            controlsRef.unlock();
        }
        if (controlsRef) {
            controlsRef.enabled = false;
        }

        // Store original camera state
        originalCameraState.position.copy(camera.position);
        originalCameraState.quaternion.copy(camera.quaternion);

        // Calculate new position
        const repositionData = calculateRepositionPoint(object);

        // Animate camera to new position using custom animation loop
        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();
        const targetPosition = repositionData.position;
        const targetQuaternion = new THREE.Quaternion();
        
        // Calculate target quaternion by looking at the target from the target position
        const tempCamera = new THREE.PerspectiveCamera();
        tempCamera.position.copy(targetPosition);
        tempCamera.lookAt(repositionData.lookAt);
        targetQuaternion.copy(tempCamera.quaternion);
        
        let animationProgress = 0;
        const animationDuration = 1500; // 1.5 seconds in milliseconds
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            animationProgress = Math.min(elapsed / animationDuration, 1);
            
            // Easing function (ease-in-out)
            const easeProgress = animationProgress < 0.5 
                ? 2 * animationProgress * animationProgress 
                : 1 - Math.pow(-2 * animationProgress + 2, 3) / 2;
            
            // Interpolate position
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Interpolate rotation
            camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, easeProgress);
            
            if (animationProgress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                // Animation complete
                camera.position.copy(targetPosition);
                camera.quaternion.copy(targetQuaternion);
                
                isAnimating = false;
                isRepositioned = true;
                showBackButton();

                // unlock controls if they were locked
                if (controlsRef && controlsRef.isLocked) {
                    controlsRef.unlock();
                }
                
                // Show object outline
                if (repositionedObject && repositionedObject.userData.outline) {
                    repositionedObject.userData.outline.visible = true;
                }
            }
        }
        
        // Start animation immediately
        requestAnimationFrame(animateCamera);
    }

    function returnToOriginalPosition() {
        if (!isRepositioned || isAnimating) return;
        
        isAnimating = true;

        // Animate camera back to original position using custom animation loop
        const startPosition = camera.position.clone();
        const startQuaternion = camera.quaternion.clone();
        const targetPosition = originalCameraState.position;
        const targetQuaternion = originalCameraState.quaternion;
        
        let animationProgress = 0;
        const animationDuration = 1500; // 1.5 seconds in milliseconds
        const startTime = Date.now();
        
        function animateCamera() {
            const elapsed = Date.now() - startTime;
            animationProgress = Math.min(elapsed / animationDuration, 1);
            
            // Easing function (ease-in-out)
            const easeProgress = animationProgress < 0.5 
                ? 2 * animationProgress * animationProgress 
                : 1 - Math.pow(-2 * animationProgress + 2, 3) / 2;
            
            // Interpolate position
            camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
            
            // Interpolate rotation
            camera.quaternion.slerpQuaternions(startQuaternion, targetQuaternion, easeProgress);
            
            if (animationProgress < 1) {
                requestAnimationFrame(animateCamera);
            } else {
                // Animation complete
                camera.position.copy(targetPosition);
                camera.quaternion.copy(targetQuaternion);
                
                isAnimating = false;
                isRepositioned = false;
                hideBackButton();
                
                // Set 2-second debounce to prevent immediate clicks after zooming out
                clickDebounceTimeout = setTimeout(() => {
                    clickDebounceTimeout = null;
                }, 2000);
                
                // Re-enable controls
                if (controlsRef) {
                    controlsRef.enabled = true;
                }
                
                // Clear repositioned object outline
                if (repositionedObject && repositionedObject.userData.outline) {
                    repositionedObject.userData.outline.visible = false;
                }
                repositionedObject = null;
            }
        }
        
        animateCamera();
    }

    function onClick() {
        if (isAnimating || clickDebounceTimeout) return;

        if (isRepositioned) {
            // Do nothing when repositioned - user must click back button
            return;
        } else if (lastIntersected) {
            const properties = objectProperties[cleanString(lastIntersected.name)];
            
            if (properties) {
                if (properties.reposition) {
                    repositionCamera(lastIntersected);
                } else {
                    // Check for window focus debounce for non-repositioning objects (external links)
                    if (windowFocusDebounceTimeout) {
                        return;
                    }
                    
                    // Execute action immediately for non-repositioning objects
                    if (audioManager) {
                        audioManager.playSound('interact');
                    }
                    
                    window.dispatchEvent(new CustomEvent('object-interacted', { 
                        detail: { objectName: lastIntersected.name } 
                    }));
                    
                    if (properties.action) {
                        properties.action(lastIntersected);
                    }
                }
            }
        }
    }

    function navigateToObject(object) {
        if (!isRepositioned && object) {
            lastIntersected = object;
            const properties = objectProperties[cleanString(object.name)];
            if (properties && properties.reposition) {
                repositionCamera(object);
            } else if (properties && properties.action) {
                properties.action(object);
            }
        } else if (isRepositioned) {
            returnToOriginalPosition();
            setTimeout(() => {
                lastIntersected = object;
                const properties = objectProperties[cleanString(object.name)];
                if (properties && properties.reposition) {
                    repositionCamera(object);
                } else if (properties && properties.action) {
                    properties.action(object);
                }
            }, 1600);
        }
    }

    function setControls(newControls) {
        controlsRef = newControls;
    }

    return { 
        update, 
        onClick, 
        isRepositioned: () => isRepositioned,
        isAnimating: () => isAnimating,
        navigateToObject,
        returnToOriginalPosition,
        setControls
    };
}