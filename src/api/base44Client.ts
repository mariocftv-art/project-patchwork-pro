// Mock Base44 Client for MR Segurança Máxima
// This simulates the base44-js client with localStorage persistence

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  original_price?: number;
  category: string;
  image_url: string;
  stock: number;
  featured?: boolean;
  created_at: string;
}

interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  user_email: string;
}

interface WishlistItem {
  id: string;
  product_id: string;
  user_email: string;
}

interface Notification {
  id: string;
  user_email: string;
  title: string;
  message: string;
  type: string;
  link: string;
  read: boolean;
  created_at: string;
}

interface Promotion {
  id: string;
  name: string;
  discount_percent: number;
  product_ids: string[];
  start_date: string;
  end_date: string;
  active: boolean;
}

interface StoreSettings {
  id: string;
  shipping_fee: number;
  free_shipping_min: number;
  pix_enabled: boolean;
  card_enabled: boolean;
  boleto_enabled: boolean;
}

// Default products for demo
const defaultProducts: Product[] = [
  {
    id: '1',
    title: 'Câmera Dome HD 1080p',
    description: 'Câmera de segurança dome com resolução Full HD, visão noturna IR 30m',
    price: 189.90,
    original_price: 249.90,
    category: 'câmeras',
    image_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&h=400&fit=crop',
    stock: 45,
    featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Câmera Bullet 4MP',
    description: 'Câmera externa bullet com 4 megapixels e proteção IP67',
    price: 299.90,
    category: 'câmeras',
    image_url: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    stock: 32,
    featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: '3',
    title: 'DVR 8 Canais Full HD',
    description: 'Gravador digital de vídeo com suporte a 8 câmeras, HD 1TB incluso',
    price: 599.90,
    original_price: 799.90,
    category: 'dvr',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    stock: 18,
    featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: '4',
    title: 'DVR 16 Canais 4K',
    description: 'Gravador profissional 16 canais com resolução 4K e 2TB de armazenamento',
    price: 1299.90,
    category: 'dvr',
    image_url: 'https://images.unsplash.com/photo-1606229365485-93a3b8ee0385?w=400&h=400&fit=crop',
    stock: 8,
    created_at: new Date().toISOString()
  },
  {
    id: '5',
    title: 'Cerca Elétrica Industrial',
    description: 'Kit cerca elétrica industrial com 100m de fio e central de choque',
    price: 459.90,
    category: 'cercas',
    image_url: 'https://images.unsplash.com/photo-1558618047-f4b511c253f8?w=400&h=400&fit=crop',
    stock: 22,
    created_at: new Date().toISOString()
  },
  {
    id: '6',
    title: 'Cerca Concertina 10m',
    description: 'Rolo de cerca concertina galvanizada 10 metros',
    price: 189.90,
    category: 'cercas',
    image_url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=400&h=400&fit=crop',
    stock: 50,
    created_at: new Date().toISOString()
  },
  {
    id: '7',
    title: 'Fechadura Digital Biométrica',
    description: 'Fechadura eletrônica com biometria, senha e cartão RFID',
    price: 699.90,
    original_price: 899.90,
    category: 'automação',
    image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop',
    stock: 15,
    featured: true,
    created_at: new Date().toISOString()
  },
  {
    id: '8',
    title: 'Motor Portão Deslizante',
    description: 'Motor para portão deslizante até 600kg com controle remoto',
    price: 549.90,
    category: 'automação',
    image_url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    stock: 12,
    created_at: new Date().toISOString()
  },
  {
    id: '9',
    title: 'Cofre Digital Grande',
    description: 'Cofre eletrônico 50x35x35cm com fechadura digital e chave backup',
    price: 899.90,
    category: 'proteção',
    image_url: 'https://images.unsplash.com/photo-1633265486501-0cf524a07213?w=400&h=400&fit=crop',
    stock: 6,
    created_at: new Date().toISOString()
  },
  {
    id: '10',
    title: 'Sensor de Presença Infra',
    description: 'Sensor de presença infravermelho com alcance de 12 metros',
    price: 79.90,
    category: 'proteção',
    image_url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=400&h=400&fit=crop',
    stock: 80,
    created_at: new Date().toISOString()
  },
];

