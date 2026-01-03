import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productsApi, adminLogsApi, Product } from '@/lib/supabaseApi';
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

const productSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(10, 'Descrição deve ter pelo menos 10 caracteres'),
  price: z.number().positive('Preço deve ser maior que zero'),
  original_price: z.number().optional(),
  category: z.string().min(1, 'Selecione uma categoria'),
  image_url: z.string().url('URL de imagem inválida'),
  stock: z.number().int().min(0, 'Estoque não pode ser negativo'),
  featured: z.boolean().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

const categories = ['câmeras', 'dvr', 'cercas', 'automação', 'proteção', 'ofertas', 'instalação grande são paulo'];

export default function ProductForm({ product, onSuccess }: ProductFormProps) {
  const { toast } = useToast();
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          title: product.title,
          description: product.description,
          price: product.price,
          original_price: product.original_price,
          category: product.category,
          image_url: product.image_url,
          stock: product.stock,
          featured: product.featured,
        }
      : {
          stock: 0,
          featured: false,
        },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (product) {
        await productsApi.update(product.id, data);
        await adminLogsApi.log('update_product', 'product', product.id);
        toast({ title: 'Produto atualizado com sucesso!' });
      } else {
        const created = await productsApi.create(data as any);
        await adminLogsApi.log('create_product', 'product', created.id);
        toast({ title: 'Produto criado com sucesso!' });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro ao salvar produto',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          {errors.description && (
            <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="price">Preço (R$)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            {...register('price', { valueAsNumber: true })}
            className="form-input mt-1"
            placeholder="0.00"
          />
          {errors.price && (
            <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
          )}
        </div>

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
          <Label htmlFor="category">Categoria</Label>
          <Select
            value={watch('category')}
            onValueChange={(value) => setValue('category', value)}
          >
            <SelectTrigger className="form-input mt-1">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.category && (
            <p className="text-sm text-destructive mt-1">{errors.category.message}</p>
          )}
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
            <p className="text-sm text-destructive mt-1">{errors.stock.message}</p>
          )}
        </div>

        <div className="col-span-2">
          <Label htmlFor="image_url">URL da Imagem</Label>
          <Input
            id="image_url"
            {...register('image_url')}
            className="form-input mt-1"
            placeholder="https://exemplo.com/imagem.jpg"
          />
          {errors.image_url && (
            <p className="text-sm text-destructive mt-1">{errors.image_url.message}</p>
          )}
        </div>

        <div className="col-span-2 flex items-center gap-2">
          <Checkbox
            id="featured"
            checked={watch('featured')}
            onCheckedChange={(checked) => setValue('featured', !!checked)}
          />
          <Label htmlFor="featured" className="cursor-pointer">
            Produto em destaque
          </Label>
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
