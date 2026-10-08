import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { useBrand, brandLogo } from '@/lib/brand';

/** Tela com a marca quando a internet cai — nunca a tela de erro do navegador. */
export default function OfflineScreen() {
  const brand = useBrand();
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine);
  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  if (!offline) return null;
  return (
    <div role="alertdialog" aria-label="Sem conexão" className="keep-light fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-foreground text-background p-6 text-center">
      <img src={brandLogo(brand)} alt={brand.name} className="w-28 h-28 object-contain" />
      <WifiOff className="w-8 h-8 text-primary" />
      <p className="text-lg font-bold text-primary">Sem conexão.</p>
      <p className="text-sm opacity-80">Verifique sua internet.</p>
      <button type="button" onClick={() => window.location.reload()} className="min-h-11 px-5 rounded-md bg-primary text-primary-foreground font-bold">Tentar de novo</button>
    </div>
  );
}
