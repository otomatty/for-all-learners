# ノート削除機能実装完了ログ

**実装日**: 2025-10-30  
**担当者**: AI Assistant  
**関連Issue**: docs/05_logs/2025_10/20251030/01_note-deletion-investigation.md

---

## 📋 実装内容サマリー

ノート詳細ページに削除ボタンを追加し、デフォルトノートは削除できないように制限を実装しました。

### 実装した機能

✅ **削除ボタンの追加** - ノート詳細ページヘッダーに削除ボタンを配置  
✅ **デフォルトノート保護** - デフォルトノートでは削除ボタンを非表示  
✅ **削除前確認ダイアログ** - AlertDialogで誤削除を防止  
✅ **エラーハンドリング** - 削除失敗時のエラーメッセージ表示  
✅ **削除後リダイレクト** - 削除成功後は /notes へ遷移

---

## 🔧 変更ファイル

### 1. `app/_actions/notes/deleteNote.ts`

**変更内容**: デフォルトノートの削除を防ぐチェックを追加

```typescript
export async function deleteNote(id: string) {
	const supabase = await getSupabaseClient();

	// Check if the note is a default note
	const { data: note, error: fetchError } = await supabase
		.from("notes")
		.select("is_default_note, title")
		.eq("id", id)
		.single();

	if (fetchError) {
		throw new Error("ノートの情報取得に失敗しました。");
	}

	if (note?.is_default_note) {
		throw new Error("デフォルトノートは削除できません。");
	}

	// Delete the note
	const { error } = await supabase.from("notes").delete().eq("id", id);
	if (error) throw error;
}
```

**理由**:
- サーバーサイドで二重チェックを実施
- データベースのRLSポリシーに加えてアプリケーション層でも保護
- エラーメッセージをユーザーフレンドリーに

---

### 2. `app/_actions/notes/getNoteDetail.ts`

**変更内容**: `is_default_note` フィールドを取得するように修正

```typescript
const { data: note, error: noteError } = await supabase
	.from("notes")
	.select(
		"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
	)
	.eq("slug", slug)
	.single();
```

**理由**:
- UIで削除ボタンの表示/非表示を判定するために必要
- データベースに既に存在するフィールドを取得するのみ

---

### 3. `app/_actions/notes/getDefaultNote.ts`

**変更内容**: `is_default_note` フィールドを取得するように修正

```typescript
const { data: defaultNote, error: fetchError } = await supabase
	.from("notes")
	.select(
		"id, slug, title, description, visibility, created_at, updated_at, page_count, participant_count, owner_id, is_default_note",
	)
	.eq("owner_id", user.id)
	.eq("is_default_note", true)
	.maybeSingle();
```

**理由**:
- getNoteDetail と統一した戻り値を保証
- デフォルトノート特有の処理を行う際に明示的に判定可能

---

### 4. `app/(protected)/notes/[slug]/page.tsx`

**変更内容**: `isDefaultNote` プロップを NoteHeader に渡すように修正

```typescript
<NoteHeader
	id={note.id}
	title={note.title}
	slug={note.slug}
	description={note.description}
	visibility={note.visibility as "public" | "unlisted" | "invite" | "private"}
	pageCount={note.page_count}
	participantCount={note.participant_count}
	updatedAt={note.updated_at}
	ownerId={note.owner_id}
	isDefaultNote={note.is_default_note || false}
/>
```

**理由**:
- Server Component から Client Component へのデータ受け渡し
- `|| false` でフォールバック（型安全性を確保）

---

### 5. `app/(protected)/notes/[slug]/_components/note-header.tsx`

**変更内容**: 削除ボタンを追加し、デフォルトノートでは非表示に

**主な追加機能**:

#### Props型定義に `isDefaultNote` を追加

```typescript
interface NoteHeaderProps {
	// ... 既存のプロップ
	isDefaultNote: boolean;
}
```

#### 削除状態管理用のステート追加

```typescript
const [isDeleting, setIsDeleting] = useState(false);
const router = useRouter();
```

#### 削除ボタンとAlertDialogの実装

