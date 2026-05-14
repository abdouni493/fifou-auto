/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        blob: 'blob 7s infinite',
        'red-pulse': 'redPulse 3s infinite',
      },
    },
  },
  plugins: [],
  safelist: [
    'animate-blob',
    'animate-red-pulse',
    'animate-shimmer',
  ],
}

