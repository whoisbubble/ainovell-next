import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#d7d3c8",
        night: "#09090b",
        panel: "#14141a",
        panelSoft: "#1d1d25",
        accent: "#a74632",
        gold: "#d0a15b",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(215, 211, 200, 0.08), 0 20px 40px rgba(0, 0, 0, 0.35)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top, rgba(167, 70, 50, 0.18), transparent 35%), radial-gradient(circle at bottom right, rgba(208, 161, 91, 0.12), transparent 30%)",
      },
      fontFamily: {
        display: ["Georgia", "Times New Roman", "serif"],
        mono: ["Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
