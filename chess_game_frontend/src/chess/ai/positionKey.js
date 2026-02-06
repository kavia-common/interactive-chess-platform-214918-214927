import { FILES, pieceKey } from "../utils";

/**
 * Position key for transposition table.
 *
 * We don't have bitboards / Zobrist in this project; for correctness and simplicity,
 * we use a stable string key derived from board, side to move, castling, and en passant.
 *
 * This is slower than Zobrist but still effective for small depths and enables a TT.
 */

/**
 * PUBLIC_INTERFACE
 * positionKey returns a stable string describing the position (excluding lastMove).
 */
export function positionKey(position) {
  /** Compute stable key for TT; uses board placement + side/castle/ep. */
  // Board: iterate squares in stable order (a1..h8)
  const parts = [];
  for (let r = 1; r <= 8; r += 1) {
    for (const f of FILES) {
      const sq = `${f}${r}`;
      const p = position.board[sq];
      if (!p) continue;
      parts.push(`${sq}${pieceKey(p)}`);
    }
  }

  const c = position.castling || { w: { K: false, Q: false }, b: { K: false, Q: false } };
  const castlingStr = `${c.w.K ? "K" : ""}${c.w.Q ? "Q" : ""}${c.b.K ? "k" : ""}${c.b.Q ? "q" : ""}` || "-";
  const ep = position.enPassant || "-";

  return `${position.toMove}|${castlingStr}|${ep}|${parts.join(",")}`;
}
