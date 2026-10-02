import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Edit2, ArrowUp, ArrowDown, Upload, X, ImageIcon } from 'lucide-react';
import { ServiceItem, PriceType, ServiceUnit, UNIT_OPTIONS, unitInfo, servicesApi, servicePriceLabel } from '@/lib/servicesApi';
import { productsApi } from '@/lib/supabaseApi';
import { formatBRL } from '@/lib/formatCurrency';
import { Camera, Shield, Zap, Lock, Wifi, Phone, Wrench, Settings, Home, Eye } from 'lucide-react';

type InstallationService = ServiceItem & { image_illustrative?: boolean };

const iconOptions = [
  { value: 'Camera', label: 'Câmera', icon: Camera },
  { value: 'Shield', label: 'Escudo', icon: Shield },
  { value: 'Zap', label: 'Raio', icon: Zap },
  { value: 'Lock', label: 'Cadeado', icon: Lock },
  { value: 'Wifi', label: 'Wi-Fi', icon: Wifi },
  { value: 'Phone', label: 'Telefone', icon: Phone },
  { value: 'Wrench', label: 'Ferramenta', icon: Wrench },
  { value: 'Settings', label: 'Engrenagem', icon: Settings },
  { value: 'Home', label: 'Casa', icon: Home },
  { value: 'Eye', label: 'Olho', icon: Eye },
];

interface ServiceFormProps {
  service?: InstallationService | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const lines = (t: string) => t.split('\n').map((x) => x.trim()).filter(Boolean);

function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(service?.image_url || null);
  const [relSearch, setRelSearch] = useState('');

  const [f, setF] = useState({
    title: service?.title || '',
    summary: service?.summary ?? service?.description ?? '',
    description: service?.description || '',
    included: (service?.features || []).join('\n'),
    excluded: (service?.excluded || []).join('\n'),
    conditions: (service?.conditions?.length ? service.conditions : []) as { label: string; value: string }[],
    price: service?.price != null ? String(service.price) : '',
    price_type: (service?.price_type || 'consulta') as PriceType,
    unit: (service?.unit || 'servico') as ServiceUnit,
    min_qty: service?.min_qty != null ? String(service.min_qty) : '',
    active: service?.active ?? true,
    promo_enabled: service?.promo_enabled ?? false,
    promo_price: service?.promo_price != null ? String(service.promo_price) : '',
    promo_until: service?.promo_until ? service.promo_until.slice(0, 10) : '',
    related_ids: service?.related_ids || [],
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((o) => ({ ...o, [k]: v }));

  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: () => productsApi.list() });

