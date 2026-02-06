/* global globalThis */
import { searchBestMove } from "../chess/ai/search";
import { createTranspositionTable } from "../chess/ai/tt";

/**
 * AI Web Worker.
 *
 * Messages:
 * - { type: "SEARCH", position, limits, ttSeed? }
 * - { type: "CANCEL" }
 *
 * Returns:
 * - { type: "INFO", depth, nodes, timeMs, eval }
 * - { type: "RESULT", bestMove, ponderMove?, depthReached, nodes, timeMs, eval }
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
  }
};
