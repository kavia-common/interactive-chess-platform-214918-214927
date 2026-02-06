import React, { useMemo, useState } from "react";
import { formatEvalLabel, parseEngineEval } from "../analysis/eval";

/**
 * PUBLIC_INTERFACE
 * MoveTree renders a collapsible tree of analysis moves.
 */
export default function MoveTree({
  session,
  activeNodeId,
  onSelectNode,
  onSetComment,
  isThinking,
}) {
  const [collapsed, setCollapsed] = useState(() => new Set());

  const root = session?.nodes?.[session.rootId];

  const toggle = (id) => {
    setCollapsed((s) => {
      const next = new Set([...s]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = useMemo(() => {
    if (!root) return [];

    /** @type {Array<{node:any, depth:number}>} */
    const out = [];
    const walk = (node, depth) => {
      out.push({ node, depth });
      if (collapsed.has(node.id)) return;
      for (const cid of node.childrenIds || []) {
        const c = session.nodes[cid];
        if (c) walk(c, depth + 1);
      }
    };
    walk(root, 0);
    return out;
  }, [root, session, collapsed]);

  if (!root) return <div className="statusHint">No analysis session.</div>;

  return (
    <div className="analysisTree" aria-label="Move tree">
      {rows.map(({ node, depth }) => {
        const active = node.id === activeNodeId;
        const hasChildren = (node.childrenIds || []).length > 0;

        const score =
          node.evalInfo?.rawEval === null || node.evalInfo?.rawEval === undefined
            ? null
            : parseEngineEval(node.evalInfo.rawEval);

        const evalLabel = score ? formatEvalLabel(score) : "—";
        const depthLabel = node.evalInfo?.depth ? `d${node.evalInfo.depth}` : "";

        return (
          <div
            key={node.id}
            className={[
              "analysisTreeRow",
              active ? "analysisTreeRowActive" : "",
              isThinking && active ? "analysisTreeRowThinking" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <button
              className="analysisTreeToggle"
              onClick={() => (hasChildren ? toggle(node.id) : null)}
              aria-label={hasChildren ? (collapsed.has(node.id) ? "Expand node" : "Collapse node") : "Leaf node"}
              disabled={!hasChildren}
              title={hasChildren ? (collapsed.has(node.id) ? "Expand" : "Collapse") : "Leaf"}
            >
              {hasChildren ? (collapsed.has(node.id) ? "▸" : "▾") : "•"}
            </button>

            <button
              className="analysisTreeNodeBtn"
              onClick={() => onSelectNode?.(node.id)}
              aria-label={`Select node ${node.san}`}
              title="Click to navigate"
            >
              <span className="analysisSan">{node.san}</span>
              <span className="analysisMeta">
                <span className="analysisEval">{evalLabel}</span>
                <span className="analysisDepth">{depthLabel}</span>
              </span>
            </button>

            {active ? (
              <input
                className="analysisCommentInput"
                value={node.comment || ""}
                onChange={(e) => onSetComment?.(node.id, e.target.value)}
                placeholder="Comment…"
                aria-label="Node comment"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
