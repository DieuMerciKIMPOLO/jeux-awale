"use strict";
const assert = require("assert");
const L = require("./awale-logic.js");
const AI = require("./ai.js");

// 1. état initial
{
  const s = L.initialState();
  assert.deepStrictEqual(s.board, new Array(12).fill(4));
  assert.strictEqual(s.player, 0);
  assert.deepStrictEqual(s.scores, [0, 0]);
}

// 2. semis simple
{
  const b = new Array(12).fill(4);
  const r = L.sow(b, 0);
  assert.deepStrictEqual(r.sequence, [1, 2, 3, 4]);
  assert.strictEqual(r.last, 4);
  assert.strictEqual(r.board[0], 0);
  assert.strictEqual(r.board[1], 5);
}

// 3. tour complet : on saute la case d'origine
{
  const b = new Array(12).fill(0);
  b[0] = 13;
  const r = L.sow(b, 0);
  assert.strictEqual(r.sequence.length, 13);
  assert.ok(!r.sequence.includes(0));
  assert.strictEqual(r.board[0], 0);
  assert.strictEqual(r.board.reduce((a, c) => a + c, 0), 13);
}

// 4. capture simple + capture en chaîne vers l'arrière
{
  const b = new Array(12).fill(4);
  b[4] = 6;
  b[10] = 1; // deviendra 2 -> capture
  b[9] = 2;  // deviendra 3 -> capture (chaîne)
  b[8] = 1;  // deviendra 2 -> capture (chaîne), case 7 deviendra 5 -> stop
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  const ns = L.applyMove(st, 4);
  assert.deepStrictEqual([...ns.lastMove.captured].sort((a, b) => a - b), [8, 9, 10]);
  assert.strictEqual(ns.scores[0], 2 + 3 + 2);
  assert.strictEqual(ns.board[8], 0);
  assert.strictEqual(ns.board[9], 0);
  assert.strictEqual(ns.board[10], 0);
  assert.strictEqual(ns.player, 1);
}

// 5. aucune capture si la dernière graine tombe dans sa propre rangée
{
  const b = new Array(12).fill(4);
  b[3] = 2;
  b[5] = 1; // case 5 passe à 2, mais c'est une case du joueur 0
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  const ns = L.applyMove(st, 3);
  assert.deepStrictEqual(ns.lastMove.captured, []);
  assert.strictEqual(ns.scores[0], 0);
  assert.strictEqual(ns.board[5], 2);
}

// 6. aucune capture si la case atteinte contient autre chose que 2 ou 3
{
  const b = new Array(12).fill(4);
  b[5] = 1; // joueur 0 joue case 5 (1 graine) -> case 6 passe à 5
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  const ns = L.applyMove(st, 5);
  assert.deepStrictEqual(ns.lastMove.captured, []);
  assert.strictEqual(ns.board[6], 5);
}

// 7. grand slam interdit : aucune capture si cela viderait le camp adverse
{
  const b = new Array(12).fill(0);
  b[4] = 2; // joueur 0 sème cases 5 et 6
  b[6] = 1; // case 6 passe à 2, mais c'est la seule graine adverse
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  const ns = L.applyMove(st, 4);
  assert.deepStrictEqual(ns.lastMove.captured, []);
  assert.strictEqual(ns.scores[0], 0);
  assert.strictEqual(ns.board[6], 2);
}

// 8. obligation de nourrir : coups restreints quand l'adversaire est à sec
{
  const b = new Array(12).fill(0);
  b[0] = 5; // n'atteint pas le camp adverse (sème 1..5)
  b[3] = 7; // sème 4,5,6,7,8,9,10 -> nourrit
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  assert.deepStrictEqual(L.legalMoves(st), [3]);
}

// 9. si aucun coup ne peut nourrir, tous les coups sont permis
{
  const b = new Array(12).fill(0);
  b[0] = 5;
  b[1] = 3;
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  assert.deepStrictEqual(L.legalMoves(st).sort(), [0, 1]);
}

