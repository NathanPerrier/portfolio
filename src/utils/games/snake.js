export class SnakeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.audioContext = null;
        this.isRunning = false;
        this.animationId = null;

        this.CELL = 8;
        this.HUD_H = 10;
        this.COLS = 40;   // 320 / 8
        this.ROWS = 13;   // (120 - 10) / 8 = 13.75 → 13

        this.snake = [];
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };
        this.food = { x: 0, y: 0 };
        this.score = 0;
        this.gameOver = false;

        this.frameCount = 0;
        this.MOVE_EVERY = 10; // frames between moves

        this.keydownHandler = null;
    }

    setupControls() {
        this.keydownHandler = (e) => {
            if (!this.isRunning) return;
            switch (e.key) {
                case 'ArrowUp':    case 'w': case 'W':
                    if (this.dir.y !== 1)  this.nextDir = { x: 0, y: -1 };
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowDown':  case 's': case 'S':
                    if (this.dir.y !== -1) this.nextDir = { x: 0, y: 1 };
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowLeft':  case 'a': case 'A':
                    if (this.dir.x !== 1)  this.nextDir = { x: -1, y: 0 };
                    e.preventDefault(); e.stopPropagation(); break;
                case 'ArrowRight': case 'd': case 'D':
                    if (this.dir.x !== -1) this.nextDir = { x: 1, y: 0 };
                    e.preventDefault(); e.stopPropagation(); break;
                case ' ':
                case 'Enter':
                    if (this.gameOver) { this.reset(); this.start(); }
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
        this.gameOver = false;
        this.score = 0;
        this.frameCount = 0;
        this.dir = { x: 1, y: 0 };
        this.nextDir = { x: 1, y: 0 };

        const startX = Math.floor(this.COLS / 4);
        const startY = Math.floor(this.ROWS / 2);
        this.snake = [
            { x: startX,     y: startY },
            { x: startX - 1, y: startY },
            { x: startX - 2, y: startY },
        ];
        this._spawnFood();
    }

    _spawnFood() {
        let pos;
        do {
            pos = {
                x: Math.floor(Math.random() * this.COLS),
                y: Math.floor(Math.random() * this.ROWS),
            };
        } while (this.snake.some(s => s.x === pos.x && s.y === pos.y));
        this.food = pos;
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
        if (this.gameOver) return;

        this.frameCount++;
        if (this.frameCount % this.MOVE_EVERY !== 0) return;

        this.dir = { ...this.nextDir };

        const head = this.snake[0];
        const next = {
            x: (head.x + this.dir.x + this.COLS) % this.COLS,
            y: (head.y + this.dir.y + this.ROWS) % this.ROWS,
        };

        // Self collision
        if (this.snake.some(s => s.x === next.x && s.y === next.y)) {
            this.gameOver = true;
            this._sound('lose');
            return;
        }

        this.snake.unshift(next);

        if (next.x === this.food.x && next.y === this.food.y) {
            this.score++;
            this._sound('eat');
            this._spawnFood();
        } else {
            this.snake.pop();
        }
    }

    draw() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const C = this.CELL;
        const playTop = this.HUD_H;

        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, W, H);

        // HUD
        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`SNAKE   SCORE: ${this.score}`, W / 2, 8);

        // Food
        ctx.fillStyle = '#E53B44';
        ctx.fillRect(this.food.x * C, playTop + this.food.y * C, C - 1, C - 1);

        // Snake
        this.snake.forEach((seg, i) => {
            ctx.fillStyle = i === 0 ? '#FFFFFF' : '#92CC41';
            ctx.fillRect(seg.x * C, playTop + seg.y * C, C - 1, C - 1);
        });

        // Controls hint
        ctx.fillStyle = '#333';
        ctx.font = '6px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('WASD/↑↓←→  ESC MENU', W - 3, H - 2);
        ctx.textAlign = 'left';

        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, playTop, W, H - playTop);
            ctx.fillStyle = '#E53B44';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W / 2, H / 2 - 6);
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
            gain.gain.value = 0.06;
            const map = { eat: [330, 'square'], lose: [80, 'sawtooth'] };
            const [freq, waveType] = map[type] || [200, 'square'];
            osc.frequency.value = freq; osc.type = waveType;
            osc.start(); osc.stop(this.audioContext.currentTime + 0.08);
        } catch (_) {}
    }

    playSound(type) { this._sound(type); }
}
