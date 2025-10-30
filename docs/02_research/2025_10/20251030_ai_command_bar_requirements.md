# AIチャットエージェント統合ツールバー 実装要件定義

**作成日**: 2025-10-30
**対象**: 全開発者
**カテゴリ**: 要件定義・設計書
**優先度**: High

---

## 📋 概要

ページ一覧ページ (`/notes/[slug]`) およびページ詳細ページ (`/notes/[slug]/[pageId]`) の画面下部に、AIチャット機能を内蔵したフローティングツールバーを配置します。

このツールバーは、以下の機能を提供する多機能AIエージェントです：
- ページ情報の要約
- 意味検索（セマンティックサーチ）
- 新しいページの作成支援
- Model Context Protocol (MCP) を利用した外部サービス連携
- カスタマイズ可能なキャラクター設定

---

## 🎯 主要機能

### 1. AIチャット機能
- リアルタイムな会話形式のインターフェース
- コンテキストに応じた応答（ページ一覧 vs ページ詳細）
- ストリーミング応答のサポート
- 会話履歴の保持とクリア機能

### 2. ツールメニュー
- 右端のメニューボタンからアクセス
- 各種ツールへのクイックアクセス
- ツールの有効/無効切り替え

### 3. キャラクターカスタマイズ
- アバター画像の選択
- 口調・話し方の設定
- 性格設定（フレンドリー、フォーマル、ユーモラスなど）

---

## 🏗️ アーキテクチャ

### コンポーネント構造

```
components/ai-command-bar/
├── index.tsx                      # メインコンポーネント
├── AICommandBar.tsx               # ツールバー本体
├── AICommandBar.module.css        # スタイル
├── _components/
│   ├── ChatInterface.tsx          # チャットUI
│   ├── ChatMessage.tsx            # メッセージコンポーネント
│   ├── ChatInput.tsx              # 入力フォーム
│   ├── ToolMenu.tsx               # ツールメニュー
│   ├── ToolMenuItem.tsx           # メニューアイテム
│   ├── CharacterSettings.tsx      # キャラクター設定
│   ├── ContextDisplay.tsx         # コンテキスト表示
│   └── StreamingIndicator.tsx    # ストリーミング中の表示
├── _hooks/
│   ├── useAIChat.ts               # チャット機能
│   ├── useToolMenu.ts             # ツールメニュー管理
│   ├── useCharacterSettings.ts   # キャラクター設定管理
│   ├── useContextProvider.ts     # コンテキスト提供
│   └── useMCPIntegration.ts      # MCP連携
├── _actions/
│   ├── chatWithAI.ts              # AI会話Server Action
│   ├── summarizePages.ts          # ページ要約
│   ├── semanticSearch.ts          # 意味検索
│   ├── createPageFromPrompt.ts   # プロンプトからページ作成
│   └── mcpProxy.ts                # MCPプロキシ
└── _types/
    ├── chat.types.ts              # チャット関連型定義
    ├── tool.types.ts              # ツール関連型定義
    └── character.types.ts         # キャラクター関連型定義
```

---

## 📅 実装フェーズ

### Phase 1: 基本的なツールバーとチャットUI（優先度: Critical）

**目的**: 最小限のAIチャット機能を持つツールバーを実装

**スコープ:**
- フローティングツールバーの配置
- 開閉アニメーション
- 基本的なチャットUI（メッセージ表示、入力フォーム）
- Gemini APIとの基本的な会話機能

**タスク:**
- [ ] ツールバーコンポーネントの実装
  - 画面下部固定配置
  - 開閉トグル機能
  - スライドアップ/ダウンアニメーション
- [ ] チャットインターフェースの実装
  - メッセージリスト表示
  - 入力フォーム
  - 送信ボタン
- [ ] Gemini API連携
  - `chatWithAI` Server Action 実装
  - ストリーミング応答対応
  - エラーハンドリング

**期間**: 3-5日
**依存関係**: なし

