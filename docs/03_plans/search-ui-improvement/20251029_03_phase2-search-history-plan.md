# 検索履歴機能 実装計画 (Phase 2-A)

**実装日**: 2025年10月29日
**対象フェーズ**: Phase 2-A (検索履歴機能)
**関連Issue**: [#43](https://github.com/otomatty/for-all-learners/issues/43)
**前フェーズ**: Phase 1-B (フィルター・ソート・ページネーション) - 完了

---

## 📋 概要

検索バーに検索履歴機能を追加し、ユーザーが過去の検索を簡単に再実行できるようにします。

### 目的

- ✅ 過去の検索クエリをLocalStorageに保存
- ✅ 検索バーフォーカス時に最近の検索を表示
- ✅ 履歴から1クリックで再検索
- ✅ 履歴の削除・クリア機能
- ✅ プライバシー配慮（最大10件まで保存）

---

## 🎯 実装内容

### 1. データ構造

#### SearchHistory 型定義

```typescript
// types/search.ts (新規作成)

export interface SearchHistoryItem {
  id: string;                // UUID
  query: string;             // 検索クエリ
  timestamp: number;         // Unix timestamp
  resultsCount?: number;     // 検索結果数（オプション）
  filters?: {               // 使用したフィルター（オプション）
    type?: "all" | "card" | "page";
    sort?: "relevance" | "updated" | "created";
  };
}

export interface SearchHistoryStore {
  items: SearchHistoryItem[];
  maxItems: number;
}
```

### 2. LocalStorage管理

#### SearchHistoryManager クラス

```typescript
// lib/search/searchHistoryManager.ts (新規作成)

import type { SearchHistoryItem, SearchHistoryStore } from "@/types/search";

const STORAGE_KEY = "for-all-learners:search-history";
const MAX_ITEMS = 10;

export class SearchHistoryManager {
  /**
   * 検索履歴を取得
   */
  static getHistory(): SearchHistoryItem[] {
    if (typeof window === "undefined") return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const data: SearchHistoryStore = JSON.parse(stored);
      return data.items || [];
    } catch (error) {
      console.error("Failed to load search history:", error);
      return [];
    }
  }

  /**
   * 検索履歴に追加
   */
  static addToHistory(item: Omit<SearchHistoryItem, "id" | "timestamp">): void {
    if (typeof window === "undefined") return;
    
    try {
      const history = this.getHistory();
      
      // 同じクエリが既に存在する場合は削除
      const filtered = history.filter((h) => h.query !== item.query);
      
      // 新しいアイテムを先頭に追加
      const newItem: SearchHistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        ...item,
      };
      
      const newHistory = [newItem, ...filtered].slice(0, MAX_ITEMS);
      
      const store: SearchHistoryStore = {
        items: newHistory,
        maxItems: MAX_ITEMS,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  }

  /**
   * 特定の履歴を削除
   */
  static removeFromHistory(id: string): void {
    if (typeof window === "undefined") return;
    
    try {
      const history = this.getHistory();
      const filtered = history.filter((item) => item.id !== id);
      
      const store: SearchHistoryStore = {
        items: filtered,
        maxItems: MAX_ITEMS,
      };
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch (error) {
      console.error("Failed to remove search history:", error);
    }
  }

  /**
   * 履歴を全てクリア
   */
  static clearHistory(): void {
    if (typeof window === "undefined") return;
    
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error("Failed to clear search history:", error);
    }
  }
}
```

### 3. カスタムフック

#### useSearchHistory

```typescript
// hooks/use-search-history.ts (新規作成)

import { useState, useEffect, useCallback } from "react";
import { SearchHistoryManager } from "@/lib/search/searchHistoryManager";
import type { SearchHistoryItem } from "@/types/search";

export function useSearchHistory() {
  const [history, setHistory] = useState<SearchHistoryItem[]>([]);

  // 初期ロード
  useEffect(() => {
    setHistory(SearchHistoryManager.getHistory());
  }, []);

  // 履歴に追加
  const addToHistory = useCallback(
    (item: Omit<SearchHistoryItem, "id" | "timestamp">) => {
      SearchHistoryManager.addToHistory(item);
      setHistory(SearchHistoryManager.getHistory());
    },
    [],
  );

  // 履歴から削除
  const removeFromHistory = useCallback((id: string) => {
    SearchHistoryManager.removeFromHistory(id);
    setHistory(SearchHistoryManager.getHistory());
  }, []);

  // 履歴をクリア
  const clearHistory = useCallback(() => {
    SearchHistoryManager.clearHistory();
    setHistory([]);
  }, []);

  return {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  };
}
```

### 4. SearchHistoryDropdown コンポーネント

```tsx
// components/notes/SearchHistoryDropdown.tsx (新規作成)

"use client";

import { useRouter } from "next/navigation";
import { Clock, X, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";
import type { SearchHistoryItem } from "@/types/search";

interface SearchHistoryDropdownProps {
  history: SearchHistoryItem[];
  onSelectHistory: (item: SearchHistoryItem) => void;
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
  isVisible: boolean;
}

export function SearchHistoryDropdown({
  history,
  onSelectHistory,
  onRemoveHistory,
  onClearHistory,
  isVisible,
}: SearchHistoryDropdownProps) {
  const router = useRouter();

  if (!isVisible || history.length === 0) {
    return null;
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>最近の検索</span>
        </div>
        <button
          type="button"
          onClick={onClearHistory}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          全て削除
        </button>
      </div>

      {/* 履歴リスト */}
      <ul className="py-2">
        {history.map((item) => (
          <li
            key={item.id}
            className="group hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <button
              type="button"
              onClick={() => onSelectHistory(item)}
              className="w-full px-4 py-2 text-left flex items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {item.query}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                  <span>
                    {formatDistanceToNow(item.timestamp, {
                      addSuffix: true,
                      locale: ja,
                    })}
                  </span>
                  {item.resultsCount !== undefined && (
                    <span>• {item.resultsCount}件</span>
                  )}
                  {item.filters?.type && item.filters.type !== "all" && (
                    <span>
                      •{" "}
                      {item.filters.type === "card" ? "カード" : "ページ"}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveHistory(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
              >
                <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### 5. SearchBar の更新

```tsx
// components/notes/SearchBar.tsx (更新)

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchHistoryDropdown } from "./SearchHistoryDropdown";
import { useSearchHistory } from "@/hooks/use-search-history";
import type { SearchHistoryItem } from "@/types/search";

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    history,
    addToHistory,
    removeFromHistory,
    clearHistory,
  } = useSearchHistory();

  // フォーカス外クリックで履歴を閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 検索実行
  const handleSearch = useCallback(
    (searchQuery: string) => {
      if (!searchQuery.trim()) return;

      // 履歴に追加
      addToHistory({
        query: searchQuery,
      });

      // 検索ページに遷移
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
      setIsFocused(false);
    },
    [router, addToHistory],
  );

  // Enterキーで検索
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch(query);
    }
  };

  // 履歴から選択
  const handleSelectHistory = useCallback(
    (item: SearchHistoryItem) => {
      setQuery(item.query);
      handleSearch(item.query);
    },
    [handleSearch],
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="カードやページを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          className="pl-10 pr-4"
        />
      </div>

      {/* 検索履歴ドロップダウン */}
      <SearchHistoryDropdown
        history={history}
        onSelectHistory={handleSelectHistory}
        onRemoveHistory={removeFromHistory}
        onClearHistory={clearHistory}
        isVisible={isFocused && query.length === 0}
      />
    </div>
  );
}
```

### 6. 検索結果ページでの履歴保存

```tsx
// app/(protected)/search/page.tsx (更新部分)

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { SearchHistoryManager } from "@/lib/search/searchHistoryManager";

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "all";
  const sort = searchParams.get("sort") || "relevance";
  
  // 検索結果の取得...
  const totalResults = filteredRows.length;

  // 検索実行時に履歴を更新（結果数を含む）
  useEffect(() => {
    if (query) {
      SearchHistoryManager.addToHistory({
        query,
        resultsCount: totalResults,
        filters: {
          type: type as "all" | "card" | "page",
          sort: sort as "relevance" | "updated" | "created",
        },
      });
    }
  }, [query, totalResults, type, sort]);

  // ...残りのコード
}
```

---

## 📁 ファイル構成

### 新規作成（6ファイル）

```
types/
  └── search.ts                           # 型定義

