/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  '#E1F5EE',
          100: '#C3EBD8',
          500: '#0F6E56',
          600: '#0C5C47',
        },
        coral: {
          50:  '#FAECE7',
          500: '#993C1D',
        },
        amber: {
          50:  '#FAEEDA',
          500: '#854F0B',
        },
        base: '#2C2C2A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
