import * as THREE from 'three';

export function checkCollisions(camera, collidableObjects) {
    const playerCollider = new THREE.Box3();
    const playerCenter = camera.position.clone();
    playerCenter.y -= 3; // Center the box around the player's body
    playerCollider.setFromCenterAndSize(playerCenter, new THREE.Vector3(1, 5.9, 1)); // Slightly smaller than player height to avoid floor collision

    for (const object of collidableObjects) {
        if (object.isMesh) {
            const objectBox = new THREE.Box3().setFromObject(object);
            if (playerCollider.intersectsBox(objectBox)) {
                return true; // Collision detected
            }
        }
    }
    return false; // No collision
}
