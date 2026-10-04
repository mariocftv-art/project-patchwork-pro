import { useState } from "react";
import ProductExtrasFields, { ProductExtras, extrasFromProduct, extrasPayload, MoveBtns, move } from './ProductExtrasFields';
import ImageUploadField from './ImageUploadField';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { productsApi, adminLogsApi, Product, categoriesApi } from '@/lib/supabaseApi';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

/** Converte campos vazios/nulos em undefined para não quebrar a validação */
const optionalNumber = z.preprocess(
  (v) => (v === '' || v === null || v === undefined || Number.isNaN(v) ? undefined : v),
  z.number().nonnegative().optional()
);

const optionalText = z.preprocess(
  (v) => (v === null || v === undefined ? '' : v),
  z.string().optional()
);

const productSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: optionalText,
  price: z.preprocess(
    (v) => (v === '' || v === null || Number.isNaN(v) ? undefined : v),
    z.number({ invalid_type_error: 'Informe o preço de venda' }).positive('Preço deve ser maior que zero')
  ),
  original_price: optionalNumber,
  cost_price: optionalNumber,
  category: z.string().min(1, 'Selecione uma categoria'),
  subcategory: optionalText,
  brand: optionalText,
  model: optionalText,
  sku: optionalText,
  image_url: optionalText,
  stock: z.preprocess(
    (v) => (v === '' || v === null || Number.isNaN(v) ? 0 : v),
    z.number().int().min(0, 'Estoque não pode ser negativo')
  ),
  featured: z.boolean().optional(),
  on_sale: z.boolean().optional(),
  status: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const [images, setImages] = useState<string[]>(() => [product?.image_url ?? '', ...(product?.gallery_urls ?? []), '', '', '', '', ''].slice(0, 5));
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [open, setOpen] = useState('basicos');
  const { toast } = useToast();
  const [extras, setExtras] = useState<ProductExtras>(() => {
    const e = extrasFromProduct(product);
    return e.promo_enabled ? e : { ...e, promo_price: null };
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: product?.title ?? '',
      description: product?.description ?? '',
      price: product?.price ?? undefined,
      original_price: product?.original_price ?? undefined,
      cost_price: product?.cost_price ?? undefined,
      category: product?.category ?? '',
      subcategory: product?.subcategory ?? '',
      brand: product?.brand ?? '',
      model: product?.model ?? '',
      sku: product?.sku ?? '',
      image_url: product?.image_url ?? '',
      stock: product?.stock ?? 0,
      featured: product?.featured ?? false,
      on_sale: product?.on_sale ?? false,
      status: product?.status ?? 'active',
    },
  });

  const costPrice = watch('cost_price');
  const salePrice = watch('price');
  const showMargin =
    typeof costPrice === 'number' && costPrice > 0 && typeof salePrice === 'number' && salePrice > 0;
  const profit = showMargin ? salePrice - costPrice : 0;
  const margin = showMargin ? (profit / costPrice) * 100 : 0;

  const promo = extras.promo_price ?? 0;
  const normal = Number(salePrice) || 0;
  const promoInvalid = promo > 0 && promo >= normal;
  const pct = normal > 0 && promo > 0 && promo < normal ? Math.round((1 - promo / normal) * 100) : 0;
  const onInvalid = (errs: Record<string, unknown>) => {
    if (errs.title || errs.stock) setOpen('basicos');
    else if (errs.price || errs.cost_price) setOpen('precos');
    else if (errs.category) setOpen('classificacao');
  };
  const setImg = (i: number, v?: string) => setImages((a) => a.map((x, j) => (j === i ? v || '' : x)));

  const onSubmit = async (data: ProductFormData) => {
    if (extras.promo_price != null && extras.promo_price > 0 && extras.promo_price >= data.price) {
      setOpen('precos');
      toast({ title: 'O preço promocional precisa ser menor que o preço normal.', variant: 'destructive' });
      return;
    }
    const payload: Partial<Product> = {
      title: data.title.trim(),
      description: extras.summary.trim() || null,
      ...extrasPayload({ ...extras, promo_enabled: (extras.promo_price ?? 0) > 0, promo_until: (extras.promo_price ?? 0) > 0 ? extras.promo_until : '' }),
      ...((extras.promo_price ?? 0) > 0 ? {} : { promo_price: null }),
      price: data.price,
      original_price: null,
      cost_price: data.cost_price ?? null,
      category: data.category,
      subcategory: data.subcategory?.trim() || null,
      brand: data.brand?.trim() || null,
      model: data.model?.trim() || null,
      sku: data.sku?.trim() || null,
      image_url: images.map((g) => g.trim()).filter(Boolean)[0] || null,
      gallery_urls: images.map((g) => g.trim()).filter(Boolean).slice(1, 5),
      stock: data.stock,
      featured: !!data.featured,
      on_sale: (extras.promo_price ?? 0) > 0,
      status: data.status || 'active',
    };

    try {
      if (product) {
        await productsApi.update(product.id, payload);
        await adminLogsApi.log('update_product', 'product', product.id);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const created = await productsApi.create(payload);
        await adminLogsApi.log('create_product', 'product', created.id);
        toast({ title: 'Produto criado com sucesso!' });
      }
      onSuccess();
    } catch (error) {
      console.error('[ProductForm] erro ao salvar produto:', error);
      toast({
        title: 'Não foi possível salvar o produto',
        description: 'Verifique suas permissões de administrador e tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const err = (m?: string) => (m ? <p className="text-sm text-destructive mt-1">{m}</p> : null);

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
      <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="space-y-2">
        <AccordionItem value="basicos" className="rounded-lg border border-border px-3">
          <AccordionTrigger className="font-semibold">1. Dados básicos</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1">
            <div>
              <Label htmlFor="title">Título</Label>
              <Input id="title" {...register('title')} className="mt-1" placeholder="Nome do produto" />
              {err(errors.title?.message)}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="stock">Estoque</Label>
                <Input id="stock" type="number" {...register('stock', { valueAsNumber: true })} className="mt-1" placeholder="0" />
                {err(errors.stock?.message as string)}
              </div>
              <div>
                <Label htmlFor="status">Situação</Label>
                <Select value={watch('status') || 'active'} onValueChange={(v) => setValue('status', v)}>
                  <SelectTrigger id="status" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label htmlFor="brand">Marca</Label><Input id="brand" {...register('brand')} className="mt-1" placeholder="Opcional" /></div>
              <div><Label htmlFor="model">Modelo</Label><Input id="model" {...register('model')} className="mt-1" placeholder="Opcional" /></div>
              <div><Label htmlFor="sku">Código (SKU)</Label><Input id="sku" {...register('sku')} className="mt-1" placeholder="Opcional" /></div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch checked={extras.includes_installation} onCheckedChange={(v) => setExtras({ ...extras, includes_installation: v })} />
              <span className="text-sm">🔧 {extras.includes_installation ? '🟢 Inclui instalação' : '⚪ Não inclui instalação'}</span>
            </label>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="precos" className="rounded-lg border border-border px-3">
          <AccordionTrigger className="font-semibold">2. Preços</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="cost_price">Preço de custo (R$)</Label>
                <Input id="cost_price" type="number" step="0.01" {...register('cost_price', { valueAsNumber: true })} className="mt-1" placeholder="0,00" />
                <p className="text-xs text-muted-foreground mt-1">Uso interno — o cliente nunca vê este valor.</p>
                {err(errors.cost_price?.message as string)}
              </div>
              <div>
                <Label htmlFor="price">Preço normal (R$)</Label>
                <Input id="price" type="number" step="0.01" {...register('price', { valueAsNumber: true })} className="mt-1" placeholder="0,00" />
                {err(errors.price?.message as string)}
              </div>
              <div>
                <Label htmlFor="promo_price">Preço promocional (R$)</Label>
                <Input id="promo_price" type="number" step="0.01" min={0} value={extras.promo_price ?? ''} aria-invalid={promoInvalid}
                  className={`mt-1 ${promoInvalid ? 'border-destructive' : ''}`} placeholder="Em branco = sem promoção"
                  onChange={(ev) => setExtras({ ...extras, promo_price: ev.target.value === '' ? null : Number(ev.target.value) })} />
                <p className="text-xs text-muted-foreground mt-1">Deixe em branco para não ter promoção.</p>
              </div>
            </div>
            {promoInvalid && <p className="text-sm text-destructive font-medium" role="alert">O preço promocional precisa ser menor que o preço normal.</p>}
            {promo > 0 && !promoInvalid && (
              <div>
                <Label htmlFor="promo_until">Validade da promoção (opcional)</Label>
                <Input id="promo_until" type="date" className="mt-1 sm:w-56" value={extras.promo_until} onChange={(ev) => setExtras({ ...extras, promo_until: ev.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Depois dessa data a promoção desliga sozinha e volta o preço normal.</p>
              </div>
            )}
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1">
              {pct > 0 ? (
                <>
                  <p>→ Desconto: <strong>{pct}% OFF</strong> · Cliente economiza <strong>{brl(normal - promo)}</strong></p>
                  {typeof costPrice === 'number' && costPrice > 0 && <p className="text-muted-foreground">→ Sua margem na promoção: <strong>{brl(promo - costPrice)}</strong> (só você vê)</p>}
                  <p className="pt-1">Prévia: <span className="line-through text-price-old text-sm">{brl(normal)}</span>{' '}
                    <strong className="text-price text-lg">{brl(promo)}</strong>{' '}
                    <span className="rounded bg-destructive text-destructive-foreground px-1.5 py-0.5 text-xs font-bold">{pct}% OFF</span></p>
                </>
              ) : showMargin ? (
                <>
                  <p>Lucro: <strong>{brl(profit)}</strong></p>
                  <p className="text-muted-foreground">Margem sobre o custo: <strong>{margin.toFixed(2)}%</strong> (só você vê)</p>
                </>
              ) : <p className="text-muted-foreground">Sem promoção: a loja mostra só o preço normal.</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="descricao" className="rounded-lg border border-border px-3">
          <AccordionTrigger className="font-semibold">3. Descrição</AccordionTrigger>
          <AccordionContent className="px-1">
            <ProductExtrasFields value={extras} onChange={setExtras} normalPrice={normal} productId={product?.id} sections={['description']} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="imagens" className="rounded-lg border border-border px-3">
          <AccordionTrigger className="font-semibold">4. Imagens</AccordionTrigger>
          <AccordionContent className="space-y-2 px-1">
            <p className="text-xs text-muted-foreground">A primeira é a principal. Arraste (ou use as setas) para mudar a ordem.</p>
            {images.map((img, i) => (
              <div key={i} draggable onDragStart={() => setDragFrom(i)} onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { if (dragFrom !== null && !e.dataTransfer.files?.length) { e.preventDefault(); setImages((a) => move(a, dragFrom, i)); } setDragFrom(null); }}
                className="flex gap-2 items-start rounded-md border border-border p-2 bg-card">
                <MoveBtns i={i} n={images.length} onMove={(a, b) => setImages((x) => move(x, a, b))} />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-medium">Imagem {i + 1}{i === 0 ? ' (principal)' : ' (opcional)'}</p>
                  <ImageUploadField value={img || undefined} onChange={(v) => setImg(i, v)} bucket="service-photos" folder="products" label={`Imagem ${i + 1}`} />
                </div>
              </div>
            ))}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="classificacao" className="rounded-lg border border-border px-3">
          <AccordionTrigger className="font-semibold">5. Classificação</AccordionTrigger>
          <AccordionContent className="space-y-3 px-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Select value={watch('category')} onValueChange={(v) => setValue('category', v, { shouldValidate: true })}>
                  <SelectTrigger id="category" className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {categories.filter((c) => !c.parent_slug).map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {err(errors.category?.message)}
              </div>
              <div>
                <Label htmlFor="subcategory">Subcategoria</Label>
                <Select value={watch('subcategory') || ''} onValueChange={(v) => setValue('subcategory', v)}>
                  <SelectTrigger id="subcategory" className="mt-1"><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent className="bg-popover">
                    {categories.filter((c) => c.parent_slug === watch('category')).map((c) => <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="featured" checked={!!watch('featured')} onCheckedChange={(c) => setValue('featured', !!c)} />
              <Label htmlFor="featured" className="cursor-pointer">Produto em destaque</Label>
            </div>
            <ProductExtrasFields value={extras} onChange={setExtras} normalPrice={normal} productId={product?.id} sections={['related']} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex justify-end gap-2 pt-2 sticky bottom-0 bg-background py-2">
        <Button type="submit" disabled={isSubmitting || promoInvalid} className="btn-security">
          {isSubmitting ? 'Salvando...' : product ? 'Atualizar' : 'Criar Produto'}
        </Button>
      </div>
    </form>
  );
}
