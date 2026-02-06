/**
 * Main-thread wrapper around the AI worker for analysis mode.
 *
 * This is designed to be unit-testable by injecting a Worker-like object.
 */

/**
 * @typedef {Object} AnalysisLimits
 * @property {number} maxDepth
 * @property {number} timeMs
 * @property {number} hardTimeMs
 */

/**
 * PUBLIC_INTERFACE
 * createAnalysisClient wraps a Worker instance and provides request/cancel methods.
 *
 * @param {Worker} worker
 * @returns {{
 *   analyze: (position:any, opts:{limits:AnalysisLimits, multiPv:number, onInfo?:(m:any)=>void}) => Promise<any>,
 *   cancel: () => void,
 *   dispose: () => void
 * }}
 */
export function createAnalysisClient(worker) {
  let disposed = false;

  // incrementing token to ignore stale results
  let token = 0;

  const cancel = () => {
    if (disposed) return;
    token += 1;
    worker.postMessage({ type: "CANCEL" });
  };

  const analyze = (position, opts) => {
    if (disposed) return Promise.reject(new Error("Client disposed"));
    token += 1;
    const myToken = token;

    const { limits, multiPv, onInfo } = opts || {};

    return new Promise((resolve, reject) => {
      const handler = (e) => {
        const msg = e.data;
        if (!msg?.type) return;

        // ignore stale
        if (myToken !== token) return;

        if (msg.type === "ANALYSIS_INFO") {
          onInfo?.(msg);
          return;
        }

        if (msg.type === "CANCELLED") {
          cleanup();
          reject(new Error("cancelled"));
          return;
        }

        if (msg.type === "ANALYSIS_RESULT") {
          cleanup();
          resolve(msg);
        }
      };

      const cleanup = () => {
        worker.removeEventListener?.("message", handler);
        // CRA worker uses onmessage; support both patterns.
        if (worker.onmessage === handler) worker.onmessage = null;
      };

      // Prefer addEventListener if available (easier to multiplex), fallback to onmessage.
      if (worker.addEventListener) worker.addEventListener("message", handler);
      else worker.onmessage = handler;

      worker.postMessage({
        type: "ANALYZE",
        position,
        limits,
        multiPv,
      });
    });
  };

  const dispose = () => {
    disposed = true;
    try {
      worker.terminate?.();
    } catch {
      // ignore
    }
  };

  return { analyze, cancel, dispose };
}
