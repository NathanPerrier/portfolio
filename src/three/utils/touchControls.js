import * as THREE from 'three';

const LOOK_SPEED = 0.004; // radians per pixel of drag
const PITCH_LIMIT = Math.PI / 2 - 0.05;
const MOVE_SPEED = 45; // slightly slower than desktop (60) for thumb precision
const TAP_MAX_DISTANCE = 10; // px
const TAP_MAX_DURATION = 300; // ms

// Minimal stand-in for PointerLockControls: interactive.js only needs
// isLocked, enabled, lock(), unlock() and 'lock'/'unlock' events.
// Touch has no pointer lock, so "locked" simply means "free-roam steerable".
class TouchControlsShim extends THREE.EventDispatcher {
    constructor() {
        super();
        this.isLocked = true;
        this.enabled = true;
    }

    lock() {
        this.isLocked = true;
        this.dispatchEvent({ type: 'lock' });
    }

    unlock() {
        this.isLocked = false;
        this.dispatchEvent({ type: 'unlock' });
    }
}

export function createTouchControls(camera, renderer, playerBody, interactionHandler = null) {
    const controls = new TouchControlsShim();

    const joystickZone = document.getElementById('joystick-zone');
    const joystickThumb = document.getElementById('joystick-thumb');
    const joystickRadius = joystickZone ? joystickZone.offsetWidth / 2 : 50;

    const inputVelocity = new THREE.Vector3(); // analog, components in [-1, 1]
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    const moveEuler = new THREE.Euler(0, 0, 0, 'YXZ');
    const moveDirection = new THREE.Vector3();

    let joystickPointerId = null;
    let lookPointerId = null;
    let joyCenter = { x: 0, y: 0 };
    let lookLast = { x: 0, y: 0 };
    let tapStart = null;

    const isBusy = () => interactionHandler &&
        (interactionHandler.isRepositioned() || interactionHandler.isAnimating());

    const onPointerDown = (event) => {
        if (joystickZone && joystickZone.contains(event.target)) {
            if (joystickPointerId !== null) return;
            joystickPointerId = event.pointerId;
            const rect = joystickZone.getBoundingClientRect();
            joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        } else if (event.target === renderer.domElement && lookPointerId === null) {
            lookPointerId = event.pointerId;
            lookLast = { x: event.clientX, y: event.clientY };
            tapStart = { x: event.clientX, y: event.clientY, time: performance.now() };
        }
    };

    const onPointerMove = (event) => {
        if (event.pointerId === joystickPointerId) {
            const dx = event.clientX - joyCenter.x;
            const dy = event.clientY - joyCenter.y;
            const length = Math.hypot(dx, dy) || 1;
            const clamped = Math.min(length, joystickRadius);
            inputVelocity.x = (dx / length) * (clamped / joystickRadius);
            inputVelocity.z = (dy / length) * (clamped / joystickRadius);
            if (joystickThumb) {
                joystickThumb.style.transform =
                    `translate(${(dx / length) * clamped}px, ${(dy / length) * clamped}px)`;
            }
        } else if (event.pointerId === lookPointerId) {
            const dx = event.clientX - lookLast.x;
            const dy = event.clientY - lookLast.y;
            lookLast = { x: event.clientX, y: event.clientY };

            if (!controls.enabled || !controls.isLocked || isBusy()) return;

            euler.setFromQuaternion(camera.quaternion);
            euler.y -= dx * LOOK_SPEED;
            euler.x = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, euler.x - dy * LOOK_SPEED));
            euler.z = 0;
            camera.quaternion.setFromEuler(euler);
        }
    };

    const onPointerUp = (event) => {
        if (event.pointerId === joystickPointerId) {
            joystickPointerId = null;
            inputVelocity.set(0, 0, 0);
            if (joystickThumb) {
                joystickThumb.style.transform = 'translate(0, 0)';
            }
        } else if (event.pointerId === lookPointerId) {
            lookPointerId = null;
            if (tapStart) {
                const distance = Math.hypot(event.clientX - tapStart.x, event.clientY - tapStart.y);
                const duration = performance.now() - tapStart.time;
                tapStart = null;
                if (distance < TAP_MAX_DISTANCE && duration < TAP_MAX_DURATION &&
                    interactionHandler && interactionHandler.onTap) {
                    interactionHandler.onTap(
                        (event.clientX / window.innerWidth) * 2 - 1,
                        -(event.clientY / window.innerHeight) * 2 + 1
                    );
                }
            }
        }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);

    function update() {
        if (isBusy()) return;

        // No click-to-relock on touch: resume steering when controls re-enable
        if (controls.enabled && !controls.isLocked) {
            controls.lock();
        }
        if (!controls.enabled) return;

        // Yaw-only movement direction so speed is consistent regardless of pitch
        moveEuler.setFromQuaternion(camera.quaternion);
        moveEuler.x = 0;
        moveEuler.z = 0;
        moveDirection.set(inputVelocity.x, 0, inputVelocity.z).applyEuler(moveEuler);

        playerBody.velocity.x = moveDirection.x * MOVE_SPEED;
        playerBody.velocity.z = moveDirection.z * MOVE_SPEED;

        camera.position.copy(playerBody.position);
        camera.position.y += 3; // Camera at top of player box (center + 3 = 8)
    }

    function dispose() {
        window.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
    }

    return { controls, update, dispose };
}
