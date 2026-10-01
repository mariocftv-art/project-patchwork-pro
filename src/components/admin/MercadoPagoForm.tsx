import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlugZap } from 'lucide-react';
import { getPaymentSettings, PAYMENT_METHODS, PaymentMethodKey, PaymentSettings } from '@/lib/paymentSettings';

export default function MercadoPagoForm() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [s, setS] = useState<PaymentSettings | null>(null);
  const [token, setToken] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  useEffect(() => { getPaymentSettings().then(setS); }, []);
  if (!s) return <Loader2 className="w-5 h-5 animate-spin" />;

  const toggleMethod = (k: PaymentMethodKey, on: boolean) =>
    setS({ ...s, methods: on ? [...new Set([...s.methods, k])] : s.methods.filter((m) => m !== k) });

  const save = async () => {
    if (s.methods.length === 0) {
      toast({ title: 'Marque ao menos uma forma de pagamento', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (token.trim()) {
        const { data, error } = await supabase.functions.invoke('mp-admin', { body: { action: 'save_token', token: token.trim() } });
        if (error || data?.error) throw new Error(data?.error || 'Falha ao salvar o token');
        s.token_last4 = data.last4;
        setToken('');
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('payment_settings')
        .update({ enabled: s.enabled, mode: s.mode, public_key: s.public_key?.trim() || null, methods: s.methods })
        .eq('id', s.id);
      if (error) throw error;
      setS({ ...s });
      qc.invalidateQueries({ queryKey: ['payment-settings'] });
      toast({ title: 'Pagamento salvo' });
    } catch (e) {
      toast({ title: 'Erro ao salvar', description: e instanceof Error ? e.message : '', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestMsg(null);
    const { data, error } = await supabase.functions.invoke('mp-admin', { body: { action: 'test' } });
    setTesting(false);
    setTestMsg(error ? '❌ Não foi possível testar' : data?.ok ? `✅ Conectado como ${data.account}` : `❌ ${data?.error}`);
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
        <div>
          <Label className="text-base">💳 Mercado Pago</Label>
          <p className="text-sm text-muted-foreground">{s.enabled ? '🟢 Ligado' : '⚪ Desligado — o site pede pelo WhatsApp'}</p>
        </div>
        <Switch checked={s.enabled} onCheckedChange={(v) => setS({ ...s, enabled: v })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-pk">Public Key</Label>
        <Input id="mp-pk" value={s.public_key || ''} onChange={(e) => setS({ ...s, public_key: e.target.value })} placeholder="APP_USR-... ou TEST-..." />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mp-at">Access Token</Label>
        <Input id="mp-at" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)}
          placeholder={s.token_last4 ? `•••• •••• •••• ${s.token_last4} (digite um novo para trocar)` : 'Cole aqui o Access Token'} />
        <p className="text-xs text-muted-foreground">Fica guardado só no servidor. O painel mostra apenas os 4 últimos caracteres.</p>
      </div>

      <div className="space-y-2">
        <Label>Modo</Label>
        <RadioGroup value={s.mode} onValueChange={(v) => setS({ ...s, mode: v as 'sandbox' | 'live' })} className="flex gap-6">
          <div className="flex items-center gap-2"><RadioGroupItem value="sandbox" id="m-t" /><Label htmlFor="m-t">Teste</Label></div>
          <div className="flex items-center gap-2"><RadioGroupItem value="live" id="m-p" /><Label htmlFor="m-p">Produção</Label></div>
        </RadioGroup>
      </div>

      <div className="space-y-2">
        <Label>Formas que eu aceito</Label>
        <div className="grid grid-cols-2 gap-3">
          {PAYMENT_METHODS.map((m) => (
            <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={s.methods.includes(m.key)} onCheckedChange={(v) => toggleMethod(m.key, !!v)} />
              {m.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">O rodapé e o carrinho mostram só as marcadas.</p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}Salvar</Button>
        <Button variant="outline" onClick={test} disabled={testing || !s.token_last4}>
          {testing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <PlugZap className="w-4 h-4 mr-2" />}Testar conexão
        </Button>
        {testMsg && <span className="text-sm">{testMsg}</span>}
      </div>
    </div>
  );
}
