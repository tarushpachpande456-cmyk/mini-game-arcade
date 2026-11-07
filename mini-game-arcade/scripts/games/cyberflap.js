/**
 * Game 1: Cyber Flap (Flappy Bird style with neon synth aesthetic)
 */
class CyberFlapGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0;
    this.coins = 0;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('cyberflap') : 0;

    this.bird = {
      x: 80,
      y: 200,
      radius: 14,
      velocity: 0,
      gravity: 0.38,
      jump: -6.8,
      rotation: 0
    };

    this.pipes = [];
    this.particles = [];
    this.bonusCoins = [];
    this.pipeWidth = 52;
    this.pipeGap = 135;
    this.spawnTimer = 0;
    this.speed = 2.4;
    this.stars = [];

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper cyberflap-wrapper">
        <canvas class="game-canvas" id="cyberflap-canvas"></canvas>
        <div class="game-ui-overlay" id="cyberflap-overlay">
          <div class="start-screen" id="cyberflap-start">
            <h2 class="neon-title">CYBER FLAP</h2>
            <p class="game-instruction">Tap screen, click, or press <strong>SPACE</strong> to boost</p>
            <div class="high-score-tag">BEST: ${this.highScore}</div>
            <button class="arcade-btn-primary" id="cyberflap-play-btn">PRESS START</button>
          </div>
          <div class="hud" id="cyberflap-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">SCORE:</span> <span id="cf-score">0</span></div>
            <div class="hud-item"><span class="hud-label">COINS:</span> <span id="cf-coins">0</span></div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('cyberflap-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Generate background stars
    for (let i = 0; i < 45; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        size: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.8 + 0.2,
        opacity: Math.random() * 0.7 + 0.3
      });
    }

    this.bindEvents();
    this.renderInitial();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.min(480, rect.width || 420);
    const height = Math.min(640, window.innerHeight - 180 || 560);
    this.canvas.width = width;
    this.canvas.height = height;
  }

  bindEvents() {
    this.boundHandleInput = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.type === 'click' || e.type === 'touchstart') {
        if (e.target && e.target.closest('#cyberflap-play-btn')) return; // let play button click handle start
        if (e.type !== 'click' && e.type !== 'touchstart' && e.code === 'Space') e.preventDefault();
        this.flap();
      }
    };

    window.addEventListener('keydown', this.boundHandleInput);
    this.canvas.addEventListener('click', this.boundHandleInput);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.boundHandleInput(e);
    }, { passive: false });

    const playBtn = document.getElementById('cyberflap-play-btn');
    if (playBtn) {
      playBtn.addEventListener('click', () => this.start());
    }
  }

  start() {
    document.getElementById('cyberflap-start').style.display = 'none';
    document.getElementById('cyberflap-hud').style.display = 'flex';
    this.reset();
    this.running = true;
    this.loop();
  }

  reset() {
    this.bird.x = this.canvas.width * 0.25;
    this.bird.y = this.canvas.height * 0.45;
    this.bird.velocity = 0;
    this.bird.rotation = 0;
    this.pipes = [];
    this.particles = [];
    this.bonusCoins = [];
    this.score = 0;
    this.coins = 0;
    this.spawnTimer = 0;
    this.speed = 2.4;
    this.updateHUD();
  }

  flap() {
    if (!this.running) return;
    this.bird.velocity = this.bird.jump;
    if (window.arcadeAudio) window.arcadeAudio.playFlap();

    // Spawn thruster particles
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: this.bird.x - 12,
        y: this.bird.y + (Math.random() * 8 - 4),
        vx: -(Math.random() * 3 + 2),
        vy: Math.random() * 2 - 1,
        life: 1,
        color: Math.random() > 0.5 ? '#00f3ff' : '#ff007f',
        size: Math.random() * 3.5 + 1.5
      });
    }
  }

  updateHUD() {
    const sc = document.getElementById('cf-score');
    const co = document.getElementById('cf-coins');
    if (sc) sc.textContent = this.score;
    if (co) co.textContent = this.coins;
  }

  spawnPipe() {
    const minHeight = 60;
    const maxHeight = this.canvas.height - this.pipeGap - minHeight;
    const topHeight = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    const bottomY = topHeight + this.pipeGap;

    this.pipes.push({
      x: this.canvas.width + 10,
      topHeight: topHeight,
      bottomY: bottomY,
      passed: false
    });

    // 40% chance of a bonus coin floating in the middle
    if (Math.random() < 0.45) {
      this.bonusCoins.push({
        x: this.canvas.width + 10 + this.pipeWidth / 2,
        y: topHeight + this.pipeGap / 2,
        radius: 8,
        collected: false,
        pulse: 0
      });
    }
  }

  update() {
    if (!this.running) return;

    // Bird physics
    this.bird.velocity += this.bird.gravity;
    this.bird.y += this.bird.velocity;
    this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.velocity * 0.08));

    // Ground and ceiling collision
    if (this.bird.y + this.bird.radius >= this.canvas.height - 10) {
      this.bird.y = this.canvas.height - 10 - this.bird.radius;
      this.die();
      return;
    }
    if (this.bird.y - this.bird.radius <= 0) {
      this.bird.y = this.bird.radius;
      this.bird.velocity = 0;
    }

    // Move stars
    this.stars.forEach(s => {
      s.x -= s.speed;
      if (s.x < 0) s.x = this.canvas.width;
    });

    // Pipe management
    this.spawnTimer++;
    if (this.spawnTimer >= 105) {
      this.spawnPipe();
      this.spawnTimer = 0;
    }

    // Speed progression
    this.speed = Math.min(4.2, 2.4 + this.score * 0.04);

    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const p = this.pipes[i];
      p.x -= this.speed;

      // Scoring
      if (!p.passed && p.x + this.pipeWidth < this.bird.x) {
        p.passed = true;
        this.score++;
        this.updateHUD();
        if (window.arcadeAudio) window.arcadeAudio.playScore(false);
      }

      // Bird collision with pipes
      const inX = this.bird.x + this.bird.radius > p.x && this.bird.x - this.bird.radius < p.x + this.pipeWidth;
      const hitTop = this.bird.y - this.bird.radius < p.topHeight;
      const hitBottom = this.bird.y + this.bird.radius > p.bottomY;

      if (inX && (hitTop || hitBottom)) {
        this.die();
        return;
      }

      // Remove off-screen pipes
      if (p.x + this.pipeWidth < -20) {
        this.pipes.splice(i, 1);
      }
    }

    // Bonus Coins
    for (let i = this.bonusCoins.length - 1; i >= 0; i--) {
      const c = this.bonusCoins[i];
      c.x -= this.speed;
      c.pulse += 0.08;

      // Check pickup
      const dx = this.bird.x - c.x;
      const dy = this.bird.y - c.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.bird.radius + c.radius) {
        this.coins++;
        this.score += 2;
        this.updateHUD();
        if (window.arcadeAudio) window.arcadeAudio.playScore(true);
        // Coin burst particles
        for (let p = 0; p < 10; p++) {
          this.particles.push({
            x: c.x,
            y: c.y,
            vx: (Math.random() - 0.5) * 5,
            vy: (Math.random() - 0.5) * 5,
            life: 1,
            color: '#ffe600',
            size: Math.random() * 3 + 2
          });
        }
        this.bonusCoins.splice(i, 1);
        continue;
      }

      if (c.x < -20) {
        this.bonusCoins.splice(i, 1);
      }
    }

    // Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark cyberpunk background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#060713');
    bgGrad.addColorStop(0.7, '#0d1027');
    bgGrad.addColorStop(1, '#1b092b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Stars
    this.stars.forEach(s => {
      ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    });

    // Cyber grid ground
    ctx.fillStyle = '#05070e';
    ctx.fillRect(0, h - 14, w, 14);
    ctx.strokeStyle = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    ctx.beginPath();
    ctx.moveTo(0, h - 14);
    ctx.lineTo(w, h - 14);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Pipes with neon glow
    this.pipes.forEach(p => {
      // Top pipe
      const topGrad = ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
      topGrad.addColorStop(0, '#00f3ff');
      topGrad.addColorStop(0.5, '#0077aa');
      topGrad.addColorStop(1, '#00f3ff');

      ctx.fillStyle = topGrad;
      ctx.fillRect(p.x, 0, this.pipeWidth, p.topHeight);

      // Top pipe cap
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(p.x - 4, p.topHeight - 14, this.pipeWidth + 8, 14);

      // Bottom pipe
      const btmGrad = ctx.createLinearGradient(p.x, 0, p.x + this.pipeWidth, 0);
      btmGrad.addColorStop(0, '#ff007f');
      btmGrad.addColorStop(0.5, '#990044');
      btmGrad.addColorStop(1, '#ff007f');

      ctx.fillStyle = btmGrad;
      ctx.fillRect(p.x, p.bottomY, this.pipeWidth, h - p.bottomY - 14);

      // Bottom pipe cap
      ctx.fillStyle = '#ff007f';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#ff007f';
      ctx.fillRect(p.x - 4, p.bottomY, this.pipeWidth + 8, 14);
      ctx.shadowBlur = 0;
    });

    // Draw Bonus Coins
    this.bonusCoins.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y + Math.sin(c.pulse) * 3);
      ctx.fillStyle = '#ffe600';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffe600';
      ctx.beginPath();
      ctx.arc(0, 0, c.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0);
      ctx.restore();
    });

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

    // Draw Cyber Bird
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    ctx.rotate(this.bird.rotation);

    // Glowing Neon Ship/Bird Body
    ctx.shadowBlur = 18;
    ctx.shadowColor = '#00f3ff';
    ctx.fillStyle = '#00f3ff';

    // Aerodynamic cyber shuttle polygon
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-12, -10);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-12, 10);
    ctx.closePath();
    ctx.fill();

    // Core glow cockpit
    ctx.fillStyle = '#ff007f';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ff007f';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

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

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('cyberflap', this.score, { coins: this.coins }) : { isNewBest: false, earnedCoins: 10, best: this.score };

    this.showGameOverModal(result);
  }

  showGameOverModal(result) {
    const overlay = document.getElementById('cyberflap-overlay');
    const existing = document.getElementById('cyberflap-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'cyberflap-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="game-over-title">SYSTEM OFFLINE</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-val">${this.score}</span>
          <span class="stat-lbl">SCORE</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">${result.best}</span>
          <span class="stat-lbl">BEST</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">+${result.earnedCoins}</span>
          <span class="stat-lbl">COINS</span>
        </div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="cf-retry-btn">PLAY AGAIN</button>
        <button class="arcade-btn-secondary" id="cf-share-btn">SHARE SCORE</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('cf-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.reset();
      this.running = true;
      this.loop();
    });

    document.getElementById('cf-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Cyber Flap', this.score);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.boundHandleInput);
  }
}

window.CyberFlapGame = CyberFlapGame;
