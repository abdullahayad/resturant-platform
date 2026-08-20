// Matches the admin portal's theme + orange/amber accent (see apps/admin-portal/src/index.css)
export interface ThemeColors {
  background: string;
  card: string;
  border: string;
  foreground: string;
  mutedForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  success: string;
  destructive: string;
  /** Precomputed translucent tints — keep hardcoded rgba(...) literals out of screens/components. */
  primaryTint15: string;
  primaryTint30: string;
  successTint08: string;
  successTint15: string;
  destructiveTint15: string;
}

export const darkColors: ThemeColors = {
  background: '#212328',
  card: '#292b31',
  border: '#3d4048',
  foreground: '#f4f4f5',
  mutedForeground: '#9a9ba3',
  primary: '#d99a4e',
  primaryForeground: '#2a1c0c',
  secondary: '#34363d',
  success: '#5cb86e',
  destructive: '#d9534f',
  primaryTint15: 'rgba(217, 154, 78, 0.15)',
  primaryTint30: 'rgba(217, 154, 78, 0.3)',
  successTint08: 'rgba(92, 184, 110, 0.08)',
  successTint15: 'rgba(92, 184, 110, 0.15)',
  destructiveTint15: 'rgba(217, 83, 79, 0.15)',
};

export const lightColors: ThemeColors = {
  background: '#f6f4f0',
  card: '#ffffff',
  border: '#e2ddd3',
  foreground: '#242426',
  mutedForeground: '#6b6b70',
  primary: '#b8722a',
  primaryForeground: '#2a1c0c',
  secondary: '#eee9e1',
  success: '#3f8a52',
  destructive: '#c23b37',
  primaryTint15: 'rgba(184, 114, 42, 0.12)',
  primaryTint30: 'rgba(184, 114, 42, 0.25)',
  successTint08: 'rgba(63, 138, 82, 0.08)',
  successTint15: 'rgba(63, 138, 82, 0.15)',
  destructiveTint15: 'rgba(194, 59, 55, 0.15)',
};
