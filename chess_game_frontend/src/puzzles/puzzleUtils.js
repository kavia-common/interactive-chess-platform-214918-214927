import { applyMove, createInitialPosition, getLegalMoves } from "../chess/engine";

/**
 * @typedef {Object} Puzzle
 * @property {string} id
 * @property {string} fen
 * @property {Array<string|Array<string>>} moves Solution sequence. Each ply may be a string token
 *   (coordinate like "e2e4"/"e2xe4"/"O-O" in this project’s notation) OR an array of acceptable tokens.
 * @property {number} rating
 * @property {string[]} themes
 * @property {string=} description
 */

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

function makePieceFromFenChar(ch) {
  const isUpper = ch.toUpperCase() === ch;
  const color = isUpper ? "w" : "b";
  const lower = ch.toLowerCase();

  /** Map FEN piece letters to engine piece types. */
  const map = { p: "p", n: "n", b: "b", r: "r", q: "q", k: "k" };
  const type = map[lower];
  if (!type) return null;

  // unicode is not required by engine legality; omit it for compactness.
  return { color, type, unicode: "" };
}

function parseCastlingRights(field) {
  const rights = { w: { K: false, Q: false }, b: { K: false, Q: false } };
  if (!field || field === "-") return rights;
  rights.w.K = field.includes("K");
  rights.w.Q = field.includes("Q");
  rights.b.K = field.includes("k");
  rights.b.Q = field.includes("q");
  return rights;
}

function parseEnPassant(field) {
  if (!field || field === "-") return null;
  // basic validation: file+rank.
  const file = field[0];
  const rank = Number(field[1]);
  if (!FILES.includes(file) || !(rank >= 1 && rank <= 8)) return null;
  return `${file}${rank}`;
}

// PUBLIC_INTERFACE
export function positionFromFen(fen) {
  /**
   * Parse a FEN string into the engine's Position shape.
   *
   * Supported fields: piece placement, side to move, castling rights, en passant,
   * halfmove clock, fullmove number.
   *
   * @param {string} fen
   * @returns {{ok:true, position:any} | {ok:false, error:{message:string}}}
   */
  try {
    if (typeof fen !== "string" || !fen.trim()) {
      return { ok: false, error: { message: "FEN must be a non-empty string." } };
    }

    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) {
      return { ok: false, error: { message: "FEN must have at least 4 fields." } };
    }

    const [placement, stm, castlingField, epField, halfmoveField, fullmoveField] = parts;

    const ranks = placement.split("/");
    if (ranks.length !== 8) {
      return { ok: false, error: { message: "FEN placement must have 8 ranks." } };
    }

    const board = {};
    for (let r = 8; r >= 1; r -= 1) {
      const row = ranks[8 - r];
      let fileIndex = 0;

      for (const ch of row) {
        if (fileIndex > 7) break;

        if (/[1-8]/.test(ch)) {
          fileIndex += Number(ch);
          continue;
        }

        const piece = makePieceFromFenChar(ch);
        if (!piece) {
          return { ok: false, error: { message: `Invalid piece character in FEN: ${ch}` } };
        }

        const file = FILES[fileIndex];
        const sq = `${file}${r}`;
        board[sq] = piece;
        fileIndex += 1;
      }

      if (fileIndex !== 8) {
        return { ok: false, error: { message: `Rank ${r} does not have 8 files.` } };
      }
    }

    const toMove = stm === "w" || stm === "b" ? stm : null;
    if (!toMove) {
      return { ok: false, error: { message: "Side-to-move field must be 'w' or 'b'." } };
    }

    const castling = parseCastlingRights(castlingField);
    const enPassant = parseEnPassant(epField);

    const halfmoveClock =
      typeof halfmoveField === "string" && halfmoveField.length ? Number(halfmoveField) : 0;
    const fullmoveNumber =
      typeof fullmoveField === "string" && fullmoveField.length ? Number(fullmoveField) : 1;

    if (!Number.isFinite(halfmoveClock) || halfmoveClock < 0) {
      return { ok: false, error: { message: "Invalid halfmove clock in FEN." } };
    }
    if (!Number.isFinite(fullmoveNumber) || fullmoveNumber < 1) {
      return { ok: false, error: { message: "Invalid fullmove number in FEN." } };
    }

    return {
      ok: true,
      position: {
        board,
        toMove,
        castling,
        enPassant,
        halfmoveClock,
        fullmoveNumber,
        lastMove: null,
      },
    };
  } catch (e) {
    return { ok: false, error: { message: String(e?.message || e) } };
  }
}

function normalizeMoveToken(token) {
  if (typeof token !== "string") return "";
  return token.trim();
}

function tokensEquivalent(a, b) {
  return normalizeMoveToken(a) === normalizeMoveToken(b);
}

function isCoordinateMoveToken(tok) {
  const t = normalizeMoveToken(tok);
  if (t === "O-O" || t === "O-O-O") return true;
  // project uses from + optional "x" + to + optional "=Q"
  return /^[a-h][1-8]x?[a-h][1-8](=[QRBN])?$/i.test(t);
}

