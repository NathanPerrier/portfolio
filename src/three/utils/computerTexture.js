import * as THREE from 'three';
import { device } from '../../utils/device.js';

let html2canvasPromise;
// `Symbol.for` intentionally survives a Vite module replacement. The mouse
// input overlay is a shared DOM node, while ComputerTexture instances can be
// recreated during a scene/HMR restart.
const MOUSE_INPUT_OWNER = Symbol.for('portfolio.computerTexture.mouseInputOwner');

function loadHtml2Canvas() {
    if (!html2canvasPromise) {
        html2canvasPromise = import('html2canvas').then(({ default: html2canvas }) => html2canvas);
    }

    return html2canvasPromise;
}

export class ComputerTexture {
    constructor(config = {}) {
        // Default configuration
        this.config = {
            src: config.src || '/terminal/index.html',
            width: config.width || 1024,
            height: config.height || 768,
            screenWidth: config.screenWidth || 1.9,
            screenHeight: config.screenHeight || 1.65,
            screenPosition: config.screenPosition || { x: 0, y: 0.7, z: 1 },
            enableKeyboard: config.enableKeyboard || false,
            enableMouse: config.enableMouse || false,
            backgroundColor: config.backgroundColor || '#000',
            iframeTitle: config.iframeTitle || 'Off-screen computer screen content',
            placeholderText: config.placeholderText || 'CLICK TO OPEN'
        };
        
        this.canvas = null;
        this.texture = null;
        this.material = null;
        this.screenMesh = null;
        this.isActive = false;
        this.iframeLoaded = false;
        this.iframe = null;
        this.updateInterval = null;
        this.previewInterval = null;
        this.inputProxy = null;
        this.isInputActive = false;
        this.isMouseActive = false;
        this.mouseOverlay = null;
        this.mouseContainer = null;
        this.mouseInputController = null;
        this.mouseScrollProxy = null;
        this.lastMouseScrollTop = 0;
        this.iframeScrollTarget = null;
        this.iframeResizeObserver = null;
        this.iframeScrollHandler = () => this.syncMouseScrollPosition();
        this.isRendering = false;
        this.lastRenderTime = 0;
        this.renderQueue = false;
        this.activationTimeout = null; // Track activation timeout
        this.pendingInputActivation = false;
        this.touchKeyboardInput = null; // Hidden input that summons the virtual keyboard
        this.touchKeyboardButton = null;
        this.messageTargetOrigin = window.location.origin;
        this.iframeMessageHandler = this.handleIframeMessage.bind(this);
    }

    postToIframe(message) {
        if (!this.iframe?.contentWindow) return;
        this.iframe.contentWindow.postMessage(message, this.messageTargetOrigin);
    }

    handleIframeMessage(event) {
        if (
            event.origin !== this.messageTargetOrigin ||
            event.source !== this.iframe?.contentWindow ||
            !event.data ||
            typeof event.data !== 'object' ||
            event.data.type !== 'portfolio:open-external-link' ||
            typeof event.data.href !== 'string'
        ) {
            return;
        }

        this.openExternalLink(event.data.href);
    }

    openExternalLink(href) {
        let url;

        try {
            url = new URL(href, window.location.href);
        } catch {
            return;
        }

        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return;

        const openedWindow = window.open(url.href, '_blank', 'noopener,noreferrer');
        if (openedWindow) openedWindow.opener = null;
    }

