/**
 * AI limits helpers.
 *
 * These helpers live on the main thread (UI) to convert "difficulty" settings
 * into concrete search limits sent to the AI Web Worker.
 */

/**
 * @typedef {"easy" | "medium" | "hard" | "custom"} Difficulty
 */

/**
 * @typedef {Object} SearchLimits
 * @property {number} maxDepth Hard cap depth (plies).
 * @property {number} timeMs Soft time budget for iterative deepening (ms).
 * @property {number} hardTimeMs Hard time cap (ms). Worker must stop at/after this.
 */

/**
 * PUBLIC_INTERFACE
 * getLimitsForDifficulty converts a difficulty preset into concrete limits.
 */
export function getLimitsForDifficulty(difficulty, custom = {}) {
  /** Convert difficulty to {maxDepth,timeMs,hardTimeMs}. */
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  if (difficulty === "easy") {
    return { maxDepth: 3, timeMs: 250, hardTimeMs: 450 };
  }
  if (difficulty === "medium") {
    return { maxDepth: 5, timeMs: 650, hardTimeMs: 950 };
  }
  if (difficulty === "hard") {
    return { maxDepth: 7, timeMs: 1400, hardTimeMs: 2000 };
  }

  // custom
  const maxDepth = clamp(Number(custom.maxDepth ?? 5), 1, 10);
  const timeMs = clamp(Number(custom.timeMs ?? 700), 50, 5000);
  const hardTimeMs = clamp(Number(custom.hardTimeMs ?? Math.round(timeMs * 1.4)), timeMs, 6000);
  return { maxDepth, timeMs, hardTimeMs };
}
