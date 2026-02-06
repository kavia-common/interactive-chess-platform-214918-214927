import React from "react";

const GLYPHS = {
  wp: { label: "P", fill: "#e2e8f0", stroke: "#0b1021" },
  wn: { label: "N", fill: "#e2e8f0", stroke: "#0b1021" },
  wb: { label: "B", fill: "#e2e8f0", stroke: "#0b1021" },
  wr: { label: "R", fill: "#e2e8f0", stroke: "#0b1021" },
  wq: { label: "Q", fill: "#e2e8f0", stroke: "#0b1021" },
  wk: { label: "K", fill: "#e2e8f0", stroke: "#0b1021" },

  bp: { label: "P", fill: "#0b1021", stroke: "#e2e8f0" },
  bn: { label: "N", fill: "#0b1021", stroke: "#e2e8f0" },
  bb: { label: "B", fill: "#0b1021", stroke: "#e2e8f0" },
  br: { label: "R", fill: "#0b1021", stroke: "#e2e8f0" },
  bq: { label: "Q", fill: "#0b1021", stroke: "#e2e8f0" },
  bk: { label: "K", fill: "#0b1021", stroke: "#e2e8f0" },
};

function keyFor(piece) {
  return `${piece.color}${piece.type}`;
}

/**
 * PUBLIC_INTERFACE
 * renderPiece renders a pixel-ish SVG representation for a chess piece.
 */
export function renderPiece({ piece, className, isDragging, ariaLabel }) {
  const g = GLYPHS[keyFor(piece)] || GLYPHS.wp;

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
      {/* chunky pixel frame */}
      <rect
        x="10"
        y="10"
        width="44"
        height="44"
        rx="6"
        fill={g.fill}
        stroke={g.stroke}
        strokeWidth="4"
        shapeRendering="crispEdges"
      />
      {/* inner bevel */}
      <rect
        x="16"
        y="16"
        width="32"
        height="32"
        rx="4"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="2"
        shapeRendering="crispEdges"
      />
      <text
        x="32"
        y="40"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="22"
        fill={g.stroke}
        style={{ letterSpacing: "0.04em" }}
      >
        {g.label}
      </text>
    </svg>
  );
}
