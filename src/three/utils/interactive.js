import * as THREE from 'three';
import gsap from 'gsap';

import { objectProperties } from './objectProperties.js';
import { cleanString } from '../../utils/string.js';

export function createInteractionHandler(camera, interactiveObjects, controls) {
    const raycaster = new THREE.Raycaster();
    let lastIntersected = null;
    let isZoomed = false;
    let isAnimating = false;
    let zoomedObject = null;
    let actionJustPerformed = false;

    const originalCameraState = {
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion()
    };

    function update() {
        if (isZoomed || isAnimating) return;

        if (actionJustPerformed) {
            actionJustPerformed = false;
            return;
        }

        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (lastIntersected && lastIntersected !== zoomedObject) {
            lastIntersected.userData.outline.visible = false;
        }

        lastIntersected = null;

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            if (selectedObject.userData.outline) {
                selectedObject.userData.outline.visible = true;
                lastIntersected = selectedObject;
            }
        }
    }

    function zoomTo(object) {
        isZoomed = true;
        zoomedObject = object;
        const properties = objectProperties[cleanString(object.name)];

        if (properties && properties.action) {
            properties.action();
        }
        
        // Dispatch interaction event for HUD tracking
        window.dispatchEvent(new CustomEvent('object-interacted', { 
            detail: { objectName: object.name } 
        }));

        if (controls.isLocked) {
            controls.unlock();
        }

        controls.enabled = false;

        originalCameraState.position.copy(camera.position);
        originalCameraState.quaternion.copy(camera.quaternion);

        const zoomPosition = properties.zoomPosition || new THREE.Vector3(0, 0, 5);
        const lookAtPosition = properties.lookAtPosition;

        console.log('Zooming to:', object.name, 'at position:', zoomPosition);
        gsap.to(camera.position, {
            duration: 1.5,
            x: zoomPosition.x,
            y: zoomPosition.y,
            z: zoomPosition.z,
            ease: 'power3.inOut',
            onStart: () => {
                gsap.ticker.add(updateCamera);
            },
            onUpdate: () => {
                if (lookAtPosition) {
                    camera.lookAt(lookAtPosition);
                } else {
                    const center = new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3());
                    camera.lookAt(center);
                }
            },
            onComplete: () => {
                gsap.ticker.remove(updateCamera);
                controls.enabled = true;
                isZoomed = true;
                if (zoomedObject.userData.outline) {
                    zoomedObject.userData.outline.visible = true;
                }
            }
        });

        function updateCamera() {
            camera.updateProjectionMatrix();
        }

    }

    function zoomOut() {
        if (!isZoomed) return;

        gsap.to(camera.position, {
            duration: 1.5,
            x: originalCameraState.position.x,
            y: originalCameraState.position.y,
            z: originalCameraState.position.z,
            ease: 'power3.inOut',
            onUpdate: () => {
                camera.quaternion.slerp(originalCameraState.quaternion, 0.05); 
            },
            onComplete: () => {
                camera.quaternion.copy(originalCameraState.quaternion);
                controls.enabled = true;
                isZoomed = false;
                if (zoomedObject.userData.outline) {
                    zoomedObject.userData.outline.visible = false;
                }
                zoomedObject = null;
            }
        });
    }

    function onClick() {
        if (isZoomed) {
            zoomOut();
        } else if (lastIntersected) {
            zoomTo(lastIntersected);
        }
    }

    function navigateToObject(object) {
        if (!isZoomed && object) {
            lastIntersected = object;
            zoomTo(object);
        } else if (isZoomed) {
            // First zoom out, then navigate
            zoomOut();
            setTimeout(() => {
                lastIntersected = object;
                zoomTo(object);
            }, 1600); // Wait for zoom out animation
        }
    }

    return { 
        update, 
        onClick, 
        isZoomed: () => isZoomed,
        navigateToObject
    };
}
