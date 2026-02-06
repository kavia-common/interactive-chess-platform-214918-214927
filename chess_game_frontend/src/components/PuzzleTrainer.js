import React, { useEffect, useMemo, useRef, useState } from "react";
import Board from "./Board";
import builtInPuzzles from "../puzzles/builtInPuzzles.json";
import { getGameStatus, getLegalMovesForSquare, isMoveLegal, makeMoveFromTo } from "../chess/engine";
import { otherColor } from "../chess/utils";
import { createAiWorker } from "../workers/createAiWorker";
import { createAnalysisClient } from "../workers/analysisClient";
import {
  applyExpectedPuzzleMove,
  buildPuzzleStateFromFen,
  checkPuzzleUserMove,
  computeRatedRunUpdate,
  pickPuzzleForRating,
  selectDailyPuzzleId,
  validatePuzzlePackJson,
} from "../puzzles/puzzleUtils";
import { loadPuzzleProgress, savePuzzleProgress } from "../puzzles/puzzleStorage";

/**
 * PUBLIC_INTERFACE
 * PuzzleTrainer provides a built-in tactics trainer with Daily/Random/Rated modes.
 *
 * It uses an isolated board position initialized from puzzle FEN and does NOT modify
 * the main game/analysis timeline, clocks, or AI game state.
 */
