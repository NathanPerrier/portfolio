import * as CANNON from 'cannon-es';
import * as THREE from 'three';
import { quality } from '../../utils/quality.js';

export function initPhysics() {
    const world = new CANNON.World({
        gravity: new CANNON.Vec3(0, -9.82, 0),
    });

    // Optimize physics performance
    world.broadphase = new CANNON.SAPBroadphase(world);
    world.solver.iterations = quality.physicsIterations; // Reduced from default 10
    world.defaultContactMaterial.contactEquationStiffness = 1e6;
    world.defaultContactMaterial.contactEquationRelaxation = 3;

    const groundBody = new CANNON.Body({
        type: CANNON.Body.STATIC,
        shape: new CANNON.Plane(),
    });
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
    world.addBody(groundBody);

    return world;
}

export function createPlayerPhysics(world) {
    const playerHeight = 9;
    const playerShape = new CANNON.Cylinder(0.5, 0.5, playerHeight, 16);
    const playerBody = new CANNON.Body({
        mass: 5,
        // Start on the ground rather than letting the initial frame drop the
        // camera through the ceiling-height of the room.
        position: new CANNON.Vec3(7.5, playerHeight / 2 + 0.1, 7.5),
        shape: playerShape,
        fixedRotation: true,
        angularDamping: 1.0
    });
    playerBody.linearDamping = 0.1;
    world.addBody(playerBody);
    return playerBody;
}

export function createObjectPhysics(mesh, world) {
    if (!mesh.geometry || /floor/i.test(mesh.name)) return null;

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
    size.multiply(worldScale).set(
        Math.abs(size.x),
        Math.abs(size.y),
        Math.abs(size.z)
    );

    // Cannon boxes need strictly positive half-extents. Decorative planes and
    // meshes with a collapsed scale cannot provide a useful collider anyway.
    const minimumExtent = 0.001;
    if (size.x <= minimumExtent || size.y <= minimumExtent || size.z <= minimumExtent) {
        return null;
    }

    // Some exported room meshes are one large shell around the whole scene.
    // Treating those as solid boxes traps (and can launch) the player inside
    // them. The ground plane and the remaining architectural colliders cover
    // normal movement, while aggregate meshes are intentionally ignored.
    const maximumStaticColliderVolume = 500;
    if (size.x * size.y * size.z > maximumStaticColliderVolume) {
        return null;
    }

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
