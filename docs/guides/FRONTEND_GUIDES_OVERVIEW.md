# フロントエンド開発ガイド - 統合版

**対象:** 全フロントエンド開発者
**最終更新:** 2025-10-23

---

## 概要

このドキュメントは、For All Learners プロジェクトの**フロントエンド開発ガイド群**への入口です。

プロジェクト全体で一貫した品質と設計原則を保つために、以下のドキュメントを統合管理しています。

---

## 📚 ドキュメント一覧

### 1. 基本方針

| ドキュメント | 内容 | 対象 |
|------------|------|------|
| **FRONTEND_DESIGN_PRINCIPLES.md** | フロントエンド全体の設計思想 | 全員（必読） |
| **DIRECTORY_STRUCTURE.md** | 機能別ディレクトリ構造と責務 | 全員（必読） |
| **REACT_USAGE_GUIDE.md** | React コンポーネント・状態管理ルール | 全員（必読） |
| **REACT_ADVANCED_RULES.md** | パフォーマンス最適化・デバッグ Tips | 実装時参照 |

---

## 🚀 実装フロー（新機能開発時）

### Step 1: 設計

```
FRONTEND_DESIGN_PRINCIPLES.md を確認
    ↓
全体アーキテクチャ（UI / Logic / Data層）を理解
    ↓
責務分離の基本を把握
```

### Step 2: ディレクトリ構造を決定（Next.js Colocations）

```
DIRECTORY_STRUCTURE.md を確認
    ↓
Next.js Colocations パターンを適用
    ↓
app/(protected)/[feature]/ にファイルを配置
```

**チェックリスト: ページ固有コンポーネント**

- [ ] `app/(protected)/[feature]/page.tsx` - ページルート（display-only）
- [ ] `app/(protected)/[feature]/components/[Feature].tsx` - ロジックコンポーネント
- [ ] `app/(protected)/[feature]/components/[FeatureSub].tsx` - 子 UI コンポーネント
- [ ] `app/(protected)/[feature]/hooks/use-[feature].ts` - ページ固有フック
- [ ] `app/(protected)/[feature]/actions.ts` - Server Actions

**チェックリスト: 複数ページで共有**

- [ ] `components/[feature]/[Component].tsx` - UI プリミティブ
- [ ] `lib/hooks/use-[utility].ts` - 複数ページで共有フック
- [ ] `lib/services/[feature]Service.ts` - ビジネスロジック
- [ ] `types/[feature].types.ts` - 型定義

### Step 3: React ルールに従う

```
REACT_USAGE_GUIDE.md を確認
    ↓
ページ / コンテナ / UI の責務を分離
    ↓
状態管理戦略を決定
```

**判定フロー:**

```
このデータはどこで使われるか？
    ↓
┌─ そのコンポーネント内のみ → useState
├─ 親から子へ（3階層以下） → props で共有
├─ 複数コンポーネント（3階層以上） → Context API
├─ アプリ全体 → Jotai
└─ サーバー状態（キャッシュ必要） → React Query
```

### Step 4: 実装

```
REACT_ADVANCED_RULES.md で推奨ルールを確認
    ↓
実装・テスト・デバッグ
```

---

## 📋 チェックリスト：ドキュメントの確認

### 全員

- [ ] FRONTEND_DESIGN_PRINCIPLES.md を読んだ
- [ ] DIRECTORY_STRUCTURE.md で推奨構造を理解した
- [ ] REACT_USAGE_GUIDE.md で状態管理戦略を把握した

### 実装時

- [ ] 新機能にふさわしいディレクトリ構造を作成したか
- [ ] ページ / コンテナ / UI の責務が明確か
- [ ] 状態管理の場所を決定したか
- [ ] 型定義が `types/[feature].types.ts` にあるか
- [ ] Hook は複数コンポーネントで再利用可能か
- [ ] Service は UI に依存していないか

### PR レビュー時

