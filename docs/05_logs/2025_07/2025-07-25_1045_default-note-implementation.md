# デフォルトノート機能の実装

## 作業日時・概要
- **作業日**: 2025年07月25日 10:45
- **タスク**: ノート・ページ機能の統合とデフォルトノート自動作成機能の実装
- **目的**: `/pages`で作成されるページを自動的にユーザーのデフォルトノートに紐付ける仕組みを構築

## 要件
ユーザーから以下の要件が提示された：
1. `/pages`で作成されるページを自動的にデフォルトノートに保存
2. `/notes/{slug}`ページではそのノートに紐づけてページを保存（既存機能）
3. デフォルトノートをユーザーごとに自動作成

## 実装前の状況調査

### 現状の問題点
- `/pages`で作成されるページはどのノートにも紐付けされていない状態
- デフォルトノート自動作成機能は存在しない
- ページとノートの関係が`note_page_links`テーブルで管理されているが、`/pages`では活用されていない

### データベース構造の確認
- `pages`テーブル: `note_id`カラムは存在せず
- `note_page_links`テーブル: 多対多関係でページとノートを管理
- `notes`テーブル: ノート情報を管理

## 実装内容

### 1. デフォルトノート自動作成機能
**ファイル**: `app/_actions/notes/createDefaultNote.ts`

```typescript
export async function createDefaultNote(userId: string) {
	const defaultSlug = `default-${userId.slice(0, 8)}`;
	// "マイノート"というタイトルでプライベート設定のノートを作成
}
```

**特徴**:
- ユーザーIDの先頭8文字を使用した一意なスラグ生成
- "マイノート"というユーザーフレンドリーなタイトル
- プライベート設定で作成

### 2. デフォルトノート取得機能
**ファイル**: `app/_actions/notes/getDefaultNote.ts`

```typescript
export async function getDefaultNote() {
	// 既存のデフォルトノートを検索、なければ自動作成
}
```

**特徴**:
- 既存ノートの検索ロジック
- 存在しない場合の自動作成
- 認証ユーザーのみアクセス可能

### 3. ユーザー登録時の初期化処理
**ファイル**: `app/auth/callback/route.ts`

**変更点**:
```typescript
// 新規アカウント作成時に追加
await createDefaultNote(user.id);
```

**位置**: 新規アカウント作成処理内（77行目）

### 4. `/pages`での自動紐付け機能
**ファイル**: `app/(protected)/pages/new/route.ts`

**主要変更**:
```typescript
// デフォルトノート取得
const defaultNote = await getDefaultNote();

// ページ作成後の自動リンク
await supabase.from("note_page_links").insert({
	note_id: defaultNote.id,
	page_id: page.id,
});
```

**動作フロー**:
1. ユーザー認証確認
2. デフォルトノート取得（なければ自動作成）
3. ページ作成
4. `note_page_links`テーブルでリンク作成
5. ページにリダイレクト

### 5. 既存ページ移行機能
**ファイル**: `app/_actions/notes/migrateOrphanedPages.ts`

```typescript
export async function migrateOrphanedPages(): Promise<{
	migratedCount: number;
	orphanedPages: Array<{ id: string; title: string }>;
}> {
	// 孤立ページを検出し、デフォルトノートに一括移行
}
```

**特徴**:
- 既存の孤立ページを効率的に検出
- バッチ処理での一括移行
- 詳細な移行結果レポート

### 6. エクスポート設定の更新
**ファイル**: `app/_actions/notes/index.ts`

追加したエクスポート:
- `createDefaultNote`
- `getDefaultNote`
- `migrateOrphanedPages`

## 影響を受けるファイル
1. `app/_actions/notes/createDefaultNote.ts` (新規作成)
2. `app/_actions/notes/getDefaultNote.ts` (新規作成)
3. `app/_actions/notes/migrateOrphanedPages.ts` (新規作成)
4. `app/_actions/notes/index.ts` (更新)
5. `app/auth/callback/route.ts` (更新)
6. `app/(protected)/pages/new/route.ts` (更新)

## テストポイント
1. **新規ユーザー登録**: デフォルトノート"マイノート"が自動作成されることを確認
2. **`/pages`でのページ作成**: 作成されたページがデフォルトノートに紐付いていることを確認
3. **`/notes/{slug}`でのページ作成**: 指定されたノートに正しく紐付くことを確認（既存機能の維持）
4. **既存ユーザー**: 初回ページ作成時にデフォルトノートが自動作成されることを確認
5. **孤立ページ移行**: `migrateOrphanedPages()`で既存の孤立ページが正しく移行されることを確認

## データベースクエリ例
```sql
-- デフォルトノート確認
SELECT * FROM notes WHERE slug LIKE 'default-%';

-- ページとノートのリンク確認
SELECT p.title, n.title as note_title 
FROM pages p 
JOIN note_page_links npl ON p.id = npl.page_id 
JOIN notes n ON npl.note_id = n.id;

-- 孤立ページ確認
SELECT p.* FROM pages p 
LEFT JOIN note_page_links npl ON p.id = npl.page_id 
WHERE npl.page_id IS NULL;
```

## 今後の改善点
1. **エラーハンドリングの強化**: ネットワークエラーや同時実行エラーへの対応
2. **パフォーマンス最適化**: 大量ページを持つユーザーへの対応
3. **ユーザビリティ向上**: デフォルトノート名のカスタマイズ機能
4. **移行機能のUI**: 管理画面での孤立ページ移行インターフェース
5. **監査ログ**: ページ移行履歴の記録機能

## 実装完了時刻
2025年07月25日 11:20