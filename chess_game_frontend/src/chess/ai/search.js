import { applyMove, getGameStatus, getLegalMoves } from "../engine";
import { otherColor, PIECE_VALUE } from "../utils";
import { positionKey } from "./positionKey";
import { createOrderingState, noteBetaCutoff, orderMoves } from "./ordering";
import { quiescenceSearch } from "./quiescence";
import { ttGet, ttNewSearchAge, ttStore } from "./tt";

/**
 * Stronger AI search.
 *
 * - Negamax alpha-beta
 * - Iterative deepening with time budget + hard cap
 * - Transposition table with bounds
 * - Quiescence search at leaf
 * - Move ordering: PV first, MVV-LVA captures, killer/history
 *
 * NOTE: Evaluation uses engine.evaluate via quiescence (stand pat). The engine's
 * evaluate is material + mobility, which is adequate for this project.
 */

const MATE_SCORE = 1_000_000;
const INF = 9_999_999;

function nowMs() {
  return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
}

function isTimeUp(ctx) {
  if (ctx.cancelled()) return true;
  const t = nowMs() - ctx.startMs;
  return t >= ctx.limits.hardTimeMs;
}

function isSoftTimeUp(ctx) {
  const t = nowMs() - ctx.startMs;
  return t >= ctx.limits.timeMs;
}

function pieceVal(type) {
  return PIECE_VALUE[type] ?? 0;
}

function isCapture(move) {
  return Boolean(move.captured);
}

function staticExchangeLikeCaptureScore(move) {
  // MVV-LVA-ish in ordering module; keep a small helper here for delta pruning
  const v = move.captured?.type ? pieceVal(move.captured.type) : 0;
  const a = move.piece?.type ? pieceVal(move.piece.type) : 0;
  return v - a;
}

function isTerminal(position) {
  const st = getGameStatus(position);
  if (st.state === "checkmate" || st.state === "stalemate" || st.state === "draw") return st;
  return null;
}

function terminalScore(position, terminal, ply) {
  if (terminal.state === "draw" || terminal.state === "stalemate") return 0;

  // In this engine, terminal checkmate returns winner = side NOT to move.
  // If it's checkmate and it's our turn to move, we are mated -> losing.
  if (terminal.state === "checkmate") {
    const us = position.toMove;
    const winner = terminal.winner;
    const sign = winner === us ? 1 : -1;
    // Depth-based mate distance (prefer faster mates, slower losses).
    return sign * (MATE_SCORE - ply * 10);
  }

  return 0;
}

/**
 * PUBLIC_INTERFACE
 * searchBestMove performs iterative deepening search.
 */
export function searchBestMove(position, { limits, tt, onInfo, cancelled } = {}) {
  /** Main entry: returns best move info under limits. */
  const startMs = nowMs();
  const ctx = {
    startMs,
    limits,
    tt,
    onInfo: typeof onInfo === "function" ? onInfo : null,
    cancelled: typeof cancelled === "function" ? cancelled : () => false,
    nodes: 0,
    ordering: createOrderingState({ maxPly: 96 }),
    age: tt ? ttNewSearchAge(tt) : 0,
  };

  // Root legal moves
  const legal = getLegalMoves(position);
  if (legal.length === 0) {
    return {
      bestMove: null,
      ponderMove: null,
      depthReached: 0,
      nodes: 0,
      timeMs: Math.round(nowMs() - startMs),
      eval: 0,
    };
  }

  // First: quick immediate mate scan
  for (const m of legal) {
    const nxt = applyMove(position, m);
    const st = getGameStatus(nxt);
    if (st.state === "checkmate") {
      return {
        bestMove: m,
        ponderMove: null,
        depthReached: 1,
        nodes: 1,
        timeMs: Math.round(nowMs() - startMs),
        eval: position.toMove === "w" ? MATE_SCORE : -MATE_SCORE,
      };
    }
  }

  let pvMove = null;
  let bestMove = legal[0];
  let bestEval = -INF;
  let depthReached = 0;

  // Iterative deepening
  for (let depth = 1; depth <= limits.maxDepth; depth += 1) {
    if (isTimeUp(ctx)) break;

    const rootResult = searchRoot(position, depth, ctx, pvMove);
    if (rootResult.completed) {
      depthReached = depth;
      bestMove = rootResult.bestMove || bestMove;
      bestEval = rootResult.bestEval;

      pvMove = bestMove;

      if (ctx.onInfo) {
        ctx.onInfo({
          depth,
          nodes: ctx.nodes,
          timeMs: Math.round(nowMs() - startMs),
          eval: bestEval,
        });
      }

      // If we exceeded soft time, stop after completing this depth.
      if (isSoftTimeUp(ctx)) break;
    } else {
      // incomplete depth due to time/cancel; keep last completed
      break;
    }
  }

  // Ponder move: first move of PV line if available via TT
  let ponderMove = null;
  if (tt && bestMove) {
    const nxt = applyMove(position, bestMove);
    const k = positionKey(nxt);
    const e = ttGet(tt, k);
    if (e?.bestMove) ponderMove = e.bestMove;
  }

  return {
    bestMove,
    ponderMove,
    depthReached,
    nodes: ctx.nodes,
    timeMs: Math.round(nowMs() - startMs),
    eval: bestEval,
  };
}

