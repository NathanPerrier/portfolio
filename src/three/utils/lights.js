import * as THREE from 'three';
import { quality } from '../../utils/quality.js';

export function addLights(scene) {
    const directionalLight = new THREE.DirectionalLight( 0x9FCBFF, 5 );
    directionalLight.position.set(30,20,30);
    directionalLight.castShadow = quality.shadows;
    directionalLight.shadow.bias = -0.001;
    directionalLight.shadow.normalBias = 0.02;
    directionalLight.shadow.mapSize.width = quality.shadowMapSize;
    directionalLight.shadow.mapSize.height = quality.shadowMapSize;
    scene.add( directionalLight );

    const directionalLight2 = new THREE.DirectionalLight( 0x9FCBFF, 5 );
    directionalLight2.position.set(-15,20,-15);
    directionalLight2.castShadow = quality.shadows;
    directionalLight2.shadow.bias = -0.001;
    directionalLight2.shadow.normalBias = 0.02;
    directionalLight2.shadow.mapSize.width = quality.shadowMapSize;
    directionalLight2.shadow.mapSize.height = quality.shadowMapSize;
    scene.add( directionalLight2 );

    const ambientLight1 = new THREE.AmbientLight(0xFF9839, 1.0); // Combined intensity of 0.5 + 0.5
    scene.add(ambientLight1);

    const ambientLight2 = new THREE.AmbientLight(0xFF4D26, 0.5); // Combined intensity of 0.25 + 0.25
    scene.add(ambientLight2);
}
