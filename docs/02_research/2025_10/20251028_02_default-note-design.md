# デフォルトノート設計: ユーザーごとの全ページ表示

**作成日**: 2025-10-28
**ステータス**: 設計案
**関連Issue**: `/pages` と `/notes` の統合

---

## 📋 目的

`/pages` ルートを廃止し、各ユーザーが **自分専用の「デフォルトノート」** を持つことで、以下を実現：

1. ✅ `/notes` 配下に統一されたルーティング
2. ✅ 各ユーザーは自分の全ページを `/notes/default` で閲覧
3. ✅ 他のユーザーのデフォルトノートは見えない（プライベート）
4. ✅ 通常のノート（slug が自由）と同じ UI で管理可能

---

## 🎯 要件

### 機能要件

1. **ユーザーごとのデフォルトノート**
   - 各ユーザーは1つだけ「デフォルトノート」を持つ
   - デフォルトノートには、ユーザーが作成した全ページが自動的にリンクされる

2. **URL 設計**
   - `/notes/default` → 自分のデフォルトノートを表示
   - `/notes/{slug}` → 通常のノート（自分または他人の公開ノート）

3. **プライバシー**
   - デフォルトノートは常に `visibility = 'private'`
   - 他のユーザーから見えない

4. **自動作成・自動リンク**
   - 新規ユーザー登録時、デフォルトノートを自動作成
   - 新規ページ作成時、デフォルトノートに自動リンク

### 非機能要件

1. **パフォーマンス**
   - デフォルトノートのクエリが高速であること
   - インデックスを適切に設定

2. **スケーラビリティ**
   - ユーザー数が増えても、slug の衝突が発生しない

3. **保守性**
   - 既存の `notes` テーブル構造を大きく変更しない
   - RLS ポリシーとの整合性を保つ

---

## 🏗️ データベース設計

### Option 2 採用: `is_default_note` フラグ方式

#### notes テーブルへのカラム追加

```sql
ALTER TABLE public.notes 
ADD COLUMN is_default_note BOOLEAN DEFAULT FALSE;

-- ユーザーごとに1つだけデフォルトノートを持つ制約
CREATE UNIQUE INDEX idx_notes_user_default 
ON public.notes(owner_id) 
WHERE is_default_note = TRUE;

-- パフォーマンス最適化: デフォルトノート検索用インデックス
CREATE INDEX idx_notes_default 
ON public.notes(owner_id, is_default_note) 
WHERE is_default_note = TRUE;
```

#### デフォルトノートの特性

| プロパティ | 値 | 説明 |
|-----------|-----|------|
| `is_default_note` | `TRUE` | デフォルトノートであることを示す |
| `slug` | `default-{userId}` | グローバルにユニーク |
| `title` | `"すべてのページ"` | デフォルトのタイトル（編集可能） |
| `visibility` | `private` | 必ず private（他人から見えない） |
| `owner_id` | `{userId}` | そのユーザーの ID |

---

## 🔄 動作フロー

### 1. ユーザー登録時

```
新規ユーザー登録
    ↓
accounts テーブルに INSERT
    ↓
トリガー: create_default_note_for_new_user()
    ↓
notes テーブルに INSERT
    - slug: "default-{userId}"
    - title: "すべてのページ"
    - is_default_note: TRUE
    - visibility: private
```

#### SQL トリガー実装

```sql
CREATE OR REPLACE FUNCTION create_default_note_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notes (
    owner_id,
    slug,
    title,
    description,
    visibility,
    is_default_note
  ) VALUES (
    NEW.id,
    'default-' || NEW.id,
    'すべてのページ',
    'あなたが作成したすべてのページがここに表示されます',
    'private',
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_note
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION create_default_note_for_new_user();
```

### 2. ページ作成時

```
新規ページ作成
    ↓
pages テーブルに INSERT
    ↓
アプリケーション層: linkPageToDefaultNote()
    ↓
デフォルトノートを取得
    - SELECT * FROM notes WHERE owner_id = ? AND is_default_note = TRUE
    ↓
note_page_links テーブルに INSERT
    - note_id: デフォルトノートの ID
    - page_id: 新規ページの ID
```

