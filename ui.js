(function () {
  "use strict";
  const L = window.AwaleLogic;
  const AI = window.AwaleAI;

  const TOP_ROW = [11, 10, 9, 8, 7, 6];
  const BOTTOM_ROW = [0, 1, 2, 3, 4, 5];

  const DOT_POS = [
    [50, 48],
    [50, 32], [63, 41], [58, 59], [42, 59], [37, 41],
    [50, 18], [68, 27], [74, 48], [68, 69], [50, 78], [32, 69], [26, 48], [32, 27],
    [50, 8], [79, 16], [86, 37], [84, 60], [72, 79], [52, 88], [30, 82], [15, 66], [13, 42], [22, 22],
  ];

  const DEPTHS = { easy: 2, medium: 4, hard: 7 };

  const els = {
    mode: document.getElementById("mode"),
    difficulty: document.getElementById("difficulty"),
    difficultyWrap: document.getElementById("difficulty-wrap"),
    newGame: document.getElementById("new-game"),
    status: document.getElementById("status"),
    rowTop: document.getElementById("row-top"),
    rowBottom: document.getElementById("row-bottom"),
    nameTop: document.getElementById("name-top"),
    nameBottom: document.getElementById("name-bottom"),
    countTop: document.getElementById("count-top"),
    countBottom: document.getElementById("count-bottom"),
    overlay: document.getElementById("overlay"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayText: document.getElementById("overlay-text"),
    overlayNewGame: document.getElementById("overlay-new-game"),
  };

  let state = L.initialState();
  let mode = "pvp";
  let difficulty = "medium";
  let animating = false;
  let gameId = 0;

  function playerName(p) {
    if (mode === "ai") return p === 0 ? "Vous" : "Ordinateur";
    return p === 0 ? "Joueur 1" : "Joueur 2";
  }

  function makePit(pit) {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "pit";
    el.dataset.pit = String(pit);
    el.innerHTML = '<div class="seeds"></div><span class="count"></span>';
    el.addEventListener("click", () => onPitClick(pit));
    return el;
  }

  function buildPits() {
    els.rowTop.innerHTML = "";
    els.rowBottom.innerHTML = "";
    for (const pit of TOP_ROW) els.rowTop.appendChild(makePit(pit));
    for (const pit of BOTTOM_ROW) els.rowBottom.appendChild(makePit(pit));
  }

  function pitEl(pit) {
    return document.querySelector('.pit[data-pit="' + pit + '"]');
  }

  function render(boardOverride) {
    const board = boardOverride || state.board;
    for (let i = 0; i < L.PIT_COUNT; i++) {
      const el = pitEl(i);
      const seedsEl = el.querySelector(".seeds");
      const countEl = el.querySelector(".count");
      const n = board[i];
      countEl.textContent = n > 0 ? String(n) : "";
      seedsEl.innerHTML = "";
      const shown = Math.min(n, DOT_POS.length);
      for (let k = 0; k < shown; k++) {
        const d = document.createElement("span");
        d.className = "seed";
        d.style.left = DOT_POS[k][0] + "%";
        d.style.top = DOT_POS[k][1] + "%";
        seedsEl.appendChild(d);
      }
    }
    const legal = animating || L.isGameOver(state) ? [] : L.legalMoves(state);
    for (let i = 0; i < L.PIT_COUNT; i++) {
      const el = pitEl(i);
      const own = L.isOwnPit(state.player, i);
      el.classList.toggle("playable", !animating && own && legal.includes(i));
    }
    els.countTop.textContent = String(state.scores[1]);
    els.countBottom.textContent = String(state.scores[0]);
    els.nameTop.textContent = playerName(1);
    els.nameBottom.textContent = playerName(0);
  }

  function updateStatus() {
    if (L.isGameOver(state)) {
      els.status.textContent = "Partie terminée";
      return;
    }
    if (mode === "ai" && state.player === 1) {
      els.status.textContent = "L'ordinateur réfléchit…";
    } else {
      els.status.textContent = "Au tour de " + playerName(state.player);
    }
  }

  function onPitClick(pit) {
    if (animating || L.isGameOver(state)) return;
    if (mode === "ai" && state.player === 1) return;
    if (!L.isLegalMove(state, pit)) return;
    doMove(pit);
  }

  function doMove(pit) {
    const gid = gameId;
    animating = true;
    render();
    const seq = L.sowingSequence(state.board, pit);
    const b = state.board.slice();
    b[pit] = 0;
    let k = 0;
    const step = 120;
    const timer = setInterval(() => {
      if (gid !== gameId) {
        clearInterval(timer);
        return;
      }
      if (k >= seq.length) {
        clearInterval(timer);
        const next = L.applyMove(state, pit);
        if (!next || gid !== gameId) return;
        state = next;
        animating = false;
        render();
        flashCaptured(next.lastMove ? next.lastMove.captured : []);
        afterMove();
        return;
      }
      b[seq[k]]++;
      render(b);
      const el = pitEl(seq[k]);
      if (el) {
        el.classList.add("drop");
        setTimeout(() => el.classList.remove("drop"), step);
      }
      k++;
    }, step);
  }

  function flashCaptured(captured) {
    for (const p of captured) {
      const el = pitEl(p);
      if (!el) continue;
      el.classList.add("captured");
      setTimeout(() => el.classList.remove("captured"), 700);
    }
  }

  function afterMove() {
    if (L.isGameOver(state)) {
      endGame();
      return;
    }
    updateStatus();
    render();
    if (mode === "ai" && state.player === 1) {
      setTimeout(() => {
        if (L.isGameOver(state)) return;
        const mv = AI.bestMove(state, DEPTHS[difficulty] || 4);
        if (mv && !animating) doMove(mv.pit);
      }, 450);
    }
  }

  function endGame() {
    const f = L.finalize(state);
    state = { ...state, scores: f.scores };
    animating = false;
    render();
    updateStatus();
    let title;
    let text;
    if (f.winner === -1) {
      title = "Match nul !";
      text = "Égalité " + f.scores[0] + " – " + f.scores[1] + ".";
    } else {
      title = playerName(f.winner) + " remporte la partie !";
      text =
        "Score final : " + playerName(0) + " " + f.scores[0] +
        " — " + f.scores[1] + " " + playerName(1) + ".";
    }
    els.overlayTitle.textContent = title;
    els.overlayText.textContent = text;
    els.overlay.classList.remove("hidden");
  }

  function newGame() {
    gameId++;
    state = L.initialState();
    animating = false;
    els.overlay.classList.add("hidden");
    render();
    updateStatus();
  }

  els.mode.addEventListener("change", () => {
    mode = els.mode.value;
    els.difficultyWrap.style.display = mode === "ai" ? "" : "none";
    newGame();
  });
  els.difficulty.addEventListener("change", () => {
    difficulty = els.difficulty.value;
  });
  els.newGame.addEventListener("click", newGame);
  els.overlayNewGame.addEventListener("click", newGame);

  els.difficultyWrap.style.display = "none";
  buildPits();
  newGame();
})();
