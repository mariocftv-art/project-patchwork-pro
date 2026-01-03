import { useState } from 'react';
import { Truck, MapPin, Loader2, Package } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface ShippingOption {
  type: string;
  name: string;
  price: number;
  days: string;
  isFree?: boolean;
}

interface ShippingCalculatorProps {
  productPrice: number;
}

export default function ShippingCalculator({ productPrice }: ShippingCalculatorProps) {
  const [cep, setCep] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<{ city: string; state: string } | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[] | null>(null);
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
      setShippingOptions(null);
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

      // Simulate shipping options based on region
      const basePrice = getBaseShippingPrice(data.uf);
      const hasFreeShipping = productPrice >= 199;

      const options: ShippingOption[] = [
        {
          type: 'express',
          name: 'Envio Expresso',
          price: hasFreeShipping ? 0 : basePrice + 15,
          days: '1 a 3 dias úteis',
          isFree: hasFreeShipping,
        },
        {
          type: 'standard',
          name: 'Envio Normal',
          price: hasFreeShipping ? 0 : basePrice,
          days: '5 a 8 dias úteis',
          isFree: hasFreeShipping,
        },
        {
          type: 'economic',
          name: 'Envio Econômico',
          price: hasFreeShipping ? 0 : Math.max(basePrice - 10, 9.9),
          days: '10 a 15 dias úteis',
          isFree: hasFreeShipping,
        },
      ];

      setShippingOptions(options);
    } catch {
      setError('Erro ao consultar CEP. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const getBaseShippingPrice = (state: string): number => {
    const regions: Record<string, number> = {
      // Sudeste
      SP: 15, RJ: 18, MG: 20, ES: 22,
      // Sul
      PR: 22, SC: 25, RS: 28,
      // Centro-Oeste
      DF: 25, GO: 28, MT: 32, MS: 30,
      // Nordeste
      BA: 30, SE: 32, AL: 34, PE: 35, PB: 36, RN: 36, CE: 38, PI: 40, MA: 42,
      // Norte
      PA: 45, AM: 50, AP: 52, RR: 55, AC: 55, RO: 48, TO: 40,
    };
    return regions[state] || 35;
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
        <h3 className="font-medium text-foreground">Calcular frete e prazo</h3>
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

      {address && shippingOptions && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-ml-gray">
            Envio para <span className="font-medium text-foreground">{address.city} - {address.state}</span>
          </p>

          <div className="space-y-2">
            {shippingOptions.map((option) => (
              <div
                key={option.type}
                className="flex items-center justify-between p-3 bg-white rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <Package className={`w-5 h-5 ${option.isFree ? 'text-ml-green' : 'text-ml-gray'}`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{option.name}</p>
                    <p className="text-xs text-ml-gray">{option.days}</p>
                  </div>
                </div>
                <div className="text-right">
                  {option.isFree ? (
                    <span className="text-ml-green font-semibold">Grátis</span>
                  ) : (
                    <span className="font-medium text-foreground">
                      R$ {option.price.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!shippingOptions[0].isFree && (
            <p className="text-xs text-ml-green bg-ml-green/10 p-2 rounded">
              💡 Adicione mais R$ {(199 - productPrice).toFixed(2)} para frete grátis!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
