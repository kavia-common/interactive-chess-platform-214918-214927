/**
 * Chess clock helpers.
 *
 * This module centralizes authoritative time calculations (based on timestamps),
 * so UI and tests can use the same logic.
 */

import { otherColor } from "./utils";

/**
 * @typedef {"w" | "b"} Color
 */

/**
 * @typedef {Object} ClockState
 * @property {number} remainingWMs
 * @property {number} remainingBMs
 * @property {number} incrementMs
 * @property {Color | null} activeColor
 * @property {boolean} isRunning
 * @property {boolean} isPaused
 * @property {number | null} lastTickAt
 */

/**
 * PUBLIC_INTERFACE
 * createClockState creates a new clock state for a given base time and increment.
 */
export function createClockState({ baseMinutes = 5, incrementSeconds = 0 } = {}) {
  /** Create a clock state. baseMinutes applies to both sides. */
  const baseMs = Math.max(0, Number(baseMinutes) || 0) * 60_000;
  const incMs = Math.max(0, Number(incrementSeconds) || 0) * 1000;

  return {
    remainingWMs: baseMs,
    remainingBMs: baseMs,
    incrementMs: incMs,
    activeColor: null,
    isRunning: false,
    isPaused: false,
    lastTickAt: null,
  };
}

/**
 * PUBLIC_INTERFACE
 * tickClock updates remaining time for the active side based on a timestamp.
 *
 * Uses delta between `now` and `lastTickAt` to avoid drift.
 */
export function tickClock(clock, now) {
  /** Apply time delta to active side; returns a new clock object. */
  if (!clock.isRunning || clock.isPaused) return clock;
  if (!clock.activeColor) return clock;
  if (!clock.lastTickAt) return { ...clock, lastTickAt: now };

  const delta = Math.max(0, now - clock.lastTickAt);

  if (clock.activeColor === "w") {
    return {
      ...clock,
      remainingWMs: clock.remainingWMs - delta,
      lastTickAt: now,
    };
  }

  return {
    ...clock,
    remainingBMs: clock.remainingBMs - delta,
    lastTickAt: now,
  };
}

/**
 * PUBLIC_INTERFACE
 * startClock arms the clock but does not choose active side unless provided.
 * (We start on first move; caller can set activeColor explicitly.)
 */
export function startClock(clock, { activeColor = null, now } = {}) {
  /** Start the clock. If activeColor is null, it will only begin ticking after setActiveColor. */
  return {
    ...clock,
    isRunning: true,
    isPaused: false,
    activeColor,
    lastTickAt: typeof now === "number" ? now : Date.now(),
  };
}

/**
 * PUBLIC_INTERFACE
 * pauseClock pauses ticking (without modifying remaining time).
 */
export function pauseClock(clock) {
  /** Pause the clock. */
  return { ...clock, isPaused: true, lastTickAt: null };
}

/**
 * PUBLIC_INTERFACE
 * resumeClock resumes ticking for current active side.
 */
export function resumeClock(clock, { now } = {}) {
  /** Resume the clock. */
  if (!clock.isRunning) return clock;
  return {
    ...clock,
    isPaused: false,
    lastTickAt: typeof now === "number" ? now : Date.now(),
  };
}

/**
 * PUBLIC_INTERFACE
 * setActiveColor switches the active side and resets lastTickAt to now.
 */
export function setActiveColor(clock, color, { now } = {}) {
  /** Set which side is currently ticking. */
  return {
    ...clock,
    activeColor: color,
    lastTickAt: typeof now === "number" ? now : Date.now(),
  };
}

/**
 * PUBLIC_INTERFACE
 * applyIncrementAfterMove adds increment to the side that just moved.
 *
 * IMPORTANT: This should be called *after* the move is completed (and before switching the active side),
 * and it uses the moverColor (the side who made the move).
 */
export function applyIncrementAfterMove(clock, moverColor) {
  /** Add increment to mover side. */
  const inc = clock.incrementMs || 0;
  if (inc <= 0) return clock;

  if (moverColor === "w") {
    return { ...clock, remainingWMs: clock.remainingWMs + inc };
  }
  return { ...clock, remainingBMs: clock.remainingBMs + inc };
}

/**
 * PUBLIC_INTERFACE
 * switchActiveAfterMove increments mover, then switches to the other side.
 */
export function switchActiveAfterMove(clock, moverColor, { now } = {}) {
  /** Helper: increment mover and switch active to opponent. */
  const withInc = applyIncrementAfterMove(clock, moverColor);
  const nextActive = otherColor(moverColor);
  return setActiveColor(withInc, nextActive, { now });
}

/**
 * PUBLIC_INTERFACE
 * getFlaggedColor returns "w" or "b" if that side's time is at/below 0.
 */
export function getFlaggedColor(clock) {
  /** Detect a flag fall. */
  if (clock.remainingWMs <= 0) return "w";
  if (clock.remainingBMs <= 0) return "b";
  return null;
}
