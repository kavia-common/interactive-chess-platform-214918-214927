/**
 * Transposition table implementation.
 *
 * Stores evaluations keyed by a position key. This is a simplified TT suitable
 * for this project's engine representation (string-based key).
 */

/**
 * @typedef {"EXACT" | "LOWER" | "UPPER"} BoundType
 */

/**
 * @typedef {Object} TTEntry
 * @property {string} key
 * @property {number} depth
 * @property {number} value
 * @property {BoundType} bound
 * @property {Object|null} bestMove
 * @property {number} age
 */

/**
 * PUBLIC_INTERFACE
 * createTranspositionTable creates a TT with a max size (entries).
 */
export function createTranspositionTable({ maxEntries = 50_000 } = {}) {
  /** Create a simple Map-based TT with size cap. */
  return {
    map: new Map(),
    maxEntries,
    age: 0,
  };
}

/**
 * PUBLIC_INTERFACE
 * ttGet retrieves an entry for a key.
 */
export function ttGet(tt, key) {
  /** Return TT entry or null. */
  const e = tt.map.get(key);
  return e || null;
}

/**
 * PUBLIC_INTERFACE
 * ttStore inserts/replaces an entry.
 *
 * Replacement policy:
 * - Prefer deeper entries
 * - Otherwise replace older (by age) entry
 */
export function ttStore(tt, entry) {
  /** Store TT entry with simple replacement and size control. */
  const existing = tt.map.get(entry.key);
  if (existing) {
    if (entry.depth > existing.depth || entry.age >= existing.age + 2) {
      tt.map.set(entry.key, entry);
    }
    return;
  }

  // size cap: drop ~5% oldest entries when exceeding cap
  if (tt.map.size >= tt.maxEntries) {
    const targetDrop = Math.max(50, Math.floor(tt.maxEntries * 0.05));
    let dropped = 0;
    for (const [k, v] of tt.map) {
      if (dropped >= targetDrop) break;
      if (v.age < tt.age - 2) {
        tt.map.delete(k);
        dropped += 1;
      }
    }
    // If still too large, drop earliest iterated entries.
    while (tt.map.size >= tt.maxEntries && dropped < targetDrop * 2) {
      const firstKey = tt.map.keys().next().value;
      if (!firstKey) break;
      tt.map.delete(firstKey);
      dropped += 1;
    }
  }

  tt.map.set(entry.key, entry);
}

/**
 * PUBLIC_INTERFACE
 * ttNewSearchAge increments TT age counter per search.
 */
export function ttNewSearchAge(tt) {
  /** Increment TT age for replacement heuristics. */
  tt.age += 1;
  return tt.age;
}
