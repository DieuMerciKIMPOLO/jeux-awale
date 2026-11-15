(function (root, factory) {
  const mod = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.AwaleLogic = mod;
})(typeof self !== "undefined" ? self : globalThis, function () {
  "use strict";

  const PIT_COUNT = 12;
  const SEEDS_PER_PIT = 4;
  const TOTAL_SEEDS = PIT_COUNT * SEEDS_PER_PIT;

  const initialBoard = () => new Array(PIT_COUNT).fill(SEEDS_PER_PIT);

  const pitsOf = (player) =>
    player === 0 ? [0, 1, 2, 3, 4, 5] : [6, 7, 8, 9, 10, 11];

  const other = (player) => (player === 0 ? 1 : 0);
  const isOwnPit = (player, pit) => (player === 0 ? pit < 6 : pit >= 6);

  function sideTotal(board, player) {
    let sum = 0;
    for (const i of pitsOf(player)) sum += board[i];
    return sum;
  }

  function sowingSequence(board, pit) {
    const seq = [];
    let seeds = board[pit];
    let pos = pit;
    while (seeds > 0) {
      pos = (pos + 1) % PIT_COUNT;
      if (pos === pit) pos = (pos + 1) % PIT_COUNT;
      seq.push(pos);
      seeds--;
    }
    return seq;
  }

  function sow(board, pit) {
    const b = board.slice();
    b[pit] = 0;
    const seq = sowingSequence(board, pit);
    for (const p of seq) b[p]++;
    return { board: b, last: seq[seq.length - 1], sequence: seq };
  }

  function capturedPits(boardAfter, last, mover) {
    const captured = [];
    let pos = last;
    while (!isOwnPit(mover, pos) && (boardAfter[pos] === 2 || boardAfter[pos] === 3)) {
      captured.push(pos);
      pos = (pos - 1 + PIT_COUNT) % PIT_COUNT;
    }
    if (captured.length === 0) return [];
    let remaining = sideTotal(boardAfter, other(mover));
    for (const p of captured) remaining -= boardAfter[p];
    if (remaining === 0) return [];
    return captured;
  }

  function reachesSide(board, pit, targetPlayer) {
    const r = sow(board, pit);
    return pitsOf(targetPlayer).some((p) => r.board[p] > board[p]);
  }

  function legalMoves(state) {
    const { board, player } = state;
    const own = pitsOf(player).filter((i) => board[i] > 0);
    if (own.length === 0) return [];
    const opp = other(player);
    if (sideTotal(board, opp) > 0) return own;
    const feeding = own.filter((i) => reachesSide(board, i, opp));
    return feeding.length > 0 ? feeding : own;
  }

  const isLegalMove = (state, pit) => legalMoves(state).includes(pit);

  function normalizeTurn(state) {
    if (sideTotal(state.board, state.player) > 0) return state;
    const mover = other(state.player);
    if (sideTotal(state.board, mover) === 0) return state;
    const canFeed = pitsOf(mover).some(
      (i) => state.board[i] > 0 && reachesSide(state.board, i, state.player)
    );
    if (canFeed) return { ...state, player: mover };
    return state;
  }

  function positionKey(state) {
    return state.board.join(",") + "|" + state.player + "|" + state.scores.join(",");
  }

  function repeatedPosition(state) {
    if (!state.history || state.history.length < 2) return false;
    const key = positionKey(state);
    let count = 0;
    for (const h of state.history) if (h === key) count++;
    return count >= 2;
  }

  function isGameOver(state) {
    if (repeatedPosition(state)) return true;
    if (sideTotal(state.board, state.player) > 0) return false;
    const mover = other(state.player);
    if (sideTotal(state.board, mover) === 0) return true;
    return !pitsOf(mover).some(
      (i) => state.board[i] > 0 && reachesSide(state.board, i, state.player)
    );
  }

  function applyMove(state, pit) {
    if (!isLegalMove(state, pit)) return null;
    const player = state.player;
    const { board, last } = sow(state.board, pit);
    const captured = capturedPits(board, last, player);
    const scores = state.scores.slice();
    scores[player] += captured.reduce((s, p) => s + board[p], 0);
    for (const p of captured) board[p] = 0;
    const next = normalizeTurn({
      board,
      player: other(player),
      scores,
      lastMove: { pit, last, captured },
      history: (state.history || []).concat(),
    });
    next.history.push(positionKey(next));
    return next;
  }

  function initialState() {
    const st = { board: initialBoard(), player: 0, scores: [0, 0], lastMove: null, history: [] };
    st.history.push(positionKey(st));
    return st;
  }

  function finalize(state) {
    const scores = state.scores.slice();
    const t0 = sideTotal(state.board, 0);
    const t1 = sideTotal(state.board, 1);
    if (t0 === 0 && t1 > 0) scores[1] += t1;
    else if (t1 === 0 && t0 > 0) scores[0] += t0;
    const winner = scores[0] === scores[1] ? -1 : scores[0] > scores[1] ? 0 : 1;
    return { scores, winner };
  }

  return {
    PIT_COUNT,
    SEEDS_PER_PIT,
    TOTAL_SEEDS,
    initialBoard,
    initialState,
    pitsOf,
    other,
    isOwnPit,
    sideTotal,
    sowingSequence,
    sow,
    capturedPits,
    legalMoves,
    isLegalMove,
    applyMove,
    isGameOver,
    finalize,
    positionKey,
  };
});