// 10. après un coup qui vide son propre camp, l'adversaire doit nourrir si possible
{
  const b = new Array(12).fill(0);
  b[5] = 1;  // joueur 0 sème case 6 -> son camp est vide
  b[6] = 3;
  b[7] = 2;
  b[11] = 8; // case 11 sème 0,1,2,3,4,5,6,7 -> nourrit le joueur 0
  const st = { board: b, player: 0, scores: [0, 0], lastMove: null };
  const ns = L.applyMove(st, 5);
  assert.strictEqual(ns.player, 1);
  assert.strictEqual(L.sideTotal(ns.board, 0), 0);
  assert.deepStrictEqual(L.legalMoves(ns), [11]);
}

// 11. fin de partie et ramassage des graines restantes
{
  const b = new Array(12).fill(0);
  b[6] = 4;
  b[7] = 2;
  const st = { board: b, player: 0, scores: [10, 20], lastMove: null };
  assert.ok(L.isGameOver(st));
  const f = L.finalize(st);
  assert.deepStrictEqual(f.scores, [10, 26]);
  assert.strictEqual(f.winner, 1);
}

// 12. match nul
{
  const b = new Array(12).fill(0);
  const st = { board: b, player: 0, scores: [24, 24], lastMove: null };
  const f = L.finalize(st);
  assert.strictEqual(f.winner, -1);
}

// 13. coups illégaux rejetés
{
  const st = L.initialState();
  assert.strictEqual(L.applyMove(st, 6), null); // case adverse
  const b = new Array(12).fill(0);
  b[6] = 4;
  const st2 = { board: b, player: 0, scores: [0, 0], lastMove: null };
  assert.strictEqual(L.applyMove(st2, 0), null); // case vide
}

// 14. parties aléatoires : conservation des 48 graines à chaque étape
{
  let seed = 42;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let g = 0; g < 100; g++) {
    let st = L.initialState();
    let steps = 0;
    while (!L.isGameOver(st) && steps < 1000) {
      const moves = L.legalMoves(st);
      assert.ok(moves.length > 0);
      const m = moves[Math.floor(rand() * moves.length)];
      st = L.applyMove(st, m);
      const total = st.board.reduce((a, c) => a + c, 0) + st.scores[0] + st.scores[1];
      assert.strictEqual(total, 48, "conservation des 48 graines");
      steps++;
    }
    assert.ok(L.isGameOver(st), "la partie doit se terminer");
    const f = L.finalize(st);
    const t0 = L.sideTotal(st.board, 0);
    const t1 = L.sideTotal(st.board, 1);
    const added = (t0 === 0 && t1 > 0) || (t1 === 0 && t0 > 0) ? t0 + t1 : 0;
    assert.strictEqual(f.scores[0] + f.scores[1], st.scores[0] + st.scores[1] + added);
    assert.ok(f.scores[0] + f.scores[1] <= 48);
    if (f.winner !== -1) assert.ok(f.scores[f.winner] > f.scores[L.other(f.winner)]);
  }
}

// 16. boucle de nourrissage : la répétition d'une position termine la partie
{
  const b = new Array(12).fill(0);
  b[0] = 1;
  b[6] = 1;
  const st0 = { board: b, player: 0, scores: [0, 0], lastMove: null, history: [] };
  st0.history.push(L.positionKey(st0));
  let st = st0;
  let steps = 0;
  while (!L.isGameOver(st) && steps < 100) {
    const moves = L.legalMoves(st);
    st = L.applyMove(st, moves[0]);
    steps++;
  }
  assert.ok(L.isGameOver(st), "la répétition doit terminer la partie");
  assert.ok(steps < 100);
}

// 15. l'IA renvoie toujours un coup légal
{
  const mv = AI.bestMove(L.initialState(), 3);
  assert.ok(mv && L.isLegalMove(L.initialState(), mv.pit));
  let st = L.initialState();
  let steps = 0;
  while (!L.isGameOver(st) && steps < 300) {
    const mv2 = AI.bestMove(st, 3);
    assert.ok(mv2 && L.isLegalMove(st, mv2.pit));
    st = L.applyMove(st, mv2.pit);
    steps++;
  }
  assert.ok(L.isGameOver(st));
}

console.log("Tous les tests passent ✔");
