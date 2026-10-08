import { useState, useRef, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePhotosApi, ServicePhoto, GallerySettings, DEFAULT_GALLERY_SUBTITLE } from '@/lib/servicePhotosApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Image, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

export default function ServicePhotosForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ['service-photos'],
    queryFn: () => servicePhotosApi.list(),
  });

  const { data: savedSettings } = useQuery({ queryKey: ['gallery-settings'], queryFn: () => servicePhotosApi.getSettings() });
  const [settings, setSettings] = useState<GallerySettings | null>(null);
  useEffect(() => { if (savedSettings && !settings) setSettings(savedSettings); }, [savedSettings, settings]);
  const saveSettings = async (next: GallerySettings) => {
    setSettings(next);
    try {
      await servicePhotosApi.saveSettings(next);
      queryClient.invalidateQueries({ queryKey: ['gallery-settings'] });
      toast({ title: 'Configuração salva' });
    } catch (e) {
      toast({ title: 'Não foi possível salvar', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const [order, setOrder] = useState<ServicePhoto[]>([]);
  useEffect(() => { setOrder(photos); }, [photos]);
  const [dragId, setDragId] = useState<string | null>(null);
  const persistOrder = async (list: ServicePhoto[]) => {
    setOrder(list);
    try {
      await servicePhotosApi.reorder(list.map((p) => p.id));
      queryClient.invalidateQueries({ queryKey: ['service-photos'] });
    } catch (e) {
      toast({ title: 'Não foi possível salvar a ordem', description: (e as Error).message, variant: 'destructive' });
    }
  };
  const move = (from: number, to: number) => {
    if (to < 0 || to >= order.length || from === to) return;
    const list = [...order]; const [it] = list.splice(from, 1); list.splice(to, 0, it);
    persistOrder(list);
  };
  const toggleActive = async (p: ServicePhoto, v: boolean) => {
    setOrder((o) => o.map((x) => (x.id === p.id ? { ...x, is_active: v } : x)));
    try {
      await servicePhotosApi.setActive(p.id, v);
      queryClient.invalidateQueries({ queryKey: ['service-photos'] });
    } catch (e) {
      toast({ title: 'Não foi possível alterar', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) throw new Error('Selecione uma imagem');
      if (!title.trim()) throw new Error('Digite um título');

      setIsUploading(true);
      const imageUrl = await servicePhotosApi.uploadImage(selectedFile);
      await servicePhotosApi.create({
        title: title.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-photos'] });
      toast({
        title: 'Foto adicionada',
        description: 'A foto do serviço foi adicionada com sucesso.',
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photo: { id: string; image_url: string }) => {
      await servicePhotosApi.deleteImage(photo.image_url);
      await servicePhotosApi.delete(photo.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-photos'] });
      toast({
        title: 'Foto removida',
        description: 'A foto foi removida com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover a foto.',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {settings && (
        <div className="p-4 rounded-lg border border-border space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="gal-menu" className="text-sm font-semibold">Mostrar a aba "Nossos Serviços" no menu</Label>
            <Switch id="gal-menu" checked={settings.menuEnabled} onCheckedChange={(v) => saveSettings({ ...settings, menuEnabled: v })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gal-sub">Texto de apoio (abaixo do título da galeria)</Label>
            <Input id="gal-sub" value={settings.subtitle} placeholder={DEFAULT_GALLERY_SUBTITLE}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              onBlur={() => saveSettings(settings)} />
          </div>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-border space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Adicionar Nova Foto
        </h3>

        <div className="space-y-2">
          <Label htmlFor="photo">Imagem</Label>
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              id="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              Escolher Imagem
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground">
                {selectedFile.name}
              </span>
            )}
          </div>
          {previewUrl && (
            <div className="mt-2">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border"
              />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Instalação de câmeras - Condomínio Parque das Flores"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descreva o serviço realizado..."
            rows={2}
          />
        </div>

        <Button
          type="submit"
          className="btn-security w-full"
          disabled={!selectedFile || !title.trim() || isUploading}
        >
          {isUploading ? 'Enviando...' : 'Adicionar Foto'}
        </Button>
      </form>

      {/* Photos List */}
      <div className="space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Image className="w-4 h-4" />
          Fotos Cadastradas ({photos.length})
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma foto cadastrada ainda.
          </div>
        ) : (
          <ul className="space-y-2">
            <li className="text-xs text-muted-foreground">Arraste para mudar a ordem (ou use as setas). Fotos inativas não aparecem no site.</li>
            {order.map((photo, i) => (
              <li key={photo.id} draggable
                onDragStart={() => setDragId(photo.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => { const from = order.findIndex((x) => x.id === dragId); setDragId(null); move(from, i); }}
                className={`flex items-center gap-3 rounded-lg border border-border p-2 bg-card ${photo.is_active ? '' : 'opacity-60'} ${dragId === photo.id ? 'ring-2 ring-primary' : ''}`}>
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab shrink-0" aria-hidden />
                <img src={photo.image_url} alt={photo.title} className="w-16 h-16 object-cover rounded shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{photo.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Switch checked={photo.is_active} onCheckedChange={(v) => toggleActive(photo, v)} aria-label={`Foto ativa: ${photo.title}`} />
                    <span className="text-xs text-muted-foreground">{photo.is_active ? 'Ativa' : 'Inativa'}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <Button type="button" variant="ghost" size="icon" aria-label="Subir" disabled={i === 0} onClick={() => move(i, i - 1)}><ArrowUp className="w-4 h-4" /></Button>
                  <Button type="button" variant="ghost" size="icon" aria-label="Descer" disabled={i === order.length - 1} onClick={() => move(i, i + 1)}><ArrowDown className="w-4 h-4" /></Button>
                </div>
                <Button type="button" variant="ghost" size="icon" aria-label="Remover foto"
                  onClick={() => { if (confirm('Remover esta foto de vez? Para só esconder do site, use a chavinha Ativa.')) deleteMutation.mutate({ id: photo.id, image_url: photo.image_url }); }}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
