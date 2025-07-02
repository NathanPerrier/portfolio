export class ArcadeGame {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isRunning = false;
        this.animationId = null;
        
        // Game state
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.gameWon = false;
        
        // Paddle
        this.paddle = {
            x: 0,
            y: 0,
            width: 50,
            height: 6,
            speed: 2.5,
            color: '#92CC41'
        };
        
        // Ball
        this.ball = {
            x: 0,
            y: 0,
            radius: 4,
            vx: 1.5,
            vy: -1.5,
            color: '#FFFFFF'
        };
        
        // Bricks
        this.bricks = [];
        this.brickRows = 2;
        this.brickCols = 8;
        this.brickWidth = 35;
        this.brickHeight = 8;
        this.brickPadding = 3;
        this.brickOffsetTop = 20;
        this.brickOffsetLeft = 15;
        
        // Controls
        this.keys = {
            left: false,
            right: false
        };
        
        // Sound effects (using Web Audio API for retro sounds)
        this.audioContext = null;
    }
    
    init(canvasId) {
        // If canvas is already set (from texture approach), skip DOM lookup
        if (!this.canvas) {
            this.canvas = document.getElementById(canvasId);
            if (!this.canvas) {
                console.error('Canvas not found:', canvasId);
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            this.canvas.width = 240;
            this.canvas.height = 180;
        }
        
        // Initialize audio context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Set up controls
        this.setupControls();
        
        // Initialize game
        this.reset();
    }
    
    setupControls() {
        this.keydownHandler = (e) => {
            // Only handle keys if the game is running
            if (!this.isRunning) return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.keys.left = true;
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                this.keys.right = true;
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === ' ' && this.gameOver) {
                this.reset();
                this.start();
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        this.keyupHandler = (e) => {
            // Only handle keys if the game is running
            if (!this.isRunning) return;
            
            if (e.key === 'ArrowLeft' || e.key === 'a') {
                this.keys.left = false;
                e.preventDefault();
                e.stopPropagation();
            } else if (e.key === 'ArrowRight' || e.key === 'd') {
                this.keys.right = false;
                e.preventDefault();
                e.stopPropagation();
            }
        };
        
        document.addEventListener('keydown', this.keydownHandler);
        document.addEventListener('keyup', this.keyupHandler);
    }
    
    reset() {
        // Reset game state
        this.score = 0;
        this.lives = 3;
        this.gameOver = false;
        this.gameWon = false;
        
        // Reset paddle position
        this.paddle.x = this.canvas.width / 2 - this.paddle.width / 2;
        this.paddle.y = this.canvas.height - 15;
        
        // Reset ball position
        this.resetBall();
        
        // Create bricks
        this.createBricks();
    }
    
    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.paddle.y - 10;
        this.ball.vx = 1.5 * (Math.random() > 0.5 ? 1 : -1);
        this.ball.vy = -1.5;
    }
    
    createBricks() {
        this.bricks = [];
        const colors = ['#E53B44', '#FB922B', '#FFE762', '#92CC41', '#5FCDE4'];
        
        for (let r = 0; r < this.brickRows; r++) {
            this.bricks[r] = [];
            for (let c = 0; c < this.brickCols; c++) {
                this.bricks[r][c] = {
                    x: c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft,
                    y: r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop,
                    status: 1,
                    color: colors[r % colors.length]
                };
            }
        }
    }
    
    start() {
        if (!this.isRunning && this.canvas && this.ctx) {
            this.isRunning = true;
            this.gameLoop();
        }
    }
    
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        
        // Reset keys state
        this.keys.left = false;
        this.keys.right = false;
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        this.update();
        this.draw();
        
        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        if (this.gameOver || this.gameWon) return;
        
        // Update paddle
        if (this.keys.left && this.paddle.x > 0) {
            this.paddle.x -= this.paddle.speed;
        }
        if (this.keys.right && this.paddle.x < this.canvas.width - this.paddle.width) {
            this.paddle.x += this.paddle.speed;
        }
        
        // Update ball
        this.ball.x += this.ball.vx;
        this.ball.y += this.ball.vy;
        
        // Ball collision with walls
        if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
            this.ball.vx = -this.ball.vx;
            this.playSound('wall');
        }
        if (this.ball.y - this.ball.radius < 0) {
            this.ball.vy = -this.ball.vy;
            this.playSound('wall');
        }
        
        // Ball collision with paddle
        if (
            this.ball.y + this.ball.radius > this.paddle.y &&
            this.ball.y - this.ball.radius < this.paddle.y + this.paddle.height &&
            this.ball.x > this.paddle.x &&
            this.ball.x < this.paddle.x + this.paddle.width
        ) {
            // Only bounce if ball is moving downward
            if (this.ball.vy > 0) {
                // Position ball just above paddle to prevent multiple collisions
                this.ball.y = this.paddle.y - this.ball.radius;
                this.ball.vy = -Math.abs(this.ball.vy);
                
                // Add some spin based on where ball hits paddle
                const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
                this.ball.vx = 3 * (hitPos - 0.5);
                
                this.playSound('paddle');
            }
        }
        
        // Ball collision with bricks
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                const brick = this.bricks[r][c];
                if (brick.status === 1) {
                    if (
                        this.ball.x > brick.x &&
                        this.ball.x < brick.x + this.brickWidth &&
                        this.ball.y > brick.y &&
                        this.ball.y < brick.y + this.brickHeight
                    ) {
                        this.ball.vy = -this.ball.vy;
                        brick.status = 0;
                        this.score += 10;
                        this.playSound('brick');
                        
                        // Check if all bricks are destroyed
                        if (this.checkWin()) {
                            this.gameWon = true;
                            this.playSound('win');
                        }
                    }
                }
            }
        }
        
        // Ball out of bounds
        if (this.ball.y + this.ball.radius > this.canvas.height) {
            this.lives--;
            this.playSound('lose');
            
            if (this.lives > 0) {
                this.resetBall();
            } else {
                this.gameOver = true;
                this.playSound('gameOver');
            }
        }
    }
    
    checkWin() {
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                if (this.bricks[r][c].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }
    
    draw() {
        // Clear canvas with retro background
        this.ctx.fillStyle = '#0A0A0A';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw border
        this.ctx.strokeStyle = '#FFFFFF';
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
        
        // Draw paddle
        this.ctx.fillStyle = this.paddle.color;
        this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
        
        // Draw ball
        this.ctx.beginPath();
        this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = this.ball.color;
        this.ctx.fill();
        this.ctx.closePath();
        
        // Draw bricks
        for (let r = 0; r < this.brickRows; r++) {
            for (let c = 0; c < this.brickCols; c++) {
                if (this.bricks[r][c].status === 1) {
                    const brick = this.bricks[r][c];
                    this.ctx.fillStyle = brick.color;
                    this.ctx.fillRect(brick.x, brick.y, this.brickWidth, this.brickHeight);
                }
            }
        }
        
        // Draw UI
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = 'bold 8px monospace';
        this.ctx.fillText(`SCORE: ${this.score}`, 5, 12);
        this.ctx.fillText(`LIVES: ${this.lives}`, this.canvas.width - 45, 12);
        
        // Draw game over or win message
        if (this.gameOver) {
            this.ctx.fillStyle = '#E53B44';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = 'bold 8px monospace';
            this.ctx.fillText('PRESS SPACE TO PLAY AGAIN', this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.textAlign = 'left';
        } else if (this.gameWon) {
            this.ctx.fillStyle = '#92CC41';
            this.ctx.font = 'bold 14px monospace';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = 'bold 8px monospace';
            this.ctx.fillText('PRESS SPACE TO PLAY AGAIN', this.canvas.width / 2, this.canvas.height / 2 + 20);
            this.ctx.textAlign = 'left';
        }
    }
    
    playSound(type) {
        if (!this.audioContext) return;
        
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        gainNode.gain.value = 0.1;
        
        switch(type) {
            case 'paddle':
                oscillator.frequency.value = 200;
                oscillator.type = 'square';
                break;
            case 'brick':
                oscillator.frequency.value = 400;
                oscillator.type = 'square';
                break;
            case 'wall':
                oscillator.frequency.value = 150;
                oscillator.type = 'triangle';
                break;
            case 'lose':
                oscillator.frequency.value = 100;
                oscillator.type = 'sawtooth';
                break;
            case 'win':
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                break;
            case 'gameOver':
                oscillator.frequency.value = 50;
                oscillator.type = 'sawtooth';
                break;
        }
        
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.1);
    }
}