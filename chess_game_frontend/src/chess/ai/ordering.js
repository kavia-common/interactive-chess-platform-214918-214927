import { PIECE_VALUE } from "../utils";

/**
 * Move ordering heuristics.
 *
 * We use:
 * - PV move first (from TT or previous iteration)
 * - Captures: MVV-LVA
 * - Killer moves (2 per ply) for non-captures
 * - History heuristic for non-captures
 */

function mvvLvaScore(move) {
  const victim = move.captured?.type;
  const attacker = move.piece?.type;
  const v = victim ? PIECE_VALUE[victim] ?? 0 : 0;
  const a = attacker ? PIECE_VALUE[attacker] ?? 0 : 0;
  // Encourage winning captures.
  return v * 10 - a;
}

/**
 * PUBLIC_INTERFACE
 * createOrderingState creates killer/history structures for a search.
 */
export function createOrderingState({ maxPly = 64 } = {}) {
  /** Create per-search move ordering state. */
  return {
    killer1: new Array(maxPly).fill(null),
    killer2: new Array(maxPly).fill(null),
    history: new Map(), // key: "fromto[promo]" => score
  };
}

function moveKey(move) {
  return `${move.from}${move.to}${move.promotion ? move.promotion : ""}`;
}

/**
 * PUBLIC_INTERFACE
 * noteBetaCutoff updates killer/history on a beta cutoff.
 */
export function noteBetaCutoff(ordering, ply, move) {
  /** Record killer moves / history for non-captures. */
  if (move.captured) return;
  const k1 = ordering.killer1[ply];
  if (!k1 || moveKey(k1) !== moveKey(move)) {
    ordering.killer2[ply] = k1;
    ordering.killer1[ply] = move;
  }
  const k = moveKey(move);
  ordering.history.set(k, (ordering.history.get(k) || 0) + 1 + ply * ply);
}

/**
 * PUBLIC_INTERFACE
 * orderMoves returns a new ordered array of moves.
 */
export function orderMoves(moves, { pvMove = null, ordering = null, ply = 0 } = {}) {
  /** Order moves using PV/captures/killer/history. */
  const pvKey = pvMove ? moveKey(pvMove) : null;
  const k1 = ordering?.killer1?.[ply] ? moveKey(ordering.killer1[ply]) : null;
  const k2 = ordering?.killer2?.[ply] ? moveKey(ordering.killer2[ply]) : null;

  const scored = moves.map((m) => {
    const k = moveKey(m);
    let s = 0;

    if (pvKey && k === pvKey) s += 1_000_000;
    if (m.captured) s += 200_000 + mvvLvaScore(m);
    if (k1 && k === k1) s += 50_000;
    if (k2 && k === k2) s += 25_000;

    if (!m.captured && ordering) {
      s += ordering.history.get(k) || 0;
    }

    // Small tie-breaker: promotions first
    if (m.promotion) s += 1000;

    return { m, s };
  });

  scored.sort((a, b) => b.s - a.s);
  return scored.map((x) => x.m);
}
