/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // App Colors derived from existing design
        bg: "#000000",
        surface: "#121212",
        surfaceHighlight: "#1E1E1E",
        primary: "#8A2BE2", // Approximation of the purple used (Echo brand)
        text: {
          primary: "#FFFFFF",
          secondary: "#A1A1AA", // zinc-400
          tertiary: "#71717A", // zinc-500
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Courier New", "monospace"],
      },
    },
  },
  plugins: [],
};
