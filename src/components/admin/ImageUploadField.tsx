import { useRef, useState } from 'react';
import { FolderOpen, Camera, Images, Loader2, RefreshCw, X, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { uploadImage } from '@/lib/imageUpload';

interface Props {
  value?: string | null;
  onChange: (url: string | undefined) => void;
  bucket?: string;
  folder?: string;
  /** compacto = linha única (itens de orçamento); padrão = caixa de arrastar */
  compact?: boolean;
  label?: string;
}

/** Campo de foto: escolher arquivo, arrastar, tirar foto ou galeria (celular). Comprime, mostra progresso, miniatura, trocar/remover; link é opção secundária. */
export default function ImageUploadField({ value, onChange, bucket, folder, compact, label }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const busy = pct !== null;

  const pick = async (f?: File) => {
    if (!f || busy) return;
    setPct(0);
    try {
      onChange(await uploadImage(f, { bucket, folder, onProgress: setPct }));
    } catch (e) {
      toast({ title: 'Não foi possível enviar a foto', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setPct(null);
      if (fileRef.current) fileRef.current.value = '';
      if (camRef.current) camRef.current.value = '';
    }
  };

  const inputs = (
    <>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </>
  );

  const progress = busy && (
    <div className="w-full space-y-1">
      <Progress value={pct} className="h-2" />
      <p className="text-xs text-muted-foreground">Enviando… {pct}%</p>
    </div>
  );

  const linkRow = (
    <>
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground" onClick={() => setShowLink((v) => !v)}>
        <Link2 className="h-3 w-3 mr-1" />Já tenho um link
      </Button>
      {showLink && <Input className="h-8 text-xs w-full" placeholder="https://..." value={value || ''} onChange={(e) => onChange(e.target.value || undefined)} />}
    </>
  );

  if (value) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {inputs}
        <img src={value} alt={label || 'Foto enviada'} className={`${compact ? 'h-12 w-12' : 'h-20 w-20'} rounded border border-border object-cover bg-muted`} />
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}Trocar
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-8" disabled={busy} onClick={() => onChange(undefined)}><X className="h-4 w-4 mr-1" />Remover</Button>
        {progress}
        {!compact && linkRow}
      </div>
    );
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {inputs}
        <Button type="button" size="sm" variant="outline" className="h-8" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FolderOpen className="h-4 w-4 mr-1" />}Enviar foto
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-8 sm:hidden" disabled={busy} onClick={() => camRef.current?.click()}><Camera className="h-4 w-4 mr-1" />Tirar foto</Button>
        {progress}
        {linkRow}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {inputs}
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={`rounded-lg border-2 border-dashed p-3 flex flex-col items-center gap-2 text-center ${drag ? 'border-primary bg-primary/10' : 'border-border'}`}
      >
        {busy ? progress : (
          <>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" size="sm" variant="outline" className="hidden sm:inline-flex" onClick={() => fileRef.current?.click()}><FolderOpen className="h-4 w-4 mr-1" />Escolher arquivo</Button>
              <Button type="button" size="sm" variant="outline" className="sm:hidden" onClick={() => camRef.current?.click()}><Camera className="h-4 w-4 mr-1" />Tirar foto</Button>
              <Button type="button" size="sm" variant="outline" className="sm:hidden" onClick={() => fileRef.current?.click()}><Images className="h-4 w-4 mr-1" />Escolher da galeria</Button>
            </div>
            <p className="text-xs text-muted-foreground hidden sm:block">ou arraste a foto aqui · JPG, PNG ou WebP até 10 MB</p>
            <p className="text-xs text-muted-foreground sm:hidden">JPG, PNG ou WebP até 10 MB</p>
          </>
        )}
      </div>
      {linkRow}
    </div>
  );
}
