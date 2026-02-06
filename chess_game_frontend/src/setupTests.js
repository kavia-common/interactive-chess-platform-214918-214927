// jest-dom adds custom jest matchers for asserting on DOM nodes.
// https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

// Basic matchMedia mock for prefers-reduced-motion checks.
if (!window.matchMedia) {
  window.matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Minimal AudioContext mock so modules can feature-detect safely in Jest.
// We keep it extremely small because the app uses a singleton and guards usage.
if (!window.AudioContext) {
  window.AudioContext = function AudioContextMock() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
    this.resume = () => Promise.resolve();
    this.createGain = () => ({
      gain: { value: 1, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    });
    this.createOscillator = () => ({
      type: "square",
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: () => {},
      stop: () => {},
    });
  };
}

if (!navigator.vibrate) {
  navigator.vibrate = () => false;
}
