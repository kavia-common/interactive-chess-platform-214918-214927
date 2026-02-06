export const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
export const RANKS = [1, 2, 3, 4, 5, 6, 7, 8];

export const PIECE_TO_UNICODE = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

export const PIECE_VALUE = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// PUBLIC_INTERFACE
export function otherColor(c) {
  /** Returns opposite side color. */
  return c === "w" ? "b" : "w";
}

export function squareFromFR(file, rank) {
  return `${file}${rank}`;
}

export function parseSquare(sq) {
  const file = sq[0];
  const rank = Number(sq[1]);
  return { file, rank };
}

export function inBounds(file, rank) {
  return FILES.includes(file) && rank >= 1 && rank <= 8;
}

export function offsetSquare(sq, df, dr) {
  const { file, rank } = parseSquare(sq);
  const fi = FILES.indexOf(file);
  const nf = FILES[fi + df];
  const nr = rank + dr;
  if (!nf || nr < 1 || nr > 8) return null;
  return squareFromFR(nf, nr);
}

export function cloneBoard(board) {
  return { ...board };
}

export function pieceKey(piece) {
  return `${piece.color}${piece.type}`;
}

export function toSquare(position, sq) {
  return position.board[sq];
}

// From a move (after application), return captured piece info if any.
export function capturedFromMove(move) {
  if (!move?.captured) return null;
  return { color: move.captured.color, piece: `${move.captured.color}${move.captured.type}` };
}

export function sameSquare(a, b) {
  return a && b && a === b;
}