```typescript
{currentUserId === ownerId && !isDefaultNote && (
	<AlertDialog>
		<AlertDialogTrigger asChild>
			<Button variant="destructive" disabled={isDeleting}>
				<Trash2 className="h-4 w-4 mr-2" />
				削除
			</Button>
		</AlertDialogTrigger>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
				<AlertDialogDescription>
					「{title}」を削除します。
					<br />
					この操作は取り消せません。関連するページやデータも削除されます。
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel>キャンセル</AlertDialogCancel>
				<AlertDialogAction
					onClick={async () => {
						setIsDeleting(true);
						try {
							await deleteNote(id);
							router.push("/notes");
						} catch (error) {
							alert(
								error instanceof Error
									? error.message
									: "ノートの削除に失敗しました。",
							);
							setIsDeleting(false);
						}
					}}
					className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				>
					{isDeleting ? "削除中..." : "削除"}
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
)}
```

**UIの配置変更**:

```typescript
// Before: 右寄せ
<div className="px-4 pb-4 flex justify-end">

// After: 左に削除ボタン、右にバッジ
<div className="px-4 pb-4 flex justify-between items-center">
	<div className="flex gap-2">
		{/* 削除ボタン（デフォルトノート以外） */}
		{/* 共有設定ボタン */}
	</div>
	<Badge variant={badgeVariant}>{visibilityLabel}</Badge>
</div>
```

---

## 🔒 セキュリティ対策

### 多層防御アプローチ

1. **UI層（フロントエンド）**
   - `!isDefaultNote` でボタンの表示/非表示を制御
   - オーナー以外にはボタンを表示しない

2. **アプリケーション層（Server Action）**
   - `deleteNote` 関数でデフォルトノートチェック
   - エラーメッセージで理由を明確に伝える

3. **データベース層（RLS Policy）**
   - `prevent_delete_default_note` ポリシーで最終防御
   - `is_default_note = FALSE` の条件で削除を制限

```sql
CREATE POLICY prevent_delete_default_note
ON public.notes
FOR DELETE
USING (
  owner_id = auth.uid() 
  AND is_default_note = FALSE
);
```

---

## 🧪 テストケース

### 手動テストシナリオ

#### ✅ TC-001: 通常ノートの削除（成功）

**前提条件**:
- ログイン済み
- 自分が作成した通常ノート（is_default_note = false）を表示

**手順**:
1. ノート詳細ページにアクセス
2. 「削除」ボタンをクリック
3. 確認ダイアログで「削除」をクリック

**期待結果**:
- ノートが削除される
- `/notes` にリダイレクト
- ノート一覧からノートが消えている
- 関連する `note_shares`, `note_page_links` も削除される

---

#### ✅ TC-002: デフォルトノートでは削除ボタンが非表示

**前提条件**:
- ログイン済み
- デフォルトノート（`/notes/default`）を表示

**手順**:
1. `/notes/default` にアクセス

**期待結果**:
- 「削除」ボタンが表示されない
- 「共有設定」ボタンのみ表示される

---

#### ✅ TC-003: 他人のノートでは削除ボタンが非表示

**前提条件**:
- ログイン済み
- 他人が作成したノート（共有されている）を表示

**手順**:
1. 共有されているノートにアクセス

**期待結果**:
- 「削除」ボタンが表示されない
- オーナーのみのアクションが非表示

---

#### ✅ TC-004: 削除確認ダイアログのキャンセル

**前提条件**:
- ログイン済み
- 自分が作成した通常ノートを表示

**手順**:
1. 「削除」ボタンをクリック
2. 確認ダイアログで「キャンセル」をクリック

**期待結果**:
- ダイアログが閉じる
- ノートは削除されない
- ページはそのまま

---

#### ✅ TC-005: 削除エラーハンドリング

**前提条件**:
- デフォルトノートに対して直接 `deleteNote()` を実行（APIテスト）

**手順**:
1. ブラウザのコンソールで実行:
   ```javascript
   import { deleteNote } from "@/app/_actions/notes";
   await deleteNote("default-note-id");
   ```

**期待結果**:
- エラーがスローされる
- エラーメッセージ: "デフォルトノートは削除できません。"

---

## 📊 実装前後の比較

| 項目 | 実装前 | 実装後 |
|------|--------|--------|
| 削除ボタン | ❌ なし | ✅ あり（通常ノートのみ） |
| デフォルトノート保護 | ⚠️ RLSのみ | ✅ UI + Server Action + RLS |
| 削除確認 | - | ✅ AlertDialog |
| エラーメッセージ | - | ✅ ユーザーフレンドリー |
| 削除後の挙動 | - | ✅ /notes へリダイレクト |

---

