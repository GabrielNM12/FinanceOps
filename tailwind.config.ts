import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#f1f5f9",
          100: "#e2e8f0",
          200: "#cbd5e1",
          300: "#94a3b8",
          400: "#5b748b",
          500: "#334963",
          600: "#25384e",
          700: "#1c2b3d",
          800: "#152233",
          900: "#0f1b2a",
        },
        teal: {
          300: "#67d3e0",
          400: "#41c4d6",
          500: "#2eb3c7",
          600: "#2494a6",
        },
      },
    },
  },
  plugins: [],
};

export default config;
