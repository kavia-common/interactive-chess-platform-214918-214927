import {
  buildPuzzleStateFromFen,
  checkPuzzleUserMove,
  computeRatedRunUpdate,
  selectDailyPuzzleId,
  validatePuzzlePackJson,
} from "../puzzles/puzzleUtils";
import { makeMoveFromTo } from "../chess/engine";

describe("Puzzles / trainer utilities", () => {
  test("FEN -> position loading sets pieces and side to move", () => {
    const fen = "7k/6pp/8/8/7Q/8/6PP/6K1 w - - 0 1";
    const res = buildPuzzleStateFromFen(fen);
    expect(res.ok).toBe(true);
    expect(res.position.toMove).toBe("w");
    expect(res.position.board.h4?.type).toBe("q");
    expect(res.position.board.h8?.type).toBe("k");
    expect(res.position.board.g1?.type).toBe("k");
  });

  test("move-by-move correctness supports alternatives", () => {
    const fen = "7k/6pp/8/8/7Q/8/6PP/6K1 w - - 0 1";
    const res = buildPuzzleStateFromFen(fen);
    expect(res.ok).toBe(true);

    const pos = res.position;

    // The position allows Qd8# (h4d8). We'll allow two alternatives in the solution list.
    const solution = [["h4d8", "h4h8"]];

    const userMove = makeMoveFromTo(pos, "h4", "d8");
    expect(userMove).not.toBeNull();

    const check = checkPuzzleUserMove({
      position: pos,
      userMove,
      solutionMoves: solution,
      plyIndex: 0,
    });

    expect(check.ok).toBe(true);
    expect(check.correct).toBe(true);
    expect(check.expectedTokens).toEqual(["h4d8", "h4h8"]);
  });

  test("rating update logic returns bounded rating and sensible direction", () => {
    const win = computeRatedRunUpdate({ currentRating: 1200, puzzleRating: 1400, solved: true });
    expect(win.newRating).toBeGreaterThan(1200);

    const loss = computeRatedRunUpdate({ currentRating: 1200, puzzleRating: 900, solved: false });
    expect(loss.newRating).toBeLessThan(1200);

    const lowBound = computeRatedRunUpdate({ currentRating: 100, puzzleRating: 3000, solved: false });
    expect(lowBound.newRating).toBeGreaterThanOrEqual(100);
  });

  test("daily puzzle selection is deterministic by date", () => {
    const puzzles = [
      { id: "a", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: ["a2a3"], rating: 1000, themes: [] },
      { id: "b", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: ["a2a3"], rating: 1000, themes: [] },
      { id: "c", fen: "8/8/8/8/8/8/8/8 w - - 0 1", moves: ["a2a3"], rating: 1000, themes: [] },
    ];

    const d1 = new Date("2026-01-02T12:00:00Z");
    const d2 = new Date("2026-01-02T02:00:00Z");

    const id1 = selectDailyPuzzleId(puzzles, d1);
    const id2 = selectDailyPuzzleId(puzzles, d2);
    expect(id1).toBe(id2);
  });

  test("import validation catches schema issues and accepts valid packs", () => {
    const bad = validatePuzzlePackJson({ hello: "world" });
    expect(bad.ok).toBe(false);

    const goodPack = [
      {
        id: "x1",
        fen: "7k/6pp/8/8/7Q/8/6PP/6K1 w - - 0 1",
        moves: ["h4d8"],
        rating: 900,
        themes: ["mateIn1"],
      },
      {
        id: "x2",
        fen: "7k/6pp/8/8/7Q/8/6PP/6K1 w - - 0 1",
        moves: [["h4d8", "h4h8"]],
        rating: 900,
        themes: ["mateIn1"],
      },
    ];

    const ok = validatePuzzlePackJson(goodPack);
    expect(ok.ok).toBe(true);
    expect(ok.puzzles.length).toBe(2);
    expect(ok.puzzles[1].moves[0].length).toBe(2);
  });
});
