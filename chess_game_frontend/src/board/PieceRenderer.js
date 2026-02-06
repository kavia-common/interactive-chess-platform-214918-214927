import React from "react";

const PIECE_SET_STORAGE_KEY = "retroChess.pieceSetId";

/**
 * All supported piece sets.
 * - "default" uses existing `piece.unicode` from engine state (current behavior).
 * - "pixel" and "alpha" are lazy-loaded to keep initial bundle light.
 */
const PIECE_SETS = [
  {
    id: "default",
    name: "Default (Unicode)",
    description: "Crisp Unicode chess symbols (current default).",
    preview: { w: "♔", b: "♚" },
  },
  {
    id: "pixel",
    name: "Pixel / 8-bit",
    description: "Chunky pixel-like SVGs, good for CRT themes.",
    preview: { w: "▣", b: "▢" },
  },
  {
    id: "alpha",
    name: "Alpha Minimal",
    description: "Minimal letter-based pieces in SVG.",
    preview: { w: "K", b: "k" },
  },
];

/**
 * PUBLIC_INTERFACE
 * Load persisted piece set id from localStorage.
 */
export function loadPieceSetPref() {
  let pieceSetId = "default";
  try {
    const v = window.localStorage.getItem(PIECE_SET_STORAGE_KEY);
    if (v) pieceSetId = v;
  } catch {
    // ignore
  }
  if (!PIECE_SETS.some((s) => s.id === pieceSetId)) pieceSetId = "default";
  return { pieceSetId };
}

/**
 * PUBLIC_INTERFACE
 * Persist piece set id to localStorage.
 */
export function savePieceSetPref(pieceSetId) {
  try {
    window.localStorage.setItem(PIECE_SET_STORAGE_KEY, pieceSetId);
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * Get list of available piece sets.
 */
export function getPieceSets() {
  return PIECE_SETS;
}

function pieceKey(piece) {
  // piece.type: 'p','n','b','r','q','k'; piece.color: 'w'|'b'
  return `${piece.color}${piece.type}`;
}

function ariaForPiece(piece) {
  const color = piece.color === "w" ? "White" : "Black";
  const map = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return `${color} ${map[piece.type] || piece.type}`;
}

// Cache loaded renderers by pieceSetId
const rendererCache = new Map();

/**
 * Lazily load a renderer implementation for a given piece set.
 */
async function loadRenderer(pieceSetId) {
  if (rendererCache.has(pieceSetId)) return rendererCache.get(pieceSetId);

  let renderer;
  if (pieceSetId === "pixel") {
    const mod = await import("./pieceSets/pixel");
    renderer = mod.renderPiece;
  } else if (pieceSetId === "alpha") {
    const mod = await import("./pieceSets/alpha");
    renderer = mod.renderPiece;
  } else {
    renderer = null;
  }

  rendererCache.set(pieceSetId, renderer);
  return renderer;
}

/**
 * PUBLIC_INTERFACE
 * PieceRenderer renders a single piece based on the currently-selected piece set.
 *
 * Props:
 * - piece: {color,type,unicode} (from engine position.board[sq])
 * - pieceSetId: string
 * - className: string
 * - isDragging: boolean
 */
export function PieceRenderer({ piece, pieceSetId, className, isDragging }) {
  const [lazyRenderer, setLazyRenderer] = React.useState(null);

  React.useEffect(() => {
    let alive = true;
    if (!pieceSetId || pieceSetId === "default") {
      setLazyRenderer(null);
      return () => {
        alive = false;
      };
    }

    loadRenderer(pieceSetId).then((r) => {
      if (!alive) return;
      setLazyRenderer(() => r);
    });

    return () => {
      alive = false;
    };
  }, [pieceSetId]);

  const ariaLabel = ariaForPiece(piece);

  // Default set: preserve original behavior.
  if (!pieceSetId || pieceSetId === "default") {
    return (
      <span className={className} aria-label={ariaLabel}>
        {piece.unicode}
      </span>
    );
  }

  // While lazy renderer is loading, show fallback unicode (prevents flashing empty squares).
  if (!lazyRenderer) {
    return (
      <span className={className} aria-label={ariaLabel}>
        {piece.unicode}
      </span>
    );
  }

  return lazyRenderer({
    piece,
    className,
    isDragging,
    ariaLabel,
    key: pieceKey(piece),
  });
}

export { PIECE_SET_STORAGE_KEY };