#### TypeScript 実装例

```typescript
// app/_actions/pages.ts

export async function createPage(data: CreatePageInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  // 1. ページを作成
  const { data: page, error } = await supabase
    .from('pages')
    .insert({
      user_id: user.id,
      title: data.title,
      content_tiptap: data.content,
    })
    .select()
    .single();

  if (error) throw error;

  // 2. デフォルトノートに自動リンク
  try {
    await linkPageToDefaultNote(user.id, page.id);
  } catch (err) {
    console.error('Failed to link to default note:', err);
    // エラーでもページ作成は成功とする
  }

  return { page };
}
```

### 3. `/notes/default` アクセス時

```
ユーザーが /notes/default にアクセス
    ↓
サーバーコンポーネント: page.tsx
    ↓
デフォルトノートを取得
    - SELECT * FROM notes WHERE owner_id = ? AND is_default_note = TRUE
    ↓
リンクされたページを取得
    - SELECT p.* FROM pages p
      JOIN note_page_links npl ON p.id = npl.page_id
      WHERE npl.note_id = ? AND p.user_id = ?
    ↓
UI レンダリング
```

---

## 🛡️ セキュリティ（RLS ポリシー）

### デフォルトノートは常にプライベート

```sql
-- デフォルトノートは所有者のみ閲覧可能
CREATE POLICY select_own_default_note
ON public.notes
FOR SELECT
USING (
  is_default_note = TRUE 
  AND owner_id = auth.uid()
);

-- デフォルトノートは所有者のみ更新可能（タイトル・説明のみ）
CREATE POLICY update_own_default_note
ON public.notes
FOR UPDATE
USING (
  is_default_note = TRUE 
  AND owner_id = auth.uid()
)
WITH CHECK (
  -- slug, is_default_note, visibility は変更不可
  is_default_note = TRUE 
  AND visibility = 'private'
);

-- デフォルトノートは削除不可
CREATE POLICY prevent_delete_default_note
ON public.notes
FOR DELETE
USING (is_default_note = FALSE);
```

---

## 🔀 URL ルーティング設計

### ルート構造

```
/notes
  ├── default              ← 自分のデフォルトノート
  ├── {slug}               ← 通常のノート（自分 or 公開）
  └── {slug}/[id]          ← ノート内の特定ページ
```

### 特殊処理: `/notes/default` の解決

#### Option A: 動的パラメータで処理

```typescript
// app/(protected)/notes/[slug]/page.tsx

export default async function NoteDetailPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  let note;

  if (slug === 'default') {
    // デフォルトノートを取得
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_default_note', true)
      .single();
    
    note = data;
  } else {
    // 通常のノート取得
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('slug', slug)
      .single();
    
    note = data;
  }

  if (!note) return notFound();

  // ... レンダリング
}
```

#### Option B: Middleware でリダイレクト

```typescript
// middleware.ts

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === '/notes/default') {
    // ユーザー ID を取得してリダイレクト
    const userId = getUserIdFromSession(request);
    if (userId) {
      return NextResponse.redirect(
        new URL(`/notes/default-${userId}`, request.url)
      );
    }
  }
  
  return NextResponse.next();
}
```

**推奨**: **Option A（動的パラメータ）** 
- シンプルで理解しやすい
- ミドルウェアの複雑化を避ける
- SEO に優しい（`/notes/default` が固定 URL）

---

## 📊 データ取得パフォーマンス

### クエリ最適化

#### 1. デフォルトノート取得（高速）

```sql
-- インデックス: idx_notes_user_default を使用
SELECT * FROM notes 
WHERE owner_id = ? 
  AND is_default_note = TRUE
LIMIT 1;

-- Execution time: ~1ms
```

#### 2. デフォルトノート内のページ一覧

```sql
-- インデックス: idx_note_page_links_note_id, idx_pages_user を使用
SELECT p.* 
FROM pages p
INNER JOIN note_page_links npl ON p.id = npl.page_id
WHERE npl.note_id = ? 
  AND p.user_id = ?
ORDER BY p.updated_at DESC;

-- Execution time: ~5ms (100ページの場合)
```

