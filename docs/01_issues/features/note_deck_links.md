# Note-Deck 紐付け機能 技術要件定義書

## 1. 目的

ノート機能とデッキ機能の多対多関係を実現し、ユーザーが学習コンテンツを効率的に整理・管理できる環境を提供する。

## 2. 現在の実装状況分析

### 2.1 ノート機能
- **テーブル**: `notes`
  - 主キー: `id` (UUID)
  - 一意識別: `slug` (TEXT UNIQUE)
  - 所有者: `owner_id` (UUID REFERENCES accounts(id))
  - 可視性: `visibility` (VARCHAR(10))
- **実装状況**: ✅ 完了済み
  - ノート作成・共有機能
  - ページとの多対多関係 (`note_page_links`)
  - 権限管理 (`note_shares`)

### 2.2 デッキ機能  
- **テーブル**: `decks`
  - 主キー: `id` (UUID)
  - 所有者: `user_id` (UUID REFERENCES accounts(id))
  - 公開設定: `is_public` (BOOLEAN)
- **実装状況**: ✅ 完了済み
  - フラッシュカード学習機能
  - 音声からのカード自動生成
  - 学習目標との紐付け (`goal_deck_links`)

### 2.3 既存の多対多実装パターン
```sql
-- パターン1: カード-ページリンク
CREATE TABLE card_page_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id UUID REFERENCES cards(id) NOT NULL,
  page_id UUID REFERENCES pages(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- パターン2: ゴール-デッキリンク  
CREATE TABLE goal_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  goal_id UUID REFERENCES study_goals(id) NOT NULL,
  deck_id UUID REFERENCES decks(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(goal_id, deck_id)
);
```

## 3. 技術要件

### 3.1 データベース設計

#### 3.1.1 note_deck_links テーブル仕様

```sql
CREATE TABLE note_deck_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
  deck_id UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  UNIQUE(note_id, deck_id)
);

-- インデックス設定
CREATE INDEX IF NOT EXISTS idx_note_deck_links_note ON note_deck_links(note_id);
CREATE INDEX IF NOT EXISTS idx_note_deck_links_deck ON note_deck_links(deck_id);
CREATE INDEX IF NOT EXISTS idx_note_deck_links_user ON note_deck_links(created_by);

-- Row Level Security
ALTER TABLE note_deck_links ENABLE ROW LEVEL SECURITY;

-- RLSポリシー設定
CREATE POLICY "Users can view note_deck_links for accessible notes and decks" 
  ON note_deck_links
  FOR SELECT
  USING (
    -- 自分が作成したリンク
    created_by = auth.uid() 
    OR 
    -- ノートにアクセス権がある
    note_id IN (
      SELECT id FROM notes 
      WHERE owner_id = auth.uid() 
         OR visibility IN ('public', 'unlisted')
         OR id IN (
           SELECT note_id FROM note_shares 
           WHERE shared_with_user_id = auth.uid()
         )
    )
    OR
    -- デッキにアクセス権がある
    deck_id IN (
      SELECT id FROM decks 
      WHERE user_id = auth.uid() 
         OR is_public = true
         OR id IN (
           SELECT deck_id FROM deck_shares 
           WHERE shared_with_user_id = auth.uid()
         )
    )
  );

CREATE POLICY "Users can manage note_deck_links for owned resources"
  ON note_deck_links
  FOR ALL
  USING (
    -- ノートの所有者またはデッキの所有者
    note_id IN (SELECT id FROM notes WHERE owner_id = auth.uid())
    OR
    deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
  )
  WITH CHECK (
    note_id IN (SELECT id FROM notes WHERE owner_id = auth.uid())
    OR
    deck_id IN (SELECT id FROM decks WHERE user_id = auth.uid())
  );
```

#### 3.1.2 TypeScript型定義

```typescript
export interface NoteDeckLink {
  id: string;
  note_id: string;
  deck_id: string;
  created_at: string;
  created_by: string;
}

export interface NoteDeckLinkInsert {
  note_id: string;
  deck_id: string;
  created_by?: string;
}

export interface NoteDeckLinkUpdate {
  note_id?: string;
  deck_id?: string;
}
```

### 3.2 アプリケーション層設計

