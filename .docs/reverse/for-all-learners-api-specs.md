# for-all-learners API仕様書（逆生成）

## 分析日時
2025-07-31 JST

## API概要

### アーキテクチャ
- **パターン**: Server Actions (主要) + REST API (補助)
- **認証**: Supabase Auth (Cookie-based Sessions)
- **データ形式**: JSON
- **エラーハンドリング**: TypeScript型安全 + Exception throwing

### ベースURL
```
Production: https://[vercel-domain].vercel.app
Development: http://localhost:3000
```

## Server Actions API

### 認証関連 (`app/_actions/auth.ts`)

#### `loginWithGoogle()`
**説明**: Google OAuth経由でのログイン

**パラメータ**: なし

**レスポンス**: リダイレクト実行

**エラー**: 
```typescript
throw new Error("Google login failed")
```

#### `loginWithMagicLink(formData: FormData)`
**説明**: Magic Link経由でのログイン

**パラメータ**:
```typescript
FormData {
  email: string
}
```

**レスポンス**: Magic Link 送信完了

**エラー**:
```typescript
throw new Error("Magic link failed")
```

#### `logout()`
**説明**: ユーザーログアウト

**レスポンス**: リダイレクト実行 (`/auth/login`)

#### `getCurrentUser()`
**説明**: 現在のユーザー情報取得

**レスポンス**:
```typescript
{
  id: string;
  email: string | null;
  full_name: string | null;
  user_slug: string;
  avatar_url: string | null;
  created_at: string | null;
  updated_at: string | null;
} | null
```

### カード・デッキ関連 (`app/_actions/cards.ts`, `app/_actions/decks.ts`)

#### `createCard(card: CardInsert)`
**説明**: 新しいフラッシュカード作成

**パラメータ**:
```typescript
{
  deck_id: string;
  user_id: string;
  front_content: JSONContent; // Tiptap JSON
  back_content: JSONContent;  // Tiptap JSON
  source_audio_url?: string;
  source_ocr_image_url?: string;
}
```

**レスポンス**:
```typescript
{
  id: string;
  deck_id: string;
  user_id: string;
  front_content: JSONContent;
  back_content: JSONContent;
  created_at: string;
  updated_at: string;
  // FSRS fields
  ease_factor: number;
  repetition_count: number;
  review_interval: number;
  next_review_at: string | null;
  stability: number;
  difficulty: number;
}
```

#### `getCardsByDeck(deckId: string)`
**説明**: 指定デッキのカード一覧取得

**パラメータ**: `deckId: string`

**レスポンス**: `Card[]`

#### `updateCard(id: string, updates: CardUpdate)`
**説明**: カード更新

**パラメータ**:
```typescript
{
  id: string;
  updates: {
    front_content?: JSONContent;
    back_content?: JSONContent;
    // その他更新可能フィールド
  }
}
```

#### `deleteCard(id: string)`
**説明**: カード削除

**パラメータ**: `id: string`

**レスポンス**: `void`

#### `createDeck(deck: DeckInsert)`
**説明**: 新しいデッキ作成

**パラメータ**:
```typescript
{
  user_id: string;
  title: string;
  description?: string;
  is_public?: boolean;
}
```

#### `getDecksByUser(userId: string)`
**説明**: ユーザーのデッキ一覧取得

**レスポンス**:
```typescript
{
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  card_count: number;
}[]
```

### ノート・ページ関連 (`app/_actions/notes/`, `app/_actions/pages.ts`)

#### `createNote(note: NoteInsert)`
**説明**: 新しいノート作成

**パラメータ**:
```typescript
{
  title: string;
  description?: string;
  visibility: 'private' | 'public';
  owner_id: string;
}
```

#### `getNotesList(userId: string)`
**説明**: ユーザーのノート一覧取得

**レスポンス**:
```typescript
{
  id: string;
  slug: string;
  title: string;
  description: string | null;
  visibility: string;
  updated_at: string;
  page_count: number;
  participant_count: number;
}[]
```

#### `createPage(page: PageInsert)`
**説明**: 新しいページ作成

**パラメータ**:
```typescript
{
  user_id: string;
  title: string;
  content_tiptap: JSONContent;
  is_public?: boolean;
}
```

#### `updatePage(id: string, updates: PageUpdate)`
**説明**: ページ更新（オートセーブ対応）

**パラメータ**:
```typescript
{
  id: string;
  updates: {
    title?: string;
    content_tiptap?: JSONContent;
    is_public?: boolean;
  }
}
```

