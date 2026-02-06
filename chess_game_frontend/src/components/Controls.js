import React from "react";

const TIME_PRESETS = [
  { id: "blitz-5-0", group: "Blitz", label: "Blitz 5+0", minutes: 5, increment: 0 },
  { id: "blitz-3-2", group: "Blitz", label: "Blitz 3+2", minutes: 3, increment: 2 },
  { id: "rapid-10-0", group: "Rapid", label: "Rapid 10+0", minutes: 10, increment: 0 },
  { id: "rapid-10-5", group: "Rapid", label: "Rapid 10+5", minutes: 10, increment: 5 },
  { id: "classical-30-0", group: "Classical", label: "Classical 30+0", minutes: 30, increment: 0 },
  { id: "custom", group: "Custom", label: "Custom…", minutes: 5, increment: 0 },
];

/**
 * PUBLIC_INTERFACE
 * Controls renders game mode toggles, AI difficulty, side selection, time controls, and actions.
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

  // Time controls
  timePresetId,
  customMinutes,
  customIncrement,
  timeControlsLocked,
  clockStarted,
  isPaused,
  onTimePresetChange,
  onCustomMinutesChange,
  onCustomIncrementChange,
  onStartClock,
  onTogglePause,
}) {
  const selected = TIME_PRESETS.find((p) => p.id === timePresetId) || TIME_PRESETS[0];
  const isCustom = selected.id === "custom";
  const settingsDisabled = Boolean(timeControlsLocked);

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
            disabled={settingsDisabled}
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
            disabled={mode !== "ai" || settingsDisabled}
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
            disabled={mode !== "ai" || settingsDisabled}
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
              disabled={!canUndo || settingsDisabled}
              aria-label="Undo"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </button>
            <button
              className="button buttonGhost"
              onClick={onRedo}
              disabled={!canRedo || settingsDisabled}
              aria-label="Redo"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </button>
          </div>
        </div>

        <div className="controlRow">
          <div className="label">Time control</div>
          <select
            className="select"
            value={timePresetId}
            disabled={settingsDisabled}
            onChange={(e) => onTimePresetChange?.(e.target.value)}
            aria-label="Time control preset"
          >
            <optgroup label="Blitz">
              {TIME_PRESETS.filter((p) => p.group === "Blitz").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Rapid">
              {TIME_PRESETS.filter((p) => p.group === "Rapid").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Classical">
              {TIME_PRESETS.filter((p) => p.group === "Classical").map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Custom">
              <option value="custom">Custom…</option>
            </optgroup>
          </select>
        </div>

        <div className="controlRow">
          <div className="label">Custom (min / inc)</div>
          <div className="timeCustomRow">
            <input
              className="select timeInput"
              type="number"
              min={0}
              step={1}
              value={customMinutes}
              disabled={!isCustom || settingsDisabled}
              onChange={(e) => onCustomMinutesChange?.(e.target.value)}
              aria-label="Custom minutes"
              placeholder="Minutes"
            />
            <input
              className="select timeInput"
              type="number"
              min={0}
              step={1}
              value={customIncrement}
              disabled={!isCustom || settingsDisabled}
              onChange={(e) => onCustomIncrementChange?.(e.target.value)}
              aria-label="Custom increment seconds"
              placeholder="Increment"
            />
          </div>
        </div>
      </div>

      <div className="buttonRow">
        <button
          className="button buttonPrimary"
          onClick={onStartClock}
          disabled={clockStarted || !canMove}
          aria-label="Start clocks"
          title={clockStarted ? "Clocks already started" : "Start clocks"}
        >
          Start
        </button>

        <button
          className="button buttonGhost"
          onClick={onTogglePause}
          disabled={!clockStarted}
          aria-label={isPaused ? "Resume clocks" : "Pause clocks"}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>

        <button
          className="button buttonPrimary"
          onClick={onNewGame}
          aria-label="New game"
          title="New game (resets board and clocks)"
        >
          New Game
        </button>

        <span className="pill">
          Moves: <span className="kbd">{canMove ? "ENABLED" : "LOCKED"}</span>
        </span>
      </div>

      <div className="statusHint" style={{ marginTop: 10 }}>
        Settings lock after the first move. Start begins timing on the first move.
      </div>
    </>
  );
}

export { TIME_PRESETS };
