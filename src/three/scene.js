import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { addLights } from './utils/lights.js';
import { createControls } from './utils/controls.js';
import { initPhysics, createPlayerPhysics, createObjectPhysics, createDebugger } from './utils/physics.js';
import { createInteractionHandler } from './utils/interactive.js';
import { createOutline } from './utils/outline.js';
import { DistortionShader } from './utils/distortionShader.js';
import { ScanlineShader } from './utils/scanlineShader.js';

export function initScene() {
    const scene = new THREE.Scene();
    const world = initPhysics();
    const cannonDebugger = createDebugger(scene, world);

    addLights(scene);

    //! DEBUG
    // const gridHelper = new THREE.GridHelper(100, 50, 0x0000ff, 0x808080);
    // gridHelper.position.y = -0.01;
    // gridHelper.receiveShadow = true;
    // scene.add(gridHelper);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.lookAt(-15, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#bg'),
      antialias: true
    });

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure =  .45;

    renderer.setPixelRatio(window.devicePixelRatio);

    renderer.setSize(window.innerWidth, window.innerHeight);

    const loader = new GLTFLoader();
    const playerBody = createPlayerPhysics(world);
    const interactiveObjects = [];

    loader.load('/assets/3d/room/room.glb', function (gltf) {
      const model = gltf.scene;
      model.traverse(function (node) {
        if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;

            if (node.material.emissiveIntensity > 5) {
                console.log(node.material.emissive, node.material.emissiveIntensity);
            }
            
            createObjectPhysics(node, world);
        
            if (node.name.includes('_interactive')) {
                console.log('Interactive object found:', node.name.split('_interactive')[0]);
                interactiveObjects.push(node);
                
                createOutline(node);
            }
        }
        if (node.isLight) {
            node.castShadow = true;
            node.shadow.bias = -0.0005;
            node.shadow.mapSize.width = 1024;
            node.shadow.mapSize.height = 1024;
        }
      });
      scene.add(model);
    }, undefined, function (error) {
      console.error(error);
    });

    const { controls, update: updateControls } = createControls(camera, renderer, playerBody);
    const clock = new THREE.Clock();

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));

    const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), .2, 0.4, 0.85 );
    composer.addPass(bloomPass);

    const distortionPass = new ShaderPass(DistortionShader);
    distortionPass.uniforms['strength'].value = .165;
    composer.addPass(distortionPass);

    const scanlinePass = new ShaderPass(ScanlineShader);
    scanlinePass.renderToScreen = true;
    composer.addPass(scanlinePass);

    const interactionHandler = createInteractionHandler(camera, interactiveObjects);

    window.addEventListener('resize', onWindowResize, false);
    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsedTime = clock.getElapsedTime();
        world.step(1 / 60, delta, 3);
        updateControls(delta);
        
        // cannonDebugger.update();

        interactionHandler.update();

        scanlinePass.uniforms.time.value = elapsedTime;

        composer.render();
    }

    animate();
}
