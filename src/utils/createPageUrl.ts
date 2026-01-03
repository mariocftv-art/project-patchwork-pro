export function createPageUrl(page: string): string {
  switch (page) {
    case 'Home': return '/';
    case 'Cart': return '/carrinho';
    case 'Wishlist': return '/wishlist';
    case 'Admin': return '/admin';
    case 'Product': return '/produto';
    default: return '/';
  }
}
