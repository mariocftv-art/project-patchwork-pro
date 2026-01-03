import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function AboutForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [companyName, setCompanyName] = useState('MR Segurança Máxima');
  const [slogan, setSlogan] = useState('Protegendo o que é mais importante para você');
  const [history, setHistory] = useState('');
  const [mission, setMission] = useState('');
  const [vision, setVision] = useState('');
  const [values, setValues] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [foundedYear, setFoundedYear] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    setTimeout(() => {
      toast({
        title: 'Sobre atualizado',
        description: 'As informações sobre a empresa foram salvas.',
      });
      setIsSubmitting(false);
    }, 500);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">Informações da Empresa</h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="companyName">Nome da Empresa</Label>
            <Input
              id="companyName"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nome da sua empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="foundedYear">Ano de Fundação</Label>
            <Input
              id="foundedYear"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value)}
              placeholder="2020"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ</Label>
            <Input
              id="cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              value={slogan}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="Frase de efeito da sua marca"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="font-semibold text-foreground">História e Valores</h3>

        <div className="space-y-2">
          <Label htmlFor="history">Nossa História</Label>
          <Textarea
            id="history"
            value={history}
            onChange={(e) => setHistory(e.target.value)}
            placeholder="Conte a história da sua empresa, como surgiu, sua trajetória..."
            rows={4}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mission">Missão</Label>
          <Textarea
            id="mission"
            value={mission}
            onChange={(e) => setMission(e.target.value)}
            placeholder="Qual é a missão da sua empresa?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vision">Visão</Label>
          <Textarea
            id="vision"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Qual é a visão de futuro da sua empresa?"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="values">Valores</Label>
          <Textarea
            id="values"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="Quais são os valores que guiam sua empresa? (Ex: Qualidade, Confiança, Inovação...)"
            rows={2}
          />
        </div>
      </div>

      <Button type="submit" className="btn-security w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Salvando...' : 'Salvar Informações'}
      </Button>
    </form>
  );
}
