import React, { useEffect, useMemo, useRef, useState } from "react";
import { exportGameToPgn, importPgnToGame } from "../chess/pgn";

/**
 * PUBLIC_INTERFACE
 * PgnModal provides PGN import/export controls for the main game.
 *
 * Behavior:
 * - Export uses the current main-game timeline (up to cursor) to PGN.
 * - Import parses pasted PGN or a .pgn file and calls onImportGame(parsedGame).
 * - If analysis mode is enabled, it prompts before applying import to the main game,
 *   without mutating analysis state.
 */
export default function PgnModal({
  open,
  onClose,
  positions,
  cursor,
  analysisEnabled,
  onImportGame,
  defaultHeaders,
}) {
  const [tab, setTab] = useState("export"); // export | import
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const [lastExport, setLastExport] = useState("");
  const fileRef = useRef(null);
  const textAreaRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setTab("export");
    const pgn = exportGameToPgn({
      positions,
      cursor,
      headers: defaultHeaders || {},
    });
    setLastExport(pgn);
    setText(pgn);

    window.setTimeout(() => {
      textAreaRef.current?.focus?.();
      textAreaRef.current?.select?.();
    }, 50);
  }, [open, positions, cursor, defaultHeaders]);

  const title = useMemo(() => {
    return tab === "export" ? "PGN Export" : "PGN Import";
  }, [tab]);

  if (!open) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard?.writeText?.(lastExport);
    } catch {
      // ignore; user can manually copy
    }
  };

  const onDownload = () => {
    const blob = new Blob([lastExport], { type: "application/x-chess-pgn;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "game.pgn";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2500);
  };

  const onPickFile = () => fileRef.current?.click?.();

  const onFileSelected = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const txt = await f.text();
      setText(txt);
      setTab("import");
      setError(null);
    } catch {
      setError({ message: "Failed to read file." });
    } finally {
      // allow selecting same file again
      e.target.value = "";
    }
  };

  const doImport = () => {
    setError(null);
    const res = importPgnToGame(text);
    if (!res.ok) {
      setError(res.error || { message: "Invalid PGN." });
      return;
    }

    if (analysisEnabled) {
      const ok = window.confirm(
        "Analysis mode is active.\n\nImporting PGN will replace the MAIN game timeline.\nYour analysis session stays separate.\n\nApply import to main game?"
      );
      if (!ok) return;
    }

    onImportGame?.(res.game);
    onClose?.();
  };

  return (
    <div className="pgnOverlay" role="dialog" aria-modal="true" aria-label="PGN dialog">
      <div className="pgnModal">
        <div className="pgnHeader">
          <div className="pgnTitle">{title}</div>
          <button className="button buttonGhost" onClick={onClose} aria-label="Close PGN dialog">
            Close
          </button>
        </div>

        <div className="pgnTabs" role="tablist" aria-label="PGN tabs">
          <button
            className={`pgnTab ${tab === "export" ? "pgnTabActive" : ""}`}
            onClick={() => {
              setTab("export");
              setError(null);
              const pgn = exportGameToPgn({
                positions,
                cursor,
                headers: defaultHeaders || {},
              });
              setLastExport(pgn);
              setText(pgn);
              window.setTimeout(() => {
                textAreaRef.current?.focus?.();
                textAreaRef.current?.select?.();
              }, 50);
            }}
            role="tab"
            aria-selected={tab === "export"}
          >
            Export
          </button>

          <button
            className={`pgnTab ${tab === "import" ? "pgnTabActive" : ""}`}
            onClick={() => {
              setTab("import");
              setError(null);
              window.setTimeout(() => textAreaRef.current?.focus?.(), 50);
            }}
            role="tab"
            aria-selected={tab === "import"}
          >
            Import
          </button>
        </div>

        <div className="pgnBody">
          <textarea
            ref={textAreaRef}
            className="pgnTextArea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            aria-label="PGN text"
          />

          {error ? (
            <div className="pgnError" role="alert">
              <div className="pgnErrorTitle">Parse error</div>
              <div className="pgnErrorText">{error.message}</div>
              {error.token ? (
                <div className="pgnErrorMeta">
                  Token: <span className="kbd">{error.token}</span> Ply:{" "}
                  <span className="kbd">{String(error.ply ?? "-")}</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <input
            ref={fileRef}
            type="file"
            accept=".pgn,text/plain,application/x-chess-pgn"
            style={{ display: "none" }}
            onChange={onFileSelected}
          />

          <div className="buttonRow">
            {tab === "export" ? (
              <>
                <button
                  className="button buttonPrimary"
                  onClick={onCopy}
                  aria-label="Copy PGN to clipboard"
                >
                  Copy
                </button>
                <button className="button buttonGhost" onClick={onDownload} aria-label="Download PGN">
                  Download .pgn
                </button>
                <button className="button buttonGhost" onClick={onPickFile} aria-label="Load PGN from file">
                  Load file…
                </button>
                <span className="pill">
                  Tip: export includes headers + final result (when known).
                </span>
              </>
            ) : (
              <>
                <button className="button buttonPrimary" onClick={doImport} aria-label="Import PGN">
                  Import
                </button>
                <button className="button buttonGhost" onClick={onPickFile} aria-label="Select PGN file">
                  Choose file…
                </button>
                <span className="pill">
                  Accepts: <span className="kbd">e2e4</span>, <span className="kbd">O-O</span>, promotions{" "}
                  <span className="kbd">=Q</span>.
                </span>
              </>
            )}
          </div>
        </div>

        <div className="statusHint" style={{ marginTop: 10 }}>
          Comments, NAGs, and variations are ignored for now (safe import).
        </div>
      </div>
    </div>
  );
}
