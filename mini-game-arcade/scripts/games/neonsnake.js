/**
 * Game 6: Neon Snake DX (Modern cyber snake with powerups and glowing trails)
 */
class NeonSnakeGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('neonsnake') : 0;

    this.gridSize = 20; // 20x20 grid
    this.tileCount = 20;
    this.snake = [];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.food = { x: 15, y: 10, type: 'normal' };
    this.goldenFood = null;
    this.goldenTimer = 0;
    this.particles = [];
    this.stepTimer = 0;
    this.stepInterval = 7; // frames per step (decreases with score)

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper neonsnake-wrapper">
        <canvas class="game-canvas" id="neonsnake-canvas"></canvas>
        <div class="game-ui-overlay" id="neonsnake-overlay">
          <div class="start-screen" id="neonsnake-start">
            <h2 class="neon-title">NEON SNAKE DX</h2>
            <p class="game-instruction">Use <strong>Arrow Keys</strong> or <strong>WASD</strong> to steer.<br>Collect neon dots & golden apples!</p>
            <div class="high-score-tag">RECORD: ${this.highScore} PTS</div>
            <button class="arcade-btn-primary" id="ns-play-btn">START HUNT</button>
          </div>
          <div class="hud" id="neonsnake-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">SCORE:</span> <span id="ns-score">0</span></div>
            <div class="hud-item"><span class="hud-label">LENGTH:</span> <span id="ns-length">3</span></div>
          </div>
          <div class="snake-dpad" id="ns-touch-dpad" style="display: none;">
            <button class="dpad-btn dpad-up" data-dir="up">▲</button>
            <div class="dpad-mid">
              <button class="dpad-btn dpad-left" data-dir="left">◀</button>
              <button class="dpad-btn dpad-down" data-dir="down">▼</button>
              <button class="dpad-btn dpad-right" data-dir="right">▶</button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('neonsnake-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.bindEvents();
    this.renderInitial();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const size = Math.min(480, rect.width || 420, window.innerHeight - 240 || 420);
    this.canvas.width = size;
    this.canvas.height = size;
    this.gridSize = size / this.tileCount;
  }

  bindEvents() {
    this.boundKeyDown = (e) => {
      if (['ArrowUp', 'KeyW'].includes(e.code) && this.dir.y === 0) {
        e.preventDefault();
        this.nextDir = { x: 0, y: -1 };
      } else if (['ArrowDown', 'KeyS'].includes(e.code) && this.dir.y === 0) {
        e.preventDefault();
        this.nextDir = { x: 0, y: 1 };
      } else if (['ArrowLeft', 'KeyA'].includes(e.code) && this.dir.x === 0) {
        e.preventDefault();
        this.nextDir = { x: -1, y: 0 };
      } else if (['ArrowRight', 'KeyD'].includes(e.code) && this.dir.x === 0) {
        e.preventDefault();
        this.nextDir = { x: 1, y: 0 };
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    // DPad
    const dpadBtns = this.container.querySelectorAll('.dpad-btn');
    dpadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const d = btn.getAttribute('data-dir');
        if (d === 'up' && this.dir.y === 0) this.nextDir = { x: 0, y: -1 };
        if (d === 'down' && this.dir.y === 0) this.nextDir = { x: 0, y: 1 };
        if (d === 'left' && this.dir.x === 0) this.nextDir = { x: -1, y: 0 };
        if (d === 'right' && this.dir.x === 0) this.nextDir = { x: 1, y: 0 };
      });
    });

    document.getElementById('ns-play-btn').addEventListener('click', () => {
      this.start();
    });
  }

  start() {
    document.getElementById('neonsnake-start').style.display = 'none';
    document.getElementById('neonsnake-hud').style.display = 'flex';
    document.getElementById('ns-touch-dpad').style.display = 'flex';
    this.reset();
    this.running = true;
    this.loop();
  }

  reset() {
    this.score = 0;
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    this.dir = { x: 1, y: 0 };
    this.nextDir = { x: 1, y: 0 };
    this.goldenFood = null;
    this.particles = [];
    this.stepTimer = 0;
    this.stepInterval = 7;
    this.spawnFood();
    this.updateHUD();
  }

  spawnFood() {
    let valid = false;
    let newX, newY;
    while (!valid) {
      newX = Math.floor(Math.random() * this.tileCount);
      newY = Math.floor(Math.random() * this.tileCount);
      valid = !this.snake.some(s => s.x === newX && s.y === newY);
    }
    this.food = { x: newX, y: newY, type: 'normal' };

    // 25% chance of spawning a golden food item
    if (Math.random() < 0.25 && !this.goldenFood) {
      let gValid = false;
      let gx, gy;
      while (!gValid) {
        gx = Math.floor(Math.random() * this.tileCount);
        gy = Math.floor(Math.random() * this.tileCount);
        gValid = !this.snake.some(s => s.x === gx && s.y === gy) && (gx !== newX || gy !== newY);
      }
      this.goldenFood = { x: gx, y: gy, life: 180 };
    }
  }

  updateHUD() {
    const sc = document.getElementById('ns-score');
    const le = document.getElementById('ns-length');
    if (sc) sc.textContent = this.score;
    if (le) le.textContent = this.snake.length;
  }

  update() {
    if (!this.running) return;

    // Update golden food timer
    if (this.goldenFood) {
      this.goldenFood.life--;
      if (this.goldenFood.life <= 0) {
        this.goldenFood = null;
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    // Step pacing
    this.stepTimer++;
    if (this.stepTimer < this.stepInterval) return;
    this.stepTimer = 0;

    this.dir = { ...this.nextDir };
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    // Wall collision
    if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
      this.die();
      return;
    }

    // Self collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      this.die();
      return;
    }

    this.snake.unshift(head);

    // Food collision
    let ate = false;
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      ate = true;
      if (window.arcadeAudio) window.arcadeAudio.playEat(false);
      this.burstParticles(head.x, head.y, '#00f3ff');
      this.spawnFood();
      this.stepInterval = Math.max(3.5, 7 - Math.floor(this.score / 60));
    } else if (this.goldenFood && head.x === this.goldenFood.x && head.y === this.goldenFood.y) {
      this.score += 50;
      ate = true;
      if (window.arcadeAudio) window.arcadeAudio.playEat(true);
      this.burstParticles(head.x, head.y, '#ffe600');
      this.goldenFood = null;
    }

    if (!ate) {
      this.snake.pop();
    }

    this.updateHUD();
  }

  burstParticles(gx, gy, color) {
    const px = gx * this.gridSize + this.gridSize / 2;
    const py = gy * this.gridSize + this.gridSize / 2;
    for (let i = 0; i < 14; i++) {
      this.particles.push({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        life: 1,
        color: color,
        size: Math.random() * 3 + 2
      });
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const gs = this.gridSize;

    // Dark cyber grid
    ctx.fillStyle = '#060712';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.tileCount; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gs, 0);
      ctx.lineTo(i * gs, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * gs);
      ctx.lineTo(w, i * gs);
      ctx.stroke();
    }

    // Draw Particles
    this.particles.forEach(p => {
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Normal Food (pulsing cyan energy orb)
    ctx.save();
    ctx.fillStyle = '#00f3ff';
    ctx.shadowBlur = 14;
    ctx.shadowColor = '#00f3ff';
    ctx.beginPath();
    ctx.arc(this.food.x * gs + gs / 2, this.food.y * gs + gs / 2, gs * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Golden Food
    if (this.goldenFood) {
      ctx.save();
      ctx.fillStyle = '#ffe600';
      ctx.shadowBlur = 18;
      ctx.shadowColor = '#ffe600';
      ctx.beginPath();
      ctx.arc(this.goldenFood.x * gs + gs / 2, this.goldenFood.y * gs + gs / 2, gs * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Draw Snake Body
    this.snake.forEach((s, idx) => {
      ctx.save();
      const isHead = idx === 0;
      const x = s.x * gs;
      const y = s.y * gs;

      if (isHead) {
        ctx.fillStyle = '#00ff88';
        ctx.shadowBlur = 16;
        ctx.shadowColor = '#00ff88';
      } else {
        const ratio = 1 - (idx / this.snake.length) * 0.6;
        ctx.fillStyle = `rgba(0, 243, 255, ${ratio})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#00f3ff';
      }

      ctx.fillRect(x + 2, y + 2, gs - 4, gs - 4);

      if (isHead) {
        // Snake eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 5, y + 5, 3, 3);
        ctx.fillRect(x + gs - 8, y + 5, 3, 3);
      }
      ctx.restore();
    });
  }

  loop() {
    if (!this.running) return;
    this.update();
    this.draw();
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  renderInitial() {
    this.draw();
  }

  die() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    if (window.arcadeAudio) {
      window.arcadeAudio.playHit();
      setTimeout(() => window.arcadeAudio.playGameOver(), 200);
    }

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('neonsnake', this.score, { length: this.snake.length }) : { isNewBest: false, earnedCoins: 15, best: this.score };

    this.showGameOverModal(result);
  }

  showGameOverModal(result) {
    const overlay = document.getElementById('neonsnake-overlay');
    const existing = document.getElementById('ns-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'ns-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="game-over-title">NEON CRASH</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">SCORE</span></div>
        <div class="stat-box"><span class="stat-val">${this.snake.length}</span><span class="stat-lbl">LENGTH</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="ns-retry-btn">PLAY AGAIN</button>
        <button class="arcade-btn-secondary" id="ns-share-btn">SHARE SCORE</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('ns-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.reset();
      this.running = true;
      this.loop();
    });

    document.getElementById('ns-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Neon Snake DX', `${this.score} pts (Len ${this.snake.length})`);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}

window.NeonSnakeGame = NeonSnakeGame;