    // Virtual keyboards only open from a direct user gesture, so touch devices
    // get a TYPE button; tapping it focuses a hidden input whose keystrokes are
    // forwarded through the existing keydownHandler.
    createTouchKeyboardProxy() {
        if (this.touchKeyboardInput) return;

        this.touchKeyboardInput = document.createElement('input');
        this.touchKeyboardInput.type = 'text';
        this.touchKeyboardInput.setAttribute('autocapitalize', 'off');
        this.touchKeyboardInput.setAttribute('autocomplete', 'off');
        this.touchKeyboardInput.setAttribute('autocorrect', 'off');
        this.touchKeyboardInput.setAttribute('spellcheck', 'false');
        this.touchKeyboardInput.style.cssText =
            'position:fixed;bottom:0;left:0;width:1px;height:1px;opacity:0.01;border:none;padding:0;z-index:-1;';

        const forwardKey = (key) => {
            if (!this.keydownHandler) return;
            this.keydownHandler({
                key,
                keyCode: 0,
                which: 0,
                shiftKey: false,
                ctrlKey: false,
                altKey: false,
                metaKey: false,
                preventDefault: () => {},
                stopPropagation: () => {},
            });
        };

        this.touchBeforeInputHandler = (e) => {
            e.preventDefault();
            if (e.inputType === 'insertText' && e.data) {
                for (const char of e.data) forwardKey(char);
            } else if (e.inputType === 'insertLineBreak') {
                forwardKey('Enter');
            } else if (e.inputType === 'deleteContentBackward') {
                forwardKey('Backspace');
            }
        };
        // Some mobile keyboards report Enter/Backspace via keydown instead
        this.touchKeydownHandler = (e) => {
            if (e.key === 'Enter' || e.key === 'Backspace') {
                e.preventDefault();
                forwardKey(e.key);
            }
        };

        this.touchKeyboardInput.addEventListener('beforeinput', this.touchBeforeInputHandler);
        this.touchKeyboardInput.addEventListener('keydown', this.touchKeydownHandler);
        document.body.appendChild(this.touchKeyboardInput);

        this.touchKeyboardButton = document.createElement('button');
        this.touchKeyboardButton.type = 'button';
        this.touchKeyboardButton.className = 'nes-btn is-primary touch-keyboard-btn';
        this.touchKeyboardButton.textContent = 'TYPE';
        this.touchKeyboardButton.style.display = 'none';
        this.touchKeyboardFocusHandler = () => this.touchKeyboardInput.focus();
        this.touchKeyboardButton.addEventListener('click', this.touchKeyboardFocusHandler);
        document.body.appendChild(this.touchKeyboardButton);
    }

    showTouchKeyboardButton() {
        this.createTouchKeyboardProxy();
        this.touchKeyboardButton.style.display = 'block';
    }

    hideTouchKeyboardButton() {
        if (!this.touchKeyboardButton) return;
        this.touchKeyboardButton.style.display = 'none';
        this.touchKeyboardInput.blur();
    }

    disposeTouchKeyboardProxy() {
        if (this.touchKeyboardInput) {
            this.touchKeyboardInput.removeEventListener('beforeinput', this.touchBeforeInputHandler);
            this.touchKeyboardInput.removeEventListener('keydown', this.touchKeydownHandler);
            this.touchKeyboardInput.remove();
            this.touchKeyboardInput = null;
        }
        if (this.touchKeyboardButton) {
            this.touchKeyboardButton.removeEventListener('click', this.touchKeyboardFocusHandler);
            this.touchKeyboardButton.remove();
            this.touchKeyboardButton = null;
        }
    }

    createScreenMaterial() {
        return new THREE.MeshBasicMaterial({
            map: this.texture,
            color: 0xffffff,
            side: THREE.DoubleSide,
            toneMapped: false
        });
    }
    
