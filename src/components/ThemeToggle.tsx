import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/lib/theme';

export default function ThemeToggle({ variant = 'header' }: { variant?: 'header' | 'panel' }) {
  const [dark, setDark] = useDarkMode();
  const cls = variant === 'panel'
    ? 'w-11 h-11 rounded-md border border-input bg-background text-foreground hover:bg-secondary'
    : 'mx-0.5 w-9 h-9 rounded-full border-2 border-ml-dark-gray/70 bg-white/40 text-ml-dark-gray hover:bg-white/70';
  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className={`${cls} flex items-center justify-center shrink-0 transition-colors`}
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
