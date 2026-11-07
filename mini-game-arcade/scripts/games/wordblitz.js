/**
 * Game 7: Word Blitz (Wordle-style 5-letter guessing game with neon keyboard and share grid)
 */
class WordBlitzGame {
  constructor(container, onGameOver) {
    this.container = container;
    this.onGameOver = onGameOver;
    this.maxGuesses = 6;
    this.wordLength = 5;
    this.targetWord = '';
    this.guesses = [];
    this.currentGuess = '';
    this.isOver = false;
    this.hasWon = false;
    this.letterStates = {}; // 'A': 'correct' | 'present' | 'absent'

    this.init();
  }

  init() {
    this.container.innerHTML = `
      <div class="game-wrapper wordblitz-wrapper">
        <div class="wordblitz-header">
          <div class="score-pills">
            <div class="pill"><span class="pill-label">STREAK</span><span id="wb-streak">0</span></div>
            <div class="pill"><span class="pill-label">WINS</span><span id="wb-wins">0</span></div>
          </div>
          <div class="header-actions">
            <button class="arcade-btn-mini" id="wb-hint-btn">💡 HINT</button>
            <button class="arcade-btn-mini" id="wb-restart-btn">NEW WORD</button>
          </div>
        </div>

        <div class="wordblitz-grid" id="wb-board"></div>

        <div class="wordblitz-keyboard" id="wb-keyboard">
          <div class="kb-row" id="kb-row-1"></div>
          <div class="kb-row" id="kb-row-2"></div>
          <div class="kb-row" id="kb-row-3"></div>
        </div>
      </div>
    `;

    this.renderKeyboard();
    this.startNewGame();
    this.bindEvents();
  }

  startNewGame() {
    const list = window.WORDLE_TARGETS || ['CYBER', 'NEON', 'ROBOT', 'LASER', 'PULSE', 'GAMES', 'TURBO', 'BLITZ'];
    this.targetWord = list[Math.floor(Math.random() * list.length)].toUpperCase();
    this.guesses = [];
    this.currentGuess = '';
    this.isOver = false;
    this.hasWon = false;
    this.letterStates = {};

    this.renderBoard();
    this.updateKeyboardColors();
  }

  renderBoard() {
    const board = document.getElementById('wb-board');
    if (!board) return;
    board.innerHTML = '';

    for (let r = 0; r < this.maxGuesses; r++) {
      const row = document.createElement('div');
      row.className = 'wb-row';
      row.id = `wb-row-${r}`;

      const guess = this.guesses[r];
      const isCurrentRow = (r === this.guesses.length && !this.isOver);

      for (let c = 0; c < this.wordLength; c++) {
        const tile = document.createElement('div');
        tile.className = 'wb-tile';
        tile.id = `wb-tile-${r}-${c}`;

        if (guess) {
          tile.textContent = guess[c];
          tile.classList.add(this.getTileStatus(guess, c));
        } else if (isCurrentRow && this.currentGuess[c]) {
          tile.textContent = this.currentGuess[c];
          tile.classList.add('wb-tile-filled');
        }

        row.appendChild(tile);
      }
      board.appendChild(row);
    }
  }

  getTileStatus(guess, index) {
    const letter = guess[index];
    if (this.targetWord[index] === letter) {
      return 'tile-correct';
    }
    if (this.targetWord.includes(letter)) {
      return 'tile-present';
    }
    return 'tile-absent';
  }

  renderKeyboard() {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL']
    ];

