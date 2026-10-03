import { useRef, useState } from 'react';
import { ImagePlus, Loader2, RefreshCw, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { uploadDocImage } from '@/lib/serviceDefaults';

/** Upload de foto (computador ou celular) com miniatura, trocar/remover e opção de colar link. */
export default function ImageUploadField({ value, onChange }: { value?: string | null; onChange: (url: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const pick = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast({ title: 'Escolha um arquivo de imagem', variant: 'destructive' });
    if (f.size > 5 * 1024 * 1024) return toast({ title: 'Imagem muito grande', description: 'Máximo 5 MB.', variant: 'destructive' });
    setBusy(true);
    try {
      onChange(await uploadDocImage(f));
    } catch {
      toast({ title: 'Não foi possível enviar a imagem', variant: 'destructive' });
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {value ? <img src={value} alt="" className="h-12 w-12 rounded border border-border object-cover" /> : null}
      <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => ref.current?.click()}>
        {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : value ? <RefreshCw className="h-4 w-4 mr-1" /> : <ImagePlus className="h-4 w-4 mr-1" />}
        {value ? 'Trocar foto' : 'Enviar foto'}
      </Button>
      {value && <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => onChange(undefined)}><X className="h-4 w-4 mr-1" />Remover</Button>}
      <Button type="button" size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={() => setShowLink((v) => !v)}><Link2 className="h-3 w-3 mr-1" />Colar link</Button>
      {showLink && <Input className="h-8 text-xs flex-1 min-w-[180px]" placeholder="https://..." value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} />}
    </div>
  );
}
