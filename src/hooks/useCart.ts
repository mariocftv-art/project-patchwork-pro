import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { cartApi, CartItem } from '@/lib/supabaseApi';

export function useCart() {
  const queryClient = useQueryClient();

  // Use query to keep cart items in sync with React Query
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getItems(),
    staleTime: 1000 * 60 * 5,
  });

  const addToCart = useMutation({
    mutationFn: async ({ product_id, quantity = 1 }: { product_id: string; quantity?: number }) => {
      return cartApi.addItem(product_id, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      cartApi.updateQuantity(id, quantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeFromCart = useMutation({
    mutationFn: (id: string) => {
      cartApi.removeItem(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const clearCart = useMutation({
    mutationFn: async () => {
      cartApi.clear();
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
