import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function PaymentSettingsForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [pixKey, setPixKey] = useState('');
  const [pixName, setPixName] = useState('');
  const [boletoInstructions, setBoletoInstructions] = useState('');
  const [creditCardEnabled, setCreditCardEnabled] = useState(true);
  const [pixEnabled, setPixEnabled] = useState(true);
  const [boletoEnabled, setBoletoEnabled] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate save - in production this would save to database
    setTimeout(() => {
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de pagamento foram atualizadas.',
      });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Métodos de Pagamento</h3>
        
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base">Cartão de Crédito</Label>
            <p className="text-sm text-muted-foreground">Aceitar pagamentos via cartão</p>
          </div>
          <Switch checked={creditCardEnabled} onCheckedChange={setCreditCardEnabled} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base">PIX</Label>
            <p className="text-sm text-muted-foreground">Aceitar pagamentos via PIX</p>
          </div>
          <Switch checked={pixEnabled} onCheckedChange={setPixEnabled} />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <Label className="text-base">Boleto Bancário</Label>
            <p className="text-sm text-muted-foreground">Aceitar pagamentos via boleto</p>
          </div>
          <Switch checked={boletoEnabled} onCheckedChange={setBoletoEnabled} />
        </div>
      </div>

      {pixEnabled && (
        <div className="space-y-4 p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-foreground">Configurações do PIX</h3>
          
          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave PIX</Label>
            <Input
              id="pixKey"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
              placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixName">Nome do Beneficiário</Label>
            <Input
              id="pixName"
              value={pixName}
              onChange={(e) => setPixName(e.target.value)}
              placeholder="Nome que aparecerá no PIX"
            />
          </div>
        </div>
      )}

      {boletoEnabled && (
        <div className="space-y-4 p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-foreground">Configurações do Boleto</h3>
          
          <div className="space-y-2">
            <Label htmlFor="boletoInstructions">Instruções do Boleto</Label>
            <Textarea
              id="boletoInstructions"
              value={boletoInstructions}
              onChange={(e) => setBoletoInstructions(e.target.value)}
              placeholder="Instruções que aparecerão no boleto (multa, juros, etc.)"
              rows={3}
            />
          </div>
        </div>
      )}

      <Button type="submit" className="btn-security w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </form>
  );
}