function searchRoot(position, depth, ctx, pvMove) {
  let alpha = -INF;
  let beta = INF;

  const moves = orderMoves(getLegalMoves(position), { pvMove, ordering: ctx.ordering, ply: 0 });

  let bestMove = null;
  let bestEval = -INF;

  for (const m of moves) {
    if (isTimeUp(ctx)) return { completed: false, bestMove, bestEval };
    const nxt = applyMove(position, m);
    const score = -negamax(nxt, depth - 1, -beta, -alpha, ctx, 1);
    if (score > bestEval) {
      bestEval = score;
      bestMove = m;
    }
    if (score > alpha) alpha = score;
  }

  return { completed: true, bestMove, bestEval };
}

function negamax(position, depth, alpha, beta, ctx, ply) {
  if (isTimeUp(ctx)) return 0;

  ctx.nodes += 1;

  const term = isTerminal(position);
  if (term) return terminalScore(position, term, ply);

  // TT probe
  const key = ctx.tt ? positionKey(position) : null;
  if (ctx.tt && key) {
    const e = ttGet(ctx.tt, key);
    if (e && e.depth >= depth) {
      if (e.bound === "EXACT") return e.value;
      if (e.bound === "LOWER") alpha = Math.max(alpha, e.value);
      else if (e.bound === "UPPER") beta = Math.min(beta, e.value);
      if (alpha >= beta) return e.value;
    }
  }

  if (depth <= 0) {
    // Quiescence (captures + checks) to smooth leaf evaluation
    const nodesObj = { count: 0 };
    const q = quiescenceSearch(position, alpha, beta, { includeChecks: true, nodes: nodesObj });
    ctx.nodes += nodesObj.count;
    return q;
  }

  const legal = getLegalMoves(position);
  if (legal.length === 0) {
    // should be handled by terminal, but keep safe fallback
    return 0;
  }

  // PV move from TT (if available)
  let pvMove = null;
  if (ctx.tt && key) {
    const e = ttGet(ctx.tt, key);
    pvMove = e?.bestMove || null;
  }

  const moves = orderMoves(legal, { pvMove, ordering: ctx.ordering, ply });

  let bestMove = null;
  let best = -INF;
  const alphaOrig = alpha;

  for (const m of moves) {
    if (isTimeUp(ctx)) break;

    // Simple delta pruning in quiescence-ish situations: skip obviously bad captures when deep
    if (depth <= 2 && isCapture(m) && staticExchangeLikeCaptureScore(m) < -pieceVal("p")) {
      // allow still if it gives check via cheap test is expensive; keep conservative
      // (This is intentionally light to avoid incorrect pruning.)
    }

    const nxt = applyMove(position, m);

    const score = -negamax(nxt, depth - 1, -beta, -alpha, ctx, ply + 1);

    if (score > best) {
      best = score;
      bestMove = m;
    }

    if (score > alpha) alpha = score;
    if (alpha >= beta) {
      // beta cutoff
      noteBetaCutoff(ctx.ordering, ply, m);
      break;
    }
  }

  // TT store
  if (ctx.tt && key) {
    let bound = "EXACT";
    if (best <= alphaOrig) bound = "UPPER";
    else if (best >= beta) bound = "LOWER";

    ttStore(ctx.tt, {
      key,
      depth,
      value: best,
      bound,
      bestMove,
      age: ctx.age,
    });
  }

  return best;
}
