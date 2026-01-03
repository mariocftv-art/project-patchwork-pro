import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44, WishlistItem } from '@/api/base44Client';

const USER_EMAIL = 'demo@example.com';

export function useWishlist() {
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => base44.entities.Wishlist.list({ filter: { user_email: USER_EMAIL } as any }),
    staleTime: 1000 * 60 * 5,
  });

  const addToWishlist = useMutation({
    mutationFn: async (product_id: string) => {
      const existing = wishlistItems.find(item => item.product_id === product_id);
      if (existing) return existing;
      return base44.entities.Wishlist.create({
        product_id,
        user_email: USER_EMAIL,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: (id: string) => base44.entities.Wishlist.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const toggleWishlist = useMutation({
    mutationFn: async (product_id: string) => {
      const existing = wishlistItems.find(item => item.product_id === product_id);
      if (existing) {
        await base44.entities.Wishlist.delete(existing.id);
        return { action: 'removed' };
      }
      await base44.entities.Wishlist.create({
        product_id,
        user_email: USER_EMAIL,
      } as any);
      return { action: 'added' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const isInWishlist = (product_id: string) => {
    return wishlistItems.some(item => item.product_id === product_id);
  };

  return {
    wishlistItems,
    isLoading,
    totalItems: wishlistItems.length,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    isInWishlist,
  };
}
