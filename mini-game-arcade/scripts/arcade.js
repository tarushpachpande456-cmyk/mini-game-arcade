/**
 * Viral Mini Games Arcade - Core App & Lobby Controller
 */
class ArcadeHub {
  constructor() {
    this.games = [
      {
        id: 'cyberflap',
        title: 'Cyber Flap',
        category: 'reflex',
        difficulty: 'Medium',
        badge: 'VIRAL HIT',
        icon: '🦅',
        desc: 'Tap thrusters to navigate deadly neon laser gates and snatch floating energy coins.',
        tags: ['Physics', 'Flappy', 'Endless'],
        gameClass: window.CyberFlapGame
      },
      {
        id: 'neon2048',
        title: 'Neon 2048',
        category: 'puzzle',
        difficulty: 'Easy-Hard',
        badge: 'CLASSIC',
        icon: '🔢',
        desc: 'Slide and fuse identical power cells to synthesize the legendary 2048 core.',
        tags: ['Puzzle', 'Merge', 'Strategy'],
        gameClass: window.Neon2048Game
      },
      {
        id: 'cyberrunner',
        title: 'Cyber Runner',
        category: 'endless',
        difficulty: 'Hard',
        badge: 'POPULAR',
        icon: '🏃',
        desc: 'Sprint through a cyberpunk skyline. Double-jump over barricades & slide under laser drones.',
        tags: ['Runner', 'Dino', 'Fast-Paced'],
        gameClass: window.CyberRunnerGame
      },
      {
        id: 'towerstack',
        title: 'Tower Stacker',
        category: 'timing',
        difficulty: 'Medium',
        badge: 'ADDICTIVE',
        icon: '🏢',
        desc: 'Drop oscillating blocks with split-second accuracy. Overhangs are sliced off!',
        tags: ['Timing', 'Physics', 'Combo'],
        gameClass: window.TowerStackGame
      },
      {
        id: 'blademaster',
        title: 'Blade Master',
        category: 'reflex',
        difficulty: 'Hard',
        badge: 'ACTION',
        icon: '🗡️',
        desc: 'Fling neon daggers into rotating targets. Avoid blades and defeat erratic Boss Wheels.',
        tags: ['Target', 'Knife Hit', 'Bosses'],
        gameClass: window.BladeMasterGame
      },
      {
        id: 'neonsnake',
        title: 'Neon Snake DX',
        category: 'retro',
        difficulty: 'Medium',
        badge: 'RETRO 2.0',
        icon: '🐍',
        desc: 'The immortal classic revived with glowing neon trails, speed pills, and golden fruit.',
        tags: ['Snake', 'Retro', 'Arcade'],
        gameClass: window.NeonSnakeGame
      },
      {
        id: 'wordblitz',
        title: 'Word Blitz',
        category: 'puzzle',
        difficulty: 'Medium',
        badge: 'BRAIN',
        icon: '📖',
        desc: '6 tries to guess the secret 5-letter cyberpunk password with color-coded hints.',
        tags: ['Wordle', 'Word Game', 'Shareable'],
        gameClass: window.WordBlitzGame
      },
      {
        id: 'reflexaim',
        title: 'Reflex Aim Lab',
        category: 'reflex',
        difficulty: 'Intense',
        badge: 'SKILL TEST',
        icon: '🎯',
        desc: '30 seconds of pure target clicking frenzy. Measure your reaction time in milliseconds.',
        tags: ['Aim', 'Reaction', '30s Blitz'],
        gameClass: window.ReflexAimGame
      },
      {
        id: 'simonpulse',
        title: 'Simon Pulse',
        category: 'puzzle',
        difficulty: 'Medium',
        badge: 'SYNTHWAVE',
        icon: '🧠',
        desc: 'Memorize and mimic growing musical light sequences in a futuristic 4-quadrant synthesizer.',
        tags: ['Memory', 'Audio', 'Simon Says'],
        gameClass: window.SimonPulseGame
      },
      {
        id: 'colorflood',
        title: 'Color Flood',
        category: 'puzzle',
        difficulty: 'Strategic',
        badge: 'SATISFYING',
        icon: '🎨',
        desc: 'Flood the 144-tile cyber grid with one color in 22 moves or fewer. Mesmerizing cascades.',
        tags: ['Flood-It', 'Logic', 'Casual'],
        gameClass: window.ColorFloodGame
      }
    ];

    this.activeGameInstance = null;
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.bgAnimationId = null;

    this.init();
  }