function moveToProjectToken(move) {
  // Same as engine.toAlgebraic(), but we don't want to import that into this module.
  if (move.isCastling) return move.to[0] === "g" ? "O-O" : "O-O-O";
  const cap = move.captured ? "x" : "";
  const promo = move.promotion ? `=${String(move.promotion).toUpperCase()}` : "";
  return `${move.from}${cap}${move.to}${promo}`;
}

function legalMoveMatchesExpected(position, expectedTokenRaw) {
  const expectedToken = normalizeMoveToken(expectedTokenRaw);
  if (!expectedToken) return null;

  const legal = getLegalMoves(position);

  // Castling tokens
  if (expectedToken === "O-O" || expectedToken === "O-O-O") {
    const targetTo = expectedToken === "O-O" ? (position.toMove === "w" ? "g1" : "g8") : position.toMove === "w" ? "c1" : "c8";
    const match = legal.find((m) => m.isCastling && m.to === targetTo);
    return match || null;
  }

  // Coordinate token
  if (isCoordinateMoveToken(expectedToken)) {
    const m = expectedToken.match(/^([a-h][1-8])x?([a-h][1-8])(=([QRBN]))?$/i);
    if (!m) return null;
    const from = m[1].toLowerCase();
    const to = m[2].toLowerCase();
    const promo = m[4] ? m[4].toLowerCase() : null;

    // If promo not specified, allow engine default promotions (it generates all) but user move might be queen.
    const match = legal.find(
      (mv) =>
        mv.from === from &&
        mv.to === to &&
        (promo ? String(mv.promotion || "").toLowerCase() === promo : true)
    );
    if (!match) return null;

    // If expected has explicit promotion, keep it; otherwise default to queen to match UI move creation.
    if (promo) return { ...match, promotion: promo };
    if (match.promotion) return { ...match, promotion: "q" };
    return match;
  }

  // Unsupported token types for this project.
  return null;
}

// PUBLIC_INTERFACE
export function buildPuzzleStateFromFen(fen) {
  /**
   * Convenience wrapper for puzzles: parse FEN and return a position initialized for puzzle play.
   * @param {string} fen
   * @returns {{ok:true, position:any} | {ok:false, error:{message:string}}}
   */
  return positionFromFen(fen);
}

// PUBLIC_INTERFACE
export function checkPuzzleUserMove({ position, userMove, solutionMoves, plyIndex }) {
  /**
   * Check if a user's move matches the expected solution token(s) for the current ply.
   *
   * @param {{position:any, userMove:any, solutionMoves:Array<string|Array<string>>, plyIndex:number}} args
   * @returns {{
   *   ok:boolean,
   *   correct:boolean,
   *   expectedTokens:string[],
   *   expectedMove:any|null,
   *   userToken:string
   * }}
   */
  if (!position || !userMove || !Array.isArray(solutionMoves)) {
    return { ok: false, correct: false, expectedTokens: [], expectedMove: null, userToken: "" };
  }

  const expected = solutionMoves[plyIndex];
  const expectedTokens = Array.isArray(expected) ? expected : [expected];

  const userToken = moveToProjectToken(userMove);

  // Try to match against any acceptable token by comparing the move tokens.
  const tokenMatch = expectedTokens.some((t) => tokensEquivalent(t, userToken));
  if (tokenMatch) {
    // Build expected move (for advancing reliably) from expected token (first matching token)
    const token = expectedTokens.find((t) => tokensEquivalent(t, userToken));
    const expectedMove = legalMoveMatchesExpected(position, token);
    return { ok: true, correct: true, expectedTokens: expectedTokens.map(normalizeMoveToken), expectedMove: expectedMove || userMove, userToken };
  }

  return { ok: true, correct: false, expectedTokens: expectedTokens.map(normalizeMoveToken), expectedMove: null, userToken };
}

// PUBLIC_INTERFACE
export function applyExpectedPuzzleMove(position, expectedToken) {
  /**
   * Apply a solution token to a position (for Reveal/auto-advance).
   *
   * @param {any} position
   * @param {string} expectedToken
   * @returns {{ok:true, position:any, move:any} | {ok:false, error:{message:string}}}
   */
  const mv = legalMoveMatchesExpected(position, expectedToken);
  if (!mv) return { ok: false, error: { message: `Expected move is not legal here: ${expectedToken}` } };
  return { ok: true, position: applyMove(position, mv), move: mv };
}

// PUBLIC_INTERFACE
export function selectDailyPuzzleId(puzzles, date = new Date()) {
  /**
   * Deterministically select a daily puzzle id from a puzzle list using the local date.
   *
   * @param {Puzzle[]} puzzles
   * @param {Date} date
   * @returns {string|null}
   */
  if (!Array.isArray(puzzles) || puzzles.length === 0) return null;

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const key = `${yyyy}-${mm}-${dd}`;

  // Simple stable hash (djb2).
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 33) ^ key.charCodeAt(i);
  const idx = Math.abs(hash) % puzzles.length;

  return puzzles[idx].id;
}

