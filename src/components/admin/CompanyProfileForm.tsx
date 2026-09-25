import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  CompanyProfile,
  DEFAULT_ADMIN_TEMPLATE,
  DEFAULT_CUSTOMER_TEMPLATE,
  defaultCompanyProfile,
  getCompanyProfile,
  saveCompanyProfile,
} from '@/lib/companyProfile';
import { WHATSAPP_VARIABLES } from '@/lib/whatsappTemplates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Building2, Palette, FileText, MessageCircle, Loader2, Upload } from 'lucide-react';

export default function CompanyProfileForm() {
  const { toast } = useToast();
  const [profile, setProfile] = useState<CompanyProfile>(defaultCompanyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    getCompanyProfile(true)
      .then(setProfile)
      .finally(() => setLoading(false));
  }, []);

  const set = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const handleLogoUpload = async (file: File) => {
    setUploading(true);
    try {
      const fileName = `logos/logo-${Date.now()}-${file.name.replace(/[^\w.-]/g, '')}`;
      const { error } = await supabase.storage
        .from('service-photos')
        .upload(fileName, file, { upsert: true, cacheControl: '3600' });
      if (error) throw error;
      const url = supabase.storage.from('service-photos').getPublicUrl(fileName).data.publicUrl;
      set('logo_url', url);
      toast({ title: 'Logo carregada', description: 'Salve para aplicar no PDF.' });
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro ao enviar a logo', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveCompanyProfile(profile);
      setProfile(saved);
      toast({ title: 'Personalização salva!', description: 'Já vale para os próximos PDFs e mensagens.' });
    } catch (e) {
      console.error(e);
      toast({
        title: 'Erro ao salvar',
        description: 'Verifique suas permissões de administrador.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="company" className="gap-2"><Building2 className="w-4 h-4" /> Dados da empresa</TabsTrigger>
          <TabsTrigger value="brand" className="gap-2"><Palette className="w-4 h-4" /> Identidade visual</TabsTrigger>
          <TabsTrigger value="pdf" className="gap-2"><FileText className="w-4 h-4" /> Orçamento / PDF</TabsTrigger>
          <TabsTrigger value="whatsapp" className="gap-2"><MessageCircle className="w-4 h-4" /> WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome da empresa</Label>
            <Input value={profile.name} onChange={(e) => set('name', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição curta (subtítulo do PDF)</Label>
            <Input value={profile.tagline} onChange={(e) => set('tagline', e.target.value)} />
          </div>
          <div>
            <Label>CNPJ</Label>
            <Input value={profile.cnpj} onChange={(e) => set('cnpj', e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={profile.phone} onChange={(e) => set('phone', e.target.value)} />
          </div>
          <div>
            <Label>WhatsApp (só números, com 55)</Label>
            <Input value={profile.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="5511962579428" />
          </div>
          <div>
            <Label>Responsável / técnico</Label>
            <Input value={profile.responsible_name} onChange={(e) => set('responsible_name', e.target.value)} />
          </div>
          <div>
            <Label>E-mail</Label>
            <Input value={profile.email} onChange={(e) => set('email', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={profile.address} onChange={(e) => set('address', e.target.value)} />
          </div>
          <div>
            <Label>Cidade</Label>
            <Input value={profile.city} onChange={(e) => set('city', e.target.value)} />
          </div>
          <div>
            <Label>Estado</Label>
            <Input value={profile.state} maxLength={2} onChange={(e) => set('state', e.target.value.toUpperCase())} />
          </div>
          <div className="sm:col-span-2">
            <Label>Site</Label>
            <Input value={profile.website} onChange={(e) => set('website', e.target.value)} placeholder="www.mrseguranca.com.br" />
          </div>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start">
            <div className="w-32 h-32 rounded-lg border border-border bg-secondary flex items-center justify-center overflow-hidden">
              {profile.logo_url ? (
                <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-foreground text-center px-2">Logo padrão da loja</span>
              )}
            </div>
            <div className="space-y-2">
              <Label>Logo do orçamento</Label>
              <p className="text-sm text-muted-foreground">PNG com fundo transparente funciona melhor.</p>
              <div className="flex gap-2 items-center">
                <Input
                  type="file"
                  accept="image/*"
                  className="max-w-xs"
                  onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                />
                {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
                {!uploading && <Upload className="h-4 w-4 text-muted-foreground" />}
              </div>
              {profile.logo_url && (
                <Button variant="ghost" size="sm" onClick={() => set('logo_url', null)}>
                  Voltar para a logo padrão
                </Button>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {([
              ['primary_color', 'Cor primária'],
              ['secondary_color', 'Cor secundária'],
              ['accent_color', 'Cor de destaque'],
              ['pdf_gold_color', 'PDF: dourado'],
              ['pdf_red_color', 'PDF: vermelho'],
            ] as Array<[keyof CompanyProfile, string]>).map(([key, label]) => (
              <div key={key as string}>
                <Label>{label}</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    className="w-14 p-1 h-10"
                    value={String(profile[key] || '#1E3A8A')}
                    onChange={(e) => set(key, e.target.value as never)}
                  />
                  <Input
                    value={String(profile[key] || '')}
                    onChange={(e) => set(key, e.target.value as never)}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cores muito claras são ajustadas automaticamente no PDF para não prejudicar a leitura.
          </p>
        </TabsContent>

        <TabsContent value="pdf" className="space-y-4">
          <div className="max-w-xs">
            <Label>Validade padrão do orçamento (dias)</Label>
            <Input
              type="number"
              min={1}
              value={profile.quote_validity_days}
              onChange={(e) => set('quote_validity_days', Number(e.target.value) || 1)}
            />
          </div>
          <div>
            <Label>Observações do orçamento (uma por linha)</Label>
            <Textarea
              rows={5}
              value={profile.pdf_notes_text}
              onChange={(e) => set('pdf_notes_text', e.target.value)}
            />
          </div>
          <div>
            <Label>Frase do rodapé (PDF premium)</Label>
            <Input value={profile.footer_slogan} onChange={(e) => set('footer_slogan', e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Garantia padrão</Label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={profile.default_warranty}
                onChange={(e) => set('default_warranty', e.target.value)}
              >
                <option value="">Não definir (escolher em cada orçamento)</option>
                <option value="none">Sem garantia</option>
                <option value="3m">3 meses</option>
                <option value="6m">6 meses</option>
                <option value="1y">1 ano</option>
              </select>
            </div>
            <div>
              <Label>Texto padrão da garantia</Label>
              <Textarea rows={2} value={profile.default_warranty_text} onChange={(e) => set('default_warranty_text', e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Texto do rodapé do PDF</Label>
            <Input
              value={profile.pdf_footer_text}
              onChange={(e) => set('pdf_footer_text', e.target.value)}
              placeholder="Deixe vazio para usar os dados de contato da empresa"
            />
          </div>
        </TabsContent>

        <TabsContent value="whatsapp" className="space-y-4">
          <div className="rounded-lg border border-border bg-secondary/60 p-4">
            <p className="text-sm font-medium mb-2">Variáveis disponíveis</p>
            <div className="flex flex-wrap gap-1.5">
              {WHATSAPP_VARIABLES.map((v) => (
                <code key={v} className="text-xs bg-background border border-border rounded px-1.5 py-0.5">
                  {v}
                </code>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Mensagem para o cliente</Label>
              <Button variant="ghost" size="sm" onClick={() => set('whatsapp_customer_template', DEFAULT_CUSTOMER_TEMPLATE)}>
                Restaurar padrão
              </Button>
            </div>
            <Textarea
              rows={12}
              value={profile.whatsapp_customer_template}
              onChange={(e) => set('whatsapp_customer_template', e.target.value)}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Mensagem para a empresa / administrador</Label>
              <Button variant="ghost" size="sm" onClick={() => set('whatsapp_admin_template', DEFAULT_ADMIN_TEMPLATE)}>
                Restaurar padrão
              </Button>
            </div>
            <Textarea
              rows={12}
              value={profile.whatsapp_admin_template}
              onChange={(e) => set('whatsapp_admin_template', e.target.value)}
            />
          </div>
        </TabsContent>
      </Tabs>

      <Button onClick={handleSave} disabled={saving} className="btn-security">
        {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar personalização'}
      </Button>
    </div>
  );
}
