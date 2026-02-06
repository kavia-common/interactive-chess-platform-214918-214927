import { FILES, PIECE_TO_UNICODE, PIECE_VALUE, cloneBoard, inBounds, offsetSquare, otherColor, parseSquare, pieceKey } from "./utils";

/**
 * Position shape:
 * {
 *   board: { [sq: string]: {color:'w'|'b', type:'p'|'n'|'b'|'r'|'q'|'k', unicode:string, id?:string} | undefined },
 *   toMove: 'w'|'b',
 *   castling: { w: {K:boolean,Q:boolean}, b:{K:boolean,Q:boolean} },
 *   enPassant: string|null, // target square that can be captured en passant
 *   halfmoveClock: number,
 *   fullmoveNumber: number,
 *   lastMove: Move|null,
 * }
 *
 * Move shape:
 * { from, to, piece:{color,type}, captured?:{color,type}, promotion?:'q'|'r'|'b'|'n',
 *   isEnPassant?:boolean, isCastling?:boolean, rookFrom?:string, rookTo?:string,
 *   prev: { castling, enPassant, halfmoveClock, fullmoveNumber } }
 */

function makePiece(color, type) {
  return { color, type, unicode: PIECE_TO_UNICODE[`${color}${type}`] };
}

// PUBLIC_INTERFACE
export function createInitialPosition() {
  /** Create the standard initial chess position. */
  const board = {};

  // Pawns
  for (const f of FILES) {
    board[`${f}2`] = makePiece("w", "p");
    board[`${f}7`] = makePiece("b", "p");
  }

  // Rooks
  board.a1 = makePiece("w", "r");
  board.h1 = makePiece("w", "r");
  board.a8 = makePiece("b", "r");
  board.h8 = makePiece("b", "r");

  // Knights
  board.b1 = makePiece("w", "n");
  board.g1 = makePiece("w", "n");
  board.b8 = makePiece("b", "n");
  board.g8 = makePiece("b", "n");

  // Bishops
  board.c1 = makePiece("w", "b");
  board.f1 = makePiece("w", "b");
  board.c8 = makePiece("b", "b");
  board.f8 = makePiece("b", "b");

  // Queens
  board.d1 = makePiece("w", "q");
  board.d8 = makePiece("b", "q");

  // Kings
  board.e1 = makePiece("w", "k");
  board.e8 = makePiece("b", "k");

  return {
    board,
    toMove: "w",
    castling: { w: { K: true, Q: true }, b: { K: true, Q: true } },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
  };
}

function isEnemy(position, sq, color) {
  const p = position.board[sq];
  return p && p.color !== color;
}

function isFriend(position, sq, color) {
  const p = position.board[sq];
  return p && p.color === color;
}

function findKingSquare(position, color) {
  for (const sq of Object.keys(position.board)) {
    const p = position.board[sq];
    if (p && p.color === color && p.type === "k") return sq;
  }
  return null;
}

function rayMoves(position, from, color, deltas, maxSteps = 8) {
  const moves = [];
  for (const [df, dr] of deltas) {
    let curr = from;
    for (let step = 1; step <= maxSteps; step += 1) {
      curr = offsetSquare(curr, df, dr);
      if (!curr) break;
      if (isFriend(position, curr, color)) break;
      if (isEnemy(position, curr, color)) {
        moves.push(curr);
        break;
      }
      moves.push(curr);
    }
  }
  return moves;
}

function knightMoves(position, from, color) {
  const deltas = [
    [1, 2],
    [2, 1],
    [2, -1],
    [1, -2],
    [-1, -2],
    [-2, -1],
    [-2, 1],
    [-1, 2],
  ];
  const moves = [];
  for (const [df, dr] of deltas) {
    const to = offsetSquare(from, df, dr);
    if (!to) continue;
    if (isFriend(position, to, color)) continue;
    moves.push(to);
  }
  return moves;
}

function kingMoves(position, from, color) {
  const deltas = [
    [1, 1],
    [1, 0],
    [1, -1],
    [0, 1],
    [0, -1],
    [-1, 1],
    [-1, 0],
    [-1, -1],
  ];
  const moves = [];
  for (const [df, dr] of deltas) {
    const to = offsetSquare(from, df, dr);
    if (!to) continue;
    if (isFriend(position, to, color)) continue;
    moves.push(to);
  }
  return moves;
}

