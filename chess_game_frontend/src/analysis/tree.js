import { applyMove, createInitialPosition, toAlgebraic } from "../chess/engine";

/**
 * @typedef {Object} AnalysisNode
 * @property {string} id
 * @property {string|null} parentId
 * @property {Object|null} move Move object that leads to this node (null for root)
 * @property {string} san Display text (project uses coordinate notation via toAlgebraic)
 * @property {any} position Engine position at this node
 * @property {Array<string>} childrenIds
 * @property {{rawEval:number|null, depth:number|null, multiPv?:Array<any> | null}} evalInfo
 * @property {string} comment
 */

/**
 * @typedef {Object} AnalysisSession
 * @property {string} rootId
 * @property {string} selectedId
 * @property {Record<string, AnalysisNode>} nodes
 */

/**
 * Simple unique id generator for nodes.
 */
function uid() {
  return `n_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

/**
 * Create a new analysis session rooted at the given position.
 *
 * PUBLIC_INTERFACE
 * @param {any} position
 * @returns {AnalysisSession}
 */
export function createAnalysisSession(position = createInitialPosition()) {
  const rootId = uid();
  const root = {
    id: rootId,
    parentId: null,
    move: null,
    san: "Start",
    position,
    childrenIds: [],
    evalInfo: { rawEval: null, depth: null, multiPv: null },
    comment: "",
  };

  return {
    rootId,
    selectedId: rootId,
    nodes: { [rootId]: root },
  };
}

/**
 * Add a child node (a move/variation) from a given parent.
 * If the same move (from/to/promo flags) already exists as a child, returns existing child id.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @param {string} parentId
 * @param {Object} move
 * @returns {AnalysisSession}
 */
export function addChildMove(session, parentId, move) {
  const parent = session.nodes[parentId];
  if (!parent) return session;

  const moveKey = (m) =>
    `${m.from}${m.to}${m.promotion || ""}|${m.isCastling ? "c" : ""}${m.isEnPassant ? "e" : ""}`;

  const existingChildId = parent.childrenIds.find((cid) => {
    const c = session.nodes[cid];
    if (!c?.move) return false;
    return moveKey(c.move) === moveKey(move);
  });

  if (existingChildId) {
    return { ...session, selectedId: existingChildId };
  }

  const nextPos = applyMove(parent.position, move);
  const id = uid();

  const node = {
    id,
    parentId,
    move,
    san: toAlgebraic(move),
    position: nextPos,
    childrenIds: [],
    evalInfo: { rawEval: null, depth: null, multiPv: null },
    comment: "",
  };

  return {
    ...session,
    selectedId: id,
    nodes: {
      ...session.nodes,
      [id]: node,
      [parentId]: {
        ...parent,
        childrenIds: parent.childrenIds.concat(id),
      },
    },
  };
}

/**
 * Select an existing node.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @param {string} nodeId
 * @returns {AnalysisSession}
 */
export function selectNode(session, nodeId) {
  if (!session.nodes[nodeId]) return session;
  return { ...session, selectedId: nodeId };
}

/**
 * Update node evaluation info.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @param {string} nodeId
 * @param {{rawEval:number|null, depth:number|null, multiPv?:Array<any>|null}} evalInfo
 * @returns {AnalysisSession}
 */
export function setNodeEval(session, nodeId, evalInfo) {
  const node = session.nodes[nodeId];
  if (!node) return session;
  return {
    ...session,
    nodes: {
      ...session.nodes,
      [nodeId]: {
        ...node,
        evalInfo: {
          ...node.evalInfo,
          ...evalInfo,
        },
      },
    },
  };
}

/**
 * Set comment text for a node.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @param {string} nodeId
 * @param {string} comment
 * @returns {AnalysisSession}
 */
export function setNodeComment(session, nodeId, comment) {
  const node = session.nodes[nodeId];
  if (!node) return session;
  return {
    ...session,
    nodes: {
      ...session.nodes,
      [nodeId]: { ...node, comment },
    },
  };
}

/**
 * Build the line (node ids) from root to a given node.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @param {string} nodeId
 * @returns {string[]}
 */
export function pathToNode(session, nodeId) {
  const path = [];
  let curr = session.nodes[nodeId];
  while (curr) {
    path.push(curr.id);
    if (!curr.parentId) break;
    curr = session.nodes[curr.parentId];
  }
  return path.reverse();
}

/**
 * Export analysis session as JSON string.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @returns {string}
 */
export function exportAnalysisJson(session) {
  return JSON.stringify(session);
}

/**
 * Import analysis session from JSON string. Returns a new session, or null on failure.
 *
 * PUBLIC_INTERFACE
 * @param {string} json
 * @returns {AnalysisSession|null}
 */
export function importAnalysisJson(json) {
  try {
    const parsed = JSON.parse(json);
    if (!parsed?.rootId || !parsed?.selectedId || !parsed?.nodes) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Export a minimal PGN-like string with variations/comments in a readable format.
 * This is not a full PGN implementation; it is sufficient for offline sharing.
 *
 * PUBLIC_INTERFACE
 * @param {AnalysisSession} session
 * @returns {string}
 */
export function exportAnalysisPgn(session) {
  const root = session.nodes[session.rootId];
  if (!root) return "";

  const lines = [];
  lines.push('[Event "Analysis"]');
  lines.push('[Site "Retro Chess Terminal"]');
  lines.push('[Result "*"]');
  lines.push("");

  const emitNode = (nodeId, ply) => {
    const node = session.nodes[nodeId];
    if (!node) return;

    if (node.comment) {
      lines.push(`{${node.comment}}`);
    }

    // Print mainline as the first child if exists; other children as variations.
    const children = node.childrenIds.map((id) => session.nodes[id]).filter(Boolean);

    if (children.length === 0) return;

    const [main, ...vars] = children;

    // Variations
    for (const v of vars) {
      lines.push(`(${v.san}${v.comment ? ` {${v.comment}}` : ""})`);
    }

    // Mainline
    const moveNumber = Math.floor((ply + 1) / 2) + 1;
    const prefix = ply % 2 === 0 ? `${moveNumber}. ` : "";
    lines.push(`${prefix}${main.san}`);

    emitNode(main.id, ply + 1);
  };

  emitNode(session.rootId, 0);

  lines.push("*");
  return lines.join("\n");
}
