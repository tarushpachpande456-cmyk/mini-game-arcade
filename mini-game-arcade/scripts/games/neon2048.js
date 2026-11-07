/**
 * Game 2: Neon 2048 (Sliding tile merge with glowing cyber aesthetics)
 */
class Neon2048Game {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.size = 4;
    this.grid = [];
    this.prevGrid = null;
    this.score = 0;
    this.prevScore = 0;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('neon2048') : 0;
    this.hasWon = false;
    this.keepPlaying = false;
    this.undoAvailable = 1;
    this.maxTile = 2;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper neon2048-wrapper">
        <div class="neon2048-header">
          <div class="score-pills">
            <div class="pill"><span class="pill-label">SCORE</span><span id="n2048-score">0</span></div>
            <div class="pill"><span class="pill-label">BEST</span><span id="n2048-best">${this.highScore}</span></div>
          </div>
          <div class="header-actions">
            <button class="arcade-btn-mini" id="n2048-undo-btn" title="Undo Last Move">↺ UNDO (1)</button>
            <button class="arcade-btn-mini" id="n2048-restart-btn">RESTART</button>
          </div>
        </div>

        <div class="neon2048-board-container" id="n2048-touch-zone">
          <div class="neon2048-board" id="n2048-board"></div>
        </div>

        <div class="neon2048-controls-dpad">
          <button class="dpad-btn dpad-up" data-dir="up">▲</button>
          <div class="dpad-mid">
            <button class="dpad-btn dpad-left" data-dir="left">◀</button>
            <button class="dpad-btn dpad-down" data-dir="down">▼</button>
            <button class="dpad-btn dpad-right" data-dir="right">▶</button>
          </div>
        </div>
        <p class="game-instruction">Use <strong>Arrow Keys</strong>, <strong>WASD</strong>, or Swipe to merge tiles</p>
      </div>
    `;

    this.setupGrid();
    this.bindEvents();
  }

  setupGrid() {
    this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    this.score = 0;
    this.hasWon = false;
    this.keepPlaying = false;
    this.undoAvailable = 1;
    this.maxTile = 2;
    this.prevGrid = null;

    this.addRandomTile();
    this.addRandomTile();
    this.render();
  }

  saveState() {
    this.prevGrid = this.grid.map(row => [...row]);
    this.prevScore = this.score;
  }

  undo() {
    if (this.undoAvailable <= 0 || !this.prevGrid) {
      if (window.arcadeProfile) window.arcadeProfile.showToast('No undos remaining this round!', 'info');
      return;
    }
    this.grid = this.prevGrid.map(row => [...row]);
    this.score = this.prevScore;
    this.undoAvailable--;
    const undoBtn = document.getElementById('n2048-undo-btn');
    if (undoBtn) undoBtn.textContent = `↺ UNDO (${this.undoAvailable})`;
    if (window.arcadeAudio) window.arcadeAudio.playSelect();
    this.render();
  }

  addRandomTile() {
    const emptyCells = [];
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return;
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    this.grid[randomCell.r][randomCell.c] = val;
  }

  bindEvents() {
    this.boundKeyDown = (e) => {
      let moved = false;
      if (['ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        moved = this.move('up');
      } else if (['ArrowDown', 'KeyS'].includes(e.code)) {
        e.preventDefault();
        moved = this.move('down');
      } else if (['ArrowLeft', 'KeyA'].includes(e.code)) {
        e.preventDefault();
        moved = this.move('left');
      } else if (['ArrowRight', 'KeyD'].includes(e.code)) {
        e.preventDefault();
        moved = this.move('right');
      }

      if (moved) {
        this.afterMove();
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    // D-Pad buttons
    const dpadButtons = this.container.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.getAttribute('data-dir');
        if (this.move(dir)) {
          this.afterMove();
        }
      });
    });

    // Touch Swipe gestures
    const touchZone = document.getElementById('n2048-touch-zone');
    let startX = 0, startY = 0;
    touchZone.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    touchZone.addEventListener('touchend', (e) => {
      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;
      const absX = Math.abs(diffX);
      const absY = Math.abs(diffY);

      if (Math.max(absX, absY) > 30) {
        let moved = false;
        if (absX > absY) {
          moved = this.move(diffX > 0 ? 'right' : 'left');
        } else {
          moved = this.move(diffY > 0 ? 'down' : 'up');
        }
        if (moved) this.afterMove();
      }
    }, { passive: true });

    // Buttons
    document.getElementById('n2048-restart-btn').addEventListener('click', () => {
      this.setupGrid();
    });
    document.getElementById('n2048-undo-btn').addEventListener('click', () => {
      this.undo();
    });
  }

  move(direction) {
    this.saveState();
    let rotated = false;
    let rotations = 0;

    if (direction === 'up') {
      this.rotateLeft();
      rotations = 1;
    } else if (direction === 'right') {
      this.rotateLeft();
      this.rotateLeft();
      rotations = 2;
    } else if (direction === 'down') {
      this.rotateLeft();
      this.rotateLeft();
      this.rotateLeft();
      rotations = 3;
    }

    let moved = false;
    let highestMergedTier = 0;

    for (let r = 0; r < this.size; r++) {
      const row = this.grid[r].filter(val => val !== 0);
      const newRow = [];

      for (let i = 0; i < row.length; i++) {
        if (i < row.length - 1 && row[i] === row[i + 1]) {
          const mergedVal = row[i] * 2;
          newRow.push(mergedVal);
          this.score += mergedVal;
          if (mergedVal > this.maxTile) this.maxTile = mergedVal;
          const tier = Math.log2(mergedVal);
          if (tier > highestMergedTier) highestMergedTier = tier;
          i++;
        } else {
          newRow.push(row[i]);
        }
      }

      while (newRow.length < this.size) {
        newRow.push(0);
      }

      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] !== newRow[c]) moved = true;
      }
      this.grid[r] = newRow;
    }

    // Restore rotation
    const restoreRotations = (4 - rotations) % 4;
    for (let i = 0; i < restoreRotations; i++) {
      this.rotateLeft();
    }

    if (highestMergedTier > 0 && window.arcadeAudio) {
      window.arcadeAudio.playMerge(highestMergedTier);
    }

    return moved;
  }

  rotateLeft() {
    const newGrid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        newGrid[this.size - 1 - c][r] = this.grid[r][c];
      }
    }
    this.grid = newGrid;
  }

  afterMove() {
    this.addRandomTile();
    this.render();

    // Check Win
    if (!this.hasWon && !this.keepPlaying) {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c] === 2048) {
            this.hasWon = true;
            this.showWinModal();
            return;
          }
        }
      }
    }

    // Check Game Over
    if (this.checkGameOver()) {
      this.gameOver();
    }
  }

  checkGameOver() {
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.grid[r][c] === 0) return false;
        if (c < this.size - 1 && this.grid[r][c] === this.grid[r][c + 1]) return false;
        if (r < this.size - 1 && this.grid[r][c] === this.grid[r + 1][c]) return false;
      }
    }
    return true;
  }

  render() {
    const board = document.getElementById('n2048-board');
    if (!board) return;
    board.innerHTML = '';

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const val = this.grid[r][c];
        const tile = document.createElement('div');
        tile.className = `n2048-tile ${val ? `tile-${val}` : 'tile-empty'}`;
        if (val) {
          tile.textContent = val;
          tile.setAttribute('data-val', val);
        }
        board.appendChild(tile);
      }
    }

    document.getElementById('n2048-score').textContent = this.score;
    const bestEl = document.getElementById('n2048-best');
    if (this.score > this.highScore) {
      bestEl.textContent = this.score;
    }
  }

  showWinModal() {
    if (window.arcadeAudio) window.arcadeAudio.playVictory();
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = `
      <h2 class="neon-title" style="color: #ffe600;">✨ 2048 UNLOCKED! ✨</h2>
      <p>Incredible strategy! You synthesized the legendary 2048 tile!</p>
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">SCORE</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="n2048-keep-btn">KEEP PLAYING</button>
        <button class="arcade-btn-secondary" id="n2048-win-restart">NEW GAME</button>
      </div>
    `;
    this.container.querySelector('.neon2048-wrapper').appendChild(modal);

    document.getElementById('n2048-keep-btn').addEventListener('click', () => {
      this.keepPlaying = true;
      modal.remove();
    });
    document.getElementById('n2048-win-restart').addEventListener('click', () => {
      modal.remove();
      this.setupGrid();
    });
  }

  gameOver() {
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();
    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('neon2048', this.score, { maxTile: this.maxTile }) : { isNewBest: false, earnedCoins: 15, best: this.score };

    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = `
      <h2 class="game-over-title">GRID LOCKED</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${this.score}</span><span class="stat-lbl">SCORE</span></div>
        <div class="stat-box"><span class="stat-val">${this.maxTile}</span><span class="stat-lbl">MAX TILE</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="n2048-retry-btn">PLAY AGAIN</button>
        <button class="arcade-btn-secondary" id="n2048-share-btn">SHARE SCORE</button>
      </div>
    `;
    this.container.querySelector('.neon2048-wrapper').appendChild(modal);

    document.getElementById('n2048-retry-btn').addEventListener('click', () => {
      modal.remove();
      this.setupGrid();
    });
    document.getElementById('n2048-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Neon 2048', this.score);
      }
    });
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}

window.Neon2048Game = Neon2048Game;
