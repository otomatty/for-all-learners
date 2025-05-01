export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      action_logs: {
        Row: {
          action_type: string
          created_at: string
          duration: number
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          duration: number
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          duration?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      card_page_links: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          page_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          page_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "card_page_links_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "card_page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          back_content: Json
          created_at: string | null
          deck_id: string
          front_content: Json
          id: string
          source_audio_url: string | null
          source_ocr_image_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_content?: Json
          created_at?: string | null
          deck_id: string
          front_content?: Json
          id?: string
          source_audio_url?: string | null
          source_ocr_image_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_content?: Json
          created_at?: string | null
          deck_id?: string
          front_content?: Json
          id?: string
          source_audio_url?: string | null
          source_ocr_image_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_shares: {
        Row: {
          created_at: string | null
          deck_id: string
          id: string
          permission_level: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string | null
          deck_id: string
          id?: string
          permission_level: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string | null
          deck_id?: string
          id?: string
          permission_level?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_shares_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_study_logs: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          studied_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          studied_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          studied_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_study_logs_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_study_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      goal_deck_links: {
        Row: {
          created_at: string | null
          deck_id: string
          goal_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          deck_id: string
          goal_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          deck_id?: string
          goal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goal_deck_links_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_logs: {
        Row: {
          answered_at: string | null
          card_id: string
          id: string
          is_correct: boolean
          next_review_at: string | null
          practice_mode: string
          question_id: string | null
          review_interval: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          card_id: string
          id?: string
          is_correct: boolean
          next_review_at?: string | null
          practice_mode: string
          question_id?: string | null
          review_interval?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          card_id?: string
          id?: string
          is_correct?: boolean
          next_review_at?: string | null
          practice_mode?: string
          question_id?: string | null
          review_interval?: number | null
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_logs_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_logs_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      page_shares: {
        Row: {
          created_at: string | null
          id: string
          page_id: string
          permission_level: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          page_id: string
          permission_level: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          page_id?: string
          permission_level?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_shares_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          content_tiptap: Json
          created_at: string | null
          id: string
          is_public: boolean
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_tiptap: Json
          created_at?: string | null
          id?: string
          is_public?: boolean
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_tiptap?: Json
          created_at?: string | null
          id?: string
          is_public?: boolean
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          question_data: Json
          type: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          question_data: Json
          type: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          question_data?: Json
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_settings: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          name: string
          question_count: number
          question_types: string[]
          shuffle_order: boolean
          time_limit_sec: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          name: string
          question_count?: number
          question_types: string[]
          shuffle_order?: boolean
          time_limit_sec?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          name?: string
          question_count?: number
          question_types?: string[]
          shuffle_order?: boolean
          time_limit_sec?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_inputs: {
        Row: {
          created_at: string
          id: string
          source_url: string
          text_content: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_url: string
          text_content: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          source_url?: string
          text_content?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "raw_inputs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      share_links: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          permission_level: string
          resource_id: string
          resource_type: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          permission_level: string
          resource_id: string
          resource_type: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          permission_level?: string
          resource_id?: string
          resource_type?: string
          token?: string
        }
        Relationships: []
      }
      study_goals: {
        Row: {
          completed_at: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          id: string
          progress_rate: number
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          progress_rate?: number
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          progress_rate?: number
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_goals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
