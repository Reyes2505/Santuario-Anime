// src/lib/theme.ts - Sistema de tema Nocturno/Día

export type Theme = 'dark' | 'light';

const THEME_KEY = 'santuario_theme';

export function getTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  
  // Detectar preferencia del sistema
  if (window.matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  
  return 'dark';
}

export function setTheme(theme: Theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  
  // Aplicar clase al HTML
  document.documentElement.classList.remove('dark', 'light');
  document.documentElement.classList.add(theme);
}

export function toggleTheme() {
  const current = getTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
