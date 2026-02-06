import React, { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  applyMove,
  createInitialPosition,
  getGameStatus,
  getLegalMovesForSquare,
  isMoveLegal,
  makeMoveFromTo,
  toAlgebraic,
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
import Controls from "./components/Controls";

/**
 * PUBLIC_INTERFACE
 * App renders the full retro-themed chess SPA: interactive board, controls,
 * move history navigation, captured pieces, and single-player AI.
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
      status.state === "playing";

    if (!shouldAiMove) return;

    const t = window.setTimeout(() => {
      const aiMove = chooseAiMove(position, {
        depth: aiDepth,
        fallbackGreedy: true,
      });
      if (!aiMove) return;
      pushMove(aiMove);
    }, 220);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cursor, positions.length, position, playAs, aiDepth, status.state]);

  const pushPosition = (nextPosition) => {
    // If user is time-traveling, truncate future first.
    const newPositions = positions.slice(0, cursor + 1).concat(nextPosition);
    setPositions(newPositions);
    setCursor(newPositions.length - 1);
  };

  const pushMove = (move) => {
    const next = applyMove(position, move);
    pushPosition(next);
    setSelected(null);
  };

  // PUBLIC_INTERFACE
  const newGame = () => {
    setPositions([createInitialPosition()]);
    setCursor(0);
    setSelected(null);
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
    const base = `Turn: ${position.toMove === "w" ? "White" : "Black"}`;
    if (status.state === "checkmate") {
      const winner = status.winner === "w" ? "White" : "Black";
      return `Checkmate — ${winner} wins.`;
    }
    if (status.state === "stalemate") return "Stalemate — draw.";
    if (status.state === "draw") return "Draw.";
    if (status.state === "check") return `${base} — Check!`;
    return base;
  }, [position.toMove, status]);

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
              canMove={cursor === positions.length - 1 && status.state === "playing"}
              onModeChange={(v) => {
                setMode(v);
                // keep board, but selection should reset to avoid surprises
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
            />

            <div className="statusBar" role="status" aria-live="polite">
              <div className="statusText">{statusLine}</div>
              <div className="statusHint">
                {cursor !== positions.length - 1
                  ? "Viewing history — return to latest to continue."
                  : mode === "ai"
                    ? `You are ${playAs === "w" ? "White" : "Black"}`
                    : "Pass & play"}
              </div>
            </div>

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
