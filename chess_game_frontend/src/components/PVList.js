import React, { useMemo } from "react";
import { toAlgebraic } from "../chess/engine";
import { formatEvalLabel, parseEngineEval } from "../analysis/eval";

/**
 * PUBLIC_INTERFACE
 * PVList shows multi-PV principal variations with evals.
 */
export default function PVList({ pvLines, onClickLine }) {
  const lines = useMemo(() => pvLines || [], [pvLines]);

  return (
    <div className="pvList" aria-label="Principal variations">
      {lines.length === 0 ? (
        <div className="statusHint">No PV lines yet. Start analysis.</div>
      ) : (
        lines.map((l, idx) => {
          const score = parseEngineEval(l.eval);
          const label = formatEvalLabel(score);
          const movesText = (l.pv || [])
            .slice(0, 10)
            .map((m) => toAlgebraic(m))
            .join(" ");

          return (
            <button
              key={`${idx}-${movesText}`}
              className="pvRow"
              onClick={() => onClickLine?.(l)}
              aria-label={`PV ${idx + 1} ${label}`}
              title="Click to navigate/build this line"
            >
              <span className="pvRank">#{idx + 1}</span>
              <span className="pvEval">{label}</span>
              <span className="pvMoves">{movesText}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
