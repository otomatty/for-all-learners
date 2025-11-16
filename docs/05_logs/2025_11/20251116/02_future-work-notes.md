# Phase 1.1 完了後の今後の作業内容

**日付**: 2025-11-16  
**関連**: Phase 1.1 Notes移行完了

---

## カスタムフックの配置規則

### 配置場所

**ルートの `hooks/` ディレクトリ直下に配置**

```
hooks/
├── notes/          # Notes関連のフック（完了）
│   ├── index.ts
│   ├── useNotes.ts
│   └── ...
├── decks/          # Decks関連のフック（今後）
├── pages/          # Pages関連のフック（今後）
├── cards/          # Cards関連のフック（今後）
└── ...
```

### インポートパス

```typescript
// ✅ 正しい
import { useNotes } from "@/hooks/notes/useNotes";
import { useCreateNote } from "@/hooks/notes/useCreateNote";

// ❌ 間違い（旧パス）
import { useNotes } from "@/lib/hooks/notes/useNotes";
```

---

## 今後の作業項目

### 1. 未実装機能の対応

#### 1.1 ユーザーページ自動作成機能

**対象フック**:
- `hooks/notes/useJoinNoteByLink.ts`
- `hooks/notes/useJoinNotePublic.ts`

**実装内容**:
- Server Actionsの `ensureUserPageInNote` に相当する機能をクライアント側で実装
- `app/_actions/user-page.ts` の `ensureUserPageInNote` と `getUserInfo` を参考に実装

**参考ファイル**:
- `app/_actions/user-page.ts`
- `app/_actions/notes/joinNoteByLink.ts`
- `app/_actions/notes/joinNotePublic.ts`

**実装方針**:
1. `hooks/user-page/` ディレクトリを作成
2. `useEnsureUserPageInNote.ts` と `useGetUserInfo.ts` を作成
3. `useJoinNoteByLink` と `useJoinNotePublic` で使用

---

### 2. 残存するServer Componentの対応

#### 2.1 `app/(protected)/notes/[slug]/page.tsx`

**現状**:
- Server Componentのまま
- `getDefaultNote()` と `getNoteDetail()` を使用

**対応方針**:
1. Client Component化
2. `useDefaultNote()` と `useNote()` を使用
3. ただし、`getAvailableDecksForNote` と `getDecksLinkedToNote` がまだServer Actionsのため、Phase 1.2（Decks関連）の移行後に対応

**依存関係**:
- Phase 1.2: Decks関連の移行完了が必要

---

### 3. Phase 1.2以降の移行作業

#### 3.1 Phase 1.2: Decks関連の移行

**対象ファイル**:
- `app/_actions/decks.ts`

**実装手順**:
1. `hooks/decks/` ディレクトリを作成
2. 各機能に対応するカスタムフックを作成
3. Server Component/Client Component内の呼び出しを置き換え

**参考**: Phase 1.1の実装パターン

#### 3.2 Phase 1.3: Pages関連の移行

**対象ファイル**:
- `app/_actions/pages.ts`
- `app/_actions/pages/get-backlinks.ts`

**実装手順**:
1. `hooks/pages/` ディレクトリを作成
2. 各機能に対応するカスタムフックを作成
3. Server Component/Client Component内の呼び出しを置き換え

#### 3.3 Phase 1.4: Cards関連の移行

**対象ファイル**:
- `app/_actions/cards.ts`
- `app/_actions/syncCardLinks.ts`

**実装手順**:
1. `hooks/cards/` ディレクトリを作成
2. 各機能に対応するカスタムフックを作成
3. Server Component/Client Component内の呼び出しを置き換え

#### 3.4 Phase 1.5: その他のCRUD操作

**対象ファイル**:
- `app/_actions/study_goals.ts`
- `app/_actions/learning_logs.ts`
- `app/_actions/milestone.ts`
- `app/_actions/review.ts`

**実装手順**:
1. 各機能ごとに `hooks/{feature}/` ディレクトリを作成
2. 各機能に対応するカスタムフックを作成
3. Server Component/Client Component内の呼び出しを置き換え

---

### 4. 共通パターンの整理

#### 4.1 フック命名規則

- Query Hooks: `use{EntityName}` または `use{EntityName}{Action}`
  - 例: `useNotes`, `useNote`, `useNotePages`
- Mutation Hooks: `use{Action}{EntityName}`
  - 例: `useCreateNote`, `useUpdateNote`, `useDeleteNote`

#### 4.2 ファイル構造

```
hooks/{feature}/
├── index.ts                    # Barrel file
├── use{Entity}.ts              # Query hooks
├── use{Action}{Entity}.ts      # Mutation hooks
└── types.ts                    # 型定義（必要に応じて）
```

#### 4.3 実装パターン

**Query Hook の基本パターン**:
```typescript
"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function use{Entity}(params?: Params) {
  const supabase = createClient();
  
  return useQuery({
    queryKey: ["{entity}", params],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // データ取得処理
      const { data, error } = await supabase
        .from("{table}")
        .select("*");
      
      if (error) throw error;
      return data;
    },
    enabled: !!params, // 必要に応じて
  });
}
```

**Mutation Hook の基本パターン**:
```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function use{Action}{Entity}() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: Payload) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // データ変更処理
      const { data, error } = await supabase
        .from("{table}")
        .insert([payload])
        .select("*")
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["{entity}"] });
    },
  });
}
```

---

### 5. テスト・動作確認

#### 5.1 各Phase完了時の確認項目

- [ ] すべての機能が正常に動作する
- [ ] エラーハンドリングが適切に実装されている
- [ ] TanStack Queryのキャッシュが正しく機能している
- [ ] `revalidatePath()` がすべて削除されている
- [ ] インポートパスが `@/hooks/` で統一されている

#### 5.2 統合テスト

- [ ] ノートCRUD操作
- [ ] ページ紐付け・解除
- [ ] 共有機能
- [ ] ゴミ箱機能
- [ ] ページ移動・コピー
- [ ] 競合チェック

---

## チェックリスト

### Phase 1.1 完了確認

- [x] 29個のカスタムフックを作成
- [x] Server ComponentをClient Component化
- [x] Client Component内のServer Actionsをフックに置き換え
- [x] ファイル配置を `hooks/notes/` に統一
- [x] インポートパスを `@/hooks/notes/` に統一

### Phase 1.1 残作業

- [ ] ユーザーページ自動作成機能の実装
- [ ] `app/(protected)/notes/[slug]/page.tsx` のClient Component化（Decks移行後）

### Phase 1.2以降

- [ ] Phase 1.2: Decks関連の移行
- [ ] Phase 1.3: Pages関連の移行
- [ ] Phase 1.4: Cards関連の移行
- [ ] Phase 1.5: その他のCRUD操作の移行

---

## 参考資料

- 実装計画: `docs/03_plans/tauri-migration/20251109_01_implementation-plan.md`
- Server Actions移行戦略: `docs/02_research/2025_11/20251109_01_server-actions-migration-strategy.md`
- Supabase Tauri統合戦略: `docs/02_research/2025_11/20251109_02_supabase-tauri-integration.md`
- Issue #146: Phase 1.1 - Notes関連の移行
- Issue #120: Tauri移行全体計画

