export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bike_components: {
        Row: {
          bike_id: string
          component_type_id: string
          created_at: string
          current_distance: number | null
          id: string
          install_distance: number | null
          is_active: boolean | null
          replacement_distance: number
          updated_at: string
        }
        Insert: {
          bike_id: string
          component_type_id: string
          created_at?: string
          current_distance?: number | null
          id?: string
          install_distance?: number | null
          is_active?: boolean | null
          replacement_distance: number
          updated_at?: string
        }
        Update: {
          bike_id?: string
          component_type_id?: string
          created_at?: string
          current_distance?: number | null
          id?: string
          install_distance?: number | null
          is_active?: boolean | null
          replacement_distance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bike_components_bike_id_fkey"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bike_components_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
        ]
      }
      bike_valuations: {
        Row: {
          bike_id: string
          created_at: string
          estimated_value: number
          id: string
          valuation_date: string
          valuation_source: string | null
        }
        Insert: {
          bike_id: string
          created_at?: string
          estimated_value: number
          id?: string
          valuation_date?: string
          valuation_source?: string | null
        }
        Update: {
          bike_id?: string
          created_at?: string
          estimated_value?: number
          id?: string
          valuation_date?: string
          valuation_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bike_valuations_bike_id"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      bikes: {
        Row: {
          bike_type: string | null
          brand: string | null
          component_details: string | null
          created_at: string
          estimated_value: number | null
          id: string
          image_url: string | null
          last_valuation_date: string | null
          model: string | null
          name: string
          price: number | null
          purchase_date: string | null
          total_distance: number | null
          updated_at: string
          user_id: string
          valuation_source: string | null
          weight: number | null
          year: number | null
        }
        Insert: {
          bike_type?: string | null
          brand?: string | null
          component_details?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          last_valuation_date?: string | null
          model?: string | null
          name: string
          price?: number | null
          purchase_date?: string | null
          total_distance?: number | null
          updated_at?: string
          user_id: string
          valuation_source?: string | null
          weight?: number | null
          year?: number | null
        }
        Update: {
          bike_type?: string | null
          brand?: string | null
          component_details?: string | null
          created_at?: string
          estimated_value?: number | null
          id?: string
          image_url?: string | null
          last_valuation_date?: string | null
          model?: string | null
          name?: string
          price?: number | null
          purchase_date?: string | null
          total_distance?: number | null
          updated_at?: string
          user_id?: string
          valuation_source?: string | null
          weight?: number | null
          year?: number | null
        }
        Relationships: []
      }
      component_types: {
        Row: {
          created_at: string
          default_replacement_distance: number
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          default_replacement_distance: number
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          default_replacement_distance?: number
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      maintenance_records: {
        Row: {
          action_type: string
          bike_component_id: string
          cost: number | null
          created_at: string
          distance_at_action: number
          id: string
          notes: string | null
        }
        Insert: {
          action_type: string
          bike_component_id: string
          cost?: number | null
          created_at?: string
          distance_at_action: number
          id?: string
          notes?: string | null
        }
        Update: {
          action_type?: string
          bike_component_id?: string
          cost?: number | null
          created_at?: string
          distance_at_action?: number
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_records_bike_component_id_fkey"
            columns: ["bike_component_id"]
            isOneToOne: false
            referencedRelation: "bike_components"
            referencedColumns: ["id"]
          },
        ]
      }
      parts_inventory: {
        Row: {
          component_type_id: string
          created_at: string
          id: string
          notes: string | null
          purchase_price: number | null
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          component_type_id: string
          created_at?: string
          id?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          component_type_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          purchase_price?: number | null
          quantity?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parts_inventory_component_type_id_fkey"
            columns: ["component_type_id"]
            isOneToOne: false
            referencedRelation: "component_types"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          strava_access_token: string | null
          strava_athlete_id: string | null
          strava_refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          strava_access_token?: string | null
          strava_athlete_id?: string | null
          strava_refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          strava_access_token?: string | null
          strava_athlete_id?: string | null
          strava_refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      strava_activities: {
        Row: {
          bike_id: string | null
          created_at: string
          distance: number
          id: string
          processed_at: string
          strava_activity_id: string
          user_id: string
        }
        Insert: {
          bike_id?: string | null
          created_at?: string
          distance: number
          id?: string
          processed_at?: string
          strava_activity_id: string
          user_id: string
        }
        Update: {
          bike_id?: string | null
          created_at?: string
          distance?: number
          id?: string
          processed_at?: string
          strava_activity_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_strava_activities_bike"
            columns: ["bike_id"]
            isOneToOne: false
            referencedRelation: "bikes"
            referencedColumns: ["id"]
          },
        ]
      }
      valuation_history: {
        Row: {
          created_at: string
          id: string
          total_bikes_valued: number
          total_estimated_value: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          total_bikes_valued: number
          total_estimated_value: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          total_bikes_valued?: number
          total_estimated_value?: number
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
