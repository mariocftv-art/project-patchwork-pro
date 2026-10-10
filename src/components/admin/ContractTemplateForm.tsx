import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import ClauseListEditor from './ClauseListEditor';
import { cloneClauses, DEFAULT_CLAUSES, formatVersion, loadContractTemplate, saveContractTemplate, type ContractClause } from '@/lib/contractClauses';

/** Personalização → Modelo de contrato. Contratos já feitos não mudam: cada um guarda o próprio texto. */
export default function ContractTemplateForm() {
  const [id, setId] = useState<string | null>(null);
  const [clauses, setClauses] = useState<ContractClause[] | null>(null);
  const [version, setVersion] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadContractTemplate().then((t) => { setId(t.id); setClauses(t.clauses); setVersion(t.version); });
  }, []);

  const save = async (c: ContractClause[] | null) => {
    if (!id) return toast({ title: 'Salve primeiro os dados da empresa', variant: 'destructive' });
    setBusy(true);
    try {
      await saveContractTemplate(id, c);
      const t = await loadContractTemplate();
      setClauses(t.clauses); setVersion(t.version);
      toast({ title: c ? 'Modelo de contrato salvo' : 'Modelo padrão restaurado' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: (e as Error).message, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  if (!clauses) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold">Modelo de contrato</h3>
        <p className="text-sm text-muted-foreground">Versão do modelo: {formatVersion(version)}. Vale para contratos novos; os já feitos e assinados não mudam.</p>
      </div>
      <ClauseListEditor clauses={clauses} onChange={setClauses} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy} onClick={() => save(clauses)}>{busy && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Salvar modelo</Button>
        <Button type="button" variant="outline" disabled={busy} onClick={() => { if (confirm('Voltar ao texto padrão das cláusulas?')) { setClauses(cloneClauses(DEFAULT_CLAUSES)); save(null); } }}>
          Restaurar modelo padrão
        </Button>
      </div>
    </div>
  );
}
