/**
 * Game 3: Cyber Runner (High-speed endless cyber dino runner with jump & slide)
 */
class CyberRunnerGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.running = false;
    this.score = 0; // distance in meters
    this.coins = 0;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('cyberrunner') : 0;

    this.player = {
      x: 60,
      y: 0,
      width: 28,
      height: 48,
      normalHeight: 48,
      slideHeight: 24,
      vy: 0,
      gravity: 0.72,
      jumpForce: -12.5,
      isGrounded: false,
      isSliding: false,
      jumpsLeft: 2,
      trail: []
    };

    this.groundY = 0;
    this.speed = 5.5;
    this.obstacles = [];
    this.items = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.cityBuildings = [];

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper cyberrunner-wrapper">
        <canvas class="game-canvas" id="cyberrunner-canvas"></canvas>
        <div class="game-ui-overlay" id="cyberrunner-overlay">
          <div class="start-screen" id="cyberrunner-start">
            <h2 class="neon-title">CYBER RUNNER</h2>
            <p class="game-instruction"><strong>SPACE / UP</strong> to Jump (Double Jump!)<br><strong>DOWN</strong> to Slide under flying drones</p>
            <div class="high-score-tag">RECORD: ${this.highScore}m</div>
            <button class="arcade-btn-primary" id="cr-play-btn">START SPRINT</button>
          </div>
          <div class="hud" id="cyberrunner-hud" style="display: none;">
            <div class="hud-item"><span class="hud-label">DIST:</span> <span id="cr-dist">0m</span></div>
            <div class="hud-item"><span class="hud-label">ENERGY:</span> <span id="cr-energy">0</span></div>
          </div>
          <div class="runner-touch-controls" id="cr-touch-controls" style="display: none;">
            <button class="runner-btn runner-slide" id="cr-touch-slide">SLIDE ▾</button>
            <button class="runner-btn runner-jump" id="cr-touch-jump">JUMP ▴</button>
          </div>
        </div>
      </div>
    `;

    this.canvas = document.getElementById('cyberrunner-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resizeCanvas();

    // Generate city silhouette
    let bx = 0;
    while (bx < this.canvas.width * 2) {
      const bw = Math.random() * 50 + 35;
      const bh = Math.random() * 120 + 80;
      this.cityBuildings.push({ x: bx, width: bw, height: bh, lights: Math.random() > 0.3 });
      bx += bw + Math.random() * 15;
    }

    this.bindEvents();
    this.renderInitial();
  }

  resizeCanvas() {
    const rect = this.container.getBoundingClientRect();
    const width = Math.min(680, rect.width || 540);
    const height = Math.min(380, window.innerHeight - 220 || 340);
    this.canvas.width = width;
    this.canvas.height = height;
    this.groundY = height - 45;
    this.player.y = this.groundY - this.player.height;
  }

  bindEvents() {
    this.boundKeyDown = (e) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        this.jump();
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        this.slide(true);
      }
    };

    this.boundKeyUp = (e) => {
      if (['ArrowDown', 'KeyS'].includes(e.code)) {
        this.slide(false);
      }
    };

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);

    // Touch button bindings
    const jumpBtn = document.getElementById('cr-touch-jump');
    const slideBtn = document.getElementById('cr-touch-slide');

    if (jumpBtn) {
      jumpBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.jump(); });
      jumpBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this.jump(); });
    }
    if (slideBtn) {
      slideBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.slide(true); });
      slideBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.slide(false); });
      slideBtn.addEventListener('mousedown', (e) => { e.preventDefault(); this.slide(true); });
      slideBtn.addEventListener('mouseup', (e) => { e.preventDefault(); this.slide(false); });
    }

    document.getElementById('cr-play-btn').addEventListener('click', () => {
      this.start();
    });
  }

  start() {
    document.getElementById('cyberrunner-start').style.display = 'none';
    document.getElementById('cyberrunner-hud').style.display = 'flex';
    document.getElementById('cr-touch-controls').style.display = 'flex';
    this.reset();
    this.running = true;
    this.loop();
  }

  reset() {
    this.score = 0;
    this.coins = 0;
    this.speed = 5.5;
    this.player.y = this.groundY - this.player.normalHeight;
    this.player.height = this.player.normalHeight;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.isSliding = false;
    this.player.jumpsLeft = 2;
    this.player.trail = [];
    this.obstacles = [];
    this.items = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.updateHUD();
  }

  jump() {
    if (!this.running) return;
    if (this.player.jumpsLeft > 0) {
      this.player.vy = this.player.jumpForce;
      this.player.isGrounded = false;
      this.player.jumpsLeft--;
      if (this.player.isSliding) this.slide(false);
      if (window.arcadeAudio) window.arcadeAudio.playJump();

      // Thruster burst
      for (let i = 0; i < 7; i++) {
        this.particles.push({
          x: this.player.x + this.player.width / 2,
          y: this.player.y + this.player.height,
          vx: (Math.random() - 0.5) * 4,
          vy: Math.random() * 3 + 2,
          life: 1,
          color: '#00f3ff',
          size: Math.random() * 3 + 2
        });
      }
    }
  }

  slide(active) {
    if (!this.running) return;
    if (active) {
      if (!this.player.isSliding) {
        this.player.isSliding = true;
        this.player.height = this.player.slideHeight;
        this.player.y = this.groundY - this.player.slideHeight;
        if (window.arcadeAudio) window.arcadeAudio.playSlide();
      }
    } else {
      if (this.player.isSliding) {
        this.player.isSliding = false;
        this.player.height = this.player.normalHeight;
        this.player.y = this.groundY - this.player.normalHeight;
      }
    }
  }

  spawnObstacle() {
    // 60% chance ground obstacle, 40% chance flying drone obstacle
    const isFlying = Math.random() < 0.4;
    if (isFlying) {
      this.obstacles.push({
        type: 'drone',
        x: this.canvas.width + 20,
        y: this.groundY - 58,
        width: 36,
        height: 24,
        pulse: 0
      });
    } else {
      const isDouble = Math.random() < 0.3;
      this.obstacles.push({
        type: 'barrier',
        x: this.canvas.width + 20,
        y: this.groundY - (isDouble ? 42 : 32),
        width: isDouble ? 34 : 22,
        height: isDouble ? 42 : 32
      });
    }

    // Chance to spawn energy core above
    if (Math.random() < 0.5) {
      this.items.push({
        x: this.canvas.width + 120,
        y: this.groundY - 60 - Math.random() * 35,
        radius: 8,
        pulse: 0
      });
    }
  }

  updateHUD() {
    const d = document.getElementById('cr-dist');
    const e = document.getElementById('cr-energy');
    if (d) d.textContent = `${Math.floor(this.score)}m`;
    if (e) e.textContent = this.coins;
  }

  update() {
    if (!this.running) return;

    this.score += this.speed * 0.05;
    this.speed = Math.min(10.5, 5.5 + this.score * 0.0035);
    this.updateHUD();

    // Player gravity & physics
    this.player.vy += this.player.gravity;
    this.player.y += this.player.vy;

    const currentGroundLimit = this.groundY - this.player.height;
    if (this.player.y >= currentGroundLimit) {
      this.player.y = currentGroundLimit;
      this.player.vy = 0;
      this.player.isGrounded = true;
      this.player.jumpsLeft = 2;
    }

    // Player motion trail
    this.player.trail.push({
      x: this.player.x,
      y: this.player.y,
      w: this.player.width,
      h: this.player.height,
      alpha: 0.5
    });
    if (this.player.trail.length > 5) this.player.trail.shift();
    this.player.trail.forEach(t => t.alpha -= 0.08);

    // City scroll
    this.cityBuildings.forEach(b => {
      b.x -= this.speed * 0.3;
    });
    const lastB = this.cityBuildings[this.cityBuildings.length - 1];
    if (lastB.x < this.canvas.width + 100) {
      const bw = Math.random() * 50 + 35;
      const bh = Math.random() * 120 + 80;
      this.cityBuildings.push({ x: lastB.x + lastB.width + Math.random() * 15, width: bw, height: bh, lights: Math.random() > 0.3 });
    }
    if (this.cityBuildings[0].x + this.cityBuildings[0].width < -50) {
      this.cityBuildings.shift();
    }

    // Spawn obstacles
    this.spawnTimer++;
    const spawnInterval = Math.max(50, Math.floor(100 - this.score * 0.03));
    if (this.spawnTimer >= spawnInterval) {
      this.spawnObstacle();
      this.spawnTimer = 0;
    }

    // Move & collide obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.x -= this.speed;

      // Hitbox detection
      const px = this.player.x + 4;
      const py = this.player.y + 4;
      const pw = this.player.width - 8;
      const ph = this.player.height - 6;

      const collides = (
        px < obs.x + obs.width &&
        px + pw > obs.x &&
        py < obs.y + obs.height &&
        py + ph > obs.y
      );

      if (collides) {
        this.die();
        return;
      }

      if (obs.x + obs.width < -30) {
        this.obstacles.splice(i, 1);
      }
    }

    // Move & collect items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.x -= this.speed;
      item.pulse += 0.1;

      const dx = (this.player.x + this.player.width / 2) - item.x;
      const dy = (this.player.y + this.player.height / 2) - item.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < item.radius + 18) {
        this.coins++;
        this.score += 15;
        if (window.arcadeAudio) window.arcadeAudio.playScore(true);
        for (let p = 0; p < 8; p++) {
          this.particles.push({
            x: item.x,
            y: item.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color: '#00ff88',
            size: 3
          });
        }
        this.items.splice(i, 1);
        continue;
      }

      if (item.x < -30) {
        this.items.splice(i, 1);
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

    // Cyberpunk gradient sky
    const sky = ctx.createLinearGradient(0, 0, 0, this.groundY);
    sky.addColorStop(0, '#070914');
    sky.addColorStop(0.7, '#140c26');
    sky.addColorStop(1, '#2c0b38');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // City skyline
    this.cityBuildings.forEach(b => {
      ctx.fillStyle = '#0b081a';
      ctx.fillRect(b.x, this.groundY - b.height, b.width, b.height);
      ctx.strokeStyle = '#2d1445';
      ctx.strokeRect(b.x, this.groundY - b.height, b.width, b.height);

      if (b.lights) {
        ctx.fillStyle = '#ff007f33';
        for (let r = 0; r < b.height - 15; r += 16) {
          ctx.fillRect(b.x + 6, this.groundY - b.height + r + 6, 4, 6);
          ctx.fillRect(b.x + b.width - 10, this.groundY - b.height + r + 6, 4, 6);
        }
      }
    });

    // Cyber Ground with perspective lines
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, this.groundY, w, h - this.groundY);

    // Ground neon border
    ctx.strokeStyle = '#00f3ff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00f3ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, this.groundY);
    ctx.lineTo(w, this.groundY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Moving grid stripes on floor
    const offset = (this.score * 8) % 30;
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.25)';
    ctx.lineWidth = 1;
    for (let x = -offset; x < w; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, this.groundY);
      ctx.lineTo(x - 20, h);
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

    // Draw Items
    this.items.forEach(item => {
      ctx.save();
      ctx.translate(item.x, item.y + Math.sin(item.pulse) * 4);
      ctx.fillStyle = '#00ff88';
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#00ff88';
      ctx.beginPath();
      ctx.arc(0, 0, item.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Obstacles
    this.obstacles.forEach(obs => {
      ctx.save();
      if (obs.type === 'drone') {
        // Flying laser drone
        ctx.fillStyle = '#ff0055';
        ctx.shadowBlur = 14;
        ctx.shadowColor = '#ff0055';

        // Drone body
        ctx.beginPath();
        ctx.ellipse(obs.x + obs.width / 2, obs.y + obs.height / 2, obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(obs.x + obs.width / 2, obs.y + obs.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Underneath laser scanner beam
        ctx.strokeStyle = 'rgba(255, 0, 85, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(obs.x + obs.width / 2, obs.y + obs.height);
        ctx.lineTo(obs.x + obs.width / 2, obs.y + obs.height + 15);
        ctx.stroke();
      } else {
        // Ground barricade/spikes
        ctx.fillStyle = '#ffaa00';
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#ffaa00';
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

        // Warning stripes
        ctx.fillStyle = '#111';
        ctx.fillRect(obs.x + 3, obs.y + 3, obs.width - 6, 4);
        ctx.fillRect(obs.x + 3, obs.y + 12, obs.width - 6, 4);
      }
      ctx.restore();
    });

    // Draw Player Trail
    this.player.trail.forEach(t => {
      if (t.alpha <= 0) return;
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.4;
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(t.x, t.y, t.w, t.h);
      ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#00f3ff';

    if (this.player.isSliding) {
      // Sleek sliding neon hover boarder
      ctx.fillStyle = '#00f3ff';
      ctx.fillRect(this.player.x, this.player.y, this.player.width + 10, this.player.height);
      ctx.fillStyle = '#ff007f';
      ctx.fillRect(this.player.x + 4, this.player.y + 4, this.player.width + 2, 6);
    } else {
      // Cyber runner robot / humanoid
      ctx.fillStyle = '#00f3ff';
      // Torso & legs
      ctx.fillRect(this.player.x, this.player.y, this.player.width, this.player.height);
      // Visor
      ctx.fillStyle = '#ff007f';
      ctx.shadowColor = '#ff007f';
      ctx.fillRect(this.player.x + 12, this.player.y + 6, 14, 6);
    }
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

    const finalMeters = Math.floor(this.score);
    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('cyberrunner', finalMeters, { coins: this.coins }) : { isNewBest: false, earnedCoins: 15, best: finalMeters };

    this.showGameOverModal(finalMeters, result);
  }

  showGameOverModal(meters, result) {
    const overlay = document.getElementById('cyberrunner-overlay');
    const existing = document.getElementById('cr-gameover');
    if (existing) existing.remove();

    const gameOverDiv = document.createElement('div');
    gameOverDiv.className = 'game-over-modal';
    gameOverDiv.id = 'cr-gameover';
    gameOverDiv.innerHTML = `
      <h2 class="game-over-title">GRID OVERLOAD</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${meters}m</span><span class="stat-lbl">DISTANCE</span></div>
        <div class="stat-box"><span class="stat-val">${result.best}m</span><span class="stat-lbl">RECORD</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="cr-retry-btn">RUN AGAIN</button>
        <button class="arcade-btn-secondary" id="cr-share-btn">SHARE RUN</button>
      </div>
    `;

    overlay.appendChild(gameOverDiv);

    document.getElementById('cr-retry-btn').addEventListener('click', () => {
      gameOverDiv.remove();
      this.reset();
      this.running = true;
      this.loop();
    });

    document.getElementById('cr-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Cyber Runner', `${meters}m`);
      }
    });
  }

  destroy() {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
  }
}

window.CyberRunnerGame = CyberRunnerGame;
