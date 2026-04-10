/**
 * IEEE QuizHub - Unified Design System
 * Light: Blue (#1e63b5) + White
 * Dark:  Slate (#0f1729) + Indigo accent (#4f8ef7)
 *
 * Usage:
 *   import { useTheme, ThemeToggle } from '../context/ThemeContext';
 *   const { theme, tokens } = useTheme();
 *   // use tokens.bg, tokens.text, tokens.primary, etc.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => localStorage.getItem('ieee_theme') || 'light');

  useEffect(() => {
    localStorage.setItem('ieee_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const tokens = theme === 'light'
    ? {
        // Light tokens
        bg:           '#F0F5FF',
        surface:      '#FFFFFF',
        surfaceHover: '#F8FAFC',
        border:       '#E2E8F0',
        navBg:        '#1e63b5',
        navText:      '#FFFFFF',
        sidebarBg:    '#FFFFFF',
        sidebarBorder:'#E2E8F0',
        activeItem:   '#EFF6FF',
        activeText:   '#1e63b5',
        inactiveText: '#4B5563',
        primary:      '#1e63b5',
        primaryHover: '#1a54a0',
        text:         '#0F172A',
        textMuted:    '#64748B',
        cardShadow:   '0 2px 8px rgba(30,99,181,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        inputBg:      '#FFFFFF',
        danger:       '#DC2626',
        success:      '#16A34A',
        warning:      '#D97706',
      }
    : {
        // Dark tokens
        bg:           '#0d1526',
        surface:      '#15213b',
        surfaceHover: '#1a2a4a',
        border:       '#1e3358',
        navBg:        '#0d1526',
        navText:      '#E2E8F0',
        sidebarBg:    '#111e35',
        sidebarBorder:'#1e3358',
        activeItem:   '#1e3358',
        activeText:   '#4f8ef7',
        inactiveText: '#94A3B8',
        primary:      '#4f8ef7',
        primaryHover: '#3b7de8',
        text:         '#F1F5F9',
        textMuted:    '#94A3B8',
        cardShadow:   '0 2px 12px rgba(0,0,0,0.4)',
        inputBg:      '#1a2a4a',
        danger:       '#F87171',
        success:      '#4ADE80',
        warning:      '#FBBF24',
      };

  return (
    <ThemeContext.Provider value={{ theme, toggle, tokens }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);

// ── Reusable ThemeToggle button component ──────────────────────────────────
export const ThemeToggle = () => {
  const { theme, toggle, tokens } = useTheme();
  return (
    <button
      onClick={toggle}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      style={{
        width: 38, height: 22, borderRadius: 11,
        background: theme === 'dark' ? '#4f8ef7' : 'rgba(255,255,255,0.25)',
        border: '1.5px solid rgba(255,255,255,0.3)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
        display: 'flex', alignItems: 'center', padding: '0 3px',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transition: 'transform 0.3s',
        transform: theme === 'dark' ? 'translateX(16px)' : 'translateX(0)',
      }} />
    </button>
  );
};
