export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          id: string
          name: string
          parent_slug: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          id?: string
          name: string
          parent_slug?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          id?: string
          name?: string
          parent_slug?: string | null
          slug?: string
        }
        Relationships: []
      }
      company_profile: {
        Row: {
          accent_color: string | null
          address: string | null
          city: string | null
          cnpj: string | null
          created_at: string
          default_warranty: string | null
          default_warranty_text: string | null
          email: string | null
          footer_slogan: string | null
          id: string
          logo_url: string | null
          name: string
          pdf_footer_text: string | null
          pdf_notes_text: string | null
          phone: string | null
          primary_color: string | null
          quote_validity_days: number
          responsible_name: string | null
          secondary_color: string | null
          state: string | null
          tagline: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
          whatsapp_admin_template: string | null
          whatsapp_customer_template: string | null
        }
        Insert: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          default_warranty?: string | null
          default_warranty_text?: string | null
          email?: string | null
          footer_slogan?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pdf_footer_text?: string | null
          pdf_notes_text?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_validity_days?: number
          responsible_name?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_admin_template?: string | null
          whatsapp_customer_template?: string | null
        }
        Update: {
          accent_color?: string | null
          address?: string | null
          city?: string | null
          cnpj?: string | null
          created_at?: string
          default_warranty?: string | null
          default_warranty_text?: string | null
          email?: string | null
          footer_slogan?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          pdf_footer_text?: string | null
          pdf_notes_text?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_validity_days?: number
          responsible_name?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_admin_template?: string | null
          whatsapp_customer_template?: string | null
        }
        Relationships: []
      }
      installation_services: {
        Row: {
          active: boolean | null
          created_at: string
          description: string | null
          display_order: number | null
          features: string[] | null
          icon: string
          id: string
          image_url: string | null
          original_price: number | null
          price: number | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: string[] | null
          icon?: string
          id?: string
          image_url?: string | null
          original_price?: number | null
          price?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          description?: string | null
          display_order?: number | null
          features?: string[] | null
          icon?: string
          id?: string
          image_url?: string | null
          original_price?: number | null
          price?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          customer_cpf: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          id: string
          items: Json
          order_number: string
          payment_method: string | null
          shipping_address: Json | null
          shipping_fee: number
          status: string | null
          subtotal: number
          total: number
        }
        Insert: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          id?: string
          items: Json
          order_number: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_fee?: number
          status?: string | null
          subtotal: number
          total: number
        }
        Update: {
          created_at?: string | null
          customer_cpf?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          id?: string
          items?: Json
          order_number?: string
          payment_method?: string | null
          shipping_address?: Json | null
          shipping_fee?: number
          status?: string | null
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      products: {
        Row: {
          brand: string | null
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          gallery_urls: string[]
          id: string
          image_url: string | null
          model: string | null
          on_sale: boolean
          original_price: number | null
          price: number
          sku: string | null
          status: string
          stock: number
          subcategory: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          model?: string | null
          on_sale?: boolean
          original_price?: number | null
          price?: number
          sku?: string | null
          status?: string
          stock?: number
          subcategory?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          gallery_urls?: string[]
          id?: string
          image_url?: string | null
          model?: string | null
          on_sale?: boolean
          original_price?: number | null
          price?: number
          sku?: string | null
          status?: string
          stock?: number
          subcategory?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      promotions: {
        Row: {
          active: boolean | null
          created_at: string | null
          discount_percent: number
          end_date: string | null
          id: string
          name: string
          product_ids: string[] | null
          start_date: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          discount_percent?: number
          end_date?: string | null
          id?: string
          name: string
          product_ids?: string[] | null
          start_date?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          discount_percent?: number
          end_date?: string | null
          id?: string
          name?: string
          product_ids?: string[] | null
          start_date?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          order_numbers: string[] | null
          p256dh: string
          updated_at: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          order_numbers?: string[] | null
          p256dh: string
          updated_at?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          order_numbers?: string[] | null
          p256dh?: string
          updated_at?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string
          created_by: string | null
          customer: Json
          customer_address: string | null
          customer_cnpj: string | null
          customer_cpf: string | null
          customer_email: string
          customer_name: string
          customer_phone: string | null
          customer_whatsapp: string | null
          discount: number
          doc_type: string
          id: string
          items: Json
          labor_total: number
          notes: string | null
          payment: Json
          pdf_url: string | null
          quote_number: string
          service_title: string | null
          shipping_fee: number
          show_signatures: boolean
          status: string
          subtotal: number
          total: number
          updated_at: string
          validity_days: number | null
          warranty: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer?: Json
          customer_address?: string | null
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          discount?: number
          doc_type?: string
          id?: string
          items: Json
          labor_total?: number
          notes?: string | null
          payment?: Json
          pdf_url?: string | null
          quote_number: string
          service_title?: string | null
          shipping_fee?: number
          show_signatures?: boolean
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          validity_days?: number | null
          warranty?: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer?: Json
          customer_address?: string | null
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          customer_whatsapp?: string | null
          discount?: number
          doc_type?: string
          id?: string
          items?: Json
          labor_total?: number
          notes?: string | null
          payment?: Json
          pdf_url?: string | null
          quote_number?: string
          service_title?: string | null
          shipping_fee?: number
          show_signatures?: boolean
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          validity_days?: number | null
          warranty?: Json
        }
        Relationships: []
      }
      service_photos: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string
          title?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          boleto_enabled: boolean | null
          credit_card_enabled: boolean | null
          free_shipping_min: number | null
          id: string
          pix_enabled: boolean | null
          shipping_fee: number | null
          updated_at: string | null
        }
        Insert: {
          boleto_enabled?: boolean | null
          credit_card_enabled?: boolean | null
          free_shipping_min?: number | null
          id?: string
          pix_enabled?: boolean | null
          shipping_fee?: number | null
          updated_at?: string | null
        }
        Update: {
          boleto_enabled?: boolean | null
          credit_card_enabled?: boolean | null
          free_shipping_min?: number | null
          id?: string
          pix_enabled?: boolean | null
          shipping_fee?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_list_products: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_quote_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
