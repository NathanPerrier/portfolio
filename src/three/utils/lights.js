import * as THREE from 'three';

export function addLights(scene) {
    const directionalLight = new THREE.DirectionalLight( 0x9FCBFF, 5 );
    directionalLight.position.set(30,20,30);
    directionalLight.castShadow = true;
    scene.add( directionalLight );

    const directionalLight2 = new THREE.DirectionalLight( 0x9FCBFF, 5 );
    directionalLight2.position.set(-15,20,-15);
    directionalLight2.castShadow = true;
    scene.add( directionalLight2 );

    // Ambient lights provide general illumination and do not cast shadows.
    // Multiple ambient lights are redundant; their colors and intensities are simply combined.
    // Here, we are creating two distinct ambient lights based on the original code's colors.
    const ambientLight1 = new THREE.AmbientLight(0xFF9839, 1.0); // Combined intensity of 0.5 + 0.5
    scene.add(ambientLight1);

    const ambientLight2 = new THREE.AmbientLight(0xFF4D26, 0.5); // Combined intensity of 0.25 + 0.25
    scene.add(ambientLight2);
}
