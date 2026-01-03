import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { promotionsApi, adminLogsApi, Product } from '@/lib/supabaseApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

const promotionSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  discount_percent: z.number().min(1).max(100, 'Desconto deve ser entre 1% e 100%'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  end_date: z.string().min(1, 'Data de término é obrigatória'),
  active: z.boolean(),
});

type PromotionFormData = z.infer<typeof promotionSchema>;

interface PromotionFormProps {
  products: Product[];
  onSuccess: () => void;
}

export default function PromotionForm({ products, onSuccess }: PromotionFormProps) {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PromotionFormData>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      active: true,
    },
  });

  const toggleProduct = (productId: string) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    );
  };

  const onSubmit = async (data: PromotionFormData) => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'Selecione pelo menos um produto',
        variant: 'destructive',
      });
      return;
    }

    try {
      const created = await promotionsApi.create({
        ...data,
        product_ids: selectedProducts,
      } as any);
      await adminLogsApi.log('create_promotion', 'promotion', created.id);
      toast({ title: 'Promoção criada com sucesso!' });
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro ao criar promoção',
        description: 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Promoção</Label>
        <Input
          id="name"
          {...register('name')}
          className="form-input mt-1"
          placeholder="Ex: Black Friday"
        />
        {errors.name && (
          <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="discount_percent">Desconto (%)</Label>
        <Input
          id="discount_percent"
          type="number"
          {...register('discount_percent', { valueAsNumber: true })}
          className="form-input mt-1"
          placeholder="10"
        />
        {errors.discount_percent && (
          <p className="text-sm text-destructive mt-1">{errors.discount_percent.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="start_date">Data de Início</Label>
          <Input
            id="start_date"
            type="date"
            {...register('start_date')}
            className="form-input mt-1"
          />
          {errors.start_date && (
            <p className="text-sm text-destructive mt-1">{errors.start_date.message}</p>
          )}
        </div>

        <div>
          <Label htmlFor="end_date">Data de Término</Label>
          <Input
            id="end_date"
            type="date"
            {...register('end_date')}
            className="form-input mt-1"
          />
          {errors.end_date && (
            <p className="text-sm text-destructive mt-1">{errors.end_date.message}</p>
          )}
        </div>
      </div>

      <Controller
        name="active"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="active"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label htmlFor="active" className="cursor-pointer">
              Promoção ativa
            </Label>
          </div>
        )}
      />

      <div>
        <Label className="mb-2 block">Produtos na Promoção</Label>
        <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-2 space-y-2">
          {products.map((product) => (
            <div
              key={product.id}
              className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer"
              onClick={() => toggleProduct(product.id)}
            >
              <Checkbox
                checked={selectedProducts.includes(product.id)}
                onCheckedChange={() => toggleProduct(product.id)}
              />
              <img
                src={product.image_url}
                alt={product.title}
                className="w-10 h-10 object-cover rounded"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground line-clamp-1">
                  {product.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  R$ {product.price.toFixed(2)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {selectedProducts.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {selectedProducts.length} produto(s) selecionado(s)
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting} className="btn-security">
          {isSubmitting ? 'Salvando...' : 'Criar Promoção'}
        </Button>
      </div>
    </form>
  );
}
