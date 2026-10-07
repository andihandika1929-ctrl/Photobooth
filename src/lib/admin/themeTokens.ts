/**
 * Studio Visual Theme Tokens & Presets
 * Standards-compliant theme token definitions for Studio and Admin
 */

export interface StudioThemeTokens {
  id: string;
  name: string;
  description: string;
  isDark: boolean;
  bgPrimary: string;
  bgSecondary: string;
  cardBg: string;
  textPrimary: string;
  textMuted: string;
  accentColor: string;
  borderColor: string;
  dotMatrixColor: string;
  dotMatrixOpacity: number;
}

export const THEME_STORAGE_KEY = 'haloluna:studio-theme-tokens';
export const ACTIVE_PRESET_KEY = 'haloluna:studio-active-preset';

export const STUDIO_THEME_PRESETS: Record<string, StudioThemeTokens> = {
  'minimal-dark': {
    id: 'minimal-dark',
    name: 'Minimal Dark',
    description: 'Sleek obsidian theme for low-light photography studios',
    isDark: true,
    bgPrimary: '#09090b',
    bgSecondary: '#121214',
    cardBg: '#18181b',
    textPrimary: '#f4f4f5',
    textMuted: '#a1a1aa',
    accentColor: '#60a5fa',
    borderColor: '#27272a',
    dotMatrixColor: '#3f3f46',
    dotMatrixOpacity: 0.25,
  },
  'modern-studio': {
    id: 'modern-studio',
    name: 'Modern Studio',
    description: 'Crisp architectural white aesthetic with clean neutral lines',
    isDark: false,
    bgPrimary: '#fafafa',
    bgSecondary: '#f4f4f5',
    cardBg: '#ffffff',
    textPrimary: '#18181b',
    textMuted: '#71717a',
    accentColor: '#18181b',
    borderColor: '#e4e4e7',
    dotMatrixColor: '#a1a1aa',
    dotMatrixOpacity: 0.15,
  },
  'classic-warm': {
    id: 'classic-warm',
    name: 'Classic Warm',
    description: 'Vintage parchment photobooth tone with warm sepia and tan accents',
    isDark: false,
    bgPrimary: '#F5F0E8',
    bgSecondary: '#FAF7EE',
    cardBg: '#FDFBF7',
    textPrimary: '#1A1A1A',
    textMuted: '#8A7560',
    accentColor: '#C4B99A',
    borderColor: '#E0D8CC',
    dotMatrixColor: '#C4B99A',
    dotMatrixOpacity: 0.22,
  },
  'monolith': {
    id: 'monolith',
    name: 'Monolith',
    description: 'High-contrast brutalist monochrome with electric blue accents',
    isDark: true,
    bgPrimary: '#050505',
    bgSecondary: '#0d0d0d',
    cardBg: '#141414',
    textPrimary: '#fafafa',
    textMuted: '#888888',
    accentColor: '#38bdf8',
    borderColor: '#222222',
    dotMatrixColor: '#38bdf8',
    dotMatrixOpacity: 0.18,
  },
};

export const DEFAULT_PRESET_ID = 'modern-studio';
