import * as THREE from 'three';
import { ArcadeGame } from '../../utils/arcadeGame.js';
import { PongGame } from '../../utils/games/pong.js';
import { SnakeGame } from '../../utils/games/snake.js';
import { PacManGame } from '../../utils/games/pacman.js';

const GAME_REGISTRY = [
    { label: 'BREAKOUT', Class: ArcadeGame },
    { label: 'PONG',     Class: PongGame },
    { label: 'SNAKE',    Class: SnakeGame },
    { label: 'PAC-MAN',  Class: PacManGame },
];

export class ArcadeScreenTexture {
    constructor() {
        this.canvas = null;
        this.texture = null;
        this.screenMesh = null;
        this.audioContext = null;

        this.state = 'attract'; // 'attract' | 'menu' | 'playing'
        this.menuIndex = 0;
        this.currentGame = null;

        this.menuKeyHandler = null;
        this.exitGameHandler = null;
    }

    init(arcadeMesh) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 320;
        this.canvas.height = 120;

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.NearestFilter;

        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Find screen mesh
        let screenMesh = null;
        const meshes = [];

        arcadeMesh.traverse((child) => {
            if (child.isMesh) {
                meshes.push(child);
                const name = child.name.toLowerCase();
                if (name.includes('screen') || name.includes('display') || name.includes('monitor') || name.includes('crt')) {
                    screenMesh = child;
                }
            }
        });

        if (!screenMesh && meshes.length > 0) {
            for (const mesh of meshes) {
                const worldPos = new THREE.Vector3();
                mesh.getWorldPosition(worldPos);
                if (worldPos.y > 1 && worldPos.z < 1) {
                    const box = new THREE.Box3().setFromObject(mesh);
                    const size = box.getSize(new THREE.Vector3());
                    if (size.x > 0.5 && size.x < 2 && size.y > 0.5 && size.y < 2 && size.z < 0.5) {
                        screenMesh = mesh;
                        break;
                    }
                }
            }
        }

        if (!screenMesh) {
            const geometry = new THREE.PlaneGeometry(1.28, 0.48);
            screenMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                map: this.texture, side: THREE.FrontSide
            }));
            screenMesh.position.set(0, .875, .7475);
            screenMesh.rotation.x = -0.4;
            arcadeMesh.add(screenMesh);
        } else {
            screenMesh.material = new THREE.MeshBasicMaterial({
                map: this.texture, side: THREE.FrontSide,
                emissive: new THREE.Color(0x222222), emissiveIntensity: 0.5
            });
        }

        this.screenMesh = screenMesh;

        // Listen for game's Escape signal
        this.exitGameHandler = () => this._onExitGame();
        window.addEventListener('arcade-exit-game', this.exitGameHandler);

        this._drawAttractMode();
    }

    // Called by interactive.js when player clicks the arcade
    show() {
        if (this.state === 'playing') return;
        this._enterMenu();
    }

    hide() {
        this._stopCurrentGame();
        this._removeMenuControls();
        this.state = 'attract';
        this._drawAttractMode();
    }

    update() {
        if (this.texture) this.texture.needsUpdate = true;
    }

    // ── State transitions ─────────────────────────────────────────────────────

    _enterMenu() {
        this._stopCurrentGame();
        this.state = 'menu';
        this._drawMenu();
        this._setupMenuControls();
    }

    _launchGame(index) {
        this._removeMenuControls();
        this.state = 'playing';

        const { Class } = GAME_REGISTRY[index];
        const game = new Class();
        game.canvas = this.canvas;
        game.ctx = this.canvas.getContext('2d');
        game.audioContext = this.audioContext;

        game.setupControls();
        game.reset();
        game.start();
        this.currentGame = game;
    }

    _onExitGame() {
        if (this.state !== 'playing') return;
        this._stopCurrentGame();
        this._enterMenu();
    }

    _stopCurrentGame() {
        if (this.currentGame) {
            this.currentGame.stop();
            this.currentGame = null;
        }
    }

    // ── Menu drawing ──────────────────────────────────────────────────────────

    _drawMenu() {
        const ctx = this.canvas.getContext('2d');
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT GAME', W / 2, 16);

        const itemH = 16;
        const startY = 32;

        GAME_REGISTRY.forEach(({ label }, i) => {
            const y = startY + i * itemH;
            const isSelected = i === this.menuIndex;

            if (isSelected) {
                ctx.fillStyle = '#92CC41';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`> ${label}`, W / 2, y);
            } else {
                ctx.fillStyle = '#555555';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(label, W / 2, y);
            }
        });

        ctx.fillStyle = '#333333';
        ctx.font = '7px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('↑↓ SELECT   ENTER START   ESC BACK', W / 2, H - 5);

        if (this.texture) this.texture.needsUpdate = true;
    }

    _drawAttractMode() {
        const ctx = this.canvas.getContext('2d');
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ARCADE GAMES', W / 2, H / 2 - 14);

        ctx.font = 'bold 10px monospace';
        ctx.fillText('CLICK TO PLAY', W / 2, H / 2 + 8);

        ctx.fillStyle = '#333333';
        ctx.font = '8px monospace';
        ctx.fillText('BREAKOUT · PONG · SNAKE · PAC-MAN', W / 2, H / 2 + 26);

        if (this.texture) this.texture.needsUpdate = true;
    }

    // ── Menu keyboard controls ────────────────────────────────────────────────

    _setupMenuControls() {
        this.menuKeyHandler = (e) => {
            if (this.state !== 'menu') return;
            switch (e.key) {
                case 'ArrowUp': case 'w': case 'W':
                    this.menuIndex = (this.menuIndex - 1 + GAME_REGISTRY.length) % GAME_REGISTRY.length;
                    this._playBlip();
                    this._drawMenu();
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowDown': case 's': case 'S':
                    this.menuIndex = (this.menuIndex + 1) % GAME_REGISTRY.length;
                    this._playBlip();
                    this._drawMenu();
                    e.preventDefault(); e.stopPropagation(); break;
                case 'Enter': case ' ':
                    this._launchGame(this.menuIndex);
                    e.preventDefault(); e.stopPropagation(); break;
                case 'Escape':
                    window.dispatchEvent(new CustomEvent('arcade-go-back'));
                    e.preventDefault(); e.stopPropagation(); break;
            }
        };
        document.addEventListener('keydown', this.menuKeyHandler);
    }

    _removeMenuControls() {
        if (this.menuKeyHandler) {
            document.removeEventListener('keydown', this.menuKeyHandler);
            this.menuKeyHandler = null;
        }
    }

    _playBlip() {
        if (!this.audioContext) return;
        try {
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain); gain.connect(this.audioContext.destination);
            osc.frequency.value = 300; osc.type = 'square';
            gain.gain.value = 0.05;
            osc.start(); osc.stop(this.audioContext.currentTime + 0.04);
        } catch (_) {}
    }
}
