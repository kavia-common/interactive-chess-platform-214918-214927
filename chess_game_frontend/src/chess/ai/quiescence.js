import { applyMove, evaluate, getGameStatus, getLegalMoves } from "../engine";

/**
 * Quiescence search to reduce horizon effect.
 *
 * Extends search in tactical positions by exploring captures (and optionally checks).
 */

function isTacticalMove(move, includeChecks) {
  if (move.captured) return true;
  if (includeChecks && move.givesCheck) return true;
  return false;
}

function annotateChecks(position, moves) {
  // Cheap check detection: apply and query status.
  return moves.map((m) => {
    const nxt = applyMove(position, m);
    const st = getGameStatus(nxt);
    return { ...m, givesCheck: st.state === "check" };
  });
}

/**
 * PUBLIC_INTERFACE
 * quiescenceSearch runs a capture/check-only extension from a leaf.
 */
export function quiescenceSearch(position, alpha, beta, { includeChecks = true, nodes } = {}) {
  /** Quiescence search that explores tactical replies only. */
  nodes.count += 1;

  const standPat = evaluate(position);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  let moves = getLegalMoves(position);

  // annotate check flags only if requested
  if (includeChecks) moves = annotateChecks(position, moves);

  const tactical = moves.filter((m) => isTacticalMove(m, includeChecks));

  // Simple ordering: captures first by victim value; checks next
  tactical.sort((a, b) => {
    const va = a.captured ? 1 : 0;
    const vb = b.captured ? 1 : 0;
    if (va !== vb) return vb - va;
    const ca = a.givesCheck ? 1 : 0;
    const cb = b.givesCheck ? 1 : 0;
    return cb - ca;
  });

  for (const m of tactical) {
    const nxt = applyMove(position, m);
    const score = -quiescenceSearch(nxt, -beta, -alpha, { includeChecks, nodes });
    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}
