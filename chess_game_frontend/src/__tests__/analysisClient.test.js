import { createAnalysisClient } from "../workers/analysisClient";

class MockWorker {
  constructor() {
    this._listeners = new Set();
  }

  addEventListener(type, cb) {
    if (type === "message") this._listeners.add(cb);
  }

  removeEventListener(type, cb) {
    if (type === "message") this._listeners.delete(cb);
  }

  postMessage(msg) {
    // Simulate worker behavior for ANALYZE.
    if (msg.type === "ANALYZE") {
      // send one info then result
      for (const cb of this._listeners) cb({ data: { type: "ANALYSIS_INFO", depth: 3, nodes: 123, timeMs: 25 } });
      for (const cb of this._listeners)
        cb({
          data: {
            type: "ANALYSIS_RESULT",
            depthReached: 3,
            nodes: 456,
            timeMs: 40,
            eval: 120,
            lines: [{ eval: 120, pv: [{ from: "e2", to: "e4", piece: { color: "w", type: "p" } }] }],
          },
        });
    }
    if (msg.type === "CANCEL") {
      for (const cb of this._listeners) cb({ data: { type: "CANCELLED" } });
    }
  }

  terminate() {}
}

test("analysis client analyze resolves with ANALYSIS_RESULT", async () => {
  const w = new MockWorker();
  const c = createAnalysisClient(w);

  const res = await c.analyze({ toMove: "w", board: {}, castling: { w: { K: false, Q: false }, b: { K: false, Q: false } } }, {
    limits: { maxDepth: 4, timeMs: 200, hardTimeMs: 300 },
    multiPv: 2,
  });

  expect(res.type).toBe("ANALYSIS_RESULT");
  expect(res.eval).toBe(120);
  expect(Array.isArray(res.lines)).toBe(true);
});

test("analysis client cancel rejects pending request", async () => {
  const w = new MockWorker();
  const c = createAnalysisClient(w);

  const p = c.analyze({ toMove: "w", board: {}, castling: { w: { K: false, Q: false }, b: { K: false, Q: false } } }, {
    limits: { maxDepth: 4, timeMs: 200, hardTimeMs: 300 },
    multiPv: 2,
  });

  c.cancel();

  await expect(p).rejects.toThrow();
});
