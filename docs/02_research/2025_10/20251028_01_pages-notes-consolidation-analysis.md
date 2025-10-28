# `/pages` と `/notes` 統合可能性分析

**作成日**: 2025-10-28
**ステータス**: 調査完了
**結論**: ✅ **統合可能** (ただし段階的な移行が必要)

---

## 📋 概要

現在、`/pages` と `/notes/[slug]` で類似した構造のページ管理システムが並存しています。
データベース構造とコードベースを分析した結果、**`/pages` を `/notes` に統合することは技術的に可能**と判断されます。

---

## 🗂️ 現状分析

### 1. データベース構造

#### `pages` テーブル
```sql
CREATE TABLE pages (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES accounts(id) NOT NULL,
  title TEXT NOT NULL,
  thumbnail_url TEXT,
  content_tiptap JSONB NOT NULL,
  scrapbox_page_id TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**特徴**:
- ユーザーごとに独立したページ
- Cosense(Scrapbox)連携機能を持つ
- `note_id` カラムは **存在しない** (独立したページ管理)

#### `notes` テーブル
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES accounts(id) NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  visibility VARCHAR(10) DEFAULT 'private',
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**特徴**:
- ノート自体は「フォルダ」のような概念
- ページを複数まとめる「グループ」として機能
- 公開設定（public, unlisted, invite, private）が可能

#### `note_page_links` テーブル (中間テーブル)
```sql
CREATE TABLE note_page_links (
  id UUID PRIMARY KEY,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ,
  UNIQUE(note_id, page_id)
);
```

**特徴**:
- **Many-to-Many** 関係（1つのページは複数のノートに所属可能）
- ページとノートを紐づける中間テーブル

---

### 2. ルーティング構造

#### 現在の `/pages` ルート

| パス | 機能 |
|------|------|
| `/pages` | ユーザーの全ページ一覧 |
| `/pages/[id]` | ページ詳細・編集 |
| `/pages/new` | 新規ページ作成 (Server Action) |

**特徴**:
- ユーザーが作成したすべてのページをフラットに表示
- ノートに所属しないページも表示

#### 現在の `/notes` ルート

| パス | 機能 |
|------|------|
| `/notes` | ノート一覧 |
| `/notes/[slug]` | ノート内のページ一覧 |
| `/notes/[slug]/[id]` | ノート内のページ詳細・編集 |
| `/notes/[slug]/new` | ノート内に新規ページ作成 |

**特徴**:
- ノート単位でページを管理
- ノートごとに公開設定・共有設定が可能
- **階層構造**: ノート → ページ

---

### 3. コンポーネント比較

#### `/pages/_components/pages-list.tsx`
```tsx
<PageCard
  title={page.title}
  href={`/pages/${encodeURIComponent(page.id)}`}
  thumbnailUrl={page.thumbnail_url}
  contentPreview={text || undefined}
/>
```

#### `/notes/[slug]/_components/pages-list.tsx`
```tsx
<Link href={`/notes/${encodeURIComponent(slug)}/${encodeURIComponent(page.id)}`}>
  <Card>
    <CardHeader><CardTitle>{page.title}</CardTitle></CardHeader>
    <CardContent>
      {page.thumbnail_url ? <Image ... /> : <p>{text}</p>}
    </CardContent>
  </Card>
</Link>
```

**類似点**:
- 両方とも `pages` テーブルのデータを表示
- サムネイルとテキストプレビューを表示
- `PageCard` コンポーネントを使用 (or 同等の機能)

**相違点**:
- リンク先のパスが異なる (`/pages/[id]` vs `/notes/[slug]/[id]`)
- `/notes` 側は `slug` パラメータが必要

---

### 4. Server Actions 分析

#### `/pages` 用 Actions
```typescript
// app/_actions/pages.ts
export async function getPagesByUser(userId: string)
export async function createPage(page: ...)
export async function updatePage(id: string, updates: ...)
export async function deletePage(id: string)
```

**特徴**:
- ユーザーIDをキーに全ページを取得
- ノートに所属しないページも対象

#### `/notes` 用 Actions
```typescript
// app/_actions/notes/getNotePages.ts
export async function getNotePages({slug, limit, offset, sortBy})

