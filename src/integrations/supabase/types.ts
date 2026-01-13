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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      areas: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          id: string
          is_all_day: boolean
          module: string | null
          origin_id: string | null
          origin_type: string
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          module?: string | null
          origin_id?: string | null
          origin_type: string
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          id?: string
          is_all_day?: boolean
          module?: string | null
          origin_id?: string | null
          origin_type?: string
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          auto_summary: Json | null
          content: string | null
          created_at: string
          id: string
          log_date: string
          mood: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_summary?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          log_date?: string
          mood?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_summary?: Json | null
          content?: string | null
          created_at?: string
          id?: string
          log_date?: string
          mood?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      finance_assets: {
        Row: {
          class: string
          created_at: string
          icon: string | null
          id: string
          name: string
          notes: string | null
          type: string
          updated_at: string
          user_id: string
          value: number
        }
        Insert: {
          class?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id: string
          value?: number
        }
        Update: {
          class?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          notes?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      game_rules: {
        Row: {
          created_at: string
          hp_penalty_rate: number
          id: string
          sprint_duration_days: number
          updated_at: string
          user_id: string
          xp_multiplier: number
        }
        Insert: {
          created_at?: string
          hp_penalty_rate?: number
          id?: string
          sprint_duration_days?: number
          updated_at?: string
          user_id: string
          xp_multiplier?: number
        }
        Update: {
          created_at?: string
          hp_penalty_rate?: number
          id?: string
          sprint_duration_days?: number
          updated_at?: string
          user_id?: string
          xp_multiplier?: number
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          id: string
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          id?: string
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          id?: string
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          completed_at: string
          habit_id: string
          hp_change: number
          id: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed_at?: string
          habit_id: string
          hp_change?: number
          id?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed_at?: string
          habit_id?: string
          hp_change?: number
          id?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          area_id: string | null
          category: Database["public"]["Enums"]["habit_category"]
          created_at: string
          hp_impact: number
          icon: string | null
          id: string
          is_active: boolean
          last_completed_at: string | null
          name: string
          streak_current: number
          type: Database["public"]["Enums"]["habit_type"]
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          area_id?: string | null
          category?: Database["public"]["Enums"]["habit_category"]
          created_at?: string
          hp_impact?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          last_completed_at?: string | null
          name: string
          streak_current?: number
          type?: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          area_id?: string | null
          category?: Database["public"]["Enums"]["habit_category"]
          created_at?: string
          hp_impact?: number
          icon?: string | null
          id?: string
          is_active?: boolean
          last_completed_at?: string | null
          name?: string
          streak_current?: number
          type?: Database["public"]["Enums"]["habit_type"]
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "habits_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          is_folder: boolean
          parent_id: string | null
          project_id: string | null
          tags: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          is_folder?: boolean
          parent_id?: string | null
          project_id?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          is_folder?: boolean
          parent_id?: string | null
          project_id?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      pockets: {
        Row: {
          allocated_amount: number
          color: string | null
          created_at: string
          icon: string | null
          id: string
          linked_asset_id: string
          name: string
          target_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_amount?: number
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          linked_asset_id: string
          name: string
          target_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_amount?: number
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          linked_asset_id?: string
          name?: string
          target_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pockets_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "finance_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          credits: number
          current_xp: number
          hp: number
          id: string
          is_onboarded: boolean
          level: number
          max_hp: number
          max_xp_for_next_level: number
          setup_completed_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_xp?: number
          hp?: number
          id: string
          is_onboarded?: boolean
          level?: number
          max_hp?: number
          max_xp_for_next_level?: number
          setup_completed_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          credits?: number
          current_xp?: number
          hp?: number
          id?: string
          is_onboarded?: boolean
          level?: number
          max_hp?: number
          max_xp_for_next_level?: number
          setup_completed_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          area_id: string | null
          color_theme: string | null
          created_at: string
          deadline: string | null
          description: string | null
          id: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id?: string | null
          color_theme?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string | null
          color_theme?: string | null
          created_at?: string
          deadline?: string | null
          description?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          difficulty: Database["public"]["Enums"]["task_difficulty"]
          due_date: string | null
          id: string
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          time_estimate: string | null
          title: string
          updated_at: string
          user_id: string
          xp_reward: number
        }
        Insert: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["task_difficulty"]
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_estimate?: string | null
          title: string
          updated_at?: string
          user_id: string
          xp_reward?: number
        }
        Update: {
          assignee?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          difficulty?: Database["public"]["Enums"]["task_difficulty"]
          due_date?: string | null
          id?: string
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          time_estimate?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          area_id: string | null
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean
          linked_asset_id: string | null
          notes: string | null
          recurrence_frequency: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          area_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          linked_asset_id?: string | null
          notes?: string | null
          recurrence_frequency?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          area_id?: string | null
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          linked_asset_id?: string | null
          notes?: string | null
          recurrence_frequency?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_linked_asset_id_fkey"
            columns: ["linked_asset_id"]
            isOneToOne: false
            referencedRelation: "finance_assets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "player" | "premium" | "admin"
      habit_category: "health" | "mana" | "stamina"
      habit_type: "positive" | "negative"
      task_difficulty: "easy" | "medium" | "hard" | "boss"
      task_status: "backlog" | "todo" | "in_progress" | "done"
      transaction_type: "income" | "expense"
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
      app_role: ["player", "premium", "admin"],
      habit_category: ["health", "mana", "stamina"],
      habit_type: ["positive", "negative"],
      task_difficulty: ["easy", "medium", "hard", "boss"],
      task_status: ["backlog", "todo", "in_progress", "done"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
