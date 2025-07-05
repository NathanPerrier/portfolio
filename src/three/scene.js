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
import { analytics } from '../utils/analytics.js';
import { ArcadeScreenTexture } from './utils/arcadeScreenTexture.js';
import { TVGifTexture } from './utils/tvGifTexture.js';
import { ComputerTexture } from './utils/computerTexture.js';


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

        // Check WebGL support before proceeding
        const canvas = document.querySelector('#bg');
        if (!canvas) {
            reject(new Error('Canvas element not found'));
            return;
        }

        // Test WebGL capabilities
        const testCanvas = document.createElement('canvas');
        const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
        if (!gl) {
            reject(new Error('WebGL is not supported in your browser. Please ensure hardware acceleration is enabled.'));
            return;
        }
        updateLoadingText('WebGL support verified.');

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

        // Try to create WebGL renderer with fallback options for Windows compatibility
        let renderer;
        try {
            renderer = new THREE.WebGLRenderer({
                canvas: document.querySelector('#bg'),
                antialias: true,
                alpha: true,
                powerPreference: "high-performance",
                failIfMajorPerformanceCaveat: false,
                preserveDrawingBuffer: true
            });
        } catch (error) {
            console.error('Failed to create WebGL renderer with antialiasing:', error);
            // Try without antialiasing
            try {
                renderer = new THREE.WebGLRenderer({
                    canvas: document.querySelector('#bg'),
                    antialias: false,
                    alpha: true,
                    powerPreference: "high-performance",
                    failIfMajorPerformanceCaveat: false,
                    preserveDrawingBuffer: true
                });
            } catch (fallbackError) {
                throw new Error('Failed to create WebGL context. Please ensure your browser supports WebGL and hardware acceleration is enabled.');
            }
        }
        renderer.setClearColor(0x000000, 0);
        updateLoadingText('Renderer created.');

        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFShadowMap; // Less expensive than PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure =  .45;

        // Limit pixel ratio to 2 for performance
        const pixelRatio = Math.min(window.devicePixelRatio, 2);
        renderer.setPixelRatio(pixelRatio);

        renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Create CSS3D renderer
        const css3dRenderer = new CSS3DRenderer();
        css3dRenderer.setSize(window.innerWidth, window.innerHeight);
        css3dRenderer.domElement.style.position = 'absolute';
        css3dRenderer.domElement.style.top = '0';
        css3dRenderer.domElement.style.pointerEvents = 'none';
        css3dRenderer.domElement.style.zIndex = '0';
        document.getElementById('css-renderer').appendChild(css3dRenderer.domElement);
        updateLoadingText('CSS3D renderer created.');

        const loader = new GLTFLoader(loadingManager);
        updateLoadingText('Asset loader created.');
        
        // Load sound effects
        audioManager.loadEffectSounds().then(() => {
            updateLoadingText('Sound effects loaded.');
        });

        const playerBody = createPlayerPhysics(world);
        updateLoadingText('Player physics body created.');

        const interactiveObjects = [];
        const arcadeScreen = new ArcadeScreenTexture();
        const tvScreen = new TVGifTexture();
        const computerTerminalScreen = new ComputerTexture({ 
            src: import.meta.env.BASE_URL + 'terminal/index.html',
            enableKeyboard: true,
            emissiveColor: 0x00ff00,
            emissiveIntensity: 15
        });
        const computerWebsiteScreen = new ComputerTexture({
            src: import.meta.env.BASE_URL + 'portfolio/index.html',
            enableKeyboard: false,
            enableMouse: true,
            emissiveColor: 0x00ff00,
            emissiveIntensity: 15,
            screenWidth: 1.6,
            screenHeight: 1.5,
            screenPosition: { x: 0, y: 0.075, z: .9 },
        });

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
                    audioManager.createRadioAudio(radioObject);
                } 
            }, 1000);
            
            resolve(sceneAPI);
        };

        loader.load(import.meta.env.BASE_URL + 'assets/3d/room/room.glb', function (gltf) {
          const model = gltf.scene;
          model.traverse(function (node) {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
                
                if (node.material && node.material.map) {
                    node.material.map.minFilter = THREE.LinearMipmapLinearFilter;
                    node.material.map.generateMipmaps = true;
                    // Limit anisotropy for performance
                    node.material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
                    node.material.map.needsUpdate = true;
                }
                
                // Enable frustum culling for all meshes
                node.frustumCulled = true;

                createObjectPhysics(node, world);
            
                if (node.name.includes('_interactive')) {
                    interactiveObjects.push(node);
                    
                    createOutline(node);
                    
                    // Check if this is the radio object and attach positional audio
                    if (node.name.toLowerCase().includes('radio_interactive_2')) {
                        audioManager.createRadioAudio(node)
                    }
                    
                    // Initialize arcade screen for arcade object
                    if (node.name.toLowerCase().includes('arcade_interactive')) {
                        arcadeScreen.init(node);
                        node.userData.arcadeScreen = arcadeScreen;
                        updateLoadingText('Arcade screen initialized.');
                    }
                    
                    // Initialize TV screen for TV object
                    if (node.name.toLowerCase().includes('tv_interactive')) {
                        tvScreen.init(node);
                        node.userData.tvScreen = tvScreen;
                        updateLoadingText('TV screen initialized.');
                    }
                    
                    // // Initialize computer terminal screen
                    if (node.name.toLowerCase().includes('computerterminal_interactive')) {
                        computerTerminalScreen.init(node);
                        node.userData.computerTerminalScreen = computerTerminalScreen;
                        updateLoadingText('Computer terminal screen initialized.');
                        // Don't start rendering immediately
                        computerTerminalScreen.hide();
                    }

                    if (node.name.toLowerCase().includes('computerwebsite_interactive')) {
                        computerWebsiteScreen.init(node);
                        node.userData.websiteScreen = computerWebsiteScreen;
                        updateLoadingText('Computer website screen initialized.');
                        // Don't start rendering immediately
                        computerWebsiteScreen.hide();
                    }
                }
            }
            if (node.isLight) {
                node.castShadow = true;
                node.shadow.bias = -0.0005;
                node.shadow.mapSize.width = 512; // Reduced from 1024
                node.shadow.mapSize.height = 512; // Reduced from 1024
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

        // Reduce bloom resolution for better performance
        const bloomResolution = new THREE.Vector2(
            window.innerWidth / 2,  // Half resolution
            window.innerHeight / 2
        );
        const bloomPass = new UnrealBloomPass(bloomResolution, .2, 0.4, 0.85);
        composer.addPass(bloomPass);

        // Optional: disable distortion for performance
        const enableDistortion = !device.isMobile; // Disable on mobile
        if (enableDistortion) {
            const distortionPass = new ShaderPass(DistortionShader);
            distortionPass.uniforms['strength'].value = .165;
            composer.addPass(distortionPass);
        }

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
            const objectName = event.detail.objectName;
            
            // Track the interaction in analytics
            analytics.trackInteraction(objectName);
            
            if (hudManager) {
                hudManager.addInteraction(objectName);
            }
        });
        
        // Listen for HUD navigation events
        window.addEventListener('hud-nav-click', (event) => {
            const target = event.detail.target;
            
            // Track navigation button click
            analytics.trackNavigationButton(target);
            
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
            css3dRenderer.setSize(window.innerWidth, window.innerHeight);
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

            interactionHandler.update();

            scanlinePass.uniforms.time.value = elapsedTime;

            composer.render();
            css3dRenderer.render(scene, camera);
            
            // Update screens that have update methods
            if (arcadeScreen && arcadeScreen.update) arcadeScreen.update();
            if (computerTerminalScreen && computerTerminalScreen.update) computerTerminalScreen.update();
            if (computerWebsiteScreen && computerWebsiteScreen.update) computerWebsiteScreen.update();
        }

        animate();
    });
    
    return initPromise;
}
