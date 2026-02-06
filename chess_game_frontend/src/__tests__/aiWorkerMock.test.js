import { searchBestMove } from "../chess/ai/search";
import { createTranspositionTable } from "../chess/ai/tt";

function emptyPositionBase() {
  return {
    board: {},
    toMove: "w",
    castling: { w: { K: false, Q: false }, b: { K: false, Q: false } },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
  };
}

function piece(color, type, unicode) {
  return { color, type, unicode };
}

class MockWorker {
  constructor(handler) {
    this._handler = handler;
    this.onmessage = null;
  }

  postMessage(msg) {
    const send = (data) => this.onmessage?.({ data });
    this._handler(msg, send);
  }

  terminate() {}
}

test("Mock worker SEARCH -> RESULT roundtrip returns a move", () => {
  const tt = createTranspositionTable({ maxEntries: 1000 });

  const worker = new MockWorker((msg, send) => {
    if (msg.type === "SEARCH") {
      const result = searchBestMove(msg.position, {
        limits: msg.limits,
        tt,
        cancelled: () => false,
      });
      send({ type: "RESULT", ...result });
    }
  });

  const pos = emptyPositionBase();
  pos.board.e1 = piece("w", "k", "♔");
  pos.board.e8 = piece("b", "k", "♚");
  pos.board.d4 = piece("w", "q", "♕");
  pos.board.d7 = piece("b", "p", "♟");
  pos.toMove = "w";

  let got = null;
  worker.onmessage = (e) => {
    got = e.data;
  };

  worker.postMessage({ type: "SEARCH", position: pos, limits: { maxDepth: 2, timeMs: 200, hardTimeMs: 400 } });

  expect(got).not.toBeNull();
  expect(got.type).toBe("RESULT");
  expect(got.bestMove).not.toBeNull();
  expect(got.depthReached).toBeGreaterThanOrEqual(1);
});
