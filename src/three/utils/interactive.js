import * as THREE from 'three';

export function createInteractionHandler(camera, interactiveObjects) {
    const raycaster = new THREE.Raycaster();
    let lastIntersected = null;

    function update() {
        raycaster.setFromCamera({ x: 0, y: 0 }, camera);
        const intersects = raycaster.intersectObjects(interactiveObjects, true);

        if (lastIntersected) {
            lastIntersected.userData.outline.visible = false;
            lastIntersected = null;
        }

        if (intersects.length > 0) {
            const selectedObject = intersects[0].object;
            if (selectedObject.userData.outline) {
                selectedObject.userData.outline.visible = true;
                lastIntersected = selectedObject;
            }
        }
    }

    return { update };
}
