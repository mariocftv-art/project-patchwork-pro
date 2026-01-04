import { useState } from 'react';
import { Truck, MapPin, Loader2, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShippingCalculatorProps {
  productPrice: number;
}

export default function ShippingCalculator({ productPrice }: ShippingCalculatorProps) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<{ city: string; state: string } | null>(null);
  const [error, setError] = useState('');

  const formatCep = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCep(e.target.value);
    if (formatted.length <= 9) {
      setCep(formatted);
      setError('');
      setAddress(null);
    }
  };

  const calculateShipping = async () => {
    const cleanCep = cep.replace(/\D/g, '');
    
    if (cleanCep.length !== 8) {
      setError('CEP inválido. Digite 8 números.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Fetch address from ViaCEP API
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        setError('CEP não encontrado.');
        setLoading(false);
        return;
      }

      setAddress({ city: data.localidade, state: data.uf });
    } catch {
      setError('Erro ao consultar CEP. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      calculateShipping();
    }
  };

  return (
    <div className="bg-secondary rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Truck className="w-5 h-5 text-ml-gray-dark" />
        <h3 className="font-medium text-foreground">Calcular entrega</h3>
      </div>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Digite seu CEP"
            value={cep}
            onChange={handleCepChange}
            onKeyDown={handleKeyDown}
            className="pr-10"
            maxLength={9}
          />
          <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ml-gray" />
        </div>
        <Button
          onClick={calculateShipping}
          disabled={loading || cep.length < 9}
          className="bg-ml-blue hover:bg-ml-blue/90 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'OK'}
        </Button>
      </div>

      <a
        href="https://buscacepinter.correios.com.br/app/endereco/index.php"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-ml-blue hover:underline mt-2 inline-block"
      >
        Não sei meu CEP
      </a>

      {error && (
        <p className="text-destructive text-sm mt-3">{error}</p>
      )}

      {address && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ml-gray">
            Entrega para <span className="font-medium text-foreground">{address.city} - {address.state}</span>
          </p>

          <div className="p-4 bg-white rounded-lg border border-border">
            <div className="flex items-start gap-3">
              <MessageCircle className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Frete a combinar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  O valor do frete será combinado diretamente com o vendedor via WhatsApp após a confirmação do pedido.
                </p>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            💡 Trabalhamos com diversas opções de envio para oferecer o melhor custo-benefício para sua região.
          </div>
        </div>
      )}
    </div>
  );
}
