// Pac-Man simplified for 320×120 canvas
// Cell: 8×8, grid: 40×13, HUD: 8px at top, play area starts y=8 → 13 rows × 8 = 104px

const CELL = 8;
const COLS = 40;
const ROWS = 13;
const HUD_H = 8;

// Maze: '#' = wall, '.' = dot, 'o' = power pellet, ' ' = empty (ghost house)
const MAZE_TEMPLATE = [
    '########################################',
    '#o.............##..............o.......#',
    '#.####.#####.####.####.#####.####.####.#',
    '#......................................#',
    '#.####.##.############.##.####.####.##.#',
    '#......##.....      ...##..............#',
    '#.####.##.############.##.####.####.##.#',
    '#......................................#',
    '#.####.#####.####.####.#####.####.####.#',
    '#o.............##..............o.......#',
    '#.####.##.############.##.####.####.##.#',
    '#......................................#',
    '########################################',
];

function buildMaze() {
    return MAZE_TEMPLATE.map(row => row.split(''));
}

const GHOST_COLORS = ['#E53B44', '#F4A942'];

export class PacManGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.audioContext = null;
        this.isRunning = false;
        this.animationId = null;

        this.maze = [];
        this.dots = 0;
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.win = false;

        this.pac = { x: 20, y: 9, dx: 1, dy: 0, nextDx: 1, nextDy: 0 };
        this.ghosts = [];

        this.frameCount = 0;
        this.PAC_SPEED = 10;
        this.GHOST_SPEED = 16;
        this.frightenedTimer = 0;
        this.FRIGHTEN_DURATION = 180; // frames

        this.deathTimer = 0;
        this.dying = false;

        this.keydownHandler = null;
    }

    setupControls() {
        this.keydownHandler = (e) => {
            if (!this.isRunning) return;
            switch (e.key) {
                case 'ArrowUp':    case 'w': case 'W':
                    this.pac.nextDx = 0; this.pac.nextDy = -1;
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowDown':  case 's': case 'S':
                    this.pac.nextDx = 0; this.pac.nextDy = 1;
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowLeft':  case 'a': case 'A':
                    this.pac.nextDx = -1; this.pac.nextDy = 0;
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowRight': case 'd': case 'D':
                    this.pac.nextDx = 1;  this.pac.nextDy = 0;
                    e.preventDefault(); e.stopPropagation(); break;
                case ' ':
                case 'Enter':
                    if (this.gameOver || this.win) { this.reset(); this.start(); }
                    e.preventDefault(); e.stopPropagation(); break;
                case 'Escape':
                    e.preventDefault(); e.stopPropagation();
                    window.dispatchEvent(new CustomEvent('arcade-exit-game'));
                    break;
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }

    reset() {
        this.maze = buildMaze();
        this.dots = 0;
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.win = false;
        this.frameCount = 0;
        this.frightenedTimer = 0;
        this.dying = false;
        this.deathTimer = 0;

        // Count dots
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.maze[r][c];
                if (cell === '.' || cell === 'o') this.dots++;
            }
        }

        this.pac = { x: 20, y: 9, dx: 1, dy: 0, nextDx: 1, nextDy: 0 };

        this.ghosts = [
            { x: 19, y: 5, dx: 1, dy: 0, frightened: false },
            { x: 20, y: 5, dx: -1, dy: 0, frightened: false },
        ];
    }

    _isWall(x, y) {
        const col = (x + COLS) % COLS;
        const row = (y + ROWS) % ROWS;
        return this.maze[row][col] === '#';
    }

    start() {
        if (!this.isRunning) { this.isRunning = true; this.gameLoop(); }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler);
    }

    gameLoop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.gameOver || this.win) return;
        this.frameCount++;

        // Death animation delay
        if (this.dying) {
            this.deathTimer--;
            if (this.deathTimer <= 0) {
                this.dying = false;
                if (this.lives <= 0) {
                    this.gameOver = true;
                    this._sound('gameover');
                } else {
                    this._respawnPac();
                }
            }
            return;
        }

        if (this.frightenedTimer > 0) this.frightenedTimer--;
        if (this.frightenedTimer === 0) {
            this.ghosts.forEach(g => g.frightened = false);
        }

        // Move pac-man
        if (this.frameCount % this.PAC_SPEED === 0) {
            this._movePac();
        }

        // Move ghosts
        if (this.frameCount % this.GHOST_SPEED === 0) {
            this.ghosts.forEach(g => this._moveGhost(g));
        }

        // Ghost collision
        this.ghosts.forEach(g => {
            if (g.x === this.pac.x && g.y === this.pac.y) {
                if (g.frightened) {
                    // Eat ghost
                    this.score += 20;
                    g.frightened = false;
                    g.x = 19; g.y = 5; g.dx = 1; g.dy = 0;
                    this._sound('eatGhost');
                } else {
                    this._startDeath();
                }
            }
        });
    }

    _movePac() {
        // Try next direction first
        const nx = (this.pac.x + this.pac.nextDx + COLS) % COLS;
        const ny = (this.pac.y + this.pac.nextDy + ROWS) % ROWS;
        if (!this._isWall(nx, ny)) {
            this.pac.dx = this.pac.nextDx;
            this.pac.dy = this.pac.nextDy;
        }

        const mx = (this.pac.x + this.pac.dx + COLS) % COLS;
        const my = (this.pac.y + this.pac.dy + ROWS) % ROWS;
        if (!this._isWall(mx, my)) {
            this.pac.x = mx;
            this.pac.y = my;
        }

        const cell = this.maze[this.pac.y][this.pac.x];
        if (cell === '.') {
            this.maze[this.pac.y][this.pac.x] = ' ';
            this.score++;
            this.dots--;
            this._sound('dot');
            if (this.dots <= 0) { this.win = true; this._sound('win'); }
        } else if (cell === 'o') {
            this.maze[this.pac.y][this.pac.x] = ' ';
            this.score += 5;
            this.dots--;
            this.frightenedTimer = this.FRIGHTEN_DURATION;
            this.ghosts.forEach(g => g.frightened = true);
            this._sound('powerPellet');
            if (this.dots <= 0) { this.win = true; this._sound('win'); }
        }
    }

    _moveGhost(g) {
        // Collect valid moves (no reversing unless forced)
        const dirs = [
            { dx: 1,  dy: 0  },
            { dx: -1, dy: 0  },
            { dx: 0,  dy: 1  },
            { dx: 0,  dy: -1 },
        ];

        const reverse = { dx: -g.dx, dy: -g.dy };
        const options = dirs.filter(d => {
            if (d.dx === reverse.dx && d.dy === reverse.dy) return false;
            const nx = (g.x + d.dx + COLS) % COLS;
            const ny = (g.y + d.dy + ROWS) % ROWS;
            return !this._isWall(nx, ny) && this.maze[(g.y + d.dy + ROWS) % ROWS][(g.x + d.dx + COLS) % COLS] !== ' ' || true;
        }).filter(d => {
            const nx = (g.x + d.dx + COLS) % COLS;
            const ny = (g.y + d.dy + ROWS) % ROWS;
            return !this._isWall(nx, ny);
        });

        if (options.length === 0) return;

        let chosen;
        if (g.frightened) {
            // Random movement when frightened
            chosen = options[Math.floor(Math.random() * options.length)];
        } else {
            // Chase pac-man: pick direction that minimizes distance
            chosen = options.reduce((best, d) => {
                const nx = (g.x + d.dx + COLS) % COLS;
                const ny = (g.y + d.dy + ROWS) % ROWS;
                const dist = Math.abs(nx - this.pac.x) + Math.abs(ny - this.pac.y);
                const bestNx = (g.x + best.dx + COLS) % COLS;
                const bestNy = (g.y + best.dy + ROWS) % ROWS;
                const bestDist = Math.abs(bestNx - this.pac.x) + Math.abs(bestNy - this.pac.y);
                return dist < bestDist ? d : best;
            });
        }

        g.dx = chosen.dx; g.dy = chosen.dy;
        g.x = (g.x + g.dx + COLS) % COLS;
        g.y = (g.y + g.dy + ROWS) % ROWS;
    }

    _startDeath() {
        this.dying = true;
        this.deathTimer = 60;
        this.lives--;
        this._sound('death');
    }

    _respawnPac() {
        this.pac = { x: 20, y: 9, dx: 1, dy: 0, nextDx: 1, nextDy: 0 };
        this.ghosts = [
            { x: 19, y: 5, dx: 1, dy: 0, frightened: false },
            { x: 20, y: 5, dx: -1, dy: 0, frightened: false },
        ];
        this.frightenedTimer = 0;
    }

    draw() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, W, H);

        // HUD
        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 7px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`SCORE: ${this.score}`, 4, 7);
        ctx.textAlign = 'right';
        ctx.fillText(`LIVES: ${'♥'.repeat(this.lives)}`, W - 4, 7);
        ctx.textAlign = 'left';

        // Draw maze
        for (let r = 0; r < ROWS; r++) {
            for (let c = 0; c < COLS; c++) {
                const cell = this.maze[r][c];
                const px = c * CELL;
                const py = HUD_H + r * CELL;

                if (cell === '#') {
                    ctx.fillStyle = '#1a3a6e';
                    ctx.fillRect(px, py, CELL, CELL);
                } else if (cell === '.') {
                    ctx.fillStyle = '#d4a843';
                    ctx.fillRect(px + 3, py + 3, 2, 2);
                } else if (cell === 'o') {
                    ctx.fillStyle = '#d4a843';
                    ctx.beginPath();
                    ctx.arc(px + CELL / 2, py + CELL / 2, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }

        // Pac-Man
        if (!this.dying || Math.floor(this.deathTimer / 6) % 2 === 0) {
            const px = this.pac.x * CELL + CELL / 2;
            const py = HUD_H + this.pac.y * CELL + CELL / 2;
            const mouthAngle = 0.25;
            const angle = this.pac.dx === 1 ? 0 : this.pac.dx === -1 ? Math.PI : this.pac.dy === -1 ? -Math.PI / 2 : Math.PI / 2;
            ctx.fillStyle = '#F4D03F';
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.arc(px, py, 3.5, angle + mouthAngle, angle + Math.PI * 2 - mouthAngle);
            ctx.closePath();
            ctx.fill();
        }

        // Ghosts
        this.ghosts.forEach((g, i) => {
            const px = g.x * CELL;
            const py = HUD_H + g.y * CELL;
            ctx.fillStyle = g.frightened
                ? (this.frightenedTimer < 60 && Math.floor(this.frameCount / 6) % 2 === 0 ? '#FFFFFF' : '#2222CC')
                : GHOST_COLORS[i];
            // Ghost body
            ctx.beginPath();
            ctx.arc(px + CELL / 2, py + CELL / 2, 3.5, Math.PI, 0);
            ctx.lineTo(px + CELL, py + CELL);
            // Wavy bottom
            ctx.lineTo(px + CELL * 0.75, py + CELL - 2);
            ctx.lineTo(px + CELL * 0.5, py + CELL);
            ctx.lineTo(px + CELL * 0.25, py + CELL - 2);
            ctx.lineTo(px, py + CELL);
            ctx.closePath();
            ctx.fill();
        });

        // Controls hint
        ctx.fillStyle = '#222';
        ctx.font = '5px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('WASD/↑↓←→  ESC MENU', W - 2, H - 1);
        ctx.textAlign = 'left';

        // Overlay
        if (this.gameOver || this.win) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, HUD_H, W, H - HUD_H);
            ctx.fillStyle = this.win ? '#92CC41' : '#E53B44';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(this.win ? 'YOU WIN!' : 'GAME OVER', W / 2, H / 2 - 6);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '8px monospace';
            ctx.fillText(`SCORE: ${this.score}   SPACE TO RETRY`, W / 2, H / 2 + 8);
            ctx.textAlign = 'left';
        }
    }

    _sound(type) {
        if (!this.audioContext) return;
        try {
            if (this.audioContext.state === 'suspended') this.audioContext.resume();
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            osc.connect(gain); gain.connect(this.audioContext.destination);
            gain.gain.value = 0.05;
            const map = {
                dot:         [220, 'square',   0.04],
                powerPellet: [440, 'sine',     0.12],
                eatGhost:    [660, 'square',   0.1 ],
                death:       [80,  'sawtooth', 0.15],
                win:         [523, 'sine',     0.15],
                gameover:    [60,  'sawtooth', 0.2 ],
            };
            const [freq, waveType, dur] = map[type] || [200, 'square', 0.08];
            osc.frequency.value = freq; osc.type = waveType;
            gain.gain.value = 0.05;
            osc.start(); osc.stop(this.audioContext.currentTime + dur);
        } catch (_) {}
    }

    playSound(type) { this._sound(type); }
}
