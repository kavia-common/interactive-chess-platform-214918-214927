import React, { useMemo } from "react";
import { getThemes } from "../theme/themes";

/**
 * PUBLIC_INTERFACE
 * ThemeSwitcher lets users pick a theme and board scheme at runtime.
 * Includes small preview tiles.
 */
export default function ThemeSwitcher({
  themeId,
  boardSchemeId,
  onChangeThemeId,
  onChangeBoardSchemeId,
}) {
  const themes = useMemo(() => getThemes(), []);
  const theme = themes.find((t) => t.id === themeId) || themes[0];

  return (
    <div className="themePicker" aria-label="Theme settings">
      <div className="themePickerRow">
        <div className="label">Theme</div>
        <select
          className="select"
          value={theme.id}
          onChange={(e) => onChangeThemeId?.(e.target.value)}
          aria-label="Theme selector"
        >
          {themes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="themePreviewGrid" aria-label="Theme preview">
        {themes.map((t) => {
          const isActive = t.id === theme.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`previewTile ${isActive ? "previewTileActive" : ""}`}
              onClick={() => onChangeThemeId?.(t.id)}
              aria-label={`Select theme ${t.name}`}
              title={t.description}
            >
              <span
                className="previewSwatch"
                style={{
                  background: `linear-gradient(135deg, ${t.cssVars["--primary"]}, ${t.cssVars["--success"]})`,
                }}
              />
              <span className="previewMeta">
                <span className="previewName">{t.name}</span>
                <span className="previewDesc">{t.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="themePickerRow" style={{ marginTop: 10 }}>
        <div className="label">Board</div>
        <select
          className="select"
          value={boardSchemeId}
          onChange={(e) => onChangeBoardSchemeId?.(e.target.value)}
          aria-label="Board color scheme selector"
        >
          {theme.boardSchemes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="boardSchemePreview" aria-label="Board scheme preview">
        {theme.boardSchemes.map((s) => {
          const isActive = s.id === boardSchemeId;
          return (
            <button
              key={s.id}
              type="button"
              className={`boardTile ${isActive ? "boardTileActive" : ""}`}
              onClick={() => onChangeBoardSchemeId?.(s.id)}
              aria-label={`Select board scheme ${s.name}`}
              title={s.name}
            >
              <span
                className="boardMini"
                aria-hidden="true"
                style={{
                  background: `linear-gradient(90deg, ${s.light} 50%, ${s.dark} 50%)`,
                }}
              />
              <span className="boardMiniName">{s.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
