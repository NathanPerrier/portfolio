import * as THREE from 'three';

//adjust y for height

export const objectProperties = {
  'computerTerminal_interactive': {
    zoomPosition: new THREE.Vector3(-3.221266505960557, 6.331478322759962, -2.822122359189063), //6.731478322759962
    lookAtPosition: new THREE.Vector3(-0.5323153475130797, -0.6295702822111388, -0.5659342988003256),
    action: () => {
      console.log('Computer terminal action!');
    }

  },
  'computerWebsite_interactive': {
    zoomPosition: new THREE.Vector3(-6.4, 2.5, -1.5),
    action: () => {
      console.log('Computer website action!');
    }

  },
  'whiteBoard_interactive': {
    zoomPosition: new THREE.Vector3(-6.4, 2.5, -1.5),
    action: () => {
      console.log('Whiteboard action!');
    }

  },
  'arcade_interactive': {
    zoomPosition: new THREE.Vector3(-6.4, 2.5, -1.5),
    action: () => {
      console.log('Arcade action!');
    }
  },
  'tv_interactive': {
    zoomPosition: new THREE.Vector3(-6.4, 2.5, -1.5),
    action: () => {
      console.log('TV action!');
    }
  },
  'github_interactive': {
    action: () => window.open('https://github.com/nathanperrier', '_blank'),
  },
  'linkedin_interactive': {
    action: () => window.open('https://www.linkedin.com/in/nathan-perrier23/', '_blank'),
  },
  'radio_interactive': {
    zoomPosition: new THREE.Vector3(-6.4, 2.5, -1.5),
    action: () => {
      console.log('Radio action!');
    }
  },
  'waypoint_interactive': {
    action: () => {
      const waypoint = document.querySelector('.waypoint');
      if (waypoint) {
        waypoint.scrollIntoView({ behavior: 'smooth' });
      }
    }
  },
};
