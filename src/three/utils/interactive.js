import * as THREE from 'three';
import gsap from 'gsap';

export function createInteractionHandler(camera, interactiveObjects, controls) {
    const raycaster = new THREE.Raycaster();
    let lastIntersected = null;
    let isZoomed = false;
    let zoomedObject = null;

    const originalCameraState = {
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion()
    };

    function update() {
        if (isZoomed) return;

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
        if (controls.isLocked) {
            controls.unlock();
        }
        controls.enabled = false;

        originalCameraState.position.copy(camera.position);
        originalCameraState.quaternion.copy(camera.quaternion);

        const zoomPosition = object.userData.zoomPosition || new THREE.Vector3(0, 0, 5);
        const lookAtPosition = object.userData.lookAtPosition || new THREE.Vector3(0, 0, 0);

        gsap.to(camera.position, {
            duration: 1.5,
            x: zoomPosition.x,
            y: zoomPosition.y,
            z: zoomPosition.z,
            ease: 'power3.inOut',
            onUpdate: () => camera.lookAt(lookAtPosition)
        });
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

    return { update, onClick, isZoomed: () => isZoomed };
}
