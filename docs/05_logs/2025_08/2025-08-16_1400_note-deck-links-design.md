# Note-Deck 紐付け機能 設計・要件定義ログ

## 作業日時・概要
- **作業日**: 2025年08月16日 14:00-15:30
- **タスク**: ノートとデッキの多対多紐付け機能の技術要件定義・実装計画策定
- **目的**: 学習コンテンツの効率的な整理・管理を可能にする機能設計

## 要件・背景
- 既存のノート機能とデッキ機能を多対多で関連付け
- ユーザーが学習リソースを横断的に管理できる仕組みの構築
- `note_deck_links`テーブルによる中間テーブル設計
- 既存の多対多実装パターン（`goal_deck_links`、`card_page_links`）との整合性確保

## 実装内容

### 1. 現状分析・調査実施

#### 既存システムの調査結果
- **ノート機能**: ✅ 完全実装済み
  - `notes`テーブル: slug基盤のURL設計
  - ページとの関連: `note_page_links`（多対多）
  - 権限管理: `note_shares`、RLS適用済み
  - UI: 作成・共有・可視性制御

- **デッキ機能**: ✅ 完全実装済み
  - `decks`テーブル: カード管理、学習機能
  - 音声生成: 自動カード作成機能
  - 学習目標連携: `goal_deck_links`
  - 権限管理: `deck_shares`、公開設定

