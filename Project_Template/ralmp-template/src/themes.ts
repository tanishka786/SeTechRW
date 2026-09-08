export type DaisyThemeId =
  | "templateio"
  | "forest"
  | "corporate"
  | "luxury"
  | "business"
  | "emerald"
  | "night"
  | "winter"
  | "dracula"
  | "cupcake"
  | "autumn"
  | "aqua"
  | "custom";

export type ThemePalette = {
  id: DaisyThemeId;
  label: string;
  mode: "dark" | "light";
  primary: string;
  secondary: string;
  accent: string;
};

export const DAISY_PALETTES: ThemePalette[] = [
  { id: "templateio", label: "template.io", mode: "dark", primary: "#7d9a70", secondary: "#3d5a80", accent: "#d7c49a" },
  { id: "forest", label: "Forest", mode: "dark", primary: "#1eb854", secondary: "#1db88e", accent: "#1db8ab" },
  { id: "corporate", label: "Corporate", mode: "light", primary: "#4b6bfb", secondary: "#7b92b2", accent: "#67cba0" },
  { id: "luxury", label: "Luxury", mode: "dark", primary: "#ffffff", secondary: "#152747", accent: "#513448" },
  { id: "business", label: "Business", mode: "dark", primary: "#1c4e80", secondary: "#7c8292", accent: "#ea6947" },
  { id: "emerald", label: "Emerald", mode: "light", primary: "#66cc8a", secondary: "#377cfb", accent: "#f9d72f" },
  { id: "night", label: "Night", mode: "dark", primary: "#38bdf8", secondary: "#818cf8", accent: "#f471b5" },
  { id: "winter", label: "Winter", mode: "light", primary: "#047aff", secondary: "#463aa2", accent: "#c148ac" },
  { id: "dracula", label: "Dracula", mode: "dark", primary: "#ff79c6", secondary: "#bd93f9", accent: "#ffb86c" },
  { id: "cupcake", label: "Cupcake", mode: "light", primary: "#65c3c8", secondary: "#ef9fbc", accent: "#eeaf3a" },
  { id: "autumn", label: "Autumn", mode: "light", primary: "#8c0327", secondary: "#d85251", accent: "#fbbf24" },
  { id: "aqua", label: "Aqua", mode: "dark", primary: "#09ecf3", secondary: "#966fb3", accent: "#ffe999" },
  { id: "custom", label: "Custom", mode: "dark", primary: "#7d9a70", secondary: "#3d5a80", accent: "#d7c49a" },
];

export function paletteById(id: string | undefined): ThemePalette {
  return DAISY_PALETTES.find((p) => p.id === id) ?? DAISY_PALETTES[0];
}

export function applyDocumentTheme(opts: {
  mode: "dark" | "light";
  daisyTheme: string;
  primary: string;
  secondary: string;
  accent: string;
}) {
  const root = document.documentElement;
  const daisy = opts.daisyTheme === "custom" ? "templateio" : opts.daisyTheme || "templateio";
  root.setAttribute("data-mode", opts.mode);
  root.setAttribute("data-theme", daisy);
  root.style.setProperty("--accent", opts.primary);
  root.style.setProperty("--accent-fg", contrastFg(opts.primary));
  root.style.setProperty("--ok", opts.primary);
  root.style.setProperty("--gold", opts.accent);
  root.style.setProperty("--color-primary", opts.primary);
  root.style.setProperty("--color-secondary", opts.secondary);
  root.style.setProperty("--color-accent", opts.accent);
  root.style.setProperty("--color-primary-content", contrastFg(opts.primary));
}

function contrastFg(hex: string) {
  const c = hex.replace("#", "");
  if (c.length < 6) return "#111111";
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  const y = (r * 299 + g * 587 + b * 114) / 1000;
  return y > 160 ? "#111111" : "#f7f4ea";
}
