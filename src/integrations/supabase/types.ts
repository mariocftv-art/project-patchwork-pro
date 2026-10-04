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
      admin_push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_settings: {
        Row: {
          auto_confirm: boolean
          id: number
          last_sent_date: string | null
          on_the_way_template: string
          reminder_enabled: boolean
          reminder_hour: number
          send_window_end: number
          send_window_start: number
          show_header_shortcut: boolean
          updated_at: string
        }
        Insert: {
          auto_confirm?: boolean
          id?: number
          last_sent_date?: string | null
          on_the_way_template?: string
          reminder_enabled?: boolean
          reminder_hour?: number
          send_window_end?: number
          send_window_start?: number
          show_header_shortcut?: boolean
          updated_at?: string
        }
        Update: {
          auto_confirm?: boolean
          id?: number
          last_sent_date?: string | null
          on_the_way_template?: string
          reminder_enabled?: boolean
          reminder_hour?: number
          send_window_end?: number
          send_window_start?: number
          show_header_shortcut?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          address: string | null
          cancel_reason: string | null
          confirm_pending_at: string | null
          confirm_sent_at: string | null
          created_at: string
          customer_doc: Json
          customer_name: string
          customer_phone: string | null
          duration_minutes: number
          expected_value: number | null
          id: string
          kind: string
          notes: string | null
          on_way_sent_at: string | null
          reference_point: string | null
          starts_at: string
          status: string
          technician: string | null
          technician_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          cancel_reason?: string | null
          confirm_pending_at?: string | null
          confirm_sent_at?: string | null
          created_at?: string
          customer_doc?: Json
          customer_name: string
          customer_phone?: string | null
          duration_minutes?: number
          expected_value?: number | null
          id?: string
          kind?: string
          notes?: string | null
          on_way_sent_at?: string | null
          reference_point?: string | null
          starts_at: string
          status?: string
          technician?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          cancel_reason?: string | null
          confirm_pending_at?: string | null
          confirm_sent_at?: string | null
          created_at?: string
          customer_doc?: Json
          customer_name?: string
          customer_phone?: string | null
          duration_minutes?: number
          expected_value?: number | null
          id?: string
          kind?: string
          notes?: string | null
          on_way_sent_at?: string | null
          reference_point?: string | null
          starts_at?: string
          status?: string
          technician?: string | null
          technician_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean
          name: string
          parent_slug: string | null
          show_in_menu: boolean
          slug: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          parent_slug?: string | null
          show_in_menu?: boolean
          slug: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          parent_slug?: string | null
          show_in_menu?: boolean
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
          instagram: string | null
          logo_url: string | null
          name: string
          pdf_footer_text: string | null
          pdf_gold_color: string | null
          pdf_notes_text: string | null
          pdf_red_color: string | null
          phone: string | null
          primary_color: string | null
          quote_validity_days: number
          responsible_name: string | null
          secondary_color: string | null
          state: string | null
          tagline: string | null
          theme_dark: string | null
          theme_price: string | null
          theme_price_old: string | null
          theme_primary: string | null
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
          instagram?: string | null
          logo_url?: string | null
          name?: string
          pdf_footer_text?: string | null
          pdf_gold_color?: string | null
          pdf_notes_text?: string | null
          pdf_red_color?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_validity_days?: number
          responsible_name?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          theme_dark?: string | null
          theme_price?: string | null
          theme_price_old?: string | null
          theme_primary?: string | null
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
          instagram?: string | null
          logo_url?: string | null
          name?: string
          pdf_footer_text?: string | null
          pdf_gold_color?: string | null
          pdf_notes_text?: string | null
          pdf_red_color?: string | null
          phone?: string | null
          primary_color?: string | null
          quote_validity_days?: number
          responsible_name?: string | null
          secondary_color?: string | null
          state?: string | null
          tagline?: string | null
          theme_dark?: string | null
          theme_price?: string | null
          theme_price_old?: string | null
          theme_primary?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
          whatsapp_admin_template?: string | null
          whatsapp_customer_template?: string | null
        }
        Relationships: []
      }
      contract_links: {
        Row: {
          created_at: string
          created_by: string | null
          created_by_email: string | null
          expires_at: string
          id: string
          kind: string
          open_count: number
          opened_at: string | null
          quote_id: string
          revoked_at: string | null
          signed_at: string | null
          token: string
          version: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at: string
          id?: string
          kind: string
          open_count?: number
          opened_at?: string | null
          quote_id: string
          revoked_at?: string | null
          signed_at?: string | null
          token: string
          version?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          expires_at?: string
          id?: string
          kind?: string
          open_count?: number
          opened_at?: string | null
          quote_id?: string
          revoked_at?: string | null
          signed_at?: string | null
          token?: string
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_links_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          consent_text: string
          created_by: string | null
          created_by_email: string | null
          device: string | null
          doc_hash: string
          id: string
          link_id: string | null
          party: string
          quote_id: string
          remote: boolean
          signature_image: string
          signed_at: string
          signed_pdf_path: string | null
          signer_document: string | null
          signer_ip: string | null
          signer_name: string
          user_agent: string | null
          version: number
        }
        Insert: {
          consent_text: string
          created_by?: string | null
          created_by_email?: string | null
          device?: string | null
          doc_hash: string
          id?: string
          link_id?: string | null
          party: string
          quote_id: string
          remote?: boolean
          signature_image: string
          signed_at?: string
          signed_pdf_path?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name: string
          user_agent?: string | null
          version: number
        }
        Update: {
          consent_text?: string
          created_by?: string | null
          created_by_email?: string | null
          device?: string | null
          doc_hash?: string
          id?: string
          link_id?: string | null
          party?: string
          quote_id?: string
          remote?: boolean
          signature_image?: string
          signed_at?: string
          signed_pdf_path?: string | null
          signer_document?: string | null
          signer_ip?: string | null
          signer_name?: string
          user_agent?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_number_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      installation_services: {
        Row: {
          active: boolean | null
          conditions: Json
          created_at: string
          description: string | null
          display_order: number | null
          excluded: string[]
          features: string[] | null
          icon: string
          id: string
          image_illustrative: boolean
          image_url: string | null
          min_qty: number | null
          original_price: number | null
          price: number | null
          price_type: string
          promo_enabled: boolean
          promo_price: number | null
          promo_until: string | null
          related_ids: string[]
          summary: string | null
          title: string
          unit: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          conditions?: Json
          created_at?: string
          description?: string | null
          display_order?: number | null
          excluded?: string[]
          features?: string[] | null
          icon?: string
          id?: string
          image_illustrative?: boolean
          image_url?: string | null
          min_qty?: number | null
          original_price?: number | null
          price?: number | null
          price_type?: string
          promo_enabled?: boolean
          promo_price?: number | null
          promo_until?: string | null
          related_ids?: string[]
          summary?: string | null
          title: string
          unit?: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          conditions?: Json
          created_at?: string
          description?: string | null
          display_order?: number | null
          excluded?: string[]
          features?: string[] | null
          icon?: string
          id?: string
          image_illustrative?: boolean
          image_url?: string | null
          min_qty?: number | null
          original_price?: number | null
          price?: number | null
          price_type?: string
          promo_enabled?: boolean
          promo_price?: number | null
          promo_until?: string | null
          related_ids?: string[]
          summary?: string | null
          title?: string
          unit?: string
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
          mp_payment_id: string | null
          mp_preference_id: string | null
          order_number: string
          payment_method: string | null
          payment_status: string
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
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_number: string
          payment_method?: string | null
          payment_status?: string
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
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_number?: string
          payment_method?: string | null
          payment_status?: string
          shipping_address?: Json | null
          shipping_fee?: number
          status?: string | null
          subtotal?: number
          total?: number
        }
        Relationships: []
      }
      payment_secrets: {
        Row: {
          access_token: string | null
          id: number
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          id?: number
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          account_name: string | null
          created_at: string
          enabled: boolean
          id: string
          methods: string[]
          mode: string
          public_key: string | null
          token_last4: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          methods?: string[]
          mode?: string
          public_key?: string | null
          token_last4?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          created_at?: string
          enabled?: boolean
          id?: string
          methods?: string[]
          mode?: string
          public_key?: string | null
          token_last4?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          box_items: string[]
          brand: string | null
          bundle_ids: string[]
          category: string | null
          cost_price: number | null
          created_at: string | null
          description: string | null
          featured: boolean | null
          features: string[]
          gallery_urls: string[]
          id: string
          ideal_for: string | null
          image_illustrative: boolean
          image_url: string | null
          includes_installation: boolean
          model: string | null
          on_sale: boolean
          original_price: number | null
          price: number
          promo_enabled: boolean
          promo_price: number | null
          promo_until: string | null
          related_ids: string[]
          sku: string | null
          specs: Json
          status: string
          stock: number
          subcategory: string | null
          summary: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          box_items?: string[]
          brand?: string | null
          bundle_ids?: string[]
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          features?: string[]
          gallery_urls?: string[]
          id?: string
          ideal_for?: string | null
          image_illustrative?: boolean
          image_url?: string | null
          includes_installation?: boolean
          model?: string | null
          on_sale?: boolean
          original_price?: number | null
          price?: number
          promo_enabled?: boolean
          promo_price?: number | null
          promo_until?: string | null
          related_ids?: string[]
          sku?: string | null
          specs?: Json
          status?: string
          stock?: number
          subcategory?: string | null
          summary?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          box_items?: string[]
          brand?: string | null
          bundle_ids?: string[]
          category?: string | null
          cost_price?: number | null
          created_at?: string | null
          description?: string | null
          featured?: boolean | null
          features?: string[]
          gallery_urls?: string[]
          id?: string
          ideal_for?: string | null
          image_illustrative?: boolean
          image_url?: string | null
          includes_installation?: boolean
          model?: string | null
          on_sale?: boolean
          original_price?: number | null
          price?: number
          promo_enabled?: boolean
          promo_price?: number | null
          promo_until?: string | null
          related_ids?: string[]
          sku?: string | null
          specs?: Json
          status?: string
          stock?: number
          subcategory?: string | null
          summary?: string | null
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
      quote_versions: {
        Row: {
          change_note: string | null
          change_type: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          pdf_url: string | null
          quote_id: string
          snapshot: Json
          status: string | null
          total: number | null
          version: number
        }
        Insert: {
          change_note?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          pdf_url?: string | null
          quote_id: string
          snapshot: Json
          status?: string | null
          total?: number | null
          version: number
        }
        Update: {
          change_note?: string | null
          change_type?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          pdf_url?: string | null
          quote_id?: string
          snapshot?: Json
          status?: string | null
          total?: number | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "quote_versions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          contract_text: string | null
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
          contract_text?: string | null
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
          contract_text?: string | null
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
      service_defaults: {
        Row: {
          image_url: string | null
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          image_url?: string | null
          name: string
          price?: number
          updated_at?: string
        }
        Update: {
          image_url?: string | null
          name?: string
          price?: number
          updated_at?: string
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
      technicians: {
        Row: {
          created_at: string
          email: string
          name: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          name?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          name?: string | null
          user_id?: string
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
      claim_first_admin: { Args: never; Returns: boolean }
      get_order_by_number: { Args: { _order_number: string }; Returns: Json }
      get_order_statuses: {
        Args: { _order_numbers: string[] }
        Returns: {
          order_number: string
          status: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      next_quote_number: { Args: never; Returns: string }
      save_push_subscription: {
        Args: {
          _auth: string
          _endpoint: string
          _order_number: string
          _p256dh: string
        }
        Returns: boolean
      }
      staff_shortcut: { Args: never; Returns: Json }
      tech_update_appointment: {
        Args: { _id: string; _mark: string; _status: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "tecnico"
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
      app_role: ["admin", "user", "tecnico"],
    },
  },
} as const