  init() {
    this.initBackgroundStarfield();
    this.renderGameCards();
    this.bindEvents();
    this.setupDailyChallenge();

    if (window.arcadeProfile) {
      window.arcadeProfile.updateHUD();
    }
  }

  initBackgroundStarfield() {
    const canvas = document.getElementById('arcade-bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const stars = [];
    const count = Math.min(100, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        z: Math.random() * 2 + 0.5,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.7 + 0.3
      });
    }

    let mouseX = canvas.width / 2;
    let mouseY = canvas.height / 2;
    window.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle cyber grid at bottom
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
      ctx.lineWidth = 1;
      const gh = canvas.height * 0.7;
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, gh);
        ctx.lineTo(x + (x - canvas.width / 2) * 0.8, canvas.height);
        ctx.stroke();
      }

      // Parallax Stars
      stars.forEach(s => {
        const dx = (mouseX - canvas.width / 2) * 0.015 * s.z;
        const dy = (mouseY - canvas.height / 2) * 0.015 * s.z;

        ctx.fillStyle = `rgba(0, 243, 255, ${s.alpha * 0.6})`;
        ctx.shadowBlur = 4;
        ctx.shadowColor = '#00f3ff';
        ctx.beginPath();
        ctx.arc(s.x + dx, s.y + dy, s.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        s.y -= s.z * 0.15;
        if (s.y < 0) s.y = canvas.height;
      });

      this.bgAnimationId = requestAnimationFrame(loop);
    };
    loop();
  }

  renderGameCards() {
    const grid = document.getElementById('arcade-games-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const filtered = this.games.filter(g => {
      const matchCat = (this.currentCategory === 'all' || g.category === this.currentCategory);
      const matchSearch = (
        !this.searchQuery ||
        g.title.toLowerCase().includes(this.searchQuery) ||
        g.desc.toLowerCase().includes(this.searchQuery) ||
        g.tags.some(t => t.toLowerCase().includes(this.searchQuery))
      );
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="no-games-found">
          <div class="no-games-icon">🔍</div>
          <h3>NO GAMES FOUND</h3>
          <p>No mini-games match your search "${this.searchQuery}". Try another keyword!</p>
        </div>
      `;
      return;
    }

    filtered.forEach((game, index) => {
      const card = document.createElement('div');
      card.className = 'arcade-card';
      card.style.animationDelay = `${index * 0.05}s`;

      const best = window.arcadeProfile ? window.arcadeProfile.getHighScore(game.id) : 0;
      const plays = (window.arcadeProfile && window.arcadeProfile.data.playedGames && window.arcadeProfile.data.playedGames[game.id]) || 0;

      card.innerHTML = `
        <div class="card-glow"></div>
        <div class="card-header">
          <span class="game-badge">${game.badge}</span>
          <span class="game-diff">${game.difficulty}</span>
        </div>
        <div class="card-icon-wrapper">
          <div class="card-icon">${game.icon}</div>
        </div>
        <div class="card-body">
          <h3 class="card-title">${game.title}</h3>
          <p class="card-desc">${game.desc}</p>
          <div class="card-tags">
            ${game.tags.map(t => `<span class="tag">#${t}</span>`).join('')}
          </div>
        </div>
        <div class="card-footer">
          <div class="card-stats">
            <span class="stat-item"><span class="lbl">BEST:</span> <strong class="val">${best}</strong></span>
            <span class="stat-item"><span class="lbl">PLAYS:</span> <strong class="val">${plays}</strong></span>
          </div>
          <button class="arcade-card-play-btn" data-game-id="${game.id}">
            <span>PLAY NOW</span> ▶
          </button>
        </div>
      `;

      card.querySelector('.arcade-card-play-btn').addEventListener('click', () => {
        this.launchGame(game.id);
      });

      card.addEventListener('click', (e) => {
        if (!e.target.closest('.arcade-card-play-btn')) {
          this.launchGame(game.id);
        }
      });

      grid.appendChild(card);
    });
  }

  setupDailyChallenge() {
    const today = new Date().toISOString().slice(0, 10);
    // Pick daily game deterministically based on date
    let charSum = 0;
    for (let i = 0; i < today.length; i++) charSum += today.charCodeAt(i);
    const dailyGame = this.games[charSum % this.games.length];

    const titleEl = document.getElementById('daily-game-title');
    const descEl = document.getElementById('daily-game-desc');
    const playBtn = document.getElementById('daily-play-btn');

    if (titleEl) titleEl.textContent = `${dailyGame.icon} ${dailyGame.title}`;
    if (descEl) descEl.textContent = `Earn 2x Arcade Coins on ${dailyGame.title} today only! Break your high score to claim the bonus.`;
    if (playBtn) {
      playBtn.addEventListener('click', () => {
        this.launchGame(dailyGame.id);
      });
    }
  }

  bindEvents() {
    // Filter tabs
    const tabs = document.querySelectorAll('.cat-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.getAttribute('data-cat');
        if (window.arcadeAudio) window.arcadeAudio.playSelect();
        this.renderGameCards();
      });
    });

    // Search input
    const searchInput = document.getElementById('arcade-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderGameCards();
      });
    }

    // Surprise Me / Random Game Roulette
    const surpriseBtn = document.getElementById('btn-surprise-me');
    if (surpriseBtn) {
      surpriseBtn.addEventListener('click', () => {
        this.openSurpriseRoulette();
      });
    }

    // Shop / Themes modal toggle
    const shopBtn = document.getElementById('btn-open-shop');
    if (shopBtn) {
      shopBtn.addEventListener('click', () => {
        this.openShopModal();
      });
    }

    // Trophies / Achievements modal
    const trophyBtn = document.getElementById('btn-open-achievements');
    if (trophyBtn) {
      trophyBtn.addEventListener('click', () => {
        this.openAchievementsModal();
      });
    }

    // Leaderboard / Stats modal
    const statsBtn = document.getElementById('btn-open-stats');
    if (statsBtn) {
      statsBtn.addEventListener('click', () => {
        this.openStatsModal();
      });
    }

    // Audio Mute toggle in lobby and in game
    const muteBtns = document.querySelectorAll('.audio-toggle-btn');
    muteBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.arcadeAudio) {
          const isMuted = window.arcadeAudio.toggleMute();
          muteBtns.forEach(b => b.textContent = isMuted ? '🔇 MUTED' : '🔊 SOUND');
        }
      });
    });

    // Back to Arcade button in Game Arena HUD
    const backBtn = document.getElementById('game-arena-back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.exitToLobby();
      });
    }

    // Arena Restart button
    const restartBtn = document.getElementById('game-arena-restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        if (this.activeGameId) {
          this.launchGame(this.activeGameId);
        }
      });
    }

    // Arena Fullscreen button
    const fsBtn = document.getElementById('game-arena-fs-btn');
    if (fsBtn) {
      fsBtn.addEventListener('click', () => {
        const arena = document.getElementById('arcade-game-arena');
        if (!document.fullscreenElement) {
          arena.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Arena Share button
    const shareBtn = document.getElementById('game-arena-share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        if (this.activeGameId) {
          const game = this.games.find(g => g.id === this.activeGameId);
          const best = window.arcadeProfile ? window.arcadeProfile.getHighScore(this.activeGameId) : 0;
          this.openShareModal(game ? game.title : 'Arcade', `${best} pts`);
        }
      });
    }
  }

  launchGame(gameId) {
    const game = this.games.find(g => g.id === gameId);
    if (!game) return;

    if (window.arcadeAudio) window.arcadeAudio.playSelect();

    // Destroy active game if any
    if (this.activeGameInstance && typeof this.activeGameInstance.destroy === 'function') {
      this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }

    this.activeGameId = gameId;

    // Switch view
    document.getElementById('arcade-lobby').style.display = 'none';
    const arena = document.getElementById('arcade-game-arena');
    arena.style.display = 'flex';

    // Update Arena HUD
    document.getElementById('arena-game-title').textContent = `${game.icon} ${game.title}`;
    const bestScore = window.arcadeProfile ? window.arcadeProfile.getHighScore(gameId) : 0;
    document.getElementById('arena-game-best').textContent = `RECORD: ${bestScore}`;

    // Instantiate game inside the canvas viewport container
    const container = document.getElementById('arena-canvas-container');
    container.innerHTML = '';

    // Scroll to top of arena
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Launch game instance
    const classMap = {
      cyberflap: window.CyberFlapGame,
      neon2048: window.Neon2048Game,
      cyberrunner: window.CyberRunnerGame,
      towerstack: window.TowerStackGame,
      blademaster: window.BladeMasterGame,
      neonsnake: window.NeonSnakeGame,
      wordblitz: window.WordBlitzGame,
      reflexaim: window.ReflexAimGame,
      simonpulse: window.SimonPulseGame,
      colorflood: window.ColorFloodGame
    };
    const GameCtor = classMap[gameId] || game.gameClass;

    if (GameCtor) {
      this.activeGameInstance = new GameCtor(container, (finalScore, extra) => {
        // onGameOver hook if needed
      });
    }
  }

  exitToLobby() {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();

    if (this.activeGameInstance && typeof this.activeGameInstance.destroy === 'function') {
      this.activeGameInstance.destroy();
      this.activeGameInstance = null;
    }
    this.activeGameId = null;

    document.getElementById('arcade-game-arena').style.display = 'none';
    document.getElementById('arcade-lobby').style.display = 'block';

    if (window.arcadeProfile) {
      window.arcadeProfile.updateHUD();
    }
    this.renderGameCards();
  }

  // --- Modals ---

  openSurpriseRoulette() {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    const modal = document.getElementById('arcade-modal');
    const modalBody = document.getElementById('arcade-modal-body');

    modalBody.innerHTML = `
      <div class="roulette-container">
        <h2 class="neon-title">🎲 SURPRISE ME! 🎲</h2>
        <p>Spinning the neon arcade wheel to pick your fate...</p>
        <div class="roulette-spinner-box">
          <div class="roulette-item" id="roulette-display">
            <span class="r-icon">🎰</span>
            <span class="r-title">SPINNING...</span>
          </div>
        </div>
        <button class="arcade-btn-primary" id="roulette-launch-btn" style="display: none; margin-top: 15px;">PLAY NOW ▶</button>
      </div>
    `;

    modal.classList.add('visible');

    let counter = 0;
    const totalTicks = 22;
    let selectedGame = null;

    const tick = () => {
      const randomG = this.games[Math.floor(Math.random() * this.games.length)];
      const display = document.getElementById('roulette-display');
      if (display) {
        display.innerHTML = `<span class="r-icon">${randomG.icon}</span><span class="r-title">${randomG.title}</span>`;
      }
      if (window.arcadeAudio) window.arcadeAudio.playKeyTap();
      counter++;

      if (counter < totalTicks) {
        const nextDelay = 50 + counter * 15;
        setTimeout(tick, nextDelay);
      } else {
        selectedGame = randomG;
        if (window.arcadeAudio) window.arcadeAudio.playVictory();
        this.triggerConfetti();

        const launchBtn = document.getElementById('roulette-launch-btn');
        if (launchBtn) {
          launchBtn.style.display = 'inline-block';
          launchBtn.textContent = `PLAY ${selectedGame.title.toUpperCase()} ▶`;
          launchBtn.addEventListener('click', () => {
            modal.classList.remove('visible');
            this.launchGame(selectedGame.id);
          });
        }
      }
    };

    setTimeout(tick, 100);
  }

  openShopModal() {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    const modal = document.getElementById('arcade-modal');
    const modalBody = document.getElementById('arcade-modal-body');
    const prof = window.arcadeProfile;

    modalBody.innerHTML = `
      <div class="shop-container">
        <h2 class="neon-title">✨ ARCADE THEME SHOP ✨</h2>
        <p>Spend arcade coins earned from high scores to customize your neon aesthetic!</p>
        <div class="shop-coins-banner">🪙 BALANCE: <strong id="shop-coins">${prof.getCoins().toLocaleString()}</strong> COINS</div>
        <div class="themes-grid">
          ${prof.themes.map(t => {
            const isUnlocked = prof.data.unlockedThemes[t.id];
            const isActive = prof.data.activeTheme === t.id;
            return `
              <div class="theme-card ${isActive ? 'active' : ''}">
                <div class="theme-swatch" style="background: linear-gradient(135deg, ${t.preview[0]}, ${t.preview[1]});"></div>
                <div class="theme-info">
                  <h4>${t.name}</h4>
                  <p>${t.desc}</p>
                </div>
                <div class="theme-action">
                  ${isActive ? '<span class="theme-status-tag active">EQUIPPED</span>' :
                    (isUnlocked ? `<button class="arcade-btn-mini equip-theme-btn" data-theme="${t.id}">EQUIP</button>` :
                    `<button class="arcade-btn-mini buy-theme-btn" data-theme="${t.id}">BUY ${t.price} 🪙</button>`)}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    modal.classList.add('visible');

    modalBody.querySelectorAll('.equip-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-theme');
        prof.applyTheme(tid);
        if (window.arcadeAudio) window.arcadeAudio.playSelect();
        this.openShopModal();
      });
    });

    modalBody.querySelectorAll('.buy-theme-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tid = btn.getAttribute('data-theme');
        if (prof.unlockTheme(tid)) {
          this.openShopModal();
        }
      });
    });
  }

  openAchievementsModal() {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    const modal = document.getElementById('arcade-modal');
    const modalBody = document.getElementById('arcade-modal-body');
    const prof = window.arcadeProfile;

    const unlockedCount = Object.keys(prof.data.unlockedAchievements || {}).length;
    const totalCount = prof.achievements.length;
    const pct = Math.round((unlockedCount / totalCount) * 100);

    modalBody.innerHTML = `
      <div class="achievements-container">
        <h2 class="neon-title">🏆 HALL OF TROPHIES 🏆</h2>
        <p>Unlock achievements across all mini games to earn massive coin bounties.</p>
        <div class="ach-progress-bar-box">
          <div class="ach-header-stats">
            <span>UNLOCKED: ${unlockedCount} / ${totalCount}</span>
            <span>${pct}% COMPLETE</span>
          </div>
          <div class="colorflood-progress-bar"><div class="progress-fill" style="width: ${pct}%"></div></div>
        </div>
        <div class="achievements-list">
          ${prof.achievements.map(a => {
            const isUnlocked = !!(prof.data.unlockedAchievements && prof.data.unlockedAchievements[a.id]);
            return `
              <div class="ach-row ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="ach-icon">${a.icon}</div>
                <div class="ach-details">
                  <h4>${a.title}</h4>
                  <p>${a.desc}</p>
                </div>
                <div class="ach-reward">
                  ${isUnlocked ? '<span class="ach-claimed">CLAIMED ✓</span>' : `<span class="ach-coins">+${a.reward} 🪙</span>`}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    modal.classList.add('visible');
  }

  openStatsModal() {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    const modal = document.getElementById('arcade-modal');
    const modalBody = document.getElementById('arcade-modal-body');
    const prof = window.arcadeProfile;

    modalBody.innerHTML = `
      <div class="stats-modal-container">
        <h2 class="neon-title">📊 ARCADE CAREER STATS</h2>
        <div class="stats-summary-grid">
          <div class="summary-box">
            <span class="val">${prof.data.level}</span>
            <span class="lbl">ARCADE LEVEL</span>
          </div>
          <div class="summary-box">
            <span class="val">${prof.data.totalPlays || 0}</span>
            <span class="lbl">TOTAL PLAYS</span>
          </div>
          <div class="summary-box">
            <span class="val">${prof.data.coins.toLocaleString()}</span>
            <span class="lbl">COINS EARNED</span>
          </div>
        </div>

        <h3 style="color: #00f3ff; margin: 18px 0 10px 0;">PERSONAL RECORDS</h3>
        <div class="records-table">
          ${this.games.map(g => {
            const best = prof.getHighScore(g.id);
            const plays = (prof.data.playedGames && prof.data.playedGames[g.id]) || 0;
            return `
              <div class="record-row">
                <span class="rec-name">${g.icon} ${g.title}</span>
                <span class="rec-plays">${plays} plays</span>
                <span class="rec-best">${best} pts</span>
                <button class="arcade-btn-mini rec-play-btn" data-game="${g.id}">PLAY</button>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    modal.classList.add('visible');

    modalBody.querySelectorAll('.rec-play-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('visible');
        this.launchGame(btn.getAttribute('data-game'));
      });
    });
  }

  openShareModal(gameTitle, scoreText) {
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    const modal = document.getElementById('arcade-modal');
    const modalBody = document.getElementById('arcade-modal-body');

    const shareText = `🕹️ VIRAL ARCADE: I just scored ${scoreText} on ${gameTitle}! Can you beat my record? 🔥\nPlay free in browser! #ViralArcade #GamingChallenge`;

    modalBody.innerHTML = `
      <div class="share-container">
        <h2 class="neon-title">🚀 CHALLENGE YOUR FRIENDS</h2>
        <p>Brag about your high score and challenge friends to beat you!</p>
        <textarea class="share-text-box" id="share-text" readonly>${shareText}</textarea>
        <div class="share-buttons-row">
          <button class="arcade-btn-primary" id="btn-copy-share">📋 COPY CHALLENGE</button>
          <a href="https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}" target="_blank" class="arcade-btn-secondary social-btn twitter-btn">SHARE ON X</a>
          <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}" target="_blank" class="arcade-btn-secondary social-btn wa-btn">WHATSAPP</a>
        </div>
        <div id="copy-feedback" style="display: none; color: #00ff88; font-weight: bold; margin-top: 10px;">✓ Copied challenge to clipboard!</div>
      </div>
    `;

    modal.classList.add('visible');

    document.getElementById('btn-copy-share').addEventListener('click', () => {
      navigator.clipboard.writeText(shareText).then(() => {
        const fb = document.getElementById('copy-feedback');
        if (fb) fb.style.display = 'block';
        if (window.arcadeAudio) window.arcadeAudio.playScore(true);
        setTimeout(() => { if (fb) fb.style.display = 'none'; }, 2500);
      }).catch(() => {
        // Fallback selection
        const ta = document.getElementById('share-text');
        ta.select();
        document.execCommand('copy');
        const fb = document.getElementById('copy-feedback');
        if (fb) fb.style.display = 'block';
      });
    });
  }

  triggerConfetti() {
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces = [];
    const colors = ['#00f3ff', '#ff007f', '#00ff66', '#ffe600', '#8a2be2'];
    for (let i = 0; i < 90; i++) {
      pieces.push({
        x: canvas.width / 2,
        y: canvas.height * 0.4,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        alpha: 1
      });
    }

    const confLoop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;
      pieces.forEach(p => {
        p.vy += 0.45;
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
          ctx.restore();
        }
      });

      if (alive) {
        requestAnimationFrame(confLoop);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    confLoop();
  }
}

// Global modal close binding
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('arcade-modal');
  const closeBtn = document.getElementById('arcade-modal-close');
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => {
      modal.classList.remove('visible');
    });
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('visible');
    });
  }

  window.arcadeHub = new ArcadeHub();
});
