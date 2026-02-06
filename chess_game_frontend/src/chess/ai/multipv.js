import { applyMove, getLegalMoves } from "../engine";
import { searchBestMove } from "./search";

/**
 * Multi-PV analysis helper.
 *
 * This is intentionally simple: we generate candidate root moves and call the existing
 * searchBestMove on each resulting position with a reduced budget. This is not as
 * strong/efficient as a true multi-PV alpha-beta, but it reuses the existing core
 * and stays fully inside the worker.
 */

/**
 * Extract a PV line from TT by following bestMove pointers up to maxPlies.
 */
function pvFromTt(position, { tt, maxPlies = 12 }) {
  const line = [];
  let curr = position;
  for (let i = 0; i < maxPlies; i += 1) {
    // We can't import positionKey/ttGet here without creating circular deps in some setups.
    // Instead, rely on searchBestMove's ponderMove as the next step by doing a tiny search at depth 1.
    // This remains lightweight and stable.
    const res = searchBestMove(curr, {
      limits: { maxDepth: 1, timeMs: 10, hardTimeMs: 20 },
      tt,
      cancelled: () => false,
    });
    if (!res.bestMove) break;
    line.push(res.bestMove);
    curr = applyMove(curr, res.bestMove);
  }
  return line;
}

/**
 * PUBLIC_INTERFACE
 * searchMultiPv evaluates a position and returns the top N principal variations.
 *
 * @param {any} position
 * @param {{limits:{maxDepth:number,timeMs:number,hardTimeMs:number}, multiPv:number, tt:any, cancelled:()=>boolean, onInfo?:(info:any)=>void}} opts
 * @returns {{depthReached:number,nodes:number,timeMs:number, lines:Array<{rootMove:any, eval:number, depth:number, pv:Array<any>}>}}
 */
export function searchMultiPv(position, opts) {
  const { limits, multiPv = 2, tt, cancelled, onInfo } = opts || {};
  const N = Math.max(1, Math.min(3, Number(multiPv) || 1));

  const legal = getLegalMoves(position);
  if (legal.length === 0) {
    return { depthReached: 0, nodes: 0, timeMs: 0, lines: [] };
  }

  // Limit number of candidate root moves for performance.
  // Keep up to 10 candidates (captures first).
  const candidates = [...legal]
    .sort((a, b) => (b.captured ? 1 : 0) - (a.captured ? 1 : 0))
    .slice(0, 10);

  const perLineMs = Math.max(50, Math.floor((limits?.timeMs || 300) / Math.min(N, candidates.length)));
  const perLineLimits = {
    maxDepth: limits?.maxDepth || 6,
    timeMs: perLineMs,
    hardTimeMs: Math.max(perLineMs + 50, Math.floor((limits?.hardTimeMs || 600) / Math.min(N, candidates.length))),
  };

  const start = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();

  let totalNodes = 0;
  let maxDepthReached = 0;

  const scored = [];
  for (const rootMove of candidates) {
    if (cancelled?.()) break;

    const childPos = applyMove(position, rootMove);
    const res = searchBestMove(childPos, {
      limits: perLineLimits,
      tt,
      cancelled,
      onInfo: null,
    });

    totalNodes += res.nodes || 0;
    maxDepthReached = Math.max(maxDepthReached, res.depthReached || 0);

    // Because res.eval is from child position side-to-move perspective, flip for root side-to-move.
    const rootEval = -(res.eval || 0);

    scored.push({
      rootMove,
      eval: rootEval,
      depth: res.depthReached || 0,
      pv: [rootMove].concat(pvFromTt(childPos, { tt, maxPlies: 10 })),
    });

    onInfo?.({
      linesDone: scored.length,
      linesTotal: Math.min(candidates.length, N),
      nodes: totalNodes,
      depth: maxDepthReached,
      timeMs: Math.round((((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - start)),
    });
  }

  scored.sort((a, b) => b.eval - a.eval);

  const timeMs = Math.round((((typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now()) - start));
  return {
    depthReached: maxDepthReached,
    nodes: totalNodes,
    timeMs,
    lines: scored.slice(0, N),
  };
}
