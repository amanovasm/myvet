/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#FD6220',
          light: '#FFF4EF',
          border: '#FDD5C0',
        },
        surface: '#F2F2F7',
        card: '#ffffff',
        muted: '#8E8E93',
        base: '#1C1C1E',
      },
      borderRadius: {
        card: '13px',
        phone: '26px',
      },
    },
  },
  plugins: [],
}
