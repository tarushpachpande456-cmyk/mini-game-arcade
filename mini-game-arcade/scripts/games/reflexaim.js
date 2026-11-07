/**
 * Game 8: Reflex Aim Lab (30-second reaction time & target precision blitz)
 */
class ReflexAimGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0;
    this.timeLeft = 30;
    this.timerInterval = null;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('reflexaim') : 0;

    this.targets = [];
    this.particles = [];
    this.hits = 0;
    this.misses = 0;
    this.totalClicks = 0;
    this.reactionTimes = [];
    this.streak = 0;
    this.spawnTimer = 0;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper reflexaim-wrapper">
        <canvas class="game-canvas" id="reflexaim-canvas"></canvas>
        <div class="game-ui-overlay" id="reflexaim-overlay">
          <div class="start-screen" id="reflexaim-start">
            <h2 class="neon-title">REFLEX AIM LAB</h2>
            <p class="game-instruction">Click/tap glowing targets fast before they vanish!<br>Hit <strong>Golden Targets</strong> for bonus. <strong>Avoid Skull Bombs!</strong></p>
            <div class="high-score-tag">RECORD: ${this.highScore} PTS</div>
            <button class="arcade-btn-primary" id="ra-play-btn">START 30s BLITZ</button>
          </div>
          <div class="hud" id="reflexaim-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">TIME:</span> <span id="ra-time">30s</span></div>
            <div class="hud-item"><span class="hud-label">SCORE:</span> <span id="ra-score">0</span></div>
            <div class="hud-item"><span class="hud-label">STREAK:</span> <span id="ra-streak">x1</span></div>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('reflexaim-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();
    this.bindEvents();
    this.renderInitial();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.min(540, rect.width || 480);
    const height = Math.min(520, window.innerHeight - 200 || 460);
    this.canvas.width = width;
    this.canvas.height = height;
  }

  bindEvents() {
    this.boundClickHandler = (e) => {
      if (!this.running) return;
      const rect = this.canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      this.handleClick(clickX, clickY);
    };

    this.canvas.addEventListener('mousedown', this.boundClickHandler);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const touch = e.touches[0];
      const clickX = touch.clientX - rect.left;
      const clickY = touch.clientY - rect.top;
      this.handleClick(clickX, clickY);
    }, { passive: false });

    document.getElementById('ra-play-btn').addEventListener('click', () => {
      this.start();
    });
  }

  start() {
    document.getElementById('reflexaim-start').style.display = 'none';
    document.getElementById('reflexaim-hud').style.display = 'flex';
    this.reset();
    this.running = true;

    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      const timeEl = document.getElementById('ra-time');
      if (timeEl) timeEl.textContent = `${this.timeLeft}s`;

      if (this.timeLeft <= 0) {
        clearInterval(this.timerInterval);
        this.finish();
      }
    }, 1000);

    this.loop();
  }

  reset() {
    this.score = 0;
    this.timeLeft = 30;
    this.hits = 0;
    this.misses = 0;
    this.totalClicks = 0;
    this.reactionTimes = [];
    this.streak = 0;
    this.targets = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.updateHUD();

    // Initial targets
    this.spawnTarget();
    this.spawnTarget();
  }

  spawnTarget() {
    const isGolden = Math.random() < 0.2;
    const isBomb = !isGolden && Math.random() < 0.15;
    const radius = isGolden ? 24 : 30;
    const margin = 45;

    const x = Math.random() * (this.canvas.width - margin * 2) + margin;
    const y = Math.random() * (this.canvas.height - margin * 2) + margin;

    this.targets.push({
      x,
      y,
      maxRadius: radius,
      currentRadius: 2,
      expanding: true,
      spawnTime: performance.now(),
      isGolden,
      isBomb,
      life: 1.0,
      decay: isGolden ? 0.018 : 0.012
    });
  }

  handleClick(x, y) {
    this.totalClicks++;
    let hitAny = false;

    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const dx = x - t.x;
      const dy = y - t.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= t.currentRadius + 6) {
        hitAny = true;
        const reactionMs = Math.round(performance.now() - t.spawnTime);
        this.reactionTimes.push(reactionMs);

        if (t.isBomb) {
          // Clicked a bomb!
          this.score = Math.max(0, this.score - 200);
          this.streak = 0;
          if (window.arcadeAudio) window.arcadeAudio.playBomb();
          this.burstParticles(t.x, t.y, '#ff0055', 18);
        } else {
          // Target hit!
          this.hits++;
          this.streak++;
          const multiplier = Math.min(4, 1 + Math.floor(this.streak / 5));
          const pts = (t.isGolden ? 300 : 100) * multiplier;
          this.score += pts;
          if (window.arcadeAudio) window.arcadeAudio.playTargetHit(t.isGolden);
          this.burstParticles(t.x, t.y, t.isGolden ? '#ffe600' : '#00f3ff', 12);
        }

        this.targets.splice(i, 1);
        this.spawnTarget();
        break;
      }
    }

    if (!hitAny) {
      this.misses++;
      this.streak = 0;
    }

    this.updateHUD();
  }

  burstParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color,
        size: Math.random() * 3 + 2
      });
    }
  }

  updateHUD() {
    const s = document.getElementById('ra-score');
    const st = document.getElementById('ra-streak');
    if (s) s.textContent = this.score;
    if (st) {
      const mult = Math.min(4, 1 + Math.floor(this.streak / 5));
      st.textContent = `x${mult} (${this.streak})`;
    }
  }

  update() {
    if (!this.running) return;

    // Spawn pace
    this.spawnTimer++;
    if (this.spawnTimer > 35 && this.targets.length < 4) {
      this.spawnTarget();
      this.spawnTimer = 0;
    }

    // Target expansion / shrink lifecycle
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      if (t.expanding) {
        t.currentRadius += 2.5;
        if (t.currentRadius >= t.maxRadius) {
          t.currentRadius = t.maxRadius;
          t.expanding = false;
        }
      } else {
        t.life -= t.decay;
        t.currentRadius = t.maxRadius * Math.max(0, t.life);
        if (t.life <= 0) {
          // Target expired
          if (!t.isBomb) {
            this.misses++;
            this.streak = 0;
            this.updateHUD();
          }
          this.targets.splice(i, 1);
          this.spawnTarget();
        }
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
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#070814';
    ctx.fillRect(0, 0, w, h);

    // Crosshairs background grid
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h);
    ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2);
    ctx.stroke();

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

    // Draw Targets
    this.targets.forEach(t => {
      ctx.save();
      ctx.translate(t.x, t.y);

      if (t.isBomb) {
        // Red Bomb Target
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 0, t.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, t.currentRadius * 0.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', 0, 0);
      } else if (t.isGolden) {
        // Golden Star Target
        ctx.fillStyle = '#ffe600';
        ctx.shadowBlur = 18;
        ctx.shadowColor = '#ffe600';
        ctx.beginPath();
        ctx.arc(0, 0, t.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner ring
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, t.currentRadius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // Standard Cyber Target
        ctx.fillStyle = '#00f3ff';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#00f3ff';
        ctx.beginPath();
        ctx.arc(0, 0, t.currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Center bullseye
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.arc(0, 0, t.currentRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();
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

  finish() {
    this.running = false;
    cancelAnimationFrame(this.animationId);
    if (this.timerInterval) clearInterval(this.timerInterval);

    if (window.arcadeAudio) window.arcadeAudio.playVictory();

    const totalAttempts = this.hits + this.misses;
    const accuracy = totalAttempts > 0 ? Math.round((this.hits / totalAttempts) * 100) : 0;
    const avgReaction = this.reactionTimes.length > 0 ? Math.round(this.reactionTimes.reduce((a, b) => a + b, 0) / this.reactionTimes.length) : 0;

    let rank = 'C';
    if (accuracy >= 90 && this.hits >= 35) rank = 'S+';
    else if (accuracy >= 80 && this.hits >= 28) rank = 'A';
    else if (accuracy >= 70 && this.hits >= 20) rank = 'B';

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('reflexaim', this.score, { hits: this.hits, accuracy }) : { isNewBest: false, earnedCoins: 20, best: this.score };

    this.showGameOverModal(accuracy, avgReaction, rank, result);
  }

  showGameOverModal(accuracy, avgReaction, rank, result) {
    const overlay = document.getElementById('reflexaim-overlay');
    const existing = document.getElementById('ra-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'ra-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="neon-title" style="color: #00f3ff;">SESSION COMPLETE</h2>
      <div style="font-size: 2.2rem; font-weight: 800; color: #ffe600; margin-bottom: 8px;">RANK: ${rank}</div>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">SCORE</span></div>
        <div class="stat-box"><span class="stat-val">${this.hits}</span><span class="stat-lbl">HITS</span></div>
        <div class="stat-box"><span class="stat-val">${accuracy}%</span><span class="stat-lbl">ACCURACY</span></div>
        <div class="stat-box"><span class="stat-val">${avgReaction}ms</span><span class="stat-lbl">REACTION</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="ra-retry-btn">TEST AGAIN</button>
        <button class="arcade-btn-secondary" id="ra-share-btn">SHARE REFLEXES</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('ra-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.start();
    });

    document.getElementById('ra-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Reflex Aim Lab', `${this.score} pts (${accuracy}% Acc, ${avgReaction}ms, Rank ${rank})`);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.timerInterval) clearInterval(this.timerInterval);
  }
}

window.ReflexAimGame = ReflexAimGame;
