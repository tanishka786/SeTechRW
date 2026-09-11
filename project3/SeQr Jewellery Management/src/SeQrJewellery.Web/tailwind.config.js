/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fffdf0',
          100: '#fffacc',
          200: '#fff38a',
          300: '#ffe847',
          400: '#ffd700',
          500: '#e6b800',
          600: '#cc9900',
          700: '#a67a00',
          800: '#7a5c00',
          900: '#4d3a00',
        },
        primary: {
          50: '#fdf8ee',
          100: '#f9edcc',
          200: '#f2d688',
          300: '#e9b940',
          400: '#e4a01b',
          500: '#d4880f',
          600: '#b96a09',
          700: '#964e0b',
          800: '#7b3e11',
          900: '#663412',
          950: '#3b1a07',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
