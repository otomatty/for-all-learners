# デフォルトノート（/notes/default）の公開制限とページ公開システムの要件定義

**作成日**: 2025-10-30
**対象**: 全開発者
**カテゴリ**: 要件定義・技術調査

---

## 概要

現在、すべてのユーザーは `/notes/default` で自分のすべてのページを閲覧できるようになっています。今後、共有されているページなども表示される予定のため、このページは**常に非公開**にする必要があります。

ユーザーがページを公開したい場合は、別にノートを作成し、そこに公開可能なページ（オリジナルが公開になっているページ）を登録することで公開できるようなシステムを構築します。

---

## 現状分析

### 現在の実装

#### 1. デフォルトノートの特徴
- **自動作成**: ユーザー登録時に `is_default_note = true` のノートが自動作成される
  - スラッグ: `default-{user_id}`
  - タイトル: "すべてのページ"
  - 説明: "あなたが作成したすべてのページがここに表示されます"
  - 公開状態: `private`（デフォルト）

#### 2. データベース制約（database/migrations/20251028_add_default_note_flag.sql）
```sql
-- デフォルトノートは削除不可
CREATE POLICY prevent_delete_default_note
ON public.notes
FOR DELETE
USING (
  owner_id = auth.uid() 
  AND is_default_note = FALSE
);

-- デフォルトノートの公開状態は変更不可
CREATE POLICY update_own_notes
ON public.notes
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  AND (
    (is_default_note = FALSE) 
    OR (is_default_note = TRUE AND visibility = 'private')
  )
);
```

**✅ 良い点:**
- デフォルトノートは既に `private` に固定されており、変更できない仕組みが実装済み
- 削除も防止されている

**⚠️ 問題点:**
- UI上でユーザーがデフォルトノートの公開状態を変更しようとした際のフィードバックがない
- デフォルトノート内のページの公開状態に関する制約がない

#### 3. ページの公開設定
```sql
-- pages テーブル
CREATE TABLE pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  -- ...
  is_public BOOLEAN DEFAULT FALSE,  -- ページ自体の公開フラグ
  -- ...
);
```

**現状の問題:**
- ページの `is_public` フラグはあるが、デフォルトノートとの連携がない
- 非公開ページを公開ノートにリンクできてしまう可能性

---

## 要件定義

### 1. デフォルトノートの公開制限

#### 要件 R1-1: デフォルトノートは常に非公開
**内容**: デフォルトノート（`is_default_note = true`）は常に `visibility = 'private'` で固定し、変更不可とする。

**実装状況**: ✅ **実装済み**（RLSポリシーで制約）

**追加対応が必要な項目:**
- [ ] UI上で公開設定を変更しようとした際のエラーメッセージ表示
- [ ] ShareSettingsModal でデフォルトノートの場合は公開設定を無効化
- [ ] ユーザーへの説明テキスト（"デフォルトノートは非公開専用です"）

#### 要件 R1-2: デフォルトノートには全てのページが自動リンク
**内容**: ユーザーが作成したすべてのページは、自動的にデフォルトノートにリンクされる。

**実装状況**: ✅ **実装済み**（トリガーで自動リンク）

---

### 2. 公開ノートの作成とページリンク

#### 要件 R2-1: 公開ノート作成機能
**内容**: ユーザーは通常のノートを作成し、公開範囲を設定できる。

**実装状況**: ✅ **実装済み**（`createNote` 関数で実装）

#### 要件 R2-2: 公開可能ページのフィルタリング
**内容**: 公開ノートにページをリンクする際、**オリジナルが公開（`is_public = true`）になっているページのみ**をリンク可能とする。

**実装状況**: ❌ **未実装**

**実装が必要な項目:**
- [ ] ページ選択UI で非公開ページを選択不可にする
- [ ] API/Server Action でページの `is_public` をチェック
- [ ] エラーメッセージ: "非公開ページは公開ノートに追加できません"

