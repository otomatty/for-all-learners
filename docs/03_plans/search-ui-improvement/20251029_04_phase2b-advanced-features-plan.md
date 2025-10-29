# 検索機能 Phase 2-B 実装計画 (高度な機能)

**実装日**: 2025年10月29日
**対象フェーズ**: Phase 2-B (リアルタイムサジェスト高度化・タグフィルター・日付フィルター)
**関連Issue**: [#43](https://github.com/otomatty/for-all-learners/issues/43)
**前フェーズ**: Phase 2-A (検索履歴機能) - 完了

---

## 📋 概要

Phase 2-Bでは、以下の3つの高度な検索機能を実装します：

1. **リアルタイムサジェストの高度化**
   - キーボードショートカット（Cmd+K / Ctrl+K）
   - 検索結果プレビュー
   - ハイライト表示の改善

2. **タグフィルター**
   - タグ選択UI
   - 複数タグのAND/OR検索
   - タグクラウド表示

3. **日付範囲フィルター**
   - DatePicker コンポーネント
   - 期間指定検索
   - プリセット（今日/今週/今月/今年）

---

## 🎯 Phase 2-B-1: キーボードショートカット

### 目的

- **Cmd+K** (Mac) / **Ctrl+K** (Windows) で検索バーにフォーカス
- モーダル型の検索UIを実装
- Escキーで閉じる

### 実装内容

#### 1. useKeyboardShortcut フック

```typescript
// hooks/use-keyboard-shortcut.ts (新規作成)

import { useEffect } from "react";

interface UseKeyboardShortcutOptions {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  onTrigger: () => void;
}

/**
 * キーボードショートカットを登録するカスタムフック
 *
 * @example
 * useKeyboardShortcut({
 *   key: "k",
 *   metaKey: true,
 *   ctrlKey: true,
 *   onTrigger: () => setIsOpen(true),
 * });
 */
export function useKeyboardShortcut({
  key,
  metaKey = false,
  ctrlKey = false,
  shiftKey = false,
  onTrigger,
}: UseKeyboardShortcutOptions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.key.toLowerCase() === key.toLowerCase() &&
        (metaKey ? e.metaKey : true) &&
        (ctrlKey ? e.ctrlKey : true) &&
        (shiftKey ? e.shiftKey : true)
      ) {
        e.preventDefault();
        onTrigger();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, metaKey, ctrlKey, shiftKey, onTrigger]);
}
```

#### 2. SearchModal コンポーネント

```typescript
// components/notes/SearchModal.tsx (新規作成)

"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { SearchBar } from "./SearchBar";
import { useKeyboardShortcut } from "@/hooks/use-keyboard-shortcut";
import { useState } from "react";

/**
 * モーダル型検索コンポーネント
 *
 * Cmd+K / Ctrl+K で開閉できるグローバル検索UI
 */
export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Cmd+K / Ctrl+K でモーダルを開く
  useKeyboardShortcut({
    key: "k",
    metaKey: true,
    ctrlKey: true,
    onTrigger: () => setIsOpen(true),
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">検索</h2>
            <kbd className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 rounded">
              Esc
            </kbd>
          </div>
          <SearchBar onNavigate={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

#### 3. グローバルナビゲーションに追加

```tsx
// components/layouts/main-nav.tsx (更新)

import { SearchModal } from "@/components/notes/SearchModal";

export function MainNav() {
  return (
    <nav>
      {/* 既存のナビゲーション */}
      
      {/* 検索モーダル */}
      <SearchModal />
      
      {/* 検索ショートカット表示 */}
      <button
        onClick={() => {/* SearchModal を開く */}}
        className="flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        <span>検索</span>
        <kbd className="text-xs">⌘K</kbd>
      </button>
    </nav>
  );
}
```

---

## 🎯 Phase 2-B-2: タグフィルター

### 目的

- カード・ページに関連付けられたタグで絞り込み
- 複数タグ選択（AND検索）
- タグクラウド表示

### データ構造

#### タグテーブル（既存確認）

```sql
-- tags テーブルが存在するか確認
SELECT * FROM tags LIMIT 1;

-- card_tags / page_tags の関連テーブル
SELECT * FROM card_tags LIMIT 1;
SELECT * FROM page_tags LIMIT 1;
```

### 実装内容

#### 1. タグ取得API

```typescript
// app/api/tags/route.ts (新規作成)

import { createAdminClient } from "@/lib/supabase/adminClient";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * 全タグを取得（使用回数付き）
 */
export async function GET() {
  const supabase = createAdminClient();

  // タグと使用回数を取得
  const { data, error } = await supabase
    .from("tags")
    .select("id, name, (card_tags(count), page_tags(count))")
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

#### 2. TagFilter コンポーネント

```tsx
// components/notes/TagFilter.tsx (新規作成)

"use client";

import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState, useEffect } from "react";

interface Tag {
  id: string;
  name: string;
  count: number;
}

interface TagFilterProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

/**
 * タグフィルターコンポーネント
 */
export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch("/api/tags")
      .then((res) => res.json())
      .then((data) => setTags(data));
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagsChange(selectedTags.filter((id) => id !== tagId));
    } else {
      onTagsChange([...selectedTags, tagId]);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">タグで絞り込み</h3>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge
            key={tag.id}
            variant={selectedTags.includes(tag.id) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleTag(tag.id)}
          >
            {tag.name}
            <span className="ml-1 text-xs opacity-70">({tag.count})</span>
            {selectedTags.includes(tag.id) && (
              <X className="ml-1 w-3 h-3" />
            )}
          </Badge>
        ))}
      </div>
    </div>
  );
}
```

#### 3. 検索ページにタグフィルター追加

```tsx
// app/(protected)/search/page.tsx (更新)

import { TagFilter } from "@/components/notes/TagFilter";

export default async function SearchPage({ searchParams }) {
  const { q, type, sort, page, tags } = await searchParams;
  const selectedTags = tags ? tags.split(",") : [];

  // RPC 呼び出しにタグフィルターを追加
  const { data: rpcData } = await supabase.rpc("search_suggestions_with_tags", {
    p_query: query,
    p_tags: selectedTags,
  });

  return (
    <Container>
      {/* 既存のフィルター */}
      <SearchFiltersClient ... />
      
      {/* タグフィルター */}
      <TagFilterClient selectedTags={selectedTags} />
      
      {/* 検索結果 */}
    </Container>
  );
}
```

---

## 🎯 Phase 2-B-3: 日付範囲フィルター

### 目的

- 作成日・更新日で絞り込み
- DatePicker による期間選択
- プリセット（今日/今週/今月/今年）

### 実装内容

#### 1. DateRangeFilter コンポーネント

```tsx
// components/notes/DateRangeFilter.tsx (新規作成)

"use client";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

interface DateRangeFilterProps {
  startDate?: Date;
  endDate?: Date;
  onDateChange: (start?: Date, end?: Date) => void;
}

/**
 * 日付範囲フィルターコンポーネント
 */
export function DateRangeFilter({
  startDate,
  endDate,
  onDateChange,
}: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const presets = [
    {
      label: "今日",
      getValue: () => {
        const today = new Date();
        return { start: today, end: today };
      },
    },
    {
      label: "今週",
      getValue: () => {
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return { start, end: today };
      },
    },
    {
      label: "今月",
      getValue: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start, end: today };
      },
    },
    {
      label: "今年",
      getValue: () => {
        const today = new Date();
        const start = new Date(today.getFullYear(), 0, 1);
        return { start, end: today };
      },
    },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">期間で絞り込み</h3>
      
      {/* プリセットボタン */}
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <Button
            key={preset.label}
            variant="outline"
            size="sm"
            onClick={() => {
              const { start, end } = preset.getValue();
              onDateChange(start, end);
            }}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      {/* カスタム日付選択 */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start">
            <CalendarIcon className="mr-2 w-4 h-4" />
            {startDate && endDate ? (
              <>
                {format(startDate, "yyyy/MM/dd", { locale: ja })} -{" "}
                {format(endDate, "yyyy/MM/dd", { locale: ja })}
              </>
            ) : (
              "期間を選択"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="range"
            selected={{ from: startDate, to: endDate }}
            onSelect={(range) => {
              onDateChange(range?.from, range?.to);
            }}
            locale={ja}
          />
        </PopoverContent>
      </Popover>

      {/* クリアボタン */}
      {(startDate || endDate) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDateChange(undefined, undefined)}
        >
          クリア
        </Button>
      )}
    </div>
  );
}
```

#### 2. 検索ページに日付フィルター追加

```tsx
// app/(protected)/search/page.tsx (更新)

export default async function SearchPage({ searchParams }) {
  const { q, type, sort, page, tags, startDate, endDate } = await searchParams;

  // 日付フィルター適用
  let filteredRows = rows;
  if (startDate || endDate) {
    filteredRows = rows.filter((r) => {
      const date = r.type === "card"
        ? cardUpdates.get(r.id)
        : pageUpdates.get(r.id);
      
      if (!date) return false;
      
      const itemDate = new Date(date);
      if (startDate && itemDate < new Date(startDate)) return false;
      if (endDate && itemDate > new Date(endDate)) return false;
      
      return true;
    });
  }

  return (
    <Container>
      {/* 既存のフィルター */}
      
      {/* 日付範囲フィルター */}
      <DateRangeFilterClient
        startDate={startDate ? new Date(startDate) : undefined}
        endDate={endDate ? new Date(endDate) : undefined}
      />
      
      {/* 検索結果 */}
    </Container>
  );
}
```

---

## 📁 ファイル構成

### Phase 2-B-1: キーボードショートカット

```
hooks/
  └── use-keyboard-shortcut.ts         # ショートカットフック

components/
  └── notes/
      └── SearchModal.tsx               # モーダル検索UI

components/
  └── layouts/
      └── main-nav.tsx                  # ナビゲーション更新
```

### Phase 2-B-2: タグフィルター

```
app/
  └── api/
      └── tags/
          └── route.ts                  # タグ取得API

components/
  └── notes/
      ├── TagFilter.tsx                 # タグフィルターUI
      └── TagFilterClient.tsx           # Client wrapper
```

### Phase 2-B-3: 日付範囲フィルター

```
components/
  └── notes/
      ├── DateRangeFilter.tsx           # 日付フィルターUI
      └── DateRangeFilterClient.tsx     # Client wrapper
```

---

## 📊 実装優先順位

### 🔴 優先度: 高（Phase 2-B-1）

1. **キーボードショートカット**
   - useKeyboardShortcut フック
   - SearchModal コンポーネント
   - 実装時間: 2-3時間

### 🟡 優先度: 中（Phase 2-B-2）

2. **タグフィルター**
   - タグ取得API
   - TagFilter コンポーネント
   - 実装時間: 3-4時間

### 🟢 優先度: 低（Phase 2-B-3）

3. **日付範囲フィルター**
   - DateRangeFilter コンポーネント
   - 実装時間: 2-3時間

---

## ✅ 実装チェックリスト

### Phase 2-B-1: キーボードショートカット

- [ ] `hooks/use-keyboard-shortcut.ts` 作成
- [ ] `components/notes/SearchModal.tsx` 作成
- [ ] `components/layouts/main-nav.tsx` 更新
- [ ] Cmd+K / Ctrl+K で動作確認
- [ ] Escキーで閉じる動作確認

### Phase 2-B-2: タグフィルター

- [ ] タグテーブル確認
- [ ] `app/api/tags/route.ts` 作成
- [ ] `components/notes/TagFilter.tsx` 作成
- [ ] `components/notes/TagFilterClient.tsx` 作成
- [ ] 検索ページ更新
- [ ] タグ選択で絞り込み動作確認

### Phase 2-B-3: 日付範囲フィルター

- [ ] `components/notes/DateRangeFilter.tsx` 作成
- [ ] `components/notes/DateRangeFilterClient.tsx` 作成
- [ ] 検索ページ更新
- [ ] プリセット動作確認
- [ ] カスタム日付選択動作確認

---

## 🧪 テストシナリオ

### キーボードショートカット

1. **基本動作**
   - [ ] Cmd+K (Mac) でモーダルが開く
   - [ ] Ctrl+K (Windows) でモーダルが開く
   - [ ] Escキーでモーダルが閉じる
   - [ ] 検索実行でモーダルが閉じる

2. **競合確認**
   - [ ] ブラウザのデフォルトショートカットと競合しない
   - [ ] input フォーカス時も動作する

### タグフィルター

3. **基本動作**
   - [ ] タグ一覧が表示される
   - [ ] タグクリックで選択/解除
   - [ ] 複数タグ選択可能
   - [ ] 選択したタグで絞り込まれる

4. **URL状態管理**
   - [ ] 選択タグがURLに反映される
   - [ ] ブラウザバックで状態復元

### 日付範囲フィルター

5. **プリセット**
   - [ ] 「今日」で当日のみ表示
   - [ ] 「今週」で今週分表示
   - [ ] 「今月」で今月分表示
   - [ ] 「今年」で今年分表示

6. **カスタム選択**
   - [ ] カレンダーで期間選択
   - [ ] 選択範囲で絞り込まれる
   - [ ] クリアボタンで解除

---

## 📈 期待される効果

### キーボードショートカット

- ✅ **検索アクセスの高速化**: どこからでも Cmd+K で検索
- ✅ **パワーユーザー対応**: キーボードのみで操作可能
- ✅ **モダンなUX**: Notion、GitHub等と同様の操作感

### タグフィルター

- ✅ **絞り込み精度向上**: 関連タグで素早く絞り込み
- ✅ **タグ管理の可視化**: 使用頻度の把握
- ✅ **複数条件検索**: AND検索で詳細絞り込み

### 日付範囲フィルター

- ✅ **時系列検索**: 特定期間の情報検索
- ✅ **学習履歴管理**: いつ学習したか振り返り
- ✅ **プリセット利便性**: ワンクリックで期間指定

---

## 🔄 実装順序

### ステップ1: キーボードショートカット（優先）

1. useKeyboardShortcut フック作成
2. SearchModal 実装
3. MainNav に統合
4. 動作確認

### ステップ2: タグフィルター

1. タグテーブル確認
2. タグ取得API実装
3. TagFilter コンポーネント作成
4. 検索ページ統合
5. 動作確認

### ステップ3: 日付範囲フィルター

1. DateRangeFilter コンポーネント作成
2. 検索ページ統合
3. プリセット実装
4. 動作確認

---

**作成者**: AI (GitHub Copilot)
**作成日**: 2025-10-29
**ステータス**: Draft
