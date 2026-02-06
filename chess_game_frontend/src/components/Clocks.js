import React, { useEffect, useMemo, useState } from "react";

/**
 * PUBLIC_INTERFACE
 * Clocks renders two chess clocks (White/Black) with active-side emphasis and low-time warning.
 *
 * This component does NOT own the authoritative clock state; it receives remainingMs
 * from the parent. It uses an internal interval to refresh the display smoothly.
 */
export default function Clocks({
  whiteMs,
  blackMs,
  activeColor, // "w" | "b" | null
  isRunning,
  isPaused,
  labels = { w: "White", b: "Black" },
}) {
  const [now, setNow] = useState(() => Date.now());

  // Display refresh timer (authoritative time is owned by parent; this is just to update view).
  useEffect(() => {
    if (!isRunning || isPaused) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [isRunning, isPaused]);

  // Also refresh when stopped so the view is consistent after resets.
  useEffect(() => {
    setNow(Date.now());
  }, [whiteMs, blackMs]);

  const whiteText = useMemo(() => formatClockMs(whiteMs), [whiteMs, now]);
  const blackText = useMemo(() => formatClockMs(blackMs), [blackMs, now]);

  const whiteLow = whiteMs <= 10_000;
  const blackLow = blackMs <= 10_000;

  return (
    <div className="clocksWrap" aria-label="Chess clocks">
      <ClockCard
        color="w"
        label={labels.w}
        timeText={whiteText}
        isActive={isRunning && !isPaused && activeColor === "w"}
        isLow={whiteLow}
      />
      <ClockCard
        color="b"
        label={labels.b}
        timeText={blackText}
        isActive={isRunning && !isPaused && activeColor === "b"}
        isLow={blackLow}
      />
    </div>
  );
}

function ClockCard({ color, label, timeText, isActive, isLow }) {
  const className = [
    "clockCard",
    isActive ? "clockActive" : "",
    isLow ? "clockLow" : "",
    color === "b" ? "clockBlack" : "clockWhite",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} role="group" aria-label={`${label} clock`}>
      <div className="clockLabel">{label}</div>
      <div className="clockTime" aria-live="polite">
        {timeText}
      </div>
      <div className="clockHint">
        {isActive ? "ACTIVE" : isLow ? "LOW" : "—"}
      </div>
    </div>
  );
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatClockMs(ms) {
  const safe = Math.max(0, Math.floor(ms));
  const totalSeconds = Math.floor(safe / 1000);

  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  if (hours > 0) return `${hours}:${pad2(minutes)}:${pad2(seconds)}`;
  return `${pad2(minutes)}:${pad2(seconds)}`;
}
