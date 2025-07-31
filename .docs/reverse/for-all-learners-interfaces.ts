/**
 * for-all-learners TypeScript型定義集約（逆生成）
 * 分析日時: 2025-07-31 JST
 * 
 * 実装されたコードベースから抽出された主要な型定義
 */

// ======================
// データベース型定義 (自動生成ベース)
// ======================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// アカウント・ユーザー関連
export interface Account {
  id: string;
  email: string | null;
  full_name: string | null;
  user_slug: string;
  avatar_url: string | null;
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say' | null;
  birthdate: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserSettings {
  id: string;
  user_id: string;
  theme: 'ocean' | 'forest' | 'sunset' | 'night-sky' | 'desert' | 'blue' | 'green' | 'orange' | 'red' | 'rose' | 'violet' | 'yellow';
  mode: 'light' | 'dark' | 'system';
  locale: string;
  timezone: string;
  notifications: Json;
  items_per_page: number;
  play_help_video_audio: boolean;
  cosense_sync_enabled: boolean;
  notion_sync_enabled: boolean;
  gyazo_sync_enabled: boolean;
  quizlet_sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// フラッシュカード関連
export interface Deck {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  deck_id: string;
  user_id: string;
  front_content: JSONContent; // Tiptap JSON
  back_content: JSONContent;  // Tiptap JSON
  source_audio_url: string | null;
  source_ocr_image_url: string | null;
  created_at: string;
  updated_at: string;
  // FSRS Algorithm fields
  ease_factor: number;
  repetition_count: number;
  review_interval: number;
  next_review_at: string | null;
  stability: number;
  difficulty: number;
  last_reviewed_at: string | null;
}

export interface Question {
  id: string;
  card_id: string;
  user_id: string;
  type: QuestionType;
  question_data: Json;
  created_at: string;
}

// ページ・ノート関連
export interface Page {
  id: string;
  user_id: string;
  title: string;
  thumbnail_url: string | null;
  content_tiptap: JSONContent;
  scrapbox_page_id: string | null;
  scrapbox_page_list_synced_at: string | null;
  scrapbox_page_content_synced_at: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: 'private' | 'public';
  owner_id: string;
  created_at: string;
  updated_at: string;
  page_count: number;
  participant_count: number;
}

export interface NotePageLink {
  id: string;
  note_id: string;
  page_id: string;
  created_at: string;
}

// ゴミ箱関連
export interface PageTrash {
  id: string;
  page_id: string;
  user_id: string;
  original_note_id: string | null;
  page_title: string;
  page_content: string | null;
  deleted_at: string;
  auto_delete_at: string;
  metadata: Json;
}

// 学習進捗関連
export interface LearningLog {
  id: string;
  user_id: string;
  card_id: string;
  question_id: string | null;
  answered_at: string;
  is_correct: boolean;
  user_answer: string | null;
  practice_mode: string;
  review_interval: number | null;
  next_review_at: string | null;
  quality: number;
  response_time: number;
  effort_time: number;
  attempt_count: number;
}

export interface StudyGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  deadline: string | null;
  progress_rate: number;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// 共有関連
export interface DeckShare {
  id: string;
  deck_id: string;
  shared_with_user_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
}

export interface PageShare {
  id: string;
  page_id: string;
  shared_with_user_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
}

export interface NoteShare {
  id: string;
  note_id: string;
  shared_with_user_id: string;
  permission_level: 'view' | 'edit';
  created_at: string;
}

export interface ShareLink {
  id: string;
  resource_type: 'deck' | 'page' | 'note';
  resource_id: string;
  token: string;
  permission_level: 'owner' | 'editor' | 'viewer';
  expires_at: string | null;
  created_at: string;
}

// ======================
// Tiptap エディタ型定義
// ======================

export interface JSONContent {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: {
    type: string;
    attrs?: Record<string, any>;
  }[];
  text?: string;
}

// ======================
// 学習・クイズ関連型定義
// ======================

export type QuestionType = 
  | 'flashcard'
  | 'multiple_choice'
  | 'cloze'
  | 'true_false'
  | 'short_answer';

export interface QuizSettings {
  questionCount: number;
  questionTypes: QuestionType[];
  difficulty: 'easy' | 'normal' | 'hard';
  shuffleOrder: boolean;
  timeLimitSec?: number;
}

export interface QuizSession {
  sessionId: string;
  deckId: string;
  questions: QuizQuestion[];
  settings: QuizSettings;
  startedAt: string;
  completedAt?: string;
}

export interface QuizQuestion {
  cardId: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  responseTime?: number;
}

// ======================
// API レスポンス型定義
// ======================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

// 検索関連
export interface SearchSuggestion {
  type: 'card' | 'page';
  id: string;
  text: string;
  href: string;
  excerpt?: string;
}

// ダッシュボード統計
export interface DashboardStats {
  totalDecks: number;
  totalCards: number;
  totalPages: number;
  studyStreak: number;
  weeklyActivity: {
    date: string;
    count: number;
  }[];
  goalProgress: {
    goalId: string;
    title: string;
    progress: number;
    deadline?: string;
  }[];
}

// ======================
// コンポーネントProps型定義
// ======================

// 認証関連
export interface LoginFormProps {
  onGoogleLogin: () => void;
  onMagicLinkLogin: (email: string) => void;
  loading?: boolean;
  error?: string;
}

// カード関連
export interface CardItemProps {
  card: Card;
  onEdit: (card: Card) => void;
  onDelete: (cardId: string) => void;
  onStudy: (cardId: string) => void;
  showDeckInfo?: boolean;
}

export interface CardFormProps {
  card?: Partial<Card>;
  deckId: string;
  onSubmit: (cardData: Omit<Card, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// デッキ関連
export interface DeckItemProps {
  deck: Deck & { card_count: number };
  onEdit: (deck: Deck) => void;
  onDelete: (deckId: string) => void;
  onStudy: (deckId: string) => void;
}

export interface DeckFormProps {
  deck?: Partial<Deck>;
  onSubmit: (deckData: Omit<Deck, 'id' | 'created_at' | 'updated_at'>) => void;
  onCancel: () => void;
  loading?: boolean;
}

// ページ関連
export interface PageEditorProps {
  page?: Page;
  onSave: (pageData: Partial<Page>) => void;
  onCancel: () => void;
  autoSave?: boolean;
  loading?: boolean;
}

export interface TiptapEditorProps {
  content: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
  placeholder?: string;
  extensions?: any[];
  className?: string;
}

// ノート関連
export interface NotesExplorerProps {
  userId: string;
  onPageMove: (pageIds: string[], targetNoteId: string) => void;
  onPageDelete: (pageIds: string[]) => void;
  onBatchOperation: (operation: 'move' | 'delete', pageIds: string[]) => void;
}

export interface ConflictResolutionProps {
  conflicts: PageConflict[];
  onResolve: (resolution: ConflictResolution[]) => void;
  onCancel: () => void;
}

// 学習関連
export interface QuizSessionProps {
  deckId: string;
  settings: QuizSettings;
  onComplete: (results: QuizResults) => void;
  onExit: () => void;
}

export interface QuizResults {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  averageResponseTime: number;
  cardsToReview: string[];
  completedAt: string;
}

// ======================
// フック型定義
// ======================

export interface UseQueryOptions<T> {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  retry?: boolean | number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseMutationOptions<TData, TError, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: TError, variables: TVariables) => void;
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
}

// ======================
// ユーティリティ型定義
// ======================

export type WithTimestamps<T> = T & {
  created_at: string;
  updated_at: string;
};

export type WithOptionalId<T> = T & {
  id?: string;
};

export type InsertType<T> = Omit<T, 'id' | 'created_at' | 'updated_at'>;
export type UpdateType<T> = Partial<Omit<T, 'id' | 'created_at'>>;

// データベース操作型
export type CardInsert = InsertType<Card>;
export type CardUpdate = UpdateType<Card>;
export type DeckInsert = InsertType<Deck>;
export type DeckUpdate = UpdateType<Deck>;
export type PageInsert = InsertType<Page>;
export type PageUpdate = UpdateType<Page>;
export type NoteInsert = InsertType<Note>;
export type NoteUpdate = UpdateType<Note>;

// ======================
// 外部サービス統合型定義
// ======================

// Cosense (Scrapbox) 統合
export interface CosenseProject {
  id: string;
  project_name: string;
  lastSyncedAt: string;
  page_count: number;
  accessible: boolean;
}

export interface CosensePage {
  id: string;
  title: string;
  content: string;
  updated: number;
  collaborative: boolean;
}

// Gyazo 統合
export interface GyazoImage {
  id: string;
  url: string;
  permalink_url: string;
  thumb_url: string;
  type: string;
  created_at: string;
}

export interface GyazoAlbum {
  id: string;
  title: string;
  description: string;
  images: GyazoImage[];
}

// AI (Gemini) 統合
export interface GeminiGenerationRequest {
  content: string;
  count: number;
  locale?: string;
  type: 'flashcard' | 'quiz' | 'summary';
}

export interface GeminiGenerationResponse {
  generatedCards: {
    front: string;
    back: string;
    explanation?: string;
  }[];
  success: boolean;
  error?: string;
}

// ======================
// 管理機能型定義
// ======================

export interface AdminUser {
  id: string;
  user_id: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: Json;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface SystemMetrics {
  activeUsers: number;
  totalUsers: number;
  totalDecks: number;
  totalCards: number;
  totalPages: number;
  storageUsed: number;
  apiCalls: number;
}

export interface Inquiry {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  category: string;
  subject: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  attachments: string[];
  created_at: string;
  updated_at: string;
}

// ======================
// フォーム検証型定義
// ======================

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormState<T> {
  data: T;
  errors: ValidationError[];
  isLoading: boolean;
  isValid: boolean;
  isDirty: boolean;
}

// ======================
// 設定・環境型定義
// ======================

export interface AppConfig {
  apiBaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  geminiApiKey?: string;
  gyazoClientId?: string;
  enabledFeatures: {
    aiGeneration: boolean;
    cosenseSync: boolean;
    gyazoIntegration: boolean;
    collaborativeNotes: boolean;
  };
  limits: {
    freeGoals: number;
    paidGoals: number;
    maxFileSize: number;
    maxCardsPerDeck: number;
  };
}

export interface FeatureFlags {
  [key: string]: boolean;
}

// ======================
// エラー型定義
// ======================

export class AppError extends Error {
  code: string;
  statusCode?: number;
  details?: any;

  constructor(message: string, code: string, statusCode?: number, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export type ErrorCode = 
  | 'AUTH_REQUIRED'
  | 'PERMISSION_DENIED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'RATE_LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

// ======================
// 高度な型ユーティリティ
// ======================

// 深い Partial 型
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// 深い Required 型
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

// キーから型を抽出
export type ExtractArrayType<T> = T extends (infer U)[] ? U : never;

// 条件付き型
export type Conditional<T, U, V> = T extends U ? V : never;

// ======================
// モジュール拡張・グローバル型
// ======================

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

// Next.js 拡張
declare module 'next' {
  interface NextApiRequest {
    user?: Account;
  }
}

// Supabase 拡張
declare module '@supabase/supabase-js' {
  interface Session {
    user: {
      id: string;
      email?: string;
      user_metadata?: {
        full_name?: string;
        avatar_url?: string;
      };
    };
  }
}

export {};