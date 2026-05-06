export const colors = {
  background: '#F7F1E8',
  surface: '#FFF8EE',
  ink: '#1D1A16',
  mutedInk: '#5B544A',
  accent: '#B25E2A',
  accentStrong: '#8F4316',
  success: '#2A6A42',
  warning: '#A26A0A',
  danger: '#9A2D2D',
  border: '#D7CFC2'
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 20
} as const;

export const typography = {
  fontSans: '"Space Grotesk", "Plus Jakarta Sans", sans-serif',
  h1: { fontSize: 36, lineHeight: 1.15, fontWeight: 700 },
  h2: { fontSize: 28, lineHeight: 1.2, fontWeight: 700 },
  body: { fontSize: 16, lineHeight: 1.45, fontWeight: 400 },
  caption: { fontSize: 13, lineHeight: 1.35, fontWeight: 500 }
} as const;

export type UiTokens = {
  colors: typeof colors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
};

export const tokens: UiTokens = {
  colors,
  spacing,
  radius,
  typography
};
