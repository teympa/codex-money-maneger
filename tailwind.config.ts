import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef8ff",
          100: "#d9eeff",
          200: "#bce2ff",
          300: "#8fd1ff",
          400: "#5bb7ff",
          500: "#3197ff",
          600: "#1b79f5",
          700: "#1962e1",
          800: "#1b4fb5",
          900: "#1c458e"
        },
        ink: "#0f172a",
        soft: "#f8fafc",
        success: "#047857",
        warning: "#b45309",
        danger: "#b91c1c"
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)"
      },
      fontFamily: {
        sans: ["'Noto Sans JP'", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: [],
};

export default config;
