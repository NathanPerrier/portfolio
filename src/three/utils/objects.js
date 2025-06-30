import * as THREE from 'three';

export const objectConfigurations = {
  computerTerminal_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
  computerWebsite_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
  whiteBoard_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
  arcade_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
  tv_interactive: {
    czoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 100, -100.5)
  },
  github_interactive: {
    action: () => window.open('https://github.com/nathanperrier', '_blank'),
  },
  linkedin_interactive: {
    action: () => window.open('https://www.linkedin.com/in/nathan-perrier23/', '_blank'),
  },
  radio_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
  waypoint_interactive: {
    zoomPosition: new THREE.Vector3(-4, 1, -1.5),
    lookAtPosition: new THREE.Vector3(-6, 1, -1.5)
  },
};
