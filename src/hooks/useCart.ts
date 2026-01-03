import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, CartItem } from '@/api/base44Client';

const USER_EMAIL = 'demo@example.com';

export function useCart() {
  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => base44.entities.Cart.list({ filter: { user_email: USER_EMAIL } as any }),
    staleTime: 1000 * 60 * 5,
  });

  const addToCart = useMutation({
    mutationFn: async ({ product_id, quantity = 1 }: { product_id: string; quantity?: number }) => {
      const existing = cartItems.find(item => item.product_id === product_id);
      if (existing) {
        return base44.entities.Cart.update(existing.id, { 
          quantity: existing.quantity + quantity 
        });
      }
      return base44.entities.Cart.create({
        product_id,
        quantity,
        user_email: USER_EMAIL,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        return base44.entities.Cart.delete(id);
      }
      return base44.entities.Cart.update(id, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeFromCart = useMutation({
    mutationFn: (id: string) => base44.entities.Cart.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      for (const item of cartItems) {
        await base44.entities.Cart.delete(item.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    isLoading,
    totalItems,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  };
}
