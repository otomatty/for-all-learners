# ノート削除機能の実装状況調査

**調査日**: 2025-10-30  
**調査者**: AI Assistant  
**対象**: `/notes` における各ノートの削除機能

---

## 📋 調査結果サマリー

**結論**: ノート削除機能は**バックエンドには実装済み**ですが、**UIには実装されていません**。

### 実装状況

| 項目 | 状態 | 詳細 |
|------|------|------|
| **Server Action** | ✅ 実装済み | `app/_actions/notes/deleteNote.ts` |
| **データベースポリシー** | ✅ 実装済み | RLS ポリシーで削除権限設定済み |
| **UI（ノート一覧）** | ❌ 未実装 | 削除ボタンなし |
| **UI（ノート詳細）** | ❌ 未実装 | 削除ボタンなし |
| **共有設定モーダル** | ❌ 未実装 | 削除オプションなし |

---

## 🔍 詳細調査

### 1. バックエンド実装

#### `deleteNote` Server Action

**ファイル**: `app/_actions/notes/deleteNote.ts`

```typescript
"use server";

import { getSupabaseClient } from "./getSupabaseClient";

/**
 * ノートを削除します。
 *
 * @example
 * ```ts
 * import { deleteNote } from "@/app/_actions/notes";
 *
 * await deleteNote("note-id-123");
 * console.log("ノートを削除しました");
 * ```
 *
 * @param id 削除対象のノートID
 */
export async function deleteNote(id: string) {
	const supabase = await getSupabaseClient();
	const { error } = await supabase.from("notes").delete().eq("id", id);
	if (error) throw error;
}
```

**特徴**:
- シンプルな物理削除（論理削除ではない）
- エラーハンドリングあり
- JSDoc でドキュメント化済み
- `app/_actions/notes/index.ts` で export 済み

#### データベースポリシー

**ファイル**: `database/notes_grouping.sql`

```sql
CREATE POLICY delete_own_notes
  ON public.notes
  FOR DELETE
  USING (auth.uid() = owner_id);
```

**特徴**:
- オーナーのみ削除可能
- RLS（Row Level Security）で保護
- カスケード削除設定あり（`ON DELETE CASCADE`）
  - `note_shares` テーブル
  - `note_page_links` テーブル

---

### 2. UI 実装状況

#### ノート一覧ページ

**ファイル**: `app/(protected)/notes/_components/notes-list.tsx`

**現状**:
```tsx
<Link
  key={note.id}
  href={`/notes/${note.slug}`}
  className="block hover:shadow-md rounded-xl transition"
>
  <Card>
    {/* タイトル、説明、メタ情報のみ */}
  </Card>
</Link>
```

**問題点**:
- カード全体がリンク → 削除ボタン配置困難
- ドロップダウンメニューなし
- コンテキストメニューなし

#### ノート詳細ページ

**ファイル**: `app/(protected)/notes/[slug]/_components/note-header.tsx`

**現状**:
```tsx
<div className="px-4 pb-4 flex justify-end">
  {currentUserId === ownerId && (
    <ShareSettingsModal note={...} />
  )}
  <Badge variant={badgeVariant}>{visibilityLabel}</Badge>
</div>
```

**問題点**:
- 「共有設定」ボタンのみ
- 削除ボタンなし
- その他の管理操作（編集、アーカイブなど）もなし

#### ShareSettingsModal

**ファイル**: `components/ShareSettingsModal.tsx`

**現状**:
- 公開範囲設定
- ユーザー招待
- リンク共有管理

**問題点**:
- ノート削除機能なし
- ノート編集機能なし

---

### 3. 類似機能の実装例

#### ページ削除機能

プロジェクト内には**ページのゴミ箱機能**が実装されています：

**関連ファイル**:
- `app/_actions/notes/moveToTrash.ts` - ページをゴミ箱に移動
- `app/_actions/notes/restoreFromTrash.ts` - ゴミ箱から復元
- `app/_actions/notes/deletePagesPermanently.ts` - 完全削除
- `database/migrations/20250728_page_trash.sql` - ゴミ箱機能のマイグレーション

**特徴**:
- 論理削除（`trashed_at` カラム使用）
- 復元可能
- 完全削除は別アクション

---

## 🎯 推奨実装方針

### オプション1: シンプルな削除（推奨）

ノート一覧とノート詳細に削除ボタンを追加し、確認ダイアログで安全性を確保。

**メリット**:
- 実装が簡単
- 既存の `deleteNote` をそのまま使用可能

**デメリット**:
- 誤削除のリスク
- 復元不可

### オプション2: ゴミ箱機能（推奨・将来的に）

ページと同様のゴミ箱機能を実装。

**メリット**:
- 誤削除から保護
- 復元可能
- ユーザーフレンドリー

**デメリット**:
- 実装コストが高い
- データベーススキーマ変更が必要
- マイグレーション必要

### オプション3: アーカイブ機能

削除ではなく、非表示（アーカイブ）として扱う。

**メリット**:
- データ保持
- 復元が簡単

**デメリット**:
- ストレージ使用量増加
- データベーススキーマ変更必要

---

## 📝 実装案（オプション1: シンプルな削除）

### 1. ノート一覧にドロップダウンメニューを追加

