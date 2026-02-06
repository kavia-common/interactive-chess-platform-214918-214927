import React, { useMemo } from "react";
import { evalToBarRatio, formatEvalLabel, parseEngineEval } from "../analysis/eval";

/**
 * PUBLIC_INTERFACE
 * EvalBar shows a vertical evaluation bar and numeric label, from side-to-move perspective.
 */
export default function EvalBar({ rawEval }) {
  const score = useMemo(() => (rawEval === null || rawEval === undefined ? null : parseEngineEval(rawEval)), [rawEval]);
  const ratio = useMemo(() => evalToBarRatio(score), [score]);
  const label = useMemo(() => formatEvalLabel(score), [score]);

  return (
    <div className="evalBarWrap" aria-label="Evaluation bar">
      <div className="evalBar" role="img" aria-label={`Evaluation ${label}`}>
        <div
          className="evalBarFill"
          style={{
            height: `${Math.round(ratio * 100)}%`,
          }}
        />
      </div>
      <div className="evalBarLabel" aria-label="Evaluation label">
        {label}
      </div>
    </div>
  );
}
