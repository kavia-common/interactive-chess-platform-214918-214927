import { chooseAiMove } from "./chess/ai";
import {
  applyMove,
  createInitialPosition,
  getLegalMovesForSquare,
  makeMoveFromTo,
} from "./chess/engine";

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

test("knight legal moves from center (d4) include 8 L-jumps (when empty)", () => {
  const pos = emptyPositionBase();
  pos.board.d4 = piece("w", "n", "♘");
  const moves = getLegalMovesForSquare(pos, "d4").map((m) => m.to).sort();
  const expected = ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"].sort();
  expect(moves).toEqual(expected);
});

test("bishop moves are blocked by pieces (cannot jump)", () => {
  const pos = emptyPositionBase();
  pos.board.c1 = piece("w", "b", "♗");
  pos.board.d2 = piece("w", "p", "♙"); // blocks diagonal
  const moves = getLegalMovesForSquare(pos, "c1").map((m) => m.to);
  // With blocker on d2, bishop should not be able to go to e3/f4/g5/h6 on that diagonal.
  expect(moves).not.toContain("e3");
  expect(moves).not.toContain("f4");
  expect(moves).not.toContain("g5");
  expect(moves).not.toContain("h6");
});

test("castling is legal in initial position after clearing path squares", () => {
  const pos = createInitialPosition();
  // Clear squares between king and rook for white king-side: f1 g1
  delete pos.board.f1;
  delete pos.board.g1;

  const moves = getLegalMovesForSquare(pos, "e1");
  const castle = moves.find((m) => m.isCastling && m.to === "g1");
  expect(Boolean(castle)).toBe(true);

  const next = applyMove(pos, castle);
  expect(next.board.g1?.type).toBe("k");
  expect(next.board.f1?.type).toBe("r");
});

test("en passant capture is available immediately after a double pawn push", () => {
  // Setup: white pawn on e5, black pawn on d7. Black to move: d7->d5,
  // then white can capture en passant e5xd6.
  const pos = emptyPositionBase();
  pos.board.e5 = piece("w", "p", "♙");
  pos.board.d7 = piece("b", "p", "♟");
  pos.board.e1 = piece("w", "k", "♔");
  pos.board.e8 = piece("b", "k", "♚");
  pos.toMove = "b";

  const blackMove = makeMoveFromTo(pos, "d7", "d5");
  expect(blackMove).not.toBeNull();
  const pos2 = applyMove(pos, blackMove);

  expect(pos2.enPassant).toBe("d6");

  const epMoves = getLegalMovesForSquare(pos2, "e5");
  const ep = epMoves.find((m) => m.to === "d6" && m.isEnPassant);
  expect(Boolean(ep)).toBe(true);

  const pos3 = applyMove(pos2, ep);
  expect(pos3.board.d6?.type).toBe("p");
  // Captured pawn removed from d5
  expect(pos3.board.d5).toBeUndefined();
});

test("AI greedy fallback prefers capture when available", () => {
  const pos = emptyPositionBase();
  pos.board.e1 = piece("w", "k", "♔");
  pos.board.e8 = piece("b", "k", "♚");
  pos.board.d4 = piece("w", "q", "♕");
  pos.board.d7 = piece("b", "p", "♟");
  pos.board.h4 = piece("b", "p", "♟");
  pos.toMove = "w";

  const aiMove = chooseAiMove(pos, { depth: 1, fallbackGreedy: true });
  expect(aiMove).not.toBeNull();
  // Queen should capture a pawn (either d7 or h4), both are capture options.
  expect(Boolean(aiMove.captured)).toBe(true);
});
