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
  const { toast } = useToast();

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

  const onSubmit = async (data: ProductFormData) => {
    const payload: Partial<Product> = {
      title: data.title.trim(),
      description: data.description?.trim() || null,
      price: data.price,
      original_price: data.original_price ?? null,
      cost_price: data.cost_price ?? null,
      category: data.category,
      subcategory: data.subcategory?.trim() || null,
      brand: data.brand?.trim() || null,
      model: data.model?.trim() || null,
      sku: data.sku?.trim() || null,
      image_url: data.image_url?.trim() || null,
      stock: data.stock,
      featured: !!data.featured,
      on_sale: !!data.on_sale,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            {...register('title')}
            className="form-input mt-1"
            placeholder="Nome do produto"
          />
          {errors.title && (
            <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            {...register('description')}
            className="form-input mt-1"
            placeholder="Descrição detalhada do produto"
            rows={3}
          />
        </div>

        <div>
          <Label htmlFor="cost_price">Preço de custo (R$)</Label>
          <Input
            id="cost_price"
            type="number"
            step="0.01"
            {...register('cost_price', { valueAsNumber: true })}
            className="form-input mt-1"
            placeholder="0.00 (interno)"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Uso interno — o cliente nunca vê este valor.
          </p>
          {errors.cost_price && (
            <p className="text-sm text-destructive mt-1">{errors.cost_price.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="price">Preço de venda (R$)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            className="form-input mt-1"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-sm text-destructive mt-1">{errors.price.message as string}</p>
          )}
        </div>

        {showMargin && (
          <div className="col-span-2 rounded-lg bg-muted p-3 text-sm">
            <p className="text-foreground">
              Lucro: <strong>{brl(profit)}</strong>
            </p>
            <p className="text-muted-foreground">
              Margem sobre o custo: <strong>{margin.toFixed(2)}%</strong>
            </p>
          </div>
        )}

        <div>
          <Label htmlFor="original_price">Preço Original (R$)</Label>
          <Input
            id="original_price"
            type="number"
            step="0.01"
            {...register('original_price', { valueAsNumber: true })}
            className="form-input mt-1"
            placeholder="0.00 (opcional)"
          />
        </div>

        <div>
          <Label htmlFor="stock">Estoque</Label>
          <Input
            id="stock"
            type="number"
            {...register('stock', { valueAsNumber: true })}
            className="form-input mt-1"
            placeholder="0"
          />
          {errors.stock && (
            <p className="text-sm text-destructive mt-1">{errors.stock.message as string}</p>
          )}
        </div>

        <div>
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={watch('category')}
            onValueChange={(value) => setValue('category', value, { shouldValidate: true })}
          >
            <SelectTrigger className="form-input mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {categories
                .filter((cat) => !cat.parent_slug)
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="subcategory">Subcategoria</Label>
          <Select
            value={watch('subcategory') || ''}
            onValueChange={(value) => setValue('subcategory', value)}
          >
            <SelectTrigger className="form-input mt-1">
              <SelectValue placeholder="Opcional" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {categories
                .filter((cat) => cat.parent_slug === watch('category'))
                .map((cat) => (
                  <SelectItem key={cat.id} value={cat.slug}>
                    {cat.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" {...register('brand')} className="form-input mt-1" placeholder="Opcional" />
        </div>

        <div>
          <Label htmlFor="model">Modelo</Label>
          <Input id="model" {...register('model')} className="form-input mt-1" placeholder="Opcional" />
        </div>

        <div>
          <Label htmlFor="sku">Código (SKU)</Label>
          <Input id="sku" {...register('sku')} className="form-input mt-1" placeholder="Opcional" />
        </div>

        <div>
          <Label htmlFor="status">Situação</Label>
          <Select
            value={watch('status') || 'active'}
            onValueChange={(value) => setValue('status', value)}
          >
            <SelectTrigger className="form-input mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="inactive">Inativo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <Label htmlFor="image_url">URL da Imagem</Label>
          <Input
            id="image_url"
            {...register('image_url')}
            className="form-input mt-1"
            placeholder="https://exemplo.com/imagem.jpg"
          />
        </div>

        <div className="col-span-2 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Checkbox
              id="featured"
              checked={!!watch('featured')}
              onCheckedChange={(checked) => setValue('featured', !!checked)}
            />
            <Label htmlFor="featured" className="cursor-pointer">
              Produto em destaque
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="on_sale"
              checked={!!watch('on_sale')}
              onCheckedChange={(checked) => setValue('on_sale', !!checked)}
            />
            <Label htmlFor="on_sale" className="cursor-pointer">
              Em promoção
            </Label>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="btn-security">
          {isSubmitting ? 'Salvando...' : product ? 'Atualizar' : 'Criar Produto'}
        </Button>
      </div>
    </form>
  );
}