#### 要件 R2-3: ページ公開状態とノート公開の連携
**内容**: 
- 公開ノートにリンクされているページが非公開に変更された場合、自動的にリンクを解除する
- または、警告を表示してユーザーに選択させる

**実装状況**: ❌ **未実装**

**検討事項:**
- **Option A（自動解除）**: ページを非公開にした際、公開ノートからのリンクを自動削除
- **Option B（警告）**: ページを非公開にしようとした際、"このページは公開ノートにリンクされています。非公開にするとリンクが解除されます。"と警告
- **推奨**: Option B（ユーザーに判断させる）

---

### 3. UI/UX 要件

#### 要件 R3-1: デフォルトノートの識別
**内容**: デフォルトノートであることをUIで明確に表示する。

**実装項目:**
- [ ] ノートヘッダーに "デフォルトノート" バッジ表示
- [ ] ノート一覧でデフォルトノートを区別（アイコンまたはラベル）
- [ ] 削除ボタンを非表示（現在は `isDefaultNote` で制御済み）

#### 要件 R3-2: 公開設定の明確化
**内容**: ページとノートの公開設定の関係をユーザーにわかりやすく説明する。

**実装項目:**
- [ ] ノート作成ダイアログに説明テキスト追加
  - "公開ノートには、公開設定されたページのみ追加できます"
- [ ] ページリンク時のツールチップ
  - "このページは非公開のため、公開ノートに追加できません"
- [ ] ヘルプドキュメントまたはFAQ作成

#### 要件 R3-3: ページ公開設定の簡便化
**内容**: ページを公開する際のUXを改善する。

**実装項目:**
- [ ] ページ編集画面に "公開設定" トグルを追加
- [ ] ページ一覧でページの公開状態を表示（公開 / 非公開バッジ）
- [ ] 一括公開設定機能（複数ページをまとめて公開）

---

### 4. データ整合性要件

#### 要件 R4-1: 公開ノートには公開ページのみリンク可能
**実装方法**: データベースレベルでの制約またはアプリケーションレベルのバリデーション

**推奨**: アプリケーションレベル（柔軟性があるため）

**実装箇所:**
- `app/_actions/notes/linkPageToNote.ts` などのServer Action
- ページリンク作成前に `is_public` をチェック

```typescript
// 疑似コード
export async function linkPageToNote(noteId: string, pageId: string) {
  const supabase = await getSupabaseClient();
  
  // ノートの公開状態を確認
  const { data: note } = await supabase
    .from('notes')
    .select('visibility, is_default_note')
    .eq('id', noteId)
    .single();
  
  // ページの公開状態を確認
  const { data: page } = await supabase
    .from('pages')
    .select('is_public')
    .eq('id', pageId)
    .single();
  
  // デフォルトノート以外で、公開ノートの場合
  if (!note.is_default_note && note.visibility !== 'private') {
    // ページが非公開の場合はエラー
    if (!page.is_public) {
      throw new Error('非公開ページは公開ノートに追加できません');
    }
  }
  
  // リンク作成
  // ...
}
```

#### 要件 R4-2: ページ公開状態変更時の整合性チェック
**内容**: ページを非公開に変更する際、公開ノートにリンクされている場合は警告を表示する。

**実装箇所:**
- `app/_actions/pages/updatePage.ts`

```typescript
// 疑似コード
export async function updatePageVisibility(pageId: string, isPublic: boolean) {
  const supabase = await getSupabaseClient();
  
  // 非公開に変更しようとしている場合
  if (!isPublic) {
    // 公開ノートにリンクされているかチェック
    const { data: links } = await supabase
      .from('note_page_links')
      .select('note_id, notes!inner(visibility, is_default_note)')
      .eq('page_id', pageId)
      .neq('notes.visibility', 'private')
      .eq('notes.is_default_note', false);
    
    if (links && links.length > 0) {
      throw new Error(
        'このページは公開ノートにリンクされています。非公開にするとリンクが解除されます。'
      );
    }
  }
  
  // 更新処理
  // ...
}
```

---

## 実装計画

