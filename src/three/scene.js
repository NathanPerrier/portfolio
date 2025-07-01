import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
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
import { createLoadingManager } from './utils/loading.js';
import { DistortionShader } from './utils/distortionShader.js';
import { ScanlineShader } from './utils/scanlineShader.js';
import { device } from '../utils/device.js';
import { getAudioManager } from '../utils/AudioManager.js';

export function initScene() {
    let hudManager = null;
    const audioManager = getAudioManager();
    const sceneAPI = {
        setHudManager: (manager) => {
            hudManager = manager;
        }
    };
    
    const initPromise = new Promise((resolve, reject) => {
        const loadingScreen = document.getElementById('loading-screen');
        const loadingText = document.getElementById('loading-text');
        const { loadingManager, updateLoadingText } = createLoadingManager(loadingText);

        updateLoadingText('Initializing scene...');

        const scene = new THREE.Scene();
        updateLoadingText('Scene created.');

        const world = initPhysics();
        updateLoadingText('Physics world created.');

        const cannonDebugger = createDebugger(scene, world);
        updateLoadingText('Physics debugger created.');

        addLights(scene);
        updateLoadingText('Lights added.');

        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.lookAt(-15, 0, 0);
        updateLoadingText('Camera created.');
        
        // Attach audio listener to camera
        audioManager.setCamera(camera);
        updateLoadingText('Audio system initialized.');

        const renderer = new THREE.WebGLRenderer({
          canvas: document.querySelector('#bg'),
          antialias: true,
          alpha: true
        });
        renderer.setClearColor(0x000000, 0);
        updateLoadingText('Renderer created.');

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure =  .45;

        renderer.setPixelRatio(window.devicePixelRatio);

        renderer.setSize(window.innerWidth, window.innerHeight);

        const loader = new GLTFLoader(loadingManager);
        updateLoadingText('Asset loader created.');
        
        // Load sound effects
        audioManager.loadEffectSounds().then(() => {
            updateLoadingText('Sound effects loaded.');
        });

        const playerBody = createPlayerPhysics(world);
        updateLoadingText('Player physics body created.');

        const interactiveObjects = [];

        loadingManager.onLoad = () => {
            updateLoadingText('All assets loaded.');

            loadingText.style.display = 'none';
            loadingScreen.style.display = 'none';

            if (hudManager) {
                hudManager.setTotalInteractables(interactiveObjects.length);
            }
            
            // Start radio audio in background (non-blocking) - only for radio_interactive_2
            setTimeout(() => {
                const allRadios = interactiveObjects.filter(obj => 
                    obj.name.toLowerCase().includes('radio_interactive')
                );
                console.log('Found radio objects:', allRadios.map(r => r.name));
                
                // Try radio_interactive_2 first, then radio_interactive_1 if not found
                let radioObject = interactiveObjects.find(obj => 
                    obj.name.toLowerCase().includes('radio_interactive_2')
                );
                
                if (!radioObject) {
                    radioObject = interactiveObjects.find(obj => 
                        obj.name.toLowerCase().includes('radio_interactive_1')
                    );
                }
                
                if (radioObject) {
                    console.log('Setting up audio for:', radioObject.name);
                    audioManager.createRadioAudio(radioObject);
                } else {
                    console.log('No radio object found. Available objects:', 
                        interactiveObjects.map(obj => obj.name));
                }
            }, 1000);
            
            resolve(sceneAPI);
        };

        loader.load('/assets/3d/room/room.glb', function (gltf) {
          const model = gltf.scene;
          model.traverse(function (node) {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                if (node.material && node.material.map) {
                    node.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                    node.material.map.generateMipmaps = true;
                    node.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                    node.material.map.needsUpdate = true;
                }

                createObjectPhysics(node, world);
            
                if (node.name.includes('_interactive')) {
                    interactiveObjects.push(node);
                    
                    createOutline(node);
                    
                    // Check if this is the radio object and attach positional audio
                    if (node.name.toLowerCase().includes('radio_interactive_2')) {
                        audioManager.createRadioAudio(node).then(() => {
                            console.log('Radio audio attached to:', node.name);
                        });
                    }
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
          renderer.compile(scene, camera);
          updateLoadingText('Room loaded.');
          
        }, undefined, function (error) {
          console.error(error);
          reject(error);
        });

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

        // Create interaction handler first
        const interactionHandler = createInteractionHandler(camera, interactiveObjects, null, audioManager);
        
        // Create controls with interaction handler
        const { controls, update: updateControls } = createControls(camera, renderer, playerBody, interactiveObjects, interactionHandler);
        
        // Update interaction handler with controls reference
        interactionHandler.setControls(controls);
        
        // Count interactive objects and notify HUD manager
        if (hudManager) {
            hudManager.setTotalInteractables(interactiveObjects.length);
        }

        window.addEventListener('click', () => {
            if (!device.isTouchOnly) {
                interactionHandler.onClick();
            }
        });
        
        // Listen for object interaction events from the interaction handler
        window.addEventListener('object-interacted', (event) => {
            if (hudManager) {
                hudManager.addInteraction(event.detail.objectName);
            }
        });
        
        // Listen for HUD navigation events
        window.addEventListener('hud-nav-click', (event) => {
            const target = event.detail.target;
            console.log(`Navigation clicked: ${target}`);
            
            // Handle navigation based on target
            switch(target) {
                case 'terminal':
                    // Navigate to terminal object or open terminal UI
                    const terminalObject = interactiveObjects.find(obj => 
                        obj.name.toLowerCase().includes('computerterminal')
                    );
                    if (terminalObject) {
                        interactionHandler.navigateToObject(terminalObject);
                    }
                    break;
                    
                case 'projects':
                    // Navigate to projects display or portfolio items
                    const projectsObject = interactiveObjects.find(obj => 
                        obj.name.toLowerCase().includes('computerwebsite')
                    );
                    if (projectsObject) {
                        interactionHandler.navigateToObject(projectsObject);
                    }
                    break;
                    
                case 'arcade':
                    // Navigate to arcade machine or games
                    const arcadeObject = interactiveObjects.find(obj => 
                        obj.name.toLowerCase().includes('arcade')
                    );
                    if (arcadeObject) {
                        interactionHandler.navigateToObject(arcadeObject);
                    }
                    break;
            }
        });

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
            

            //* DEBUG FUNCTIONALITY
            // cannonDebugger.update();

            // console.log('Camera position:', camera.position);
            // console.log('Camera lookAt:', camera.getWorldDirection(new THREE.Vector3()));

            interactionHandler.update();

            scanlinePass.uniforms.time.value = elapsedTime;

            composer.render();
        }

        animate();
    });
    
    return initPromise;
}