lib/
  └── search/
      └── searchHistoryManager.ts         # LocalStorage管理

hooks/
  └── use-search-history.ts               # カスタムフック

components/
  └── notes/
      └── SearchHistoryDropdown.tsx       # 履歴ドロップダウン

docs/
  └── 03_plans/
      └── search-ui-improvement/
          └── 20251029_03_phase2-search-history-plan.md  # この計画書
```

### 更新（2ファイル）

```
components/
  └── notes/
      └── SearchBar.tsx                   # 履歴機能統合

app/
  └── (protected)/
      └── search/
          └── page.tsx                    # 履歴保存ロジック追加
```

---

## 🎨 UI/UX フロー

### 1. 検索バーフォーカス時

```
┌────────────────────────────────────────┐
│ 🔍  [カードやページを検索...]          │
└────────────────────────────────────────┘
    ↓
┌────────────────────────────────────────┐
│ 🔍  [                           ]     │ ← フォーカス
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 🕐 最近の検索          [全て削除]    │
├────────────────────────────────────────┤
│ React hooks                            │
│ 2分前 • 15件 • カード              [×]│
├────────────────────────────────────────┤
│ Next.js routing                        │
│ 1時間前 • 8件                      [×]│
├────────────────────────────────────────┤
│ TypeScript generics                    │
│ 3時間前 • 23件 • ページ            [×]│
└────────────────────────────────────────┘
```

### 2. 入力開始時

```
┌────────────────────────────────────────┐
│ 🔍  [Re                          ]    │
└────────────────────────────────────────┘
    ↓ 履歴ドロップダウンが閉じる
    ↓ サジェスト機能が動作（既存）