#### 3.2.1 Server Actions

```typescript
// app/_actions/note-deck-links.ts

export async function createNoteDeckLink(
  noteId: string, 
  deckId: string
): Promise<NoteDeckLink>;

export async function removeNoteDeckLink(
  noteId: string, 
  deckId: string
): Promise<void>;

export async function getDecksLinkedToNote(
  noteId: string
): Promise<Deck[]>;

export async function getNotesLinkedToDeck(
  deckId: string
): Promise<Note[]>;

export async function getUserNoteDeckLinks(
  userId: string
): Promise<NoteDeckLinkWithRelations[]>;
```

#### 3.2.2 UI コンポーネント

```typescript
// コンポーネント設計
interface NoteDeckLinkManagerProps {
  noteId: string;
  initialLinkedDecks: Deck[];
  availableDecks: Deck[];
}

interface DeckNoteLinkerProps {
  deckId: string;
  initialLinkedNotes: Note[];
  availableNotes: Note[];
}
```

### 3.3 権限管理

#### 3.3.1 リンク作成権限
- ノートの所有者: 自分のノートに任意のアクセス可能なデッキをリンク可能
- デッキの所有者: 自分のデッキに任意のアクセス可能なノートをリンク可能
- 共有ユーザー: 編集権限がある場合のみリンク操作可能

#### 3.3.2 リンク削除権限
- リンクを作成したユーザー
- ノートまたはデッキの所有者
- 編集権限を持つ共有ユーザー

### 3.4 パフォーマンス最適化

#### 3.4.1 データベース最適化
- 複合ユニーク制約による重複防止
- 適切なインデックス設定
- ON DELETE CASCADE による整合性保証

#### 3.4.2 アプリケーション最適化
- Server Actionsによるサーバーサイド処理
- 楽観的更新によるUX向上
- 適切なキャッシュ戦略

## 4. 実装フェーズ

### Phase 1: データベース基盤構築
1. `note_deck_links` テーブル作成
2. RLSポリシー設定
3. TypeScript型定義更新

### Phase 2: Server Actions実装
1. CRUD操作のServer Actions作成
2. 権限チェック機能実装
3. エラーハンドリング強化

### Phase 3: UI/UX実装
1. ノート画面でのデッキ管理UI
2. デッキ画面でのノート管理UI
3. 一括操作機能

### Phase 4: 統合テスト・最適化
1. 権限管理テスト
2. パフォーマンステスト
3. ユーザビリティ検証

## 5. 非機能要件

### 5.1 セキュリティ
- Row Level Securityによる行レベル権限制御
- SQL Injection対策
- CSRF対策（Next.js Server Actions）

### 5.2 パフォーマンス
- データベースクエリ最適化
- N+1クエリ回避
- 適切なページネーション

### 5.3 拡張性
- 将来的な権限レベル拡張に対応
- リンクメタデータ追加に対応
- 一括操作スケーラビリティ

## 6. 注意事項・制約

### 6.1 技術的制約
- Supabase RLSの制限内での実装
- Next.js App Routerアーキテクチャ準拠
- 既存のテーブル構造との整合性維持

### 6.2 ビジネス的制約
- ユーザーの学習フローを阻害しない設計
- 権限管理の複雑化回避
- 既存機能への影響最小化

### 6.3 運用上の注意
- データ整合性の監視
- 不要なリンクの定期的なクリーンアップ
- ユーザーからのフィードバック収集体制

## 7. 成功指標

### 7.1 技術指標
- リンク作成・削除のレスポンス時間 < 500ms
- データベースクエリ実行時間 < 100ms
- エラー率 < 0.1%

### 7.2 ユーザー指標
- 機能採用率 > 60%
- ユーザビリティスコア > 4.0/5.0
- 学習効率向上の定量的測定

## 8. 課題・リスク

### 8.1 技術的リスク
- **中**: RLSポリシーの複雑化によるパフォーマンス劣化
- **低**: 既存機能への予期しない影響

### 8.2 対策
- 定期的なパフォーマンス監視
- 段階的ロールアウト
- ロールバック計画の策定

---

**作成日**: 2025-08-16  
**バージョン**: 1.0  
**承認者**: [未定]  
**次回レビュー**: Phase 1完了後