- [ ] ファイル配置がガイドに従っているか
- [ ] コンポーネント責務が明確か（ページ / コンテナ / UI）
- [ ] Props drilling がないか
- [ ] state は適切な場所で管理されているか
- [ ] memo / useCallback が必要なら使用しているか

---

## 🎯 よくある質問

### Q1: 既存の実装がガイドに従っていません。いつから適用すべき？

**Answer:**

- 新規機能・ファイル: **即座に適用**
- 既存コンポーネント修正時: **段階的に改善**
  - 大規模リファクタリングは不要
  - 小さな改善時に少しずつ移行

### Q2: Context API を使うべきか、Jotai を使うべきか？

**Answer:**

- **Context API**: 3階層以上深いコンポーネント間のみ（局所的）
- **Jotai**: アプリケーション全体で共有（ユーザー情報、テーマなど）

```typescript
// Context API の例
const NoteFilterContext = createContext(...);

// Jotai の例
export const userAtom = atom<User | null>(null);
```

### Q3: ページコンポーネント（`page.tsx`）でロジック実装してもいい？

**Answer:** ❌ **NO**

ページコンポーネントはレンダリングのみ。ロジックは:

- `[Feature]Page.tsx` (ページコンテナ) に実装
- または `[Feature]Container.tsx` (ロジックコンテナ) に実装

### Q4: UI コンポーネントがほぼ props を受け取ってるだけの場合、memo 化すべき？

**Answer:** **実測で判断**

- React DevTools Profiler で無駄な再レンダリングをチェック
- 実際に遅いなら memo 化
- 不要な最適化は避ける

### Q5: API 呼び出しを Hook の外で実装したい

**Answer:** **Service に実装してから Hook から呼び出す**

```typescript
// ✅ Good
// lib/services/noteService.ts
export async function fetchUserNotes(userId: string) {
  return await supabase.from('notes').select();
}

// hooks/use-notes.ts
export function useNotes() {
  const fetchNotes = async (userId: string) => {
    const data = await fetchUserNotes(userId);
    setNotes(data);
  };
}
```

---

## 📊 ドキュメント間の関連図

```
FRONTEND_DESIGN_PRINCIPLES.md (全体設計)
    ├─ 層の分離（UI / Logic / Data）
    ├─ コンポーネント設計パターン
    └─ 参照
         ↓
DIRECTORY_STRUCTURE.md (ディレクトリ構造)
    ├─ components/, hooks/, lib/, types/
    ├─ 各ファイルの責務
    └─ 参照
         ↓
REACT_USAGE_GUIDE.md (React ルール)
    ├─ ページ / コンテナ / UI の分離
    ├─ 状態管理戦略（useState, Context, Jotai, React Query）
    └─ 参照
         ↓
REACT_ADVANCED_RULES.md (発展的ルール)
    ├─ パフォーマンス最適化（memo, useCallback, useMemo）
    ├─ デバッグ Tips
    ├─ よくある間違い
    └─ テスト戦略

関連ドキュメント:
    ├─ CODE_OF_CONDUCT.md （開発文化）
    ├─ docs/rules/code-quality-standards.md （品質基準）
    ├─ docs/rules/language-rules.md （言語規則）
    └─ .github/pull_request_template.md （PR テンプレート）
```

---

## 🔍 クイックリファレンス

### ディレクトリ配置の判断（Next.js Colocations）

```
実装内容                  → 配置場所
────────────────────────────────────────────────────
ボタン、入力など          → components/ui/
複数ページで共有する UI   → components/[feature]/[Component].tsx
ページ固有のロジック+UI  → app/(protected)/[feature]/components/[Feature].tsx
ページ固有の子 UI        → app/(protected)/[feature]/components/[FeatureSub].tsx
ページ固有のロジック     → app/(protected)/[feature]/hooks/use-*.ts
複数ページで共有フック    → lib/hooks/use-*.ts
複数 API 統合             → lib/services/[feature]Service.ts
データベース操作         → app/(protected)/[feature]/actions.ts
型定義                   → types/[feature].types.ts
ページルート             → app/(protected)/[feature]/page.tsx
```

