import {
  applyIncrementAfterMove,
  createClockState,
  getFlaggedColor,
  pauseClock,
  resumeClock,
  setActiveColor,
  startClock,
  switchActiveAfterMove,
  tickClock,
} from "../chess/clock";

test("increment is applied to the side that just moved", () => {
  const c0 = createClockState({ baseMinutes: 5, incrementSeconds: 2 });
  const c1 = applyIncrementAfterMove(c0, "w");
  expect(c1.remainingWMs).toBe(c0.remainingWMs + 2000);
  expect(c1.remainingBMs).toBe(c0.remainingBMs);

  const c2 = applyIncrementAfterMove(c0, "b");
  expect(c2.remainingBMs).toBe(c0.remainingBMs + 2000);
  expect(c2.remainingWMs).toBe(c0.remainingWMs);
});

test("switchActiveAfterMove increments mover and switches active to opponent", () => {
  const base = createClockState({ baseMinutes: 1, incrementSeconds: 5 });

  // Start with white active.
  const started = startClock(base, { activeColor: "w", now: 1000 });
  const after = switchActiveAfterMove(started, "w", { now: 2000 });

  expect(after.remainingWMs).toBe(base.remainingWMs + 5000);
  expect(after.activeColor).toBe("b");
  expect(after.lastTickAt).toBe(2000);
});

test("pause/resume prevents ticking while paused", () => {
  const base = createClockState({ baseMinutes: 1, incrementSeconds: 0 });
  const started = startClock(base, { activeColor: "w", now: 1000 });

  const t1 = tickClock(started, 2000);
  expect(t1.remainingWMs).toBe(base.remainingWMs - 1000);

  const paused = pauseClock(t1);
  const t2 = tickClock(paused, 4000);
  expect(t2.remainingWMs).toBe(t1.remainingWMs); // unchanged while paused

  const resumed = resumeClock(paused, { now: 5000 });
  const t3 = tickClock(resumed, 6000);
  expect(t3.remainingWMs).toBe(t1.remainingWMs - 1000);
});

test("flag detection triggers at or under 0 ms", () => {
  const base = createClockState({ baseMinutes: 0, incrementSeconds: 0 });
  // Force negative after ticking.
  const started = setActiveColor(startClock(base, { activeColor: "w", now: 0 }), "w", { now: 0 });
  const ticked = tickClock({ ...started, remainingWMs: 1, lastTickAt: 0 }, 10);
  expect(getFlaggedColor(ticked)).toBe("w");

  const exactZero = { ...ticked, remainingWMs: 0, remainingBMs: 1000 };
  expect(getFlaggedColor(exactZero)).toBe("w");
});