// app/_actions/notes/linkPageToNote.ts
export async function linkPageToNote(noteId: string, pageId: string)

// app/_actions/notes/unlinkPageFromNote.ts
export async function unlinkPageFromNote(noteId: string, pageId: string)
```

**特徴**:
- ノートIDをキーにページを取得
- RPC関数 `get_note_pages` を使用してページネーション対応
- ページとノートの紐付け・解除機能

---

## 🔍 統合可能性の判断

### ✅ 統合可能な理由

#### 1. データベース構造が統合を前提としている
- `note_page_links` テーブルが既に存在
- **ページは複数のノートに所属可能** (Many-to-Many関係)
- `/pages` は「ノートに所属しないページ」と解釈できる

#### 2. コンポーネントの重複が多い
- `pages-list.tsx` が両方に存在
- ページカード表示ロジックがほぼ同じ
- コード重複によるメンテナンスコスト増加

#### 3. ユーザー体験の改善
- `/pages` と `/notes` の使い分けが不明瞭
- 統合することで階層構造がシンプルに
- 「すべてのページ」は「デフォルトノート」として表現可能

---

### ⚠️ 注意すべき点

#### 1. デフォルトノートの作成
```typescript
// 統合後: すべてのユーザーに「すべてのページ」ノートを作成
async function ensureDefaultNote(userId: string) {
  const { data: defaultNote } = await supabase
    .from("notes")
    .select("*")
    .eq("owner_id", userId)
    .eq("slug", "all-pages")
    .single();

  if (!defaultNote) {
    await supabase.from("notes").insert({
      owner_id: userId,
      slug: "all-pages",
      title: "すべてのページ",
      visibility: "private",
    });
  }
}
```

#### 2. Cosense連携ページの扱い
- 現在 `/pages` で管理されているCosense連携ページ
- デフォルトノートに自動移行する必要がある

#### 3. 既存ページの移行
```sql
-- 既存のページを「all-pages」ノートに紐付け
INSERT INTO note_page_links (note_id, page_id)
SELECT 
  (SELECT id FROM notes WHERE slug = 'all-pages' AND owner_id = p.user_id),
  p.id
FROM pages p
WHERE NOT EXISTS (
  SELECT 1 FROM note_page_links npl WHERE npl.page_id = p.id
);
```

#### 4. パーミッション管理
- `/pages` は user_id ベースの権限
- `/notes` は note_shares テーブルでの共有機能
- 統合後は note_shares を活用した権限管理に統一

---

## 🚀 統合の実装計画 (案)

### Phase 1: デフォルトノート導入 (影響: 小)
**目標**: すべてのユーザーに「すべてのページ」ノートを作成

```typescript
// 1. マイグレーションスクリプト
async function migrateToDefaultNote() {
  const { data: users } = await supabase.from("accounts").select("id");
  
  for (const user of users) {
    // デフォルトノート作成
    const { data: note } = await supabase.from("notes").insert({
      owner_id: user.id,
      slug: "all-pages",
      title: "すべてのページ",
      visibility: "private",
    }).select().single();

    // 既存のページを紐付け
    const { data: pages } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", user.id);

    await supabase.from("note_page_links").insert(
      pages.map(p => ({ note_id: note.id, page_id: p.id }))
    );
  }
}
```

**期間**: 1週間
**リスク**: 低

---

### Phase 2: ルート統合 (影響: 中)
**目標**: `/pages` を `/notes/all-pages` にリダイレクト

```typescript
// app/(protected)/pages/page.tsx → リダイレクト
export default async function PagesPage() {
  redirect("/notes/all-pages");
}

// app/(protected)/pages/[id]/page.tsx → リダイレクト
export default async function PageDetail({ params }) {
  const { id } = await params;
  redirect(`/notes/all-pages/${id}`);
}
```

**期間**: 1週間
**リスク**: 中（既存のブックマーク・リンクが無効になる）

---

### Phase 3: UI・コンポーネント統合 (影響: 中)
**目標**: 重複コンポーネントを削除・統合

```typescript
// Before: 2つのpages-list.tsx
app/(protected)/pages/_components/pages-list.tsx
app/(protected)/notes/[slug]/_components/pages-list.tsx