    rows.forEach((rowLetters, rIdx) => {
      const rowEl = document.getElementById(`kb-row-${rIdx + 1}`);
      rowEl.innerHTML = '';
      rowLetters.forEach(k => {
        const keyBtn = document.createElement('button');
        keyBtn.className = `kb-key ${k.length > 1 ? 'kb-key-wide' : ''}`;
        keyBtn.setAttribute('data-key', k);
        keyBtn.textContent = k === 'DEL' ? '⌫' : k;
        keyBtn.addEventListener('click', () => this.handleKeyInput(k));
        rowEl.appendChild(keyBtn);
      });
    });
  }

  updateKeyboardColors() {
    const keys = document.querySelectorAll('.kb-key');
    keys.forEach(k => {
      const letter = k.getAttribute('data-key');
      k.classList.remove('kb-correct', 'kb-present', 'kb-absent');
      if (this.letterStates[letter]) {
        k.classList.add(`kb-${this.letterStates[letter]}`);
      }
    });
  }

  bindEvents() {
    this.boundKeyDown = (e) => {
      if (this.isOver) return;
      if (e.key === 'Enter') {
        this.handleKeyInput('ENTER');
      } else if (e.key === 'Backspace') {
        this.handleKeyInput('DEL');
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this.handleKeyInput(e.key.toUpperCase());
      }
    };
    window.addEventListener('keydown', this.boundKeyDown);

    document.getElementById('wb-restart-btn').addEventListener('click', () => {
      this.startNewGame();
    });

    document.getElementById('wb-hint-btn').addEventListener('click', () => {
      this.giveHint();
    });
  }

  giveHint() {
    if (this.isOver) return;
    // Find a letter in targetWord not yet correctly placed
    for (let i = 0; i < this.wordLength; i++) {
      const char = this.targetWord[i];
      if (this.letterStates[char] !== 'correct') {
        if (window.arcadeProfile) {
          window.arcadeProfile.showToast(`💡 Hint: The word contains "${char}"!`, 'info');
        }
        if (window.arcadeAudio) window.arcadeAudio.playScore(true);
        return;
      }
    }
    if (window.arcadeProfile) {
      window.arcadeProfile.showToast('You already know all letters!', 'info');
    }
  }

  handleKeyInput(key) {
    if (this.isOver) return;

    if (key === 'DEL') {
      if (this.currentGuess.length > 0) {
        this.currentGuess = this.currentGuess.slice(0, -1);
        if (window.arcadeAudio) window.arcadeAudio.playKeyTap();
        this.renderBoard();
      }
    } else if (key === 'ENTER') {
      if (this.currentGuess.length === this.wordLength) {
        this.submitGuess();
      } else {
        this.shakeRow();
      }
    } else if (this.currentGuess.length < this.wordLength) {
      this.currentGuess += key;
      if (window.arcadeAudio) window.arcadeAudio.playKeyTap();
      this.renderBoard();
    }
  }

  shakeRow() {
    const row = document.getElementById(`wb-row-${this.guesses.length}`);
    if (row) {
      row.classList.add('shake');
      if (window.arcadeAudio) window.arcadeAudio.playHit();
      setTimeout(() => row.classList.remove('shake'), 400);
    }
  }

  submitGuess() {
    const guess = this.currentGuess;
    this.guesses.push(guess);
    const rowIdx = this.guesses.length - 1;

    // Flip animation & sound
    for (let c = 0; c < this.wordLength; c++) {
      const tile = document.getElementById(`wb-tile-${rowIdx}-${c}`);
      const letter = guess[c];
      let status = 'absent';

      if (this.targetWord[c] === letter) {
        status = 'correct';
      } else if (this.targetWord.includes(letter)) {
        status = 'present';
      }

      if (tile) {
        tile.classList.add('flipping');
        setTimeout(() => {
          tile.classList.add(status === 'correct' ? 'tile-correct' : (status === 'present' ? 'tile-present' : 'tile-absent'));
          if (window.arcadeAudio) window.arcadeAudio.playFlip(status);
        }, c * 100);
      }

      // Update keyboard letter state
      if (!this.letterStates[letter] || this.letterStates[letter] === 'absent') {
        this.letterStates[letter] = status;
      } else if (this.letterStates[letter] === 'present' && status === 'correct') {
        this.letterStates[letter] = 'correct';
      }
    }

    setTimeout(() => {
      this.updateKeyboardColors();
      this.currentGuess = '';

      if (guess === this.targetWord) {
        this.win();
      } else if (this.guesses.length >= this.maxGuesses) {
        this.lose();
      } else {
        this.renderBoard();
      }
    }, this.wordLength * 100 + 100);
  }

  generateShareGrid() {
    let result = `Word Blitz ${this.guesses.length}/${this.maxGuesses}\n`;
    this.guesses.forEach(g => {
      for (let i = 0; i < this.wordLength; i++) {
        if (this.targetWord[i] === g[i]) result += '🟩';
        else if (this.targetWord.includes(g[i])) result += '🟨';
        else result += '⬛';
      }
      result += '\n';
    });
    return result;
  }

  win() {
    this.isOver = true;
    this.hasWon = true;
    if (window.arcadeAudio) window.arcadeAudio.playVictory();

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('wordblitz', (7 - this.guesses.length) * 10, { won: true, attempts: this.guesses.length }) : { isNewBest: true, earnedCoins: 25, best: 50 };

    this.showEndModal(true, result);
  }

  lose() {
    this.isOver = true;
    this.hasWon = false;
    if (window.arcadeAudio) window.arcadeAudio.playGameOver();

    const result = window.arcadeProfile ? window.arcadeProfile.recordGamePlay('wordblitz', 5, { won: false, attempts: 6 }) : { isNewBest: false, earnedCoins: 5, best: 0 };

    this.showEndModal(false, result);
  }

  showEndModal(won, result) {
    const modal = document.createElement('div');
    modal.className = 'game-over-modal';
    const gridShare = this.generateShareGrid();

    modal.innerHTML = `
      <h2 class="neon-title" style="color: ${won ? '#00ff88' : '#ff007f'};">${won ? 'BRILLIANT DECRYPTION!' : 'CIPHER LOCKED'}</h2>
      <p style="font-size: 1.15rem; margin: 10px 0;">The target word was: <strong style="color: #00f3ff; font-family: monospace; letter-spacing: 2px;">${this.targetWord}</strong></p>
      <div class="stats-grid">
        <div class="stat-box"><span class="stat-val">${won ? `${this.guesses.length}/6` : 'X/6'}</span><span class="stat-lbl">TRIES</span></div>
        <div class="stat-box"><span class="stat-val">+${result.earnedCoins}</span><span class="stat-lbl">COINS</span></div>
      </div>
      <pre style="background: #000; padding: 10px; border-radius: 8px; font-size: 1.1rem; line-height: 1.3; margin: 12px 0;">${gridShare}</pre>
      <div class="modal-actions">
        <button class="arcade-btn-primary" id="wb-again-btn">NEXT WORD</button>
        <button class="arcade-btn-secondary" id="wb-share-btn">SHARE RESULTS</button>
      </div>
    `;

    this.container.querySelector('.wordblitz-wrapper').appendChild(modal);

    document.getElementById('wb-again-btn').addEventListener('click', () => {
      modal.remove();
      this.startNewGame();
    });

    document.getElementById('wb-share-btn').addEventListener('click', () => {
      if (window.arcadeHub) {
        window.arcadeHub.openShareModal('Word Blitz', `${won ? this.guesses.length : 'X'}/6\n${gridShare}`);
      }
    });
  }

  destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
  }
}

window.WordBlitzGame = WordBlitzGame;
