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
      arbitrage_feedback: {
        Row: {
          actual_outcome: string | null
          actual_profit: number | null
          ai_analysis: string | null
          ai_confidence_score: number | null
          created_at: string
          expected_profit: number
          feedback_reason: string | null
          id: string
          is_valid_opportunity: boolean
          market_1_id: string
          market_1_question: string
          market_2_id: string
          market_2_question: string
          opportunity_id: string
          opportunity_type: string
          user_id: string
        }
        Insert: {
          actual_outcome?: string | null
          actual_profit?: number | null
          ai_analysis?: string | null
          ai_confidence_score?: number | null
          created_at?: string
          expected_profit: number
          feedback_reason?: string | null
          id?: string
          is_valid_opportunity: boolean
          market_1_id: string
          market_1_question: string
          market_2_id: string
          market_2_question: string
          opportunity_id: string
          opportunity_type: string
          user_id: string
        }
        Update: {
          actual_outcome?: string | null
          actual_profit?: number | null
          ai_analysis?: string | null
          ai_confidence_score?: number | null
          created_at?: string
          expected_profit?: number
          feedback_reason?: string | null
          id?: string
          is_valid_opportunity?: boolean
          market_1_id?: string
          market_1_question?: string
          market_2_id?: string
          market_2_question?: string
          opportunity_id?: string
          opportunity_type?: string
          user_id?: string
        }
        Relationships: []
      }
      arbitrage_notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          is_read: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      arbitrage_scan_history: {
        Row: {
          completed_at: string | null
          created_at: string
          high_confidence: number | null
          id: string
          low_confidence: number | null
          markets_scanned: number | null
          medium_confidence: number | null
          opportunities_found: number | null
          scan_config: Json | null
          started_at: string
          status: string
          tradeable_markets: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          high_confidence?: number | null
          id?: string
          low_confidence?: number | null
          markets_scanned?: number | null
          medium_confidence?: number | null
          opportunities_found?: number | null
          scan_config?: Json | null
          started_at?: string
          status?: string
          tradeable_markets?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          high_confidence?: number | null
          id?: string
          low_confidence?: number | null
          markets_scanned?: number | null
          medium_confidence?: number | null
          opportunities_found?: number | null
          scan_config?: Json | null
          started_at?: string
          status?: string
          tradeable_markets?: number | null
          user_id?: string
        }
        Relationships: []
      }
      arbitrage_scan_schedules: {
        Row: {
          created_at: string
          cron_expression: string
          email_on_completion: boolean | null
          email_on_opportunities: boolean | null
          id: string
          is_active: boolean
          last_run_at: string | null
          min_opportunity_threshold: number | null
          next_run_at: string | null
          scan_config: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          cron_expression?: string
          email_on_completion?: boolean | null
          email_on_opportunities?: boolean | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          min_opportunity_threshold?: number | null
          next_run_at?: string | null
          scan_config?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          cron_expression?: string
          email_on_completion?: boolean | null
          email_on_opportunities?: boolean | null
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          min_opportunity_threshold?: number | null
          next_run_at?: string | null
          scan_config?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      arbitrage_watchlist: {
        Row: {
          added_at: string
          alert_threshold: number | null
          current_probability: number | null
          id: string
          initial_probability: number | null
          liquidity: number | null
          market_id: string
          market_question: string
          market_url: string
          notes: string | null
          user_id: string
        }
        Insert: {
          added_at?: string
          alert_threshold?: number | null
          current_probability?: number | null
          id?: string
          initial_probability?: number | null
          liquidity?: number | null
          market_id: string
          market_question: string
          market_url: string
          notes?: string | null
          user_id: string
        }
        Update: {
          added_at?: string
          alert_threshold?: number | null
          current_probability?: number | null
          id?: string
          initial_probability?: number | null
          liquidity?: number | null
          market_id?: string
          market_question?: string
          market_url?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bond_interest_payments: {
        Row: {
          amount: number
          bond_id: string
          created_at: string
          id: string
          payment_date: string
          user_id: string
        }
        Insert: {
          amount: number
          bond_id: string
          created_at?: string
          id?: string
          payment_date?: string
          user_id: string
        }
        Update: {
          amount?: number
          bond_id?: string
          created_at?: string
          id?: string
          payment_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bond_interest_payments_bond_id_fkey"
            columns: ["bond_id"]
            isOneToOne: false
            referencedRelation: "bonds"
            referencedColumns: ["id"]
          },
        ]
      }
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
          bond_code: string | null
          created_at: string
          id: string
          maturity_date: string
          monthly_yield: number
          next_interest_date: string | null
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
          bond_code?: string | null
          created_at?: string
          id?: string
          maturity_date: string
          monthly_yield?: number
          next_interest_date?: string | null
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
          bond_code?: string | null
          created_at?: string
          id?: string
          maturity_date?: string
          monthly_yield?: number
          next_interest_date?: string | null
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
      user_subscriptions: {
        Row: {
          arbitrage_scans_used: number
          comment_posts_used: number
          created_at: string
          current_period_end: string | null
          id: string
          market_queries_used: number
          price_id: string | null
          product_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          usage_reset_at: string
          user_id: string
        }
        Insert: {
          arbitrage_scans_used?: number
          comment_posts_used?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          market_queries_used?: number
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          usage_reset_at?: string
          user_id: string
        }
        Update: {
          arbitrage_scans_used?: number
          comment_posts_used?: number
          created_at?: string
          current_period_end?: string | null
          id?: string
          market_queries_used?: number
          price_id?: string | null
          product_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          usage_reset_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      modify_user_balance: {
        Args: { p_amount: number; p_operation: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
