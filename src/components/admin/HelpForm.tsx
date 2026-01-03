import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2 } from 'lucide-react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export default function HelpForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [faqs, setFaqs] = useState<FAQ[]>([
    { id: '1', question: 'Qual o prazo de entrega?', answer: 'O prazo de entrega varia conforme sua localização. Consulte o frete no carrinho.' },
    { id: '2', question: 'Como acompanhar meu pedido?', answer: 'Você receberá um e-mail com o código de rastreio após o envio.' },
    { id: '3', question: 'Posso trocar ou devolver um produto?', answer: 'Sim, você tem até 7 dias após o recebimento para solicitar troca ou devolução.' },
  ]);

  const [shippingPolicy, setShippingPolicy] = useState('');
  const [returnPolicy, setReturnPolicy] = useState('');

  const addFAQ = () => {
    setFaqs([...faqs, { id: Date.now().toString(), question: '', answer: '' }]);
  };

  const removeFAQ = (id: string) => {
    setFaqs(faqs.filter(faq => faq.id !== id));
  };

  const updateFAQ = (id: string, field: 'question' | 'answer', value: string) => {
    setFaqs(faqs.map(faq => 
      faq.id === id ? { ...faq, [field]: value } : faq
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      toast({
        title: 'Ajuda atualizada',
        description: 'As informações de ajuda foram salvas.',
      });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Perguntas Frequentes (FAQ)</h3>
          <Button type="button" variant="outline" size="sm" onClick={addFAQ}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>

        {faqs.map((faq, index) => (
          <div key={faq.id} className="p-4 rounded-lg border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Pergunta {index + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFAQ(faq.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              <Input
                value={faq.question}
                onChange={(e) => updateFAQ(faq.id, 'question', e.target.value)}
                placeholder="Digite a pergunta..."
              />
            </div>
            <div className="space-y-2">
              <Textarea
                value={faq.answer}
                onChange={(e) => updateFAQ(faq.id, 'answer', e.target.value)}
                placeholder="Digite a resposta..."
                rows={2}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Políticas</h3>

        <div className="space-y-2">
          <Label htmlFor="shippingPolicy">Política de Frete</Label>
          <Textarea
            id="shippingPolicy"
            value={shippingPolicy}
            onChange={(e) => setShippingPolicy(e.target.value)}
            placeholder="Descreva as condições de frete, prazos e regiões atendidas..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="returnPolicy">Política de Trocas e Devoluções</Label>
          <Textarea
            id="returnPolicy"
            value={returnPolicy}
            onChange={(e) => setReturnPolicy(e.target.value)}
            placeholder="Descreva as condições para troca e devolução de produtos..."
            rows={4}
          />
        </div>
      </div>

      <Button type="submit" className="btn-security w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar Informações'}
      </Button>
    </form>
  );
}