### Phase 1: デフォルトノートの公開制限UI（優先度: High）
- [ ] ShareSettingsModal でデフォルトノートの公開設定を無効化
- [ ] エラーメッセージ・説明テキストの追加
- [ ] ノートヘッダーに "デフォルトノート" バッジ表示

### Phase 2: ページ公開設定の実装（優先度: High）
- [ ] ページ編集画面に公開設定トグルを追加
- [ ] ページ一覧で公開状態を表示
- [ ] `updatePageVisibility` Server Action 実装

### Phase 3: 公開ノートとページの整合性チェック（優先度: Medium）
- [ ] `linkPageToNote` に公開状態チェックを追加
- [ ] ページ非公開化時の警告実装
- [ ] ページ選択UIでの非公開ページフィルタリング

### Phase 4: UX改善（優先度: Low）
- [ ] ヘルプドキュメント作成
- [ ] ページ一括公開設定機能
- [ ] ツールチップ・説明テキストの充実

---

## テストケース

### TC-1: デフォルトノートの公開制限
- [ ] デフォルトノートの公開設定変更を試みた際にエラーが表示される
- [ ] ShareSettingsModal でデフォルトノートの公開設定が無効化されている

### TC-2: 公開ノートへのページリンク
- [ ] 公開ページを公開ノートにリンクできる
- [ ] 非公開ページを公開ノートにリンクしようとするとエラーが表示される
- [ ] デフォルトノートには公開・非公開両方のページをリンクできる

### TC-3: ページ公開状態の変更
- [ ] 公開ページを非公開に変更できる
- [ ] 公開ノートにリンクされているページを非公開にしようとすると警告が表示される
- [ ] 警告を承認するとリンクが解除される

### TC-4: データ整合性
- [ ] デフォルトノートは常に `private` である
- [ ] 公開ノートには公開ページのみがリンクされている
- [ ] ページの公開状態変更後、整合性が保たれている

---

## 関連ファイル

### データベース
- `database/migrations/20251028_add_default_note_flag.sql` - デフォルトノート制約
- `database/notes_grouping.sql` - ノートテーブル定義

### Server Actions
- `app/_actions/notes/getDefaultNote.ts` - デフォルトノート取得
- `app/_actions/notes/createNote.ts` - ノート作成
- `app/_actions/notes/updateNote.ts` - ノート更新
- `app/_actions/pages/updatePage.ts` - ページ更新（公開状態変更）

### UI Components
- `components/ShareSettingsModal.tsx` - 共有設定モーダル
- `app/(protected)/notes/[slug]/_components/note-header.tsx` - ノートヘッダー
- `app/(protected)/notes/[slug]/_components/note-deck-manager.tsx` - ページリンク管理

---

## 技術的考察

### データベース制約 vs アプリケーションバリデーション

| 項目 | データベース制約 | アプリケーションバリデーション |
|------|-----------------|---------------------------|
| **メリット** | データ整合性が完全に保証される | 柔軟なエラーメッセージ、複雑なロジックに対応 |
| **デメリット** | エラーメッセージが不親切、複雑な制約は実装困難 | バグによる整合性崩れのリスク |
| **推奨** | 重要な制約（デフォルトノートの削除防止等） | ユーザー向けバリデーション（公開ページチェック等） |

**結論**: 
- デフォルトノートの公開制限 → **データベース制約**（既に実装済み）
- ページリンク時の公開チェック → **アプリケーションバリデーション**（より良いUX）

---

## 参考資料

- デフォルトノート実装: `database/migrations/20251028_add_default_note_flag.sql`
- ノートグルーピング仕様: `database/notes_grouping.sql`
- RLS (Row Level Security) ポリシー: Supabase公式ドキュメント

---

## 次のステップ

1. このドキュメントをレビュー・承認
2. GitHub Issue を作成（Phase 1～4 ごとに分割）
3. 実装開始（Phase 1 から順次）
4. テストケース実行
5. ドキュメント更新

---

**最終更新**: 2025-10-30
**作成者**: AI (Claude)
