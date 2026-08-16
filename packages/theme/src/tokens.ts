export const THEME_COLORS = {
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
} as const;

export const THEME_FONTS = {
  serif: ['Lora', 'Georgia', 'serif'],
  mono: ['"DM Mono"', 'monospace'],
  sans: ['"DM Mono"', 'monospace', 'sans-serif'],
} as const;

export const THEME_SCREENS = {
  nav: '1000px',
} as const;

export type ThemeColors = typeof THEME_COLORS;
export type ThemeFonts = typeof THEME_FONTS;
export type ThemeScreens = typeof THEME_SCREENS;
