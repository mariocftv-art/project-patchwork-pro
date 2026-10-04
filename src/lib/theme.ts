import { useEffect, useState } from 'react';

const KEY = 'mr-theme';
const listeners = new Set<(d: boolean) => void>();
// Telas que ficam sempre claras: painel admin e documentos/assinatura.
const LIGHT_ONLY = /^\/(admin|assinar|contrato)(\/|$)/;

export function preferredDark(): boolean {
  try {
    const s = localStorage.getItem(KEY);
    if (s) return s === 'dark';
  } catch { /* ignore */ }
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

export function applyMode(path = window.location.pathname) {
  const el = document.documentElement;
  const dark = preferredDark() && !LIGHT_ONLY.test(path);
  el.classList.toggle('dark', dark);
  el.style.colorScheme = dark ? 'dark' : 'light';
}

export function setDark(d: boolean) {
  try { localStorage.setItem(KEY, d ? 'dark' : 'light'); } catch { /* ignore */ }
  const el = document.documentElement;
  el.classList.add('theme-anim');
  applyMode();
  window.setTimeout(() => el.classList.remove('theme-anim'), 400);
  listeners.forEach((l) => l(d));
}

export function useDarkMode() {
  const [d, setD] = useState(preferredDark);
  useEffect(() => {
    listeners.add(setD);
    return () => { listeners.delete(setD); };
  }, []);
  return [d, setDark] as const;
}
