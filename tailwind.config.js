/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}', './lib/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          50: '#effaf3',
          100: '#d8f3e2',
          200: '#b3e6c8',
          500: '#22a35a',
          600: '#178a49',
          700: '#136e3c',
          900: '#0d3d23',
        },
      },
    },
  },
  plugins: [],
}
