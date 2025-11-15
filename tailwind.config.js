/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        shift: {
          day: '#92D050',      // D (Day) - 녹색
          evening: '#FFC000',  // E (Evening) - 주황색
          night: '#4472C4',    // N (Night) - 파란색
          off: '#D9D9D9',      // O (Off) - 회색
        },
      },
    },
  },
  plugins: [],
}

