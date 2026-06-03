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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          annual_price: string
          contact_name: string
          created_at: string
          description: string
          focus: string
          id: string
          monthly_price: string
          name: string
          notes: string
          status: string
          user_id: string
        }
        Insert: {
          annual_price?: string
          contact_name?: string
          created_at?: string
          description?: string
          focus?: string
          id?: string
          monthly_price?: string
          name: string
          notes?: string
          status?: string
          user_id: string
        }
        Update: {
          annual_price?: string
          contact_name?: string
          created_at?: string
          description?: string
          focus?: string
          id?: string
          monthly_price?: string
          name?: string
          notes?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      buy_box_cards: {
        Row: {
          created_at: string
          details: string
          id: string
          slug: string
          sort_order: number
          subtitle: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string
          id?: string
          slug: string
          sort_order?: number
          subtitle?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          slug?: string
          sort_order?: number
          subtitle?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      cash_positions: {
        Row: {
          balance: number
          currency: string
          entity_name: string
          id: string
          recorded_at: string
          user_id: string
        }
        Insert: {
          balance: number
          currency: string
          entity_name: string
          id?: string
          recorded_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          currency?: string
          entity_name?: string
          id?: string
          recorded_at?: string
          user_id?: string
        }
        Relationships: []
      }
      content_ideas: {
        Row: {
          created_at: string
          format: string | null
          id: string
          notes: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          format?: string | null
          id?: string
          notes?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          format?: string | null
          id?: string
          notes?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      content_schedule: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          post_date: string | null
          status: string
          topic: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          post_date?: string | null
          status?: string
          topic?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          post_date?: string | null
          status?: string
          topic?: string | null
          user_id?: string
        }
        Relationships: []
      }
      deals: {
        Row: {
          asking_price: number | null
          business_name: string
          created_at: string
          id: string
          notes: string | null
          source: string | null
          stage: string
          user_id: string
        }
        Insert: {
          asking_price?: number | null
          business_name: string
          created_at?: string
          id?: string
          notes?: string | null
          source?: string | null
          stage?: string
          user_id: string
        }
        Update: {
          asking_price?: number | null
          business_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          source?: string | null
          stage?: string
          user_id?: string
        }
        Relationships: []
      }
      entities: {
        Row: {
          advisor_status: string | null
          compliance_tasks: Json
          id: string
          jurisdiction: string
          name: string
          next_filing_date: string | null
          user_id: string
        }
        Insert: {
          advisor_status?: string | null
          compliance_tasks?: Json
          id?: string
          jurisdiction: string
          name: string
          next_filing_date?: string | null
          user_id: string
        }
        Update: {
          advisor_status?: string | null
          compliance_tasks?: Json
          id?: string
          jurisdiction?: string
          name?: string
          next_filing_date?: string | null
          user_id?: string
        }
        Relationships: []
      }
      fitness_cardio: {
        Row: {
          cadence: string | null
          created_at: string
          id: string
          label: string
          position: number
          user_id: string
        }
        Insert: {
          cadence?: string | null
          created_at?: string
          id?: string
          label: string
          position?: number
          user_id: string
        }
        Update: {
          cadence?: string | null
          created_at?: string
          id?: string
          label?: string
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      fitness_days: {
        Row: {
          created_at: string
          id: string
          label: string | null
          name: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          name: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          name?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_exercises: {
        Row: {
          created_at: string
          day_id: string
          id: string
          name: string
          notes: string | null
          position: number
          reps: string | null
          sets: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day_id: string
          id?: string
          name: string
          notes?: string | null
          position?: number
          reps?: string | null
          sets?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day_id?: string
          id?: string
          name?: string
          notes?: string | null
          position?: number
          reps?: string | null
          sets?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fitness_exercises_day_id_fkey"
            columns: ["day_id"]
            isOneToOne: false
            referencedRelation: "fitness_days"
            referencedColumns: ["id"]
          },
        ]
      }
      fitness_meals: {
        Row: {
          calories: number
          created_at: string
          id: string
          items: string | null
          name: string
          position: number
          protein: number
          updated_at: string
          user_id: string
        }
        Insert: {
          calories?: number
          created_at?: string
          id?: string
          items?: string | null
          name: string
          position?: number
          protein?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          calories?: number
          created_at?: string
          id?: string
          items?: string | null
          name?: string
          position?: number
          protein?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fitness_targets: {
        Row: {
          calorie_max: number
          calorie_min: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
          water_litres: string
          weight_kg: number
        }
        Insert: {
          calorie_max?: number
          calorie_min?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          water_litres?: string
          weight_kg?: number
        }
        Update: {
          calorie_max?: number
          calorie_min?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          water_litres?: string
          weight_kg?: number
        }
        Relationships: []
      }
      lenders: {
        Row: {
          created_at: string
          id: string
          lvr_limit: string
          lvr_min: string
          min_withdraw: string
          name: string
          notes: string
          rates_approx: string
          restrictions: string
          terms: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lvr_limit?: string
          lvr_min?: string
          min_withdraw?: string
          name: string
          notes?: string
          rates_approx?: string
          restrictions?: string
          terms?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lvr_limit?: string
          lvr_min?: string
          min_withdraw?: string
          name?: string
          notes?: string
          rates_approx?: string
          restrictions?: string
          terms?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pipeline_deals: {
        Row: {
          asking_price: string
          created_at: string
          ebitda: string
          id: string
          location: string
          model: string
          name: string
          notes: string
          revenue_range: string
          sector: string
          status: string
          user_id: string
          vertical: string | null
        }
        Insert: {
          asking_price?: string
          created_at?: string
          ebitda?: string
          id?: string
          location?: string
          model?: string
          name: string
          notes?: string
          revenue_range?: string
          sector?: string
          status?: string
          user_id: string
          vertical?: string | null
        }
        Update: {
          asking_price?: string
          created_at?: string
          ebitda?: string
          id?: string
          location?: string
          model?: string
          name?: string
          notes?: string
          revenue_range?: string
          sector?: string
          status?: string
          user_id?: string
          vertical?: string | null
        }
        Relationships: []
      }
      routine_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          day_of_week: string
          id: string
          log_date: string
          notes: string | null
          task_type: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          day_of_week: string
          id?: string
          log_date?: string
          notes?: string | null
          task_type: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          day_of_week?: string
          id?: string
          log_date?: string
          notes?: string | null
          task_type?: string
          user_id?: string
        }
        Relationships: []
      }
      saas_businesses: {
        Row: {
          acquired_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          acquired_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          acquired_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      saas_metrics: {
        Row: {
          active_users: number | null
          churn_rate: number | null
          id: string
          mom_growth: number | null
          mrr: number | null
          nrr: number | null
          recorded_month: string
          saas_business_id: string
          user_id: string
        }
        Insert: {
          active_users?: number | null
          churn_rate?: number | null
          id?: string
          mom_growth?: number | null
          mrr?: number | null
          nrr?: number | null
          recorded_month: string
          saas_business_id: string
          user_id: string
        }
        Update: {
          active_users?: number | null
          churn_rate?: number | null
          id?: string
          mom_growth?: number | null
          mrr?: number | null
          nrr?: number | null
          recorded_month?: string
          saas_business_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saas_metrics_saas_business_id_fkey"
            columns: ["saas_business_id"]
            isOneToOne: false
            referencedRelation: "saas_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      sharesight_allocation: {
        Row: {
          color: string
          id: string
          label: string
          pct: number
          position: number
          user_id: string
        }
        Insert: {
          color?: string
          id?: string
          label: string
          pct?: number
          position?: number
          user_id: string
        }
        Update: {
          color?: string
          id?: string
          label?: string
          pct?: number
          position?: number
          user_id?: string
        }
        Relationships: []
      }
      sharesight_holdings: {
        Row: {
          alloc: number
          id: string
          name: string
          note: string
          pct: number
          position: number
          shares: number | null
          sym: string
          tone: string
          user_id: string
          val: number
        }
        Insert: {
          alloc?: number
          id?: string
          name?: string
          note?: string
          pct?: number
          position?: number
          shares?: number | null
          sym: string
          tone?: string
          user_id: string
          val?: number
        }
        Update: {
          alloc?: number
          id?: string
          name?: string
          note?: string
          pct?: number
          position?: number
          shares?: number | null
          sym?: string
          tone?: string
          user_id?: string
          val?: number
        }
        Relationships: []
      }
      sharesight_oauth: {
        Row: {
          access_token: string
          expires_at: string
          id: number
        }
        Insert: {
          access_token: string
          expires_at: string
          id?: number
        }
        Update: {
          access_token?: string
          expires_at?: string
          id?: number
        }
        Relationships: []
      }
      sharesight_portfolio: {
        Row: {
          cash: number
          day_abs: number
          day_pct: number
          synced_at: string
          total: number
          user_id: string
          ytd_pct: number
        }
        Insert: {
          cash?: number
          day_abs?: number
          day_pct?: number
          synced_at?: string
          total?: number
          user_id: string
          ytd_pct?: number
        }
        Update: {
          cash?: number
          day_abs?: number
          day_pct?: number
          synced_at?: string
          total?: number
          user_id?: string
          ytd_pct?: number
        }
        Relationships: []
      }
      sync_runs: {
        Row: {
          error: string | null
          id: string
          ok: boolean
          ran_at: string
          source: string
        }
        Insert: {
          error?: string | null
          id?: string
          ok: boolean
          ran_at?: string
          source: string
        }
        Update: {
          error?: string | null
          id?: string
          ok?: boolean
          ran_at?: string
          source?: string
        }
        Relationships: []
      }
      todos: {
        Row: {
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          task: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          task: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          task?: string
          user_id?: string
        }
        Relationships: []
      }
      verticals: {
        Row: {
          buy_multiple: string
          created_at: string
          demand_color: string
          demand_trajectory: string
          description: string
          gross_margin: string
          id: string
          name: string
          recession_sensitivity: string
          regulatory_moat: string
          research_notes: string
          sde_margin: string
          tech_disruption_risk: string
          user_id: string
          verdict: string
        }
        Insert: {
          buy_multiple?: string
          created_at?: string
          demand_color?: string
          demand_trajectory?: string
          description?: string
          gross_margin?: string
          id?: string
          name: string
          recession_sensitivity?: string
          regulatory_moat?: string
          research_notes?: string
          sde_margin?: string
          tech_disruption_risk?: string
          user_id: string
          verdict: string
        }
        Update: {
          buy_multiple?: string
          created_at?: string
          demand_color?: string
          demand_trajectory?: string
          description?: string
          gross_margin?: string
          id?: string
          name?: string
          recession_sensitivity?: string
          regulatory_moat?: string
          research_notes?: string
          sde_margin?: string
          tech_disruption_risk?: string
          user_id?: string
          verdict?: string
        }
        Relationships: []
      }
      watchlist: {
        Row: {
          created_at: string
          id: string
          note: string
          position: number
          sym: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string
          position?: number
          sym: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note?: string
          position?: number
          sym?: string
          user_id?: string
        }
        Relationships: []
      }
      x_metrics: {
        Row: {
          followers: number | null
          id: string
          impressions: number | null
          profile_visits: number | null
          recorded_date: string
          user_id: string
        }
        Insert: {
          followers?: number | null
          id?: string
          impressions?: number | null
          profile_visits?: number | null
          recorded_date: string
          user_id: string
        }
        Update: {
          followers?: number | null
          id?: string
          impressions?: number | null
          profile_visits?: number | null
          recorded_date?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
