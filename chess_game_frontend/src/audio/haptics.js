function prefersReducedMotion() {
  try {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

// PUBLIC_INTERFACE
export function isHapticsSupported() {
  /** Feature detect navigator.vibrate availability. */
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

// PUBLIC_INTERFACE
export function canUseHaptics({ enabled }) {
  /**
   * Returns true only if:
   * - user enabled haptics
   * - device supports it
   * - reduced motion is NOT requested
   */
  if (!enabled) return false;
  if (!isHapticsSupported()) return false;
  if (prefersReducedMotion()) return false;
  return true;
}

function safeVibrate(pattern) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

// PUBLIC_INTERFACE
export function vibrateMove(opts = {}) {
  /** Gentle move vibration (10–15ms). */
  if (!canUseHaptics({ enabled: opts.enabled })) return;
  safeVibrate(12);
}

// PUBLIC_INTERFACE
export function vibrateCaptureOrCheck(opts = {}) {
  /** Stronger vibration for capture/check (25–35ms). */
  if (!canUseHaptics({ enabled: opts.enabled })) return;
  safeVibrate(30);
}

// PUBLIC_INTERFACE
export function vibrateCheckmate(opts = {}) {
  /** Short pattern for checkmate. */
  if (!canUseHaptics({ enabled: opts.enabled })) return;
  safeVibrate([20, 20, 35]);
}

// PUBLIC_INTERFACE
export function vibratePuzzleResult({ enabled, ok }) {
  /** Pattern for puzzle success/failure. */
  if (!canUseHaptics({ enabled })) return;
  safeVibrate(ok ? [12, 18, 22] : [25, 18, 25]);
}

