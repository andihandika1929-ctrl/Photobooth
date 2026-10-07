'use client';

import * as React from 'react';
import {
  StudioThemeTokens,
  STUDIO_THEME_PRESETS,
  DEFAULT_PRESET_ID,
  THEME_STORAGE_KEY,
  ACTIVE_PRESET_KEY,
} from './themeTokens';

interface StudioThemeContextType {
  activePresetId: string;
  tokens: StudioThemeTokens;
  setPreset: (presetId: string) => void;
  updateToken: <K extends keyof StudioThemeTokens>(key: K, value: StudioThemeTokens[K]) => void;
  resetToPreset: (presetId?: string) => void;
  presets: Record<string, StudioThemeTokens>;
}

const StudioThemeContext = React.createContext<StudioThemeContextType | undefined>(undefined);

export function StudioThemeProvider({ children }: { children: React.ReactNode }) {
  const [activePresetId, setActivePresetId] = React.useState<string>(DEFAULT_PRESET_ID);
  const [tokens, setTokens] = React.useState<StudioThemeTokens>(
    STUDIO_THEME_PRESETS[DEFAULT_PRESET_ID]
  );
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize from localStorage
  React.useEffect(() => {
    try {
      const savedPreset = window.localStorage.getItem(ACTIVE_PRESET_KEY);
      const savedTokens = window.localStorage.getItem(THEME_STORAGE_KEY);

      if (savedPreset && STUDIO_THEME_PRESETS[savedPreset]) {
        setActivePresetId(savedPreset);
        if (savedTokens) {
          try {
            setTokens(JSON.parse(savedTokens));
          } catch {
            setTokens(STUDIO_THEME_PRESETS[savedPreset]);
          }
        } else {
          setTokens(STUDIO_THEME_PRESETS[savedPreset]);
        }
      }
    } catch {
      // LocalStorage access may fail in private mode
    } finally {
      setIsInitialized(true);
    }
  }, []);

  // Apply CSS custom variables whenever tokens change
  React.useEffect(() => {
    if (!isInitialized) return;

    try {
      const root = document.documentElement;
      root.style.setProperty('--studio-bg-primary', tokens.bgPrimary);
      root.style.setProperty('--studio-bg-secondary', tokens.bgSecondary);
      root.style.setProperty('--studio-card-bg', tokens.cardBg);
      root.style.setProperty('--studio-text-primary', tokens.textPrimary);
      root.style.setProperty('--studio-text-muted', tokens.textMuted);
      root.style.setProperty('--studio-accent', tokens.accentColor);
      root.style.setProperty('--studio-border', tokens.borderColor);

      // Persist
      window.localStorage.setItem(ACTIVE_PRESET_KEY, activePresetId);
      window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(tokens));
    } catch {
      // Ignore storage errors
    }
  }, [tokens, activePresetId, isInitialized]);

  const setPreset = React.useCallback((presetId: string) => {
    const preset = STUDIO_THEME_PRESETS[presetId];
    if (preset) {
      setActivePresetId(presetId);
      setTokens({ ...preset });
    }
  }, []);

  const updateToken = React.useCallback(
    <K extends keyof StudioThemeTokens>(key: K, value: StudioThemeTokens[K]) => {
      setTokens((prev) => ({
        ...prev,
        [key]: value,
      }));
    },
    []
  );

  const resetToPreset = React.useCallback((presetId = activePresetId) => {
    const preset = STUDIO_THEME_PRESETS[presetId] || STUDIO_THEME_PRESETS[DEFAULT_PRESET_ID];
    setActivePresetId(preset.id);
    setTokens({ ...preset });
  }, [activePresetId]);

  return (
    <StudioThemeContext.Provider
      value={{
        activePresetId,
        tokens,
        setPreset,
        updateToken,
        resetToPreset,
        presets: STUDIO_THEME_PRESETS,
      }}
    >
      {children}
    </StudioThemeContext.Provider>
  );
}

export function useStudioTheme() {
  const context = React.useContext(StudioThemeContext);
  if (!context) {
    throw new Error('useStudioTheme must be used within a StudioThemeProvider');
  }
  return context;
}
