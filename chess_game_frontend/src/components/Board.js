import React, { useMemo, useState } from "react";
import { FILES, RANKS, squareFromFR } from "../chess/utils";
import { PieceRenderer } from "../board/PieceRenderer";

/**
 * PUBLIC_INTERFACE
 * Board renders an interactive chessboard with drag/drop and click interactions.
 */
export default function Board({
  position,
  orientation = "w",
  pieceSetId = "default",
  selected,
  legalTargets,
  lastMove,
  inCheckSquare,
  onSquareClick,
  onPieceDrop,
}) {
  const [dragFrom, setDragFrom] = useState(null);

  const legalSet = useMemo(() => new Set(legalTargets || []), [legalTargets]);

  const files = orientation === "w" ? FILES : [...FILES].reverse();
  const ranks = orientation === "w" ? [...RANKS].reverse() : RANKS;

  const lastFrom = lastMove?.from ?? null;
  const lastTo = lastMove?.to ?? null;

  const allowCoords = true;

  return (
    <div className="board" role="grid" aria-label="Chessboard">
      {ranks.map((r) =>
        files.map((f) => {
          const sq = squareFromFR(f, r);
          const isLight = (FILES.indexOf(f) + (r - 1)) % 2 === 0;

          const piece = position.board[sq];
          const isSelected = selected === sq;
          const isLast = sq === lastFrom || sq === lastTo;
          const isCheck = inCheckSquare === sq;

          const isLegalTarget = legalSet.has(sq);
          const isCaptureTarget = isLegalTarget && Boolean(position.board[sq]);

          const classNames = [
            "square",
            isLight ? "squareLight" : "squareDark",
            isSelected ? "squareSelected" : "",
            isLast ? "squareLastMove" : "",
            isCheck ? "squareCheck" : "",
            isLegalTarget ? (isCaptureTarget ? "squareCaptureRing" : "squareLegalDot") : "",
          ]
            .filter(Boolean)
            .join(" ");

          const onDragStart = (e) => {
            if (!piece) return;
            if (piece.color !== position.toMove) return;
            setDragFrom(sq);
            // Provide a tiny payload for Firefox drag/drop requirement.
            e.dataTransfer.setData("text/plain", sq);
            e.dataTransfer.effectAllowed = "move";
          };

          const onDragOver = (e) => {
            // Enable drop.
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          };

          const onDrop = (e) => {
            e.preventDefault();
            const from = dragFrom || e.dataTransfer.getData("text/plain");
            const to = sq;
            setDragFrom(null);
            if (!from || from === to) return;
            onPieceDrop?.(from, to);
          };

          const onDragEnd = () => setDragFrom(null);

          const showFile = allowCoords && r === (orientation === "w" ? 1 : 8);
          const showRank = allowCoords && f === (orientation === "w" ? "a" : "h");

          return (
            <div
              key={sq}
              className={classNames}
              role="gridcell"
              aria-label={`Square ${sq}`}
              onClick={() => onSquareClick?.(sq)}
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              {showRank ? <div className="coordRank">{r}</div> : null}
              {showFile ? <div className="coordFile">{f}</div> : null}
              {piece ? (
                <span
                  className={`piece ${dragFrom === sq ? "pieceDragging" : ""}`}
                  draggable
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                  aria-label={`${piece.color === "w" ? "White" : "Black"} ${piece.type}`}
                >
                  <PieceRenderer
                    piece={piece}
                    pieceSetId={pieceSetId}
                    className=""
                    isDragging={dragFrom === sq}
                  />
                </span>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
