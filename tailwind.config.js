/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{js,ts,jsx,tsx}',
    './services/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'space-black': '#000000',
        'spectral': '#f0f0fa',
        'ghost': 'rgba(240, 240, 250, 0.1)',
        'ghost-border': 'rgba(240, 240, 250, 0.35)',
        'ghost-dim': 'rgba(240, 240, 250, 0.05)',
      },
      fontFamily: {
        sans: ['Inter', 'Arial', 'Verdana', 'sans-serif'],
      },
      letterSpacing: {
        'stencil': '0.96px',
        'nav': '1.17px',
        'micro': '1px',
      },
      borderRadius: {
        'ghost': '32px',
      },
    },
  },
  plugins: [],
}
