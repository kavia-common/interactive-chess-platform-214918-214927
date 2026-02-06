import React from "react";

const LABELS = {
  p: "P",
  n: "N",
  b: "B",
  r: "R",
  q: "Q",
  k: "K",
};

function fillFor(color) {
  // Use theme text for white pieces and muted for black pieces for contrast across themes.
  return color === "w" ? "var(--text)" : "var(--muted)";
}

function strokeFor(color) {
  return color === "w" ? "rgba(0,0,0,0.20)" : "rgba(255,255,255,0.18)";
}

/**
 * PUBLIC_INTERFACE
 * renderPiece renders a minimal letter-based SVG for a chess piece.
 */
export function renderPiece({ piece, className, isDragging, ariaLabel }) {
  const letter = LABELS[piece.type] || "?";

  return (
    <svg
      className={className}
      aria-label={ariaLabel}
      role="img"
      viewBox="0 0 64 64"
      width="1em"
      height="1em"
      style={{
        display: "block",
        transform: isDragging ? "scale(1.05)" : undefined,
      }}
    >
      <circle
        cx="32"
        cy="32"
        r="22"
        fill="rgba(255,255,255,0.06)"
        stroke={strokeFor(piece.color)}
        strokeWidth="2"
      />
      <text
        x="32"
        y="41"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="28"
        fill={fillFor(piece.color)}
        style={{ fontWeight: 700, letterSpacing: "0.06em" }}
      >
        {piece.color === "b" ? letter.toLowerCase() : letter}
      </text>
    </svg>
  );
}
