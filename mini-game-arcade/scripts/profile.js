/**
 * Arcade Player Profile, High Scores, Economy & Achievements System
 */
class ArcadeProfile {
  constructor() {
    this.storageKey = 'viral_arcade_profile_v1';
    this.data = this.load();
    this.achievements = [
      { id: 'first_game', title: 'First Coin', desc: 'Play your first arcade mini-game', reward: 50, icon: '🪙' },
      { id: 'all_games', title: 'Arcade Hopper', desc: 'Play all 10 mini-games at least once', reward: 250, icon: '🕹️' },
      { id: 'flap_ace', title: 'Cyber Wings', desc: 'Score 15+ in Cyber Flap', reward: 100, icon: '🦅' },
      { id: 'tile_master', title: 'Binary Fusion', desc: 'Reach 1024 or higher in Neon 2048', reward: 150, icon: '🔢' },
      { id: 'cyber_dash', title: 'Grid Runner', desc: 'Run 500+ meters in Cyber Runner', reward: 100, icon: '🏃' },
      { id: 'stack_god', title: 'Skyline Architect', desc: 'Stack 25+ blocks in Tower Stacker', reward: 100, icon: '🏢' },
      { id: 'blade_pro', title: 'Blade Prodigy', desc: 'Reach Stage 5 in Blade Master', reward: 150, icon: '🗡️' },
      { id: 'snake_king', title: 'Viper Supreme', desc: 'Reach length 20+ in Neon Snake DX', reward: 100, icon: '🐍' },
      { id: 'word_wizard', title: 'Lexicon Genius', desc: 'Solve Word Blitz in 3 tries or fewer', reward: 150, icon: '📖' },
      { id: 'aim_god', title: 'Deadeye Reflexes', desc: 'Score 40+ targets in Reflex Aim Lab', reward: 100, icon: '🎯' },
      { id: 'simon_mind', title: 'Synaptic Link', desc: 'Reach sequence 8+ in Simon Pulse', reward: 120, icon: '🧠' },
      { id: 'flood_conqueror', title: 'Color Sovereign', desc: 'Clear Color Flood with 3+ moves remaining', reward: 120, icon: '🎨' },
      { id: 'coin_hoarder', title: 'Arcade Tycoon', desc: 'Amass 1,000 total arcade coins', reward: 300, icon: '👑' },
      { id: 'theme_stylist', title: 'Visual Drip', desc: 'Unlock an arcade custom theme', reward: 100, icon: '✨' }
    ];

    this.themes = [
      { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Classic electric cyan & hot magenta', price: 0, preview: ['#00f3ff', '#ff007f'] },
      { id: 'synthwave', name: 'Synthwave 84', desc: 'Retro sunset violet & golden amber', price: 250, preview: ['#8a2be2', '#ffaa00'] },
      { id: 'matrix', name: 'Matrix Terminal', desc: 'Hacker emerald & phosphor glow', price: 400, preview: ['#00ff66', '#003311'] },
      { id: 'hyperred', name: 'Laser Crimson', desc: 'High octane red & solar flare gold', price: 500, preview: ['#ff1744', '#ffea00'] },
      { id: 'deepspace', name: 'Void OLED', desc: 'Pitch black with icy celestial blue', price: 600, preview: ['#00d4ff', '#181b2e'] }
    ];

    this.applyTheme(this.data.activeTheme || 'cyberpunk');
  }

  load() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Could not load profile', e);
    }
    return {
      coins: 100, // Starter bonus!
      xp: 0,
      level: 1,
      totalPlays: 0,
      playedGames: {},
      highScores: {},
      unlockedAchievements: {},
      unlockedThemes: { cyberpunk: true },
      activeTheme: 'cyberpunk',
      lastDailyChallenge: null
    };
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save profile', e);
    }
  }

  getCoins() {
    return this.data.coins;
  }

  addCoins(amount) {
    if (amount <= 0) return;
    this.data.coins += amount;
    this.addXP(amount * 2);
    if (this.data.coins >= 1000) {
      this.unlockAchievement('coin_hoarder');
    }
    this.save();
    this.updateHUD();
  }

  spendCoins(amount) {
    if (this.data.coins >= amount) {
      this.data.coins -= amount;
      this.save();
      this.updateHUD();
      return true;
    }
    return false;
  }

  addXP(amount) {
    this.data.xp += amount;
    const nextLevelXP = this.data.level * 150;
    if (this.data.xp >= nextLevelXP) {
      this.data.xp -= nextLevelXP;
      this.data.level++;
      if (window.arcadeAudio) window.arcadeAudio.playAchievement();
      this.showToast(`🎉 Level Up! You reached Level ${this.data.level}!`, 'success');
    }
    this.save();
    this.updateHUD();
  }

  getHighScore(gameId) {
    return this.data.highScores[gameId] || 0;
  }

  recordGamePlay(gameId, score, extraData = {}) {
    this.data.totalPlays = (this.data.totalPlays || 0) + 1;
    this.data.playedGames = this.data.playedGames || {};
    this.data.playedGames[gameId] = (this.data.playedGames[gameId] || 0) + 1;

    // Check first game achievement
    this.unlockAchievement('first_game');

    // Check all games played achievement
    const distinctPlayed = Object.keys(this.data.playedGames).length;
    if (distinctPlayed >= 10) {
      this.unlockAchievement('all_games');
    }

    // High score check
    const currentBest = this.getHighScore(gameId);
    let isNewBest = false;
    let earnedCoins = Math.max(5, Math.floor(score / 8));

    // Special game scoring logic (e.g. Wordle or ColorFlood where lower moves or win counts)
    if (gameId === 'colorflood') {
      // For colorflood, extraData.won determines victory and extraData.remainingMoves
      if (score > currentBest) {
        this.data.highScores[gameId] = score;
        isNewBest = true;
      }
    } else {
      if (score > currentBest) {
        this.data.highScores[gameId] = score;
        isNewBest = true;
        earnedCoins += 25; // Bonus coins for breaking record!
      }
    }

    // Game-specific achievement tests
    if (gameId === 'cyberflap' && score >= 15) this.unlockAchievement('flap_ace');
    if (gameId === 'neon2048' && (score >= 1024 || extraData.maxTile >= 1024)) this.unlockAchievement('tile_master');
    if (gameId === 'cyberrunner' && score >= 500) this.unlockAchievement('cyberdash');
    if (gameId === 'towerstack' && score >= 25) this.unlockAchievement('stack_god');
    if (gameId === 'blademaster' && (score >= 20 || extraData.stage >= 5)) this.unlockAchievement('blade_pro');
    if (gameId === 'neonsnake' && (score >= 200 || extraData.length >= 20)) this.unlockAchievement('snake_king');
    if (gameId === 'wordblitz' && extraData.won && extraData.attempts <= 3) this.unlockAchievement('word_wizard');
    if (gameId === 'reflexaim' && score >= 40) this.unlockAchievement('aim_god');
    if (gameId === 'simonpulse' && score >= 8) this.unlockAchievement('simon_mind');
    if (gameId === 'colorflood' && extraData.won && extraData.remainingMoves >= 3) this.unlockAchievement('flood_conqueror');

    this.addCoins(earnedCoins);
    this.save();
    return { isNewBest, earnedCoins, best: this.getHighScore(gameId) };
  }

  unlockAchievement(id) {
    if (!this.data.unlockedAchievements) this.data.unlockedAchievements = {};
    if (this.data.unlockedAchievements[id]) return; // already unlocked

    const ach = this.achievements.find(a => a.id === id);
    if (!ach) return;

    this.data.unlockedAchievements[id] = Date.now();
    this.addCoins(ach.reward);
    if (window.arcadeAudio) window.arcadeAudio.playAchievement();
    this.showToast(`🏆 Achievement Unlocked: ${ach.title} (+${ach.reward} 🪙)`, 'achievement');
    this.save();
  }

  applyTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return;
    document.documentElement.setAttribute('data-theme', themeId);
    this.data.activeTheme = themeId;
    this.save();
  }

  unlockTheme(themeId) {
    const theme = this.themes.find(t => t.id === themeId);
    if (!theme) return false;
    if (this.data.unlockedThemes[themeId]) return true;

    if (this.spendCoins(theme.price)) {
      this.data.unlockedThemes[themeId] = true;
      this.unlockAchievement('theme_stylist');
      this.applyTheme(themeId);
      this.showToast(`✨ Unlocked "${theme.name}" Theme!`, 'success');
      this.save();
      return true;
    } else {
      this.showToast(`❌ Not enough coins! Need ${theme.price} 🪙`, 'error');
      return false;
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('arcade-toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `arcade-toast toast-${type}`;
    toast.innerHTML = `<span class="toast-msg">${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 3800);
  }

  updateHUD() {
    const coinEl = document.getElementById('global-coins-display');
    if (coinEl) coinEl.textContent = this.data.coins.toLocaleString();

    const levelEl = document.getElementById('global-level-display');
    if (levelEl) levelEl.textContent = `LVL ${this.data.level}`;

    const xpBar = document.getElementById('global-xp-fill');
    if (xpBar) {
      const nextXP = this.data.level * 150;
      const pct = Math.min(100, Math.round((this.data.xp / nextXP) * 100));
      xpBar.style.width = `${pct}%`;
    }
  }
}

// Global profile singleton
window.arcadeProfile = new ArcadeProfile();