### 状態管理の判断

```
状態の性質                   → ツール
──────────────────────────────────────────
フォーム入力、表示/非表示    → useState（ローカル）
親→子へ props で共有（3階層以下）→ useState + props（親で管理）
複数コンポーネント間（3階層以上）→ Context API
アプリケーション全体          → Jotai
API レスポンス・キャッシュ      → React Query
データベース操作              → Server Actions
```

### コンポーネント責務の判断

```
責務               → コンポーネント     → ファイル
──────────────────────────────────────────────────────
ページのレンダリング → ページ            → page.tsx
ロジック + UI       → ロジック CP       → [Feature].tsx
UI のみ             → UI コンポーネント → [FeatureSub].tsx
複数ページで共有    → 共有 UI           → components/[feature]/[Component].tsx
```

---

## 🛠 セットアップ: 新機能実装時の手順

### 1. ファイル構造を作成

```bash
# 新機能: Note の管理機能
components/
├── notes/
│   ├── index.ts
│   ├── NotesPage.tsx              # ページコンテナ
│   ├── NotesContainer.tsx         # ロジックコンテナ
│   ├── NoteCard.tsx               # UI コンポーネント
│   ├── NoteForm.tsx               # UI コンポーネント
│   ├── notes.module.css
│   └── __tests__/

hooks/
├── use-notes.ts                   # Note 用ロジック
└── __tests__/
    └── use-notes.test.ts

lib/services/
├── noteService.ts                 # ビジネスロジック
└── __tests__/
    └── noteService.test.ts

types/
└── note.types.ts                  # 型定義

stores/
└── (ユーザー情報など、既存)
```

### 2. ファイルテンプレートの記入

#### `types/note.types.ts`

```typescript
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateNoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
```

#### `lib/services/noteService.ts`

```typescript
import { supabase } from '@/lib/supabase/client';
import type { Note, CreateNoteInput } from '@/types/note.types';

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data || [];
}

export async function createNote(note: CreateNoteInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert([note])
    .select()
    .single();

  if (error) throw new Error(`Create failed: ${error.message}`);
  return data;
}
```

#### `hooks/use-notes.ts`

```typescript
---

## 🛠 セットアップ: 新機能実装時の手順（Colocations）

### 1. ページディレクトリを作成

```bash
# 新機能: Note 管理機能（Colocations パターン）

app/(protected)/notes/
├── page.tsx                       # ページルート
├── layout.tsx                     # オプション: ページ固有レイアウト
├── components/
│   ├── Notes.tsx                  # ✅ メインロジックコンポーネント
│   ├── NotesTable.tsx             # UI コンポーネント
│   ├── NoteFilters.tsx            # UI コンポーネント
│   └── __tests__/
│       └── Notes.test.tsx
├── hooks/
│   └── use-note-filters.ts        # ページ固有フック
├── actions.ts                     # ✅ Server Actions
├── notes.module.css
└── __tests__/
    └── page.test.tsx
```

### 2. 共有コンポーネント（複数ページで使用）

```bash
components/
└── note-card/                     # 複数ページで共有
    ├── index.ts
    ├── NoteCard.tsx
    └── __tests__/
        └── NoteCard.test.tsx

lib/
├── hooks/
│   └── use-pagination.ts          # 複数ページで共有
└── services/
    └── noteService.ts            # ビジネスロジック

types/
└── note.types.ts                  # 型定義
```

### 3. ファイル例：実装テンプレート

#### `app/(protected)/notes/page.tsx`

```typescript
import { Notes } from './components/Notes';