export default function PuzzleTrainer({ pieceSetId, onExit, onPuzzleResult }) {
  const [mode, setMode] = useState("daily"); // daily | random | rated
  const [allowRetry, setAllowRetry] = useState(true);

  // Built-in + imported packs
  const [importedPacks, setImportedPacks] = useState(() => loadPuzzleProgress().importedPacks);
  const allPuzzles = useMemo(() => {
    const imported = importedPacks.flatMap((p) => p?.puzzles || []);
    // Prefer built-in first for determinism / stable behavior.
    return [...builtInPuzzles, ...imported];
  }, [importedPacks]);

  // Progress / rating
  const [progress, setProgress] = useState(() => loadPuzzleProgress());

  // Puzzle navigation state
  const [activePuzzleId, setActivePuzzleId] = useState(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0); // for prev/next in random browsing
  const [puzzleIdsHistory, setPuzzleIdsHistory] = useState([]); // for random mode

  // Per-puzzle play state (isolated)
  const [position, setPosition] = useState(null);
  const [selected, setSelected] = useState(null);
  const [statusMsg, setStatusMsg] = useState("");
  const [feedback, setFeedback] = useState(null); // {type:'ok'|'bad'|'info', text}
  const [plyIndex, setPlyIndex] = useState(0);
  const [solvedState, setSolvedState] = useState("in-progress"); // in-progress | solved | failed

  // Hint state: highlight the destination square of next solution move.
  const [hintSquare, setHintSquare] = useState(null);

  // Optional worker-backed hint (top move destination).
  const aiWorkerRef = useRef(null);
  const analysisClientRef = useRef(null);
  const [hintThinking, setHintThinking] = useState(false);

  useEffect(() => {
    // Create a worker for optional hint analysis while in trainer.
    const w = createAiWorker();
    aiWorkerRef.current = w;
    analysisClientRef.current = createAnalysisClient(w);

    return () => {
      try {
        analysisClientRef.current?.dispose?.();
      } catch {
        // ignore
      }
      analysisClientRef.current = null;
      try {
        w.terminate();
      } catch {
        // ignore
      }
      aiWorkerRef.current = null;
    };
  }, []);

  // Persist progress + imported packs
  useEffect(() => {
    savePuzzleProgress({ ...progress, importedPacks });
  }, [progress, importedPacks]);

  const activePuzzle = useMemo(() => {
    if (!activePuzzleId) return null;
    return allPuzzles.find((p) => p.id === activePuzzleId) || null;
  }, [allPuzzles, activePuzzleId]);

  const boardStatus = useMemo(() => {
    if (!position) return { state: "playing", inCheckSquare: null };
    return getGameStatus(position);
  }, [position]);

  const lastMove = position?.lastMove || null;

  const legalTargetsForSelected = useMemo(() => {
    if (!position || !selected) return [];
    return getLegalMovesForSquare(position, selected).map((m) => m.to);
  }, [position, selected]);

  const remainingMoves = useMemo(() => {
    if (!activePuzzle?.moves) return 0;
    return Math.max(0, activePuzzle.moves.length - plyIndex);
  }, [activePuzzle, plyIndex]);

  const loadPuzzleById = (id, { setDailySeen = false } = {}) => {
    const pz = allPuzzles.find((p) => p.id === id);
    if (!pz) return;

    const parsed = buildPuzzleStateFromFen(pz.fen);
    if (!parsed.ok) {
      setFeedback({ type: "bad", text: `Bad puzzle FEN: ${parsed.error.message}` });
      setPosition(null);
      return;
    }

    setActivePuzzleId(pz.id);
    setPosition(parsed.position);
    setSelected(null);
    setPlyIndex(0);
    setSolvedState("in-progress");
    setFeedback(null);
    setHintSquare(null);
    setStatusMsg("");

    if (setDailySeen) {
      const d = new Date();
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      setProgress((pr) => ({
        ...pr,
        lastDailyDate: dateKey,
        lastDailyPuzzleId: pz.id,
      }));
    }
  };

  const startDaily = () => {
    const id = selectDailyPuzzleId(allPuzzles, new Date());
    if (!id) return;
    loadPuzzleById(id, { setDailySeen: true });
    setStatusMsg("Daily puzzle loaded.");
  };

  const startRandom = () => {
    if (!allPuzzles.length) return;
    const idx = Math.floor(Math.random() * allPuzzles.length);
    const pz = allPuzzles[idx];
    setPuzzleIdsHistory((h) => {
      const next = h.slice(0, puzzleIndex + 1).concat(pz.id);
      return next;
    });
    setPuzzleIndex((i) => i + 1);
    loadPuzzleById(pz.id);
    setStatusMsg("Random puzzle loaded.");
  };

  const startRated = () => {
    const pz = pickPuzzleForRating(allPuzzles, progress.rating);
    if (!pz) return;
    loadPuzzleById(pz.id);
    setStatusMsg("Rated run started.");
  };

  // Initial load
  useEffect(() => {
    if (!allPuzzles.length) return;
    startDaily();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allPuzzles.length]);

  const finishPuzzle = (solved) => {
    const puzzleRating = activePuzzle?.rating ?? 1200;

    if (mode === "rated") {
      const upd = computeRatedRunUpdate({ currentRating: progress.rating, puzzleRating, solved });
      setProgress((pr) => ({
        ...pr,
        rating: upd.newRating,
      }));
      setStatusMsg(
        solved
          ? `Puzzle solved. Rating ${progress.rating} → ${upd.newRating} (${upd.delta >= 0 ? "+" : ""}${upd.delta}).`
          : `Puzzle failed. Rating ${progress.rating} → ${upd.newRating} (${upd.delta >= 0 ? "+" : ""}${upd.delta}).`
      );
    } else {
      setStatusMsg(solved ? "Puzzle solved." : "Puzzle failed.");
    }

    setProgress((pr) => {
      const attempts = pr.attempts + 1;
      const correct = pr.correct + (solved ? 1 : 0);
      const solvedCount = pr.solvedCount + (solved ? 1 : 0);
      const failedCount = pr.failedCount + (solved ? 0 : 1);
      const streak = solved ? pr.streak + 1 : 0;
      return { ...pr, attempts, correct, solvedCount, failedCount, streak };
    });

    setSolvedState(solved ? "solved" : "failed");

    // Notify parent for SFX/haptics.
    onPuzzleResult?.(Boolean(solved));
  };

  const onTryMove = (move) => {
    if (!position || !activePuzzle) return;
    if (solvedState !== "in-progress") return;

    const res = checkPuzzleUserMove({
      position,
      userMove: move,
      solutionMoves: activePuzzle.moves,
      plyIndex,
    });

    if (!res.ok) {
      setFeedback({ type: "bad", text: "Could not validate move." });
      return;
    }

    if (!res.correct) {
      setFeedback({
        type: "bad",
        text: `Incorrect. Expected: ${res.expectedTokens.join(" or ")}.`,
      });

      if (!allowRetry) {
        finishPuzzle(false);
      }
      return;
    }

    // Correct move: apply user's move (single source of truth).
    setPosition((pos) => {
      // apply by rebuilding from from/to (ensures legality already checked)
      // but we have move object already.
      // The engine's applyMove is used implicitly by Board handlers (we do it here via expected apply below).
      return pos; // will be updated below via setPosition applyExpectedPuzzleMove for consistency
    });

    const expectedToken =
      Array.isArray(activePuzzle.moves[plyIndex]) ? activePuzzle.moves[plyIndex][0] : activePuzzle.moves[plyIndex];

    const applied = applyExpectedPuzzleMove(position, expectedToken);
    if (!applied.ok) {
      // fallback: accept user move token as correct and just end.
      setFeedback({ type: "ok", text: "Correct." });
      setPlyIndex((i) => i + 1);
      return;
    }

    setPosition(applied.position);
    setPlyIndex((i) => i + 1);
    setSelected(null);
    setHintSquare(null);
    setFeedback({ type: "ok", text: "Correct." });

    const nextPly = plyIndex + 1;
    if (nextPly >= activePuzzle.moves.length) {
      finishPuzzle(true);
    }
  };

  const onSquareClick = (sq) => {
    if (!position) return;
    if (solvedState !== "in-progress") return;

    if (!selected) {
      const p = position.board[sq];
      if (!p) return;
      if (p.color !== position.toMove) return;
      setSelected(sq);
      return;
    }

    if (selected === sq) {
      setSelected(null);
      return;
    }

    const moved = makeMoveFromTo(position, selected, sq);
    if (moved) {
      onTryMove(moved);
      return;
    }

    // Switch selection to another own piece.
    const p2 = position.board[sq];
    if (p2 && p2.color === position.toMove) {
      setSelected(sq);
      return;
    }

    setSelected(null);
  };

  const onPieceDrop = (from, to) => {
    if (!position) return;
    if (solvedState !== "in-progress") return;

    const move = makeMoveFromTo(position, from, to);
    if (!move) return;
    onTryMove(move);
  };

  const restartPuzzle = () => {
    if (!activePuzzleId) return;
    loadPuzzleById(activePuzzleId);
    setStatusMsg("Puzzle restarted.");
  };

  const revealNextMove = () => {
    if (!position || !activePuzzle) return;
    if (solvedState !== "in-progress") return;

    const expected = activePuzzle.moves[plyIndex];
    const token = Array.isArray(expected) ? expected[0] : expected;
    const applied = applyExpectedPuzzleMove(position, token);
    if (!applied.ok) {
      setFeedback({ type: "bad", text: applied.error.message });
      return;
    }

    setPosition(applied.position);
    setPlyIndex((i) => i + 1);
    setSelected(null);
    setHintSquare(null);
    setFeedback({ type: "info", text: `Revealed: ${token}` });

    const nextPly = plyIndex + 1;
    if (nextPly >= activePuzzle.moves.length) {
      finishPuzzle(true);
    }
  };

  const hintFromSolution = () => {
    if (!activePuzzle) return;
    const expected = activePuzzle.moves[plyIndex];
    const token = Array.isArray(expected) ? expected[0] : expected;
    const m = String(token).match(/^([a-h][1-8])x?([a-h][1-8])(=([QRBN]))?$/i);
    if (m) setHintSquare(m[2].toLowerCase());
    else setHintSquare(null);
    setFeedback({ type: "info", text: "Hint: highlighted the destination square." });
  };

  const hintFromEngine = async () => {
    // Lightweight analysis: request a quick search and highlight bestMove destination.
    if (!analysisClientRef.current || !position) return;
    setHintThinking(true);
    setFeedback(null);

    try {
      const res = await analysisClientRef.current.analyze(position, {
        limits: { maxDepth: 4, timeMs: 250, hardTimeMs: 350 },
        multiPv: 1,
      });

      if (res?.type === "ANALYSIS_RESULT") {
        // Worker returns eval + lines; lines include PV moves, but we also can infer best from first PV move.
        const first = res.lines?.[0]?.pv?.[0];
        if (first?.to) {
          setHintSquare(first.to);
          setFeedback({ type: "info", text: `Engine hint: consider ${first.to}.` });
        } else {
          hintFromSolution();
        }
      } else {
        hintFromSolution();
      }
    } catch {
      hintFromSolution();
    } finally {
      setHintThinking(false);
    }
  };

  const onHint = () => {
    // Prefer engine hint if available, but fall back to deterministic solution hint.
    hintFromEngine();
  };

  const canPrev = mode === "random" && puzzleIndex > 1 && puzzleIdsHistory.length >= puzzleIndex - 1;
  const canNext = mode === "random" && puzzleIdsHistory.length >= puzzleIndex;

  const prevPuzzle = () => {
    if (!canPrev) return;
    const id = puzzleIdsHistory[puzzleIndex - 2];
    setPuzzleIndex((i) => i - 1);
    loadPuzzleById(id);
    setStatusMsg("Previous puzzle.");
  };

  const nextPuzzle = () => {
    if (mode === "random") {
      // If we have history ahead, move forward; else load new random.
      const id = puzzleIdsHistory[puzzleIndex];
      if (id) {
        setPuzzleIndex((i) => i + 1);
        loadPuzzleById(id);
        setStatusMsg("Next puzzle (history).");
      } else {
        startRandom();
      }
      return;
    }

    if (mode === "daily") startDaily();
    if (mode === "rated") startRated();
  };

  const onChangeMode = (m) => {
    setMode(m);
    setFeedback(null);
    setStatusMsg("");
    setHintSquare(null);
    setSelected(null);
    setSolvedState("in-progress");

    if (m === "daily") startDaily();
    if (m === "random") startRandom();
    if (m === "rated") startRated();
  };

  const onImportPack = async (file) => {
    if (!file) return;
    setFeedback(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const v = validatePuzzlePackJson(parsed);
      if (!v.ok) {
        setFeedback({ type: "bad", text: `Import failed:\n- ${v.errors.slice(0, 6).join("\n- ")}${v.errors.length > 6 ? "\n- …" : ""}` });
        return;
      }

      const packId = `pack_${Date.now()}`;
      const name = file.name || "Imported pack";
      setImportedPacks((packs) => [...packs, { id: packId, name, puzzles: v.puzzles }]);
      setFeedback({ type: "ok", text: `Imported ${v.puzzles.length} puzzles from ${name}.` });
    } catch (e) {
      setFeedback({ type: "bad", text: `Import failed: ${String(e?.message || e)}` });
    }
  };

  const progressAccuracy = progress.attempts ? Math.round((progress.correct / progress.attempts) * 100) : 0;

  // Highlighting: use "legalTargets" to show hint square as a special legal marker by injecting it.
  const legalTargetsWithHint = useMemo(() => {
    const set = new Set(legalTargetsForSelected);
    if (hintSquare) set.add(hintSquare);
    return [...set];
  }, [legalTargetsForSelected, hintSquare]);

  return (
    <div className="puzzleTrainerWrap">
      <div className="puzzleTrainerHeader">
        <h2 className="cardTitle" style={{ margin: 0 }}>Puzzles / Tactics Trainer</h2>
        <div className="buttonRow" style={{ marginTop: 0 }}>
          <button className="button buttonGhost" onClick={onExit} aria-label="Exit puzzles to game">
            Exit to Game
          </button>
        </div>
      </div>

      <div className="puzzleTrainerGrid">
        <div className="card">
          <div className="buttonRow" style={{ marginTop: 0 }}>
            <button
              className={`button ${mode === "daily" ? "buttonPrimary" : "buttonGhost"}`}
              onClick={() => onChangeMode("daily")}
              aria-label="Daily puzzle mode"
            >
              Daily
            </button>
            <button
              className={`button ${mode === "random" ? "buttonPrimary" : "buttonGhost"}`}
              onClick={() => onChangeMode("random")}
              aria-label="Random puzzle mode"
            >
              Random
            </button>
            <button
              className={`button ${mode === "rated" ? "buttonPrimary" : "buttonGhost"}`}
              onClick={() => onChangeMode("rated")}
              aria-label="Rated run mode"
            >
              Rated Run
            </button>

            <span className="pill">
              Retry: <span className="kbd">{allowRetry ? "ON" : "OFF"}</span>
            </span>
            <button
              className="button buttonGhost"
              onClick={() => setAllowRetry((v) => !v)}
              aria-label="Toggle retry on incorrect move"
            >
              Toggle Retry
            </button>
          </div>

          <div style={{ height: 12 }} />

          <div className="boardWrap" style={{ justifyContent: "center" }}>
            <Board
              position={position || { board: {}, toMove: "w", castling: { w: { K: false, Q: false }, b: { K: false, Q: false } }, enPassant: null, halfmoveClock: 0, fullmoveNumber: 1, lastMove: null }}
              orientation={"w"}
              pieceSetId={pieceSetId}
              selected={selected}
              legalTargets={legalTargetsWithHint}
              lastMove={lastMove}
              inCheckSquare={boardStatus.inCheckSquare}
              onSquareClick={onSquareClick}
              onPieceDrop={onPieceDrop}
              isMoveLegal={(from, to) => (position ? isMoveLegal(position, from, to) : false)}
            />
          </div>

          <div style={{ height: 12 }} />

          <div className="statusBar" role="status" aria-live="polite">
            <div className="statusText">
              {activePuzzle ? `Puzzle ${activePuzzle.id}` : "No puzzle loaded"}
              {activePuzzle ? (
                <>
                  {" "}• Rating <span className="kbd">{activePuzzle.rating}</span>{" "}
                  • To move <span className="kbd">{position?.toMove === "w" ? "WHITE" : "BLACK"}</span>
                </>
              ) : null}
            </div>
            <div className="statusHint">
              {statusMsg || (solvedState === "solved" ? "Puzzle Solved." : solvedState === "failed" ? "Puzzle Failed." : "Make the best moves.")}
            </div>
          </div>

          <div className="puzzleMeta">
            <div className="pill">
              Themes:{" "}
              <span className="kbd">
                {activePuzzle?.themes?.length ? activePuzzle.themes.join(", ") : "—"}
              </span>
            </div>
            <div className="pill">
              Remaining: <span className="kbd">{remainingMoves}</span>
            </div>
            {activePuzzle?.description ? (
              <div className="statusHint" style={{ marginTop: 8 }}>
                {activePuzzle.description}
              </div>
            ) : null}
          </div>

          {feedback ? (
            <div className={`puzzleFeedback puzzleFeedback_${feedback.type}`}>
              <div className="puzzleFeedbackTitle">
                {feedback.type === "ok" ? "OK" : feedback.type === "bad" ? "ERROR" : "INFO"}
              </div>
              <pre className="puzzleFeedbackText">{feedback.text}</pre>
            </div>
          ) : null}
        </div>

        <div className="panelGrid">
          <div className="card">
            <h3 className="cardTitle">Trainer Controls</h3>

            <div className="buttonRow" style={{ marginTop: 0 }}>
              <button className="button buttonPrimary" onClick={onHint} disabled={hintThinking || solvedState !== "in-progress"} aria-label="Hint">
                {hintThinking ? "Hint…" : "Hint"}
              </button>
              <button className="button buttonGhost" onClick={revealNextMove} disabled={solvedState !== "in-progress"} aria-label="Reveal next move">
                Reveal Next
              </button>
              <button className="button buttonGhost" onClick={restartPuzzle} aria-label="Restart puzzle">
                Restart
              </button>
            </div>

            <div className="buttonRow">
              <button className="button buttonGhost" onClick={prevPuzzle} disabled={!canPrev} aria-label="Previous puzzle">
                Prev
              </button>
              <button className="button buttonGhost" onClick={nextPuzzle} aria-label="Next puzzle">
                Next
              </button>
            </div>

            <div className="statusHint" style={{ marginTop: 10 }}>
              Hint highlights the destination square (or uses a quick engine search when available).
            </div>
          </div>

          <div className="card">
            <h3 className="cardTitle">Progress</h3>

            <div className="puzzleProgressGrid">
              <div className="pill">
                Rating: <span className="kbd">{progress.rating}</span>
              </div>
              <div className="pill">
                Streak: <span className="kbd">{progress.streak}</span>
              </div>
              <div className="pill">
                Solved: <span className="kbd">{progress.solvedCount}</span>
              </div>
              <div className="pill">
                Accuracy: <span className="kbd">{progressAccuracy}%</span>
              </div>
            </div>

            <div style={{ height: 10 }} />
            <div className="statusHint">
              Daily: deterministic by date. Rated run updates Elo-like rating (K=20 win / 40 loss).
            </div>
          </div>

          <div className="card">
            <h3 className="cardTitle">Puzzle Packs</h3>

            <div className="buttonRow" style={{ marginTop: 0 }}>
              <label className="button buttonGhost" style={{ display: "inline-flex", alignItems: "center" }}>
                Import JSON…
                <input
                  type="file"
                  accept="application/json,.json"
                  style={{ display: "none" }}
                  onChange={(e) => onImportPack(e.target.files?.[0] || null)}
                  aria-label="Import puzzle pack JSON"
                />
              </label>
            </div>

            <div style={{ height: 10 }} />
            <div className="statusHint">
              Packs are stored locally. Format: array of puzzles with fields: id, fen, moves, rating, themes, optional description.
            </div>

            <div style={{ height: 10 }} />
            <div className="statusHint">
              Loaded puzzles: <span className="kbd">{allPuzzles.length}</span> (built-in {builtInPuzzles.length}, imported {allPuzzles.length - builtInPuzzles.length})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