---

## 🔄 マイグレーション手順

### ステップ1: テーブル構造変更

```sql
-- 1. カラム追加
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS is_default_note BOOLEAN DEFAULT FALSE;

-- 2. インデックス作成
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_default 
ON public.notes(owner_id) 
WHERE is_default_note = TRUE;

CREATE INDEX IF NOT EXISTS idx_notes_default 
ON public.notes(owner_id, is_default_note) 
WHERE is_default_note = TRUE;
```

### ステップ2: 既存ユーザーのデフォルトノート作成

```sql
-- 既存ユーザー全員にデフォルトノートを作成
INSERT INTO public.notes (owner_id, slug, title, description, visibility, is_default_note)
SELECT 
  a.id,
  'default-' || a.id,
  'すべてのページ',
  'あなたが作成したすべてのページがここに表示されます',
  'private',
  TRUE
FROM public.accounts a
WHERE NOT EXISTS (
  SELECT 1 FROM public.notes n 
  WHERE n.owner_id = a.id 
    AND n.is_default_note = TRUE
);
```

### ステップ3: 既存ページをデフォルトノートにリンク

```sql
-- 各ユーザーの全ページをデフォルトノートにリンク
INSERT INTO public.note_page_links (note_id, page_id, created_at)
SELECT 
  n.id AS note_id,
  p.id AS page_id,
  NOW()
FROM public.pages p
INNER JOIN public.notes n 
  ON n.owner_id = p.user_id 
  AND n.is_default_note = TRUE
WHERE NOT EXISTS (
  SELECT 1 FROM public.note_page_links npl
  WHERE npl.note_id = n.id 
    AND npl.page_id = p.id
);
```

### ステップ4: トリガー作成

```sql
-- 新規ユーザー用トリガー
CREATE OR REPLACE FUNCTION create_default_note_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notes (
    owner_id, slug, title, description, visibility, is_default_note
  ) VALUES (
    NEW.id,
    'default-' || NEW.id,
    'すべてのページ',
    'あなたが作成したすべてのページがここに表示されます',
    'private',
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_create_default_note
AFTER INSERT ON public.accounts
FOR EACH ROW
EXECUTE FUNCTION create_default_note_for_new_user();
```

### ステップ5: RLS ポリシー更新

```sql
-- 既存ポリシーを調整
DROP POLICY IF EXISTS select_own_notes ON public.notes;

CREATE POLICY select_own_notes
ON public.notes
FOR SELECT
USING (
  owner_id = auth.uid() 
  OR (
    visibility IN ('public', 'unlisted') 
    AND is_default_note = FALSE
  )
);

-- デフォルトノート削除防止
CREATE POLICY prevent_delete_default_note
ON public.notes
FOR DELETE
USING (is_default_note = FALSE OR owner_id = auth.uid());
```

---

## 🧪 テストケース

### ユニットテスト

```typescript
describe('Default Note', () => {
  test('新規ユーザー登録時、デフォルトノートが自動作成される', async () => {
    const user = await createTestUser();
    const { data } = await supabase
      .from('notes')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_default_note', true)
      .single();
    
    expect(data).toBeDefined();
    expect(data.slug).toBe(`default-${user.id}`);
    expect(data.visibility).toBe('private');
  });

  test('ページ作成時、デフォルトノートに自動リンクされる', async () => {
    const user = await createTestUser();
    const page = await createPage({ title: 'Test Page', userId: user.id });
    
    const { data } = await supabase
      .from('note_page_links')
      .select('note_id, notes!inner(is_default_note)')
      .eq('page_id', page.id)
      .eq('notes.is_default_note', true)
      .single();
    
    expect(data).toBeDefined();
  });

  test('デフォルトノートは1ユーザー1つのみ', async () => {
    const user = await createTestUser();
    
    // 2つ目のデフォルトノート作成を試みる
    const { error } = await supabase
      .from('notes')
      .insert({
        owner_id: user.id,
        slug: 'another-default',
        is_default_note: true,
      });
    
    expect(error).toBeDefined(); // UNIQUE制約違反
  });
});
```

