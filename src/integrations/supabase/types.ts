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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      bundle_products: {
        Row: {
          bundle_product_id: string
          created_at: string
          id: string
          included_product_id: string
          sort_order: number
        }
        Insert: {
          bundle_product_id: string
          created_at?: string
          id?: string
          included_product_id: string
          sort_order?: number
        }
        Update: {
          bundle_product_id?: string
          created_at?: string
          id?: string
          included_product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bundle_products_bundle_product_id_fkey"
            columns: ["bundle_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bundle_products_included_product_id_fkey"
            columns: ["included_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name_en: string
          name_it: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name_en: string
          name_it: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name_en?: string
          name_it?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      checkins: {
        Row: {
          action_chosen: string | null
          created_at: string
          emotion: string | null
          hunger_type: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          action_chosen?: string | null
          created_at?: string
          emotion?: string | null
          hunger_type: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          action_chosen?: string | null
          created_at?: string
          emotion?: string | null
          hunger_type?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          access_type: string
          created_at: string
          environment: string
          granted_at: string
          id: string
          is_active: boolean
          product_id: string
          purchase_id: string | null
          revoked_at: string | null
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_type?: string
          created_at?: string
          environment?: string
          granted_at?: string
          id?: string
          is_active?: boolean
          product_id: string
          purchase_id?: string | null
          revoked_at?: string | null
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_type?: string
          created_at?: string
          environment?: string
          granted_at?: string
          id?: string
          is_active?: boolean
          product_id?: string
          purchase_id?: string | null
          revoked_at?: string | null
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entitlements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entitlements_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          duration_seconds: number
          id: string
          instructions: string
          instructions_en: string
          slug: string
          sort_order: number
          title: string
          title_en: string
        }
        Insert: {
          duration_seconds?: number
          id?: string
          instructions: string
          instructions_en: string
          slug: string
          sort_order?: number
          title: string
          title_en: string
        }
        Update: {
          duration_seconds?: number
          id?: string
          instructions?: string
          instructions_en?: string
          slug?: string
          sort_order?: number
          title?: string
          title_en?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          amount_paid: number | null
          created_at: string
          currency: string
          environment: string
          expires_at: string | null
          gift_message: string | null
          id: string
          product_id: string
          purchased_at: string | null
          purchaser_email: string | null
          purchaser_user_id: string | null
          recipient_email: string
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          redemption_token_hash: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string | null
          gift_message?: string | null
          id?: string
          product_id: string
          purchased_at?: string | null
          purchaser_email?: string | null
          purchaser_user_id?: string | null
          recipient_email: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redemption_token_hash: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          currency?: string
          environment?: string
          expires_at?: string | null
          gift_message?: string | null
          id?: string
          product_id?: string
          purchased_at?: string | null
          purchaser_email?: string | null
          purchaser_user_id?: string | null
          recipient_email?: string
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          redemption_token_hash?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gifts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          audience: string
          brevo_campaign_id: string | null
          category_id: string | null
          created_at: string
          created_by: string | null
          error_message: string | null
          html_content: string
          id: string
          language: string | null
          product_id: string | null
          recipients_count: number
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          audience?: string
          brevo_campaign_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          html_content: string
          id?: string
          language?: string | null
          product_id?: string | null
          recipients_count?: number
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          audience?: string
          brevo_campaign_id?: string | null
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          html_content?: string
          id?: string
          language?: string | null
          product_id?: string | null
          recipients_count?: number
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_assets: {
        Row: {
          asset_type: string
          created_at: string
          external_url: string | null
          id: string
          is_active: boolean
          product_id: string
          sort_order: number
          storage_path: string | null
          title: string
          updated_at: string
        }
        Insert: {
          asset_type?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          product_id: string
          sort_order?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_active?: boolean
          product_id?: string
          sort_order?: number
          storage_path?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_assets_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          accent_color: string | null
          access_mode: string
          app_path: string | null
          app_url: string | null
          badge: string | null
          category_id: string | null
          created_at: string
          currency: string
          description_en: string
          description_it: string
          id: string
          image_url: string | null
          name_en: string
          name_it: string
          price: number
          product_type: string
          short_description_en: string
          short_description_it: string
          slug: string
          sort_order: number
          status: string
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          access_mode?: string
          app_path?: string | null
          app_url?: string | null
          badge?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description_en?: string
          description_it?: string
          id?: string
          image_url?: string | null
          name_en: string
          name_it: string
          price?: number
          product_type?: string
          short_description_en?: string
          short_description_it?: string
          slug: string
          sort_order?: number
          status?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          access_mode?: string
          app_path?: string | null
          app_url?: string | null
          badge?: string | null
          category_id?: string | null
          created_at?: string
          currency?: string
          description_en?: string
          description_it?: string
          id?: string
          image_url?: string | null
          name_en?: string
          name_it?: string
          price?: number
          product_type?: string
          short_description_en?: string
          short_description_it?: string
          slug?: string
          sort_order?: number
          status?: string
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          brevo_synced_at: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          language: string
          marketing_consent: boolean
          marketing_consent_at: string | null
          marketing_language: string
          onboarding_done: boolean
          preferred_language: string
          trigger_other: string | null
          triggers: string[]
          updated_at: string
        }
        Insert: {
          brevo_synced_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          language?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          marketing_language?: string
          onboarding_done?: boolean
          preferred_language?: string
          trigger_other?: string | null
          triggers?: string[]
          updated_at?: string
        }
        Update: {
          brevo_synced_at?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string
          marketing_consent?: boolean
          marketing_consent_at?: string | null
          marketing_language?: string
          onboarding_done?: boolean
          preferred_language?: string
          trigger_other?: string | null
          triggers?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_paid: number | null
          created_at: string
          currency: string
          environment: string
          id: string
          product_id: string
          purchased_at: string | null
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          product_id: string
          purchased_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          currency?: string
          environment?: string
          id?: string
          product_id?: string
          purchased_at?: string | null
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_product_state: {
        Row: {
          created_at: string
          first_opened_at: string | null
          id: string
          last_opened_at: string | null
          onboarding_completed: boolean
          product_id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          onboarding_completed?: boolean
          product_id: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_opened_at?: string | null
          id?: string
          last_opened_at?: string | null
          onboarding_completed?: boolean
          product_id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_product_state_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_product_access:
        | { Args: { _slug: string; _user_id: string }; Returns: boolean }
        | {
            Args: { _env?: string; _slug: string; _user_id: string }
            Returns: boolean
          }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      redeem_gift: {
        Args: { _environment: string; _token_hash: string; _user_id: string }
        Returns: Json
      }
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
      app_role: ["admin", "user"],
    },
  },
} as const
