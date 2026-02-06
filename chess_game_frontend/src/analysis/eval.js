const MATE_SCORE = 1_000_000;
const CP_CLAMP = 800;

/**
 * @typedef {Object} EvalScore
 * @property {"cp"|"mate"} type
 * @property {number} value Centipawns for "cp". Mate distance (plies) for "mate" (positive good for side to move).
 */

/**
 * Convert engine numeric eval (from search) into a typed score.
 * The engine uses big values for mate-like terminal scores.
 *
 * PUBLIC_INTERFACE
 * @param {number} rawEval
 * @returns {EvalScore}
 */
export function parseEngineEval(rawEval) {
  const n = Number(rawEval || 0);

  // Treat very large values as mate. The search uses MATE_SCORE - ply*10 for mate distance.
  // We approximate mate distance by mapping (MATE_SCORE - abs(score)) to moves.
  if (Math.abs(n) >= MATE_SCORE - 50_000) {
    // Convert to an approximate mate distance in moves.
    const delta = Math.max(0, MATE_SCORE - Math.abs(n));
    // Search uses ply*10, so ply ~= delta/10. Convert ply -> moves.
    const ply = Math.max(1, Math.round(delta / 10));
    const moves = Math.max(1, Math.ceil(ply / 2));
    return { type: "mate", value: n >= 0 ? moves : -moves };
  }

  // Otherwise centipawns. Clamp for UI mapping.
  const cp = Math.max(-CP_CLAMP, Math.min(CP_CLAMP, Math.round(n)));
  return { type: "cp", value: cp };
}

/**
 * Produce a compact label for an EvalScore, like "+0.6", "-1.2", "M3", "-M2".
 *
 * PUBLIC_INTERFACE
 * @param {EvalScore|null} score
 * @returns {string}
 */
export function formatEvalLabel(score) {
  if (!score) return "—";
  if (score.type === "mate") {
    const v = score.value;
    return v >= 0 ? `M${v}` : `-M${Math.abs(v)}`;
  }
  const cp = score.value;
  const pawns = cp / 100;
  const sign = pawns > 0 ? "+" : "";
  return `${sign}${pawns.toFixed(2)}`;
}

/**
 * Map an EvalScore to a [0..1] bar fill, from the side-to-move perspective:
 * - 1 means winning for side to move
 * - 0 means losing for side to move
 *
 * PUBLIC_INTERFACE
 * @param {EvalScore|null} score
 * @returns {number}
 */
export function evalToBarRatio(score) {
  if (!score) return 0.5;
  if (score.type === "mate") {
    // Mate is extreme
    return score.value >= 0 ? 0.98 : 0.02;
  }

  // Logistic mapping for centipawns to make the bar responsive around 0.
  // cp=0 => 0.5, cp=+200 => ~0.73, cp=-200 => ~0.27
  const cp = score.value;
  const k = 1 / 220; // slope
  const ratio = 1 / (1 + Math.exp(-cp * k));
  return Math.max(0.02, Math.min(0.98, ratio));
}

/**
 * Utility: returns the same evaluation but from the opposite side's perspective.
 *
 * PUBLIC_INTERFACE
 * @param {EvalScore|null} score
 * @returns {EvalScore|null}
 */
export function flipEval(score) {
  if (!score) return null;
  return { ...score, value: -score.value };
}

export { MATE_SCORE };
