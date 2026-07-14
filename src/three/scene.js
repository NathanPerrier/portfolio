import { CSS3DRenderer, CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { addLights } from './utils/lights.js';
import { createControls } from './utils/controls.js';
import { createTouchControls } from './utils/touchControls.js';
import { initPhysics, createPlayerPhysics, createObjectPhysics } from './utils/physics.js';
import { createInteractionHandler } from './utils/interactive.js';
import { createOutline } from './utils/outline.js';
import { createLoadingManager } from './utils/loading.js';
import { DistortionShader } from './utils/distortionShader.js';
import { ScanlineShader } from './utils/scanlineShader.js';
import { device } from '../utils/device.js';
import { quality } from '../utils/quality.js';
import { getAudioManager } from '../utils/AudioManager.js';
import { createAmbientParticles, updateAmbientParticles, disposeAmbientParticles } from './utils/ambientParticles.js';
import { analytics } from '../utils/analytics.js';
import { ArcadeScreenTexture } from './utils/arcadeScreenTexture.js';
import { TVGifTexture } from './utils/tvGifTexture.js';
import { ComputerTexture } from './utils/computerTexture.js';


export function initScene() {
    let hudManager = null;
    // A glTF mesh can contain several render primitives. Keep one logical
    // interaction per named object rather than treating every primitive as a
    // separate feature.
    const interactiveObjects = [];
    const audioManager = getAudioManager();
    const sceneAPI = {
        setHudManager: (manager) => {
            hudManager = manager;
            hudManager.setTotalInteractables(interactiveObjects.length);
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
                antialias: quality.antialias,
                alpha: true,
                powerPreference: "high-performance",
                failIfMajorPerformanceCaveat: false
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
                    failIfMajorPerformanceCaveat: false
                });
            } catch (fallbackError) {
                throw new Error('Failed to create WebGL context. Please ensure your browser supports WebGL and hardware acceleration is enabled.');
            }
        }
        renderer.setClearColor(0x000000, 0);
        updateLoadingText('Renderer created.');

        renderer.shadowMap.enabled = quality.shadows;
        renderer.shadowMap.type = THREE.PCFShadowMap; // Less expensive than PCFSoftShadowMap
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = quality.exposure;

        // Limit pixel ratio for performance
        const pixelRatio = Math.min(window.devicePixelRatio, quality.pixelRatioCap);
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

        // KTX2 textures transcode to the GPU-native format per device
        const ktx2Loader = new KTX2Loader()
            .setTranscoderPath(import.meta.env.BASE_URL + 'basis/')
            .detectSupport(renderer);
        loader.setKTX2Loader(ktx2Loader);

        // DRACO geometry, decoded locally (no CDN dependency)
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath(import.meta.env.BASE_URL + 'draco/');
        loader.setDRACOLoader(dracoLoader);

        updateLoadingText('Asset loader created.');

        // Load sound effects
        audioManager.loadEffectSounds()
            .then(() => {
                updateLoadingText('Sound effects loaded.');
            })
            // loadAudioAsync() already reports the failure; avoid creating an
            // additional unhandled rejection from this status update.
            .catch(() => {});

        const playerBody = createPlayerPhysics(world);  
        updateLoadingText('Player physics body created.');

        updateLoadingText('This may take a moment...'); 

        let ambientParticles = null;
        const arcadeScreen = new ArcadeScreenTexture();
        const tvScreen = new TVGifTexture();
        const computerTerminalScreen = new ComputerTexture({ 
            src: import.meta.env.BASE_URL + 'terminal/index.html',
            enableKeyboard: true,
            placeholderText: 'TERMINAL READY',
        });
        const computerWebsiteScreen = new ComputerTexture({
            src: import.meta.env.BASE_URL + 'portfolio/index.html',
            enableKeyboard: false,
            enableMouse: true,
            placeholderText: 'PROJECTS',
            screenWidth: 1.6,
            screenHeight: 1.5,
            screenPosition: { x: 0, y: 0.075, z: .9 },
        });

        let assetsLoaded = false;
        let roomInitialized = false;
        let firstFrameRendered = false;
        let initializationComplete = false;

        const finishInitialization = () => {
            if (
                initializationComplete ||
                !assetsLoaded ||
                !roomInitialized ||
                !firstFrameRendered
            ) {
                return;
            }

            initializationComplete = true;
            updateLoadingText('Room ready.');
            loadingText.style.display = 'none';
            loadingScreen.style.display = 'none';

            if (hudManager) {
                hudManager.setTotalInteractables(interactiveObjects.length);
            }

            // Start radio audio in the background (non-blocking).
            setTimeout(() => {
                const radioObject = interactiveObjects.find(obj =>
                    obj.userData.interactionId === 'radio_interactive'
                );
                if (radioObject) {
                    audioManager.createRadioAudio(radioObject);
                }
            }, 1000);

            resolve(sceneAPI);
        };

        loadingManager.onLoad = () => {
            // A LoadingManager reports fetch/decode completion, which can
            // precede our scene traversal, collider construction and shader
            // compilation. Keep the loading UI until the room has rendered.
            assetsLoaded = true;
            updateLoadingText('Assets decoded. Preparing the room...');
            finishInitialization();
        };

        loader.load(import.meta.env.BASE_URL + 'assets/3d/room/room.ktx2.glb', function (gltf) {
          const model = gltf.scene;
          const logicalInteractables = new Map();

          const getInteractionId = (name = '') => {
            const match = name.match(/^(.*_interactive)(?:_\d+)?$/i);
            return match ? match[1] : null;
          };

          const getInteractionRoot = (node, interactionId) => {
            let root = node;
            let parent = node.parent;

            // GLTFLoader wraps multi-primitive meshes in one or more groups
            // with the original node name. Use the outermost matching group so
            // every primitive resolves to the same logical object.
            while (parent && getInteractionId(parent.name) === interactionId) {
                root = parent;
                parent = parent.parent;
            }

            return root;
          };

          const createInteractionOutlines = (object) => {
            const meshes = [];
            object.traverse((child) => {
              if (child.isMesh && !child.userData.isInteractionOutline) {
                meshes.push(child);
              }
            });

            object.userData.outlines = meshes
              .map((mesh) => createOutline(mesh))
              .filter(Boolean);
          };

          const initializeInteraction = (interactionId, object) => {
            object.userData.interactionId = interactionId;
            object.traverse((child) => {
              if (child.isMesh) {
                child.userData.interactionRoot = object;
              }
            });

            // Initialize each feature once per logical interactable.
            if (interactionId === 'arcade_interactive') {
              arcadeScreen.init(object);
              object.userData.arcadeScreen = arcadeScreen;
              updateLoadingText('Arcade screen initialized.');
            }

            if (interactionId === 'tv_interactive') {
              tvScreen.init(object);
              object.userData.tvScreen = tvScreen;
              updateLoadingText('TV screen initialized.');
            }

            if (interactionId === 'computerTerminal_interactive') {
              computerTerminalScreen.init(object);
              object.userData.computerTerminalScreen = computerTerminalScreen;
              updateLoadingText('Computer terminal screen initialized.');
            }

            if (interactionId === 'computerWebsite_interactive') {
              computerWebsiteScreen.init(object);
              object.userData.websiteScreen = computerWebsiteScreen;
              updateLoadingText('Computer website screen initialized.');
            }

            createInteractionOutlines(object);
            interactiveObjects.push(object);
          };

          model.traverse(function (node) {
            if (node.isMesh) {
                node.castShadow = quality.shadows;
                node.receiveShadow = quality.shadows;

                // KTX2 textures ship with mipmaps; only anisotropy needs tuning
                if (node.material && node.material.map) {
                    node.material.map.anisotropy = Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy());
                    node.material.map.needsUpdate = true;
                }
                
                // Enable frustum culling for all meshes
                node.frustumCulled = true;

                createObjectPhysics(node, world);
            
                const interactionId = getInteractionId(node.name);
                if (interactionId && !logicalInteractables.has(interactionId)) {
                    logicalInteractables.set(
                        interactionId,
                        getInteractionRoot(node, interactionId)
                    );
                }
            }
            if (node.isLight) {
                node.castShadow = quality.shadows;
                node.shadow.bias = -0.0005;
                node.shadow.mapSize.width = quality.shadowMapSize;
                node.shadow.mapSize.height = quality.shadowMapSize;
            }
          });
          scene.add(model);
          logicalInteractables.forEach((object, interactionId) => {
            initializeInteraction(interactionId, object);
          });
          ambientParticles = createAmbientParticles(scene);

          const finishRoomSetup = () => {
            ktx2Loader.dispose(); // Free transcoder workers once textures are decoded
            dracoLoader.dispose();
            roomInitialized = true;
            updateLoadingText('Room initialized. Rendering first frame...');
            requestAnimationFrame(() => {
              firstFrameRendered = true;
              finishInitialization();
            });
          };

          // compile() only queues shader compilation on browsers that support
          // parallel compilation. Await it so visitors never see a blank room
          // after the loading screen disappears.
          updateLoadingText('Compiling room materials...');
          renderer.compileAsync(scene, camera)
            .then(finishRoomSetup)
            .catch((compileError) => {
              console.warn('Room material precompile failed; rendering normally.', compileError);
              finishRoomSetup();
            });
          
        }, undefined, function (error) {
          console.error(error);
          reject(error);
        });

        const clock = new THREE.Clock();

        const composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));

        if (quality.bloom) {
            // Reduce bloom resolution for better performance
            const bloomResolution = new THREE.Vector2(
                window.innerWidth / 2,  // Half resolution
                window.innerHeight / 2
            );
            const bloomPass = new UnrealBloomPass(bloomResolution, 0.25, 0.4, 0.85);
            composer.addPass(bloomPass);
        }

        if (quality.distortion) {
            const distortionPass = new ShaderPass(DistortionShader);
            distortionPass.uniforms['strength'].value = .165;
            composer.addPass(distortionPass);
        }

        let scanlinePass = null;
        if (quality.scanlines) {
            scanlinePass = new ShaderPass(ScanlineShader);
            scanlinePass.renderToScreen = true;
            composer.addPass(scanlinePass);
        }

        // Create interaction handler first
        const interactionHandler = createInteractionHandler(camera, interactiveObjects, null, audioManager, renderer);
        
        // Create controls with interaction handler (touch devices get joystick + drag-look)
        const { controls, update: updateControls } = device.isTouchPrimary
            ? createTouchControls(camera, renderer, playerBody, interactionHandler)
            : createControls(camera, renderer, playerBody, interactiveObjects, interactionHandler);
        
        // Update interaction handler with controls and renderer reference
        interactionHandler.setControls(controls);
        interactionHandler.setRenderer(renderer);
        
        // Count interactive objects and notify HUD manager
        if (hudManager) {
            hudManager.setTotalInteractables(interactiveObjects.length);
        }

        // Touch devices interact via tap raycasts in touchControls instead
        window.addEventListener('click', () => {
            if (!device.isTouchPrimary) {
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
            

            interactionHandler.update();
            updateAmbientParticles(ambientParticles);

            if (scanlinePass) {
                scanlinePass.uniforms.time.value = elapsedTime;
            }

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
