/**
 * Game 10: Color Flood (Flood-It style strategic territory conquest with 6 neon colors)
 */
class ColorFloodGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.size = 12;
    this.maxMoves = 22;
    this.movesLeft = 22;
    this.grid = [];
    this.colors = ['#00f3ff', '#ff007f', '#00ff66', '#ffe600', '#8a2be2', '#ff4500'];
    this.colorNames = ['Cyan', 'Magenta', 'Lime', 'Gold', 'Purple', 'Coral'];
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('colorflood') : 0;
    this.isOver = false;

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper colorflood-wrapper">
        <div class="colorflood-header">
          <div class="score-pills">
            <div class="pill"><span class="pill-label">MOVES LEFT</span><span id="cf-moves">22</span></div>
            <div class="pill"><span class="pill-label">CONQUERED</span><span id="cf-progress">1%</span></div>
          </div>
          <div class="header-actions">
            <button class="arcade-btn-mini" id="cflood-restart-btn">NEW BOARD</button>
          </div>
        </div>

        <div class="colorflood-progress-bar">
          <div class="progress-fill" id="cf-progress-fill"></div>
        </div>

        <div class="colorflood-board" id="cflood-board"></div>

        <div class="colorflood-palette" id="cflood-palette"></div>

        <p class="game-instruction">Choose colors below to flood the grid from the top-left in &le; 22 moves!</p>
      </div>
    `;

    this.renderPalette();
    this.startNewGame();
    this.bindEvents();
  }

  renderPalette() {
    const palette = document.getElementById('cflood-palette');
    palette.innerHTML = '';
    this.colors.forEach((c, idx) => {
      const btn = document.createElement('button');
      btn.className = 'color-btn';
      btn.style.backgroundColor = c;
      btn.setAttribute('data-color-idx', idx);
      btn.setAttribute('title', this.colorNames[idx]);
      btn.addEventListener('click', () => this.flood(idx));
      palette.appendChild(btn);
    });
  }

  bindEvents() {
    document.getElementById('cflood-restart-btn').addEventListener('click', () => {
      this.startNewGame();
    });
  }

  startNewGame() {
    this.movesLeft = this.maxMoves;
    this.isOver = false;
    this.grid = Array(this.size).fill(null).map(() =>
      Array(this.size).fill(0).map(() => Math.floor(Math.random() * this.colors.length))
    );

    this.renderBoard();
    this.updateStats();
  }

  renderBoard() {
    const board = document.getElementById('cflood-board');
    if (!board) return;
    board.innerHTML = '';
    board.style.gridTemplateColumns = `repeat(${this.size}, 1fr)`;

    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = document.createElement('div');
        cell.className = 'flood-cell';
        cell.id = `fc-${r}-${c}`;
        cell.style.backgroundColor = this.colors[this.grid[r][c]];
        board.appendChild(cell);
      }
    }
  }

  getConnectedTerritory() {
    const targetColor = this.grid[0][0];
    const visited = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
    const territory = [];
    const queue = [{ r: 0, c: 0 }];
    visited[0][0] = true;

    while (queue.length > 0) {
      const { r, c } = queue.shift();
      territory.push({ r, c });

      const neighbors = [
        { r: r - 1, c }, { r: r + 1, c },
        { r, c: c - 1 }, { r, c: c + 1 }
      ];

      for (const n of neighbors) {
        if (n.r >= 0 && n.r < this.size && n.c >= 0 && n.c < this.size) {
          if (!visited[n.r][n.c] && this.grid[n.r][n.c] === targetColor) {
            visited[n.r][n.c] = true;
            queue.push(n);
          }
        }
      }
    }
    return territory;
  }

  flood(newColorIdx) {
    if (this.isOver) return;
    const currentColorIdx = this.grid[0][0];
    if (newColorIdx === currentColorIdx) return; // Same color, ignore

    this.movesLeft--;
    if (window.arcadeAudio) window.arcadeAudio.playFloodFill(newColorIdx);

    // Find current flooded territory
    const territory = this.getConnectedTerritory();

    // Change their color to newColorIdx
    territory.forEach(({ r, c }) => {
      this.grid[r][c] = newColorIdx;
      const cellEl = document.getElementById(`fc-${r}-${c}`);
      if (cellEl) {
        cellEl.style.backgroundColor = this.colors[newColorIdx];
        cellEl.classList.add('pulse');
        setTimeout(() => cellEl.classList.remove('pulse'), 300);
      }
    });

    // Check newly absorbed cells
    const newTerritory = this.getConnectedTerritory();
    newTerritory.forEach(({ r, c }) => {
      const cellEl = document.getElementById(`fc-${r}-${c}`);
      if (cellEl) cellEl.style.backgroundColor = this.colors[newColorIdx];
    });

    this.updateStats();

    // Check Win
    const totalCells = this.size * this.size;
    if (newTerritory.length === totalCells) {
      this.win();
    } else if (this.movesLeft <= 0) {
      this.lose();
    }
  }

  updateStats() {
    const territory = this.getConnectedTerritory();
    const totalCells = this.size * this.size;
    const pct = Math.round((territory.length / totalCells) * 100);

    const movesEl = document.getElementById('cf-moves');
    const progEl = document.getElementById('cf-progress');
    const fillEl = document.getElementById('cf-progress-fill');

    if (movesEl) movesEl.textContent = this.movesLeft;
    if (progEl) progEl.textContent = `${pct}%`;
    if (fillEl) fillEl.style.width = `${pct}%`;
  }

  win() {
    this.isOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playVictory();

    const score = this.movesLeft * 25 + 100;
    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('colorflood', score, { won: true, remainingMoves: this.movesLeft }) : { isNewBest: true, earnedCoins: 30, best: score };

    this.showEndModal(true, result);
  }

  lose() {
    this.isOver = true;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    const territory = this.getConnectedTerritory();
    const pct = Math.round((territory.length / (this.size * this.size)) * 100);
    const score = pct;
    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('colorflood', score, { won: false, remainingMoves: 0 }) : { isNewBest: false, earnedCoins: 5, best: 0 };

    this.showEndModal(false, result);
  }

  showEndModal(won, result) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    const territory = this.getConnectedTerritory();
    const pct = Math.round((territory.length / (this.size * this.size)) * 100);

    modal.innerHTML = `
      <h2 class="neon-title" style="color: ${won ? '#00ff88' : '#ff007f'};">${won ? 'GRID CONQUERED!' : 'OUT OF MOVES'}</h2>
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${pct}%</span><span class="stat-lbl">CONQUERED</span></div>
        <div class="stat-box"><span class="stat-val">${this.movesLeft}</span><span class="stat-lbl">MOVES LEFT</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="cf-retry-btn">PLAY AGAIN</button>
        <button class="arcade-btn-secondary" id="cf-share-btn">SHARE CONQUEST</button>
      </div>
    `;

    this.container.querySelector('.colorflood-wrapper').appendChild(modal);

    document.getElementById('cf-retry-btn').addEventListener('click', () => {
      modal.remove();
      this.startNewGame();
    });

    document.getElementById('cf-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Color Flood', won ? `Conquered with ${this.movesLeft} moves left!` : `${pct}% Conquered!`);
      }
    });
  }

  destroy() {
    this.isOver = true;
  }
}

window.ColorFloodGame = ColorFloodGame;