// PUBLIC_INTERFACE
export function computeRatedRunUpdate({ currentRating, puzzleRating, solved }) {
  /**
   * Elo-like update for rated run.
   *
   * @param {{currentRating:number, puzzleRating:number, solved:boolean}} args
   * @returns {{newRating:number, delta:number, expected:number, k:number}}
   */
  const R = Number.isFinite(currentRating) ? currentRating : 1200;
  const P = Number.isFinite(puzzleRating) ? puzzleRating : 1200;

  // Expected score of user vs puzzle.
  const expected = 1 / (1 + 10 ** ((P - R) / 400));

  // K factor: higher when user fails, to move them to appropriate band faster.
  const k = solved ? 20 : 40;

  const score = solved ? 1 : 0;
  const delta = Math.round(k * (score - expected));
  const newRating = Math.max(100, R + delta);

  return { newRating, delta, expected, k };
}

// PUBLIC_INTERFACE
export function validatePuzzlePackJson(jsonValue) {
  /**
   * Validate an imported puzzle pack JSON (array of Puzzle-like objects).
   * Returns either ok with puzzles (normalized) or ok:false with error list.
   *
   * @param {any} jsonValue
   * @returns {{ok:true, puzzles:Puzzle[]} | {ok:false, errors:string[]}}
   */
  const errors = [];
  if (!Array.isArray(jsonValue)) {
    return { ok: false, errors: ["Puzzle pack must be a JSON array."] };
  }

  const puzzles = [];
  const seenIds = new Set();

  jsonValue.forEach((p, idx) => {
    const path = `[#${idx}]`;
    if (!p || typeof p !== "object") {
      errors.push(`${path} Puzzle must be an object.`);
      return;
    }

    const { id, fen, moves, rating, themes, description } = p;

    if (typeof id !== "string" || !id.trim()) errors.push(`${path}.id must be a non-empty string.`);
    if (typeof fen !== "string" || !fen.trim()) errors.push(`${path}.fen must be a non-empty string.`);
    if (!Array.isArray(moves) || moves.length === 0) errors.push(`${path}.moves must be a non-empty array.`);
    if (!Number.isFinite(Number(rating))) errors.push(`${path}.rating must be a number.`);
    if (!Array.isArray(themes) || themes.some((t) => typeof t !== "string"))
      errors.push(`${path}.themes must be an array of strings.`);

    if (typeof description !== "undefined" && typeof description !== "string")
      errors.push(`${path}.description must be a string if provided.`);

    if (typeof id === "string") {
      if (seenIds.has(id)) errors.push(`${path}.id is duplicated: ${id}`);
      seenIds.add(id);
    }

    // validate moves tokens
    if (Array.isArray(moves)) {
      moves.forEach((ply, pidx) => {
        const ppath = `${path}.moves[${pidx}]`;
        if (typeof ply === "string") {
          if (!normalizeMoveToken(ply)) errors.push(`${ppath} must not be empty.`);
        } else if (Array.isArray(ply)) {
          if (ply.length === 0) errors.push(`${ppath} must not be an empty array.`);
          ply.forEach((tok, tidx) => {
            if (typeof tok !== "string" || !normalizeMoveToken(tok)) {
              errors.push(`${ppath}[${tidx}] must be a non-empty string.`);
            }
          });
        } else {
          errors.push(`${ppath} must be a string or an array of strings (alternatives).`);
        }
      });
    }

    // validate FEN parses
    if (typeof fen === "string" && fen.trim()) {
      const parsed = positionFromFen(fen);
      if (!parsed.ok) errors.push(`${path}.fen invalid: ${parsed.error.message}`);
    }

    if (errors.length === 0) {
      puzzles.push({
        id: String(id),
        fen: String(fen),
        moves: moves.map((m) => m),
        rating: Number(rating),
        themes: themes.map((t) => String(t)),
        description: typeof description === "string" ? description : undefined,
      });
    }
  });

  if (errors.length) return { ok: false, errors };
  return { ok: true, puzzles };
}

// PUBLIC_INTERFACE
export function pickPuzzleForRating(puzzles, rating) {
  /**
   * Pick a puzzle "around" a user rating.
   * Strategy: closest rating among unsorted list (stable).
   *
   * @param {Puzzle[]} puzzles
   * @param {number} rating
   * @returns {Puzzle|null}
   */
  if (!Array.isArray(puzzles) || puzzles.length === 0) return null;
  const r = Number.isFinite(rating) ? rating : 1200;

  let best = puzzles[0];
  let bestDist = Math.abs((best.rating || 1200) - r);

  for (const p of puzzles) {
    const dist = Math.abs((p.rating || 1200) - r);
    if (dist < bestDist) {
      best = p;
      bestDist = dist;
    }
  }
  return best;
}

// PUBLIC_INTERFACE
export function emptyPuzzlePlayPosition() {
  /**
   * Utility for components/tests: a valid empty-ish position for fallback.
   * @returns {any}
   */
  return createInitialPosition();
}
