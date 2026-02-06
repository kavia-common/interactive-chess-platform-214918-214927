import React from "react";

/**
 * PUBLIC_INTERFACE
 * Controls renders game mode toggles, AI difficulty, side selection, and actions.
 */
export default function Controls({
  mode,
  playAs,
  aiDepth,
  canUndo,
  canRedo,
  canMove,
  onModeChange,
  onPlayAsChange,
  onAiDepthChange,
  onNewGame,
  onUndo,
  onRedo,
}) {
  return (
    <>
      <div className="controlsGrid">
        <div className="controlRow">
          <div className="label">Mode</div>
          <select
            className="select"
            value={mode}
            onChange={(e) => onModeChange?.(e.target.value)}
            aria-label="Game mode"
          >
            <option value="ai">Single-player vs AI</option>
            <option value="local">Local two-player</option>
          </select>
        </div>

        <div className="controlRow">
          <div className="label">AI difficulty</div>
          <select
            className="select"
            value={aiDepth}
            disabled={mode !== "ai"}
            onChange={(e) => onAiDepthChange?.(Number(e.target.value))}
            aria-label="AI difficulty"
          >
            <option value={1}>Depth 1 (fast)</option>
            <option value={2}>Depth 2 (balanced)</option>
            <option value={3}>Depth 3 (tough)</option>
          </select>
        </div>

        <div className="controlRow">
          <div className="label">Play as</div>
          <select
            className="select"
            value={playAs}
            disabled={mode !== "ai"}
            onChange={(e) => onPlayAsChange?.(e.target.value)}
            aria-label="Play as side"
          >
            <option value="w">White</option>
            <option value="b">Black</option>
          </select>
        </div>

        <div className="controlRow">
          <div className="label">Timeline</div>
          <div className="buttonRow">
            <button
              className="button buttonGhost"
              onClick={onUndo}
              disabled={!canUndo}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              className="button buttonGhost"
              onClick={onRedo}
              disabled={!canRedo}
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </button>
          </div>
        </div>
      </div>

      <div className="buttonRow">
        <button
          className="button buttonPrimary"
          onClick={onNewGame}
          aria-label="New game"
        >
          New Game
        </button>
        <span className="pill">
          Moves: <span className="kbd">{canMove ? "ENABLED" : "LOCKED"}</span>
        </span>
      </div>
    </>
  );
}
