const THEME_STORAGE_KEY = "retroChess.themeId";
const BOARD_SCHEME_STORAGE_KEY = "retroChess.boardSchemeId";

/**
 * Themes define a palette of CSS variables applied to :root at runtime.
 * Each theme can expose multiple board schemes (light/dark square colors).
 */
const THEMES = [
  {
    id: "retroLight",
    name: "Retro Light",
    description: "Bright CRT-inspired light theme with cyan/blue accents.",
    cssVars: {
      "--primary": "#3b82f6",
      "--success": "#06b6d4",
      "--error": "#ef4444",

      "--bg": "#f9fafb",
      "--surface": "#ffffff",
      "--text": "#111827",
      "--muted": "#64748b",

      "--border": "rgba(17, 24, 39, 0.12)",
      "--crt-glow": "rgba(59, 130, 246, 0.28)",
      "--crt-glow-2": "rgba(6, 182, 212, 0.22)",

      "--square-hover": "rgba(59, 130, 246, 0.18)",
      "--square-select": "rgba(6, 182, 212, 0.25)",
      "--square-lastmove": "rgba(59, 130, 246, 0.22)",
      "--square-check": "rgba(239, 68, 68, 0.28)",

      "--font-ui":
        'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Inter", "Helvetica Neue", sans-serif',
      "--font-mono":
        'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',

      // App gradients are driven via CSS vars so different themes can override them.
      "--app-grad-1": "rgba(59, 130, 246, 0.10)",
      "--app-grad-2": "rgba(6, 182, 212, 0.10)",
      "--app-grad-3": "rgba(255, 255, 255, 1)",
      "--scanline": "rgba(0, 0, 0, 0.045)",
      "--crt-vignette": "rgba(59, 130, 246, 0.10)",

      "--evalbar-border": "rgba(17, 24, 39, 0.18)",
      "--evalbar-bg-1": "rgba(17, 24, 39, 0.12)",
      "--evalbar-bg-2": "rgba(17, 24, 39, 0.04)",
      "--evalbar-fill-1": "rgba(6, 182, 212, 0.85)",
      "--evalbar-fill-2": "rgba(59, 130, 246, 0.85)",

      "--piece-shadow": "rgba(17, 24, 39, 0.20)",
    },
    boardSchemes: [
      { id: "stone", name: "Stone", light: "#e7e5e4", dark: "#a8a29e" },
      { id: "blueprint", name: "Blueprint", light: "#dbeafe", dark: "#60a5fa" },
    ],
    defaultBoardSchemeId: "stone",
  },

  {
    id: "terminalGreen",
    name: "Terminal Green",
    description: "Matrix-like green phosphor on dark background.",
    cssVars: {
      "--primary": "#34d399",
      "--success": "#22c55e",
      "--error": "#fb7185",

      "--bg": "#06110b",
      "--surface": "#071a10",
      "--text": "#bbf7d0",
      "--muted": "rgba(187, 247, 208, 0.70)",

      "--border": "rgba(187, 247, 208, 0.18)",
      "--crt-glow": "rgba(52, 211, 153, 0.32)",
      "--crt-glow-2": "rgba(34, 197, 94, 0.22)",

      "--square-hover": "rgba(52, 211, 153, 0.20)",
      "--square-select": "rgba(34, 197, 94, 0.22)",
      "--square-lastmove": "rgba(52, 211, 153, 0.18)",
      "--square-check": "rgba(251, 113, 133, 0.30)",

      "--app-grad-1": "rgba(34, 197, 94, 0.12)",
      "--app-grad-2": "rgba(52, 211, 153, 0.10)",
      "--app-grad-3": "#031007",
      "--scanline": "rgba(0, 0, 0, 0.12)",
      "--crt-vignette": "rgba(34, 197, 94, 0.10)",

      "--evalbar-border": "rgba(187, 247, 208, 0.22)",
      "--evalbar-bg-1": "rgba(187, 247, 208, 0.12)",
      "--evalbar-bg-2": "rgba(187, 247, 208, 0.04)",
      "--evalbar-fill-1": "rgba(34, 197, 94, 0.90)",
      "--evalbar-fill-2": "rgba(52, 211, 153, 0.85)",

      "--piece-shadow": "rgba(0, 0, 0, 0.35)",
    },
    boardSchemes: [
      { id: "terminal", name: "Terminal", light: "#0b2a18", dark: "#062012" },
      { id: "amber", name: "Amber", light: "#2a1b0b", dark: "#201206" },
    ],
    defaultBoardSchemeId: "terminal",
  },

  {
    id: "crt8bit",
    name: "8-bit CRT",
    description: "Chunky 8-bit palette with warm purples and electric cyan.",
    cssVars: {
      "--primary": "#22d3ee",
      "--success": "#a3e635",
      "--error": "#fb7185",

      "--bg": "#0b1021",
      "--surface": "#0f172a",
      "--text": "#e2e8f0",
      "--muted": "rgba(226, 232, 240, 0.72)",

      "--border": "rgba(226, 232, 240, 0.14)",
      "--crt-glow": "rgba(34, 211, 238, 0.26)",
      "--crt-glow-2": "rgba(163, 230, 53, 0.18)",

      "--square-hover": "rgba(34, 211, 238, 0.20)",
      "--square-select": "rgba(163, 230, 53, 0.20)",
      "--square-lastmove": "rgba(34, 211, 238, 0.18)",
      "--square-check": "rgba(251, 113, 133, 0.30)",

      "--app-grad-1": "rgba(168, 85, 247, 0.12)",
      "--app-grad-2": "rgba(34, 211, 238, 0.10)",
      "--app-grad-3": "#070b17",
      "--scanline": "rgba(0, 0, 0, 0.14)",
      "--crt-vignette": "rgba(168, 85, 247, 0.10)",

      "--evalbar-border": "rgba(226, 232, 240, 0.16)",
      "--evalbar-bg-1": "rgba(226, 232, 240, 0.12)",
      "--evalbar-bg-2": "rgba(226, 232, 240, 0.04)",
      "--evalbar-fill-1": "rgba(34, 211, 238, 0.88)",
      "--evalbar-fill-2": "rgba(168, 85, 247, 0.78)",

      "--piece-shadow": "rgba(0, 0, 0, 0.40)",
    },
    boardSchemes: [
      { id: "purple", name: "Purple", light: "#c4b5fd", dark: "#6d28d9" },
      { id: "teal", name: "Teal", light: "#99f6e4", dark: "#0d9488" },
    ],
    defaultBoardSchemeId: "purple",
  },

  {
    id: "midnightNeon",
    name: "Midnight Neon",
    description: "High-contrast neon accents on deep midnight.",
    cssVars: {
      "--primary": "#a78bfa",
      "--success": "#22d3ee",
      "--error": "#f97316",

      "--bg": "#05020b",
      "--surface": "#0b0616",
      "--text": "#f5f3ff",
      "--muted": "rgba(245, 243, 255, 0.72)",

      "--border": "rgba(245, 243, 255, 0.14)",
      "--crt-glow": "rgba(167, 139, 250, 0.30)",
      "--crt-glow-2": "rgba(34, 211, 238, 0.22)",

      "--square-hover": "rgba(167, 139, 250, 0.20)",
      "--square-select": "rgba(34, 211, 238, 0.22)",
      "--square-lastmove": "rgba(167, 139, 250, 0.18)",
      "--square-check": "rgba(249, 115, 22, 0.30)",

      "--app-grad-1": "rgba(167, 139, 250, 0.12)",
      "--app-grad-2": "rgba(34, 211, 238, 0.10)",
      "--app-grad-3": "#03010a",
      "--scanline": "rgba(0, 0, 0, 0.18)",
      "--crt-vignette": "rgba(167, 139, 250, 0.10)",

      "--evalbar-border": "rgba(245, 243, 255, 0.18)",
      "--evalbar-bg-1": "rgba(245, 243, 255, 0.14)",
      "--evalbar-bg-2": "rgba(245, 243, 255, 0.05)",
      "--evalbar-fill-1": "rgba(34, 211, 238, 0.88)",
      "--evalbar-fill-2": "rgba(167, 139, 250, 0.78)",

      "--piece-shadow": "rgba(0, 0, 0, 0.45)",
    },
    boardSchemes: [
      { id: "neonBlue", name: "Neon Blue", light: "#1e293b", dark: "#0b1220" },
      { id: "neonMagenta", name: "Neon Magenta", light: "#2b1436", dark: "#120714" },
    ],
    defaultBoardSchemeId: "neonBlue",
  },
];

