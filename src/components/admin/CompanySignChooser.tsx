import { useEffect, useState } from 'react';
import { Loader2, PenLine, Star } from 'lucide-react';
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
}

/** Escolha da assinatura da CONTRATADA: salva (um toque + confirmação) ou desenhada na hora. */
export default function CompanySignChooser({ companyName, onUseSaved, onDraw }: Props) {
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
      <Button variant="outline" className="w-full" onClick={onDraw} disabled={busy}><PenLine className="h-4 w-4 mr-1" />✍️ Assinar manualmente agora</Button>

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
