import type { Config } from "tailwindcss";

// Light mode only, per spec. `darkMode: "class"` with no class emitter means
// no dark styles can ever activate; no `dark:` variants exist in the codebase.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF8F4",
        ink: "#101010",
        hairline: "rgba(16, 16, 16, 0.15)",
        verdict: "#E8491D",
        ledger: "#0E6B3D",
        // Derived tints, named so color roles stay auditable:
        "verdict-tint": "#F8EEE8", // verdict/5 blended over paper (dispute-row sticky cells)
        "paper-raised": "#FCFAF6", // total-row sticky cells
        "tick-fallen": "#9A968E", // funnel failures falling away in gray
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
