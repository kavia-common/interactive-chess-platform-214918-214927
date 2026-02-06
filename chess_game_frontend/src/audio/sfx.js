/* eslint-disable no-param-reassign */

/**
 * A tiny retro SFX synth using WebAudio.
 * - Single AudioContext
 * - Reusable "recipes" rather than external assets
 * - Throttle per-sound to avoid overlaps (default 150ms)
 */

const DEFAULT_THROTTLE_MS = 150;

function nowMs() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function isWebAudioSupported() {
  return typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
}

function getAudioContextSingleton() {
  if (!isWebAudioSupported()) return null;
  if (window.__retroChessAudioCtx) return window.__retroChessAudioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  window.__retroChessAudioCtx = new Ctx();
  return window.__retroChessAudioCtx;
}

function ensureRunning(ctx) {
  // iOS/Safari often starts suspended until a gesture. We try to resume opportunistically.
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {
      // Ignore - will resume after a user gesture.
    });
  }
}

function createGain(ctx, volume) {
  const g = ctx.createGain();
  g.gain.value = Math.max(0, Math.min(1, volume));
  g.connect(ctx.destination);
  return g;
}

/**
 * A "recipe" is a short beep/sequence described by oscillator changes over time.
 * This keeps assets lightweight and consistent with the retro theme.
 */
const RECIPES = {
  start: { type: "square", steps: [{ f: 440, t: 0.0 }, { f: 660, t: 0.06 }], dur: 0.10, a: 0.012, r: 0.05 },
  finish: { type: "square", steps: [{ f: 660, t: 0.0 }, { f: 440, t: 0.07 }], dur: 0.14, a: 0.012, r: 0.06 },

  move: { type: "square", steps: [{ f: 560, t: 0.0 }], dur: 0.06, a: 0.006, r: 0.03 },
  capture: { type: "sawtooth", steps: [{ f: 260, t: 0.0 }, { f: 180, t: 0.04 }], dur: 0.09, a: 0.005, r: 0.05 },

  check: { type: "square", steps: [{ f: 740, t: 0.0 }, { f: 880, t: 0.05 }], dur: 0.11, a: 0.008, r: 0.06 },
  checkmate: {
    type: "square",
    steps: [
      { f: 880, t: 0.0 },
      { f: 660, t: 0.07 },
      { f: 440, t: 0.14 },
    ],
    dur: 0.22,
    a: 0.010,
    r: 0.08,
  },

  illegal: { type: "triangle", steps: [{ f: 220, t: 0.0 }, { f: 180, t: 0.05 }], dur: 0.10, a: 0.004, r: 0.07 },
  promotion: { type: "square", steps: [{ f: 520, t: 0.0 }, { f: 780, t: 0.05 }], dur: 0.12, a: 0.008, r: 0.06 },

  puzzleOk: { type: "square", steps: [{ f: 660, t: 0.0 }, { f: 880, t: 0.06 }], dur: 0.14, a: 0.012, r: 0.06 },
  puzzleBad: { type: "triangle", steps: [{ f: 260, t: 0.0 }, { f: 200, t: 0.06 }], dur: 0.14, a: 0.010, r: 0.08 },
};

function playRecipe(ctx, masterGain, recipe) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = recipe.type || "square";

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);

  // Simple ADSR-ish envelope.
  const attack = recipe.a ?? 0.01;
  const release = recipe.r ?? 0.05;
  const dur = recipe.dur ?? 0.10;
  const tEnd = t0 + dur;

  g.gain.exponentialRampToValueAtTime(1.0, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, tEnd + release);

  osc.connect(g);
  g.connect(masterGain);

  // Frequency steps
  const steps = recipe.steps || [];
  if (steps.length) {
    osc.frequency.setValueAtTime(steps[0].f, t0 + (steps[0].t || 0));
    for (let i = 1; i < steps.length; i += 1) {
      const s = steps[i];
      osc.frequency.setValueAtTime(s.f, t0 + (s.t || 0));
    }
  }

  osc.start(t0);
  osc.stop(tEnd + release + 0.02);
}

class RetroSfxEngine {
  constructor() {
    this._ctx = null;
    this._master = null;
    this._volume = 0.6;
    this._enabled = true;
    this._lastPlayedAt = new Map(); // soundId -> ms
  }

  // PUBLIC_INTERFACE
  setEnabled(enabled) {
    /** Enable/disable all audio output. */
    this._enabled = Boolean(enabled);
  }

  // PUBLIC_INTERFACE
  setVolume(volume) {
    /** Set output volume 0..1 */
    const v = typeof volume === "number" && Number.isFinite(volume) ? volume : 0;
    this._volume = Math.max(0, Math.min(1, v));
    if (this._master) this._master.gain.value = this._volume;
  }

  _ensure() {
    if (!this._ctx) this._ctx = getAudioContextSingleton();
    if (!this._ctx) return false;
    ensureRunning(this._ctx);
    if (!this._master) this._master = createGain(this._ctx, this._volume);
    return true;
  }

  // PUBLIC_INTERFACE
  play(soundId, { throttleMs = DEFAULT_THROTTLE_MS } = {}) {
    /**
     * Play a short SFX by id, with per-sound throttling.
     * @param {keyof typeof RECIPES} soundId
     * @param {{throttleMs?:number}} opts
     */
    if (!this._enabled) return;
    const ok = this._ensure();
    if (!ok) return;

    const recipe = RECIPES[soundId];
    if (!recipe) return;

    const t = nowMs();
    const last = this._lastPlayedAt.get(soundId) || 0;
    if (t - last < throttleMs) return;
    this._lastPlayedAt.set(soundId, t);

    try {
      playRecipe(this._ctx, this._master, recipe);
    } catch {
      // no-op
    }
  }
}

function getSfxSingleton() {
  if (typeof window === "undefined") return new RetroSfxEngine();
  if (!window.__retroChessSfx) window.__retroChessSfx = new RetroSfxEngine();
  return window.__retroChessSfx;
}

// PUBLIC_INTERFACE
export function getSfx() {
  /** Get the singleton RetroSfxEngine instance. */
  return getSfxSingleton();
}

// PUBLIC_INTERFACE
export function isAudioSupported() {
  /** Feature detect WebAudio support. */
  return Boolean(isWebAudioSupported());
}

export const SOUND_IDS = Object.freeze(Object.keys(RECIPES));

