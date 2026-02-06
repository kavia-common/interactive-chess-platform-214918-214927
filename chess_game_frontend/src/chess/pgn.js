import { applyMove, createInitialPosition, getGameStatus, getLegalMoves, toAlgebraic } from "./engine";

/**
 * Lightweight PGN support for the main game.
 *
 * Notes / scope:
 * - We export SAN using this project's existing notation: `toAlgebraic` (coordinate notation).
 *   (So "SAN" in this codebase means the displayed move text already used in MoveHistory.)
 * - We parse PGN movetext by applying moves from the start position, supporting:
 *   castling, en passant, promotions (including explicit =Q/R/B/N).
 * - Comments `{...}`, line comments `; ...`, variations `( ... )`, and NAGs `$n` are ignored.
 * - We accept either coordinate moves (e2e4, e7xe8=Q) or SAN-like tokens (O-O, O-O-O).
 */

/**
 * @typedef {Object} PgnHeaders
 * @property {string} [Event]
 * @property {string} [Site]
 * @property {string} [Date]
 * @property {string} [Round]
 * @property {string} [White]
 * @property {string} [Black]
 * @property {string} [Result]
 */

/**
 * @typedef {Object} PgnGame
 * @property {PgnHeaders} headers
 * @property {Array<Object>} moves - internal engine move objects (from/to/promotion/isCastling/isEnPassant etc.)
 * @property {Array<string>} san - exported display tokens for each move (project notation)
 * @property {string} result - one of "1-0" | "0-1" | "1/2-1/2" | "*"
 */

/**
 * Build sensible default headers for export.
 */