/**
 * PUBLIC_INTERFACE
 * Apply a theme + board scheme to the document by setting CSS variables on :root.
 */
export function applyThemeToDocument(themeId, boardSchemeId) {
  const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
  const scheme =
    theme.boardSchemes.find((s) => s.id === boardSchemeId) ||
    theme.boardSchemes.find((s) => s.id === theme.defaultBoardSchemeId) ||
    theme.boardSchemes[0];

  const root = document.documentElement;

  // Apply base theme vars
  Object.entries(theme.cssVars).forEach(([k, v]) => {
    root.style.setProperty(k, v);
  });

  // Apply board vars
  root.style.setProperty("--board-light", scheme.light);
  root.style.setProperty("--board-dark", scheme.dark);

  // Also adjust a couple of derived text colors for coords (keeps contrast reasonable).
  // Consumers can override further via CSS if needed.
  root.style.setProperty("--coord-color", "rgba(255,255,255,0.70)");
  if (theme.id === "retroLight") {
    root.style.setProperty("--coord-color", "rgba(17, 24, 39, 0.55)");
  }

  return { theme, scheme };
}

/**
 * PUBLIC_INTERFACE
 * Read persisted theme + board scheme from localStorage with safe defaults.
 */
export function loadThemePrefs() {
  let themeId = THEMES[0].id;
  let boardSchemeId = THEMES[0].defaultBoardSchemeId;

  try {
    const t = window.localStorage.getItem(THEME_STORAGE_KEY);
    const b = window.localStorage.getItem(BOARD_SCHEME_STORAGE_KEY);
    if (t) themeId = t;
    if (b) boardSchemeId = b;
  } catch {
    // ignore (private mode etc.)
  }

  // Validate
  const theme = THEMES.find((x) => x.id === themeId) || THEMES[0];
  const schemeOk = theme.boardSchemes.some((s) => s.id === boardSchemeId);
  if (!schemeOk) boardSchemeId = theme.defaultBoardSchemeId;

  return { themeId: theme.id, boardSchemeId };
}

/**
 * PUBLIC_INTERFACE
 * Persist theme + board scheme to localStorage.
 */
export function saveThemePrefs({ themeId, boardSchemeId }) {
  try {
    if (themeId) window.localStorage.setItem(THEME_STORAGE_KEY, themeId);
    if (boardSchemeId)
      window.localStorage.setItem(BOARD_SCHEME_STORAGE_KEY, boardSchemeId);
  } catch {
    // ignore
  }
}

/**
 * PUBLIC_INTERFACE
 * Get available themes list.
 */
export function getThemes() {
  return THEMES;
}

export { THEME_STORAGE_KEY, BOARD_SCHEME_STORAGE_KEY };