function pawnMoves(position, from, color) {
  const { file, rank } = parseSquare(from);
  const dir = color === "w" ? 1 : -1;
  const startRank = color === "w" ? 2 : 7;

  const moves = [];
  const one = offsetSquare(from, 0, dir);
  if (one && !position.board[one]) {
    moves.push(one);
    // two-step
    const two = offsetSquare(from, 0, dir * 2);
    if (rank === startRank && two && !position.board[two]) moves.push(two);
  }

  // captures
  for (const df of [-1, 1]) {
    const cap = offsetSquare(from, df, dir);
    if (!cap) continue;
    if (isEnemy(position, cap, color)) moves.push(cap);
  }

  // en passant capture target
  if (position.enPassant) {
    const ep = position.enPassant;
    const epFile = ep[0];
    const epRank = Number(ep[1]);

    // If en passant target is one step diagonally forward from pawn
    if (Math.abs(FILES.indexOf(epFile) - FILES.indexOf(file)) === 1 && epRank === rank + dir) {
      moves.push(ep);
    }
  }

  return moves;
}

function pseudoLegalTargets(position, from) {
  const piece = position.board[from];
  if (!piece) return [];
  const color = piece.color;

  if (piece.type === "n") return knightMoves(position, from, color);
  if (piece.type === "b") return rayMoves(position, from, color, [[1, 1], [1, -1], [-1, 1], [-1, -1]]);
  if (piece.type === "r") return rayMoves(position, from, color, [[1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (piece.type === "q") return rayMoves(position, from, color, [[1, 1], [1, -1], [-1, 1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]]);
  if (piece.type === "k") return kingMoves(position, from, color);
  if (piece.type === "p") return pawnMoves(position, from, color);
  return [];
}

function isSquareAttacked(position, targetSq, byColor) {
  // Brute force: for each piece of byColor, see if it can attack targetSq
  for (const from of Object.keys(position.board)) {
    const p = position.board[from];
    if (!p || p.color !== byColor) continue;

    // Pawns attack diagonally only (not via forward movement)
    if (p.type === "p") {
      const dir = byColor === "w" ? 1 : -1;
      for (const df of [-1, 1]) {
        const atk = offsetSquare(from, df, dir);
        if (atk === targetSq) return true;
      }
      continue;
    }

    const targets = pseudoLegalTargets(position, from);
    if (targets.includes(targetSq)) return true;
  }
  return false;
}

function canCastle(position, color, side) {
  const rights = position.castling[color][side];
  if (!rights) return false;

  const kingFrom = color === "w" ? "e1" : "e8";
  const rookFrom = color === "w"
    ? (side === "K" ? "h1" : "a1")
    : (side === "K" ? "h8" : "a8");

  const king = position.board[kingFrom];
  const rook = position.board[rookFrom];
  if (!king || king.type !== "k" || king.color !== color) return false;
  if (!rook || rook.type !== "r" || rook.color !== color) return false;

  // Squares between must be empty
  const between =
    side === "K"
      ? (color === "w" ? ["f1", "g1"] : ["f8", "g8"])
      : (color === "w" ? ["b1", "c1", "d1"] : ["b8", "c8", "d8"]);
  for (const sq of between) if (position.board[sq]) return false;

  // King cannot be in check, and cannot pass through or land in check
  const enemy = otherColor(color);
  const passSquares =
    side === "K"
      ? (color === "w" ? ["e1", "f1", "g1"] : ["e8", "f8", "g8"])
      : (color === "w" ? ["e1", "d1", "c1"] : ["e8", "d8", "c8"]);
  for (const sq of passSquares) {
    if (isSquareAttacked(position, sq, enemy)) return false;
  }

  return true;
}

function addCastlingMoves(position, from, movesOut) {
  const piece = position.board[from];
  if (!piece || piece.type !== "k") return;
  const color = piece.color;
  if (from !== (color === "w" ? "e1" : "e8")) return;

  if (canCastle(position, color, "K")) {
    movesOut.push({
      from,
      to: color === "w" ? "g1" : "g8",
      piece: { color, type: "k" },
      isCastling: true,
      rookFrom: color === "w" ? "h1" : "h8",
      rookTo: color === "w" ? "f1" : "f8",
    });
  }
  if (canCastle(position, color, "Q")) {
    movesOut.push({
      from,
      to: color === "w" ? "c1" : "c8",
      piece: { color, type: "k" },
      isCastling: true,
      rookFrom: color === "w" ? "a1" : "a8",
      rookTo: color === "w" ? "d1" : "d8",
    });
  }
}

function buildMove(position, from, to) {
  const p = position.board[from];
  if (!p) return null;

  const move = {
    from,
    to,
    piece: { color: p.color, type: p.type },
  };

  // en passant capture
  if (p.type === "p" && position.enPassant === to && !position.board[to]) {
    move.isEnPassant = true;
    const dir = p.color === "w" ? -1 : 1; // captured pawn is behind target square
    const capSq = offsetSquare(to, 0, dir);
    if (capSq && position.board[capSq]) {
      const cp = position.board[capSq];
      move.captured = { color: cp.color, type: cp.type };
    }
  } else if (position.board[to]) {
    const cp = position.board[to];
    move.captured = { color: cp.color, type: cp.type };
  }

  // promotion (default to queen for UI simplicity)
  if (p.type === "p") {
    const toRank = Number(to[1]);
    if ((p.color === "w" && toRank === 8) || (p.color === "b" && toRank === 1)) {
      move.promotion = "q";
    }
  }

  // castling move will be built elsewhere when king from e-file goes to g/c.
  return move;
}

function withPrevState(position, move) {
  return {
    ...move,
    prev: {
      castling: JSON.parse(JSON.stringify(position.castling)),
      enPassant: position.enPassant,
      halfmoveClock: position.halfmoveClock,
      fullmoveNumber: position.fullmoveNumber,
    },
  };
}

// PUBLIC_INTERFACE
export function applyMove(position, moveIn) {
  /** Apply a legal move to a position, producing a new immutable position. */
  const move = withPrevState(position, moveIn);

  const board = cloneBoard(position.board);
  const piece = board[move.from];
  if (!piece) return position;

  // Clear en passant by default; set if a double pawn step occurs.
  let enPassant = null;

  let halfmoveClock = position.halfmoveClock + 1;
  if (piece.type === "p" || move.captured) halfmoveClock = 0;

  // Handle captures
  if (move.isEnPassant) {
    const dir = piece.color === "w" ? -1 : 1;
    const capSq = offsetSquare(move.to, 0, dir);
    if (capSq) delete board[capSq];
  }

  // Move piece
  delete board[move.from];

  // Promotion
  if (move.promotion) {
    board[move.to] = makePiece(piece.color, move.promotion);
  } else {
    board[move.to] = piece;
  }

  // Castling rook move
  const castling = JSON.parse(JSON.stringify(position.castling));
  if (move.isCastling) {
    const rook = board[move.rookFrom];
    delete board[move.rookFrom];
    board[move.rookTo] = rook;
  }

  // Update castling rights if king/rook moved or rook captured
  const color = piece.color;
  if (piece.type === "k") {
    castling[color].K = false;
    castling[color].Q = false;
  }
  if (piece.type === "r") {
    if (move.from === (color === "w" ? "h1" : "h8")) castling[color].K = false;
    if (move.from === (color === "w" ? "a1" : "a8")) castling[color].Q = false;
  }
  if (move.captured && move.captured.type === "r") {
    const enemy = otherColor(color);
    if (move.to === (enemy === "w" ? "h1" : "h8")) castling[enemy].K = false;
    if (move.to === (enemy === "w" ? "a1" : "a8")) castling[enemy].Q = false;
  }

  // Set enPassant target after a double pawn push
  if (piece.type === "p") {
    const fromRank = Number(move.from[1]);
    const toRank = Number(move.to[1]);
    if (Math.abs(toRank - fromRank) === 2) {
      const midRank = (fromRank + toRank) / 2;
      enPassant = `${move.from[0]}${midRank}`;
    }
  }

  const nextToMove = otherColor(position.toMove);

  let fullmoveNumber = position.fullmoveNumber;
  if (position.toMove === "b") fullmoveNumber += 1;

  return {
    board,
    toMove: nextToMove,
    castling,
    enPassant,
    halfmoveClock,
    fullmoveNumber,
    lastMove: move,
  };
}

function isLegalAfterMove(position, move) {
  const next = applyMove(position, move);
  const kingSq = findKingSquare(next, position.toMove);
  if (!kingSq) return false;
  return !isSquareAttacked(next, kingSq, next.toMove); // attacked by opponent
}

function addPromotionVariants(move) {
  if (!move.promotion) return [move];
  // Provide multiple options for AI and tests; UI uses default queen.
  const base = { ...move };
  const variants = ["q", "r", "b", "n"].map((p) => ({ ...base, promotion: p }));
  return variants;
}

// PUBLIC_INTERFACE
export function getLegalMoves(position) {
  /** Generate all legal moves for the side to move. */
  const moves = [];
  for (const from of Object.keys(position.board)) {
    const piece = position.board[from];
    if (!piece || piece.color !== position.toMove) continue;

    const targets = pseudoLegalTargets(position, from);
    for (const to of targets) {
      const mv0 = buildMove(position, from, to);
      if (!mv0) continue;
      for (const mv of addPromotionVariants(mv0)) {
        if (isLegalAfterMove(position, mv)) moves.push(mv);
      }
    }

    // Castling
    if (piece.type === "k") {
      const castleMoves = [];
      addCastlingMoves(position, from, castleMoves);
      for (const cm of castleMoves) {
        if (isLegalAfterMove(position, cm)) moves.push(cm);
      }
    }
  }
  return moves;
}

// PUBLIC_INTERFACE
export function getLegalMovesForSquare(position, from) {
  /** Generate all legal moves for a single square. */
  const piece = position.board[from];
  if (!piece || piece.color !== position.toMove) return [];

  const moves = [];
  const targets = pseudoLegalTargets(position, from);
  for (const to of targets) {
    const mv0 = buildMove(position, from, to);
    if (!mv0) continue;
    for (const mv of addPromotionVariants(mv0)) {
      if (isLegalAfterMove(position, mv)) moves.push(mv);
    }
  }

  if (piece.type === "k") {
    addCastlingMoves(position, from, moves);
    // filter for legality
    return moves.filter((m) => isLegalAfterMove(position, m));
  }

  return moves;
}

// PUBLIC_INTERFACE
export function isMoveLegal(position, from, to) {
  /** Return true if side-to-move can legally move from->to (any promotion). */
  const moves = getLegalMovesForSquare(position, from);
  return moves.some((m) => m.to === to);
}

// PUBLIC_INTERFACE
export function makeMoveFromTo(position, from, to) {
  /** Build a legal move object for a given from/to or return null. */
  const moves = getLegalMovesForSquare(position, from);
  const match = moves.find((m) => m.to === to);
  if (!match) return null;

  // If multiple promotions exist, default to queen.
  if (match.promotion) {
    return { ...match, promotion: "q" };
  }
  return match;
}

function evaluateMaterial(position) {
  let score = 0;
  for (const sq of Object.keys(position.board)) {
    const p = position.board[sq];
    if (!p) continue;
    const v = PIECE_VALUE[p.type] ?? 0;
    score += p.color === "w" ? v : -v;
  }
  return score;
}

function hasAnyLegalMoves(position) {
  return getLegalMoves(position).length > 0;
}

// PUBLIC_INTERFACE
export function getGameStatus(position) {
  /**
   * Returns {state:'playing'|'check'|'checkmate'|'stalemate'|'draw', winner?:'w'|'b', inCheckSquare?:string|null}
   */
  const color = position.toMove;
  const enemy = otherColor(color);
  const kingSq = findKingSquare(position, color);

  const inCheck = kingSq ? isSquareAttacked(position, kingSq, enemy) : false;
  const legalExists = hasAnyLegalMoves(position);

  if (inCheck && !legalExists) return { state: "checkmate", winner: enemy, inCheckSquare: kingSq };
  if (!inCheck && !legalExists) return { state: "stalemate", inCheckSquare: null };

  // Simple draw rule: 50-move rule (halfmoveClock >= 100) — optional but useful
  if (position.halfmoveClock >= 100) return { state: "draw", inCheckSquare: null };

  if (inCheck) return { state: "check", inCheckSquare: kingSq };
  return { state: "playing", inCheckSquare: null };
}

// PUBLIC_INTERFACE
export function toAlgebraic(move) {
  /** Simple coordinate notation: e2e4, O-O, O-O-O, with =Q for promotions and "x" marker. */
  if (move.isCastling) {
    const toFile = move.to[0];
    return toFile === "g" ? "O-O" : "O-O-O";
  }

  const cap = move.captured ? "x" : "";
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${move.from}${cap}${move.to}${promo}`;
}

// For AI convenience
export function evaluate(position) {
  // Small mobility term to avoid dead positions.
  const mat = evaluateMaterial(position);
  const mobility = getLegalMoves(position).length;
  return mat + (position.toMove === "w" ? 1 : -1) * mobility * 2;
}
