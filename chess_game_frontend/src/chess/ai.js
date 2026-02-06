import { applyMove, evaluate, getGameStatus, getLegalMoves } from "./engine";

/**
 * PUBLIC_INTERFACE
 * chooseAiMove selects a move for the current side using minimax with alpha-beta.
 * If depth is low or minimax yields none, can fall back to greedy capture.
 */
export function chooseAiMove(position, { depth = 2, fallbackGreedy = true } = {}) {
  const legal = getLegalMoves(position);
  if (legal.length === 0) return null;

  // Prefer immediate checkmates
  for (const m of legal) {
    const nxt = applyMove(position, m);
    const st = getGameStatus(nxt);
    if (st.state === "checkmate") return m;
  }

  const maximizing = position.toMove === "w";
  const { bestMove } = minimaxRoot(position, depth, maximizing);
  if (bestMove) return bestMove;

  if (!fallbackGreedy) return legal[0];

  // Greedy: prefer captures with highest captured value, otherwise any.
  const caps = legal
    .filter((m) => m.captured)
    .sort((a, b) => {
      const va = pieceValue(a.captured?.type);
      const vb = pieceValue(b.captured?.type);
      return vb - va;
    });
  return caps[0] || legal[0];
}

function pieceValue(t) {
  if (!t) return 0;
  if (t === "p") return 1;
  if (t === "n" || t === "b") return 3;
  if (t === "r") return 5;
  if (t === "q") return 9;
  if (t === "k") return 100;
  return 0;
}

function minimaxRoot(position, depth, maximizing) {
  let bestScore = maximizing ? -Infinity : Infinity;
  let bestMove = null;

  const moves = getLegalMoves(position);
  for (const m of moves) {
    const nxt = applyMove(position, m);
    const score = minimax(nxt, depth - 1, -Infinity, Infinity, !maximizing);
    if (maximizing) {
      if (score > bestScore) {
        bestScore = score;
        bestMove = m;
      }
    } else {
      if (score < bestScore) {
        bestScore = score;
        bestMove = m;
      }
    }
  }

  return { bestMove, bestScore };
}

function minimax(position, depth, alpha, beta, maximizing) {
  const st = getGameStatus(position);
  if (st.state === "checkmate") {
    // If current side to move is checkmated, evaluate is losing for them.
    return position.toMove === "w" ? -999999 : 999999;
  }
  if (st.state === "stalemate" || st.state === "draw") return 0;

  if (depth <= 0) return evaluate(position);

  const moves = getLegalMoves(position);
  if (moves.length === 0) return evaluate(position);

  if (maximizing) {
    let value = -Infinity;
    for (const m of moves) {
      const nxt = applyMove(position, m);
      value = Math.max(value, minimax(nxt, depth - 1, alpha, beta, false));
      alpha = Math.max(alpha, value);
      if (alpha >= beta) break;
    }
    return value;
  }

  let value = Infinity;
  for (const m of moves) {
    const nxt = applyMove(position, m);
    value = Math.min(value, minimax(nxt, depth - 1, alpha, beta, true));
    beta = Math.min(beta, value);
    if (alpha >= beta) break;
  }
  return value;
}
