import type { Config } from "tailwindcss";

export default {
  darkMode: ["class", '[data-theme="escuro"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          red: "#d42731",
          "red-dark": "#980e08",
          "red-ink": "var(--brand-red-ink)",
          black: "#0c0c0d",
          beige: "#fcd19c",
          gray: "#d9d9d9",
          green: "#009f5e",
          "green-dark": "#007f4b",
          "green-ink": "var(--brand-green-ink)",
        },
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        line: "var(--border)",
        ink: "var(--text)",
        muted: "var(--muted)",
      },
      fontFamily: {
        sans: ['"Open Sans"', "system-ui", "-apple-system", "sans-serif"],
        dyslexic: ["OpenDyslexic", '"Open Sans"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        card: "0 1px 3px rgb(0 0 0 / 0.08)",
        lift: "0 18px 40px rgb(0 0 0 / 0.16)",
      },
      opacity: {
        8: "0.08",
        12: "0.12",
        15: "0.15",
        35: "0.35",
        45: "0.45",
        55: "0.55",
        65: "0.65",
        85: "0.85",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "slide-up": "slide-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
