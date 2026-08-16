/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [
    require('../../packages/theme/src/tailwind.preset.js'),
  ],
  content: [
    "./apps/browser-extension/src/**/*.{html,ts}",
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
