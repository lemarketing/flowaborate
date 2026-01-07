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
      collaborations: {
        Row: {
          created_at: string
          delivery_date: string | null
          editing_deadline: string | null
          editor_id: string | null
          file_references: Json | null
          guest_profile_id: string | null
          host_id: string
          id: string
          invite_token: string | null
          notes: string | null
          posting_checklist: Json | null
          prep_date: string | null
          recorded_date: string | null
          reschedule_count: number | null
          scheduled_date: string | null
          status: Database["public"]["Enums"]["collaboration_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          delivery_date?: string | null
          editing_deadline?: string | null
          editor_id?: string | null
          file_references?: Json | null
          guest_profile_id?: string | null
          host_id: string
          id?: string
          invite_token?: string | null
          notes?: string | null
          posting_checklist?: Json | null
          prep_date?: string | null
          recorded_date?: string | null
          reschedule_count?: number | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["collaboration_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          delivery_date?: string | null
          editing_deadline?: string | null
          editor_id?: string | null
          file_references?: Json | null
          guest_profile_id?: string | null
          host_id?: string
          id?: string
          invite_token?: string | null
          notes?: string | null
          posting_checklist?: Json | null
          prep_date?: string | null
          recorded_date?: string | null
          reschedule_count?: number | null
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["collaboration_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collaborations_guest_profile_id_fkey"
            columns: ["guest_profile_id"]
            isOneToOne: false
            referencedRelation: "guest_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collaborations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_profiles: {
        Row: {
          bio: string | null
          created_at: string
          email: string
          headshot_url: string | null
          id: string
          name: string
          pronunciation_notes: string | null
          social_links: Json | null
          topics: string[] | null
          updated_at: string
          user_id: string | null
          website_url: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email: string
          headshot_url?: string | null
          id?: string
          name: string
          pronunciation_notes?: string | null
          social_links?: Json | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string
          headshot_url?: string | null
          id?: string
          name?: string
          pronunciation_notes?: string | null
          social_links?: Json | null
          topics?: string[] | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          assigned_user_id: string | null
          collaboration_id: string
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          is_skipped: boolean | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_role: Database["public"]["Enums"]["app_role"]
          assigned_user_id?: string | null
          collaboration_id: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_role?: Database["public"]["Enums"]["app_role"]
          assigned_user_id?: string | null
          collaboration_id?: string
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          is_skipped?: boolean | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_collaboration_id_fkey"
            columns: ["collaboration_id"]
            isOneToOne: false
            referencedRelation: "collaborations"
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
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          external_storage_url: string | null
          id: string
          max_reschedules: number | null
          name: string
          owner_id: string
          reschedule_cutoff_hours: number | null
          status: Database["public"]["Enums"]["workspace_status"]
          updated_at: string
          welcome_message: string | null
          welcome_video_url: string | null
        }
        Insert: {
          created_at?: string
          external_storage_url?: string | null
          id?: string
          max_reschedules?: number | null
          name: string
          owner_id: string
          reschedule_cutoff_hours?: number | null
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          welcome_message?: string | null
          welcome_video_url?: string | null
        }
        Update: {
          created_at?: string
          external_storage_url?: string | null
          id?: string
          max_reschedules?: number | null
          name?: string
          owner_id?: string
          reschedule_cutoff_hours?: number | null
          status?: Database["public"]["Enums"]["workspace_status"]
          updated_at?: string
          welcome_message?: string | null
          welcome_video_url?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_collaboration: {
        Args: { _collaboration_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "host" | "guest" | "editor"
      collaboration_status:
        | "invited"
        | "intake_completed"
        | "scheduled"
        | "recorded"
        | "editing"
        | "ready"
        | "completed"
        | "cancelled"
      workspace_status: "active" | "archived"
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
      app_role: ["host", "guest", "editor"],
      collaboration_status: [
        "invited",
        "intake_completed",
        "scheduled",
        "recorded",
        "editing",
        "ready",
        "completed",
        "cancelled",
      ],
      workspace_status: ["active", "archived"],
    },
  },
} as const
