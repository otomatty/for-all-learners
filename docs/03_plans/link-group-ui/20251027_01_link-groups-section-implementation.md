# リンクグループUI実装計画

**対象:** Phase 2 - Link Group UI
**作成日:** 2025-10-27
**最終更新:** 2025-10-27

---

## 概要

複数箇所で参照されているリンク（リンクグループ）を、エディター直下にグループ別カードリストとして表示する機能を実装します。

### 目的

- Wiki スタイルのリンク管理を実現
- ページが未作成のリンクでも、複数箇所で参照されていることを可視化
- ページ作成をワンクリックで実行可能に
- グループ内の関連ページを一覧表示

---

## UI設計

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│ 📝 エディター                                              │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ┌──────┐ ┌──────┐ ┌──────┐                              │
│ │新規  │ │Page A│ │Page B│  ← React Hooks を参照       │
│ │作成  │ │      │ │      │                              │
│ └──────┘ └──────┘ └──────┘                              │
├─────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                     │
│ │Type  │ │Page E│ │Page F│ │Page G│  ← TypeScript を参照│
│ │Script│ │      │ │      │ │      │                     │
│ │⭐本体│ │      │ │      │ │      │                     │
│ └──────┘ └──────┘ └──────┘ └──────┘                     │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│ ❌ 未設定リンク一覧（linkCount = 1 のもの）                 │
└─────────────────────────────────────────────────────────┘
```

### 表示ルール

#### リンクグループとして表示
- **条件**: `link_count > 1`
- **グループ名**: リンクのテキスト（正規化前）
- **先頭カード**:
  - ページ未作成: 新規作成カード
  - ページ作成済み: ターゲットページカード（⭐本体バッジ付き）
- **残りのカード**: このリンクを参照しているページ（更新日時降順）

#### 未設定リンク一覧として表示
- **条件**: `link_count = 1` かつ `page_id = null`
- **従来の動作を維持**

---

## データ構造

### LinkGroup 型

```typescript
type LinkGroup = {
  key: string;                      // リンクキー（正規化済み）
  displayText: string;              // 表示用テキスト（グループ名）
  linkGroupId: string;              // link_groups.id
  pageId: string | null;            // 対応するページID
  linkCount: number;                // 参照箇所数（必ず > 1）
  targetPage: LinkGroupPage | null; // グループ名のページ本体（pageId が存在する場合）
  referencingPages: LinkGroupPage[]; // このリンクを参照しているページ一覧
};

type LinkGroupPage = {
  id: string;
  title: string;
  thumbnail_url: string | null;
  content_tiptap: JSONContent;
  updated_at: string;
};
```

---

## 実装ステップ

### Phase 2-1: データ取得層

#### ファイル: `app/_actions/linkGroups.ts`

新規追加するサーバーアクション：

```typescript
/**
 * 現在のページで使用されているリンクグループを取得
 * @param pageId - 現在のページID
 * @returns リンクグループ一覧（linkCount > 1）
 */
export async function getLinkGroupsForPage(pageId: string): Promise<{
  data: LinkGroup[];
  error: string | null;
}>;
```

**実装ロジック**:

1. 現在のページの `content_tiptap` から使用中のリンクを抽出
   - `extractLinksFromContent()` を使用
   - リンクキーの配列を取得

2. `link_groups` テーブルから該当グループを取得
   ```sql
   SELECT id, key, page_id, link_count
   FROM link_groups
   WHERE key IN (keys)
     AND link_count > 1
   ```

3. 各グループについて以下を取得:
   
   **3-1. ターゲットページ（`page_id` が存在する場合）**
   ```sql
   SELECT id, title, thumbnail_url, content_tiptap, updated_at
   FROM pages
   WHERE id = group.page_id
   ```
   
   **3-2. 参照しているページ一覧**
   ```sql
   -- link_occurrences から page_id を取得
   SELECT page_id
   FROM link_occurrences
   WHERE link_group_id = group.id
   
   -- pages テーブルから詳細を取得
   SELECT id, title, thumbnail_url, content_tiptap, updated_at
   FROM pages
   WHERE id IN (page_ids)
     AND id != current_page_id  -- 現在のページを除外
     AND id != group.page_id    -- ターゲットページを除外
   ORDER BY updated_at DESC
   ```

4. データを整形して返却

---

### Phase 2-2: コンポーネント作成

#### ファイル構成

```
app/(protected)/pages/[id]/_components/
├── link-groups-section.tsx      （新規）メインセクション
├── target-page-card.tsx         （新規）ターゲットページカード
├── grouped-page-card.tsx        （新規）参照ページカード
├── create-page-card.tsx         （新規）新規作成カード
└── page-links-grid.tsx          （修正）未設定リンクのみ表示
```

---

#### 2.2.1 link-groups-section.tsx（新規）

**責務**: リンクグループ全体のセクションを表示

```typescript
"use client";

