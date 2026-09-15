/**
 * Supabase API Layer - Replaces mock base44Client
 * All data operations go through Supabase with proper RLS
 */
import { supabase } from '@/integrations/supabase/client';

// Types matching database schema
export interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  category: string | null;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  sku: string | null;
  cost_price: number | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  stock: number;
  featured: boolean | null;
  on_sale: boolean | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface StoreSettings {
  id: string;
  shipping_fee: number | null;
  free_shipping_min: number | null;
  pix_enabled: boolean | null;
  credit_card_enabled: boolean | null;
  boleto_enabled: boolean | null;
  updated_at: string | null;
}

export interface Promotion {
  id: string;
  name: string;
  discount_percent: number;
  start_date: string | null;
  end_date: string | null;
  active: boolean | null;
  product_ids: string[] | null;
  created_at: string | null;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_cpf: string | null;
  shipping_address: Record<string, unknown> | null;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  subtotal: number;
  shipping_fee: number;
  total: number;
  payment_method: string | null;
  status: string | null;
  created_at: string | null;
}

// Cart and Wishlist are stored in memory/localStorage for anonymous users
export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
}

export interface WishlistItem {
  id: string;
  product_id: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  created_at: string;
}

// Categories API
export const categoriesApi = {
  async list(): Promise<Category[]> {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });
    
    if (error) throw error;
    return data as Category[] || [];
  }
};

// Products API
export const productsApi = {
  async list(): Promise<Product[]> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async get(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async create(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(product)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Store Settings API
export const settingsApi = {
  async get(): Promise<StoreSettings | null> {
    const { data, error } = await supabase
      .from('store_settings')
      .select('*')
      .limit(1)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  },

  async update(updates: Partial<StoreSettings>): Promise<StoreSettings> {
    // First get the current settings ID
    const current = await this.get();
    if (!current) throw new Error('No settings found');

    const { data, error } = await supabase
      .from('store_settings')
      .update(updates)
      .eq('id', current.id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Promotions API
export const promotionsApi = {
  async list(): Promise<Promotion[]> {
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async create(promotion: Omit<Promotion, 'id' | 'created_at'>): Promise<Promotion> {
    const { data, error } = await supabase
      .from('promotions')
      .insert(promotion)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async update(id: string, updates: Partial<Promotion>): Promise<Promotion> {
    const { data, error } = await supabase
      .from('promotions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('promotions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
};

// Orders API - stores PII securely in database
export const ordersApi = {
  async create(order: Omit<Order, 'id' | 'created_at'>): Promise<Order> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const insertData: any = {
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      customer_phone: order.customer_phone,
      customer_cpf: order.customer_cpf,
      shipping_address: order.shipping_address,
      items: order.items,
      subtotal: order.subtotal,
      shipping_fee: order.shipping_fee,
      total: order.total,
      payment_method: order.payment_method,
      status: order.status
    };
    
    const { data, error } = await supabase
      .from('orders')
      .insert(insertData)
      .select()
      .single();
    
    if (error) throw error;
    return data as unknown as Order;
  },

  async getByOrderNumber(orderNumber: string): Promise<Order | null> {
    // This will only work for admins due to RLS
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .maybeSingle();
    
    if (error) throw error;
    return data as unknown as Order | null;
  },

  async list(): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as Order[];
  }
};

// Admin Logs API
export const adminLogsApi = {
  async log(action: string, entityType?: string, entityId?: string, details?: Record<string, unknown>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const logData: any = {
      user_id: user.id,
      user_email: user.email || '',
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      details: details || null
    };

    const { error } = await supabase
      .from('admin_logs')
      .insert(logData);
    
    if (error) console.error('Failed to log admin action:', error);
  }
};

// Cart API - uses localStorage for anonymous users
const CART_KEY = 'mr_cart_items';

export const cartApi = {
  getItems(): CartItem[] {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  setItems(items: CartItem[]): void {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  },

  addItem(productId: string, quantity: number): CartItem {
    const items = this.getItems();
    const existing = items.find(i => i.product_id === productId);
    
    if (existing) {
      existing.quantity += quantity;
      this.setItems(items);
      return existing;
    }
    
    const newItem: CartItem = {
      id: crypto.randomUUID(),
      product_id: productId,
      quantity
    };
    items.push(newItem);
    this.setItems(items);
    return newItem;
  },

  updateQuantity(id: string, quantity: number): void {
    const items = this.getItems();
    const item = items.find(i => i.id === id);
    if (item) {
      if (quantity <= 0) {
        this.removeItem(id);
      } else {
        item.quantity = quantity;
        this.setItems(items);
      }
    }
  },

  removeItem(id: string): void {
    const items = this.getItems().filter(i => i.id !== id);
    this.setItems(items);
  },

  clear(): void {
    localStorage.removeItem(CART_KEY);
  }
};

// Wishlist API - uses localStorage for anonymous users
const WISHLIST_KEY = 'mr_wishlist_items';

export const wishlistApi = {
  getItems(): WishlistItem[] {
    try {
      const stored = localStorage.getItem(WISHLIST_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  setItems(items: WishlistItem[]): void {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  },

  toggle(productId: string): boolean {
    const items = this.getItems();
    const existing = items.find(i => i.product_id === productId);
    
    if (existing) {
      this.setItems(items.filter(i => i.id !== existing.id));
      return false; // Removed
    }
    
    const newItem: WishlistItem = {
      id: crypto.randomUUID(),
      product_id: productId
    };
    items.push(newItem);
    this.setItems(items);
    return true; // Added
  },

  isInWishlist(productId: string): boolean {
    return this.getItems().some(i => i.product_id === productId);
  },

  clear(): void {
    localStorage.removeItem(WISHLIST_KEY);
  }
};
