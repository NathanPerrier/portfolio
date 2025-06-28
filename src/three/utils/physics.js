import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import CannonDebugger from 'cannon-es-debugger';

export function initPhysics() {
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    const groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    return world;
}

export function createPlayerPhysics(world) {
    const playerShape = new CANNON.Cylinder(0.5, 0.5, 8, 16); // Increased height to 8
    const playerBody = new CANNON.Body({
        mass: 5,
        position: new CANNON.Vec3(7.5, 5, 7.5), // Adjusted position for new height
        shape: playerShape,
        fixedRotation: true,
        angularDamping: 1.0
    });
    playerBody.linearDamping = 0.1;
    world.addBody(playerBody);
    return playerBody;
}

export function createObjectPhysics(mesh, world) {
    if (mesh.name.includes('Floor')) return;

    // Ensure the geometry has a bounding box.
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }

    // Get the size of the geometry's bounding box.
    const size = new THREE.Vector3();
    mesh.geometry.boundingBox.getSize(size);

    // Apply the mesh's scale to the size.
    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);
    size.multiply(worldScale);

    // Create the Cannon.js shape with the correct size.
    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    // Get the world position and quaternion of the mesh.
    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    const worldQuaternion = new THREE.Quaternion();
    mesh.getWorldQuaternion(worldQuaternion);

    // Calculate the offset of the geometry's center from the mesh's origin (pivot point).
    const centerOffset = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(centerOffset);

    // Apply the mesh's scale and rotation to the offset.
    centerOffset.multiply(worldScale);
    centerOffset.applyQuaternion(worldQuaternion);

    // Add the transformed offset to the mesh's world position to get the body's final position.
    worldPosition.add(centerOffset);

    const body = new CANNON.Body({
        mass: 0, // Static
        shape: shape,
        position: new CANNON.Vec3().copy(worldPosition),
        quaternion: new CANNON.Quaternion().copy(worldQuaternion),
    });

    world.addBody(body);
    return body;
}

export function createDebugger(scene, world) {
    return CannonDebugger(scene, world, {});
}
