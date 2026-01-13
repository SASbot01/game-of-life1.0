import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type ThemePreset = 'void' | 'monochrome' | 'cyber-ops' | 'retro-pixel' | 'soft-bloom' | 'midnight-obsidian';

interface ThemeContextType {
  theme: ThemePreset;
  setTheme: (theme: ThemePreset) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemePreset>(() => {
    const stored = localStorage.getItem('gol-theme');
    return (stored as ThemePreset) || 'void';
  });

  useEffect(() => {
    localStorage.setItem('gol-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
