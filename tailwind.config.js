/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#08080d",
        surface: "rgba(255,255,255,0.03)",
        border: "rgba(255,255,255,0.06)",
        accent: "#00d4aa",
        "accent-dark": "#00b894",
      },
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
