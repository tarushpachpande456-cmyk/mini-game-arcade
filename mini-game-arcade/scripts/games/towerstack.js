/**
 * Game 4: Tower Stacker (Precision block stacking with slice physics and combo arpeggio)
 */
class TowerStackGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0;
    this.combo = 0;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('towerstack') : 0;

    this.blockHeight = 24;
    this.stack = [];
    this.fallingBlocks = [];
    this.currentBlock = null;
    this.direction = 1;
    this.speed = 3.2;
    this.cameraY = 0;
    this.targetCameraY = 0;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper towerstack-wrapper">
        <canvas class="game-canvas" id="towerstack-canvas"></canvas>
        <div class="game-ui-overlay" id="towerstack-overlay">
          <div class="start-screen" id="towerstack-start">
            <h2 class="neon-title">TOWER STACKER</h2>
            <p class="game-instruction">Tap screen, click, or press <strong>SPACE</strong> to drop block.<br>Time it perfectly to grow your stack!</p>
            <div class="high-score-tag">RECORD: ${this.highScore} FLOORS</div>
            <button class="arcade-btn-primary" id="ts-play-btn">START STACKING</button>
          </div>
          <div class="hud" id="towerstack-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">FLOORS:</span> <span id="ts-floors">0</span></div>
            <div class="hud-item"><span class="hud-label">COMBO:</span> <span id="ts-combo">x0</span></div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('towerstack-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.bindEvents();
    this.renderInitial();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.min(480, rect.width || 420);
    const height = Math.min(620, window.innerHeight - 190 || 540);
    this.canvas.width = width;
    this.canvas.height = height;
  }

  bindEvents() {
    this.boundHandleDrop = (e) => {
      if (e.type === 'keydown' && e.code !== 'Space') return;
      if (e.target && e.target.closest('#ts-play-btn')) return;
      if (e.type === 'keydown') e.preventDefault();
      this.dropBlock();
    };

    window.addEventListener('keydown', this.boundHandleDrop);
    this.canvas.addEventListener('click', this.boundHandleDrop);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.boundHandleDrop(e);
    }, { passive: false });

    document.getElementById('ts-play-btn').addEventListener('click', () => {
      this.start();
    });
  }

  getColor(index) {
    const hue = (index * 22) % 360;
    return `hsl(${hue}, 90%, 58%)`;
  }

  start() {
    document.getElementById('towerstack-start').style.display = 'none';
    document.getElementById('towerstack-hud').style.display = 'flex';
    this.reset();
    this.running = true;
    this.loop();
  }

  reset() {
    this.score = 0;
    this.combo = 0;
    this.speed = 3.2;
    this.stack = [];
    this.fallingBlocks = [];
    this.cameraY = 0;
    this.targetCameraY = 0;

    // Base foundation block
    const baseWidth = 180;
    const baseX = (this.canvas.width - baseWidth) / 2;
    const baseY = this.canvas.height - 80;

    this.stack.push({
      x: baseX,
      y: baseY,
      width: baseWidth,
      color: this.getColor(0)
    });

    this.spawnNextBlock();
    this.updateHUD();
  }

  spawnNextBlock() {
    const topBlock = this.stack[this.stack.length - 1];
    const newY = topBlock.y - this.blockHeight;
    const width = topBlock.width;

    this.currentBlock = {
      x: this.direction > 0 ? -width : this.canvas.width,
      y: newY,
      width: width,
      color: this.getColor(this.stack.length)
    };

    this.speed = Math.min(8, 3.2 + this.score * 0.12);

    // Adjust camera target
    const currentTopY = this.currentBlock.y - this.cameraY;
    if (currentTopY < this.canvas.height * 0.45) {
      this.targetCameraY += (this.canvas.height * 0.45 - currentTopY);
    }
  }

  dropBlock() {
    if (!this.running || !this.currentBlock) return;

    const topBlock = this.stack[this.stack.length - 1];
    const diff = this.currentBlock.x - topBlock.x;
    const tolerance = 4; // Perfect drop snap range

    if (Math.abs(diff) <= tolerance) {
      // Perfect drop!
      this.currentBlock.x = topBlock.x;
      this.combo++;
      if (this.combo >= 3) {
        // Expand block reward
        this.currentBlock.width = Math.min(220, this.currentBlock.width + 12);
        this.currentBlock.x -= 6;
      }
      if (window.arcadeAudio) window.arcadeAudio.playStack(this.combo, true);
    } else if (this.currentBlock.x < topBlock.x) {
      // Overhang on the left
      const overhang = topBlock.x - this.currentBlock.x;
      if (overhang >= this.currentBlock.width) {
        // Complete miss!
        this.missFall(this.currentBlock);
        return;
      }
      // Slice left overhang
      this.fallingBlocks.push({
        x: this.currentBlock.x,
        y: this.currentBlock.y,
        width: overhang,
        color: this.currentBlock.color,
        vy: 2,
        rot: 0,
        vrot: -0.05
      });
      this.currentBlock.x = topBlock.x;
      this.currentBlock.width -= overhang;
      this.combo = 0;
      if (window.arcadeAudio) window.arcadeAudio.playStack(0, false);
    } else {
      // Overhang on the right
      const overhang = (this.currentBlock.x + this.currentBlock.width) - (topBlock.x + topBlock.width);
      if (overhang >= this.currentBlock.width) {
        // Complete miss!
        this.missFall(this.currentBlock);
        return;
      }
      // Slice right overhang
      this.fallingBlocks.push({
        x: topBlock.x + topBlock.width,
        y: this.currentBlock.y,
        width: overhang,
        color: this.currentBlock.color,
        vy: 2,
        rot: 0,
        vrot: 0.05
      });
      this.currentBlock.width -= overhang;
      this.combo = 0;
      if (window.arcadeAudio) window.arcadeAudio.playStack(0, false);
    }

    this.stack.push({ ...this.currentBlock });
    this.score++;
    this.updateHUD();
    this.direction *= -1;
    this.spawnNextBlock();
  }

  missFall(block) {
    this.fallingBlocks.push({
      x: block.x,
      y: block.y,
      width: block.width,
      color: block.color,
      vy: 2,
      rot: 0,
      vrot: 0.08
    });
    this.currentBlock = null;
    this.die();
  }

  updateHUD() {
    const f = document.getElementById('ts-floors');
    const c = document.getElementById('ts-combo');
    if (f) f.textContent = this.score;
    if (c) c.textContent = this.combo > 0 ? `x${this.combo} 🔥` : 'x0';
  }

  update() {
    if (!this.running) return;

    // Smooth camera interpolation
    this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

    // Move current oscillating block
    if (this.currentBlock) {
      this.currentBlock.x += this.speed * this.direction;
      if (this.currentBlock.x + this.currentBlock.width > this.canvas.width + 40) {
        this.direction = -1;
      } else if (this.currentBlock.x < -40) {
        this.direction = 1;
      }
    }

    // Update falling sliced blocks
    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      const fb = this.fallingBlocks[i];
      fb.vy += 0.5;
      fb.y += fb.vy;
      fb.rot += fb.vrot;

      if (fb.y - this.cameraY > this.canvas.height + 100) {
        this.fallingBlocks.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dynamic space gradient deepening as tower goes higher
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#040510');
    bgGrad.addColorStop(0.5, '#0b0f24');
    bgGrad.addColorStop(1, '#180a29');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(0, this.cameraY);

    // Draw stacked blocks
    this.stack.forEach((b, idx) => {
      ctx.fillStyle = b.color;
      ctx.shadowBlur = 10;
      ctx.shadowColor = b.color;
      ctx.fillRect(b.x, b.y, b.width, this.blockHeight);

      // Neon 3D bevel top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fillRect(b.x, b.y, b.width, 3);
    });

    // Draw current moving block
    if (this.currentBlock) {
      ctx.fillStyle = this.currentBlock.color;
      ctx.shadowBlur = 16;
      ctx.shadowColor = this.currentBlock.color;
      ctx.fillRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.width, this.blockHeight);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(this.currentBlock.x, this.currentBlock.y, this.currentBlock.width, 3);
    }

    // Draw falling sliced debris
    this.fallingBlocks.forEach(fb => {
      ctx.save();
      ctx.translate(fb.x + fb.width / 2, fb.y + this.blockHeight / 2);
      ctx.rotate(fb.rot);
      ctx.fillStyle = fb.color;
      ctx.shadowBlur = 8;
      ctx.shadowColor = fb.color;
      ctx.fillRect(-fb.width / 2, -this.blockHeight / 2, fb.width, this.blockHeight);
      ctx.restore();
    });

    ctx.restore();
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

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('towerstack', this.score) : { isNewBest: false, earnedCoins: 12, best: this.score };

    this.showGameOverModal(result);
  }

  showGameOverModal(result) {
    const overlay = document.getElementById('towerstack-overlay');
    const existing = document.getElementById('ts-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'ts-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="game-over-title">TOWER COLLAPSED</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">FLOORS</span></div>
        <div class="stat-box"><span class="stat-val">${result.best}</span><span class="stat-lbl">BEST</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="ts-retry-btn">REBUILD TOWER</button>
        <button class="arcade-btn-secondary" id="ts-share-btn">SHARE HEIGHT</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('ts-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.reset();
      this.running = true;
      this.loop();
    });

    document.getElementById('ts-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Tower Stacker', `${this.score} Floors`);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.boundHandleDrop);
  }
}

window.TowerStackGame = TowerStackGame;
