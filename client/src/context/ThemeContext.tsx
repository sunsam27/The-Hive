import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Read the same value the pre-paint script in index.html already resolved, so
  // the first React render agrees with the class on <html> and React does not
  // have to correct it.
  const [theme, setTheme] = useState(() => {
    if (typeof document !== 'undefined'
      && document.documentElement.classList.contains('dark')) {
      return 'dark';
    }
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.style.colorScheme = theme;
    localStorage.setItem('theme', theme);
    // Transitions are suppressed until now, otherwise the class change made by
    // the pre-paint script animates and reads as a flash.
    root.classList.add('theme-ready');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
