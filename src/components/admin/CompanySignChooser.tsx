import { useEffect, useState } from 'react';
import { Camera, Loader2, PenLine, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { listSavedSignatures, savedSignatureImage, SavedSignature } from '@/lib/contractSignatures';

interface Props {
  companyName: string;
  /** Chamado só depois da confirmação da pessoa logada */
  onUseSaved: (s: SavedSignature) => Promise<void>;
  onDraw: () => void;
  /** Foto da assinatura feita à caneta (PNG em data URL), depois da confirmação */
  onPhoto?: (png: string) => Promise<void>;
}

/** Reduz a foto e deixa o papel transparente (tinta escura fica). */
async function photoToPng(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    for (let p = 0; p < d.data.length; p += 4) {
      const l = 0.3 * d.data[p] + 0.59 * d.data[p + 1] + 0.11 * d.data[p + 2];
      if (l > 165) d.data[p + 3] = 0;
    }
    ctx.putImageData(d, 0, 0);
    return c.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Escolha da assinatura da CONTRATADA: salva (um toque + confirmação) ou desenhada na hora. */
export default function CompanySignChooser({ companyName, onUseSaved, onDraw, onPhoto }: Props) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [list, setList] = useState<SavedSignature[] | null>(null);
  const [imgs, setImgs] = useState<Record<string, string | null>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [ask, setAsk] = useState<SavedSignature | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const l = await listSavedSignatures().catch(() => []);
      setList(l);
      setSelected((l.find((s) => s.is_default) || l[0])?.id ?? null);
      const pairs = await Promise.all(l.map(async (s) => [s.id, await savedSignatureImage(s.storage_path)] as const));
      setImgs(Object.fromEntries(pairs));
    })();
  }, []);

  return (
    <div className="space-y-3">
      <p className="text-sm font-bold">Assinar como {companyName}</p>
      {list === null ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma assinatura salva. Cadastre em Personalização → Identidade visual → Minhas assinaturas.</p>
      ) : (
        <>
          <p className="text-xs font-semibold text-muted-foreground">Minhas assinaturas salvas</p>
          <div className="grid grid-cols-2 gap-2">
            {list.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelected(s.id)}
                className={`rounded-md border-2 p-2 space-y-1 cursor-pointer ${selected === s.id ? 'border-primary' : 'border-border'}`}
              >
                <div className="keep-light bg-card h-16 rounded flex items-center justify-center p-1">
                  {imgs[s.id] ? <img src={imgs[s.id]!} alt={`Prévia: ${s.name}`} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-xs font-medium truncate flex items-center gap-1">{s.name}{s.is_default && <Star className="h-3 w-3 text-primary" />}</p>
                <Button size="sm" className="w-full" variant={selected === s.id ? 'default' : 'outline'} disabled={busy} onClick={(e) => { e.stopPropagation(); setSelected(s.id); setAsk(s); }}>
                  Usar esta
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
      <Button variant="outline" className="w-full" onClick={onDraw} disabled={busy}><PenLine className="h-4 w-4 mr-1" />✍️ Assinar na tela agora (dedo ou mouse)</Button>
      {onPhoto && (
        <label className="block">
          <span className="sr-only">Enviar foto da assinatura feita à caneta</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (!f) return;
              if (f.size > 10 * 1024 * 1024) return alert('A foto passa de 10 MB.');
              const png = await photoToPng(f).catch(() => null);
              if (!png) return alert('Não foi possível ler a foto.');
              setPhoto(png);
            }}
          />
          <span className="inline-flex w-full items-center justify-center gap-1 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium cursor-pointer hover:bg-accent">
            <Camera className="h-4 w-4" />🖊️ Assinatura à caneta — enviar foto
          </span>
        </label>
      )}

      <AlertDialog open={!!photo} onOpenChange={(v) => !v && !busy && setPhoto(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Usar esta assinatura à caneta?</AlertDialogTitle>
            <AlertDialogDescription>A foto será registrada como assinatura da contratada neste contrato, com data e hora de agora.</AlertDialogDescription>
          </AlertDialogHeader>
          {photo && <div className="keep-light bg-card rounded p-2 flex justify-center"><img src={photo} alt="Prévia da assinatura à caneta" className="max-h-32 object-contain" /></div>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                if (!photo || !onPhoto) return;
                setBusy(true);
                try { await onPhoto(photo); } finally { setBusy(false); setPhoto(null); }
              }}
            >
              {busy ? 'Registrando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!ask} onOpenChange={(v) => !v && !busy && setAsk(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>Deseja confirmar esta assinatura? Após confirmar, ela será registrada neste contrato.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={async (e) => {
                e.preventDefault();
                if (!ask) return;
                setBusy(true);
                try { await onUseSaved(ask); } finally { setBusy(false); setAsk(null); }
              }}
            >
              {busy ? 'Registrando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
