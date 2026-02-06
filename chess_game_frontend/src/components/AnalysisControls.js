import React from "react";

/**
 * PUBLIC_INTERFACE
 * AnalysisControls renders analysis settings and actions.
 */
export default function AnalysisControls({
  enabled,
  onToggleEnabled,

  limitsMode,
  onLimitsModeChange, // "time" | "depth"
  timeMs,
  onTimeMsChange,
  maxDepth,
  onMaxDepthChange,
  multiPv,
  onMultiPvChange,

  isThinking,
  onStart,
  onStop,
  onClear,

  onExportJson,
  onImportJson,
  onExportPgn,

  onApplyToGame,
  canApply,
}) {
  return (
    <div>
      <div className="buttonRow" style={{ marginTop: 0 }}>
        <button
          className={`button ${enabled ? "buttonPrimary" : "buttonGhost"}`}
          onClick={() => onToggleEnabled?.(!enabled)}
          aria-label="Toggle analysis mode"
          title="Analysis mode"
        >
          {enabled ? "Analysis: ON" : "Analysis: OFF"}
        </button>

        <span className="pill">
          Engine: <span className="kbd">{isThinking ? "THINKING" : "IDLE"}</span>
        </span>
      </div>

      {enabled ? (
        <>
          <div style={{ height: 12 }} />

          <div className="controlsGrid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="controlRow">
              <div className="label">Limit mode</div>
              <select
                className="select"
                value={limitsMode}
                onChange={(e) => onLimitsModeChange?.(e.target.value)}
                aria-label="Analysis limit mode"
              >
                <option value="time">Time per position</option>
                <option value="depth">Max depth</option>
              </select>
            </div>

            <div className="controlRow">
              <div className="label">Multi-PV</div>
              <select
                className="select"
                value={multiPv}
                onChange={(e) => onMultiPvChange?.(Number(e.target.value))}
                aria-label="Multi PV"
              >
                <option value={1}>1 line</option>
                <option value={2}>2 lines</option>
                <option value={3}>3 lines</option>
              </select>
            </div>

            <div className="controlRow">
              <div className="label">Time (ms)</div>
              <select
                className="select"
                value={timeMs}
                onChange={(e) => onTimeMsChange?.(Number(e.target.value))}
                aria-label="Time per position"
                disabled={limitsMode !== "time"}
              >
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2000}>2000</option>
              </select>
            </div>

            <div className="controlRow">
              <div className="label">Max depth</div>
              <input
                className="select"
                type="number"
                min={1}
                max={10}
                step={1}
                value={maxDepth}
                onChange={(e) => onMaxDepthChange?.(Number(e.target.value))}
                aria-label="Max depth"
                disabled={limitsMode !== "depth"}
              />
            </div>
          </div>

          <div className="buttonRow">
            <button
              className="button buttonPrimary"
              onClick={onStart}
              disabled={isThinking}
              aria-label="Start analysis"
            >
              Start
            </button>
            <button className="button buttonGhost" onClick={onStop} disabled={!isThinking} aria-label="Stop analysis">
              Stop
            </button>
            <button className="button buttonGhost" onClick={onClear} aria-label="Clear analysis">
              Clear
            </button>
          </div>

          <div className="buttonRow">
            <button className="button buttonGhost" onClick={onExportJson} aria-label="Export analysis JSON">
              Export JSON
            </button>
            <button className="button buttonGhost" onClick={onImportJson} aria-label="Import analysis JSON">
              Import JSON
            </button>
            <button className="button buttonGhost" onClick={onExportPgn} aria-label="Export analysis PGN">
              Export PGN
            </button>
          </div>

          <div className="buttonRow">
            <button
              className="button buttonPrimary"
              onClick={onApplyToGame}
              disabled={!canApply}
              aria-label="Apply to game from selected node"
              title="Replace live game history with the selected line"
            >
              Apply to Game
            </button>
          </div>

          <div className="statusHint" style={{ marginTop: 10 }}>
            Analysis mode disables clocks/results and lets you explore variations. Use “Apply to Game” to commit.
          </div>
        </>
      ) : null}
    </div>
  );
}
