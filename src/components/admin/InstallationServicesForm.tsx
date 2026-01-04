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
import { Plus, Trash2, Edit2, GripVertical, Upload, X, ImageIcon } from 'lucide-react';
import { Camera, Shield, Zap, Lock, Wifi, Phone, Wrench, Settings, Home, Eye } from 'lucide-react';

interface InstallationService {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  image_url: string | null;
  features: string[];
  display_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

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

function ServiceForm({ service, onSuccess, onCancel }: ServiceFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(service?.image_url || null);
  
  const [formData, setFormData] = useState({
    title: service?.title || '',
    description: service?.description || '',
    features: service?.features?.join(', ') || '',
    active: service?.active ?? true,
  });

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-photos')
      .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    const { data } = supabase.storage
      .from('service-photos')
      .getPublicUrl(fileName);
    
    return data.publicUrl;
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
    
    if (!formData.title.trim()) {
      toast({ title: 'Erro', description: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      let image_url = service?.image_url || null;
      
      if (imageFile) {
        image_url = await uploadImage(imageFile);
      } else if (!imagePreview) {
        image_url = null;
      }

      const features = formData.features.split(',').map(f => f.trim()).filter(Boolean);

      if (service) {
        const { error } = await supabase
          .from('installation_services')
          .update({
            title: formData.title,
            description: formData.description,
            features,
            image_url,
            active: formData.active,
          })
          .eq('id', service.id);
        
        if (error) throw error;
        toast({ title: 'Serviço atualizado com sucesso!' });
      } else {
        const { data: existingServices } = await supabase
          .from('installation_services')
          .select('display_order')
          .order('display_order', { ascending: false })
          .limit(1);
        
        const maxOrder = existingServices?.[0]?.display_order || 0;
        
        const { error } = await supabase
          .from('installation_services')
          .insert({
            title: formData.title,
            description: formData.description,
            features,
            image_url,
            icon: 'Camera',
            display_order: maxOrder + 1,
            active: formData.active,
          });
        
        if (error) throw error;
        toast({ title: 'Serviço criado com sucesso!' });
      }
      
      onSuccess();
    } catch (error) {
      toast({ 
        title: 'Erro ao salvar serviço', 
        description: 'Tente novamente.', 
        variant: 'destructive' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="form-input mt-1"
            placeholder="Ex: Instalação de Câmeras"
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="form-input mt-1"
            placeholder="Descreva o serviço..."
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="features">Características (separadas por vírgula)</Label>
          <Input
            id="features"
            value={formData.features}
            onChange={(e) => setFormData({ ...formData, features: e.target.value })}
            className="form-input mt-1"
            placeholder="Câmeras HD, Acesso remoto, Suporte 24h"
          />
        </div>

        <div>
          <Label>Foto do Serviço</Label>
          <div className="flex items-start gap-4 mt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4 mr-2" />
              {imagePreview ? 'Trocar Foto' : 'Escolher Foto'}
            </Button>
            {imagePreview && (
              <div className="relative w-24 h-24">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 w-6 h-6"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            {!imagePreview && (
              <div className="w-24 h-24 bg-muted rounded-lg flex items-center justify-center border border-dashed">
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData({ ...formData, active: !!checked })}
          />
          <Label htmlFor="active" className="cursor-pointer">
            Serviço ativo
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="btn-security">
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
    queryFn: async () => {
      const { data, error } = await supabase
        .from('installation_services')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as InstallationService[];
    },
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
        <DialogContent className="max-w-lg">
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
          {services.map((service) => {
            const IconComponent = getIconComponent(service.icon);

            return (
              <div
                key={service.id}
                className={`flex items-center gap-4 p-4 rounded-lg border ${
                  service.active ? 'bg-card border-border' : 'bg-muted/50 border-muted opacity-60'
                }`}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground" />
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
                    {service.features.length} características
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
