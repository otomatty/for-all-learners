# 検索機能UI改善 Phase 1-B 実装計画

**作成日**: 2025年10月29日
**対象フェーズ**: Phase 1-B (フィルター・ソート・ページネーション)
**前提条件**: Phase 1-A 完了 (PR #52 マージ済み)

---

## 📋 概要

Phase 1-Bでは、検索結果ページにフィルター・ソート・ページネーション機能を追加します。

### 実装目標

1. **フィルター機能**: タイプ別（すべて/カード/ページ）で結果を絞り込み
2. **ソート機能**: 関連度/更新日/作成日で並び替え
3. **ページネーション**: 20件ずつ表示してパフォーマンス改善

---

## 🎯 実装内容

### 1. フィルター機能

#### 1.1 SearchFilters コンポーネント

**ファイル**: `components/notes/SearchFilters.tsx`

```tsx
interface SearchFiltersProps {
  currentType: "all" | "card" | "page";
  currentSort: "relevance" | "updated" | "created";
  onTypeChange: (type: "all" | "card" | "page") => void;
  onSortChange: (sort: "relevance" | "updated" | "created") => void;
}

export function SearchFilters({
  currentType,
  currentSort,
  onTypeChange,
  onSortChange,
}: SearchFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <TypeFilter value={currentType} onChange={onTypeChange} />
      <SortSelect value={currentSort} onChange={onSortChange} />
    </div>
  );
}
```

#### 1.2 TypeFilter コンポーネント

**ファイル**: `components/notes/TypeFilter.tsx`

```tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TypeFilterProps {
  value: "all" | "card" | "page";
  onChange: (value: "all" | "card" | "page") => void;
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  return (
    <Tabs value={value} onValueChange={onChange}>
      <TabsList>
        <TabsTrigger value="all">すべて</TabsTrigger>
        <TabsTrigger value="card">カード</TabsTrigger>
        <TabsTrigger value="page">ページ</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
```

#### 1.3 SortSelect コンポーネント

**ファイル**: `components/notes/SortSelect.tsx`

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SortSelectProps {
  value: "relevance" | "updated" | "created";
  onChange: (value: "relevance" | "updated" | "created") => void;
}

export function SortSelect({ value, onChange }: SortSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="relevance">関連度順</SelectItem>
        <SelectItem value="updated">更新日順</SelectItem>
        <SelectItem value="created">作成日順</SelectItem>
      </SelectContent>
    </Select>
  );
}
```

---

### 2. ページネーション機能

#### 2.1 SearchPagination コンポーネント

**ファイル**: `components/notes/SearchPagination.tsx`

```tsx
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface SearchPaginationProps {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}

