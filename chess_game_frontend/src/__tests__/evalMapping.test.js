import { evalToBarRatio, formatEvalLabel, parseEngineEval } from "../analysis/eval";

test("centipawn eval maps to label and bar ratio", () => {
  const s = parseEngineEval(120);
  expect(s.type).toBe("cp");
  expect(formatEvalLabel(s)).toBe("+1.20");
  expect(evalToBarRatio(s)).toBeGreaterThan(0.5);
});

test("negative centipawn eval maps below 0.5", () => {
  const s = parseEngineEval(-200);
  expect(evalToBarRatio(s)).toBeLessThan(0.5);
});

test("mate-like eval formats as M# and clamps bar", () => {
  const s = parseEngineEval(999999);
  expect(s.type).toBe("mate");
  expect(formatEvalLabel(s).startsWith("M")).toBe(true);
  expect(evalToBarRatio(s)).toBeGreaterThan(0.9);

  const s2 = parseEngineEval(-999999);
  expect(formatEvalLabel(s2).startsWith("-M")).toBe(true);
  expect(evalToBarRatio(s2)).toBeLessThan(0.1);
});
