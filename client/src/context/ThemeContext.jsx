import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [customColors, setCustomColors] = useState({
    primary: '#2e7d32',
    secondary: '#66bb6a',
    background: '#f1f8e9',
    surface: '#ffffff',
    text: '#1b5e20'
  });

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const savedCustomColors = localStorage.getItem('customColors');

    if (savedTheme) {
      setTheme(savedTheme);
    }

    if (savedCustomColors) {
      setCustomColors(JSON.parse(savedCustomColors));
    }
  }, []);

  const changeTheme = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const updateCustomColors = (colors) => {
    setCustomColors(colors);
    localStorage.setItem('customColors', JSON.stringify(colors));
  };

  const getThemeColors = () => {
    if (theme === 'light') {
      return {
        primary: '#8B0000', // Maroon
        'primary-light': '#ffe6e8',
        'primary-dark': '#5C0000',
        secondary: '#ffe6e8',
        accent: '#ffe6e8',
        background: '#ffffff',
        'background-card': '#f8f9fa',
        'text-primary': '#000000',
        'text-secondary': '#666666',
        'navbar-bg': 'rgba(255, 255, 255, 0.95)',
        'navbar-text': '#000000'
      };
    } else if (theme === 'dark') {
      return {
        primary: '#DC143C', // Deeper red like Reddit
        'primary-light': '#FF6B6B',
        'primary-dark': '#B22222',
        secondary: '#FF6B6B',
        accent: '#FF8C8C',
        background: '#0a0a0a',
        'background-card': '#1a1a1a',
        'text-primary': '#ffffff',
        'text-secondary': '#cccccc',
        'navbar-bg': 'rgba(10, 10, 10, 0.95)',
        'navbar-text': '#ffffff'
      };
    } else if (theme === 'custom') {
      return {
        primary: customColors.primary,
        'primary-light': customColors.primary,
        'primary-dark': customColors.primary,
        secondary: customColors.secondary,
        accent: customColors.secondary,
        background: customColors.background,
        'background-card': customColors.surface,
        'text-primary': customColors.text,
        'text-secondary': customColors.text,
        'navbar-bg': customColors.surface,
        'navbar-text': customColors.text
      };
    }
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      customColors,
      changeTheme,
      updateCustomColors,
      getThemeColors
    }}>
      {children}
    </ThemeContext.Provider>
  );
};
