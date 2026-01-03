import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

const settingsSchema = z.object({
  shipping_fee: z.number().min(0, 'Taxa de frete não pode ser negativa'),
  free_shipping_min: z.number().min(0, 'Valor mínimo não pode ser negativo'),
  pix_enabled: z.boolean(),
  card_enabled: z.boolean(),
  boleto_enabled: z.boolean(),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

export default function StoreSettingsForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => base44.entities.StoreSettings.getSettings(),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      shipping_fee: 0,
      free_shipping_min: 0,
      pix_enabled: true,
      card_enabled: true,
      boleto_enabled: true,
    },
  });

  useEffect(() => {
    if (settings) {
      reset({
        shipping_fee: settings.shipping_fee,
        free_shipping_min: settings.free_shipping_min,
        pix_enabled: settings.pix_enabled,
        card_enabled: settings.card_enabled,
        boleto_enabled: settings.boleto_enabled,
      });
    }
  }, [settings, reset]);

  const updateSettings = useMutation({
    mutationFn: (data: SettingsFormData) =>
      base44.entities.StoreSettings.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
    onError: () => {
      toast({
        title: 'Erro ao salvar configurações',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => updateSettings.mutate(data))} className="space-y-6">
      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">💰 Frete</h3>
        <div className="grid gap-4">
          <div>
            <Label htmlFor="shipping_fee">Taxa de Frete Padrão (R$)</Label>
            <Input
              id="shipping_fee"
              type="number"
              step="0.01"
              {...register('shipping_fee', { valueAsNumber: true })}
              className="form-input mt-1"
            />
            {errors.shipping_fee && (
              <p className="text-sm text-destructive mt-1">{errors.shipping_fee.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="free_shipping_min">Valor Mínimo para Frete Grátis (R$)</Label>
            <Input
              id="free_shipping_min"
              type="number"
              step="0.01"
              {...register('free_shipping_min', { valueAsNumber: true })}
              className="form-input mt-1"
            />
            {errors.free_shipping_min && (
              <p className="text-sm text-destructive mt-1">{errors.free_shipping_min.message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="admin-card">
        <h3 className="font-semibold text-foreground mb-4">💳 Métodos de Pagamento</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pix_enabled" className="text-foreground">PIX</Label>
              <p className="text-sm text-muted-foreground">
                Pagamento instantâneo via PIX
              </p>
            </div>
            <Switch
              id="pix_enabled"
              checked={watch('pix_enabled')}
              onCheckedChange={(checked) => setValue('pix_enabled', checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="card_enabled" className="text-foreground">Cartão de Crédito</Label>
              <p className="text-sm text-muted-foreground">
                Parcelamento em até 12x
              </p>
            </div>
            <Switch
              id="card_enabled"
              checked={watch('card_enabled')}
              onCheckedChange={(checked) => setValue('card_enabled', checked, { shouldDirty: true })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="boleto_enabled" className="text-foreground">Boleto Bancário</Label>
              <p className="text-sm text-muted-foreground">
                Vencimento em 3 dias úteis
              </p>
            </div>
            <Switch
              id="boleto_enabled"
              checked={watch('boleto_enabled')}
              onCheckedChange={(checked) => setValue('boleto_enabled', checked, { shouldDirty: true })}
            />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        disabled={!isDirty || updateSettings.isPending}
        className="btn-security"
      >
        {updateSettings.isPending ? 'Salvando...' : 'Salvar Configurações'}
      </Button>
    </form>
  );
}
