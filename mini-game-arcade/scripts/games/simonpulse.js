/**
 * Game 9: Simon Pulse (Synthwave memory sequence matrix with procedural harmonic audio)
 */
class SimonPulseGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.sequence = [];
    this.playerStep = 0;
    this.round = 0;
    this.isComputerTurn = false;
    this.highScore = window.arcadeProfile ? window.arcadeProfile.getHighScore('simonpulse') : 0;
    this.pads = [
      { id: 0, color: '#00f3ff', name: 'CYAN' },
      { id: 1, color: '#ff007f', name: 'MAGENTA' },
      { id: 2, color: '#00ff66', name: 'LIME' },
      { id: 3, color: '#ffe600', name: 'GOLD' }
    ];

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper simonpulse-wrapper">
        <div class="simonpulse-header">
          <div class="score-pills">
            <div class="pill"><span class="pill-label">ROUND</span><span id="sp-round">0</span></div>
            <div class="pill"><span class="pill-label">RECORD</span><span id="sp-best">${this.highScore}</span></div>
          </div>
          <div class="simon-status" id="sp-status">READY</div>
        </div>

        <div class="simon-matrix-container">
          <div class="simon-matrix">
            <button class="simon-pad pad-0" data-id="0"></button>
            <button class="simon-pad pad-1" data-id="1"></button>
            <button class="simon-pad pad-2" data-id="2"></button>
            <button class="simon-pad pad-3" data-id="3"></button>
            <div class="simon-center">
              <span id="sp-center-text">START</span>
            </div>
          </div>
        </div>

        <p class="game-instruction">Memorize the sound & light sequence, then repeat it!</p>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    const pads = this.container.querySelectorAll('.simon-pad');
    pads.forEach(p => {
      p.addEventListener('click', () => {
        if (this.isComputerTurn) return;
        const id = parseInt(p.getAttribute('data-id'), 10);
        this.handlePlayerInput(id);
      });
    });

    const centerBtn = this.container.querySelector('.simon-center');
    centerBtn.addEventListener('click', () => {
      if (this.round === 0) {
        this.startGame();
      }
    });
  }

  startGame() {
    this.sequence = [];
    this.round = 0;
    this.nextRound();
  }

  nextRound() {
    this.round++;
    this.playerStep = 0;
    this.sequence.push(Math.floor(Math.random() * 4));

    document.getElementById('sp-round').textContent = this.round;
    this.playSequence();
  }

  playSequence() {
    this.isComputerTurn = true;
    const status = document.getElementById('sp-status');
    const center = document.getElementById('sp-center-text');
    if (status) status.textContent = '👀 WATCH & LISTEN';
    if (center) center.textContent = `RD ${this.round}`;

    let delay = 600;
    const speed = Math.max(250, 600 - this.round * 25);

    this.sequence.forEach((padId, index) => {
      setTimeout(() => {
        this.flashPad(padId, speed * 0.7);
        if (index === this.sequence.length - 1) {
          setTimeout(() => {
            this.isComputerTurn = false;
            if (status) status.textContent = '⚡ YOUR TURN!';
          }, speed);
        }
      }, delay);
      delay += speed;
    });
  }

  flashPad(id, duration = 300) {
    const pad = this.container.querySelector(`.pad-${id}`);
    if (!pad) return;

    pad.classList.add('active');
    if (window.arcadeAudio) window.arcadeAudio.playSimonTone(id);

    setTimeout(() => {
      pad.classList.remove('active');
    }, duration);
  }

  handlePlayerInput(id) {
    if (this.round === 0) return;

    this.flashPad(id, 200);

    if (id === this.sequence[this.playerStep]) {
      // Correct step
      this.playerStep++;

      if (this.playerStep >= this.sequence.length) {
        // Round cleared!
        const status = document.getElementById('sp-status');
        if (status) status.textContent = '✨ PERFECT!';
        if (window.arcadeAudio) window.arcadeAudio.playScore(true);

        setTimeout(() => {
          this.nextRound();
        }, 800);
      }
    } else {
      // Wrong step!
      this.die();
    }
  }

  die() {
    this.isComputerTurn = true;
    if (window.arcadeAudio) {
      window.arcadeAudio.playHit();
      setTimeout(() => window.arcadeAudio.playGameOver(), 200);
    }

    const pads = this.container.querySelectorAll('.simon-pad');
    pads.forEach(p => p.classList.add('error'));
    setTimeout(() => pads.forEach(p => p.classList.remove('error')), 600);

    const finalScore = Math.max(0, this.round - 1);
    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('simonpulse', finalScore) : { isNewBest: false, earnedCoins: 10, best: finalScore };

    this.showGameOverModal(finalScore, result);
  }

  showGameOverModal(score, result) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    modal.innerHTML = `
      <h2 class="game-over-title">SYNAPSE FRACTURE</h2>
      ${result.isNewBest ? '<div class="new-record-badge">🔥 NEW RECORD! 🔥</div>' : ''}
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${score}</span><span class="stat-lbl">ROUNDS</span></div>
        <div class="stat-box"><span class="stat-val">${result.best}</span><span class="stat-lbl">BEST</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="sp-retry-btn">REPLAY</button>
        <button class="arcade-btn-secondary" id="sp-share-btn">SHARE ROUND</button>
      </div>
    `;

    this.container.querySelector('.simonpulse-wrapper').appendChild(modal);

    document.getElementById('sp-retry-btn').addEventListener('click', () => {
      modal.remove();
      this.startGame();
    });

    document.getElementById('sp-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Simon Pulse', `${score} Rounds memorized!`);
      }
    });
  }

  destroy() {
    this.sequence = [];
  }
}

window.SimonPulseGame = SimonPulseGame;