import { CreatePageCard } from "./create-page-card";
import { GroupedPageCard } from "./grouped-page-card";
import { TargetPageCard } from "./target-page-card";

interface LinkGroupsSectionProps {
  linkGroups: LinkGroup[];
  noteSlug?: string;
}

export function LinkGroupsSection({ 
  linkGroups, 
  noteSlug 
}: LinkGroupsSectionProps) {
  if (linkGroups.length === 0) return null;
  
  return (
    <div className="my-8 space-y-6">
      {linkGroups.map(group => (
        <section key={group.linkGroupId} className="max-w-5xl mx-auto">
          
          {/* Gridレイアウト（pages-list.tsx と同じ） */}
          <div className="grid gap-2 md:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {/* 先頭カード: ページ存在 → ターゲットページ / 未作成 → 新規作成 */}
            {group.targetPage ? (
              <TargetPageCard 
                page={group.targetPage}
                noteSlug={noteSlug}
              />
            ) : (
              <CreatePageCard
                linkKey={group.key}
                displayText={group.displayText}
                linkGroupId={group.linkGroupId}
                noteSlug={noteSlug}
              />
            )}
            
            {/* 参照しているページ一覧 */}
            {group.referencingPages.map(page => (
              <GroupedPageCard 
                key={page.id} 
                page={page}
                noteSlug={noteSlug}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
```

**ポイント**:
- グループ名はリンクテキストそのもの
- グリッドレイアウトで複数行表示可能
- `pages-list.tsx` と同じレスポンシブ設定

---

#### 2.2.2 target-page-card.tsx（新規）

**責務**: グループ名に対応するページ本体のカード

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { JSONContent } from "@tiptap/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

/**
 * Extracts plain text from Tiptap JSON content.
 */
function extractTextFromTiptap(node: JSONContent): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromTiptap).join("");
  if (node !== null && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return obj.text;
    if ("content" in obj && Array.isArray(obj.content)) {
      return obj.content.map(extractTextFromTiptap).join("");
    }
  }
  return "";
}

interface TargetPageCardProps {
  page: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    content_tiptap: JSONContent;
  };
  noteSlug?: string;
}

export function TargetPageCard({ page, noteSlug }: TargetPageCardProps) {
  const href = noteSlug
    ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
    : `/pages/${page.id}`;
    
  return (
    <Link href={href}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2 ring-2 ring-primary/20">
        <CardHeader className="px-4 py-2">
          <div className="flex items-start gap-2">
            <CardTitle className="flex-1 text-sm">{page.title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4">
          {page.thumbnail_url ? (
            <Image
              src={page.thumbnail_url}
              alt={page.title}
              width={400}
              height={200}
              className="w-full h-32 object-contain"
            />
          ) : (
            (() => {
              const text = extractTextFromTiptap(page.content_tiptap)
                .replace(/\s+/g, " ")
                .trim();
              if (!text) return null;
              return (
                <p className="line-clamp-5 text-sm text-muted-foreground">
                  {text}
                </p>
              );
            })()
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

**ポイント**:
- `ring-2 ring-primary/20` で薄い枠線
- `⭐ 本体` バッジで視覚的に区別
- `pages-list.tsx` のカードデザインを踏襲

---

#### 2.2.3 grouped-page-card.tsx（新規）

**責務**: グループ内の参照ページカード

```typescript
"use client";

import Image from "next/image";
import Link from "next/link";
import type { JSONContent } from "@tiptap/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Extracts plain text from Tiptap JSON content.
 */
function extractTextFromTiptap(node: JSONContent): string {
  if (typeof node === "string") return node;
  if (Array.isArray(node)) return node.map(extractTextFromTiptap).join("");
  if (node !== null && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if ("text" in obj && typeof obj.text === "string") return obj.text;
    if ("content" in obj && Array.isArray(obj.content)) {
      return obj.content.map(extractTextFromTiptap).join("");
    }
  }
  return "";
}

interface GroupedPageCardProps {
  page: {
    id: string;
    title: string;
    thumbnail_url: string | null;
    content_tiptap: JSONContent;
  };
  noteSlug?: string;
}

export function GroupedPageCard({ page, noteSlug }: GroupedPageCardProps) {
  const href = noteSlug
    ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}`
    : `/pages/${page.id}`;
    
  return (
    <Link href={href}>
      <Card className="h-full overflow-hidden transition-all hover:shadow-md py-4 gap-2">
        <CardHeader className="px-4 py-2">
          <CardTitle className="text-sm">{page.title}</CardTitle>
        </CardHeader>
        <CardContent className="px-4">
          {page.thumbnail_url ? (
            <Image
              src={page.thumbnail_url}
              alt={page.title}
              width={400}
              height={200}
              className="w-full h-32 object-contain"
            />
          ) : (
            (() => {
              const text = extractTextFromTiptap(page.content_tiptap)
                .replace(/\s+/g, " ")
                .trim();
              if (!text) return null;
              return (
                <p className="line-clamp-5 text-sm text-muted-foreground">
                  {text}
                </p>
              );
            })()
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
```

**ポイント**:
- `pages-list.tsx` と完全に同じデザイン
- 通常のカードスタイル

---

#### 2.2.4 create-page-card.tsx（新規）

**責務**: 新規ページ作成カード

```typescript
"use client";

import { PlusCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface CreatePageCardProps {
  linkKey: string;
  displayText: string;
  linkGroupId: string;
  noteSlug?: string;
}

export function CreatePageCard({ 
  linkKey, 
  displayText, 
  linkGroupId,
  noteSlug 
}: CreatePageCardProps) {
  const router = useRouter();
  
  const handleClick = async () => {
    const supabase = createClient();
    
    // 認証チェック
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      toast.error("ログインしてください");
      return;
    }
    
    // 1. ページ作成
    const { data: page, error: insertError } = await supabase
      .from("pages")
      .insert({
        user_id: user.id,
        title: displayText,
        content_tiptap: { type: "doc", content: [] },
        is_public: false,
      })
      .select("id")
      .single();
    
    if (insertError || !page) {
      console.error("ページ作成失敗:", insertError);
      toast.error("ページ作成に失敗しました");
      return;
    }
    
    // 2. link_groups の page_id を更新
    const { error: updateError } = await supabase
      .from("link_groups")
      .update({ page_id: page.id })
      .eq("id", linkGroupId);
    
    if (updateError) {
      console.error("link_groups 更新失敗:", updateError);
      // エラーだがページは作成されたので続行
    }
    
    // 3. noteSlug があれば関連付け
    if (noteSlug) {
      const { data: note } = await supabase
        .from("notes")
        .select("id")
        .eq("slug", noteSlug)
        .single();
        
      if (note) {
        await supabase
          .from("note_page_links")
          .insert({ note_id: note.id, page_id: page.id });
      }
    }
    
    // 4. リダイレクト
    const redirectUrl = noteSlug 
      ? `/notes/${encodeURIComponent(noteSlug)}/${page.id}?newPage=true`
      : `/pages/${page.id}?newPage=true`;
    
    router.push(redirectUrl);
  };
  
  return (
    <Card 
      className="h-full border-dashed border-2 hover:border-primary 
                 hover:bg-accent cursor-pointer transition-all
                 flex flex-col items-center justify-center py-8 gap-3"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <PlusCircle className="w-10 h-10 text-muted-foreground" />
      <p className="text-sm font-medium text-center px-3">
        ページを作成
      </p>
    </Card>
  );
}
```

**ポイント**:
- 破線ボーダーでページ未作成を視覚的に表現
- ワンクリックでページ作成 + link_groups 更新
- キーボード操作対応（アクセシビリティ）

---

#### 2.2.5 page-links-grid.tsx（修正）

**変更内容**:
- 「リンクしているページ」セクションを削除
- `missingLinks` は `linkCount = 1` のリンクのみ表示

```typescript
// 修正前: outgoingPages, incomingPages を表示
// 修正後: missingLinks のみ表示（他はリンクグループセクションで表示）

export default function PageLinksGrid({
  missingLinks,  // linkCount = 1 のリンクのみ
  nestedLinks,
  noteSlug,
}: PageLinksGridProps) {
  // ...
  
  return (
    <div className="my-8 space-y-8 min-h-[300px]">
      {/* 未設定リンク一覧（linkCount = 1） */}
      {missingLinks && missingLinks.length > 0 && (
        <section className="max-w-5xl mx-auto">
          <h2 className="text-lg font-semibold mb-2">未設定リンク一覧</h2>
          {/* ... 既存の実装 */}
        </section>
      )}
    </div>
  );
}
```

---

### Phase 2-3: page.tsx 統合

#### ファイル: `app/(protected)/pages/[id]/page.tsx`

```typescript
import { LinkGroupsSection } from "./_components/link-groups-section";
import { getLinkGroupsForPage } from "@/app/_actions/linkGroups";

export default async function PageDetailPage({ params }: PageProps) {
  const { id: pageId } = await params;
  
  // ... 既存のデータ取得 ...
  
  // リンクグループ取得（新規）
  const { data: linkGroups } = await getLinkGroupsForPage(pageId);
  
  // missingLinks は linkCount = 1 のリンクのみにフィルタリング
  const missingLinksFiltered = missingLinks.filter(link => {
    const group = linkGroups?.find(g => g.key === link.key);
    return !group; // linkCount > 1 のグループには含まれていない
  });
  
  return (
    <div>
      {/* エディター */}
      <EditPageForm page={page} noteSlug={noteSlug} />
      
      {/* リンクグループセクション（新規） */}
      <LinkGroupsSection 
        linkGroups={linkGroups || []} 
        noteSlug={noteSlug} 
      />
      
      {/* 未設定リンク一覧（修正） */}
      <PageLinksGrid
        missingLinks={missingLinksFiltered}
        nestedLinks={nestedLinks}
        noteSlug={noteSlug}
      />
    </div>
  );
}
```

---

## テスト要件

### 2.3.1 データ取得のテスト

**ファイル**: `app/_actions/__tests__/getLinkGroupsForPage.test.ts`

```typescript
describe("getLinkGroupsForPage", () => {
  test("linkCount > 1 のグループのみ取得", async () => {
    // Arrange: テストデータ作成
    // Act: getLinkGroupsForPage() 実行
    // Assert: linkCount > 1 のグループのみ返却
  });
  
  test("targetPage が正しく取得される", async () => {
    // page_id が存在するグループで targetPage が取得されること
  });
  
  test("referencingPages から現在のページが除外される", async () => {
    // 現在のページとターゲットページが除外されること
  });
  
  test("referencingPages が更新日時降順でソートされる", async () => {
    // updated_at DESC でソートされること
  });
});
```

### 2.3.2 コンポーネントのテスト

**ファイル**: `app/(protected)/pages/[id]/_components/__tests__/link-groups-section.test.tsx`

```typescript
describe("LinkGroupsSection", () => {
  test("linkGroups が空の場合は何も表示しない", () => {
    // linkGroups = [] で null を返すこと
  });
  
  test("ページ未作成の場合は CreatePageCard を表示", () => {
    // targetPage = null の場合に CreatePageCard が表示されること
  });
  
  test("ページ作成済みの場合は TargetPageCard を表示", () => {
    // targetPage が存在する場合に TargetPageCard が表示されること
  });
  
  test("referencingPages が正しく表示される", () => {
    // GroupedPageCard が referencingPages の数だけ表示されること
  });
});
```

---

## スタイリング

### CSS（globals.css に追加済み）

```css
/* UnifiedLinkMark - Link Group State Styles */

/* exists: ページが存在する → 青色リンク */
.ProseMirror a.unilink[data-group-state="exists"] {
  color: #2563eb; /* blue-600 */
}
.dark .ProseMirror a.unilink[data-group-state="exists"] {
  color: #60a5fa; /* blue-400 */
}

/* grouped: ページ未作成だが複数箇所で参照 → 青色リンク（グループ） */
.ProseMirror a.unilink[data-group-state="grouped"] {
  color: #2563eb; /* blue-600 */
}
.dark .ProseMirror a.unilink[data-group-state="grouped"] {
  color: #60a5fa; /* blue-400 */
}

/* missing: ページ未作成かつ単独参照 → 赤色リンク */
.ProseMirror a.unilink[data-group-state="missing"] {
  color: #dc2626; /* red-600 */
}
.dark .ProseMirror a.unilink[data-group-state="missing"] {
  color: #f87171; /* red-400 */
}
```

---

## 実装順序

### ステップ1: データ取得層
1. `getLinkGroupsForPage` サーバーアクション実装
2. テスト作成・実行

### ステップ2: コンポーネント作成
1. `target-page-card.tsx` 作成
2. `grouped-page-card.tsx` 作成
3. `create-page-card.tsx` 作成
4. `link-groups-section.tsx` 作成
5. 各コンポーネントのテスト作成・実行

### ステップ3: 統合
1. `page-links-grid.tsx` 修正
2. `page.tsx` 統合
3. 動作確認

---

## チェックリスト

### データ取得
- [ ] `getLinkGroupsForPage` 実装完了
- [ ] `linkCount > 1` のグループのみ取得
- [ ] `targetPage` が正しく取得される
- [ ] `referencingPages` から現在のページが除外される
- [ ] `referencingPages` が更新日時降順でソート
- [ ] テスト全パス

### コンポーネント
- [ ] `TargetPageCard` 実装完了
- [ ] `GroupedPageCard` 実装完了
- [ ] `CreatePageCard` 実装完了
- [ ] `LinkGroupsSection` 実装完了
- [ ] `pages-list.tsx` のカードデザインを踏襲
- [ ] レスポンシブ対応
- [ ] テスト全パス

### 統合
- [ ] `page-links-grid.tsx` 修正完了
- [ ] `page.tsx` 統合完了
- [ ] エディター直下に配置
- [ ] 未設定リンクが重複していない
- [ ] 動作確認完了

### UI/UX
- [ ] グループ名がリンクテキストで表示される
- [ ] ページ未作成時に新規作成カードが表示される
- [ ] ページ作成済み時にターゲットページが先頭に表示される
- [ ] グリッドレイアウトが正しく動作する
- [ ] ホバー時のスタイルが適用される

---

## 関連ドキュメント

- **Phase 1 実装**: `docs/05_logs/2025_10/20251027_01_link-group-phase1-complete.md`
- **リンクグループ仕様**: `lib/tiptap-extensions/unified-link-mark/link-group-state.ts`
- **データベース設計**: `database/schema.sql` (link_groups, link_occurrences)
- **サーバーアクション**: `app/_actions/linkGroups.ts`

---

**最終更新**: 2025-10-27
**作成者**: AI (Claude 3.5 Sonnet)
**ステータス**: 計画完了 - 実装開始待ち
