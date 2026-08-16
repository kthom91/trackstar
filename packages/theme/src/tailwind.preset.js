/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        paper: '#f0ede6',
        paperAlt: '#faf7f2',
        ink: {
          DEFAULT: '#0e0e0e',
          mid: '#3d3830',
          faint: '#9a8f7e',
        },
        inkMid: '#3d3830',
        inkFaint: '#9a8f7e',
        border: {
          DEFAULT: 'rgba(14,14,14,0.14)',
          md: 'rgba(14,14,14,0.24)',
        },
        borderMd: 'rgba(14,14,14,0.24)',
        dotGreen: '#5a8a5a',
      },
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
        sans: ['"DM Mono"', 'monospace', 'sans-serif'],
      },
      screens: {
        'nav': '1000px',
      },
    },
  },
  plugins: [],
};