**実装ファイル:**
```
components/ai-command-bar/
├── index.tsx
├── AICommandBar.tsx
├── _components/
│   ├── ChatInterface.tsx
│   ├── ChatMessage.tsx
│   └── ChatInput.tsx
├── _hooks/
│   └── useAIChat.ts
└── _actions/
    └── chatWithAI.ts
```

**設計要件:**
```typescript
// AICommandBar.tsx
interface AICommandBarProps {
  context: 'note-list' | 'page-detail';
  noteId?: string;
  pageId?: string;
}

// useAIChat.ts
interface UseAIChatOptions {
  context: string;
  initialMessages?: ChatMessage[];
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}
```

---

### Phase 2: コンテキストに応じた応答（優先度: High）

**目的**: ページ一覧とページ詳細で異なるコンテキストを提供

**スコープ:**
- 現在のページコンテキストの取得
- コンテキストに応じたプロンプト生成
- システムメッセージの動的生成

**タスク:**
- [ ] コンテキストプロバイダーの実装
  - 現在のノート情報取得
  - ページ一覧情報取得
  - ページ詳細情報取得
- [ ] コンテキスト応答ロジック
  - ページ一覧時: ノート全体の要約、ページ検索
  - ページ詳細時: ページ内容の解析、関連ページ提案
- [ ] システムプロンプトの生成
  - コンテキストに基づいた役割設定
  - 利用可能なツールの説明

**期間**: 2-3日
**依存関係**: Phase 1

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   └── ContextDisplay.tsx
├── _hooks/
│   └── useContextProvider.ts
└── _actions/
    └── getContextData.ts
```

**設計要件:**
```typescript
// useContextProvider.ts
interface ContextData {
  type: 'note-list' | 'page-detail';
  note: {
    id: string;
    title: string;
    pageCount: number;
  };
  page?: {
    id: string;
    title: string;
    content: string;
  };
  recentPages?: PageSummary[];
}

// システムプロンプト例
const systemPrompts = {
  'note-list': `あなたは学習支援AIアシスタントです。
現在、ユーザーは「{noteTitle}」というノートのページ一覧を見ています。
このノートには{pageCount}個のページがあります。
以下のことができます：
- ページの要約
- ページの検索
- 新しいページの作成提案`,
  
  'page-detail': `あなたは学習支援AIアシスタントです。
現在、ユーザーは「{pageTitle}」というページを編集しています。
以下のことができます：
- ページ内容の要約
- 関連ページの提案
- 内容の改善提案`
};
```

---

### Phase 3: ページ要約機能（優先度: High）

**目的**: ページ一覧やページ詳細の要約を生成

**スコープ:**
- ページ一覧全体の要約
- 個別ページの要約
- 要約の表示とコピー機能

**タスク:**
- [ ] 要約生成ロジックの実装
  - 複数ページの統合要約
  - 単一ページの詳細要約
  - 構造化された要約フォーマット
- [ ] 要約表示UI
  - 折りたたみ可能な要約カード
  - コピーボタン
  - 再生成ボタン

**期間**: 2-3日
**依存関係**: Phase 2

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   └── SummaryCard.tsx
├── _actions/
│   └── summarizePages.ts
└── _hooks/
    └── useSummarize.ts
```

**設計要件:**
```typescript
// summarizePages.ts
interface SummarizeOptions {
  type: 'note-overview' | 'page-detail';
  noteId?: string;
  pageId?: string;
  maxLength?: number;
}

interface SummaryResult {
  summary: string;
  keyPoints: string[];
  tags: string[];
  relatedPages?: string[];
}
```

---

### Phase 4: 意味検索機能（優先度: High）

**目的**: 自然言語でページを検索

**スコープ:**
- セマンティック検索エンジン統合
- 検索結果の表示
- ページへのナビゲーション

**タスク:**
- [ ] 検索インデックスの構築
  - ページ内容のベクトル化
  - Supabase Vector 拡張の利用
  - インデックスの定期更新
