import { useEffect, useState } from 'react';
import { CompanyProfile, defaultCompanyProfile, getCompanyProfile } from '@/lib/companyProfile';
import defaultLogo from '@/assets/logo-mr-transparent.png';

export const DEFAULT_THEME = {
  theme_primary: '#FFD600',
  theme_dark: '#1A1A1A',
  theme_price: '#1D4ED8',
  theme_price_old: '#DC2626',
};

let current: CompanyProfile = defaultCompanyProfile;
const listeners = new Set<(p: CompanyProfile) => void>();

export function setBrand(p: CompanyProfile) {
  current = p;
  applyTheme(p);
  listeners.forEach((l) => l(p));
}

export function getBrand() {
  return current;
}

export function brandLogo(p: CompanyProfile = current) {
  return p.logo_url || defaultLogo;
}

export function waNumber(p: CompanyProfile = current) {
  return (p.whatsapp || '').replace(/\D/g, '');
}

export function waLink(text: string, p: CompanyProfile = current) {
  return `https://wa.me/${waNumber(p)}?text=${encodeURIComponent(text)}`;
}

export function useBrand() {
  const [p, setP] = useState(current);
  useEffect(() => {
    listeners.add(setP);
    return () => {
      listeners.delete(setP);
    };
  }, []);
  return p;
}

export async function loadBrand(force = false) {
  const p = await getCompanyProfile(force);
  setBrand(p);
  return p;
}

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

const pick = (v: string | undefined, def: string) =>
  v && v.toLowerCase() !== def.toLowerCase() ? hexToHsl(v) : null;

const THEME_VARS = ['--primary', '--ml-header-dark', '--ml-header', '--ml-light-blue', '--primary-foreground', '--foreground', '--accent', '--ml-blue', '--ring', '--card-foreground', '--popover-foreground', '--price', '--price-old'];

const fmt = (h: number, s: number, l: number) => `${h} ${s}% ${Math.max(0, Math.min(100, l))}%`;

export function applyTheme(p: Partial<CompanyProfile>) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement.style;
  THEME_VARS.forEach((k) => root.removeProperty(k));
  const primary = pick(p.theme_primary, DEFAULT_THEME.theme_primary);
  if (primary) {
    const [h, s, l] = primary;
    root.setProperty('--primary', fmt(h, s, l));
    root.setProperty('--ml-header-dark', fmt(h, s, l));
    root.setProperty('--ml-header', fmt(h, s, l + (100 - l) * 0.35));
    root.setProperty('--ml-light-blue', fmt(h, s, 94));
    root.setProperty('--primary-foreground', l > 55 ? '0 0% 13%' : '0 0% 100%');
  }
  const dark = pick(p.theme_dark, DEFAULT_THEME.theme_dark);
  if (dark && dark[2] <= 35) {
    const v = fmt(...dark);
    ['--foreground', '--accent', '--ml-blue', '--ring', '--card-foreground', '--popover-foreground'].forEach((k) =>
      root.setProperty(k, v),
    );
  }
  const price = pick(p.theme_price, DEFAULT_THEME.theme_price);
  if (price) root.setProperty('--price', fmt(...price));
  const old = pick(p.theme_price_old, DEFAULT_THEME.theme_price_old);
  if (old) root.setProperty('--price-old', fmt(...old));
}
