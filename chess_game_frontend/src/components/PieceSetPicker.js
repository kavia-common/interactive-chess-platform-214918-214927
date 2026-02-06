import React, { useMemo } from "react";
import { getPieceSets } from "../board/PieceRenderer";

/**
 * PUBLIC_INTERFACE
 * PieceSetPicker lets users switch piece rendering sets at runtime.
 * Includes preview tiles.
 */
export default function PieceSetPicker({ pieceSetId, onChangePieceSetId }) {
  const sets = useMemo(() => getPieceSets(), []);

  return (
    <div className="piecePicker" aria-label="Piece set settings">
      <div className="piecePickerRow">
        <div className="label">Pieces</div>
        <select
          className="select"
          value={pieceSetId}
          onChange={(e) => onChangePieceSetId?.(e.target.value)}
          aria-label="Piece set selector"
        >
          {sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="piecePreviewGrid" aria-label="Piece set preview">
        {sets.map((s) => {
          const isActive = s.id === pieceSetId;
          return (
            <button
              key={s.id}
              type="button"
              className={`previewTile ${isActive ? "previewTileActive" : ""}`}
              onClick={() => onChangePieceSetId?.(s.id)}
              aria-label={`Select piece set ${s.name}`}
              title={s.description}
            >
              <span className="piecePreviewIcon" aria-hidden="true">
                {s.preview.w}
                <span style={{ opacity: 0.65, marginLeft: 8 }}>{s.preview.b}</span>
              </span>
              <span className="previewMeta">
                <span className="previewName">{s.name}</span>
                <span className="previewDesc">{s.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
