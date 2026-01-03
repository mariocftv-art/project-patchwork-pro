import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Save, Edit2, X, GripVertical, Upload, ImageIcon } from 'lucide-react';
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

export default function InstallationServicesForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newService, setNewService] = useState({
    title: '',
    description: '',
    icon: 'Camera',
    features: '',
  });
  const [editData, setEditData] = useState<Partial<InstallationService> & { featuresText?: string }>({});
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

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

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setNewImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setEditImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

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

  const createMutation = useMutation({
    mutationFn: async (service: { title: string; description: string; icon: string; features: string[]; image_url?: string }) => {
      const maxOrder = services.length > 0 ? Math.max(...services.map(s => s.display_order)) : 0;
      const { error } = await supabase.from('installation_services').insert({
        ...service,
        display_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-services'] });
      setNewService({ title: '', description: '', icon: 'Camera', features: '' });
      setNewImageFile(null);
      setNewImagePreview(null);
      toast({ title: 'Serviço adicionado!', description: 'O serviço foi criado com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível adicionar o serviço.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<InstallationService>) => {
      const { error } = await supabase.from('installation_services').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['installation-services'] });
      setEditingId(null);
      setEditData({});
      toast({ title: 'Serviço atualizado!', description: 'As alterações foram salvas.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível atualizar o serviço.', variant: 'destructive' });
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

  const handleCreate = async () => {
    if (!newService.title.trim()) {
      toast({ title: 'Erro', description: 'O título é obrigatório.', variant: 'destructive' });
      return;
    }
    
    setIsUploading(true);
    try {
      let image_url: string | undefined;
      if (newImageFile) {
        image_url = await uploadImage(newImageFile);
      }
      
      const features = newService.features.split(',').map(f => f.trim()).filter(Boolean);
      createMutation.mutate({
        title: newService.title,
        description: newService.description,
        icon: newService.icon,
        features,
        image_url,
      });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível fazer upload da imagem.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (service: InstallationService) => {
    setEditingId(service.id);
    setEditData({
      ...service,
      featuresText: service.features.join(', '),
    });
    setEditImagePreview(service.image_url || null);
    setEditImageFile(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editData.title?.trim()) return;
    
    setIsUploading(true);
    try {
      let image_url = editData.image_url;
      if (editImageFile) {
        image_url = await uploadImage(editImageFile);
      }
      
      const features = editData.featuresText?.split(',').map(f => f.trim()).filter(Boolean) || [];
      updateMutation.mutate({
        id: editingId,
        title: editData.title,
        description: editData.description,
        icon: editData.icon,
        image_url,
        features,
        active: editData.active,
      });
      setEditImageFile(null);
      setEditImagePreview(null);
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível fazer upload da imagem.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleActive = (id: string, active: boolean) => {
    updateMutation.mutate({ id, active: !active });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      deleteMutation.mutate(id);
    }
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
      {/* Add new service form */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">➕ Adicionar Novo Serviço</h3>
        <div className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={newService.title}
                onChange={(e) => setNewService({ ...newService, title: e.target.value })}
                placeholder="Ex: Instalação de Câmeras"
              />
            </div>
            <div>
              <Label htmlFor="icon">Ícone</Label>
              <Select
                value={newService.icon}
                onValueChange={(value) => setNewService({ ...newService, icon: value })}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover">
                  {iconOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="w-4 h-4" />
                        {option.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={newService.description}
              onChange={(e) => setNewService({ ...newService, description: e.target.value })}
              placeholder="Descreva o serviço..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="features">Características (separadas por vírgula)</Label>
            <Input
              id="features"
              value={newService.features}
              onChange={(e) => setNewService({ ...newService, features: e.target.value })}
              placeholder="Câmeras HD, Acesso remoto, Suporte 24h"
            />
          </div>
          <div>
            <Label>Foto do Serviço (opcional)</Label>
            <div className="flex items-center gap-4 mt-2">
              <input
                type="file"
                ref={newFileInputRef}
                onChange={handleNewImageChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => newFileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Escolher Foto
              </Button>
              {newImagePreview && (
                <div className="relative w-20 h-20">
                  <img
                    src={newImagePreview}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6"
                    onClick={() => {
                      setNewImageFile(null);
                      setNewImagePreview(null);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending || isUploading} className="btn-security">
            <Plus className="w-4 h-4 mr-2" />
            {isUploading ? 'Enviando foto...' : createMutation.isPending ? 'Adicionando...' : 'Adicionar Serviço'}
          </Button>
        </div>
      </div>

      {/* Services list */}
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">📋 Serviços Cadastrados ({services.length})</h3>
        <div className="space-y-3">
          {services.map((service) => {
            const IconComponent = getIconComponent(service.icon);
            const isEditing = editingId === service.id;

            if (isEditing) {
              return (
                <div key={service.id} className="bg-secondary/50 p-4 rounded-lg space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Título</Label>
                      <Input
                        value={editData.title || ''}
                        onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Ícone</Label>
                      <Select
                        value={editData.icon || 'Camera'}
                        onValueChange={(value) => setEditData({ ...editData, icon: value })}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {iconOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <option.icon className="w-4 h-4" />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={editData.description || ''}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Características (separadas por vírgula)</Label>
                    <Input
                      value={editData.featuresText || ''}
                      onChange={(e) => setEditData({ ...editData, featuresText: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Foto do Serviço</Label>
                    <div className="flex items-center gap-4 mt-2">
                      <input
                        type="file"
                        ref={editFileInputRef}
                        onChange={handleEditImageChange}
                        accept="image/*"
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editFileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {editImagePreview ? 'Trocar Foto' : 'Adicionar Foto'}
                      </Button>
                      {editImagePreview && (
                        <div className="relative w-16 h-16">
                          <img
                            src={editImagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 w-5 h-5"
                            onClick={() => {
                              setEditImageFile(null);
                              setEditImagePreview(null);
                              setEditData({ ...editData, image_url: null });
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editData.active ?? true}
                        onCheckedChange={(checked) => setEditData({ ...editData, active: checked })}
                      />
                      <Label>Ativo</Label>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button variant="outline" size="sm" onClick={() => { setEditingId(null); setEditImageFile(null); setEditImagePreview(null); }}>
                        <X className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                      <Button size="sm" onClick={handleSaveEdit} disabled={updateMutation.isPending || isUploading}>
                        <Save className="w-4 h-4 mr-1" />
                        {isUploading ? 'Enviando...' : 'Salvar'}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

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
                    onCheckedChange={() => handleToggleActive(service.id, service.active)}
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
              Nenhum serviço cadastrado. Adicione o primeiro acima!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
