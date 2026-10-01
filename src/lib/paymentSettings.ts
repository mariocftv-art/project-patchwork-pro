import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type PaymentMethodKey = 'credit_card' | 'pix' | 'boleto' | 'debit_card';

export const PAYMENT_METHODS: { key: PaymentMethodKey; label: string; emoji: string }[] = [
  { key: 'credit_card', label: 'Cartão de crédito', emoji: '💳' },
  { key: 'pix', label: 'Pix', emoji: '📱' },
  { key: 'boleto', label: 'Boleto', emoji: '🧾' },
  { key: 'debit_card', label: 'Cartão de débito', emoji: '💳' },
];

export interface PaymentSettings {
  id: string;
  enabled: boolean;
  mode: 'sandbox' | 'live';
  public_key: string | null;
  methods: PaymentMethodKey[];
  token_last4: string | null;
  account_name: string | null;
}

export async function getPaymentSettings(): Promise<PaymentSettings | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('payment_settings')
    .select('id, enabled, mode, public_key, methods, token_last4, account_name')
    .limit(1)
    .maybeSingle();
  return data as PaymentSettings | null;
}

export function usePaymentSettings() {
  return useQuery({ queryKey: ['payment-settings'], queryFn: getPaymentSettings, staleTime: 60_000 });
}

/** Online só quando ligado e com token salvo. */
export const isOnlinePaymentOn = (s?: PaymentSettings | null) => !!s?.enabled && !!s?.token_last4;