    init(computerMesh) {
        // Create off-screen canvas for rendering website
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.config.width;
        this.canvas.height = this.config.height;
        
        // Create texture from canvas
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        this.drawIdleScreen();
        
        // Find the screen mesh in the computer model
        let screenMesh = null;
        const meshes = [];
        
        computerMesh.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
                
                // Look for a mesh that might be the screen by name
                const name = child.name.toLowerCase();
                if (name.includes('screen') || 
                    name.includes('display') ||
                    name.includes('monitor')) {
                    screenMesh = child;
                }
            }
        });
        
        // If no screen found by name, look for one by position/size
        if (!screenMesh && meshes.length > 0) {
            // Find a mesh that's positioned like a screen
            for (const mesh of meshes) {
                // Check if mesh is positioned like a monitor screen
                const box = new THREE.Box3().setFromObject(mesh);
                const size = box.getSize(new THREE.Vector3());
                
                // Look for screen-like dimensions
                if (size.x > 0.3 && size.x < 1.5 && 
                    size.y > 0.3 && size.y < 1.5 && 
                    size.z < 0.3) {
                    screenMesh = mesh;
                    break;
                }
            }
        }
        
        if (!screenMesh) {
            // The exported model intentionally uses a separate bezel rather
            // than a named display mesh, so add the display plane here.
            const geometry = new THREE.PlaneGeometry(this.config.screenWidth, this.config.screenHeight);
            const material = this.createScreenMaterial();
            screenMesh = new THREE.Mesh(geometry, material);
            // Position the screen relative to computer
            screenMesh.position.set(
                this.config.screenPosition.x,
                this.config.screenPosition.y,
                this.config.screenPosition.z
            );
            
            computerMesh.add(screenMesh);
        } else {
            // Replace the screen mesh's material with our texture
            this.originalMaterial = screenMesh.material;
            screenMesh.material = this.createScreenMaterial();
        }
        
        this.screenMesh = screenMesh;
        this.material = screenMesh.material;
        
        // Create input proxy only if keyboard is enabled
        if (this.config.enableKeyboard) {
            this.createInputProxy();
        }
    }
    
    ensureIframe() {
        if (this.iframe) return;

        // The embedded sites and html2canvas work are deferred until the
        // visitor actually approaches a computer. They are not needed to
        // render the room's opening view.
        this.iframe = document.createElement('iframe');
        this.iframe.src = this.config.src;
        this.iframe.title = this.config.iframeTitle;
        this.iframe.setAttribute('aria-hidden', 'true');
        this.iframe.tabIndex = -1;
        this.iframe.setAttribute('inert', '');
        this.iframe.style.position = 'absolute';
        this.iframe.style.left = '-9999px';
        this.iframe.style.width = this.config.width + 'px';
        this.iframe.style.height = this.config.height + 'px';
        this.iframe.style.border = 'none';
        this.iframe.style.background = '#000';

        // Initially disable pointer events if mouse is enabled
        if (this.config.enableMouse) {
            this.iframe.style.pointerEvents = 'none';
        }

        // Render once the iframe content is actually ready
        this.iframe.addEventListener('load', () => {
            this.iframeLoaded = true;
            this.attachIframeScrollListener();
            this.observeIframeLayout();
            this.syncMouseScrollPosition();
            if (this.isActive) {
                // Small delay lets the page finish painting before capture
                setTimeout(() => this.renderIframeToCanvas(), 300);
            }

            if (this.pendingInputActivation && this.isActive) {
                this.pendingInputActivation = false;
                this.scheduleActivation(0);
            }
        });

        window.addEventListener('message', this.iframeMessageHandler);
        document.body.appendChild(this.iframe);
    }

    getIframeScrollRoot() {
        return this.iframe?.contentWindow?.document.scrollingElement || null;
    }

    attachIframeScrollListener() {
        const iframeWindow = this.iframe?.contentWindow;
        if (!iframeWindow || this.iframeScrollTarget === iframeWindow) return;

        this.iframeScrollTarget?.removeEventListener('scroll', this.iframeScrollHandler);
        // Document scrolling is dispatched on its Window, rather than the
        // documentElement, in the browsers we support.
        iframeWindow.addEventListener('scroll', this.iframeScrollHandler, { passive: true });
        this.iframeScrollTarget = iframeWindow;
    }

    observeIframeLayout() {
        this.iframeResizeObserver?.disconnect();
        this.iframeResizeObserver = null;

        const iframeDoc = this.iframe?.contentDocument;
        if (!iframeDoc || typeof ResizeObserver === 'undefined') return;

        this.iframeResizeObserver = new ResizeObserver(() => {
            this.syncMouseScrollPosition();
        });
        this.iframeResizeObserver.observe(iframeDoc.documentElement);
        if (iframeDoc.body && iframeDoc.body !== iframeDoc.documentElement) {
            this.iframeResizeObserver.observe(iframeDoc.body);
        }
    }

    // The overlay is intentionally a real scroll container. Browsers already
    // apply the visitor's OS/natural-scroll preference to native scrollTop;
    // mirroring that delta avoids guessing what a raw WheelEvent delta means.
    syncMouseScrollPosition() {
        if (
            !this.isMouseActive ||
            !this.mouseContainer ||
            !this.mouseScrollProxy ||
            this.mouseContainer.clientHeight === 0
        ) {
            return;
        }

        const scrollRoot = this.getIframeScrollRoot();
        if (!scrollRoot) return;

        const maxIframeScroll = Math.max(0, scrollRoot.scrollHeight - scrollRoot.clientHeight);
        const proxyHeight = this.mouseContainer.clientHeight + Math.max(1, maxIframeScroll);
        this.mouseScrollProxy.style.height = `${proxyHeight}px`;

        const nextScrollTop = Math.min(maxIframeScroll, Math.max(0, scrollRoot.scrollTop));
        // Set this before assigning scrollTop because a browser may synchronously
        // dispatch the overlay's scroll event for a programmatic synchronisation.
        this.lastMouseScrollTop = nextScrollTop;
        this.mouseContainer.scrollTop = nextScrollTop;
    }

    handleMouseContainerScroll() {
        if (!this.mouseContainer) return;

        const nextScrollTop = this.mouseContainer.scrollTop;
        const scrollDelta = nextScrollTop - this.lastMouseScrollTop;
        this.lastMouseScrollTop = nextScrollTop;
        if (!scrollDelta) return;

        const scrollRoot = this.getIframeScrollRoot();
        if (!scrollRoot) return;

        const previousScrollBehavior = scrollRoot.style.scrollBehavior;
        scrollRoot.style.scrollBehavior = 'auto';
        scrollRoot.scrollTop += scrollDelta;
        scrollRoot.style.scrollBehavior = previousScrollBehavior;

        if (this.isActive) {
            this.renderIframeToCanvas();
        }
    }
    
    startPreviewMode() {
        // Clear any existing intervals
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
        }
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }

        // Trigger an immediate render if the iframe is already loaded;
        // otherwise the 'load' event handler will fire the first render.
        if (this.iframeLoaded) {
            this.renderIframeToCanvas();
        }

        // Update every 10 seconds in preview mode
        this.previewInterval = setInterval(() => {
            if (this.isActive && !this.isInputActive && !this.isMouseActive) {
                this.renderIframeToCanvas();
            }
        }, 10000);
    }
    
    startRendering() {
        // Clear any existing intervals
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
        }
        
        // Use requestAnimationFrame with throttling instead of setInterval
        const render = () => {
            const now = performance.now();
            const timeSinceLastRender = now - this.lastRenderTime;
            
            // Only render if enough time has passed
            if (timeSinceLastRender >= 100) {
                this.renderIframeToCanvas();
                this.lastRenderTime = now;
            }
            
            if (this.isActive) {
                this.updateInterval = requestAnimationFrame(render);
            }
        };
        
        render();
    }
    
    renderIframeToCanvas() {
        // Bail out until the iframe has fired its load event
        if (!this.iframeLoaded || !this.iframe) return;

        // Prevent overlapping renders
        if (this.isRendering) {
            this.renderQueue = true;
            return;
        }

        this.isRendering = true;

        try {
            // Access iframe document
            const iframeWindow = this.iframe.contentWindow;
            const iframeDoc = this.iframe.contentDocument || iframeWindow.document;

            if (!iframeDoc || !iframeDoc.body) {
                console.warn('Iframe document not accessible');
                this.isRendering = false;
                return;
            }
            
            // Capture the iframe's visible viewport rather than the top of its
            // full document. Without the crop coordinates, a scrolled website
            // can render an offset/static image on the 3D display.
            const scrollX = iframeWindow.scrollX;
            const scrollY = iframeWindow.scrollY;

            // Load html2canvas only when a screen needs a live preview.
            loadHtml2Canvas().then((html2canvas) => html2canvas(iframeDoc.body, {
                width: this.config.width,
                height: this.config.height,
                windowWidth: iframeWindow.innerWidth,
                windowHeight: iframeWindow.innerHeight,
                // Keep the cloned document at its origin, then crop the
                // current iframe viewport below. Supplying its scroll offset
                // here as well would cancel the crop and redraw the top.
                scrollX: 0,
                scrollY: 0,
                x: scrollX,
                y: scrollY,
                backgroundColor: this.config.backgroundColor,
                scale: 1, // Fixed scale for performance
                logging: false,
                useCORS: true,
                allowTaint: true,
                imageTimeout: 0, // Disable image loading timeout
                removeContainer: true, // Clean up after rendering
                foreignObjectRendering: false, // Faster rendering
                // NES.css draws its inset button shadow with an absolutely
                // positioned ::after pseudo-element. html2canvas turns that
                // pseudo-element into a real child and can paint it over the
                // anchor's text when capturing a cropped/scrolled viewport.
                // Hide only that capture clone; the live iframe keeps its
                // normal NES button styling and the labels remain readable.
                onclone: (clonedDocument) => {
                    const captureStyle = clonedDocument.createElement('style');
                    captureStyle.textContent = `
                        .nes-btn > html2canvaspseudoelement.___html2canvas___pseudoelement_after {
                            display: none !important;
                        }
                    `;
                    clonedDocument.head.appendChild(captureStyle);
                }
            })).then((canvasResult) => {
                // Draw the result to our texture canvas
                const ctx = this.canvas.getContext('2d');
                ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                ctx.drawImage(canvasResult, 0, 0, this.canvas.width, this.canvas.height);
                
                // Update texture
                this.texture.needsUpdate = true;
                
                this.isRendering = false;
                
                // Process queued render if any
                if (this.renderQueue) {
                    this.renderQueue = false;
                    this.renderIframeToCanvas();
                }
            }).catch((error) => {
                console.error('Error with html2canvas:', error);
                this.isRendering = false;
                // Fallback rendering
                this.drawFallbackContent();
            });
        } catch (error) {
            console.error('Error rendering iframe:', error);
            this.isRendering = false;
            this.drawFallbackContent();
        }
    }
    
    drawFallbackContent() {
        const ctx = this.canvas.getContext('2d');
        
        // Red background to match test.html
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.texture.needsUpdate = true;
    }

    drawIdleScreen() {
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#080808';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.strokeStyle = '#92cc41';
        ctx.lineWidth = 4;
        ctx.strokeRect(24, 24, this.canvas.width - 48, this.canvas.height - 48);
        ctx.fillStyle = '#f4f4f4';
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this.config.placeholderText, this.canvas.width / 2, this.canvas.height / 2);
        this.texture.needsUpdate = true;
    }
    
    drawErrorScreen(error) {
        const ctx = this.canvas.getContext('2d');
        
        // Terminal error theme
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        ctx.fillStyle = '#ff0000';
        ctx.font = '20px monospace';
        ctx.fillText('ERROR:', 20, 30);
        ctx.font = '16px monospace';
        ctx.fillText(error, 20, 60);
        
        this.texture.needsUpdate = true;
    }
    

    show() {
        if (this.isActive) return;
        
        this.isActive = true;
        this.ensureIframe();

        // Start preview mode with 10-second updates
        this.startPreviewMode();
    }

    createMouseContainer() {
        if (this.mouseContainer) return;
        
        // Create the mouse container overlay
        this.mouseContainer = document.getElementById('mouse-container');
        if (!this.mouseContainer) return;

        // A scene restart can create a new ComputerTexture around the same
        // overlay. Abort only the prior ComputerTexture listeners, leaving
        // any unrelated listeners on the element untouched.
        this.mouseContainer[MOUSE_INPUT_OWNER]?.abort();
        this.mouseInputController = new AbortController();
        this.mouseContainer[MOUSE_INPUT_OWNER] = this.mouseInputController;
        const listenerOptions = { signal: this.mouseInputController.signal };

        this.mouseContainer.style.position = 'absolute';
        this.mouseContainer.style.opacity = '0';
        // Keep the website input layer above the 3D renderers but below the
        // HUD. Otherwise it consumes the visible BACK/navigation buttons.
        this.mouseContainer.style.zIndex = '10';
        this.mouseContainer.style.backgroundColor = '#000';
        this.mouseContainer.style.cursor = 'none';
        this.mouseContainer.style.display = 'none'; // Initially hidden
        this.mouseContainer.style.pointerEvents = 'auto';
        this.mouseContainer.style.overflowX = 'hidden';
        this.mouseContainer.style.overflowY = 'auto';
        this.mouseContainer.style.overscrollBehaviorY = 'contain';
        this.mouseContainer.style.scrollBehavior = 'auto';
        this.mouseContainer.style.scrollbarWidth = 'none';
        this.mouseContainer.style.msOverflowStyle = 'none';

        // This invisible spacer turns the input overlay into a native scroll
        // surface. Its range is synchronised with the iframe when activated.
        // Keep it non-interactive so click/move forwarding still targets the
        // overlay itself.
        this.mouseContainer.replaceChildren();
        this.mouseScrollProxy = document.createElement('div');
        this.mouseScrollProxy.setAttribute('aria-hidden', 'true');
        this.mouseScrollProxy.style.width = '1px';
        this.mouseScrollProxy.style.height = '1px';
        this.mouseScrollProxy.style.pointerEvents = 'none';
        this.mouseContainer.appendChild(this.mouseScrollProxy);
        
        // Add event listeners to forward events to iframe
        this.mouseContainer.addEventListener('click', (e) => {
            if (!this.iframe || !this.iframe.contentWindow) return;
            
            const rect = this.mouseContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate position relative to iframe dimensions
            const scaleX = this.config.width / rect.width;
            const scaleY = this.config.height / rect.height;
            
            const iframeX = x * scaleX;
            const iframeY = y * scaleY;
            
            // Send click event to iframe
            this.postToIframe({
                type: 'click',
                x: iframeX,
                y: iframeY
            });
        }, listenerOptions);
        
        this.mouseContainer.addEventListener('mousemove', (e) => {
            if (!this.iframe || !this.iframe.contentWindow) return;
            
            const rect = this.mouseContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Calculate position relative to iframe dimensions
            const scaleX = this.config.width / rect.width;
            const scaleY = this.config.height / rect.height;
            
            const iframeX = x * scaleX;
            const iframeY = y * scaleY;
            
            // Send mousemove event to iframe
            this.postToIframe({
                type: 'mousemove',
                x: iframeX,
                y: iframeY
            });
        }, listenerOptions);

        this.mouseContainer.addEventListener('scroll', () => {
            this.handleMouseContainerScroll();
        }, listenerOptions);

        this.mouseContainer.addEventListener('wheel', (e) => {
            // The first implementation used a bubble listener with inverted
            // arithmetic. A browser that preserves the scene through HMR can
            // still have that legacy listener attached. Stop it, but do not
            // cancel this overlay's native default scroll action.
            e.stopImmediatePropagation();
        }, { ...listenerOptions, passive: true, capture: true });
        
        document.body.appendChild(this.mouseContainer);
    }
    
    activateMouse() {
        if (!this.config.enableMouse) return;
        
        // Create mouse container if it doesn't exist
        if (!this.mouseContainer) {
            this.createMouseContainer();
        }

        // Position and size the mouse container to match the iframe
        this.mouseContainer.style.width = this.config.width/1.775 + 'px';
        this.mouseContainer.style.height = this.config.height/1.74 + 'px';
        // center div
        this.mouseContainer.style.left = '50%';
        this.mouseContainer.style.transform = 'translateX(-47.5%)';
        this.mouseContainer.style.top = '25vh';
        this.mouseContainer.style.display = 'block';
        
        // Send message to iframe content
        this.postToIframe('activateMouse');
        
        this.isMouseActive = true;
        this.attachIframeScrollListener();
        this.syncMouseScrollPosition();

        // Touch users get a direct link in case iframe tap forwarding is clunky
        if (device.isTouchPrimary) {
            this.showOpenSiteButton();
        }

        // Switch to full rendering mode when mouse is activated
        if (this.isActive) {
            this.startRendering();
        }
    }

    showOpenSiteButton() {
        if (!this.openSiteButton) {
            this.openSiteButton = document.createElement('button');
            this.openSiteButton.type = 'button';
            this.openSiteButton.className = 'nes-btn is-primary open-site-btn';
            this.openSiteButton.textContent = 'OPEN SITE';
            this.openSiteClickHandler = () => this.openExternalLink(this.config.src);
            this.openSiteButton.addEventListener('click', this.openSiteClickHandler);
            document.body.appendChild(this.openSiteButton);
        }
        this.openSiteButton.style.display = 'block';
    }

    hideOpenSiteButton() {
        if (this.openSiteButton) {
            this.openSiteButton.style.display = 'none';
        }
    }

    disposeOpenSiteButton() {
        if (this.openSiteButton) {
            this.openSiteButton.removeEventListener('click', this.openSiteClickHandler);
            this.openSiteButton.remove();
            this.openSiteButton = null;
        }
    }

    deactivateMouse() {
        if (!this.config.enableMouse) return;

        // Hide mouse container
        if (this.mouseContainer) {
            this.mouseContainer.style.display = 'none';
            this.lastMouseScrollTop = 0;
        }
        this.hideOpenSiteButton();
        
        // Send message to iframe content
        this.postToIframe('deactivateMouse');
        
        this.isMouseActive = false;
        
        // Switch back to preview mode if still active but no input is active
        if (this.isActive && !this.isInputActive) {
            this.startPreviewMode();
        }
    }
    
    hide() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.pendingInputActivation = false;
        
        // Deactivate keyboard input if enabled
        if (this.config.enableKeyboard && this.isInputActive) {
            this.deactivateInput();
        }
        
        // Clear any pending activation
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Deactivate mouse if enabled
        if (this.config.enableMouse) {
            this.deactivateMouse();
        }
        
        // Send deactivation message to iframe
        this.postToIframe('deactivate');
        
        // Stop rendering updates
        if (this.updateInterval) {
            cancelAnimationFrame(this.updateInterval);
            this.updateInterval = null;
        }
        
        // Clear preview interval if running
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
    }
    
    deactivateInput() {
        if (!this.config.enableKeyboard) return;
        
        // Clear any pending activation timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Only deactivate keyboard input, keep screen visible
        this.postToIframe('deactivate');
        this.isInputActive = false;

        // Remove keyboard listeners properly
        this.removeKeyboardHandlers();
        this.hideTouchKeyboardButton();
        
        // Switch back to preview mode if still active but no mouse is active
        if (this.isActive && !this.isMouseActive) {
            this.startPreviewMode();
        }
    }
    
    createInputProxy() {
        // Remove any existing handlers first
        this.removeKeyboardHandlers();
        
        // Create keyboard event handlers that forward to iframe
        this.keydownHandler = (e) => {
            // Double-check that input is actually active
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            
            // Special handling for Escape key
            if (e.key === 'Escape') {
                this.deactivateInput();
                return;
            }
            
            // Forward the event to the iframe
            if (this.iframe && this.iframe.contentWindow) {
                try {
                    const iframeDoc = this.iframe.contentDocument || this.iframe.contentWindow.document;
                    const terminalInput = iframeDoc.getElementById('terminal-input');
                    
                    if (terminalInput) {
                        // Create a synthetic event in the iframe
                        const event = new KeyboardEvent('keydown', {
                            key: e.key,
                            keyCode: e.keyCode,
                            which: e.which,
                            shiftKey: e.shiftKey,
                            ctrlKey: e.ctrlKey,
                            altKey: e.altKey,
                            metaKey: e.metaKey,
                            bubbles: true
                        });
                        
                        terminalInput.dispatchEvent(event);
                        
                        // For printable characters, update the input value
                        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                            terminalInput.value += e.key;
                            // Move cursor to end
                            terminalInput.setSelectionRange(terminalInput.value.length, terminalInput.value.length);
                        } else if (e.key === 'Backspace') {
                            terminalInput.value = terminalInput.value.slice(0, -1);
                        }
                        
                        e.preventDefault();
                        e.stopPropagation();
                    }
                } catch (error) {
                    console.error('Error forwarding keyboard event:', error);
                }
            }
        };
        
        this.keyupHandler = (e) => {
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            e.preventDefault();
            e.stopPropagation();
        };
        
        this.keypressHandler = (e) => {
            if (!this.isInputActive || !this.config.enableKeyboard) return;
            e.preventDefault();
            e.stopPropagation();
        };
    }
    
    removeKeyboardHandlers() {
        if (this.keydownHandler) {
            document.removeEventListener('keydown', this.keydownHandler, true);
        }
        if (this.keyupHandler) {
            document.removeEventListener('keyup', this.keyupHandler, true);
        }
        if (this.keypressHandler) {
            document.removeEventListener('keypress', this.keypressHandler, true);
        }
    }
    
    activateInput() {
        if (!this.config.enableKeyboard || this.isInputActive) return;
        
        // Clear any existing activation timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        // Remove any existing handlers first to prevent duplicates
        this.removeKeyboardHandlers();
        
        this.isInputActive = true;

        // Add keyboard listeners
        document.addEventListener('keydown', this.keydownHandler, true);
        document.addEventListener('keyup', this.keyupHandler, true);
        document.addEventListener('keypress', this.keypressHandler, true);

        // Touch devices type via the virtual keyboard proxy
        if (device.isTouchPrimary) {
            this.showTouchKeyboardButton();
        }
        
        // Send activation message to iframe
        this.postToIframe('activate');
        
        // Switch to full rendering mode when input is activated
        if (this.isActive) {
            this.startRendering();
        }
    }
    
    // Method to schedule delayed activation
    scheduleActivation(delay = 500) {
        if (!this.config.enableKeyboard) return;

        this.ensureIframe();
        if (!this.iframeLoaded) {
            this.pendingInputActivation = true;
            return;
        }
        
        // Clear any existing timeout
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
        }
        
        // Set new timeout
        this.activationTimeout = setTimeout(() => {
            this.activateInput();
            this.activationTimeout = null;
        }, delay);
    }
    
    update() {
        // Texture updates are handled by the render interval
        // This method is here for consistency with other texture classes
    }
    
    dispose() {
        // Clean up all resources
        this.hide();
        if (this.mouseInputController) {
            this.mouseInputController.abort();
            if (this.mouseContainer?.[MOUSE_INPUT_OWNER] === this.mouseInputController) {
                delete this.mouseContainer[MOUSE_INPUT_OWNER];
            }
            this.mouseInputController = null;
        }
        this.removeKeyboardHandlers();
        this.disposeTouchKeyboardProxy();
        this.disposeOpenSiteButton();
        window.removeEventListener('message', this.iframeMessageHandler);
        this.iframeScrollTarget?.removeEventListener('scroll', this.iframeScrollHandler);
        this.iframeScrollTarget = null;
        this.iframeResizeObserver?.disconnect();
        this.iframeResizeObserver = null;
        this.mouseScrollProxy = null;
        
        // Clear any intervals and timeouts
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
        
        if (this.activationTimeout) {
            clearTimeout(this.activationTimeout);
            this.activationTimeout = null;
        }
        
        if (this.iframe && this.iframe.parentNode) {
            this.iframe.parentNode.removeChild(this.iframe);
        }
        
        if (this.mouseContainer && this.mouseContainer.parentNode) {
            this.mouseContainer.parentNode.removeChild(this.mouseContainer);
        }
        
        if (this.texture) {
            this.texture.dispose();
        }
        
        if (this.canvas) {
            this.canvas = null;
        }
    }
    
}