- [ ] 検索ロジックの実装
  - 自然言語クエリの処理
  - ベクトル類似度検索
  - ランキングアルゴリズム
- [ ] 検索結果UIの実装
  - 検索結果カード
  - ページプレビュー
  - クイックナビゲーション

**期間**: 4-5日
**依存関係**: Phase 2

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   ├── SearchResults.tsx
│   └── SearchResultCard.tsx
├── _actions/
│   └── semanticSearch.ts
└── _hooks/
    └── useSemanticSearch.ts
```

**技術要件:**
```typescript
// semanticSearch.ts
interface SearchQuery {
  query: string;
  noteId: string;
  limit?: number;
  threshold?: number; // 類似度の閾値
}

interface SearchResult {
  pageId: string;
  title: string;
  excerpt: string;
  similarity: number;
  highlightedContent: string;
}

// Supabase Vector Extension
-- データベースマイグレーション
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE pages 
ADD COLUMN content_embedding vector(768); -- Gemini embedding dimension

CREATE INDEX ON pages USING ivfflat (content_embedding vector_cosine_ops);
```

---

### Phase 5: ツールメニューの実装（優先度: Medium）

**目的**: 各種ツールへのクイックアクセスを提供

**スコープ:**
- ツールメニューUI
- ツール一覧の表示
- ツールの有効/無効切り替え

**タスク:**
- [ ] ツールメニューコンポーネント
  - ドロップダウンメニュー
  - ツールアイコン
  - ツール説明
- [ ] ツール管理ロジック
  - ツール登録システム
  - 有効/無効状態管理
  - ツール実行フック

**期間**: 2-3日
**依存関係**: Phase 1

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   ├── ToolMenu.tsx
│   └── ToolMenuItem.tsx
├── _hooks/
│   └── useToolMenu.ts
└── _types/
    └── tool.types.ts
```

**設計要件:**
```typescript
// tool.types.ts
interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType;
  enabled: boolean;
  category: 'content' | 'navigation' | 'integration' | 'settings';
  action: () => void | Promise<void>;
}

// 組み込みツール例
const builtInTools: Tool[] = [
  {
    id: 'summarize',
    name: 'ページ要約',
    description: 'このノートのページを要約します',
    icon: FileText,
    enabled: true,
    category: 'content',
    action: handleSummarize
  },
  {
    id: 'search',
    name: '意味検索',
    description: '自然言語でページを検索',
    icon: Search,
    enabled: true,
    category: 'navigation',
    action: handleSearch
  },
  // ...
];
```

---

### Phase 6: ページ作成支援機能（優先度: Medium）

**目的**: プロンプトから新しいページを作成

**スコープ:**
- プロンプトベースのページ生成
- テンプレート選択
- 生成されたページのプレビューと編集

**タスク:**
- [ ] ページ生成ロジック
  - プロンプトからコンテンツ生成
  - タイトル自動生成
  - タグ自動付与
- [ ] ページ作成UI
  - プロンプト入力フォーム
  - テンプレート選択
  - プレビューダイアログ

**期間**: 3-4日
**依存関係**: Phase 2

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   ├── PageCreator.tsx
│   └── PagePreview.tsx
├── _actions/
│   └── createPageFromPrompt.ts
└── _hooks/
    └── usePageCreator.ts
```

**設計要件:**
```typescript
// createPageFromPrompt.ts
interface PageCreationPrompt {
  prompt: string;
  template?: 'blank' | 'note' | 'article' | 'reference';
  noteId: string;
  additionalContext?: string;
}

