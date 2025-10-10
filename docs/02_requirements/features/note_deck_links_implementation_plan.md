# Note-Deck 紐付け機能 実装計画・手順書

## 実装概要

ノートとデッキの多対多関係を実現するため、以下の4フェーズで段階的に実装を進める。

## Phase 1: データベース基盤構築

### 1.1 note_deck_links テーブル作成

```bash
# Supabase Migration実行
supabase migration new create_note_deck_links_table
```

#### マイグレーションファイル作成
```sql
-- /database/migrations/create_note_deck_links_table.sql

-- note_deck_links テーブル作成
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

-- Row Level Security有効化
ALTER TABLE note_deck_links ENABLE ROW LEVEL SECURITY;

-- 閲覧権限ポリシー
CREATE POLICY "Users can view note_deck_links for accessible notes and decks" 
  ON note_deck_links
  FOR SELECT
  USING (
    created_by = auth.uid() 
    OR 
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

-- 操作権限ポリシー
CREATE POLICY "Users can manage note_deck_links for owned resources"
  ON note_deck_links
  FOR ALL
  USING (
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

### 1.2 TypeScript型定義更新

```bash
# データベース型定義の更新
npx supabase gen types typescript --project-id [PROJECT_ID] > types/database.types.ts
```

#### 手動型定義追加
```typescript
// types/note-deck-links.ts
export interface NoteDeckLink {
  id: string;
  note_id: string;
  deck_id: string;
  created_at: string;
  created_by: string;
}

export interface NoteDeckLinkWithRelations extends NoteDeckLink {
  note: {
    id: string;
    title: string;
    slug: string;
    visibility: string;
  };
  deck: {
    id: string;
    title: string;
    description: string | null;
    is_public: boolean;
  };
}

export interface CreateNoteDeckLinkPayload {
  note_id: string;
  deck_id: string;
}
```

## Phase 2: Server Actions実装

### 2.1 基本CRUD操作

#### Server Actions作成
```typescript
// app/_actions/note-deck-links.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NoteDeckLink, CreateNoteDeckLinkPayload } from "@/types/note-deck-links";

/**
 * ノートとデッキのリンクを作成
 */
export async function createNoteDeckLink(
  payload: CreateNoteDeckLinkPayload
): Promise<NoteDeckLink> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("認証が必要です");
  }

  const { data, error } = await supabase
    .from("note_deck_links")
    .insert({
      note_id: payload.note_id,
      deck_id: payload.deck_id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`リンク作成に失敗しました: ${error.message}`);
  }

  // キャッシュを無効化
  revalidatePath(`/notes/${payload.note_id}`);
  revalidatePath(`/decks/${payload.deck_id}`);

  return data;
}

/**
 * ノートとデッキのリンクを削除
 */
export async function removeNoteDeckLink(
  noteId: string,
  deckId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase
    .from("note_deck_links")
    .delete()
    .eq("note_id", noteId)
    .eq("deck_id", deckId);

  if (error) {
    throw new Error(`リンク削除に失敗しました: ${error.message}`);
  }

  // キャッシュを無効化
  revalidatePath(`/notes/${noteId}`);
  revalidatePath(`/decks/${deckId}`);
}

/**
 * ノートにリンクされたデッキ一覧を取得
 */
export async function getDecksLinkedToNote(noteId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("note_deck_links")
    .select(`
      deck:decks (
        id,
        title,
        description,
        is_public,
        created_at,
        updated_at,
        user_id
      )
    `)
    .eq("note_id", noteId);

  if (error) {
    throw new Error(`デッキ取得に失敗しました: ${error.message}`);
  }

  return data.map(item => item.deck).filter(Boolean);
}

/**
 * デッキにリンクされたノート一覧を取得
 */
export async function getNotesLinkedToDeck(deckId: string) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("note_deck_links")
    .select(`
      note:notes (
        id,
        slug,
        title,
        description,
        visibility,
        created_at,
        updated_at,
        owner_id
      )
    `)
    .eq("deck_id", deckId);

  if (error) {
    throw new Error(`ノート取得に失敗しました: ${error.message}`);
  }

  return data.map(item => item.note).filter(Boolean);
}
```

### 2.2 バリデーション・権限チェック

```typescript
// app/_actions/note-deck-links/validation.ts
"use server";

import { createClient } from "@/lib/supabase/server";

