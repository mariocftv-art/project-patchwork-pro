import { useEffect, useState } from 'react';
import { Loader2, PenLine, Plus, Star, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { compressImage } from '@/lib/imageUpload';
import SignaturePad from './SignaturePad';
import {
  addSavedSignature, listSavedSignatures, removeSavedSignature, savedSignatureImage, setDefaultSavedSignature,
  updateSavedSignature, SavedSignature, MAX_SAVED_SIGNATURES,
} from '@/lib/contractSignatures';

interface Props {
  responsibleName: string;
  responsibleRole: string;
  onChange: (field: 'responsible_name' | 'responsible_role', value: string) => void;
}

/** "Minhas assinaturas": até 5 assinaturas da empresa, guardadas em área privada (só admin). */
export default function SavedSignaturesManager({ responsibleName, responsibleRole, onChange }: Props) {
  const { toast } = useToast();
  const [list, setList] = useState<SavedSignature[]>([]);
  const [imgs, setImgs] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [names, setNames] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const l = await listSavedSignatures();
      setList(l);
      setNames(Object.fromEntries(l.map((s) => [s.id, s.name])));
      const pairs = await Promise.all(l.map(async (s) => [s.id, await savedSignatureImage(s.storage_path)] as const));
      setImgs(Object.fromEntries(pairs));
    } catch (e) {
      console.error(e);
    }
  };
  useEffect(() => { load(); }, []);

  const add = async (blob: Blob, name: string) => {
    setBusy(true);
    try {
      await addSavedSignature(blob, name, false);
      await load();
      toast({ title: 'Assinatura guardada' });
    } catch (e) {
      toast({ title: (e as Error).message === 'limit' ? `Limite de ${MAX_SAVED_SIGNATURES} assinaturas` : 'Não foi possível guardar', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.type !== 'image/png') return toast({ title: 'Envie um arquivo PNG', description: 'De preferência com fundo transparente.', variant: 'destructive' });
    if (f.size > 10 * 1024 * 1024) return toast({ title: 'A imagem passa de 10 MB', variant: 'destructive' });
    const blob = await compressImage(f, true);
    await add(blob, f.name.replace(/\.png$/i, '').replace(/[-_]+/g, ' ').slice(0, 60) || 'Assinatura');
  };

  const run = async (fn: () => Promise<void>, ok?: string) => {
    try { await fn(); await load(); if (ok) toast({ title: ok }); } catch { toast({ title: 'Não foi possível salvar', variant: 'destructive' }); }
  };

  const full = list.length >= MAX_SAVED_SIGNATURES;

  return (
    <div className="rounded-lg border border-border p-4 space-y-4">
      <div>
        <h3 className="font-semibold">✍️ Minhas assinaturas</h3>
        <p className="text-xs text-muted-foreground">Usadas só por administradores no campo CONTRATADA. Ficam em área privada, nunca em link público, e nunca aparecem para o cliente.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Nome do responsável (assina como CONTRATADA)</Label>
          <Input value={responsibleName} onChange={(e) => onChange('responsible_name', e.target.value)} />
        </div>
        <div>
          <Label>Cargo</Label>
          <Input value={responsibleRole} onChange={(e) => onChange('responsible_role', e.target.value)} placeholder="Responsável Técnico" />
        </div>
      </div>

      <div className="space-y-3">
        {list.map((s) => (
          <div key={s.id} className="rounded-md border border-border p-3 space-y-2">
            <div className="h-24 rounded border border-dashed border-border keep-light bg-card flex items-center justify-center p-2">
              {imgs[s.id] ? <img src={imgs[s.id]!} alt={`Prévia: ${s.name}`} className="max-h-full max-w-full object-contain" /> : <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[180px]">
                <Label className="text-xs">Nome da assinatura</Label>
                <Input value={names[s.id] ?? ''} onChange={(e) => setNames((n) => ({ ...n, [s.id]: e.target.value }))} />
              </div>
              <Button size="sm" variant="outline" disabled={(names[s.id] || '').trim() === s.name || !(names[s.id] || '').trim()} onClick={() => run(() => updateSavedSignature(s.id, { name: names[s.id].trim() }), 'Nome atualizado')}>✏️ Renomear</Button>
              {s.is_default ? (
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-foreground bg-primary rounded px-2 py-1"><Star className="h-4 w-4" />Padrão</span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => run(() => setDefaultSavedSignature(s.id), 'Assinatura padrão definida')}><Star className="h-4 w-4 mr-1" />Usar como padrão</Button>
              )}
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => { if (window.confirm(`Remover "${s.name}"? Contratos já assinados com ela não mudam.`)) run(() => removeSavedSignature(s), 'Assinatura removida'); }}><Trash2 className="h-4 w-4 mr-1" />Remover</Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={s.includes_brand} onCheckedChange={(v) => run(() => updateSavedSignature(s.id, { includes_brand: v }))} />
              Esta imagem já inclui o nome e o risco da empresa
            </label>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma assinatura guardada ainda.</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        <label className={`inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm ${full || busy ? 'opacity-50 pointer-events-none' : 'cursor-pointer hover:bg-accent'}`}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}<Upload className="h-4 w-4" />
          Adicionar assinatura (arquivo PNG)
          <input type="file" accept="image/png" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
        </label>
        <Button type="button" variant="outline" disabled={full || busy} onClick={() => setDrawing(true)}><PenLine className="h-4 w-4 mr-1" />Desenhar e salvar</Button>
      </div>
      <p className="text-xs text-muted-foreground">{list.length}/{MAX_SAVED_SIGNATURES} guardadas. A imagem é mostrada sempre na proporção original.</p>

      {drawing && (
        <SignaturePad
          title="NOVA ASSINATURA SALVA"
          signerName={responsibleName || 'Responsável'}
          contractLabel="Desenhe com calma — ela fica guardada para reusar"
          onCancel={() => setDrawing(false)}
          onConfirm={async (png) => {
            const blob = await (await fetch(png)).blob();
            await add(blob, 'Manuscrita');
            setDrawing(false);
          }}
        />
      )}
    </div>
  );
}
