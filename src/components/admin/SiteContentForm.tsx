import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save } from 'lucide-react';

interface SiteContent {
  categories: string[];
  contact: {
    phone: string;
    email: string;
    whatsapp: string;
    address: string;
  };
  about: {
    title: string;
    description: string;
  };
  footer: {
    copyright: string;
  };
}

const defaultContent: SiteContent = {
  categories: ['Câmeras', 'DVR', 'Cercas', 'Automação', 'Proteção', 'Ofertas'],
  contact: {
    phone: '(11) 96257-9428',
    email: 'contato@mrseguranca.com',
    whatsapp: '5511962579428',
    address: '',
  },
  about: {
    title: 'MR Segurança Máxima',
    description: 'Especialistas em sistemas de segurança eletrônica. Oferecemos as melhores soluções em câmeras, alarmes, cercas elétricas e automação residencial.',
  },
  footer: {
    copyright: '© 2024 MR Segurança. Todos os direitos reservados.',
  },
};

export default function SiteContentForm() {
  const { toast } = useToast();
  const [content, setContent] = useState<SiteContent>(defaultContent);
  const [newCategory, setNewCategory] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('mr_site_content');
    if (saved) {
      setContent(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('mr_site_content', JSON.stringify(content));
    setIsDirty(false);
    toast({
      title: 'Conteúdo salvo!',
      description: 'As alterações foram salvas com sucesso. Recarregue a página para ver as mudanças.',
    });
  };

  const addCategory = () => {
    if (newCategory.trim() && !content.categories.includes(newCategory.trim())) {
      setContent(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory.trim()],
      }));
      setNewCategory('');
      setIsDirty(true);
    }
  };

  const removeCategory = (category: string) => {
    setContent(prev => ({
      ...prev,
      categories: prev.categories.filter(c => c !== category),
    }));
    setIsDirty(true);
  };

  const updateContact = (field: keyof SiteContent['contact'], value: string) => {
    setContent(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value },
    }));
    setIsDirty(true);
  };

  const updateAbout = (field: keyof SiteContent['about'], value: string) => {
    setContent(prev => ({
      ...prev,
      about: { ...prev.about, [field]: value },
    }));
    setIsDirty(true);
  };

  const updateFooter = (field: keyof SiteContent['footer'], value: string) => {
    setContent(prev => ({
      ...prev,
      footer: { ...prev.footer, [field]: value },
    }));
    setIsDirty(true);
  };

  return (
    <div className="space-y-6">
      {/* Categorias */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">📂 Categorias</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {content.categories.map((category) => (
            <div
              key={category}
              className="flex items-center gap-2 bg-secondary px-3 py-1.5 rounded-full"
            >
              <span className="text-sm">{category}</span>
              <button
                onClick={() => removeCategory(category)}
                className="text-destructive hover:text-destructive/80"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nova categoria..."
            onKeyPress={(e) => e.key === 'Enter' && addCategory()}
          />
          <Button onClick={addCategory} variant="outline" size="icon">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Contato */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">📞 Contato</h3>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              value={content.contact.phone}
              onChange={(e) => updateContact('phone', e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div>
            <Label htmlFor="whatsapp">WhatsApp (apenas números com código do país)</Label>
            <Input
              id="whatsapp"
              value={content.contact.whatsapp}
              onChange={(e) => updateContact('whatsapp', e.target.value)}
              placeholder="5511999999999"
            />
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={content.contact.email}
              onChange={(e) => updateContact('email', e.target.value)}
              placeholder="contato@empresa.com"
            />
          </div>
          <div>
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={content.contact.address}
              onChange={(e) => updateContact('address', e.target.value)}
              placeholder="Rua, número - Cidade/UF"
            />
          </div>
        </div>
      </div>

      {/* Sobre */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">ℹ️ Sobre Nós</h3>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="aboutTitle">Título</Label>
            <Input
              id="aboutTitle"
              value={content.about.title}
              onChange={(e) => updateAbout('title', e.target.value)}
              placeholder="Nome da empresa"
            />
          </div>
          <div>
            <Label htmlFor="aboutDesc">Descrição</Label>
            <Textarea
              id="aboutDesc"
              value={content.about.description}
              onChange={(e) => updateAbout('description', e.target.value)}
              placeholder="Descreva sua empresa..."
              rows={4}
            />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">📄 Rodapé</h3>
        <div>
          <Label htmlFor="copyright">Texto de Copyright</Label>
          <Input
            id="copyright"
            value={content.footer.copyright}
            onChange={(e) => updateFooter('copyright', e.target.value)}
            placeholder="© 2024 Empresa. Todos os direitos reservados."
          />
        </div>
      </div>

      <Button
        onClick={handleSave}
        disabled={!isDirty}
        className="btn-security w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        Salvar Alterações
      </Button>
    </div>
  );
}

// Hook para usar o conteúdo do site em outros componentes
export function useSiteContent(): SiteContent {
  const [content, setContent] = useState<SiteContent>(defaultContent);

  useEffect(() => {
    const saved = localStorage.getItem('mr_site_content');
    if (saved) {
      setContent(JSON.parse(saved));
    }
  }, []);

  return content;
}
