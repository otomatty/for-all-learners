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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          avatar_url: string | null
          birthdate: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          gender: string | null
          id: string
          updated_at: string | null
          user_slug: string
        }
        Insert: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id: string
          updated_at?: string | null
          user_slug: string
        }
        Update: {
          avatar_url?: string | null
          birthdate?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string | null
          user_slug?: string
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
      admin_users: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_login: string | null
          permissions: Json
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          permissions?: Json
          role: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_login?: string | null
          permissions?: Json
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_transcriptions: {
        Row: {
          created_at: string
          deck_id: string
          duration_sec: number | null
          file_path: string
          id: string
          model_name: string | null
          signed_url: string | null
          title: string | null
          transcript: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          duration_sec?: number | null
          file_path: string
          id?: string
          model_name?: string | null
          signed_url?: string | null
          title?: string | null
          transcript: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          duration_sec?: number | null
          file_path?: string
          id?: string
          model_name?: string | null
          signed_url?: string | null
          title?: string | null
          transcript?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_transcriptions_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audio_transcriptions_user_id_fkey"
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
          difficulty: number
          ease_factor: number
          front_content: Json
          id: string
          last_reviewed_at: string | null
          next_review_at: string | null
          repetition_count: number
          review_interval: number
          source_audio_url: string | null
          source_ocr_image_url: string | null
          source_pdf_url: string | null
          stability: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          back_content?: Json
          created_at?: string | null
          deck_id: string
          difficulty?: number
          ease_factor?: number
          front_content?: Json
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetition_count?: number
          review_interval?: number
          source_audio_url?: string | null
          source_ocr_image_url?: string | null
          source_pdf_url?: string | null
          stability?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          back_content?: Json
          created_at?: string | null
          deck_id?: string
          difficulty?: number
          ease_factor?: number
          front_content?: Json
          id?: string
          last_reviewed_at?: string | null
          next_review_at?: string | null
          repetition_count?: number
          review_interval?: number
          source_audio_url?: string | null
          source_ocr_image_url?: string | null
          source_pdf_url?: string | null
          stability?: number
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
      changelog_entries: {
        Row: {
          created_at: string
          id: string
          published_at: string
          title: string | null
          updated_at: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: string
          published_at: string
          title?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          created_at?: string
          id?: string
          published_at?: string
          title?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      changelog_items: {
        Row: {
          created_at: string
          description: string
          display_order: number
          entry_id: string
          id: string
          type: Database["public"]["Enums"]["change_type_enum"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          display_order?: number
          entry_id: string
          id?: string
          type: Database["public"]["Enums"]["change_type_enum"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          display_order?: number
          entry_id?: string
          id?: string
          type?: Database["public"]["Enums"]["change_type_enum"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "changelog_items_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "changelog_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cosense_projects: {
        Row: {
          created_at: string
          id: string
          project_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_name?: string
          updated_at?: string
        }
        Relationships: []
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
      gyazo_albums: {
        Row: {
          album_id: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          album_id: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          album_id?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          assigned_admin_id: string | null
          body: string
          category_id: number | null
          created_at: string | null
          email: string | null
          id: string
          ip_address: unknown | null
          name: string | null
          page_path: string | null
          priority: Database["public"]["Enums"]["inquiry_priority_enum"] | null
          status: Database["public"]["Enums"]["inquiry_status_enum"] | null
          subject: string | null
          updated_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          body: string
          category_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown | null
          name?: string | null
          page_path?: string | null
          priority?: Database["public"]["Enums"]["inquiry_priority_enum"] | null
          status?: Database["public"]["Enums"]["inquiry_status_enum"] | null
          subject?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          body?: string
          category_id?: number | null
          created_at?: string | null
          email?: string | null
          id?: string
          ip_address?: unknown | null
          name?: string | null
          page_path?: string | null
          priority?: Database["public"]["Enums"]["inquiry_priority_enum"] | null
          status?: Database["public"]["Enums"]["inquiry_status_enum"] | null
          subject?: string | null
          updated_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "inquiry_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          id: string
          inquiry_id: string
          mime_type: string
          size: number
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          id?: string
          inquiry_id: string
          mime_type: string
          size: number
          storage_path: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          id?: string
          inquiry_id?: string
          mime_type?: string
          size?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiry_attachments_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiry_categories: {
        Row: {
          created_at: string | null
          description_en: string | null
          description_ja: string | null
          id: number
          name_en: string
          name_ja: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description_en?: string | null
          description_ja?: string | null
          id?: number
          name_en: string
          name_ja: string
          sort_order?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description_en?: string | null
          description_ja?: string | null
          id?: number
          name_en?: string
          name_ja?: string
          sort_order?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      learning_logs: {
        Row: {
          answered_at: string | null
          attempt_count: number
          card_id: string
          effort_time: number
          id: string
          is_correct: boolean
          next_review_at: string | null
          practice_mode: string
          quality: number
          question_id: string | null
          response_time: number
          review_interval: number | null
          user_answer: string | null
          user_id: string
        }
        Insert: {
          answered_at?: string | null
          attempt_count?: number
          card_id: string
          effort_time?: number
          id?: string
          is_correct: boolean
          next_review_at?: string | null
          practice_mode: string
          quality?: number
          question_id?: string | null
          response_time?: number
          review_interval?: number | null
          user_answer?: string | null
          user_id: string
        }
        Update: {
          answered_at?: string | null
          attempt_count?: number
          card_id?: string
          effort_time?: number
          id?: string
          is_correct?: boolean
          next_review_at?: string | null
          practice_mode?: string
          quality?: number
          question_id?: string | null
          response_time?: number
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
      milestones: {
        Row: {
          created_at: string
          description: string | null
          features: string[] | null
          id: string
          image_url: string | null
          milestone_id: string
          progress: number | null
          related_links: Json | null
          sort_order: number
          status: Database["public"]["Enums"]["milestone_status"]
          timeframe: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          milestone_id: string
          progress?: number | null
          related_links?: Json | null
          sort_order?: number
          status: Database["public"]["Enums"]["milestone_status"]
          timeframe: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          milestone_id?: string
          progress?: number | null
          related_links?: Json | null
          sort_order?: number
          status?: Database["public"]["Enums"]["milestone_status"]
          timeframe?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      note_deck_links: {
        Row: {
          created_at: string
          created_by: string
          deck_id: string
          id: string
          note_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deck_id: string
          id?: string
          note_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deck_id?: string
          id?: string
          note_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_deck_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_deck_links_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_deck_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_page_links: {
        Row: {
          created_at: string
          id: string
          note_id: string
          page_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          page_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_page_links_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      note_shares: {
        Row: {
          created_at: string
          id: string
          note_id: string
          permission_level: string
          shared_with_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          note_id: string
          permission_level: string
          shared_with_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          note_id?: string
          permission_level?: string
          shared_with_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_shares_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "note_shares_shared_with_user_id_fkey"
            columns: ["shared_with_user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          created_at: string
          description: string | null
          id: string
          owner_id: string
          page_count: number
          participant_count: number
          slug: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id: string
          page_count?: number
          participant_count?: number
          slug: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          owner_id?: string
          page_count?: number
          participant_count?: number
          slug?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      page_page_links: {
        Row: {
          created_at: string
          linked_id: string
          page_id: string
        }
        Insert: {
          created_at?: string
          linked_id: string
          page_id: string
        }
        Update: {
          created_at?: string
          linked_id?: string
          page_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_page_links_linked_id_fkey"
            columns: ["linked_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_page_links_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
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
      page_trash: {
        Row: {
          auto_delete_at: string | null
          deleted_at: string | null
          id: string
          metadata: Json | null
          original_note_id: string | null
          page_content: string | null
          page_id: string
          page_title: string
          user_id: string
        }
        Insert: {
          auto_delete_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          original_note_id?: string | null
          page_content?: string | null
          page_id: string
          page_title: string
          user_id: string
        }
        Update: {
          auto_delete_at?: string | null
          deleted_at?: string | null
          id?: string
          metadata?: Json | null
          original_note_id?: string | null
          page_content?: string | null
          page_id?: string
          page_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_trash_original_note_id_fkey"
            columns: ["original_note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_trash_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_trash_user_id_fkey"
            columns: ["user_id"]
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
          scrapbox_page_content_synced_at: string | null
          scrapbox_page_id: string | null
          scrapbox_page_list_synced_at: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content_tiptap: Json
          created_at?: string | null
          id?: string
          is_public?: boolean
          scrapbox_page_content_synced_at?: string | null
          scrapbox_page_id?: string | null
          scrapbox_page_list_synced_at?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content_tiptap?: Json
          created_at?: string | null
          id?: string
          is_public?: boolean
          scrapbox_page_content_synced_at?: string | null
          scrapbox_page_id?: string | null
          scrapbox_page_list_synced_at?: string | null
          thumbnail_url?: string | null
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
      plans: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          features: Json | null
          id: string
          name: string
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id: string
          name: string
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          card_id: string
          created_at: string | null
          id: string
          llm_model_used: string | null
          question_data: Json
          type: string
          user_id: string
        }
        Insert: {
          card_id: string
          created_at?: string | null
          id?: string
          llm_model_used?: string | null
          question_data: Json
          type: string
          user_id: string
        }
        Update: {
          card_id?: string
          created_at?: string | null
          id?: string
          llm_model_used?: string | null
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
      quizlet_sets: {
        Row: {
          created_at: string
          id: string
          set_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          set_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          set_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      reserved_slugs: {
        Row: {
          created_at: string
          description: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          description?: string | null
          slug?: string
        }
        Relationships: []
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
          priority_order: number | null
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
          priority_order?: number | null
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
          priority_order?: number | null
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
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          canceled_at: string | null
          created_at: string
          current_period_end: string
          current_period_start: string
          ended_at: string | null
          id: string
          metadata: Json | null
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_latest_invoice_id: string | null
          stripe_payment_method_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end: string
          current_period_start: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_latest_invoice_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          ended_at?: string | null
          id?: string
          metadata?: Json | null
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_latest_invoice_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cosense_projects: {
        Row: {
          accessible: boolean
          cosense_project_id: string
          created_at: string
          id: string
          page_count: number
          scrapbox_session_cookie: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accessible?: boolean
          cosense_project_id: string
          created_at?: string
          id?: string
          page_count?: number
          scrapbox_session_cookie?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accessible?: boolean
          cosense_project_id?: string
          created_at?: string
          id?: string
          page_count?: number
          scrapbox_session_cookie?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cosense_projects_cosense_project_id_fkey"
            columns: ["cosense_project_id"]
            isOneToOne: false
            referencedRelation: "cosense_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cosense_projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gyazo_albums: {
        Row: {
          created_at: string
          gyazo_album_id: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gyazo_album_id: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          gyazo_album_id?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gyazo_albums_gyazo_album_id_fkey"
            columns: ["gyazo_album_id"]
            isOneToOne: false
            referencedRelation: "gyazo_albums"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_gyazo_albums_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gyazo_images: {
        Row: {
          created_at: string
          gyazo_image_id: string
          id: string
          permalink_url: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          gyazo_image_id: string
          id?: string
          permalink_url: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          gyazo_image_id?: string
          id?: string
          permalink_url?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gyazo_images_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_gyazo_tokens: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_gyazo_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_llm_settings: {
        Row: {
          api_key_encrypted: string
          created_at: string
          id: string
          provider: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key_encrypted: string
          created_at?: string
          id?: string
          provider: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key_encrypted?: string
          created_at?: string
          id?: string
          provider?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_page_prompts: {
        Row: {
          created_at: string
          id: string
          prompt_key: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          prompt_key: string
          template: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          prompt_key?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_page_prompts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quizlet_sets: {
        Row: {
          created_at: string
          id: string
          quizlet_set_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          quizlet_set_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          quizlet_set_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quizlet_sets_quizlet_set_id_fkey"
            columns: ["quizlet_set_id"]
            isOneToOne: false
            referencedRelation: "quizlet_sets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_quizlet_sets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          cosense_sync_enabled: boolean
          created_at: string
          gyazo_sync_enabled: boolean
          id: string
          items_per_page: number
          locale: string
          mode: string
          notifications: Json
          notion_sync_enabled: boolean
          play_help_video_audio: boolean
          quizlet_sync_enabled: boolean
          theme: string
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cosense_sync_enabled?: boolean
          created_at?: string
          gyazo_sync_enabled?: boolean
          id?: string
          items_per_page?: number
          locale?: string
          mode?: string
          notifications?: Json
          notion_sync_enabled?: boolean
          play_help_video_audio?: boolean
          quizlet_sync_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cosense_sync_enabled?: boolean
          created_at?: string
          gyazo_sync_enabled?: boolean
          id?: string
          items_per_page?: number
          locale?: string
          mode?: string
          notifications?: Json
          notion_sync_enabled?: boolean
          play_help_video_audio?: boolean
          quizlet_sync_enabled?: boolean
          theme?: string
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      version_commit_staging: {
        Row: {
          commits: Json
          created_at: string
          id: number
          status: string
          summary: string | null
          updated_at: string
          version: string
        }
        Insert: {
          commits: Json
          created_at?: string
          id?: number
          status?: string
          summary?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          commits?: Json
          created_at?: string
          id?: number
          status?: string
          summary?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      version_release_notes: {
        Row: {
          created_at: string
          id: number
          summary: string
          version: string
        }
        Insert: {
          created_at?: string
          id?: number
          summary: string
          version: string
        }
        Update: {
          created_at?: string
          id?: number
          summary?: string
          version?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrypt_user_llm_api_key: {
        Args: { encrypted_base64: string; key: string }
        Returns: string
      }
      encrypt_user_llm_api_key: {
        Args: { data: string; key: string }
        Returns: string
      }
      extract_page_link_ids: {
        Args: { content: Json }
        Returns: string[]
      }
      extract_tiptap_text: {
        Args: { doc: Json }
        Returns: string
      }
      get_note_pages: {
        Args: {
          p_limit: number
          p_note_id: string
          p_offset: number
          p_sort: string
        }
        Returns: {
          pages: Database["public"]["Tables"]["pages"]["Row"][]
          total_count: number
        }[]
      }
      get_pages_by_ids: {
        Args: { ids: string[]; uid: string }
        Returns: {
          scrapbox_page_id: string
          thumbnail_url: string
          updated_at: string
        }[]
      }
      is_admin_user: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_superadmin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      search_all: {
        Args: { p_limit?: number; p_query: string }
        Returns: {
          id: string
          rank: number
          snippet: string
          title: string
          type: string
        }[]
      }
      search_suggestions: {
        Args: { p_query: string }
        Returns: {
          excerpt: string
          id: string
          suggestion: string
          type: string
        }[]
      }
    }
    Enums: {
      admin_role: "superadmin" | "admin" | "moderator"
      change_type_enum: "new" | "improvement" | "fix" | "security"
      inquiry_priority_enum: "low" | "medium" | "high"
      inquiry_status_enum: "open" | "in_progress" | "resolved" | "closed"
      milestone_status:
        | "planning"
        | "in-progress"
        | "launched"
        | "on-hold"
        | "completed"
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
      admin_role: ["superadmin", "admin", "moderator"],
      change_type_enum: ["new", "improvement", "fix", "security"],
      inquiry_priority_enum: ["low", "medium", "high"],
      inquiry_status_enum: ["open", "in_progress", "resolved", "closed"],
      milestone_status: [
        "planning",
        "in-progress",
        "launched",
        "on-hold",
        "completed",
      ],
    },
  },
} as const
