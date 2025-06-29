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
    const playerShape = new CANNON.Sphere(0.5);
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

    if (mesh.geometry && mesh.geometry.attributes.position && mesh.geometry.index) {
        const geometry = mesh.geometry;
        const vertices = [...geometry.attributes.position.array];
        const indices = geometry.index.array;

        const worldScale = new THREE.Vector3();
        mesh.getWorldScale(worldScale);

        if (worldScale.x !== 1 || worldScale.y !== 1 || worldScale.z !== 1) {
            for (let i = 0; i < vertices.length; i += 3) {
                vertices[i] *= worldScale.x;
                vertices[i + 1] *= worldScale.y;
                vertices[i + 2] *= worldScale.z;
            }
        }

        const shape = new CANNON.Trimesh(vertices, indices);

        const worldPosition = new THREE.Vector3();
        mesh.getWorldPosition(worldPosition);
        const worldQuaternion = new THREE.Quaternion();
        mesh.getWorldQuaternion(worldQuaternion);

        const body = new CANNON.Body({
            mass: 0, // Static
            shape: shape,
            position: new CANNON.Vec3().copy(worldPosition),
            quaternion: new CANNON.Quaternion().copy(worldQuaternion),
        });

        world.addBody(body);
        return body;
    }

    // Fallback to original Box logic
    if (!mesh.geometry.boundingBox) {
        mesh.geometry.computeBoundingBox();
    }

    const size = new THREE.Vector3();
    mesh.geometry.boundingBox.getSize(size);

    const worldScale = new THREE.Vector3();
    mesh.getWorldScale(worldScale);
    size.multiply(worldScale);

    const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
    const shape = new CANNON.Box(halfExtents);

    const worldPosition = new THREE.Vector3();
    mesh.getWorldPosition(worldPosition);
    const worldQuaternion = new THREE.Quaternion();
    mesh.getWorldQuaternion(worldQuaternion);

    const centerOffset = new THREE.Vector3();
    mesh.geometry.boundingBox.getCenter(centerOffset);

    centerOffset.multiply(worldScale);
    centerOffset.applyQuaternion(worldQuaternion);

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