## ⚠️ 注意事項・制約

### 1. カスケード削除の挙動

ノート削除時、以下のデータも自動削除されます：

- `note_shares` - 共有設定
- `note_page_links` - ページとのリンク

**ページ自体は削除されません**。ページは他のノートにも属している可能性があるため、独立したリソースとして扱われます。

### 2. デフォルトノートの特別扱い

デフォルトノート（`is_default_note = true`）は以下の制限があります：

- 削除不可（UI、Server Action、RLSの3層で保護）
- `visibility` は常に `private`（変更不可）
- 各ユーザーにつき1つのみ存在

### 3. 削除の取り消し不可

現在の実装では**物理削除**です。削除したノートは復元できません。

将来的にゴミ箱機能を実装する場合は：
- `deleted_at` カラムの追加
- 論理削除への変更
- 復元機能の実装
- 定期的な完全削除処理

が必要です。

### 4. 削除中の重複実行防止

`isDeleting` ステートで削除ボタンを `disabled` にすることで、重複実行を防止しています。

---

## 🚀 今後の改善案

### 短期的な改善

1. **トースト通知の実装**
   - 削除成功時のトースト
   - エラー時のトースト
   - より洗練されたUX

2. **削除理由の記録（オプション）**
   - 監査ログとして削除理由を記録
   - 分析に活用

### 長期的な改善

1. **ゴミ箱機能**
   - ページと同様の論理削除
   - 30日間の復元期限
   - 自動完全削除

2. **一括削除機能**
   - ノート一覧での複数選択
   - 一括削除アクション

3. **削除前のプレビュー**
   - 削除される関連データの一覧表示
   - より詳細な影響範囲の可視化

4. **アーカイブ機能**
   - 削除の代替手段
   - 非表示にしつつデータ保持

---

## 🔗 関連ドキュメント

- **調査レポート**: `docs/05_logs/2025_10/20251030/01_note-deletion-investigation.md`
- **データベーススキーマ**: `database/notes_grouping.sql`
- **デフォルトノートマイグレーション**: `database/migrations/20251028_add_default_note_flag.sql`
- **RLSポリシー定義**: `database/migrations/20251028_add_default_note_flag.sql` (lines 134-140)

---

## ✅ 完了チェックリスト

- [x] `deleteNote` にデフォルトノートチェックを追加
- [x] `getNoteDetail` で `is_default_note` を取得
- [x] `getDefaultNote` で `is_default_note` を取得
- [x] ノート詳細ページに削除ボタンを追加
- [x] デフォルトノートでは削除ボタンを非表示
- [x] 削除確認ダイアログの実装
- [x] エラーハンドリングの実装
- [x] 削除後のリダイレクト処理
- [x] TypeScript型定義の更新
- [x] コンパイルエラーの解消
- [x] 作業ログの記録

---

## 📸 実装スクリーンショット

### 通常ノート（削除ボタンあり）

```
┌─────────────────────────────────────────────────────────┐
│ ← Notes一覧へ戻る                                        │
├─────────────────────────────────────────────────────────┤
│ マイノート                                               │
│ my-note                                                 │
│                                                         │
│ 📄 ページ数: 5  👥 参加者数: 1  🕐 最終更新: 2025/10/30 │
│                                                         │
│ [🗑️ 削除]  [共有設定]                         [非公開]  │
└─────────────────────────────────────────────────────────┘
```

### デフォルトノート（削除ボタンなし）

```
┌─────────────────────────────────────────────────────────┐
│ ← Notes一覧へ戻る                                        │
├─────────────────────────────────────────────────────────┤
│ すべてのページ                                           │
│ default-{user-id}                                       │
│                                                         │
│ 📄 ページ数: 15  👥 参加者数: 1  🕐 最終更新: 2025/10/30│
│                                                         │
│              [共有設定]                         [非公開]  │
└─────────────────────────────────────────────────────────┘
```

### 削除確認ダイアログ

```
┌──────────────────────────────────────────┐
│ 本当に削除しますか？                      │
├──────────────────────────────────────────┤
│ 「マイノート」を削除します。              │
│ この操作は取り消せません。                │
│ 関連するページやデータも削除されます。    │
│                                          │
│                  [キャンセル]  [削除]    │
└──────────────────────────────────────────┘
```

---

**実装完了日**: 2025-10-30  
**最終更新**: 2025-10-30  
**ステータス**: ✅ 完了