const defaultSettings: StoreSettings = {
  id: '1',
  shipping_fee: 19.90,
  free_shipping_min: 299.90,
  pix_enabled: true,
  card_enabled: true,
  boleto_enabled: true,
};

// Helper functions
function getStorageKey(entity: string): string {
  return `mr_seguranca_${entity}`;
}

function getItems<T>(entity: string, defaults: T[] = []): T[] {
  const stored = localStorage.getItem(getStorageKey(entity));
  if (stored) {
    return JSON.parse(stored);
  }
  localStorage.setItem(getStorageKey(entity), JSON.stringify(defaults));
  return defaults;
}

function setItems<T>(entity: string, items: T[]): void {
  localStorage.setItem(getStorageKey(entity), JSON.stringify(items));
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Entity handlers
const createEntityHandler = <T extends { id: string }>(entityName: string, defaults: T[] = []) => ({
  async list(options?: { filter?: Partial<T> }): Promise<T[]> {
    let items = getItems<T>(entityName, defaults);
    if (options?.filter) {
      items = items.filter(item => {
        return Object.entries(options.filter!).every(([key, value]) => {
          return (item as any)[key] === value;
        });
      });
    }
    return items;
  },

  async get(id: string): Promise<T | null> {
    const items = getItems<T>(entityName, defaults);
    return items.find(item => item.id === id) || null;
  },

  async create(data: Omit<T, 'id'>): Promise<T> {
    const items = getItems<T>(entityName, defaults);
    const newItem = { ...data, id: generateId(), created_at: new Date().toISOString() } as unknown as T;
    items.push(newItem);
    setItems(entityName, items);
    return newItem;
  },

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const items = getItems<T>(entityName, defaults);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data };
    setItems(entityName, items);
    return items[index];
  },

  async delete(id: string): Promise<boolean> {
    const items = getItems<T>(entityName, defaults);
    const filtered = items.filter(item => item.id !== id);
    if (filtered.length === items.length) return false;
    setItems(entityName, filtered);
    return true;
  },
});

export const base44 = {
  entities: {
    Product: createEntityHandler<Product>('products', defaultProducts),
    Cart: createEntityHandler<CartItem>('cart'),
    Wishlist: createEntityHandler<WishlistItem>('wishlist'),
    Notification: createEntityHandler<Notification>('notifications'),
    Promotion: createEntityHandler<Promotion>('promotions'),
    StoreSettings: {
      ...createEntityHandler<StoreSettings>('settings', [defaultSettings]),
      async getSettings(): Promise<StoreSettings> {
        const items = getItems<StoreSettings>('settings', [defaultSettings]);
        return items[0] || defaultSettings;
      },
      async updateSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
        const items = getItems<StoreSettings>('settings', [defaultSettings]);
        items[0] = { ...items[0], ...data };
        setItems('settings', items);
        return items[0];
      },
    },
  },
  auth: {
    users: {
      async list() {
        return [{ email: 'demo@example.com' }];
      },
    },
  },
};

// Notification helpers
export async function notifyStock(product_id: string): Promise<void> {
  const wishlists = await base44.entities.Wishlist.list({ filter: { product_id } as any });
  for (const item of wishlists) {
    await base44.entities.Notification.create({
      user_email: item.user_email,
      title: 'Produto disponível!',
      message: 'O produto que você favoritou voltou ao estoque.',
      type: 'stock_alert',
      link: `/produto/${product_id}`,
      read: false,
    } as any);
  }
}

export async function notifyPromotion(): Promise<void> {
  const users = await base44.auth.users.list();
  for (const user of users) {
    await base44.entities.Notification.create({
      user_email: user.email,
      title: 'Promoção ativa!',
      message: 'Confira os produtos em promoção.',
      type: 'promotion',
      link: `/`,
      read: false,
    } as any);
  }
}

export type { Product, CartItem, WishlistItem, Notification, Promotion, StoreSettings };
