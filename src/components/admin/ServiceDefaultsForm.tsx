import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { TECH_SERVICES, listServiceDefaults, saveServiceDefault, ServiceDefault } from '@/lib/serviceDefaults';
import ImageUploadField from './ImageUploadField';

/** Foto e valor padrão de cada Serviço Técnico Especializado usado nos orçamentos/contratos. */
export default function ServiceDefaultsForm() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['service-defaults'], queryFn: listServiceDefaults });
  const [rows, setRows] = useState<Record<string, ServiceDefault>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    const m: Record<string, ServiceDefault> = {};
    for (const d of data) m[d.name] = d;
    setRows(m);
  }, [data]);

  const get = (name: string) => rows[name] || { name, price: 0, image_url: null };
  const upd = (name: string, patch: Partial<ServiceDefault>) => setRows((r) => ({ ...r, [name]: { ...get(name), ...patch } }));
  const save = async (name: string) => {
    setSaving(name);
    try {
      await saveServiceDefault(get(name));
      qc.invalidateQueries({ queryKey: ['service-defaults'] });
      toast({ title: 'Serviço salvo', description: name });
    } catch {
      toast({ title: 'Não foi possível salvar', variant: 'destructive' });
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Cadastre uma vez a foto e o valor de cada serviço. Ao escolher o serviço no orçamento ou contrato, eles entram sozinhos — e você pode trocar na hora.</p>
      {Object.entries(TECH_SERVICES).map(([g, list]) => (
        <div key={g} className="space-y-2">
          <h3 className="font-semibold text-foreground">Serviços de {g}</h3>
          {list.map((name) => {
            const r = get(name);
            return (
              <div key={name} className="rounded-md border border-border p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex-1 min-w-[180px] text-sm font-medium">{name}</span>
                  <span className="text-xs text-muted-foreground">R$</span>
                  <Input className="h-8 w-28" type="number" min={0} step="0.01" value={r.price || ''} placeholder="0,00" onChange={(e) => upd(name, { price: Number(e.target.value) })} />
                  <Button size="sm" className="h-8" disabled={saving === name} onClick={() => save(name)}>
                    {saving === name ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}Salvar
                  </Button>
                </div>
                <ImageUploadField value={r.image_url} onChange={(url) => upd(name, { image_url: url || null })} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