// After: 1つに統合
components/notes/PagesList/PagesList.tsx
```

**期間**: 1-2週間
**リスク**: 中（コンポーネント間の微妙な差異に注意）

---

### Phase 4: Server Actions 統合 (影響: 大)
**目標**: `/pages` 用 Actions を廃止

```typescript
// Before
app/_actions/pages.ts → getPagesByUser()

// After
app/_actions/notes/getNotePages.ts → getNotePages({slug: "all-pages"})
```

**期間**: 2週間
**リスク**: 高（既存コードの大幅な修正が必要）

---

### Phase 5: `/pages` ディレクトリ削除 (影響: 小)
**目標**: 完全に `/notes` に統合

```bash
# 削除対象
rm -rf app/(protected)/pages
```

**期間**: 1週間
**リスク**: 低（Phase 4 完了後）

---

## 📊 リスク評価

| フェーズ | 影響範囲 | リスク | 推奨対応 |
|---------|---------|--------|---------|
| Phase 1 | データベース | 低 | マイグレーションスクリプトのテスト実施 |
| Phase 2 | ルーティング | 中 | 301リダイレクトで対応、ログ監視 |
| Phase 3 | UI | 中 | コンポーネントテスト強化 |
| Phase 4 | ロジック | 高 | 段階的リファクタリング、E2Eテスト |
| Phase 5 | ファイル削除 | 低 | Phase 4完了まで実施しない |

---

## 🔗 関連ファイル

### データベース
- `database/schema.sql` - pages テーブル定義
- `database/notes_grouping.sql` - notes, note_page_links テーブル定義

### ルーティング
- `app/(protected)/pages/page.tsx` - ページ一覧
- `app/(protected)/pages/[id]/page.tsx` - ページ詳細
- `app/(protected)/notes/[slug]/page.tsx` - ノート内ページ一覧
- `app/(protected)/notes/[slug]/[id]/page.tsx` - ノート内ページ詳細

### Server Actions
- `app/_actions/pages.ts` - ページ操作
- `app/_actions/notes/getNotePages.ts` - ノート内ページ取得
- `app/_actions/notes/linkPageToNote.ts` - ページ紐付け
- `app/_actions/notes/unlinkPageFromNote.ts` - ページ紐付け解除

### コンポーネント
- `app/(protected)/pages/_components/pages-list.tsx`
- `app/(protected)/notes/[slug]/_components/pages-list.tsx`
- `components/notes/PageCard/PageCard.tsx`

---

## 📝 推奨アクション

### 即座に実施可能
1. **Phase 1 のマイグレーションスクリプト作成**
   - デフォルトノートを作成
   - 既存ページを自動紐付け
   - テスト環境で検証

### 段階的に実施
2. **Phase 2 のリダイレクト実装**
   - `/pages` → `/notes/all-pages` への301リダイレクト
   - ユーザーへの通知（UI上で「統合しました」メッセージ）

3. **Phase 3 のコンポーネント統合**
   - 重複コンポーネントを段階的に統合
   - テストカバレッジ向上

### 慎重に実施
4. **Phase 4 の Server Actions 統合**
   - 既存の呼び出し元をすべて特定
   - 段階的にリファクタリング
   - E2Eテストで検証

5. **Phase 5 のクリーンアップ**
   - Phase 4 完了後に実施
   - 不要なファイルを削除

---

## ✅ 結論

**`/pages` を `/notes` に統合することは技術的に可能であり、推奨されます。**

### メリット
- コードの重複削除によるメンテナンス性向上
- ユーザー体験の統一化
- 階層構造の明確化（ノート → ページ）
- 共有機能の一元管理

### 注意点
- 段階的な移行が必要（一度に実施すると影響大）
- デフォルトノートの概念をユーザーに説明する必要あり
- 既存のブックマーク・リンクへの対応（301リダイレクト）

---

**次のステップ**: Phase 1 のマイグレーションスクリプト作成とテスト実施を推奨します。

**作成者**: AI Assistant (GitHub Copilot)
**最終更新**: 2025-10-28