function defaultHeaders() {
  const now = new Date();
  const pad2 = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())}`;
  return {
    Event: "Retro Chess Terminal",
    Site: "Local",
    Date: date,
    Round: "-",
    White: "White",
    Black: "Black",
    Result: "*",
  };
}

function sanitizeHeaderValue(v) {
  const s = String(v ?? "").replaceAll('"', '\\"');
  return s.length ? s : "-";
}

function normalizeResultToken(token) {
  if (token === "1-0" || token === "0-1" || token === "1/2-1/2" || token === "*") return token;
  return "*";
}

function resultFromStatus(status) {
  if (!status || !status.state) return "*";
  if (status.state === "checkmate") return status.winner === "w" ? "1-0" : "0-1";
  if (status.state === "stalemate" || status.state === "draw") return "1/2-1/2";
  return "*";
}

function stripPgnNoise(text) {
  let s = String(text ?? "");

  // Normalize newlines
  s = s.replaceAll("\r\n", "\n").replaceAll("\r", "\n");

  // Remove BOM if present
  s = s.replace(/^\uFEFF/, "");

  // Remove { comments }
  s = s.replace(/\{[^}]*\}/g, " ");

  // Remove ; line comments
  s = s.replace(/;[^\n]*/g, " ");

  // Remove variations ( ... ) with basic nesting support
  // Keep removing deepest parens until none remain.
  // This is intentionally conservative: PGN variations are optional for our use-case.
  while (/\([^()]*\)/.test(s)) s = s.replace(/\([^()]*\)/g, " ");

  // Remove NAGs like $1
  s = s.replace(/\$\d+/g, " ");

  return s;
}

function parseHeaders(text) {
  const headers = {};
  const headerRe = /^\s*\[([A-Za-z0-9_]+)\s+"([^"]*)"\s*\]\s*$/gm;

  let m;
  // eslint-disable-next-line no-cond-assign
  while ((m = headerRe.exec(text))) {
    const key = m[1];
    const val = m[2];
    headers[key] = val;
  }
  return headers;
}

function tokenizeMovetext(text) {
  const stripped = stripPgnNoise(text);

  // Remove header lines entirely before tokenization
  const withoutHeaders = stripped.replace(/^\s*\[[^\]]*\]\s*$/gm, " ");

  // Split on whitespace
  const raw = withoutHeaders
    .replaceAll("\n", " ")
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean);

  const tokens = [];
  for (const t0 of raw) {
    // Remove move numbers: "1.", "1...", "23."
    const t1 = t0.replace(/^\d+\.(\.\.)?/, "");
    if (!t1) continue;

    // Remove ellipsis-only leftovers
    if (t1 === "..." || t1 === ".") continue;

    // Remove check/mate suffix (we ignore for parsing legality)
    const t2 = t1.replace(/[+#]+$/g, "");

    // Remove annotation glyphs like !? etc. (common PGN)
    const t3 = t2.replace(/[!?]+$/g, "");

    if (!t3) continue;

    tokens.push(t3);
  }

  return tokens;
}

function looksLikeResult(t) {
  return t === "1-0" || t === "0-1" || t === "1/2-1/2" || t === "*";
}

function parseCoordinateToken(token) {
  // Accept:
  // - e2e4
  // - e2xe4
  // - e7e8=Q / e7xe8=Q
  // - promotion letter case-insensitive
  const m = token.match(/^([a-h][1-8])x?([a-h][1-8])(=([QRBNqrbn]))?$/);
  if (!m) return null;
  return {
    from: m[1],
    to: m[2],
    promotion: m[4] ? m[4].toLowerCase() : null,
  };
}

function movesEqualForKey(a, b) {
  return (
    a.from === b.from &&
    a.to === b.to &&
    (a.promotion || "") === (b.promotion || "") &&
    Boolean(a.isCastling) === Boolean(b.isCastling) &&
    Boolean(a.isEnPassant) === Boolean(b.isEnPassant)
  );
}

function findLegalMoveByToken(position, token) {
  // Castling tokens
  if (token === "O-O" || token === "0-0") {
    const legal = getLegalMoves(position);
    return legal.find((m) => m.isCastling && m.to[0] === "g") || null;
  }
  if (token === "O-O-O" || token === "0-0-0") {
    const legal = getLegalMoves(position);
    return legal.find((m) => m.isCastling && m.to[0] === "c") || null;
  }

  // Coordinate-style
  const coord = parseCoordinateToken(token);
  if (coord) {
    const legal = getLegalMoves(position);
    const wanted = {
      from: coord.from,
      to: coord.to,
      promotion: coord.promotion || undefined,
    };

    // If promotion not specified, accept any promotion that matches squares (but prefer queen)
    const matching = legal.filter((m) => m.from === wanted.from && m.to === wanted.to);
    if (!matching.length) return null;

    if (wanted.promotion) {
      const exact = matching.find((m) => (m.promotion || "") === wanted.promotion);
      return exact || null;
    }

    // Prefer queen if multiple promotions, else first
    const queen = matching.find((m) => m.promotion === "q");
    return queen || matching[0];
  }

  // Fallback: accept token matching this project's exported "SAN" (toAlgebraic)
  // This is important for round-trip and for PGN created by this app.
  const legal = getLegalMoves(position);
  const bySan = legal.find((m) => toAlgebraic(m) === token);
  if (bySan) return bySan;

  return null;
}

// PUBLIC_INTERFACE
export function exportGameToPgn({
  positions,
  cursor,
  headers = {},
  result: explicitResult = null,
} = {}) {
  /**
   * Export the current game timeline (up to cursor; default: latest) to PGN.
   *
   * @param {Object} params
   * @param {Array<any>} params.positions - App positions array (positions[0] is initial; positions[i].lastMove is move i)
   * @param {number} params.cursor - current cursor in App
   * @param {PgnHeaders} params.headers - optional override headers
   * @param {string|null} params.result - optional explicit result "1-0"/"0-1"/"1/2-1/2"/"*"
   * @returns {string} PGN text
   */
  const posList = Array.isArray(positions) ? positions : [];
  const tip = typeof cursor === "number" ? cursor : Math.max(0, posList.length - 1);
  const endIndex = Math.min(Math.max(0, tip), Math.max(0, posList.length - 1));

  const base = defaultHeaders();
  const merged = { ...base, ...(headers || {}) };

  const endPos = posList[endIndex] || createInitialPosition();
  const status = getGameStatus(endPos);
  const derivedResult = resultFromStatus(status);
  const result = normalizeResultToken(explicitResult || merged.Result || derivedResult);
  merged.Result = result;

  const headerOrder = ["Event", "Site", "Date", "Round", "White", "Black", "Result"];

  const out = [];
  for (const key of headerOrder) {
    out.push(`[${key} "${sanitizeHeaderValue(merged[key])}"]`);
  }
  out.push("");

  // Move text: include move numbers: "1. wMove bMove 2. wMove ..."
  const tokens = [];
  let moveNo = 1;
  for (let ply = 1; ply <= endIndex; ply += 1) {
    const mv = posList[ply]?.lastMove;
    if (!mv) continue;
    const isWhitePly = ply % 2 === 1;
    if (isWhitePly) {
      tokens.push(`${moveNo}.`);
    }
    tokens.push(toAlgebraic(mv));
    if (!isWhitePly) moveNo += 1;
  }
  tokens.push(result);

  // Wrap movetext to ~80 columns (simple)
  const wrapWidth = 80;
  let line = "";
  for (const t of tokens) {
    const candidate = line ? `${line} ${t}` : t;
    if (candidate.length > wrapWidth && line) {
      out.push(line);
      line = t;
    } else {
      line = candidate;
    }
  }
  if (line) out.push(line);

  return out.join("\n");
}

// PUBLIC_INTERFACE
export function importPgnToGame(pgnText) {
  /**
   * Parse PGN text into an internal move list; reconstruct position by applying legal moves.
   *
   * Returns:
   * - { ok: true, game: PgnGame }
   * - { ok: false, error: { message, token?, ply? } }
   */
  const text = String(pgnText ?? "");
  const headers = parseHeaders(text);

  const tokens = tokenizeMovetext(text);

  // Determine result: token result at end OR header Result OR "*"
  let result = normalizeResultToken(headers.Result);
  if (tokens.length && looksLikeResult(tokens[tokens.length - 1])) {
    result = normalizeResultToken(tokens[tokens.length - 1]);
  }

  const moves = [];
  const san = [];

  let position = createInitialPosition();

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    // Stop at result token if present midstream
    if (looksLikeResult(token)) break;

    const mv = findLegalMoveByToken(position, token);
    if (!mv) {
      return {
        ok: false,
        error: {
          message: `PGN parse error: illegal or unrecognized move token "${token}" at ply ${moves.length + 1}.`,
          token,
          ply: moves.length + 1,
        },
      };
    }

    moves.push(mv);
    san.push(toAlgebraic(mv));
    position = applyMove(position, mv);
  }

  return {
    ok: true,
    game: {
      headers: {
        ...defaultHeaders(),
        ...headers,
        Result: result,
      },
      moves,
      san,
      result,
    },
  };
}

// PUBLIC_INTERFACE
export function buildPositionsFromMoves(moves) {
  /**
   * Build App-compatible `positions` array from a list of internal move objects.
   * positions[0] is initial; positions[i] is the position after move i, with lastMove set.
   */
  const pos = [createInitialPosition()];
  let current = pos[0];
  for (const mv of moves || []) {
    current = applyMove(current, mv);
    pos.push(current);
  }
  return pos;
}
