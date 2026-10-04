import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/lib/theme';

export default function ThemeToggle() {
  const [dark, setDark] = useDarkMode();
  return (
    <button
      type="button"
      onClick={() => setDark(!dark)}
      aria-label={dark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      title={dark ? 'Modo claro' : 'Modo escuro'}
      className="p-2 text-ml-dark-gray hover:text-ml-blue transition-colors"
    >
      {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
