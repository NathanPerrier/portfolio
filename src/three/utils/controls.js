import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { getAudioManager } from '../../utils/AudioManager.js';

export function createControls(camera, renderer, playerBody, interactiveObjects, interactionHandler = null) {

    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = 1.5;

    const cursor = document.querySelector('.custom-cursor');
    const uiContainer = document.getElementById('ui-container');

    controls.addEventListener('lock', () => {
        cursor.style.display = 'none';
        // Only hide UI if camera is not repositioned
        if (!interactionHandler || !interactionHandler.isRepositioned()) {
            uiContainer.style.opacity = '0';
        }
        const audioManager = getAudioManager();
        audioManager.playSound('control_lock');
    });

    controls.addEventListener('unlock', () => {
        cursor.style.display = 'block';
        uiContainer.style.opacity = '1';
        const audioManager = getAudioManager();
        audioManager.playSound('control_unlock');
    });

    renderer.domElement.addEventListener('click', () => {
        controls.lock();
    });

    const inputVelocity = new THREE.Vector3();
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    let canJump = false;

    const onKeyDown = (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                inputVelocity.z = -1;
                break;
            case 'KeyS':
            case 'ArrowDown':
                inputVelocity.z = 1;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                inputVelocity.x = -1;
                break;
            case 'KeyD':
            case 'ArrowRight':
                inputVelocity.x = 1;
                break;
        }
    };

    const onKeyUp = (event) => {
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
            case 'KeyS':
            case 'ArrowDown':
                inputVelocity.z = 0;
                break;
            case 'KeyA':
            case 'ArrowLeft':
            case 'KeyD':
            case 'ArrowRight':
                inputVelocity.x = 0;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    playerBody.addEventListener('collide', (event) => {
        if (event.contact.ni.y > 0.5) {
            canJump = true;
        }
    });

    function update() {
        // Don't update camera position if it's repositioned by interaction handler
        if (interactionHandler && interactionHandler.isRepositioned()) {
            return;
        }

        const speed = 60;

        // Only use Y rotation (yaw) for movement, ignore pitch to maintain consistent speed
        euler.setFromQuaternion(camera.quaternion);
        euler.x = 0; // Remove pitch component
        euler.z = 0; // Remove roll component
        
        const moveDirection = new THREE.Vector3(inputVelocity.x, 0, inputVelocity.z);
        moveDirection.normalize().applyEuler(euler);

        playerBody.velocity.x = moveDirection.x * speed;
        playerBody.velocity.z = moveDirection.z * speed;

        camera.position.copy(playerBody.position);
        camera.position.y += 3; // Camera at top of player box (center + 3 = 8)
    }

    return { controls, update };
}
