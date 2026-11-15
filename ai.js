(function (root, factory) {
  const L =
    typeof module !== "undefined" && module.exports
      ? require("./awale-logic.js")
      : root.AwaleLogic;
  const mod = factory(L);
  if (typeof module !== "undefined" && module.exports) module.exports = mod;
  else root.AwaleAI = mod;
})(typeof self !== "undefined" ? self : globalThis, function (L) {
  "use strict";

  function evaluate(state, me) {
    const opp = L.other(me);
    const scoreDiff = state.scores[me] - state.scores[opp];
    const seedDiff = L.sideTotal(state.board, me) - L.sideTotal(state.board, opp);
    const mobility = L.legalMoves(state).length;
    const turnFactor = state.player === me ? 1 : -1;
    return scoreDiff * 100 + seedDiff * 4 + mobility * turnFactor * 3;
  }

  function orderedMoves(state) {
    return L.legalMoves(state)
      .map((m) => {
        const ns = L.applyMove(state, m);
        const gain = ns ? ns.scores[state.player] - state.scores[state.player] : 0;
        return { m, gain };
      })
      .sort((a, b) => b.gain - a.gain)
      .map((x) => x.m);
  }

  function minimax(state, depth, alpha, beta, me) {
    if (L.isGameOver(state)) {
      const f = L.finalize(state);
      return (f.scores[me] - f.scores[L.other(me)]) * 1000;
    }
    if (depth === 0) return evaluate(state, me);
    const moves = orderedMoves(state);
    if (state.player === me) {
      let best = -Infinity;
      for (const m of moves) {
        const s = minimax(L.applyMove(state, m), depth - 1, alpha, beta, me);
        if (s > best) best = s;
        if (best > alpha) alpha = best;
        if (beta <= alpha) break;
      }
      return best;
    }
    let best = Infinity;
    for (const m of moves) {
      const s = minimax(L.applyMove(state, m), depth - 1, alpha, beta, me);
      if (s < best) best = s;
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return best;
  }

  function bestMove(state, depth) {
    const me = state.player;
    const moves = orderedMoves(state);
    if (moves.length === 0) return null;
    let best = -Infinity;
    const bestMoves = [];
    for (const m of moves) {
      const s = minimax(L.applyMove(state, m), depth - 1, -Infinity, Infinity, me);
      if (s > best) {
        best = s;
        bestMoves.length = 0;
        bestMoves.push(m);
      } else if (s === best) {
        bestMoves.push(m);
      }
    }
    return { pit: bestMoves[Math.floor(Math.random() * bestMoves.length)], score: best };
  }

  return { bestMove, evaluate, minimax };
});
