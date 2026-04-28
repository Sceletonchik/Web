/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f3f0ff',
          100: '#e9e3ff',
          500: '#7c5cfc',
          600: '#6d4ef0',
          700: '#5d3de0',
        },
      },
    },
  },
  plugins: [],
}