#### 既存の多対多実装パターン分析
```sql
-- パターン1: goal_deck_links（学習目標↔デッキ）
CREATE TABLE goal_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES study_goals(id) NOT NULL,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, deck_id)
);

-- パターン2: card_page_links（カード↔ページ）
CREATE TABLE card_page_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. 技術要件定義書作成

#### データベース設計
- **テーブル名**: `note_deck_links`
- **設計方針**: 既存パターンとの整合性重視
- **追加機能**: `created_by`カラムでリンク作成者追跡

```sql
CREATE TABLE note_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(note_id, deck_id)
);
```

#### Row Level Security設計
- **閲覧権限**: アクセス可能なノート・デッキのリンクを表示
- **操作権限**: ノートまたはデッキの所有者のみ管理可能
- **複雑な権限継承**: 共有権限も考慮した包括的ポリシー

#### Server Actions設計
```typescript
// 基本CRUD操作
export async function createNoteDeckLink(payload: CreateNoteDeckLinkPayload): Promise<NoteDeckLink>
export async function removeNoteDeckLink(noteId: string, deckId: string): Promise<void>
export async function getDecksLinkedToNote(noteId: string): Promise<Deck[]>
export async function getNotesLinkedToDeck(deckId: string): Promise<Note[]>
```

### 3. 実装計画策定

#### 4フェーズ実装アプローチ
1. **Phase 1**: データベース基盤構築（テーブル・RLS・型定義）
2. **Phase 2**: Server Actions実装（CRUD・権限チェック・エラーハンドリング）
3. **Phase 3**: UI/UX実装（管理画面・選択ダイアログ・統合）
4. **Phase 4**: 統合テスト・最適化（テスト・パフォーマンス・セキュリティ）

#### UI/UXコンポーネント設計
- **NoteDeckManager**: ノート画面でのデッキ管理
- **DeckNoteManager**: デッキ画面でのノート管理
- **選択ダイアログ**: 利用可能なリソース一覧から選択
- **楽観的更新**: UX向上のためのクライアント側状態管理

### 4. セキュリティ・パフォーマンス考慮

#### セキュリティ対策
- RLSによる行レベル権限制御
- Server Actionsによる CSRF対策
- 権限チェック関数による二重検証
- SQL Injection対策（Supabaseクライアント使用）

#### パフォーマンス最適化
- 複合ユニーク制約による重複防止
- 適切なインデックス設計（note_id、deck_id、created_by）
- N+1クエリ回避のためのJOIN最適化
- キャッシュ戦略（revalidatePath使用）

## 実装された成果物

### ✅ 完成した成果物
1. **技術要件定義書** (`.docs/requirements/note_deck_links.md`)
   - 300行の包括的な要件仕様
   - データベース設計からUI設計まで網羅
   - セキュリティ・パフォーマンス要件明記
   - 成功指標・リスク分析含む

2. **実装計画・手順書** (`.docs/requirements/note_deck_links_implementation_plan.md`)
   - 段階的実装計画（4フェーズ）
   - 具体的なコード例・SQLサンプル
   - テスト戦略・トラブルシューティング
   - チェックリスト・進捗管理指標

### 📋 作成したドキュメント構成
```
.docs/requirements/
├── note_deck_links.md                    # 技術要件定義書
└── note_deck_links_implementation_plan.md # 実装計画・手順書
```

## 技術的な詳細

### データベース設計の特徴
- **整合性保証**: ON DELETE CASCADE で参照整合性確保
- **重複防止**: UNIQUE(note_id, deck_id) 制約
- **監査対応**: created_by, created_at で作成履歴追跡
- **高速検索**: 主要カラムにインデックス設定

### アーキテクチャ設計
- **Next.js App Router**: Server Actions優先のデータ操作
- **Supabase RLS**: 行レベルセキュリティによる権限制御
- **TypeScript**: 型安全性確保
- **React 19**: 最新の状態管理パターン採用

### 拡張性への配慮
- リンクメタデータ追加対応
- 一括操作機能の拡張可能性
- 分析・レポート機能の基盤準備
- 権限レベル拡張への対応

## テストポイント
1. **データベース**: テーブル作成、制約動作、RLS権限
2. **Server Actions**: CRUD操作、権限チェック、エラーハンドリング
3. **UI/UX**: 管理画面、選択ダイアログ、楽観的更新
4. **統合**: 既存機能との連携、パフォーマンス
5. **セキュリティ**: 権限回避テスト、SQL Injection対策
6. **エラー処理**: ネットワークエラー、制約違反、権限不足

## パフォーマンス考慮事項
- インデックス設計による高速検索
- N+1クエリ回避のためのJOIN最適化  
- Server Actionsによるサーバーサイド処理
- revalidatePathによる適切なキャッシュ制御
- 楽観的更新によるUX向上

## アクセシビリティ
- セマンティックHTML構造
- キーボードナビゲーション対応
- スクリーンリーダー対応
- 適切なaria-label設定
- カラーコントラスト確保

## 次のステップ・今後の課題

### 🔴 緊急度: 高（Phase 1実装）
1. **Supabaseマイグレーション実行**
   - ForAllLearners プロジェクト (ID: `ablwpfboagwcegeehmtg`) での実装
   - `note_deck_links`テーブル作成
   - RLSポリシー設定・検証

2. **TypeScript型定義更新**
   - データベース型定義の自動生成
   - 手動型定義の追加
   - 既存コードとの整合性確認

### 🟡 緊急度: 中（Phase 2-3実装）
3. **Server Actions実装**
   - 基本CRUD操作の実装
   - 権限チェック機能の追加
   - 包括的エラーハンドリング

4. **UI/UXコンポーネント実装**
   - NoteDeckManager コンポーネント
   - DeckNoteManager コンポーネント
   - 既存画面への統合

### 🟢 緊急度: 低（Phase 4実装）
5. **テスト・最適化**
   - 単体・統合テストの実装
   - パフォーマンステスト
   - セキュリティ監査

6. **拡張機能の検討**
   - リンクメタデータ機能
   - 一括操作機能
   - 分析・レポート機能

## 利用技術・ライブラリ
- **フレームワーク**: Next.js 15, React 19
- **データベース**: Supabase (PostgreSQL)
- **認証・権限**: Supabase Auth, RLS
- **UI**: Tailwind CSS, Radix UI
- **状態管理**: React hooks, Server Actions
- **型安全性**: TypeScript 5.x
- **通知**: Sonner (Toast)

## 実装完了時刻
2025年08月16日 15:30

## 関連ファイル・リソース
- **要件定義**: `.docs/requirements/note_deck_links.md`
- **実装計画**: `.docs/requirements/note_deck_links_implementation_plan.md`
- **参考実装**: `app/_actions/goal-decks.ts`（多対多パターン）
- **UI参考**: `app/(protected)/notes/_components/create-note-form.tsx`
- **Supabaseプロジェクト**: ForAllLearners (ablwpfboagwcegeehmtg)

---

## 備考・学んだ点
- 既存の実装パターンを踏襲することで、開発効率と保守性を向上
- RLSポリシーの複雑さに対する適切な設計の重要性
- 段階的実装によるリスク軽減の有効性
- 包括的な要件定義によるスムーズな実装への寄与

## レビュー・承認
- **技術レビュー**: [未実施]
- **セキュリティレビュー**: [未実施]  
- **UI/UXレビュー**: [未実施]
- **最終承認**: [未実施]