export default function NotesPage() {
  return <Notes />;
}
```

#### `types/note.types.ts`

```typescript
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateNoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
```

#### `app/(protected)/notes/actions.ts` - Server Actions

```typescript
'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase/server';
import type { Note, CreateNoteInput } from '@/types/note.types';

export async function fetchUserNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*');
  if (error) throw new Error(`Fetch: ${error.message}`);
  return data || [];
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Create: ${error.message}`);
  revalidatePath('/notes');
  return data;
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw new Error(`Delete: ${error.message}`);
  revalidatePath('/notes');
}
```

#### `app/(protected)/notes/components/Notes.tsx` - ロジックコンポーネント

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { fetchUserNotes, createNote, deleteNote } from '../actions';
import { useNoteFilters } from '../hooks/use-note-filters';
import { NotesTable } from './NotesTable';
import { NoteFilters } from './NoteFilters';
import type { Note, CreateNoteInput } from '@/types/note.types';

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const { filters, updateFilters } = useNoteFilters();

  useEffect(() => {
    async function loadNotes() {
      setLoading(true);
      try {
        const data = await fetchUserNotes();
        setNotes(data);
      } catch (error) {
        console.error('Failed to fetch notes:', error);
      } finally {
        setLoading(false);
      }
    }
    loadNotes();
  }, []);

  const handleCreateNote = useCallback(async (input: CreateNoteInput) => {
    try {
      const newNote = await createNote(input);
      setNotes(prev => [...prev, newNote]);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  }, []);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <NoteFilters filters={filters} onChange={updateFilters} />
      <NotesTable notes={notes} onDelete={handleDeleteNote} />
    </div>
  );
}
```

#### `app/(protected)/notes/components/NotesTable.tsx` - UI コンポーネント

```typescript
'use client';

import { NoteCard } from '@/components/note-card';
import type { Note } from '@/types/note.types';

interface NotesTableProps {
  notes: Note[];
  onDelete: (id: string) => void;
}

export function NotesTable({ notes, onDelete }: NotesTableProps) {
  return (
    <div className="grid gap-4">
      {notes.map(note => (
        <NoteCard key={note.id} note={note} onDelete={onDelete} />
      ))}
    </div>
  );
}
```

---

## 📖 参考リソース

- **React 公式**: https://react.dev
- **Next.js ドキュメント**: https://nextjs.org/docs
- **Server Actions**: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- **Jotai**: https://jotai.org
- **React Query**: https://tanstack.com/query

---

## 🎓 学習パス

### 初心者向け

1. FRONTEND_DESIGN_PRINCIPLES.md の「1. 全体アーキテクチャ」を読む
2. DIRECTORY_STRUCTURE.md の「2-1. `/app` - ページ層」を読む
3. REACT_USAGE_GUIDE.md の「1. ページコンポーネントの責務」を読む
4. 簡単な機能（リスト表示）を実装してみる

### 中級者向け

1. REACT_USAGE_GUIDE.md 全体を読む
2. Server Actions セクション（セクション7）を理解
3. 複雑な機能（フォーム + API 統合）を実装

### 上級者向け

1. REACT_ADVANCED_RULES.md でパフォーマンス最適化を学ぶ
2. REACT_USAGE_GUIDE.md の「Props Drilling 回避」を深掘り
3. チーム実装パターンの改善提案

---

## ✅ チェックリスト：ガイド適用の確認

### プロジェクト全体

- [ ] ドキュメント 4 種を docs/guides/ に配置している
- [ ] チーム全員がドキュメントにアクセスできる
- [ ] 新規開発者向けのオンボーディング資料として機能している

### 個別ファイル

- [ ] コンポーネント: page.tsx → [Feature].tsx → [FeatureSub].tsx が明確
- [ ] ページ固有: app/(protected)/[feature]/ に colocate
- [ ] Server Actions: actions.ts に統一
- [ ] 共有コンポーネント: components/ に配置
- [ ] Hook: 単一責任、複数コンポーネントで再利用可能
- [ ] Service: UI に依存しない、テスト可能

### コードレビュー

- [ ] ファイル配置が Colocations パターンに従っているか
- [ ] ページ固有 vs 共有の区分が明確か
- [ ] Server Actions を使用しているか（DB 操作時）
- [ ] Props Drilling がないか

---

## 🤝 フィードバック・改善

このガイドについて、質問や改善提案がある場合：

1. Issue を作成してください
2. PR で改善を提案してください
3. チーム内でディスカッション

---

## 📌 版管理

| 版 | 日付 | 主な変更 |
|---|------|--------|
| 1.1 | 2025-10-23 | Colocations パターン対応、Server Actions 追加 |
| 1.0 | 2025-10-22 | 初版作成 |

---

**最終更新:** 2025-10-23
**対象:** 全フロントエンド開発チーム
```