export async function validateNoteDeckLinkPermission(
  noteId: string,
  deckId: string,
  action: "create" | "delete"
): Promise<{ canPerform: boolean; reason?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { canPerform: false, reason: "認証が必要です" };
  }

  // ノートの権限チェック
  const { data: note } = await supabase
    .from("notes")
    .select("owner_id, visibility")
    .eq("id", noteId)
    .single();

  if (!note) {
    return { canPerform: false, reason: "ノートが見つかりません" };
  }

  // デッキの権限チェック
  const { data: deck } = await supabase
    .from("decks")
    .select("user_id, is_public")
    .eq("id", deckId)
    .single();

  if (!deck) {
    return { canPerform: false, reason: "デッキが見つかりません" };
  }

  // 権限判定
  const canManageNote = note.owner_id === user.id;
  const canManageDeck = deck.user_id === user.id;

  if (action === "create") {
    if (canManageNote || canManageDeck) {
      return { canPerform: true };
    }
    return { canPerform: false, reason: "リンク作成権限がありません" };
  }

  if (action === "delete") {
    if (canManageNote || canManageDeck) {
      return { canPerform: true };
    }
    return { canPerform: false, reason: "リンク削除権限がありません" };
  }

  return { canPerform: false, reason: "不正な操作です" };
}
```

## Phase 3: UI/UX実装

### 3.1 ノート画面でのデッキ管理UI

```typescript
// app/(protected)/notes/[slug]/[id]/_components/note-deck-manager.tsx
"use client";

import { useState, useTransition } from "react";
import { createNoteDeckLink, removeNoteDeckLink } from "@/app/_actions/note-deck-links";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

interface NoteDeckManagerProps {
  noteId: string;
  linkedDecks: Deck[];
  availableDecks: Deck[];
}

