/**
 * Worker factory.
 *
 * CRA supports `new Worker(new URL("./worker.js", import.meta.url))` on Webpack 5.
 */

/**
 * PUBLIC_INTERFACE
 * createAiWorker returns a new AI Worker instance.
 */
export function createAiWorker() {
  /** Create module worker for AI. */
  // eslint-disable-next-line no-restricted-globals
  return new Worker(new URL("./aiWorker.js", import.meta.url));
}
