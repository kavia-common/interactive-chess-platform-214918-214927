import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import Board from "../components/Board";
import {
  applyThemeToDocument,
  loadThemePrefs,
  saveThemePrefs,
  THEME_STORAGE_KEY,
  BOARD_SCHEME_STORAGE_KEY,
} from "../theme/themes";
import {
  loadPieceSetPref,
  savePieceSetPref,
  PIECE_SET_STORAGE_KEY,
} from "../board/PieceRenderer";

function minimalPositionWithWhiteKing() {
  return {
    board: {
      e1: { color: "w", type: "k", unicode: "♔" },
    },
    toMove: "w",
    castling: { w: { K: false, Q: false }, b: { K: false, Q: false } },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    lastMove: null,
  };
}

test("theme preference is persisted and loaded", () => {
  window.localStorage.removeItem(THEME_STORAGE_KEY);
  window.localStorage.removeItem(BOARD_SCHEME_STORAGE_KEY);

  saveThemePrefs({ themeId: "terminalGreen", boardSchemeId: "terminal" });
  const prefs = loadThemePrefs();
  expect(prefs.themeId).toBe("terminalGreen");
  expect(prefs.boardSchemeId).toBe("terminal");
});

test("applyThemeToDocument sets CSS variables on :root", () => {
  applyThemeToDocument("terminalGreen", "terminal");
  const primary = document.documentElement.style.getPropertyValue("--primary");
  const boardLight = document.documentElement.style.getPropertyValue("--board-light");

  expect(primary).toBeTruthy();
  expect(boardLight).toBeTruthy();
});

test("piece set preference is persisted and loaded", () => {
  window.localStorage.removeItem(PIECE_SET_STORAGE_KEY);
  savePieceSetPref("alpha");
  const prefs = loadPieceSetPref();
  expect(prefs.pieceSetId).toBe("alpha");
});

test("Board default piece set renders unicode", () => {
  render(
    <Board
      position={minimalPositionWithWhiteKing()}
      orientation="w"
      pieceSetId="default"
      selected={null}
      legalTargets={[]}
      lastMove={null}
      inCheckSquare={null}
      onSquareClick={() => {}}
      onPieceDrop={() => {}}
    />
  );

  expect(screen.getByLabelText("White k")).toHaveTextContent("♔");
});

test("Board alpha piece set uses SVG renderer after lazy-load", async () => {
  render(
    <Board
      position={minimalPositionWithWhiteKing()}
      orientation="w"
      pieceSetId="alpha"
      selected={null}
      legalTargets={[]}
      lastMove={null}
      inCheckSquare={null}
      onSquareClick={() => {}}
      onPieceDrop={() => {}}
    />
  );

  // Initially may render unicode fallback while dynamic import resolves.
  expect(screen.getByLabelText("White k")).toBeInTheDocument();

  await waitFor(() => {
    // Alpha renderer produces an SVG with role=img and aria-label "White king"
    // but Board's wrapper aria-label remains "White k" (existing behavior).
    const svg = document.querySelector('svg[role="img"][aria-label="White king"]');
    expect(svg).toBeTruthy();
  });
});
