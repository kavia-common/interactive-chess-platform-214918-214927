import { createInitialPosition, getLegalMovesForSquare } from "../chess/engine";
import { addChildMove, createAnalysisSession, pathToNode, selectNode } from "../analysis/tree";

test("analysis tree adds branches from any node and allows selecting nodes", () => {
  const rootPos = createInitialPosition();
  let s = createAnalysisSession(rootPos);

  // From start, add e2e4
  const e2Moves = getLegalMovesForSquare(rootPos, "e2");
  const e4 = e2Moves.find((m) => m.to === "e4");
  expect(e4).toBeTruthy();

  s = addChildMove(s, s.selectedId, e4);
  const firstId = s.selectedId;

  // Go back to root and add d2d4 as alternative branch
  s = selectNode(s, s.rootId);
  const d2Moves = getLegalMovesForSquare(rootPos, "d2");
  const d4 = d2Moves.find((m) => m.to === "d4");
  expect(d4).toBeTruthy();

  s = addChildMove(s, s.selectedId, d4);
  const secondId = s.selectedId;

  expect(firstId).not.toBe(secondId);

  // Path to node includes root + node
  const p = pathToNode(s, secondId);
  expect(p[0]).toBe(s.rootId);
  expect(p[p.length - 1]).toBe(secondId);
});

test("adding the same move twice selects existing child instead of duplicating", () => {
  const rootPos = createInitialPosition();
  let s = createAnalysisSession(rootPos);

  const e2Moves = getLegalMovesForSquare(rootPos, "e2");
  const e4 = e2Moves.find((m) => m.to === "e4");

  s = addChildMove(s, s.selectedId, e4);
  const id1 = s.selectedId;

  s = selectNode(s, s.rootId);
  s = addChildMove(s, s.selectedId, e4);
  const id2 = s.selectedId;

  expect(id2).toBe(id1);
  expect(s.nodes[s.rootId].childrenIds.length).toBe(1);
});
