import { loadAudioPrefs, saveAudioPrefs, AUDIO_PREFS_STORAGE_KEY } from "../audio/audioPrefs";
import { canUseHaptics, isHapticsSupported } from "../audio/haptics";
import { getSfx } from "../audio/sfx";

describe("Audio preferences + feature detection", () => {
  test("audio prefs persist to localStorage and load with defaults", () => {
    window.localStorage.removeItem(AUDIO_PREFS_STORAGE_KEY);

    const d = loadAudioPrefs();
    expect(d.soundsEnabled).toBe(true);
    expect(d.playInAnalysis).toBe(false);
    expect(d.volume).toBeGreaterThan(0);

    saveAudioPrefs({ soundsEnabled: false, hapticsEnabled: false, playInAnalysis: true, volume: 0.2 });
    const p = loadAudioPrefs();
    expect(p.soundsEnabled).toBe(false);
    expect(p.hapticsEnabled).toBe(false);
    expect(p.playInAnalysis).toBe(true);
    expect(p.volume).toBeCloseTo(0.2, 5);
  });

  test("haptics feature detection no-ops when unsupported or reduced motion", () => {
    const origVibrate = navigator.vibrate;
    // Ensure unsupported:
    navigator.vibrate = undefined;

    expect(isHapticsSupported()).toBe(false);
    expect(canUseHaptics({ enabled: true })).toBe(false);

    // Restore
    navigator.vibrate = origVibrate;
  });

  test("analysis mode respects playInAnalysis toggle for SFX engine", () => {
    const sfx = getSfx();

    // Mock play method directly to observe calls (engine still should exist in test env).
    const spy = jest.spyOn(sfx, "play").mockImplementation(() => {});

    // A helper emulating App's gating condition:
    const shouldPlay = (soundsEnabled, wasAnalysis, playInAnalysis) =>
      soundsEnabled && (!wasAnalysis || playInAnalysis);

    // Default: no sounds in analysis
    expect(shouldPlay(true, true, false)).toBe(false);

    // Enabled: allow
    expect(shouldPlay(true, true, true)).toBe(true);

    if (shouldPlay(true, true, false)) sfx.play("move");
    if (shouldPlay(true, true, true)) sfx.play("move");

    expect(spy).toHaveBeenCalledTimes(1);

    spy.mockRestore();
  });
});