export function NoteDeckManager({ 
  noteId, 
  linkedDecks, 
  availableDecks 
}: NoteDeckManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLinkDeck = (deckId: string) => {
    startTransition(async () => {
      try {
        await createNoteDeckLink({ note_id: noteId, deck_id: deckId });
        toast.success("デッキをリンクしました");
        setIsDialogOpen(false);
      } catch (error) {
        toast.error("リンクに失敗しました");
      }
    });
  };

  const handleUnlinkDeck = (deckId: string) => {
    startTransition(async () => {
      try {
        await removeNoteDeckLink(noteId, deckId);
        toast.success("デッキのリンクを解除しました");
      } catch (error) {
        toast.error("リンク解除に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">リンクされたデッキ</h3>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={isPending}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          デッキを追加
        </Button>
      </div>

      <div className="grid gap-2">
        {linkedDecks.map((deck) => (
          <div
            key={deck.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div>
              <h4 className="font-medium">{deck.title}</h4>
              {deck.description && (
                <p className="text-sm text-muted-foreground">
                  {deck.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnlinkDeck(deck.id)}
              disabled={isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* デッキ選択ダイアログ */}
      <DeckSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        availableDecks={availableDecks}
        onSelectDeck={handleLinkDeck}
        isPending={isPending}
      />
    </div>
  );
}
```

### 3.2 デッキ画面でのノート管理UI

```typescript
// app/(protected)/decks/[deckId]/_components/deck-note-manager.tsx
"use client";

import { useState, useTransition } from "react";
import { createNoteDeckLink, removeNoteDeckLink } from "@/app/_actions/note-deck-links";
import { Button } from "@/components/ui/button";
import { Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface DeckNoteManagerProps {
  deckId: string;
  linkedNotes: Note[];
  availableNotes: Note[];
}

export function DeckNoteManager({ 
  deckId, 
  linkedNotes, 
  availableNotes 
}: DeckNoteManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleLinkNote = (noteId: string) => {
    startTransition(async () => {
      try {
        await createNoteDeckLink({ note_id: noteId, deck_id: deckId });
        toast.success("ノートをリンクしました");
        setIsDialogOpen(false);
      } catch (error) {
        toast.error("リンクに失敗しました");
      }
    });
  };

  const handleUnlinkNote = (noteId: string) => {
    startTransition(async () => {
      try {
        await removeNoteDeckLink(noteId, deckId);
        toast.success("ノートのリンクを解除しました");
      } catch (error) {
        toast.error("リンク解除に失敗しました");
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">関連ノート</h3>
        <Button
          onClick={() => setIsDialogOpen(true)}
          disabled={isPending}
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          ノートを追加
        </Button>
      </div>

      <div className="grid gap-2">
        {linkedNotes.map((note) => (
          <div
            key={note.id}
            className="flex items-center justify-between p-3 border rounded-lg"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className="font-medium">{note.title}</h4>
                <Link
                  href={`/notes/${note.slug}/${note.id}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
              {note.description && (
                <p className="text-sm text-muted-foreground">
                  {note.description}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUnlinkNote(note.id)}
              disabled={isPending}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* ノート選択ダイアログ */}
      <NoteSelectionDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        availableNotes={availableNotes}
        onSelectNote={handleLinkNote}
        isPending={isPending}
      />
    </div>
  );
}
```

## Phase 4: 統合テスト・最適化

### 4.1 テスト実装

```typescript
// __tests__/note-deck-links.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createNoteDeckLink, removeNoteDeckLink } from '@/app/_actions/note-deck-links';

describe('Note-Deck Links', () => {
  let testNoteId: string;
  let testDeckId: string;
  let testUserId: string;

  beforeAll(async () => {
    // テストデータセットアップ
  });

  afterAll(async () => {
    // テストデータクリーンアップ
  });

  it('should create note-deck link successfully', async () => {
    const link = await createNoteDeckLink({
      note_id: testNoteId,
      deck_id: testDeckId,
    });

    expect(link.note_id).toBe(testNoteId);
    expect(link.deck_id).toBe(testDeckId);
  });

  it('should prevent duplicate links', async () => {
    await expect(createNoteDeckLink({
      note_id: testNoteId,
      deck_id: testDeckId,
    })).rejects.toThrow();
  });

  it('should remove note-deck link successfully', async () => {
    await expect(removeNoteDeckLink(testNoteId, testDeckId))
      .resolves.not.toThrow();
  });
});
```

### 4.2 パフォーマンス監視

```typescript
// lib/monitoring/note-deck-links-metrics.ts
export async function trackNoteDeckLinkPerformance(
  operation: string,
  startTime: number,
  endTime: number,
  success: boolean
) {
  const duration = endTime - startTime;
  
  // メトリクス収集（実装は環境に応じて）
  console.log(`Note-Deck Link ${operation}: ${duration}ms, Success: ${success}`);
  
  // アラート設定（しきい値超過時）
  if (duration > 500) {
    console.warn(`Slow Note-Deck Link operation: ${operation} took ${duration}ms`);
  }
}
```

## 実装チェックリスト

### ✅ Phase 1: データベース基盤
- [ ] note_deck_links テーブル作成
- [ ] インデックス設定
- [ ] RLSポリシー設定
- [ ] TypeScript型定義更新

### ✅ Phase 2: Server Actions
- [ ] createNoteDeckLink実装
- [ ] removeNoteDeckLink実装  
- [ ] getDecksLinkedToNote実装
- [ ] getNotesLinkedToDeck実装
- [ ] 権限チェック機能実装
- [ ] エラーハンドリング実装

### ✅ Phase 3: UI/UX
- [ ] NoteDeckManager コンポーネント実装
- [ ] DeckNoteManager コンポーネント実装
- [ ] 選択ダイアログ実装
- [ ] 既存画面への統合

### ✅ Phase 4: テスト・最適化
- [ ] 単体テスト実装
- [ ] 統合テスト実装
- [ ] パフォーマンステスト
- [ ] セキュリティテスト
- [ ] ユーザビリティテスト

## トラブルシューティング

### よくある問題と対処法

1. **RLS権限エラー**
   ```
   Error: new row violates row-level security policy
   ```
   対処: ポリシー条件の確認、ユーザー権限の検証

2. **重複制約エラー**  
   ```
   Error: duplicate key value violates unique constraint
   ```
   対処: 事前の存在チェック、適切なエラーハンドリング

3. **外部キー制約エラー**
   ```
   Error: insert or update on table violates foreign key constraint
   ```
   対処: 参照先レコードの存在確認

## 次のステップ

実装完了後の拡張機能候補：

1. **リンクメタデータ機能**
   - リンク作成理由のメモ
   - リンクの重要度設定
   - タグ付け機能

2. **一括操作機能**
   - 複数デッキの一括リンク
   - CSVインポート/エクスポート
   - テンプレート機能

3. **分析・レポート機能**
   - リンク使用状況の分析
   - 学習効果の測定
   - レコメンデーション機能

---

**実装開始日**: 2025-08-16  
**予定完了日**: 2025-08-23  
**担当者**: [開発チーム]  
**進捗管理**: [プロジェクト管理ツール]
