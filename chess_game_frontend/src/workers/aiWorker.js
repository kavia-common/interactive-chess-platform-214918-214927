/* global globalThis */
import { searchBestMove } from "../chess/ai/search";
import { createTranspositionTable } from "../chess/ai/tt";
import { searchMultiPv } from "../chess/ai/multipv";

/**
 * AI Web Worker.
 *
 * Messages:
 * - { type: "SEARCH", position, limits, ttSeed? }            -> best move (used for gameplay)
 * - { type: "ANALYZE", position, limits, multiPv }           -> evaluation + top PV lines (no move applied on main thread)
 * - { type: "CANCEL" }                                      -> cancels SEARCH or ANALYZE
 *
 * Returns:
 * - { type: "INFO", depth, nodes, timeMs, eval }             -> incremental info (SEARCH)
 * - { type: "RESULT", bestMove, ponderMove?, depthReached, nodes, timeMs, eval }
 * - { type: "ANALYSIS_INFO", depth, nodes, timeMs, linesDone?, linesTotal? }  -> incremental info (ANALYZE)
 * - { type: "ANALYSIS_RESULT", depthReached, nodes, timeMs, eval, lines }     -> final analysis output
 * - { type: "CANCELLED" }
 */

let currentSearchId = 0;
let cancelFlag = false;

// Keep a persistent TT across searches for strength and speed.
// If memory is a concern, lower maxEntries.
const tt = createTranspositionTable({ maxEntries: 60_000 });

function post(msg) {
  globalThis.postMessage(msg);
}

globalThis.onmessage = (e) => {
  const msg = e.data;
  if (!msg || !msg.type) return;

  if (msg.type === "CANCEL") {
    cancelFlag = true;
    return;
  }

  if (msg.type === "SEARCH") {
    const searchId = (currentSearchId += 1);
    cancelFlag = false;

    const { position, limits } = msg;

    try {
      const result = searchBestMove(position, {
        limits,
        tt,
        cancelled: () => cancelFlag || searchId !== currentSearchId,
        onInfo: (info) => {
          // Drop stale info quickly
          if (cancelFlag || searchId !== currentSearchId) return;
          post({ type: "INFO", ...info });
        },
      });

      if (cancelFlag || searchId !== currentSearchId) {
        post({ type: "CANCELLED" });
        return;
      }

      post({ type: "RESULT", ...result });
    } catch (err) {
      // Fail-safe: never crash the worker; return cancelled-like response.
      post({
        type: "RESULT",
        bestMove: null,
        ponderMove: null,
        depthReached: 0,
        nodes: 0,
        timeMs: 0,
        eval: 0,
        error: String(err?.message || err),
      });
    }
    return;
  }

  if (msg.type === "ANALYZE") {
    const searchId = (currentSearchId += 1);
    cancelFlag = false;

    const { position, limits, multiPv } = msg;

    try {
      // Base evaluation (single PV) for the selected node.
      const base = searchBestMove(position, {
        limits,
        tt,
        cancelled: () => cancelFlag || searchId !== currentSearchId,
        onInfo: (info) => {
          if (cancelFlag || searchId !== currentSearchId) return;
          post({ type: "ANALYSIS_INFO", ...info });
        },
      });

      if (cancelFlag || searchId !== currentSearchId) {
        post({ type: "CANCELLED" });
        return;
      }

      const mpv = searchMultiPv(position, {
        limits,
        multiPv,
        tt,
        cancelled: () => cancelFlag || searchId !== currentSearchId,
        onInfo: (info) => {
          if (cancelFlag || searchId !== currentSearchId) return;
          post({ type: "ANALYSIS_INFO", ...info });
        },
      });

      if (cancelFlag || searchId !== currentSearchId) {
        post({ type: "CANCELLED" });
        return;
      }

      post({
        type: "ANALYSIS_RESULT",
        depthReached: Math.max(base.depthReached || 0, mpv.depthReached || 0),
        nodes: (base.nodes || 0) + (mpv.nodes || 0),
        timeMs: Math.max(base.timeMs || 0, mpv.timeMs || 0),
        eval: base.eval || 0,
        lines: mpv.lines || [],
      });
    } catch (err) {
      post({
        type: "ANALYSIS_RESULT",
        depthReached: 0,
        nodes: 0,
        timeMs: 0,
        eval: 0,
        lines: [],
        error: String(err?.message || err),
      });
    }
  }
};
