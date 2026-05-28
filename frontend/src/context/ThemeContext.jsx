/**
 * ThemeContext — Global Theme Engine
 *
 * DAA/DMSC Concept: Finite State Machine (FSM)
 * The theme toggle is a 2-state FSM: {dark, light}.
 * Transitions are triggered by user interaction and persist
 * via localStorage, forming an idempotent state transition.
 *
 * @module ThemeContext
 */

import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

/**
 * ThemeProvider — wraps the app and injects `data-theme` attribute
 * on <html> for CSS variable switching. Framer Motion picks up the
 * layout-level transition automatically via AnimatePresence.
 */
export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('ss-theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ss-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, toggle, isDark: theme === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
