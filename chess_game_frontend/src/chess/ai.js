/**
 * Legacy AI entrypoint kept for backward compatibility.
 *
 * The AI has been moved to a Web Worker (see src/workers/aiWorker.js) so the
 * UI thread remains responsive. This module now only exports helpers that
 * can still be used by tests or older code.
 *
 * NOTE: The App no longer calls chooseAiMove synchronously.
 */

/**
 * PUBLIC_INTERFACE
 * chooseAiMove is deprecated. It returns null to avoid blocking the UI thread.
 */
export function chooseAiMove() {
  /** Deprecated synchronous AI. Use the Web Worker instead. */
  return null;
}
