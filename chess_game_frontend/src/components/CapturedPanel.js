import React from "react";

/**
 * PUBLIC_INTERFACE
 * CapturedPanel displays a list of captured pieces (as Unicode).
 */
export default function CapturedPanel({ title, pieces, pieceToUnicode }) {
  return (
    <div>
      <div className="label" style={{ marginBottom: 8 }}>
        {title}
      </div>
      <div className="captured" aria-label={title}>
        {(pieces || []).length === 0 ? (
          <span style={{ color: "rgba(17,24,39,0.45)", fontSize: 13, fontFamily: "var(--font-mono)" }}>
            — none —
          </span>
        ) : (
          pieces.map((p, idx) => (
            <span key={`${p}-${idx}`} aria-label={`Captured ${p}`}>
              {pieceToUnicode[p]}
            </span>
          ))
        )}
      </div>
    </div>
  );
}