#### `getPagesByUser(userId: string, limit: number, offset: number, sortBy: 'updated' | 'created')`
**説明**: ユーザーのページ一覧取得（ページネーション対応）

**レスポンス**:
```typescript
{
  pages: {
    id: string;
    title: string;
    content_tiptap: JSONContent;
    created_at: string;
    updated_at: string;
    is_public: boolean;
  }[];
  totalCount: number;
}
```

### ゴミ箱機能 (`app/_actions/notes/`)

#### `moveToTrash(pageIds: string[], noteId: string)`
**説明**: ページをゴミ箱に移動

**パラメータ**:
```typescript
{
  pageIds: string[];
  noteId: string;
}
```

#### `restoreFromTrash(trashId: string)`
**説明**: ゴミ箱からページを復元

#### `deletePagesPermanently(trashIds: string[])`
**説明**: ページを完全削除

#### `getTrashItems(userId: string)`
**説明**: ユーザーのゴミ箱アイテム取得

**レスポンス**:
```typescript
{
  id: string;
  page_id: string;
  page_title: string;
  page_content: string;
  deleted_at: string;
  auto_delete_at: string;
  original_note_id: string | null;
}[]
```

### 学習関連 (`app/_actions/quiz.ts`, `app/_actions/learning_logs.ts`)

#### `startQuiz(deckId: string, settings: QuizSettings)`
**説明**: クイズセッション開始

**パラメータ**:
```typescript
{
  deckId: string;
  settings: {
    questionCount: number;
    questionTypes: QuestionType[];
    difficulty: 'easy' | 'normal' | 'hard';
    shuffleOrder: boolean;
    timeLimitSec?: number;
  }
}
```

**レスポンス**:
```typescript
{
  sessionId: string;
  questions: {
    cardId: string;
    type: QuestionType;
    question: string;
    options?: string[];
    correctAnswer: string;
  }[];
}
```

#### `submitQuizAnswer(sessionId: string, cardId: string, answer: string, isCorrect: boolean)`
**説明**: クイズ回答送信

**パラメータ**:
```typescript
{
  sessionId: string;
  cardId: string;
  answer: string;
  isCorrect: boolean;
  responseTime: number;
}
```

### AI統合関連 (`app/_actions/generateCards.ts`, `app/_actions/transcribe.ts`)

#### `generateCards(content: string, deckId: string, count: number)`
**説明**: AI によるフラッシュカード自動生成

**パラメータ**:
```typescript
{
  content: string;      // 元となるテキスト
  deckId: string;       // 生成先デッキ
  count: number;        // 生成枚数
  locale?: string;      // 言語設定
}
```

**レスポンス**:
```typescript
{
  generatedCards: {
    front_content: JSONContent;
    back_content: JSONContent;
  }[];
  success: boolean;
}
```

#### `transcribeAudio(audioFile: File, deckId: string)`
**説明**: 音声ファイルの文字起こし

**パラメータ**:
```typescript
{
  audioFile: File;
  deckId: string;
}
```

**レスポンス**:
```typescript
{
  transcript: string;
  title: string;
  cards: Card[];
}
```

#### `transcribeImage(imageFile: File)`
**説明**: 画像からのOCRテキスト抽出

**パラメータ**:
```typescript
{
  imageFile: File;
}
```

**レスポンス**:
```typescript
{
  extractedText: string;
  structuredContent: JSONContent;
}
```

### 外部サービス統合

#### Cosense統合 (`app/_actions/cosense.ts`)

#### `getUserCosenseProjects()`
**説明**: ユーザーの連携Cosenseプロジェクト取得

**レスポンス**:
```typescript
{
  id: string;
  project_name: string;
  lastSyncedAt: string;
  page_count: number;
  accessible: boolean;
}[]
```

#### Gyazo統合 (`app/_actions/gyazo.ts`)

#### `getGyazoAuthUrl()`
**説明**: Gyazo OAuth認証URL生成

**レスポンス**: `string` (認証URL)

#### `handleGyazoCallback(code: string)`
**説明**: Gyazo OAuth コールバック処理

### 管理機能 (`app/_actions/admin.ts`)

#### `isAdmin()`
**説明**: 現在ユーザーの管理者権限確認

**レスポンス**: `boolean`

#### `getSupabaseMetrics()`
**説明**: システムメトリクス取得

