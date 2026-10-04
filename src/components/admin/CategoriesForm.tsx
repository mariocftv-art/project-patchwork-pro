import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Save, X, ArrowUp, ArrowDown } from 'lucide-react';
import { CATEGORY_ICONS, CategoryIcon } from '@/lib/categoryIcons';

interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  parent_slug: string | null;
  is_active: boolean;
  show_in_menu: boolean;
  icon: string | null;
}

const slugify = (name: string) =>
  name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

export default function CategoriesForm() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [newParent, setNewParent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
      if (error) throw error;
      return data as unknown as Category[];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['categories'] });
  const fail = (title: string) => () => toast({ title, variant: 'destructive' });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Category> }) => {
      const { error } = await supabase.from('categories').update(patch as never).eq('id', id);
      if (error) throw error;
    },
    onSuccess: refresh,
    onError: fail('Erro ao salvar categoria'),
  });

  const create = useMutation({
    mutationFn: async () => {
      const siblings = categories.filter((c) => (c.parent_slug || '') === newParent);
      const order = siblings.length ? Math.max(...siblings.map((c) => c.display_order || 0)) + 1 : 1;
      const { error } = await supabase.from('categories').insert({
        name: newName.trim(), slug: newSlug.trim(), display_order: order, parent_slug: newParent || null,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); setNewName(''); setNewSlug(''); toast({ title: 'Categoria criada!' }); },
    onError: fail('Erro ao criar — o nome ou identificador já existe'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { refresh(); toast({ title: 'Categoria excluída' }); },
    onError: fail('Erro ao excluir categoria'),
  });

  const move = async (list: Category[], idx: number, dir: -1 | 1) => {
    const other = list[idx + dir];
    if (!other) return;
    const a = list[idx];
    // Reordena a lista inteira para evitar números repetidos
    const reordered = [...list];
    reordered[idx] = other; reordered[idx + dir] = a;
    await Promise.all(reordered.map((c, i) => supabase.from('categories').update({ display_order: i + 1 } as never).eq('id', c.id)));
    refresh();
  };

  if (isLoading) return <div className="text-muted-foreground">Carregando categorias...</div>;

  const roots = categories.filter((c) => !c.parent_slug);
  const childrenOf = (slug: string) => categories.filter((c) => c.parent_slug === slug);

  const Row = ({ c, list, idx, isChild }: { c: Category; list: Category[]; idx: number; isChild?: boolean }) => (
    <div className={`admin-card !p-3 flex flex-wrap items-center gap-3 ${isChild ? 'ml-4 sm:ml-8' : ''} ${c.is_active ? '' : 'opacity-60'}`}>
      <div className="flex flex-col">
        <button type="button" aria-label="Subir" onClick={() => move(list, idx, -1)} disabled={idx === 0} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-4 h-4" /></button>
        <button type="button" aria-label="Descer" onClick={() => move(list, idx, 1)} disabled={idx === list.length - 1} className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-4 h-4" /></button>
      </div>
      {!isChild && <CategoryIcon name={c.icon} className="w-5 h-5 text-muted-foreground" />}
      {editingId === c.id ? (
        <div className="flex-1 min-w-[200px] grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} aria-label="Nome" />
          <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value.toLowerCase())} aria-label="Identificador" />
        </div>
      ) : (
        <div className="flex-1 min-w-[160px]">
          <p className="font-medium text-foreground">{c.name}</p>
          <p className="text-xs text-muted-foreground">identificador: {c.slug}</p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!isChild && (
          <select
            value={c.icon || ''}
            onChange={(e) => update.mutate({ id: c.id, patch: { icon: e.target.value || null } })}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            aria-label="Ícone"
          >
            <option value="">Ícone…</option>
            {Object.entries(CATEGORY_ICONS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        )}
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={c.is_active} onCheckedChange={(v) => update.mutate({ id: c.id, patch: { is_active: v } })} />
          Ativa
        </label>
        {!isChild && (
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={c.show_in_menu} onCheckedChange={(v) => update.mutate({ id: c.id, patch: { show_in_menu: v } })} />
            Na barra preta
          </label>
        )}
        {editingId === c.id ? (
          <>
            <Button size="sm" aria-label="Salvar" onClick={() => { update.mutate({ id: c.id, patch: { name: editName.trim(), slug: editSlug.trim() } }); setEditingId(null); }}><Save className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" aria-label="Cancelar" onClick={() => setEditingId(null)}><X className="w-4 h-4" /></Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="outline" aria-label="Renomear" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditSlug(c.slug); }}><Pencil className="w-4 h-4" /></Button>
            <Button size="sm" variant="destructive" aria-label="Excluir" onClick={() => {
              if (confirm('Excluir esta categoria? Os produtos dela NÃO são apagados, mas ficam sem categoria visível. Prefira desativar.')) remove.mutate(c.id);
            }}><Trash2 className="w-4 h-4" /></Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => { e.preventDefault(); if (newName.trim() && newSlug.trim()) create.mutate(); }}
        className="admin-card space-y-4"
      >
        <h3 className="font-semibold text-foreground">Adicionar categoria ou subcategoria</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="newName">Nome</Label>
            <Input id="newName" value={newName} onChange={(e) => { setNewName(e.target.value); setNewSlug(slugify(e.target.value)); }} placeholder="Ex: Fechaduras" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="newSlug">Identificador (vai no link)</Label>
            <Input id="newSlug" value={newSlug} onChange={(e) => setNewSlug(e.target.value.toLowerCase())} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="newParent">Fica dentro de</Label>
            <select id="newParent" value={newParent} onChange={(e) => setNewParent(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">— Categoria principal —</option>
              {roots.map((r) => <option key={r.id} value={r.slug}>Subcategoria de {r.name}</option>)}
            </select>
          </div>
        </div>
        <Button type="submit" disabled={create.isPending}><Plus className="w-4 h-4 mr-2" />Adicionar</Button>
      </form>

      <div className="space-y-2">
        <h3 className="font-semibold text-foreground">Categorias ({roots.length})</h3>
        <p className="text-sm text-muted-foreground">Use as setas para mudar a ordem. "Na barra preta" mostra a categoria no topo da loja; as outras aparecem só no botão "Categorias".</p>
        {roots.map((c, i) => (
          <div key={c.id} className="space-y-2">
            <Row c={c} list={roots} idx={i} />
            {childrenOf(c.slug).map((s, j, arr) => <Row key={s.id} c={s} list={arr} idx={j} isChild />)}
          </div>
        ))}
      </div>
    </div>
  );
}
