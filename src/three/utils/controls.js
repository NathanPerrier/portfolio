import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

export function createControls(camera, renderer, playerBody) {
    const controls = new PointerLockControls(camera, renderer.domElement);
    controls.pointerSpeed = 1.5;

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
        const speed = 60;

        euler.setFromQuaternion(camera.quaternion);
        const moveDirection = new THREE.Vector3(inputVelocity.x, 0, inputVelocity.z);
        moveDirection.normalize().applyEuler(euler);

        playerBody.velocity.x = moveDirection.x * speed;
        playerBody.velocity.z = moveDirection.z * speed;

        camera.position.copy(playerBody.position);
        camera.position.y += 3; // Adjust this value to set the camera height
    }

    return { controls, update };
}
