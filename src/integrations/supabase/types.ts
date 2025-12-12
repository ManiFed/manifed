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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      bond_listings: {
        Row: {
          asking_price: number
          bond_id: string
          created_at: string
          id: string
          seller_id: string
          status: string
          updated_at: string
        }
        Insert: {
          asking_price: number
          bond_id: string
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          asking_price?: number
          bond_id?: string
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bond_listings_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "bonds"
            referencedColumns: ["id"]
          },
        ]
      }
      bond_rates: {
        Row: {
          annual_yield: number
          created_at: string
          effective_date: string
          id: string
          monthly_yield: number
          term_weeks: number
        }
        Insert: {
          annual_yield: number
          created_at?: string
          effective_date?: string
          id?: string
          monthly_yield: number
          term_weeks: number
        }
        Update: {
          annual_yield?: number
          created_at?: string
          effective_date?: string
          id?: string
          monthly_yield?: number
          term_weeks?: number
        }
        Relationships: []
      }
      bond_transactions: {
        Row: {
          bond_id: string
          created_at: string
          from_user_id: string
          id: string
          price: number
          to_user_id: string
          transaction_type: string
        }
        Insert: {
          bond_id: string
          created_at?: string
          from_user_id: string
          id?: string
          price: number
          to_user_id: string
          transaction_type: string
        }
        Update: {
          bond_id?: string
          created_at?: string
          from_user_id?: string
          id?: string
          price?: number
          to_user_id?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "bond_transactions_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "bonds"
            referencedColumns: ["id"]
          },
        ]
      }
      bonds: {
        Row: {
          amount: number
          annual_yield: number
          created_at: string
          id: string
          maturity_date: string
          monthly_yield: number
          purchase_date: string
          status: string
          term_weeks: number
          total_return: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          annual_yield?: number
          created_at?: string
          id?: string
          maturity_date: string
          monthly_yield?: number
          purchase_date?: string
          status?: string
          term_weeks: number
          total_return: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          annual_yield?: number
          created_at?: string
          id?: string
          maturity_date?: string
          monthly_yield?: number
          purchase_date?: string
          status?: string
          term_weeks?: number
          total_return?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fee_pool: {
        Row: {
          amount: number
          created_at: string
          id: string
          paid_out: boolean
          paid_out_at: string | null
          source: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_out?: boolean
          paid_out_at?: string | null
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_out?: boolean
          paid_out_at?: string | null
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      investments: {
        Row: {
          amount: number
          created_at: string
          id: string
          investor_user_id: string
          investor_username: string
          loan_id: string
          message: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          investor_user_id: string
          investor_username: string
          loan_id: string
          message?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          investor_user_id?: string
          investor_username?: string
          loan_id?: string
          message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "investments_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          borrower_reputation: number
          borrower_user_id: string
          borrower_username: string
          collateral_description: string | null
          created_at: string
          description: string
          funded_amount: number
          funding_deadline: string | null
          funding_period_days: number
          id: string
          interest_rate: number
          manifold_market_id: string | null
          maturity_date: string | null
          risk_score: string
          status: string
          term_days: number
          title: string
          updated_at: string
        }
        Insert: {
          amount: number
          borrower_reputation?: number
          borrower_user_id: string
          borrower_username: string
          collateral_description?: string | null
          created_at?: string
          description: string
          funded_amount?: number
          funding_deadline?: string | null
          funding_period_days?: number
          id?: string
          interest_rate: number
          manifold_market_id?: string | null
          maturity_date?: string | null
          risk_score?: string
          status?: string
          term_days: number
          title: string
          updated_at?: string
        }
        Update: {
          amount?: number
          borrower_reputation?: number
          borrower_user_id?: string
          borrower_username?: string
          collateral_description?: string | null
          created_at?: string
          description?: string
          funded_amount?: number
          funding_deadline?: string | null
          funding_period_days?: number
          id?: string
          interest_rate?: number
          manifold_market_id?: string | null
          maturity_date?: string | null
          risk_score?: string
          status?: string
          term_days?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_items: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          price: number
          rarity: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          price: number
          rarity?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number
          rarity?: string
        }
        Relationships: []
      }
      memecoin_holdings: {
        Row: {
          amount: number
          created_at: string
          id: string
          memecoin_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          memecoin_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          memecoin_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memecoin_holdings_memecoin_id_fkey"
            columns: ["memecoin_id"]
            isOneToOne: false
            referencedRelation: "memecoins"
            referencedColumns: ["id"]
          },
        ]
      }
      memecoin_trades: {
        Row: {
          created_at: string
          fee_amount: number
          id: string
          mana_amount: number
          memecoin_id: string
          price_per_token: number
          token_amount: number
          trade_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_amount?: number
          id?: string
          mana_amount: number
          memecoin_id: string
          price_per_token: number
          token_amount: number
          trade_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_amount?: number
          id?: string
          mana_amount?: number
          memecoin_id?: string
          price_per_token?: number
          token_amount?: number
          trade_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memecoin_trades_memecoin_id_fkey"
            columns: ["memecoin_id"]
            isOneToOne: false
            referencedRelation: "memecoins"
            referencedColumns: ["id"]
          },
        ]
      }
      memecoins: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          image_url: string
          name: string
          pool_mana: number
          pool_tokens: number
          symbol: string
          total_supply: number
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          image_url: string
          name: string
          pool_mana?: number
          pool_tokens?: number
          symbol: string
          total_supply?: number
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          image_url?: string
          name?: string
          pool_mana?: number
          pool_tokens?: number
          symbol?: string
          total_supply?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          equipped_background: string | null
          equipped_badge: string | null
          equipped_effect: string | null
          equipped_flair: string | null
          id: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          equipped_background?: string | null
          equipped_badge?: string | null
          equipped_effect?: string | null
          equipped_flair?: string | null
          id?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          equipped_background?: string | null
          equipped_badge?: string | null
          equipped_effect?: string | null
          equipped_flair?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          loan_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          loan_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          loan_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_loan_id_fkey"
            columns: ["loan_id"]
            isOneToOne: false
            referencedRelation: "loans"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_news: {
        Row: {
          content: string
          created_at: string
          id: string
          published_at: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          published_at?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          published_at?: string
          title?: string
        }
        Relationships: []
      }
      user_balances: {
        Row: {
          balance: number
          created_at: string
          id: string
          total_invested: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          total_invested?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          total_invested?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_items: {
        Row: {
          id: string
          is_equipped: boolean
          item_id: string
          purchased_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean
          item_id: string
          purchased_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean
          item_id?: string
          purchased_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_items_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "market_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_manifold_settings: {
        Row: {
          created_at: string
          id: string
          manifold_api_key: string | null
          manifold_user_id: string | null
          manifold_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          manifold_api_key?: string | null
          manifold_user_id?: string | null
          manifold_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          manifold_api_key?: string | null
          manifold_user_id?: string | null
          manifold_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      modify_user_balance: {
        Args: { p_amount: number; p_operation: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