export function SearchPagination({
  currentPage,
  totalPages,
  baseUrl,
}: SearchPaginationProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            href={`${baseUrl}&page=${currentPage - 1}`}
            aria-disabled={currentPage <= 1}
          />
        </PaginationItem>
        
        {/* ページ番号表示ロジック */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((page) => {
            // 最初の3ページ、最後の3ページ、現在ページの前後2ページを表示
            return (
              page <= 3 ||
              page > totalPages - 3 ||
              Math.abs(page - currentPage) <= 2
            );
          })
          .map((page, index, array) => {
            // 連続していない場合は省略記号を挿入
            if (index > 0 && page - array[index - 1] > 1) {
              return (
                <>
                  <PaginationItem key={`ellipsis-${page}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                  <PaginationItem key={page}>
                    <PaginationLink
                      href={`${baseUrl}&page=${page}`}
                      isActive={page === currentPage}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                </>
              );
            }
            
            return (
              <PaginationItem key={page}>
                <PaginationLink
                  href={`${baseUrl}&page=${page}`}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            );
          })}
        
        <PaginationItem>
          <PaginationNext
            href={`${baseUrl}&page=${currentPage + 1}`}
            aria-disabled={currentPage >= totalPages}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
```

---

### 3. 検索ページの更新

#### 3.1 URLパラメータ管理

**ファイル**: `app/(protected)/search/page.tsx`

```tsx
interface SearchPageProps {
  searchParams: {
    q?: string;
    type?: "all" | "card" | "page";
    sort?: "relevance" | "updated" | "created";
    page?: string;
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams.q || "";
  const type = searchParams.type || "all";
  const sort = searchParams.sort || "relevance";
  const page = Number(searchParams.page) || 1;
  const perPage = 20;

  // データ取得
  const { results, total } = await getSearchResults({
    query,
    type,
    sort,
    page,
    perPage,
  });

  const totalPages = Math.ceil(total / perPage);

  return (
    <Container>
      <div className="space-y-6">
        {/* ヘッダー */}
        <div>
          <h1>検索結果</h1>
          <p>「{query}」の検索結果: {total}件</p>
        </div>

        {/* フィルター・ソート */}
        <SearchFilters
          currentType={type}
          currentSort={sort}
          onTypeChange={(newType) => {
            // Client Component で URLSearchParams を更新
          }}
          onSortChange={(newSort) => {
            // Client Component で URLSearchParams を更新
          }}
        />

        {/* 検索結果 */}
        <div className="space-y-4">
          {results.map((result) => (
            <SearchResultItem key={result.id} {...result} />
          ))}
        </div>

        {/* ページネーション */}
        {totalPages > 1 && (
          <SearchPagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl={`/search?q=${query}&type=${type}&sort=${sort}`}
          />
        )}
      </div>
    </Container>
  );
}
```

#### 3.2 データ取得関数の拡張

**ファイル**: `app/(protected)/search/page.tsx`

```tsx
async function getSearchResults({
  query,
  type,
  sort,
  page,
  perPage,
}: {
  query: string;
  type: "all" | "card" | "page";
  sort: "relevance" | "updated" | "created";
  page: number;
  perPage: number;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return { results: [], total: 0 };
  }

  // タイプフィルター
  let typeFilter = "";
  if (type === "card") {
    typeFilter = " AND type = 'card'";
  } else if (type === "page") {
    typeFilter = " AND type = 'page'";
  }

  // ソート順
  let orderBy = "";
  switch (sort) {
    case "updated":
      orderBy = "ORDER BY updated_at DESC NULLS LAST";
      break;
    case "created":
      orderBy = "ORDER BY created_at DESC";
      break;
    case "relevance":
    default:
      orderBy = "ORDER BY rank DESC";
      break;
  }

  // 検索実行（ページネーション付き）
  const offset = (page - 1) * perPage;
  
  const { data: results, error } = await supabase.rpc("search_suggestions", {
    search_query: query,
    user_id: user.id,
  });

  if (error || !results) {
    return { results: [], total: 0 };
  }

  // フィルター・ソート・ページネーション適用
  let filtered = results;
  
  if (type !== "all") {
    filtered = filtered.filter((r) => r.type === type);
  }

  // ソート適用
  if (sort === "updated") {
    filtered.sort((a, b) => {
      const aDate = a.updated_at ? new Date(a.updated_at) : new Date(0);
      const bDate = b.updated_at ? new Date(b.updated_at) : new Date(0);
      return bDate.getTime() - aDate.getTime();
    });
  } else if (sort === "created") {
    filtered.sort((a, b) => {
      const aDate = new Date(a.created_at || 0);
      const bDate = new Date(b.created_at || 0);
      return bDate.getTime() - aDate.getTime();
    });
  }
  // relevance はデフォルトで rank DESC

  const total = filtered.length;
  const paginatedResults = filtered.slice(offset, offset + perPage);

  return { results: paginatedResults, total };
}
```

---

### 4. Client Component の作成

**ファイル**: `components/notes/SearchFiltersClient.tsx`

```tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilters } from "./SearchFilters";

interface SearchFiltersClientProps {
  currentType: "all" | "card" | "page";
  currentSort: "relevance" | "updated" | "created";
}

export function SearchFiltersClient({
  currentType,
  currentSort,
}: SearchFiltersClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (newType: "all" | "card" | "page") => {
    const params = new URLSearchParams(searchParams);
    params.set("type", newType);
    params.set("page", "1"); // ページをリセット
    router.push(`/search?${params.toString()}`);
  };

  const handleSortChange = (newSort: "relevance" | "updated" | "created") => {
    const params = new URLSearchParams(searchParams);
    params.set("sort", newSort);
    params.set("page", "1"); // ページをリセット
    router.push(`/search?${params.toString()}`);
  };

  return (
    <SearchFilters
      currentType={currentType}
      currentSort={currentSort}
      onTypeChange={handleTypeChange}
      onSortChange={handleSortChange}
    />
  );
}
```

---

## 📝 実装順序

### ステップ1: フィルター機能 (1-2時間)

1. `TypeFilter.tsx` 作成
2. `SortSelect.tsx` 作成
3. `SearchFilters.tsx` 作成
4. `SearchFiltersClient.tsx` 作成
5. `page.tsx` に統合

### ステップ2: ページネーション機能 (1-2時間)

1. `SearchPagination.tsx` 作成
2. データ取得関数にページネーション追加
3. `page.tsx` に統合

### ステップ3: データ取得ロジック拡張 (1時間)

1. `getSearchResults` 関数の拡張
2. タイプフィルターの実装
3. ソート機能の実装
4. ページネーションロジックの実装

### ステップ4: テスト (30分)

1. フィルター動作確認
2. ソート動作確認
3. ページネーション動作確認
4. URLパラメータ同期確認

---

## ✅ チェックリスト

### 実装前
- [x] Phase 1-A 完了確認
- [x] 実装計画レビュー
- [x] 必要なコンポーネント確認

### 実装中
- [ ] TypeFilter コンポーネント作成
- [ ] SortSelect コンポーネント作成
- [ ] SearchFilters コンポーネント作成
- [ ] SearchFiltersClient コンポーネント作成
- [ ] SearchPagination コンポーネント作成
- [ ] page.tsx 更新
- [ ] データ取得ロジック拡張

### 実装後
- [ ] すべてのテスト通過
- [ ] Lint チェック通過
- [ ] 動作確認（手動テスト）
- [ ] ドキュメント更新
- [ ] PR 作成

---

## 🎯 期待される成果

### ユーザー体験
- ✅ タイプ別にフィルタリング可能
- ✅ 任意の順序で並び替え可能
- ✅ 大量の検索結果もスムーズに表示
- ✅ URLで状態を共有可能

### 技術的改善
- ✅ パフォーマンス改善（20件ずつ表示）
- ✅ URLパラメータで状態管理
- ✅ Server Component + Client Component 分離
- ✅ 型安全性を確保

---

## 🔗 関連ドキュメント

- [Issue #43](https://github.com/otomatty/for-all-learners/issues/43)
- [Phase 1-A 作業ログ](../../05_logs/2025_10/20251029_01_search-ui-improvement-phase1a.md)
- [フロントエンド設計原則](../../../FRONTEND_DESIGN_PRINCIPLES.md)

---

**最終更新**: 2025-10-29 20:10 JST