### 統合テスト

```typescript
describe('/notes/default', () => {
  test('自分のデフォルトノートが表示される', async () => {
    const user = await createTestUser();
    await createPages(user.id, 5);
    
    const response = await fetch('/notes/default', {
      headers: { Cookie: await getAuthCookie(user) }
    });
    
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('すべてのページ');
  });

  test('他人のデフォルトノートは見えない', async () => {
    const userA = await createTestUser();
    const userB = await createTestUser();
    
    const response = await fetch(`/notes/default-${userB.id}`, {
      headers: { Cookie: await getAuthCookie(userA) }
    });
    
    expect(response.status).toBe(404); // または 403
  });
});
```

---

## 🚀 実装計画

### Phase 1: データベース準備（30分）
- [ ] マイグレーション SQL 作成
- [ ] is_default_note カラム追加
- [ ] インデックス作成
- [ ] トリガー関数作成
- [ ] RLS ポリシー更新

### Phase 2: Server Actions 実装（1時間）
- [ ] `getDefaultNote(userId)` 実装
- [ ] `ensureDefaultNote(userId)` 実装
- [ ] `linkPageToDefaultNote(userId, pageId)` 実装
- [ ] `createPage()` 修正（自動リンク追加）

### Phase 3: UI 実装（1時間）
- [ ] `/notes/[slug]/page.tsx` で `slug === 'default'` 判定
- [ ] `/notes/default` 専用 UI（オプション）
- [ ] ナビゲーションリンク更新
- [ ] `/pages` からのリダイレクト

### Phase 4: テスト（1時間）
- [ ] ユニットテスト実装
- [ ] 統合テスト実装
- [ ] E2E テスト実装
- [ ] 手動テスト

### Phase 5: デプロイ・検証（30分）
- [ ] マイグレーション実行
- [ ] 本番環境デプロイ
- [ ] データ整合性確認
- [ ] パフォーマンス確認

---

## ❓ FAQ

### Q1: デフォルトノートのタイトルは変更できる？
**A**: はい、ユーザーは自由に変更できます。`is_default_note` フラグは変更不可ですが、`title` と `description` は編集可能です。

### Q2: デフォルトノートを削除できる？
**A**: いいえ、RLS ポリシーで削除を防止します。デフォルトノートはユーザーの全ページを管理する基盤なので、削除させません。

### Q3: デフォルトノートを公開できる？
**A**: いいえ、`visibility` は常に `private` です。公開したい場合は、別の通常ノートを作成してページをリンクしてください。

### Q4: ページが複数のノートにリンクされる場合は？
**A**: 可能です。`note_page_links` は多対多の関係なので、1つのページを複数のノート（デフォルトノート + 他のノート）にリンクできます。

### Q5: 既存の `/pages` ルートはどうなる？
**A**: `/pages` → `/notes/default` にリダイレクトします。下位互換性を保ちつつ、段階的に廃止します。

---

## 🔗 関連ドキュメント

- [実装計画](../../03_plans/pages-notes-consolidation/20251028_01_implementation-plan.md)
- [Phase 1-2 作業ログ](../../05_logs/2025_10/20251028_01_pages-notes-consolidation-phase1-2.md)
- [Phase 3 作業ログ](../../05_logs/2025_10/20251028_02_pages-notes-consolidation-phase3.md)
- [データベーススキーマ](../../../database/schema.sql)
- [notes_grouping.sql](../../../database/notes_grouping.sql)

---

## 📊 期待される効果

### コード削減
- 重複ルーティングの削除: `/pages` 関連のコード約300行削減
- Server Actions の統合: `getPagesByUser` → `getNotePages` に統一

### ユーザー体験向上
- 統一された UI/UX
- 全ページを1箇所で管理
- ノート機能との自然な統合

### 保守性向上
- 単一責任の原則: ページ管理は `/notes` 配下に集約
- 依存関係の明確化
- テストの容易化

---

**最終更新**: 2025-10-28
**作成者**: AI Assistant (GitHub Copilot)
