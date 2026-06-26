/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}', './src/renderer/index.html'],
  theme: {
    extend: {
      colors: {
        yt: {
          red: '#FF0000',
          dark: '#0F0F0F',
          surface: '#1A1A1A',
          elevated: '#272727',
          border: '#3D3D3D',
          text: '#F1F1F1',
          muted: '#AAAAAA'
        }
      }
    }
  },
  plugins: []
}
