import React, { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import {
  applyMove,
  createInitialPosition,
  getGameStatus,
  getLegalMovesForSquare,
  isMoveLegal,
  makeMoveFromTo,
  toAlgebraic,
  hasOnlyKing,
} from "./chess/engine";
import { chooseAiMove } from "./chess/ai";
import {
  PIECE_TO_UNICODE,
  capturedFromMove,
  otherColor,
  toSquare,
} from "./chess/utils";
import Board from "./components/Board";
import MoveHistory from "./components/MoveHistory";
import CapturedPanel from "./components/CapturedPanel";
import Controls, { TIME_PRESETS } from "./components/Controls";
import Clocks from "./components/Clocks";
import {
  createClockState,
  getFlaggedColor,
  pauseClock,
  resumeClock,
  setActiveColor,
  startClock,
  switchActiveAfterMove,
  tickClock,
} from "./chess/clock";

/**
 * PUBLIC_INTERFACE
 * App renders the full retro-themed chess SPA: interactive board, controls,
 * move history navigation, captured pieces, and single-player AI.
 *
 * This version includes chess clocks with selectable time controls, pause/resume,
 * flag detection, and integration for both local and AI modes.
 */
function App() {
  const [mode, setMode] = useState("ai"); // "local" | "ai"
  const [playAs, setPlayAs] = useState("w"); // used when mode === "ai"
  const [aiDepth, setAiDepth] = useState(2);

  // Timeline: positions[0] is initial, positions[cursor] is current view.
  const [positions, setPositions] = useState([createInitialPosition()]);
  const [cursor, setCursor] = useState(0);

  // UI selection for click-to-move
  const [selected, setSelected] = useState(null);

  const position = positions[cursor];

  const status = useMemo(() => getGameStatus(position), [position]);

  const lastMove = position.lastMove;
  const legalTargetsForSelected = useMemo(() => {
    if (!selected) return [];
    return getLegalMovesForSquare(position, selected).map((m) => m.to);
  }, [position, selected]);

  const captured = useMemo(() => {
    // Compute from current position move list (up to cursor)
    const cap = { w: [], b: [] };
    for (let i = 1; i <= cursor; i += 1) {
      const mv = positions[i].lastMove;
      if (!mv) continue;
      const c = capturedFromMove(mv);
      if (c) cap[c.color].push(c.piece);
    }
    return cap;
  }, [positions, cursor]);

  const isHumanTurn = useMemo(() => {
    if (mode === "local") return true;
    return position.toMove === playAs;
  }, [mode, position.toMove, playAs]);

  // -----------------------
  // Time controls + clocks
  // -----------------------
  const [timePresetId, setTimePresetId] = useState("blitz-5-0");
  const [customMinutes, setCustomMinutes] = useState(5);
  const [customIncrement, setCustomIncrement] = useState(0);

  // "Armed" means user pressed Start. Actual ticking starts on first move.
  const [clockArmed, setClockArmed] = useState(false);

  // Manual pause (user). Visibility auto-pause is tracked separately.
  const [clockManualPaused, setClockManualPaused] = useState(false);
  const [clockVisibilityPaused, setClockVisibilityPaused] = useState(false);

  // Authoritative clock state lives here.
  const [clock, setClock] = useState(() =>
    createClockState({ baseMinutes: 5, incrementSeconds: 0 })
  );

  const timeControlsLocked = useMemo(() => {
    // Lock when the game has begun (first move made) OR clocks are armed.
    return cursor > 0 || clockArmed;
  }, [cursor, clockArmed]);

  const gameEnded = useMemo(() => status.state !== "playing" && status.state !== "check", [status.state]);

  const isClockPaused = clockManualPaused || clockVisibilityPaused;

  const clockRunning = useMemo(() => {
    // We allow running only if armed and game not ended and at tip (no time-travel).
    if (!clockArmed) return false;
    if (cursor !== positions.length - 1) return false;
    if (gameEnded) return false;
    return true;
  }, [clockArmed, cursor, positions.length, gameEnded]);

  const [timeoutResult, setTimeoutResult] = useState(null);
  // { state: "timeout"|"timeout-draw", loser?: "w"|"b", winner?: "w"|"b", reason: string }

  // Keep refs for use inside timers/effects without stale closures.
  const clockRef = useRef(clock);
  const positionRef = useRef(position);
  const clockRunningRef = useRef(clockRunning);
  const pausedRef = useRef(isClockPaused);

  useEffect(() => {
    clockRef.current = clock;
  }, [clock]);
  useEffect(() => {
    positionRef.current = position;
  }, [position]);
  useEffect(() => {
    clockRunningRef.current = clockRunning;
  }, [clockRunning]);
  useEffect(() => {
    pausedRef.current = isClockPaused;
  }, [isClockPaused]);

  const selectedPreset = useMemo(
    () => TIME_PRESETS.find((p) => p.id === timePresetId) || TIME_PRESETS[0],
    [timePresetId]
  );

  const effectiveMinutes = selectedPreset.id === "custom" ? Number(customMinutes) : selectedPreset.minutes;
  const effectiveIncrement = selectedPreset.id === "custom" ? Number(customIncrement) : selectedPreset.increment;

  // When settings change (and not locked), update the base clock state.
  useEffect(() => {
    if (timeControlsLocked) return;
    setClock(createClockState({ baseMinutes: effectiveMinutes, incrementSeconds: effectiveIncrement }));
    setTimeoutResult(null);
  }, [timeControlsLocked, effectiveMinutes, effectiveIncrement]);

  // Tick loop: authoritative tick based on precise Date.now deltas.
  useEffect(() => {
    if (!clockRunning) return undefined;

    const t = window.setInterval(() => {
      if (!clockRunningRef.current) return;
      if (pausedRef.current) return;

      const now = Date.now();
      setClock((c) => tickClock(c, now));
    }, 250);

    return () => window.clearInterval(t);
  }, [clockRunning]);

  // Flag detection effect (when clock changes).
  useEffect(() => {
    if (!clockRunning) return;
    const flagged = getFlaggedColor(clock);
    if (!flagged) return;

    // Stop clocks and set a game result.
    const opponent = otherColor(flagged);

    // Simple rule requested:
    // If opponent has only king, treat as draw on flag; otherwise flagged side loses.
    const oppHasOnlyKing = hasOnlyKing(positionRef.current, opponent);

    setTimeoutResult(
      oppHasOnlyKing
        ? {
            state: "timeout-draw",
            reason: "Flag fall, but opponent has only king (insufficient mating material).",
          }
        : {
            state: "timeout",
            loser: flagged,
            winner: opponent,
            reason: `${flagged === "w" ? "White" : "Black"} ran out of time.`,
          }
    );

    // Pause clock immediately (authoritative), clear active side to avoid further ticks.
    setClock((c) => pauseClock({ ...c, activeColor: null, isRunning: false }));
  }, [clock, clockRunning]);

  // Pause clocks when tab is hidden; resume when visible (if not manually paused and game is active).
  useEffect(() => {
    const onVis = () => {
      const hidden = document.visibilityState !== "visible";
      setClockVisibilityPaused(hidden);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Mirror pause state into clock object (so lastTickAt is managed correctly).
  useEffect(() => {
    if (!clockRunning) return;
    if (isClockPaused) {
      setClock((c) => pauseClock(c));
    } else {
      setClock((c) => resumeClock(c, { now: Date.now() }));
    }
  }, [isClockPaused, clockRunning]);

  // If the game ends by normal rules, stop clocks.
  useEffect(() => {
    if (!clockRunning) return;
    if (!gameEnded) return;
    setClock((c) => pauseClock({ ...c, isRunning: false, activeColor: null }));
  }, [gameEnded, clockRunning]);

  // Keyboard shortcuts: undo/redo with Ctrl/Cmd+Z / Ctrl/Cmd+Y
  useEffect(() => {
    const onKeyDown = (e) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (!isMeta) return;

      if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        e.key.toLowerCase() === "y" ||
        (e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cursor, positions]);

  // AI turn loop: whenever it's AI's move and game not ended and we're at tip.
  useEffect(() => {
    const shouldAiMove =
      mode === "ai" &&
      cursor === positions.length - 1 &&
      position.toMove !== playAs &&
      status.state === "playing" &&
      !timeoutResult;

    if (!shouldAiMove) return;

    // Ensure the active side is set to AI while it is thinking (if clocks are armed).
    if (clockArmed && clockRunning && !isClockPaused) {
      setClock((c) => {
        const started = c.isRunning ? c : startClock(c, { activeColor: null, now: Date.now() });
        return setActiveColor(started, position.toMove, { now: Date.now() });
      });
    }

    const t = window.setTimeout(() => {
      const aiMove = chooseAiMove(position, {
        depth: aiDepth,
        fallbackGreedy: true,
      });
      if (!aiMove) return;

      // Apply move; this will also switch clock + increment via pushMove.
      pushMove(aiMove);
    }, 220);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    cursor,
    positions.length,
    position,
    playAs,
    aiDepth,
    status.state,
    timeoutResult,
    clockArmed,
    clockRunning,
    isClockPaused,
  ]);

  const pushPosition = (nextPosition) => {
    // If user is time-traveling, truncate future first.
    const newPositions = positions.slice(0, cursor + 1).concat(nextPosition);
    setPositions(newPositions);
    setCursor(newPositions.length - 1);
  };

  const ensureClockStartedOnFirstMove = (moverColor) => {
    if (!clockArmed) return;

    setClock((c) => {
      // If clock isn't running yet, start it and set active to mover side.
      if (!c.isRunning) {
        const started = startClock(c, { activeColor: moverColor, now: Date.now() });
        return started;
      }
      // If it is running but no active color, set it.
      if (!c.activeColor) {
        return setActiveColor(c, moverColor, { now: Date.now() });
      }
      return c;
    });
  };

  const onMoveCompletedClockUpdate = (moverColor) => {
    if (!clockArmed) return;

    // Tick right now to "freeze" elapsed time before applying increment/switch.
    const now = Date.now();
    setClock((c0) => {
      const c1 = tickClock(c0, now);

      // If clock not started yet (first move), start now and don't burn time before move.
      // We treat the first move as the moment clocks begin; so we set lastTickAt=now.
      const c2 = c1.isRunning ? c1 : startClock(c1, { activeColor: moverColor, now });
      const c3 = { ...c2, lastTickAt: now };

      // Apply increment to mover, then switch active to opponent.
      const switched = switchActiveAfterMove(c3, moverColor, { now });
      return switched;
    });
  };

  const pushMove = (move) => {
    // Settings lock begins at first move; if clocks were armed, start on first move.
    ensureClockStartedOnFirstMove(position.toMove);

    const moverColor = position.toMove;
    const next = applyMove(position, move);
    pushPosition(next);
    setSelected(null);

    // After move is committed, apply increment + switch clocks.
    onMoveCompletedClockUpdate(moverColor);
  };

  // PUBLIC_INTERFACE
  const newGame = () => {
    setPositions([createInitialPosition()]);
    setCursor(0);
    setSelected(null);

    setTimeoutResult(null);

    // Reset clock to selected settings and disarm/pause.
    setClock(createClockState({ baseMinutes: effectiveMinutes, incrementSeconds: effectiveIncrement }));
    setClockArmed(false);
    setClockManualPaused(false);
    setClockVisibilityPaused(false);
  };

  // PUBLIC_INTERFACE
  const undo = () => {
    if (cursor === 0) return;
    setCursor((c) => Math.max(0, c - 1));
    setSelected(null);
  };

  // PUBLIC_INTERFACE
  const redo = () => {
    if (cursor >= positions.length - 1) return;
    setCursor((c) => Math.min(positions.length - 1, c + 1));
    setSelected(null);
  };

  const onHistoryJump = (targetCursor) => {
    setCursor(targetCursor);
    setSelected(null);
  };

  const onSquareClick = (sq) => {
    if (timeoutResult) return;
    if (status.state !== "playing") return;
    if (!isHumanTurn) return;
    if (cursor !== positions.length - 1) return; // disallow move while time-traveling

    if (!selected) {
      const p = position.board[sq];
      if (!p) return;
      if (p.color !== position.toMove) return;
      setSelected(sq);
      return;
    }

    // Clicking same square cancels selection.
    if (selected === sq) {
      setSelected(null);
      return;
    }

    // Attempt make move selected -> sq; if illegal, maybe reselect piece.
    const moved = makeMoveFromTo(position, selected, sq);
    if (moved) {
      pushMove(moved);
      return;
    }

    // If clicked another own piece, switch selection
    const p2 = position.board[sq];
    if (p2 && p2.color === position.toMove) {
      setSelected(sq);
      return;
    }

    setSelected(null);
  };

  const onPieceDrop = (from, to) => {
    if (timeoutResult) return;
    if (status.state !== "playing") return;
    if (!isHumanTurn) return;
    if (cursor !== positions.length - 1) return;

    const move = makeMoveFromTo(position, from, to);
    if (!move) return;
    pushMove(move);
  };

  const moveStrings = useMemo(() => {
    // Build SAN-like-ish list (compact): use coordinate notation for clarity.
    const list = [];
    for (let i = 1; i < positions.length; i += 1) {
      const mv = positions[i].lastMove;
      if (!mv) continue;
      list.push({
        ply: i,
        text: toAlgebraic(mv),
      });
    }
    return list;
  }, [positions]);

  const statusLine = useMemo(() => {
    if (timeoutResult?.state === "timeout") {
      const winner = timeoutResult.winner === "w" ? "White" : "Black";
      return `Timeout — ${winner} wins.`;
    }
    if (timeoutResult?.state === "timeout-draw") {
      return "Timeout — draw (insufficient mating material).";
    }

    const base = `Turn: ${position.toMove === "w" ? "White" : "Black"}`;
    if (status.state === "checkmate") {
      const winner = status.winner === "w" ? "White" : "Black";
      return `Checkmate — ${winner} wins.`;
    }
    if (status.state === "stalemate") return "Stalemate — draw.";
    if (status.state === "draw") return "Draw.";
    if (status.state === "check") return `${base} — Check!`;
    return base;
  }, [position.toMove, status, timeoutResult]);

  const clocksLabels = useMemo(() => {
    if (mode === "ai") {
      return playAs === "w"
        ? { w: "You (White)", b: "AI (Black)" }
        : { w: "AI (White)", b: "You (Black)" };
    }
    return { w: "White", b: "Black" };
  }, [mode, playAs]);

  const canMoveNow = cursor === positions.length - 1 && status.state === "playing" && !timeoutResult;

  return (
    <div className="App crt">
      <div className="container">
        <div className="header">
          <div className="brand">
            <h1 className="title">Retro Chess Terminal</h1>
            <p className="subtitle">
              Click or drag to move. Full rules: castling, en passant, promotion,
              check/checkmate/stalemate.{" "}
              <span className="pill">
                Undo/Redo: <span className="kbd">Ctrl</span>+<span className="kbd">Z</span> /{" "}
                <span className="kbd">Ctrl</span>+<span className="kbd">Y</span>
              </span>
            </p>
          </div>
          <div className="badge" aria-label="App status badge">
            <span className="dot" />
            <span>{mode === "ai" ? "SINGLE PLAYER" : "LOCAL 2P"}</span>
          </div>
        </div>

        <div className="layout">
          <div className="card">
            <h2 className="cardTitle">Controls</h2>

            <Controls
              mode={mode}
              playAs={playAs}
              aiDepth={aiDepth}
              canUndo={cursor > 0}
              canRedo={cursor < positions.length - 1}
              canMove={canMoveNow}
              onModeChange={(v) => {
                setMode(v);
                setSelected(null);
              }}
              onPlayAsChange={(v) => {
                setPlayAs(v);
                setSelected(null);
              }}
              onAiDepthChange={(v) => setAiDepth(v)}
              onNewGame={newGame}
              onUndo={undo}
              onRedo={redo}
              timePresetId={timePresetId}
              customMinutes={customMinutes}
              customIncrement={customIncrement}
              timeControlsLocked={timeControlsLocked}
              clockStarted={clockArmed}
              isPaused={clockManualPaused}
              onTimePresetChange={(id) => setTimePresetId(id)}
              onCustomMinutesChange={(v) => setCustomMinutes(Number(v))}
              onCustomIncrementChange={(v) => setCustomIncrement(Number(v))}
              onStartClock={() => {
                if (!canMoveNow) return;
                setClockArmed(true);
                setClockManualPaused(false);
                // Do NOT start ticking yet; ticking starts on first move.
                setClock((c) => ({ ...c, isRunning: false, isPaused: false, activeColor: null, lastTickAt: null }));
              }}
              onTogglePause={() => {
                if (!clockArmed) return;
                setClockManualPaused((p) => !p);
              }}
            />

            <div className="statusBar" role="status" aria-live="polite">
              <div className="statusText">{statusLine}</div>
              <div className="statusHint">
                {timeoutResult
                  ? timeoutResult.reason
                  : cursor !== positions.length - 1
                    ? "Viewing history — return to latest to continue."
                    : mode === "ai"
                      ? `You are ${playAs === "w" ? "White" : "Black"}`
                      : "Pass & play"}
              </div>
            </div>

            <div style={{ height: 12 }} />

            <Clocks
              whiteMs={clock.remainingWMs}
              blackMs={clock.remainingBMs}
              activeColor={clock.isRunning && !clock.isPaused ? clock.activeColor : null}
              isRunning={clockRunning}
              isPaused={isClockPaused}
              labels={clocksLabels}
            />

            <div style={{ height: 12 }} />

            <div className="boardWrap">
              <Board
                position={position}
                orientation={mode === "ai" ? playAs : "w"}
                selected={selected}
                legalTargets={legalTargetsForSelected}
                lastMove={lastMove}
                inCheckSquare={status.inCheckSquare}
                onSquareClick={onSquareClick}
                onPieceDrop={onPieceDrop}
                isMoveLegal={(from, to) => isMoveLegal(position, from, to)}
              />
            </div>
          </div>

          <div className="panelGrid">
            <div className="card">
              <h2 className="cardTitle">Captured</h2>
              <div className="miniRow">
                <CapturedPanel
                  title="White captured"
                  pieces={captured.b}
                  pieceToUnicode={PIECE_TO_UNICODE}
                />
                <CapturedPanel
                  title="Black captured"
                  pieces={captured.w}
                  pieceToUnicode={PIECE_TO_UNICODE}
                />
              </div>
            </div>

            <div className="card">
              <h2 className="cardTitle">Move History</h2>
              <MoveHistory
                moves={moveStrings}
                cursor={cursor}
                onJump={onHistoryJump}
              />
              <div style={{ height: 10 }} />
              <div className="statusHint">
                Tip: click a move to time-travel. Resume by clicking the last move.
              </div>
              <div style={{ height: 8 }} />
              <div className="statusHint">
                Current:{" "}
                <span style={{ fontFamily: "var(--font-mono)" }}>
                  {toSquare(position, "e1") ? "" : ""}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div className="statusHint">
          Retro note: This UI intentionally uses monospace + scanlines for a CRT vibe.
        </div>
      </div>
    </div>
  );
}

export default App;