```

### 3. 履歴から選択

```
┌────────────────────────────────────────┐
│ React hooks                        [×] │ ← クリック
└────────────────────────────────────────┘
    ↓
    検索実行（/search?q=React+hooks）
    履歴の最上位に移動
```

---

## ✅ 実装チェックリスト

### Phase 2-A-1: 基盤実装

- [ ] `types/search.ts` を作成
- [ ] `lib/search/searchHistoryManager.ts` を作成
- [ ] ユニットテスト作成（LocalStorage操作）
- [ ] `hooks/use-search-history.ts` を作成

### Phase 2-A-2: UI実装

- [ ] `SearchHistoryDropdown.tsx` を作成
- [ ] レスポンシブデザイン対応
- [ ] ダークモード対応
- [ ] アクセシビリティ確認

### Phase 2-A-3: 統合

- [ ] `SearchBar.tsx` に履歴機能を統合
- [ ] `app/(protected)/search/page.tsx` を更新
- [ ] フォーカス外クリックで閉じる処理
- [ ] Escキーで閉じる処理

### Phase 2-A-4: テスト・文書化

- [ ] 手動テスト（全シナリオ）
- [ ] E2Eテスト作成（オプション）
- [ ] 作業ログ作成
- [ ] ドキュメント更新

---

## 🧪 テストシナリオ

### 基本機能

1. **履歴の保存**
   - [ ] 検索実行時に履歴が保存される
   - [ ] 同じクエリは重複せず最上位に移動
   - [ ] 最大10件まで保存される
   - [ ] 11件目で最古が削除される

2. **履歴の表示**
   - [ ] 検索バーフォーカス時に表示される
   - [ ] 入力開始時に非表示になる
   - [ ] クエリ・時間・結果数が表示される
   - [ ] フィルター情報が表示される

3. **履歴の操作**
   - [ ] 履歴クリックで再検索される
   - [ ] [×]ボタンで個別削除できる
   - [ ] 「全て削除」で全削除できる
   - [ ] フォーカス外クリックで閉じる

### エッジケース

4. **LocalStorage**
   - [ ] LocalStorage無効時にエラーが出ない
   - [ ] データ破損時に正常動作する
   - [ ] 容量制限時に古いデータが削除される

5. **プライバシー**
   - [ ] シークレットモードで動作する
   - [ ] ユーザーが明示的に削除できる
   - [ ] セッション間で永続化される

---

## 📊 期待される効果

### UX改善

- ✅ **検索効率の向上**: 過去の検索を1クリックで再実行
- ✅ **学習支援**: よく検索する内容の可視化
- ✅ **入力削減**: 長いクエリを再入力する必要がない

### 技術的メリット

- ✅ **軽量**: LocalStorageのみで実装
- ✅ **高速**: サーバーリクエスト不要
- ✅ **プライバシー**: クライアント側のみで完結

---

## 🔄 次のステップ (Phase 2-B)

Phase 2-A完了後、Phase 2-Bに進みます：

1. **リアルタイムサジェストの高度化**
   - 検索結果プレビュー
   - ハイライト表示の改善
   - キーボードショートカット

2. **タグフィルター**
   - タグ選択UI
   - 複数タグのAND/OR検索

---

## 📚 参考資料

### 技術スタック

- **LocalStorage API**: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- **date-fns**: https://date-fns.org/
- **Next.js useRouter**: https://nextjs.org/docs/app/api-reference/functions/use-router

### UI参考

- Google検索の履歴機能
- GitHub検索の履歴機能
- VSCodeのコマンドパレット履歴

---

**作成者**: AI (GitHub Copilot)
**作成日**: 2025-10-29
**ステータス**: Draft
