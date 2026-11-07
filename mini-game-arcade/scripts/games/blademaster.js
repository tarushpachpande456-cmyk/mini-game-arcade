/**
 * Game 5: Blade Master (Knife Hit style rotating target challenge with boss stages)
 */
class BladeMasterGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0;
    this.stage = 1;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('blademaster') : 0;

    this.wheel = {
      x: 0,
      y: 0,
      radius: 75,
      angle: 0,
      speed: 0.03,
      speedTarget: 0.03,
      changeTimer: 0,
      isBoss: false
    };

    this.knivesNeeded = 7;
    this.knivesLeft = 7;
    this.embeddedKnives = []; // angles in radians
    this.flyingKnife = null;
    this.apples = []; // { angle, collected }
    this.particles = [];
    this.shake = 0;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper blademaster-wrapper">
        <canvas class="game-canvas" id="blademaster-canvas"></canvas>
        <div class="game-ui-overlay" id="blademaster-overlay">
          <div class="start-screen" id="blademaster-start">
            <h2 class="neon-title">BLADE MASTER</h2>
            <p class="game-instruction">Tap screen, click, or press <strong>SPACE</strong> to throw blades.<br>Never hit an existing blade!</p>
            <div class="high-score-tag">RECORD: ${this.highScore} PTS</div>
            <button class="arcade-btn-primary" id="bm-play-btn">START THROWING</button>
          </div>
          <div class="hud" id="blademaster-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">STAGE:</span> <span id="bm-stage">1</span></div>
            <div class="hud-item"><span class="hud-label">SCORE:</span> <span id="bm-score">0</span></div>
            <div class="hud-item"><span class="hud-label">BLADES:</span> <span id="bm-blades">7</span></div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('blademaster-canvas');
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

    this.wheel.x = width / 2;
    this.wheel.y = height * 0.35;
  }

  bindEvents() {
    this.boundHandleThrow = (e) => {
      if (e.type === 'keydown' && e.code !== 'Space') return;
      if (e.target && e.target.closest('#bm-play-btn')) return;
      if (e.type === 'keydown') e.preventDefault();
      this.throwKnife();
    };

    window.addEventListener('keydown', this.boundHandleThrow);
    this.canvas.addEventListener('click', this.boundHandleThrow);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.boundHandleThrow(e);
    }, { passive: false });

    document.getElementById('bm-play-btn').addEventListener('click', () => {
      this.start();
    });
  }

  start() {
    document.getElementById('blademaster-start').style.display = 'none';
    document.getElementById('blademaster-hud').style.display = 'flex';
    this.score = 0;
    this.stage = 1;
    this.setupStage();
    this.running = true;
    this.loop();
  }

  setupStage() {
    this.wheel.isBoss = (this.stage % 5 === 0);
    this.knivesNeeded = this.wheel.isBoss ? 9 : Math.min(10, 6 + Math.floor(this.stage / 2));
    this.knivesLeft = this.knivesNeeded;
    this.embeddedKnives = [];
    this.flyingKnife = null;
    this.apples = [];
    this.wheel.angle = 0;
    this.wheel.speed = (Math.random() > 0.5 ? 1 : -1) * (0.025 + this.stage * 0.004);

    // Initial pre-placed obstacle blades
    const preCount = this.wheel.isBoss ? 3 : Math.min(4, Math.floor((this.stage - 1) / 2));
    for (let i = 0; i < preCount; i++) {
      this.embeddedKnives.push((Math.PI * 2 / preCount) * i + Math.random() * 0.4);
    }

    // Apples / gems to slice
    const appleCount = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < appleCount; i++) {
      this.apples.push({
        angle: Math.random() * Math.PI * 2,
        collected: false
      });
    }

    this.updateHUD();
    if (this.wheel.isBoss && window.arcadeProfile) {
      window.arcadeProfile.showToast('⚠️ BOSS BATTLE: ERRATIC TARGET DETECTED!', 'warning');
    }
  }

  throwKnife() {
    if (!this.running || this.flyingKnife || this.knivesLeft <= 0) return;

    this.knivesLeft--;
    this.updateHUD();
    if (window.arcadeAudio) window.arcadeAudio.playBladeThrow();

    this.flyingKnife = {
      x: this.canvas.width / 2,
      y: this.canvas.height - 70,
      vy: -28,
      length: 50,
      width: 10
    };
  }

  updateHUD() {
    const s = document.getElementById('bm-stage');
    const sc = document.getElementById('bm-score');
    const b = document.getElementById('bm-blades');
    if (s) s.textContent = this.wheel.isBoss ? `BOSS ${this.stage}` : this.stage;
    if (sc) sc.textContent = this.score;
    if (b) b.textContent = '🗡️'.repeat(Math.min(8, this.knivesLeft)) + (this.knivesLeft > 8 ? `+${this.knivesLeft - 8}` : '');
  }

  update() {
    if (!this.running) return;

    if (this.shake > 0) this.shake *= 0.85;

    // Wheel rotation physics
    this.wheel.angle += this.wheel.speed;

    this.wheel.changeTimer++;
    if (this.wheel.changeTimer > (this.wheel.isBoss ? 60 : 130)) {
      this.wheel.changeTimer = 0;
      if (Math.random() < 0.6) {
        // Reverse spin or sudden acceleration
        this.wheel.speed *= (Math.random() < 0.4 ? -1 : 1.25);
        this.wheel.speed = Math.max(-0.065, Math.min(0.065, this.wheel.speed));
      }
    }

    // Flying Knife Update
    if (this.flyingKnife) {
      this.flyingKnife.y += this.flyingKnife.vy;

      // Check target collision
      const targetEdgeY = this.wheel.y + this.wheel.radius;
      if (this.flyingKnife.y <= targetEdgeY) {
        // Knife reached the wheel!
        this.onKnifeHit();
      }
    }

    // Particles update
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.04;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  onKnifeHit() {
    // Current contact angle relative to wheel's rotation
    const contactAngle = (Math.PI / 2 - this.wheel.angle) % (Math.PI * 2);
    const normalizedContact = (contactAngle + Math.PI * 2) % (Math.PI * 2);

    // Check collision with embedded knives (tolerance ~14 degrees)
    const minDiff = 0.22; // ~12.6 degrees in radians
    for (let i = 0; i < this.embeddedKnives.length; i++) {
      const existing = (this.embeddedKnives[i] % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      const diff = Math.abs(normalizedContact - existing);
      const circularDiff = Math.min(diff, Math.PI * 2 - diff);

      if (circularDiff < minDiff) {
        // Hit another knife -> Game Over!
        this.shake = 15;
        if (window.arcadeAudio) window.arcadeAudio.playBladeClank();

        // Bounce back knife animation
        this.flyingKnife.vy = 12;
        this.flyingKnife.vx = (Math.random() - 0.5) * 10;
        this.die();
        return;
      }
    }

    // Successful hit!
    this.embeddedKnives.push(normalizedContact);
    this.flyingKnife = null;
    this.score += 2;
    this.shake = 6;
    if (window.arcadeAudio) window.arcadeAudio.playBladeHit();

    // Hit sparks
    for (let p = 0; p < 12; p++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.wheel.y + this.wheel.radius,
        vx: (Math.random() - 0.5) * 6,
        vy: Math.random() * 4 + 1,
        life: 1,
        color: '#00f3ff',
        size: Math.random() * 3 + 2
      });
    }

    // Check apple slice
    for (let i = 0; i < this.apples.length; i++) {
      const app = this.apples[i];
      if (!app.collected) {
        const appNorm = (app.angle % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const diff = Math.abs(normalizedContact - appNorm);
        const circularDiff = Math.min(diff, Math.PI * 2 - diff);
        if (circularDiff < 0.28) {
          app.collected = true;
          this.score += 10;
          if (window.arcadeAudio) window.arcadeAudio.playScore(true);
          // Fruit splatter particles
          for (let sp = 0; sp < 15; sp++) {
            this.particles.push({
              x: this.canvas.width / 2,
              y: this.wheel.y + this.wheel.radius,
              vx: (Math.random() - 0.5) * 8,
              vy: (Math.random() - 0.5) * 8,
              life: 1,
              color: '#ff007f',
              size: 4
            });
          }
        }
      }
    }

    this.updateHUD();

    // Stage cleared?
    if (this.knivesLeft === 0) {
      this.score += 20;
      this.stage++;
      if (window.arcadeAudio) window.arcadeAudio.playVictory();
      setTimeout(() => {
        if (this.running) this.setupStage();
      }, 500);
    }
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark cyberpunk background
    ctx.save();
    if (this.shake > 0.5) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    const bg = ctx.createRadialGradient(w / 2, this.wheel.y, 20, w / 2, h / 2, w);
    bg.addColorStop(0, '#100c22');
    bg.addColorStop(1, '#05040a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

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

    // Draw Wheel and Embedded Knives
    ctx.save();
    ctx.translate(this.wheel.x, this.wheel.y);
    ctx.rotate(this.wheel.angle);

    // Target Core
    ctx.beginPath();
    ctx.arc(0, 0, this.wheel.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.wheel.isBoss ? '#2b0914' : '#0a1d30';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = this.wheel.isBoss ? '#ff0055' : '#00f3ff';
    ctx.shadowBlur = 18;
    ctx.shadowColor = this.wheel.isBoss ? '#ff0055' : '#00f3ff';
    ctx.stroke();

    // Center emblem
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fillStyle = this.wheel.isBoss ? '#ff0055' : '#ff007f';
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Embedded Knives
    this.embeddedKnives.forEach(angle => {
      ctx.save();
      ctx.rotate(angle);
      ctx.translate(0, this.wheel.radius);

      // Embedded blade handle pointing outwards
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(-3, 0, 6, 40);

      // Pommel / Hilt
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-7, 24, 14, 4);
      ctx.restore();
    });

    // Draw Apples / Gems on Wheel
    this.apples.forEach(app => {
      if (!app.collected) {
        ctx.save();
        ctx.rotate(app.angle);
        ctx.translate(0, this.wheel.radius + 12);
        ctx.fillStyle = '#ff007f';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ff007f';
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });

    ctx.restore(); // wheel restore

    // Draw Flying Knife
    if (this.flyingKnife) {
      ctx.save();
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(this.flyingKnife.x - 3, this.flyingKnife.y, 6, this.flyingKnife.length);
      // Hilt
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.flyingKnife.x - 8, this.flyingKnife.y + 35, 16, 4);
      ctx.restore();
    } else if (this.knivesLeft > 0) {
      // Ready Knife at bottom
      ctx.save();
      const readyY = h - 70;
      ctx.fillStyle = '#00f3ff';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00f3ff';
      ctx.fillRect(w / 2 - 3, readyY, 6, 50);
      ctx.fillStyle = '#fff';
      ctx.fillRect(w / 2 - 8, readyY + 35, 16, 4);
      ctx.restore();
    }

    ctx.restore(); // shake restore
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
      setTimeout(() => window.arcadeAudio.playGameOver(), 250);
    }

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('blademaster', this.score, { stage: this.stage }) : { isNewBest: false, earnedCoins: 15, best: this.score };

    this.showGameOverModal(result);
  }

  showGameOverModal(result) {
    const overlay = document.getElementById('blademaster-overlay');
    const existing = document.getElementById('bm-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'bm-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="game-over-title">BLADE SHATTERED</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">SCORE</span></div>
        <div class="stat-box"><span class="stat-val">STAGE ${this.stage}</span><span class="stat-lbl">STAGE</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="bm-retry-btn">THROW AGAIN</button>
        <button class="arcade-btn-secondary" id="bm-share-btn">SHARE SCORE</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('bm-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.score = 0;
      this.stage = 1;
      this.setupStage();
      this.running = true;
      this.loop();
    });

    document.getElementById('bm-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Blade Master', `${this.score} pts (Stage ${this.stage})`);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.boundHandleThrow);
  }
}

window.BladeMasterGame = BladeMasterGame;
