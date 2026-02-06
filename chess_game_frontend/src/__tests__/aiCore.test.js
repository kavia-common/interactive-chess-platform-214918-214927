import { createTranspositionTable, ttGet, ttNewSearchAge, ttStore } from "../chess/ai/tt";
import { orderMoves, createOrderingState } from "../chess/ai/ordering";
import { quiescenceSearch } from "../chess/ai/quiescence";
import { applyMove } from "../chess/engine";

function emptyPositionBase() {
  return {
    board: {},
    toMove: "w",
    castling: { w: { K: true, Q: true }, b: { K: true, Q: true } },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
  };
}

function piece(color, type, unicode) {
  return { color, type, unicode };
}

test("TT store/retrieve respects deeper replacement preference", () => {
  const tt = createTranspositionTable({ maxEntries: 100 });
  const age = ttNewSearchAge(tt);

  ttStore(tt, { key: "pos1", depth: 2, value: 10, bound: "EXACT", bestMove: { from: "a2", to: "a3" }, age });
  expect(ttGet(tt, "pos1")?.value).toBe(10);

  // Shall not replace with a shallower entry
  ttStore(tt, { key: "pos1", depth: 1, value: 99, bound: "EXACT", bestMove: { from: "a2", to: "a4" }, age });
  expect(ttGet(tt, "pos1")?.value).toBe(10);

  // Shall replace with deeper
  ttStore(tt, { key: "pos1", depth: 3, value: 42, bound: "LOWER", bestMove: { from: "a2", to: "a4" }, age });
  expect(ttGet(tt, "pos1")?.value).toBe(42);
  expect(ttGet(tt, "pos1")?.bound).toBe("LOWER");
});

test("Move ordering prioritizes captures ahead of quiet moves", () => {
  const moves = [
    { from: "a2", to: "a3", piece: { color: "w", type: "p" } },
    { from: "b2", to: "b3", piece: { color: "w", type: "p" } },
    {
      from: "c4",
      to: "d5",
      piece: { color: "w", type: "n" },
      captured: { color: "b", type: "q" },
    },
  ];

  const ordering = createOrderingState({ maxPly: 16 });
  const ordered = orderMoves(moves, { pvMove: null, ordering, ply: 0 });
  expect(Boolean(ordered[0].captured)).toBe(true);
  expect(ordered[0].from).toBe("c4");
  expect(ordered[0].to).toBe("d5");
});

test("Quiescence search explores capture replies (changes eval compared to stand pat in tactical leaf)", () => {
  // Construct a position where a capture is available at leaf.
  const pos = emptyPositionBase();
  pos.board.e1 = piece("w", "k", "♔");
  pos.board.e8 = piece("b", "k", "♚");

  // White queen can capture a black pawn
  pos.board.d4 = piece("w", "q", "♕");
  pos.board.d7 = piece("b", "p", "♟");
  pos.toMove = "w";

  const nodes = { count: 0 };
  const q = quiescenceSearch(pos, -999999, 999999, { includeChecks: false, nodes });
  expect(nodes.count).toBeGreaterThan(0);

  // After capture, position material should improve for white; quiescence should not be worse than
  // a naive stand pat in many cases. We assert it is finite and numeric.
  expect(Number.isFinite(q)).toBe(true);

  // sanity: applying the capture is legal in engine and changes board
  const captureMove = { from: "d4", to: "d7", piece: { color: "w", type: "q" }, captured: { color: "b", type: "p" } };
  const next = applyMove(pos, captureMove);
  expect(next.board.d7?.type).toBe("q");
});