  const normal = Number(f.price || 0);
  const promo = Number(f.promo_price || 0);
  const promoInvalid = f.promo_enabled && (!(promo > 0) || promo >= normal);
  const pct = normal > 0 && promo > 0 && promo < normal ? Math.round((1 - promo / normal) * 100) : 0;

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('service-photos').upload(fileName, file);
    if (uploadError) throw uploadError;
    return supabase.storage.from('service-photos').getPublicUrl(fileName).data.publicUrl;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.title.trim()) return toast({ title: 'O título é obrigatório.', variant: 'destructive' });
    if (f.price_type !== 'consulta' && !(normal > 0)) return toast({ title: 'Informe o preço ou escolha "Sob consulta".', variant: 'destructive' });
    if (promoInvalid) return toast({ title: 'O preço promocional precisa ser menor', variant: 'destructive' });

    setIsSubmitting(true);
    try {
      let image_url = service?.image_url || null;
      let image_illustrative = service?.image_illustrative ?? false;
      if (imageFile) { image_url = await uploadImage(imageFile); image_illustrative = false; }
      else if (!imagePreview) image_url = null;

      const payload = {
        title: f.title.trim(),
        summary: f.summary.trim() || null,
        description: f.description.trim() || f.summary.trim() || null,
        features: lines(f.included),
        excluded: lines(f.excluded),
        conditions: f.conditions.map((c) => ({ label: c.label.trim(), value: c.value.trim() })).filter((c) => c.label && c.value),
        price: f.price === '' ? null : normal,
        price_type: f.price_type,
        unit: f.unit,
        min_qty: f.min_qty === '' ? null : Math.max(1, parseInt(f.min_qty, 10) || 1),
        active: f.active,
        promo_enabled: f.promo_enabled,
        promo_price: f.promo_price === '' ? null : promo,
        promo_until: f.promo_until ? `${f.promo_until}T23:59:59-03:00` : null,
        related_ids: f.related_ids,
        image_url,
        image_illustrative,
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tbl = supabase.from('installation_services') as any;
      if (service) {
        const { error } = await tbl.update(payload).eq('id', service.id);
        if (error) throw error;
        toast({ title: 'Serviço atualizado com sucesso!' });
      } else {
        const { data: existing } = await supabase.from('installation_services').select('display_order').order('display_order', { ascending: false }).limit(1);
        const { error } = await tbl.insert({ ...payload, icon: 'Camera', display_order: (existing?.[0]?.display_order || 0) + 1 });
        if (error) throw error;
        toast({ title: 'Serviço criado com sucesso!' });
      }
      onSuccess();
    } catch (error) {
      console.error(error);
      toast({ title: 'Erro ao salvar serviço', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const relList = products.filter((p) => !relSearch || p.title.toLowerCase().includes(relSearch.toLowerCase())).slice(0, 40);
  const sel = 'mt-1 h-10 w-full rounded-md border border-input bg-background px-2 text-sm';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Foto do serviço</Label>
        <div className="flex items-start gap-4 mt-2">
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-2" />{imagePreview ? 'Trocar foto' : 'Escolher foto'}
          </Button>
          {imagePreview ? (
            <div className="relative w-24 h-24">
              <img src={imagePreview} alt="Prévia" className="w-full h-full object-cover rounded-lg border" />
              <Button type="button" variant="destructive" size="icon" className="absolute -top-2 -right-2 w-6 h-6" onClick={() => { setImageFile(null); setImagePreview(null); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border border-dashed"><ImageIcon className="w-8 h-8 text-muted-foreground" /></div>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Título *</Label>
        <Input id="title" value={f.title} onChange={(e) => set('title', e.target.value)} className="mt-1" placeholder="Ex: Instalação de Câmeras" />
      </div>
      <div>
        <Label htmlFor="summary">Resumo (2 linhas)</Label>
        <Textarea id="summary" value={f.summary} onChange={(e) => set('summary', e.target.value)} className="mt-1" rows={2} />
      </div>
      <div>
        <Label htmlFor="description">Descrição completa (opcional)</Label>
        <Textarea id="description" value={f.description} onChange={(e) => set('description', e.target.value)} className="mt-1" rows={3} />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="included">O que está incluso (uma por linha)</Label>
          <Textarea id="included" value={f.included} onChange={(e) => set('included', e.target.value)} className="mt-1" rows={4} />
        </div>
        <div>
          <Label htmlFor="excluded">O que NÃO está incluso (uma por linha)</Label>
          <Textarea id="excluded" value={f.excluded} onChange={(e) => set('excluded', e.target.value)} className="mt-1" rows={4} />
        </div>
      </div>

      <div>
        <Label>Condições (prazo, garantia, região atendida)</Label>
        <div className="space-y-2 mt-1">
          {f.conditions.map((c, i) => (
            <div key={i} className="flex gap-2">
              <Input placeholder="Característica" value={c.label} onChange={(e) => set('conditions', f.conditions.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
              <Input placeholder="Valor" value={c.value} onChange={(e) => set('conditions', f.conditions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover linha" onClick={() => set('conditions', f.conditions.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => set('conditions', [...f.conditions, { label: '', value: '' }])}><Plus className="w-4 h-4 mr-1" />Adicionar linha</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price_type">Tipo de preço</Label>
          <select id="price_type" className={sel} value={f.price_type} onChange={(e) => set('price_type', e.target.value as PriceType)}>
            <option value="fixo">Valor fixo</option>
            <option value="a_partir">A partir de</option>
            <option value="consulta">Sob consulta</option>
          </select>
        </div>
        <div>
          <Label htmlFor="price">Preço (R$)</Label>
          <Input id="price" type="number" step="0.01" min="0" value={f.price} disabled={f.price_type === 'consulta'} onChange={(e) => set('price', e.target.value)} className="mt-1" placeholder="130.00" />
        </div>
        <div>
          <Label htmlFor="unit">Unidade de cobrança</Label>
          <select id="unit" className={sel} value={f.unit} onChange={(e) => set('unit', e.target.value as ServiceUnit)}>
            {UNIT_OPTIONS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>
        <div>
          <Label htmlFor="min_qty">Quantidade mínima (opcional)</Label>
          <Input id="min_qty" type="number" min="1" value={f.min_qty} onChange={(e) => set('min_qty', e.target.value)} className="mt-1" />
        </div>
      </div>
      {f.price_type !== 'consulta' && normal > 0 && (
        <p className="text-sm text-muted-foreground">No site: <strong className="text-price">{f.price_type === 'a_partir' ? 'A partir de ' : ''}{formatBRL(normal)}</strong> {unitInfo(f.unit).label}</p>
      )}

      <div className="rounded-lg border-2 border-border p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">💰 PROMOÇÃO</p>
          <div className="flex items-center gap-2 text-sm">
            <span>{f.promo_enabled ? '🟢 Ligado' : '⚪ Desligado'}</span>
            <Switch checked={f.promo_enabled} onCheckedChange={(v) => set('promo_enabled', v)} disabled={f.price_type === 'consulta'} />
          </div>
        </div>
        {f.promo_enabled && (
          <>
            <p className="text-sm">Preço normal: <strong>{formatBRL(normal)}</strong></p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="promo_price">Preço promocional (R$)</Label>
                <Input id="promo_price" type="number" step="0.01" min="0" value={f.promo_price} onChange={(e) => set('promo_price', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="promo_until">Validade (opcional)</Label>
                <Input id="promo_until" type="date" value={f.promo_until} onChange={(e) => set('promo_until', e.target.value)} className="mt-1" />
              </div>
            </div>
            {promoInvalid ? (
              <p className="text-sm text-destructive font-medium">o preço promocional precisa ser menor</p>
            ) : (
              <div className="text-sm space-y-1">
                <p>→ Desconto: <strong>{pct}% OFF</strong> · Cliente economiza: <strong>{formatBRL(normal - promo)}</strong></p>
                <p>Prévia: <span className="line-through text-destructive">{formatBRL(normal)}</span> <strong className="text-promo text-lg">{formatBRL(promo)}</strong> <span className="rounded bg-destructive text-destructive-foreground text-xs font-bold px-1.5 py-0.5">{pct}% OFF</span></p>
              </div>
            )}
          </>
        )}
      </div>

      <div>
        <Label>Produtos para esta instalação ({f.related_ids.length} escolhidos, até 6)</Label>
        <Input className="mt-1" placeholder="Buscar produto..." value={relSearch} onChange={(e) => setRelSearch(e.target.value)} />
        <div className="mt-2 max-h-40 overflow-y-auto rounded border border-border divide-y divide-border">
          {relList.map((p) => {
            const on = f.related_ids.includes(p.id);
            return (
              <label key={p.id} className="flex items-center gap-2 px-2 py-1.5 text-sm cursor-pointer">
                <Checkbox checked={on} disabled={!on && f.related_ids.length >= 6} onCheckedChange={(v) => set('related_ids', v ? [...f.related_ids, p.id] : f.related_ids.filter((x) => x !== p.id))} />
                <span className="truncate">{p.title}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="active" checked={f.active} onCheckedChange={(checked) => set('active', !!checked)} />
        <Label htmlFor="active" className="cursor-pointer">Serviço ativo</Label>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isSubmitting || promoInvalid} className="btn-security">
          {isSubmitting ? 'Salvando...' : service ? 'Atualizar' : 'Criar Serviço'}
        </Button>
      </div>
    </form>
  );
}

export default function InstallationServicesForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingService, setEditingService] = useState<InstallationService | null>(null);

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['installation-services'],
    queryFn: () => servicesApi.listAll() as Promise<InstallationService[]>,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('installation_services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-services'] });
      toast({ title: 'Serviço removido!', description: 'O serviço foi excluído.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível excluir o serviço.', variant: 'destructive' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('installation_services')
        .update({ active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-services'] });
    },
  });

  const move = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= services.length) return;
    const list = [...services];
    [list[idx], list[j]] = [list[j], list[idx]];
    await Promise.all(list.map((s, i) => supabase.from('installation_services').update({ display_order: i }).eq('id', s.id)));
    queryClient.invalidateQueries({ queryKey: ['installation-services'] });
  };

  const handleEdit = (service: InstallationService) => {
    setEditingService(service);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['installation-services'] });
    setDialogOpen(false);
    setEditingService(null);
  };

  const getIconComponent = (iconName: string) => {
    const option = iconOptions.find(o => o.value === iconName);
    return option ? option.icon : Camera;
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando serviços...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-foreground">📋 Serviços de Instalação ({services.length})</h3>
        <Button 
          onClick={() => { setEditingService(null); setDialogOpen(true); }}
          className="btn-security"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Serviço
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingService(null); }}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
          </DialogHeader>
          <ServiceForm
            service={editingService}
            onSuccess={handleSuccess}
            onCancel={() => setDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="admin-card">
        <div className="space-y-3">
          {services.map((service, idx) => {
            const IconComponent = getIconComponent(service.icon);

            return (
              <div
                key={service.id}
                className={`flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 rounded-lg border ${
                  service.active ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'
                }`}
              >
                <div className="flex flex-col">
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Subir" disabled={idx === 0} onClick={() => move(idx, -1)}><ArrowUp className="w-3 h-3" /></Button>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Descer" disabled={idx === services.length - 1} onClick={() => move(idx, 1)}><ArrowDown className="w-3 h-3" /></Button>
                </div>
                {service.image_url ? (
                  <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={service.image_url} alt={service.title} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <IconComponent className="w-5 h-5 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-foreground truncate">{service.title}</h4>
                  <p className="text-sm text-muted-foreground truncate">{service.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {servicePriceLabel(service)}{service.price_type !== 'consulta' ? ` ${unitInfo(service.unit).label}` : ''} · {service.features.length} itens inclusos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.active}
                    onCheckedChange={(checked) => toggleActiveMutation.mutate({ id: service.id, active: checked })}
                  />
                  <Button variant="outline" size="icon" onClick={() => handleEdit(service)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => handleDelete(service.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {services.length === 0 && (
            <p className="text-muted-foreground text-center py-8">
              Nenhum serviço cadastrado. Clique em "Adicionar Serviço" para começar!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
