import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Save, X } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

export default function CategoriesForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as Category[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async ({ name, slug }: { name: string; slug: string }) => {
      const maxOrder = categories.length > 0 
        ? Math.max(...categories.map(c => c.display_order || 0)) 
        : 0;
      
      const { error } = await supabase
        .from('categories')
        .insert({ name, slug, display_order: maxOrder + 1 });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setNewName('');
      setNewSlug('');
      toast({ title: 'Categoria criada com sucesso!' });
    },
    onError: () => {
      toast({ 
        title: 'Erro ao criar categoria', 
        description: 'Verifique se o nome/slug já existe.',
        variant: 'destructive' 
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, slug }: { id: string; name: string; slug: string }) => {
      const { error } = await supabase
        .from('categories')
        .update({ name, slug })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setEditingId(null);
      toast({ title: 'Categoria atualizada!' });
    },
    onError: () => {
      toast({ 
        title: 'Erro ao atualizar categoria', 
        variant: 'destructive' 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast({ title: 'Categoria excluída!' });
    },
    onError: () => {
      toast({ 
        title: 'Erro ao excluir categoria', 
        description: 'Pode haver produtos usando esta categoria.',
        variant: 'destructive' 
      });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) return;
    createMutation.mutate({ name: newName.trim(), slug: newSlug.trim().toLowerCase() });
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim() || !editSlug.trim()) return;
    updateMutation.mutate({ id: editingId, name: editName.trim(), slug: editSlug.trim().toLowerCase() });
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta categoria?')) {
      deleteMutation.mutate(id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  if (isLoading) {
    return <div className="text-muted-foreground">Carregando categorias...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Add New Category Form */}
      <form onSubmit={handleCreate} className="admin-card space-y-4">
        <h3 className="font-semibold text-foreground">Adicionar Nova Categoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="newName">Nome da Categoria</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                setNewSlug(generateSlug(e.target.value));
              }}
              placeholder="Ex: Câmeras de Segurança"
              className="form-input mt-1"
            />
          </div>
          <div>
            <Label htmlFor="newSlug">Slug (identificador)</Label>
            <Input
              id="newSlug"
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
              placeholder="Ex: cameras"
              className="form-input mt-1"
            />
          </div>
        </div>
        <Button type="submit" className="btn-security" disabled={createMutation.isPending}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Categoria
        </Button>
      </form>

      {/* Categories List */}
      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">Categorias Existentes ({categories.length})</h3>
        
        {categories.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhuma categoria cadastrada.</p>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="admin-card flex items-center gap-4"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab" />
                
                {editingId === category.id ? (
                  <>
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="form-input"
                      />
                      <Input
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                        className="form-input"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={updateMutation.isPending}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingId(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{category.name}</p>
                      <p className="text-sm text-muted-foreground">slug: {category.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(category.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