interface GeneratedPage {
  title: string;
  content: string; // TipTap JSON
  tags: string[];
  suggestedLinks: string[]; // 関連ページID
}
```

---

### Phase 7: キャラクターカスタマイズ（優先度: Medium）

**目的**: AIエージェントの口調や性格をカスタマイズ

**スコープ:**
- アバター画像の選択
- 口調・話し方の設定
- 性格設定

**タスク:**
- [ ] キャラクター設定UI
  - アバター選択画面
  - 口調プリセット選択
  - カスタムプロンプト入力
- [ ] キャラクター設定の保存
  - ユーザーごとの設定保存
  - 設定のインポート/エクスポート
- [ ] 設定の適用
  - システムプロンプトへの統合
  - 応答のスタイル変換

**期間**: 3-4日
**依存関係**: Phase 1

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   ├── CharacterSettings.tsx
│   ├── AvatarSelector.tsx
│   └── ToneSelector.tsx
├── _hooks/
│   └── useCharacterSettings.ts
└── _types/
    └── character.types.ts
```

**設計要件:**
```typescript
// character.types.ts
interface CharacterSettings {
  avatarUrl: string;
  name: string;
  tone: 'friendly' | 'formal' | 'casual' | 'humorous' | 'custom';
  personality: {
    traits: string[]; // ['helpful', 'enthusiastic', 'patient']
    customPrompt?: string;
  };
  greeting: string;
}

// プリセット例
const tonePresets = {
  friendly: {
    systemPrompt: 'フレンドリーで親しみやすい話し方をしてください。絵文字も適度に使ってください。',
    greeting: 'こんにちは！今日も一緒に学習を頑張りましょう！✨'
  },
  formal: {
    systemPrompt: 'フォーマルで丁寧な話し方をしてください。敬語を使用してください。',
    greeting: 'お疲れ様です。本日のご学習をサポートいたします。'
  },
  // ...
};
```

---

### Phase 8: Model Context Protocol (MCP) 連携（優先度: Low）

**目的**: 外部サービスとの連携を実現

**スコープ:**
- MCP プロトコルの実装
- 外部サービスの登録・管理
- データの送受信

**タスク:**
- [ ] MCP プロトコルの実装
  - プロトコル仕様の調査
  - クライアント実装
  - サーバー実装（プロキシ）
- [ ] サービス連携UI
  - サービス一覧表示
  - 認証フロー
  - データマッピング設定
- [ ] 連携例の実装
  - カレンダー連携（学習予定の同期）
  - ファイルストレージ連携（添付ファイル）
  - タスク管理ツール連携

**期間**: 5-7日
**依存関係**: Phase 5

**実装ファイル:**
```
components/ai-command-bar/
├── _components/
│   ├── MCPServiceList.tsx
│   └── MCPServiceCard.tsx
├── _hooks/
│   └── useMCPIntegration.ts
├── _actions/
│   └── mcpProxy.ts
└── lib/
    └── mcp/
        ├── client.ts
        ├── protocol.ts
        └── services/
            ├── calendar.ts
            ├── storage.ts
            └── tasks.ts
```

**技術要件:**
```typescript
// mcp/protocol.ts
interface MCPRequest {
  service: string;
  method: string;
  params: Record<string, unknown>;
  context?: {
    userId: string;
    noteId?: string;
    pageId?: string;
  };
}

interface MCPResponse {
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
  };
}

// mcp/services/calendar.ts
class CalendarService implements MCPService {
  async addEvent(event: CalendarEvent): Promise<MCPResponse> {
    // Google Calendar API 連携
  }
  
  async getUpcomingEvents(): Promise<MCPResponse> {
    // イベント取得
  }
}
```

---

## 🎨 UI/UX 要件

