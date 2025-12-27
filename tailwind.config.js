/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0b0f19",
        steel: "#111827",
        frost: "#94a3b8",
        pulse: "#38bdf8",
        ember: "#f97316",
      },
    },
  },
  plugins: [],
};
