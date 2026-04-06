export class PongGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.audioContext = null;
        this.isRunning = false;
        this.animationId = null;

        this.HUD_H = 14;
        this.paddleW = 5;
        this.paddleH = 26;
        this.paddleSpeed = 1.8;
        this.winScore = 7;

        this.playerScore = 0;
        this.aiScore = 0;
        this.gameOver = false;
        this.winner = null;

        this.player = { x: 8, y: 0 };
        this.ai = { x: 0, y: 0 };
        this.ball = { x: 0, y: 0, vx: 1.4, vy: 1.0, r: 3 };

        this.keys = { up: false, down: false };
        this.keydownHandler = null;
        this.keyupHandler = null;
    }

    setupControls() {
        this.keydownHandler = (e) => {
            if (!this.isRunning) return;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
                this.keys.up = true; e.preventDefault(); e.stopPropagation();
            } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
                this.keys.down = true; e.preventDefault(); e.stopPropagation();
            } else if ((e.key === ' ' || e.key === 'Enter') && this.gameOver) {
                this.reset(); this.start(); e.preventDefault(); e.stopPropagation();
            } else if (e.key === 'Escape') {
                e.preventDefault(); e.stopPropagation();
                window.dispatchEvent(new CustomEvent('arcade-exit-game'));
            }
        };
        this.keyupHandler = (e) => {
            if (!this.isRunning) return;
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
        };
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }

    reset() {
        this.playerScore = 0;
        this.aiScore = 0;
        this.gameOver = false;
        this.winner = null;
        const playH = this.canvas.height - this.HUD_H;
        const midY = this.HUD_H + playH / 2 - this.paddleH / 2;
        this.player.y = midY;
        this.ai.x = this.canvas.width - 8 - this.paddleW;
        this.ai.y = midY;
        this._resetBall();
    }

    _resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.HUD_H + (this.canvas.height - this.HUD_H) / 2;
        const dir = Math.random() > 0.5 ? 1 : -1;
        this.ball.vx = 1.4 * dir;
        this.ball.vy = (Math.random() * 0.8 + 0.4) * (Math.random() > 0.5 ? 1 : -1);
    }

    start() {
        if (!this.isRunning) { this.isRunning = true; this.gameLoop(); }
    }

    stop() {
        this.isRunning = false;
        if (this.animationId) cancelAnimationFrame(this.animationId);
        this.keys.up = false; this.keys.down = false;
        if (this.keydownHandler) document.removeEventListener('keydown', this.keydownHandler);
        if (this.keyupHandler) document.removeEventListener('keyup', this.keyupHandler);
    }

    gameLoop() {
        if (!this.isRunning) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    update() {
        if (this.gameOver) return;
        const playTop = this.HUD_H;
        const playBot = this.canvas.height;

        // Player
        if (this.keys.up && this.player.y > playTop) this.player.y -= this.paddleSpeed;
        if (this.keys.down && this.player.y + this.paddleH < playBot) this.player.y += this.paddleSpeed;

        // AI (tracks ball with slight lag)
        const aiCenter = this.ai.y + this.paddleH / 2;
        const aiSpeed = 1.2;
        if (aiCenter < this.ball.y - 2) this.ai.y = Math.min(this.ai.y + aiSpeed, playBot - this.paddleH);
        else if (aiCenter > this.ball.y + 2) this.ai.y = Math.max(this.ai.y - aiSpeed, playTop);

        // Ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;

        // Top/bottom bounce
        if (this.ball.y - this.ball.r < playTop) { this.ball.y = playTop + this.ball.r; this.ball.vy = Math.abs(this.ball.vy); this._sound('wall'); }
        if (this.ball.y + this.ball.r > playBot) { this.ball.y = playBot - this.ball.r; this.ball.vy = -Math.abs(this.ball.vy); this._sound('wall'); }

        // Player paddle collision
        if (this.ball.vx < 0 &&
            this.ball.x - this.ball.r < this.player.x + this.paddleW &&
            this.ball.x + this.ball.r > this.player.x &&
            this.ball.y + this.ball.r > this.player.y &&
            this.ball.y - this.ball.r < this.player.y + this.paddleH) {
            this.ball.x = this.player.x + this.paddleW + this.ball.r;
            const speed = Math.min(Math.abs(this.ball.vx) * 1.05, 3);
            this.ball.vx = speed;
            const hit = (this.ball.y - this.player.y) / this.paddleH;
            this.ball.vy = (hit - 0.5) * 4.5;
            this._sound('paddle');
        }

        // AI paddle collision
        if (this.ball.vx > 0 &&
            this.ball.x + this.ball.r > this.ai.x &&
            this.ball.x - this.ball.r < this.ai.x + this.paddleW &&
            this.ball.y + this.ball.r > this.ai.y &&
            this.ball.y - this.ball.r < this.ai.y + this.paddleH) {
            this.ball.x = this.ai.x - this.ball.r;
            const speed = Math.min(Math.abs(this.ball.vx) * 1.05, 3);
            this.ball.vx = -speed;
            const hit = (this.ball.y - this.ai.y) / this.paddleH;
            this.ball.vy = (hit - 0.5) * 4.5;
            this._sound('paddle');
        }

        // Score
        if (this.ball.x < 0) {
            this.aiScore++; this._sound('lose');
            if (this.aiScore >= this.winScore) { this.gameOver = true; this.winner = 'CPU'; this._sound('gameover'); }
            else this._resetBall();
        }
        if (this.ball.x > this.canvas.width) {
            this.playerScore++; this._sound('win');
            if (this.playerScore >= this.winScore) { this.gameOver = true; this.winner = 'YOU'; }
            else this._resetBall();
        }
    }

    draw() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;

        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, W, H);

        // HUD
        ctx.fillStyle = '#92CC41';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${this.playerScore}   PONG   ${this.aiScore}`, W / 2, 10);

        // Dashed center line
        ctx.strokeStyle = '#2a2a2a';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(W / 2, this.HUD_H); ctx.lineTo(W / 2, H); ctx.stroke();
        ctx.setLineDash([]);

        // Paddles
        ctx.fillStyle = '#92CC41';
        ctx.fillRect(this.player.x, this.player.y, this.paddleW, this.paddleH);
        ctx.fillRect(this.ai.x, this.ai.y, this.paddleW, this.paddleH);

        // Ball
        ctx.beginPath();
        ctx.arc(this.ball.x, this.ball.y, this.ball.r, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();

        // Controls hint (small, bottom right)
        ctx.fillStyle = '#333';
        ctx.font = '6px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('W/S or ↑↓  ESC MENU', W - 3, H - 2);
        ctx.textAlign = 'left';

        if (this.gameOver) {
            ctx.fillStyle = 'rgba(0,0,0,0.65)';
            ctx.fillRect(0, this.HUD_H, W, H - this.HUD_H);
            ctx.fillStyle = this.winner === 'YOU' ? '#92CC41' : '#E53B44';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${this.winner} WIN${this.winner === 'YOU' ? '' : 'S'}!`, W / 2, H / 2 - 6);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '8px monospace';
            ctx.fillText('SPACE TO PLAY AGAIN', W / 2, H / 2 + 10);
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
            gain.gain.value = 0.07;
            const map = { paddle: [220, 'square'], wall: [150, 'triangle'], win: [440, 'sine'], lose: [100, 'sawtooth'], gameover: [60, 'sawtooth'] };
            const [freq, type2] = map[type] || [200, 'square'];
            osc.frequency.value = freq; osc.type = type2;
            osc.start(); osc.stop(this.audioContext.currentTime + 0.1);
        } catch (_) {}
    }

    playSound(type) { this._sound(type); }
}
