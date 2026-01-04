import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Camera, Shield, Zap, Lock, Wifi, Phone, CheckCircle, Wrench, Settings, Home, Eye, type LucideIcon } from 'lucide-react';

interface InstallationService {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  features: string[];
  display_order: number;
  active: boolean;
}

const iconMap: Record<string, LucideIcon> = {
  Camera,
  Shield,
  Zap,
  Lock,
  Wifi,
  Phone,
  Wrench,
  Settings,
  Home,
  Eye,
};

export default function Services() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ['installation-services-public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installation_services')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as InstallationService[];
    },
  });

  const { data: servicePhotos = [] } = useQuery({
    queryKey: ['service-photos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_photos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.service) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Nome, telefone e serviço são obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const serviceName = services.find(s => s.id === formData.service)?.title || formData.service;
    const message = `Olá! Gostaria de solicitar um orçamento.

*Nome:* ${formData.name}
*Email:* ${formData.email || 'Não informado'}
*Telefone:* ${formData.phone}
*Serviço:* ${serviceName}
*Mensagem:* ${formData.message || 'Sem mensagem adicional'}`;

    const whatsappUrl = `https://wa.me/5511962579428?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: 'Redirecionando para WhatsApp',
      description: 'Complete o envio no WhatsApp para finalizar seu pedido de orçamento.',
    });

    setFormData({ name: '', email: '', phone: '', service: '', message: '' });
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-8 md:p-12 text-center">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
          Nossos Serviços de Instalação
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Profissionais qualificados para instalação e manutenção de sistemas de segurança. 
          Solicite um orçamento sem compromisso!
        </p>
      </section>

      {/* Services Grid */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
          O que oferecemos
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => {
            const IconComponent = iconMap[service.icon] || Camera;
            return (
              <div
                key={service.id}
                className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-lg hover:border-primary/50 transition-all"
              >
                {service.image_url ? (
                  <div className="aspect-video w-full overflow-hidden">
                    <img 
                      src={service.image_url} 
                      alt={service.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full bg-primary/5 flex items-center justify-center">
                    <IconComponent className="w-16 h-16 text-primary/30" />
                  </div>
                )}
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {service.title}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    {service.description}
                  </p>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service Photos Gallery */}
      {servicePhotos.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Trabalhos Realizados
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {servicePhotos.map((photo) => (
              <div key={photo.id} className="relative group rounded-xl overflow-hidden aspect-video">
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                  <div>
                    <p className="text-white font-medium text-sm">{photo.title}</p>
                    {photo.description && (
                      <p className="text-white/80 text-xs">{photo.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Quote Form */}
      <section className="bg-card border border-border rounded-2xl p-8 md:p-12">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            Solicite um Orçamento
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Preencha o formulário abaixo e entraremos em contato rapidamente.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Seu nome"
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 99999-9999"
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="seu@email.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="service">Serviço desejado *</Label>
                <Select
                  value={formData.service}
                  onValueChange={(value) => setFormData({ ...formData, service: value })}
                >
                  <SelectTrigger className="mt-1 bg-background">
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.title}
                      </SelectItem>
                    ))}
                    <SelectItem value="outro">Outro serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="message">Mensagem (opcional)</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Descreva detalhes sobre o que precisa, local de instalação, etc."
                className="mt-1"
                rows={4}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full btn-security text-lg py-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Enviando...' : 'Solicitar Orçamento via WhatsApp'}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao enviar, você será redirecionado para o WhatsApp para completar sua solicitação.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
