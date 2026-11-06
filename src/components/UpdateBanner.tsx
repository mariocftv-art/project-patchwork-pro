import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const APP_VERSION_LABEL = `Versão ${__APP_BUILD_LABEL__}`;

/** Confere a cada abertura e a cada 5 min se há versão nova publicada.
 *  Nunca recarrega sozinho; durante a assinatura (body[data-signing]) o aviso espera. */
export default function UpdateBanner() {
  const [hasNew, setHasNew] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    const check = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) return;
        const v = await r.json();
        if (v?.id && String(v.id) !== __APP_BUILD_ID__) setHasNew(true);
      } catch { /* sem internet: tenta depois */ }
    };
    check();
    const id = setInterval(check, 5 * 60 * 1000);
    const onVis = () => document.visibilityState === 'visible' && check();
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const [signing, setSigning] = useState(false);
  useEffect(() => {
    const mo = new MutationObserver(() => setSigning(document.body.dataset.signing === '1'));
    mo.observe(document.body, { attributes: true, attributeFilter: ['data-signing'] });
    return () => mo.disconnect();
  }, []);

  if (!hasNew || signing) return null;

  const update = async () => {
    setBusy(true);
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() ?? [];
      await Promise.all(regs.map((r) => r.update().catch(() => undefined)));
    } catch { /* ignora */ }
    window.location.reload();
  };

  return (
    <div role="status" className="fixed top-0 inset-x-0 z-[100] bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-3 px-3 py-2 text-sm font-semibold">
        <span>Tem uma versão nova disponível — Atualizar agora</span>
        <Button size="sm" variant="secondary" disabled={busy} onClick={update} className="h-9">
          <RefreshCw className={`h-4 w-4 mr-1 ${busy ? 'animate-spin' : ''}`} />Atualizar
        </Button>
      </div>
    </div>
  );
}