**レスポンス**:
```typescript
{
  activeUsers: number;
  totalUsers: number;
  totalDecks: number;
  totalCards: number;
  totalPages: number;
}
```

## REST API エンドポイント

### `GET /api/pages`
**説明**: ページ一覧取得（外部API用）

**クエリパラメータ**:
```
userId: string (required)
limit: number (default: 100)
offset: number (default: 0)
sortBy: 'updated' | 'created' (default: 'updated')
```

**レスポンス**:
```json
{
  "pages": [...],
  "totalCount": 123
}
```

### `GET /api/search-suggestions`
**説明**: 検索候補取得

**クエリパラメータ**:
```
q: string (検索クエリ)
```

**レスポンス**:
```json
[
  {
    "type": "card" | "page",
    "id": "uuid",
    "text": "表示テキスト",
    "href": "/pages/xxx または /decks/xxx"
  }
]
```

### `GET /api/notes/[slug]/pages`
**説明**: 特定ノートのページ一覧取得

**パスパラメータ**: `slug: string`

**レスポンス**:
```json
{
  "pages": [...],
  "totalCount": 123
}
```

### Cosense統合API

#### `GET /api/cosense/pages/[projectName]`
**説明**: Cosenseプロジェクトのページ一覧取得

#### `GET /api/cosense/sync/list/[cosenseProjectId]`
**説明**: 同期対象ページリスト取得

#### `POST /api/cosense/sync/page/[cosenseProjectId]/[title]`
**説明**: 特定ページの同期実行

### Gyazo統合API

#### `GET /api/gyazo/callback`
**説明**: Gyazo OAuth コールバック処理

#### `POST /api/gyazo/disconnect`
**説明**: Gyazo連携解除

## エラーレスポンス形式

### Server Actions エラー
```typescript
// Server Actions は例外をthrow
throw new Error("エラーメッセージ");

// 型安全なエラーハンドリング
try {
  const result = await serverAction();
} catch (error) {
  // error は Error オブジェクト
  console.error(error.message);
}
```

### REST API エラー
```json
{
  "error": "エラーメッセージ",
  "code": "ERROR_CODE", // 場合によって
  "details": {} // 詳細情報（場合によって）
}
```

**HTTPステータスコード**:
- `200`: 成功
- `400`: 不正なリクエスト
- `401`: 認証が必要
- `403`: 権限不足
- `404`: リソースが見つからない
- `500`: サーバーエラー

## 認証・認可

### 認証方式
- **Session Cookie**: Supabase Auth による HTTPOnly Cookie
- **RLS**: Row Level Security による行レベル認可
- **Middleware**: `middleware.ts` による認証チェック

### 保護されたルート
```typescript
// 保護対象外（PUBLIC_PATHS）
const PUBLIC_PATHS = [
  "/",
  "/auth/login",
  "/auth/callback", 
  "/features",
  "/pricing",
  "/guides",
  "/faq",
  "/inquiry",
  "/changelog",
  "/milestones",
];

// その他のルートはすべて認証必須
```

### RLS ポリシー例
```sql
-- カードは所有者のみアクセス可能
CREATE POLICY "Users can manage own cards" ON cards
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 公開ページは誰でも閲覧可能
CREATE POLICY "Anyone can view public pages" ON pages
  FOR SELECT
  USING (is_public = true OR user_id = auth.uid());
```

## レート制限・キャッシュ

### キャッシュ戦略
```typescript
// 検索候補API
headers: {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30"
}

// React Query によるクライアントキャッシュ
{
  staleTime: 5 * 60 * 1000, // 5分
  cacheTime: 10 * 60 * 1000, // 10分
}
```

### Supabase制限
- **同時接続数**: プランに依存
- **API呼び出し数**: プランに依存  
- **ストレージ**: プランに依存

## OpenAPI準拠仕様（今後の実装推奨）

```yaml
openapi: 3.0.0
info:
  title: For All Learners API
  version: 0.1.8
  description: AI-powered learning application API

paths:
  /api/pages:
    get:
      summary: Get user pages
      parameters:
        - name: userId
          in: query
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: object
                properties:
                  pages:
                    type: array
                  totalCount:
                    type: integer
```

## 実装推奨改善項目

1. **OpenAPI仕様書の生成**: TypeScript型から自動生成
2. **レート制限の実装**: API呼び出し制限
3. **API versioning**: バージョン管理体制
4. **より詳細なエラーコード**: 構造化されたエラー応答
5. **リクエスト/レスポンスの妥当性検証**: Zod等による実行時検証