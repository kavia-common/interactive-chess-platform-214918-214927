import React from "react";

/**
 * PUBLIC_INTERFACE
 * MoveHistory shows a scrollable move list and allows navigating to any ply.
 */
export default function MoveHistory({ moves, cursor, onJump }) {
  // cursor is the current position index; moves are indexed by ply starting at 1.
  return (
    <div className="moveList" role="list" aria-label="Move history">
      <div
        className={`moveItem ${cursor === 0 ? "moveActive" : ""}`}
        role="listitem"
        onClick={() => onJump?.(0)}
        tabIndex={0}
        onKeyDown={(e) => (e.key === "Enter" ? onJump?.(0) : null)}
      >
        <div style={{ opacity: 0.7 }}>0.</div>
        <div>Start</div>
      </div>

      {(moves || []).map((m) => {
        const active = cursor === m.ply;
        return (
          <div
            key={m.ply}
            className={`moveItem ${active ? "moveActive" : ""}`}
            role="listitem"
            onClick={() => onJump?.(m.ply)}
            tabIndex={0}
            onKeyDown={(e) => (e.key === "Enter" ? onJump?.(m.ply) : null)}
            aria-label={`Move ${m.ply}: ${m.text}`}
          >
            <div style={{ opacity: 0.7 }}>{m.ply}.</div>
            <div>{m.text}</div>
          </div>
        );
      })}
    </div>
  );
}
