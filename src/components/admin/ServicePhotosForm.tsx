import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePhotosApi } from '@/lib/servicePhotosApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Upload, Image } from 'lucide-react';

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
              accept="image/*"
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative group rounded-lg overflow-hidden border border-border"
              >
                <img
                  src={photo.image_url}
                  alt={photo.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="self-end"
                    onClick={() => deleteMutation.mutate({ id: photo.id, image_url: photo.image_url })}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <div>
                    <p className="text-white text-sm font-medium line-clamp-2">
                      {photo.title}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