#### `components/notes/NotesPage.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useNotes } from '@/hooks/use-notes';
import { useUserStore } from '@/stores/user.store';
import { NotesContainer } from './NotesContainer';

export function NotesPage() {
  const { user } = useUserStore();
  const { notes, loading, error, fetchNotes } = useNotes();

  useEffect(() => {
    if (user?.id) {
      fetchNotes(user.id);
    }
  }, [user?.id, fetchNotes]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <NotesContainer notes={notes} />;
}
```

#### `components/notes/index.ts`

```typescript
export { NotesPage } from './NotesPage';
export { NotesContainer } from './NotesContainer';
export { NoteCard } from './NoteCard';
export { NoteForm } from './NoteForm';
```

---

## 📖 参考リソース

- **React 公式**: https://react.dev
- **Next.js ドキュメント**: https://nextjs.org/docs
- **TypeScript Handbook**: https://www.typescriptlang.org/docs
- **Jotai**: https://jotai.org
- **React Query**: https://tanstack.com/query

---

## 🎓 学習パス

### 初心者向け

1. FRONTEND_DESIGN_PRINCIPLES.md の「1. 全体アーキテクチャ」を読む
2. DIRECTORY_STRUCTURE.md の「2-1. `/app` - ページ層」を読む
3. REACT_USAGE_GUIDE.md の「1. ページコンポーネントの責務」を読む
4. 簡単な機能（リスト表示）を実装してみる

### 中級者向け

1. REACT_USAGE_GUIDE.md 全体を読む
2. 複雑な機能（フォーム + API 統合）を実装
3. REACT_ADVANCED_RULES.md でパフォーマンス最適化を学ぶ

### 上級者向け

1. REACT_ADVANCED_RULES.md の「6. Props Drilling 回避パターン」を深掘り
2. Compound Components / Render Props パターンを実装
3. チームの実装パターンの改善提案

---

## ✅ チェックリスト：ガイド適用の確認

### プロジェクト全体

- [ ] ドキュメント 4 種を docs/guides/ に配置している
- [ ] チーム全員がドキュメントにアクセスできる
- [ ] 新規開発者向けのオンボーディング資料として機能している

### 個別ファイル

- [ ] コンポーネント: UI / Container / Page が明確に分離
- [ ] Hook: 単一責任、複数コンポーネントで再利用可能
- [ ] Service: UI に依存しない、テスト可能
- [ ] 型定義: types/ に集約、使用する側で正確に型付け

### コードレビュー

- [ ] ファイル配置がガイドに従っているか確認
- [ ] 責務分離が明確か確認
- [ ] Props Drilling がないか確認
- [ ] 状態管理の場所が適切か確認

---

## 🤝 フィードバック・改善

このガイドについて、質問や改善提案がある場合：

1. Issue を作成してください
2. PR で改善を提案してください
3. チーム内でディスカッション

---

## 📌 版管理

| 版 | 日付 | 主な変更 |
|---|------|--------|
| 1.0 | 2025-10-23 | 初版作成 |

---

**最終更新:** 2025-10-23
**作成者:** AI (GitHub Copilot)
