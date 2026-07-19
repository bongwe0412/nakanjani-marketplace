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
      account_preferences: {
        Row: {
          created_at: string
          default_currency: string
          newsletter: boolean
          order_updates: boolean
          product_recommendations: boolean
          promotions: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_currency?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotions?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_currency?: string
          newsletter?: boolean
          order_updates?: boolean
          product_recommendations?: boolean
          promotions?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string | null
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          updated_at?: string
          user_id: string
          variant_id?: string | null
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes: string | null
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          product_id: string
          quantity: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          notes?: string | null
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_reservations_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_addresses: {
        Row: {
          address_line_1: string
          address_line_2: string | null
          city: string
          company: string | null
          country: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          order_id: string
          phone: string | null
          postal_code: string
          province: string
          suburb: string | null
        }
        Insert: {
          address_line_1: string
          address_line_2?: string | null
          city: string
          company?: string | null
          country?: string
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          order_id: string
          phone?: string | null
          postal_code: string
          province: string
          suburb?: string | null
        }
        Update: {
          address_line_1?: string
          address_line_2?: string | null
          city?: string
          company?: string | null
          country?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          order_id?: string
          phone?: string | null
          postal_code?: string
          province?: string
          suburb?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
          variant_description: string | null
          variant_id: string | null
          vendor_id: string
          vendor_order_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
          variant_description?: string | null
          variant_id?: string | null
          vendor_id: string
          vendor_order_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
          variant_description?: string | null
          variant_id?: string | null
          vendor_id?: string
          vendor_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_vendor_order_id_fkey"
            columns: ["vendor_order_id"]
            isOneToOne: false
            referencedRelation: "vendor_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          discount_amount: number
          id: string
          order_number: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipping_amount: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal: number
          tax_amount: number
          terms_accepted_at: string | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          terms_accepted_at?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          discount_amount?: number
          id?: string
          order_number?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipping_amount?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal?: number
          tax_amount?: number
          terms_accepted_at?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json | null
          payment_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json | null
          payment_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json | null
          payment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          gateway_response: Json | null
          id: string
          order_id: string
          processing_at: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference: string | null
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["payment_txn_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          gateway_response?: Json | null
          id?: string
          order_id: string
          processing_at?: string | null
          provider: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_txn_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          gateway_response?: Json | null
          id?: string
          order_id?: string
          processing_at?: string | null
          provider?: Database["public"]["Enums"]["payment_provider"]
          provider_reference?: string | null
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["payment_txn_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          product_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          product_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          body: string | null
          created_at: string
          helpful_count: number
          id: string
          product_id: string
          rating: number
          title: string | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          product_id: string
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          body?: string | null
          created_at?: string
          helpful_count?: number
          id?: string
          product_id?: string
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          active: boolean
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          id: string
          option_1_name: string | null
          option_1_value: string | null
          option_2_name: string | null
          option_2_value: string | null
          option_3_name: string | null
          option_3_value: string | null
          price: number
          product_id: string
          sku: string | null
          stock_quantity: number
          updated_at: string
          weight: number | null
        }
        Insert: {
          active?: boolean
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          id?: string
          option_1_name?: string | null
          option_1_value?: string | null
          option_2_name?: string | null
          option_2_value?: string | null
          option_3_name?: string | null
          option_3_value?: string | null
          price?: number
          product_id: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight?: number | null
        }
        Update: {
          active?: boolean
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          id?: string
          option_1_name?: string | null
          option_1_value?: string | null
          option_2_name?: string | null
          option_2_value?: string | null
          option_3_name?: string | null
          option_3_value?: string | null
          price?: number
          product_id?: string
          sku?: string | null
          stock_quantity?: number
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string
          description: string | null
          dimensions: Json | null
          featured: boolean
          id: string
          name: string
          price: number
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          subcategory_id: string | null
          updated_at: string
          vendor_id: string
          view_count: number
          weight: number | null
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          featured?: boolean
          id?: string
          name: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          subcategory_id?: string | null
          updated_at?: string
          vendor_id: string
          view_count?: number
          weight?: number | null
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          featured?: boolean
          id?: string
          name?: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          subcategory_id?: string | null
          updated_at?: string
          vendor_id?: string
          view_count?: number
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      recently_viewed: {
        Row: {
          id: string
          product_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          product_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recently_viewed_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
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
      vendor_followers: {
        Row: {
          created_at: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_followers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_orders: {
        Row: {
          created_at: string
          id: string
          order_id: string
          shipping_amount: number
          status: Database["public"]["Enums"]["vendor_order_status"]
          subtotal: number
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["vendor_order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          shipping_amount?: number
          status?: Database["public"]["Enums"]["vendor_order_status"]
          subtotal?: number
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          banner_url: string | null
          created_at: string
          description: string | null
          email: string | null
          followers_count: number
          id: string
          logo_url: string | null
          phone: string | null
          rating: number
          slug: string
          store_name: string
          updated_at: string
          user_id: string
          verification_status: Database["public"]["Enums"]["vendor_status"]
          whatsapp: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number
          id?: string
          logo_url?: string | null
          phone?: string | null
          rating?: number
          slug: string
          store_name: string
          updated_at?: string
          user_id: string
          verification_status?: Database["public"]["Enums"]["vendor_status"]
          whatsapp?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          followers_count?: number
          id?: string
          logo_url?: string | null
          phone?: string | null
          rating?: number
          slug?: string
          store_name?: string
          updated_at?: string
          user_id?: string
          verification_status?: Database["public"]["Enums"]["vendor_status"]
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_cron_status: { Args: never; Returns: Json }
      available_stock: {
        Args: { _product_id: string; _variant_id: string }
        Returns: number
      }
      cancel_payment: { Args: { _payment_id: string }; Returns: undefined }
      cancel_pending_order: { Args: { _order_id: string }; Returns: undefined }
      claim_payments_for_reconciliation: {
        Args: { _max?: number }
        Returns: {
          amount: number
          id: string
          order_id: string
          provider: string
          provider_reference: string
        }[]
      }
      commit_order_reservations: {
        Args: { _order_id: string }
        Returns: undefined
      }
      create_payment: {
        Args: {
          _amount: number
          _order_id: string
          _provider: Database["public"]["Enums"]["payment_provider"]
          _provider_reference?: string
        }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_product_views: {
        Args: { _product_id: string }
        Returns: undefined
      }
      mark_payment_failed: {
        Args: { _gateway_response?: Json; _payment_id: string }
        Returns: undefined
      }
      mark_payment_success: {
        Args: {
          _gateway_response?: Json
          _payment_id: string
          _provider_transaction_id?: string
        }
        Returns: undefined
      }
      owns_product: { Args: { _product_id: string }; Returns: boolean }
      owns_vendor: { Args: { _vendor_id: string }; Returns: boolean }
      record_payment_event: {
        Args: { _event_type: string; _payload?: Json; _payment_id: string }
        Returns: string
      }
      refresh_vendor_rating: {
        Args: { _vendor_id: string }
        Returns: undefined
      }
      release_expired_reservations: { Args: never; Returns: number }
      release_order_reservations: {
        Args: { _order_id: string }
        Returns: undefined
      }
      user_owns_any_vendor_in_order: {
        Args: { _order_id: string }
        Returns: boolean
      }
      verify_cron_secret: { Args: { _secret: string }; Returns: boolean }
    }
    Enums: {
      app_role: "customer" | "vendor" | "admin"
      inventory_movement_type: "stock_in" | "stock_out" | "adjustment"
      order_status: "pending" | "processing" | "completed" | "cancelled"
      payment_provider: "payfast" | "ozow" | "yoco"
      payment_status: "unpaid" | "pending" | "paid" | "refunded" | "failed"
      payment_txn_status:
        | "pending"
        | "processing"
        | "successful"
        | "failed"
        | "cancelled"
        | "refunded"
      product_status: "draft" | "active" | "out_of_stock" | "archived"
      vendor_order_status:
        | "pending"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      vendor_status: "pending" | "approved" | "rejected" | "suspended"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["customer", "vendor", "admin"],
      inventory_movement_type: ["stock_in", "stock_out", "adjustment"],
      order_status: ["pending", "processing", "completed", "cancelled"],
      payment_provider: ["payfast", "ozow", "yoco"],
      payment_status: ["unpaid", "pending", "paid", "refunded", "failed"],
      payment_txn_status: [
        "pending",
        "processing",
        "successful",
        "failed",
        "cancelled",
        "refunded",
      ],
      product_status: ["draft", "active", "out_of_stock", "archived"],
      vendor_order_status: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      vendor_status: ["pending", "approved", "rejected", "suspended"],
    },
  },
} as const
