import type { Config } from "tailwindcss";

const config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        charcoal: "#080706",
        espresso: "#1d130d",
        cream: "#f5ead8",
        champagne: "#d9b879"
      },
      fontFamily: {
        sans: [
          "Avenir Next",
          "Optima",
          "Segoe UI",
          "ui-sans-serif",
          "system-ui"
        ],
        display: [
          "Georgia",
          "Cambria",
          "Times New Roman",
          "serif"
        ]
      },
      boxShadow: {
        champagne: "0 18px 70px rgba(217, 184, 121, 0.16)"
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