### ツールバーの配置
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              メインコンテンツ                    │
│                                                 │
│                                                 │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ 💬 [チャット入力]                        [🔧] │ ← ツールバー（固定）
└─────────────────────────────────────────────────┘
```

### 展開時のレイアウト
```
┌─────────────────────────────────────────────────┐
│                                                 │
│              メインコンテンツ                    │
│                                                 │
├─────────────────────────────────────────────────┤
│ 🤖 アシスタント                                 │
│ ────────────────────────────────────────────── │
│ こんにちは！今日も学習を頑張りましょう！         │
│                                                 │
│ 👤 ユーザー                                     │
│ ────────────────────────────────────────────── │
│ このノートを要約して                            │
│                                                 │
│ 🤖 アシスタント                                 │
│ ────────────────────────────────────────────── │
│ このノートには5つのページがあります...          │
├─────────────────────────────────────────────────┤
│ 💬 [メッセージを入力...]            [送信] [🔧] │
└─────────────────────────────────────────────────┘
```

### アニメーション
- 開閉: スライドアップ/ダウン（300ms）
- メッセージ表示: フェードイン（200ms）
- ストリーミング: タイピングエフェクト

---

## 🔒 セキュリティ要件

### APIキー管理
- ユーザーごとのAPIキー保存（暗号化）
- Supabase Vault または環境変数での管理
- APIキー未設定時のUI表示と設定促進

### データ保護
- チャット履歴はクライアントサイドで一時保存
- 機密情報のフィルタリング
- APIキーは平文で保存しない（暗号化必須）

### Rate Limiting
- ユーザーあたりの API コール制限
- 連続リクエストの防止
- ユーザー自身のAPIキーを使用するため、外部レート制限に準拠

### 認証・認可
- Server Actions での認証チェック
- RLS (Row Level Security) の適用
- APIキー設定画面へのアクセス制限

---

## 📊 パフォーマンス要件

### レスポンスタイム
- チャット送信からストリーミング開始: < 1秒
- 検索結果表示: < 2秒
- ページ生成: < 5秒

### バンドルサイズ
- 初期ロード: < 50KB (gzip圧縮後)
- コードスプリッティングによる遅延ロード

### メモリ使用量
- チャット履歴: 最大100メッセージまで
- 古い履歴の自動削除

---

## 🧪 テスト戦略

### ユニットテスト
- [ ] 各 Server Action のテスト
- [ ] カスタム Hook のテスト
- [ ] ユーティリティ関数のテスト

### 統合テスト
- [ ] チャットフローのテスト
- [ ] 検索機能のテスト
- [ ] MCP連携のテスト

### E2Eテスト
- [ ] ツールバーの開閉
- [ ] メッセージ送受信
- [ ] ツールメニューの操作
- [ ] キャラクター設定の変更

---

## 📈 成功指標

### 機能指標
- チャット送信成功率: > 99%
- 検索精度: > 80%
- ページ生成成功率: > 90%

### ユーザー体験指標
- ツールバー使用率: > 30%
- 1セッションあたりの平均チャット数: > 3
- ユーザー満足度: > 4.0 / 5.0

---

## 🔗 関連技術・ライブラリ

### AI基盤
- **Mastra** (AIオーケストレーションフレームワーク)
  - マルチLLM対応（Gemini, OpenAI, Claude, etc.）
  - APIキー管理
  - プロンプト管理
  - エージェント実装

### AIモデル（ユーザー設定により選択可能）
- Google Gemini API (Pro / Flash)
- OpenAI GPT-4 / GPT-3.5
- Anthropic Claude
- その他 Mastra がサポートするLLM

### UI
- shadcn/ui コンポーネント
- Framer Motion (アニメーション)
- React Hook Form (フォーム管理)

### 状態管理
- Zustand または Jotai (グローバル状態)
- React Query (サーバーステート)

### その他
- Supabase Vector Extension (検索)
- TipTap (ページエディター統合)

---

## 📝 次のステップ

1. このドキュメントをレビュー・承認
2. Phase 1～8 ごとに個別の GitHub Issue を作成
3. Phase 1 から順次実装開始
4. 各フェーズ完了後にデモ・レビュー実施

---

## 📚 参考資料

- Gemini API ドキュメント: https://ai.google.dev/docs
- Model Context Protocol: https://modelcontextprotocol.io/
- Supabase Vector: https://supabase.com/docs/guides/ai/vector-columns
- TipTap: https://tiptap.dev/

---

**最終更新**: 2025-10-30
**作成者**: AI (Claude)