**ファイル**: `app/(protected)/notes/_components/notes-list.tsx`

```tsx
import { MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteNote } from "@/app/_actions/notes";

// カード内のメニューボタン
<div className="flex justify-between items-center">
  <Link href={`/notes/${note.slug}`}>
    {/* 既存のカード内容 */}
  </Link>
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" onClick={(e) => e.preventDefault()}>
        <MoreVertical className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      <DropdownMenuItem
        onClick={async (e) => {
          e.preventDefault();
          if (confirm(`「${note.title}」を削除しますか？この操作は取り消せません。`)) {
            await deleteNote(note.id);
            // リフレッシュロジック
          }
        }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        削除
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</div>
```

### 2. ノート詳細ヘッダーに削除ボタンを追加

**ファイル**: `app/(protected)/notes/[slug]/_components/note-header.tsx`

```tsx
import { Trash2 } from "lucide-react";
import { deleteNote } from "@/app/_actions/notes";
import { useRouter } from "next/navigation";

// ヘッダー内に追加
{currentUserId === ownerId && (
  <div className="flex gap-2">
    <ShareSettingsModal note={...} />
    <Button
      variant="destructive"
      onClick={async () => {
        if (confirm(`「${title}」を削除しますか？この操作は取り消せません。`)) {
          await deleteNote(id);
          router.push("/notes");
        }
      }}
    >
      <Trash2 className="h-4 w-4 mr-2" />
      削除
    </Button>
  </div>
)}
```

### 3. 確認ダイアログコンポーネント（オプション）

よりユーザーフレンドリーな確認ダイアログを作成する場合：

**新規ファイル**: `components/notes/DeleteNoteDialog.tsx`

```tsx
"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteNote } from "@/app/_actions/notes";

interface DeleteNoteDialogProps {
  noteId: string;
  noteTitle: string;
  onDeleted?: () => void;
}

export function DeleteNoteDialog({
  noteId,
  noteTitle,
  onDeleted,
}: DeleteNoteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteNote(noteId);
      onDeleted?.();
    } catch (error) {
      console.error("Failed to delete note:", error);
      alert("ノートの削除に失敗しました。");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            「{noteTitle}」を削除します。この操作は取り消せません。
            関連するページやデータも削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground"
          >
            {isDeleting ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

---

## ⚠️ 注意点

### 1. カスケード削除

現在のデータベーススキーマでは、ノート削除時に以下も削除されます：

- `note_shares` - 共有設定
- `note_page_links` - ページとのリンク

**ページ自体は削除されません**（`note_page_links` が削除されるのみ）。

### 2. デフォルトノート

`20251028_add_default_note_flag.sql` により、デフォルトノート機能が追加されています。

デフォルトノートの削除には特別な考慮が必要：

```typescript
// デフォルトノートの削除を防ぐ
export async function deleteNote(id: string) {
  const supabase = await getSupabaseClient();
  
  // デフォルトノートかチェック
  const { data: note } = await supabase
    .from("notes")
    .select("is_default_note")
    .eq("id", id)
    .single();
  
  if (note?.is_default_note) {
    throw new Error("デフォルトノートは削除できません。");
  }
  
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw error;
}
```

### 3. エラーハンドリング

削除失敗時の適切なエラーメッセージ表示が必要：

- ネットワークエラー
- 権限エラー
- データベースエラー

---

## 📊 実装優先度

| 機能 | 優先度 | 理由 |
|------|--------|------|
| ノート詳細ページに削除ボタン | 🔴 High | ユーザーがノートを管理する主要な場所 |
| ノート一覧のドロップダウンメニュー | 🟡 Medium | 一覧から直接削除できると便利 |
| 確認ダイアログコンポーネント | 🟢 Low | `window.confirm()` でも十分 |
| デフォルトノート削除防止 | 🔴 High | データ整合性のために必須 |
| ゴミ箱機能 | ⚪ Future | 将来的な改善として検討 |

---

## 🔗 関連ファイル

### 実装済み

- `app/_actions/notes/deleteNote.ts` - 削除 Server Action
- `app/_actions/notes/index.ts` - アクション Export
- `database/notes_grouping.sql` - テーブル定義・RLS ポリシー

### 修正が必要

- `app/(protected)/notes/_components/notes-list.tsx` - ノート一覧
- `app/(protected)/notes/[slug]/_components/note-header.tsx` - ノート詳細ヘッダー

### 参考実装

- `app/_actions/notes/moveToTrash.ts` - ページのゴミ箱機能
- `app/(protected)/notes/explorer/_components/operation-panel.tsx` - ドロップダウンメニューの例

---

## 📋 次のアクション

### Immediate（すぐに実装すべき）

1. ノート詳細ページに削除ボタンを追加
2. デフォルトノート削除防止ロジックを追加
3. 削除後のリダイレクト処理を実装

### Short-term（短期的に実装）

1. ノート一覧にドロップダウンメニューを追加
2. 確認ダイアログコンポーネントを作成
3. エラーハンドリングを強化

### Long-term（長期的に検討）

1. ゴミ箱機能の設計・実装
2. アーカイブ機能の検討
3. 一括削除機能

---

**作成日**: 2025-10-30  
**最終更新**: 2025-10-30
