import React from "react";

/**
 * PUBLIC_INTERFACE
 * AudioSettings renders compact toggles + volume slider for sounds/haptics preferences.
 */
export default function AudioSettings({
  prefs,
  audioSupported,
  hapticsSupported,
  onChange,
}) {
  const set = (patch) => onChange?.({ ...prefs, ...patch });

  return (
    <div className="audioSettings" aria-label="Sound and haptics settings">
      <div className="audioSettingsHeader">
        <div className="label" style={{ marginBottom: 4 }}>Settings</div>
        <span className="pill">
          SFX <span className="kbd">{audioSupported ? "OK" : "N/A"}</span> • HAPTICS{" "}
          <span className="kbd">{hapticsSupported ? "OK" : "N/A"}</span>
        </span>
      </div>

      <div className="audioSettingsGrid">
        <label className="toggleRow">
          <input
            type="checkbox"
            checked={Boolean(prefs.soundsEnabled)}
            onChange={(e) => set({ soundsEnabled: e.target.checked })}
            aria-label="Enable sounds"
          />
          <span>Enable Sounds</span>
        </label>

        <label className="toggleRow">
          <input
            type="checkbox"
            checked={Boolean(prefs.hapticsEnabled)}
            onChange={(e) => set({ hapticsEnabled: e.target.checked })}
            aria-label="Enable haptics"
            disabled={!hapticsSupported}
          />
          <span>Enable Haptics</span>
        </label>

        <label className="toggleRow">
          <input
            type="checkbox"
            checked={Boolean(prefs.playInAnalysis)}
            onChange={(e) => set({ playInAnalysis: e.target.checked })}
            aria-label="Play sounds in analysis"
          />
          <span>Play Sounds in Analysis</span>
        </label>

        <div className="volumeRow">
          <div className="label">Volume</div>
          <input
            className="volumeSlider"
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={typeof prefs.volume === "number" ? prefs.volume : 0.6}
            onChange={(e) => set({ volume: Number(e.target.value) })}
            aria-label="Sound volume"
            disabled={!prefs.soundsEnabled}
          />
        </div>
      </div>

      <div className="statusHint" style={{ marginTop: 8 }}>
        Tip: iOS may require a tap before SFX can play.
      </div>
    </div>
  );
}

