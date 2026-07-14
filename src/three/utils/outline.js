import * as THREE from 'three';

const outline_width = 0.05; 

export function createOutline(object) {
    if (!object?.geometry || object.userData.outline) return object?.userData.outline;

    const outline = new THREE.Mesh(object.geometry, new THREE.MeshBasicMaterial({ color: 'white', side: THREE.BackSide }));
    outline.scale.multiplyScalar((1 + outline_width)); 
    outline.visible = false;
    outline.raycast = () => {};
    outline.userData.isInteractionOutline = true;
    object.add(outline);
    object.userData.outline = outline;
    return outline;
}
