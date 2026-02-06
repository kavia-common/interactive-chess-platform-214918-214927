const STORAGE_KEY = "retro_chess_audio_prefs_v1";

/**
 * PUBLIC_INTERFACE
 * loadAudioPrefs loads persisted audio/haptics preferences with safe defaults.
 *
 * Defaults:
 * - sounds enabled
 * - haptics enabled (but will be feature/OS reduced-motion gated at runtime)
 * - sounds in analysis disabled
 * - volume 0.6
 */
export function loadAudioPrefs() {
  /** @returns {{soundsEnabled:boolean,hapticsEnabled:boolean,playInAnalysis:boolean,volume:number}} */
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;

    const volume =
      typeof parsed?.volume === "number" && Number.isFinite(parsed.volume)
        ? Math.max(0, Math.min(1, parsed.volume))
        : 0.6;

    return {
      soundsEnabled: typeof parsed?.soundsEnabled === "boolean" ? parsed.soundsEnabled : true,
      hapticsEnabled: typeof parsed?.hapticsEnabled === "boolean" ? parsed.hapticsEnabled : true,
      playInAnalysis: typeof parsed?.playInAnalysis === "boolean" ? parsed.playInAnalysis : false,
      volume,
    };
  } catch {
    return { soundsEnabled: true, hapticsEnabled: true, playInAnalysis: false, volume: 0.6 };
  }
}

/**
 * PUBLIC_INTERFACE
 * saveAudioPrefs persists audio/haptics preferences to localStorage.
 * @param {{soundsEnabled:boolean,hapticsEnabled:boolean,playInAnalysis:boolean,volume:number}} prefs
 */
export function saveAudioPrefs(prefs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export { STORAGE_KEY as AUDIO_PREFS_STORAGE_KEY };

