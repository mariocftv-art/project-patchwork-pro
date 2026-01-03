import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { wishlistApi, WishlistItem } from '@/lib/supabaseApi';

export function useWishlist() {
  const queryClient = useQueryClient();

  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => wishlistApi.getItems(),
    staleTime: 1000 * 60 * 5,
  });

  const addToWishlist = useMutation({
    mutationFn: async (product_id: string) => {
      wishlistApi.toggle(product_id);
      return { action: 'added' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: (id: string) => {
      const items = wishlistApi.getItems();
      const item = items.find(i => i.id === id);
      if (item) {
        wishlistApi.toggle(item.product_id);
      }
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const toggleWishlist = useMutation({
    mutationFn: async (product_id: string) => {
      const added = wishlistApi.toggle(product_id);
      return { action: added ? 'added' : 'removed' };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const isInWishlist = (product_id: string) => {
    return wishlistApi.isInWishlist(product_id);
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
