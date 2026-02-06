const STORAGE_KEY = "retro_chess_puzzles_v1";

function safeParse(json) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// PUBLIC_INTERFACE
export function loadPuzzleProgress() {
  /**
   * Load persisted puzzle trainer progress/state.
   * @returns {{
   *   rating:number,
   *   streak:number,
   *   solvedCount:number,
   *   failedCount:number,
   *   attempts:number,
   *   correct:number,
   *   lastDailyDate:string|null,
   *   lastDailyPuzzleId:string|null,
   *   importedPacks:Array<{id:string,name:string, puzzles:any[]}>,
   * } }
   */
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const parsed = raw ? safeParse(raw) : null;

  return {
    rating: Number.isFinite(parsed?.rating) ? parsed.rating : 1200,
    streak: Number.isFinite(parsed?.streak) ? parsed.streak : 0,
    solvedCount: Number.isFinite(parsed?.solvedCount) ? parsed.solvedCount : 0,
    failedCount: Number.isFinite(parsed?.failedCount) ? parsed.failedCount : 0,
    attempts: Number.isFinite(parsed?.attempts) ? parsed.attempts : 0,
    correct: Number.isFinite(parsed?.correct) ? parsed.correct : 0,
    lastDailyDate: typeof parsed?.lastDailyDate === "string" ? parsed.lastDailyDate : null,
    lastDailyPuzzleId: typeof parsed?.lastDailyPuzzleId === "string" ? parsed.lastDailyPuzzleId : null,
    importedPacks: Array.isArray(parsed?.importedPacks) ? parsed.importedPacks : [],
  };
}

// PUBLIC_INTERFACE
export function savePuzzleProgress(progress) {
  /**
   * Persist puzzle progress/state to localStorage.
   * @param {any} progress
   */
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}
