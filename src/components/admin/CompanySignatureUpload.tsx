import { useEffect, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { getCompanySignature, uploadCompanySignature } from '@/lib/contractSignatures';

/** Assinatura da empresa (PNG com fundo transparente), guardada em área privada. */
export default function CompanySignatureUpload() {
  const { toast } = useToast();
  const [img, setImg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { getCompanySignature().then(setImg); }, []);

  const onFile = async (f?: File) => {
    if (!f) return;
    if (f.type !== 'image/png') return toast({ title: 'Envie um arquivo PNG', description: 'De preferência com fundo transparente.', variant: 'destructive' });
    setBusy(true);
    try {
      await uploadCompanySignature(f);
      setImg(await getCompanySignature());
      toast({ title: 'Assinatura salva', description: 'Use "Aplicar minha assinatura" nos contratos.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Não foi possível salvar a assinatura', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2 rounded-lg border border-border p-3 space-y-2">
      <Label>Assinatura da empresa (PNG com fundo transparente)</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div className="h-16 w-48 rounded border border-dashed border-border bg-background flex items-center justify-center">
          {img ? <img src={img} alt="Assinatura salva da empresa" className="max-h-14 max-w-full" /> : <span className="text-xs text-muted-foreground">Nenhuma assinatura</span>}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer rounded-md border border-input px-3 py-2 text-sm hover:bg-accent">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {img ? 'Trocar assinatura' : 'Enviar assinatura'}
          <input type="file" accept="image/png" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">Fica guardada em área privada (só administradores). Vai no campo CONTRATADA com o nome do responsável acima e a data.</p>
    </div>
  );
}
