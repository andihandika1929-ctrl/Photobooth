import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio:  "#F5F0E8",
        cream:   "#FDFBF7",
        parchment: "#EDE5D8",
        tan:     "#C4B99A",
        charcoal:"#1A1A1A",
        warm:    "#8A7560",
        muted:   "#8A8A8A",
        border:  "#E0D8CC",
      },
      fontFamily: {
        mono: ["'Courier New'", "Courier", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        studio:     "4px 4px 0px 0px #C4B99A",
        "studio-sm":"2px 2px 0px 0px #C4B99A",
        "studio-lg":"6px 6px 0px 0px #C4B99A",
        tactile:    "3px 3px 0px 0px #1A1A1A",
        "tactile-sm":"2px 2px 0px 0px #1A1A1A",
      },
      backgroundImage: {
        "dot-matrix": "radial-gradient(circle, #C4B99A 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
export default config;
