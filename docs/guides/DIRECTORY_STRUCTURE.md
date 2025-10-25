# 機能別ディレクトリ構造ガイド

**対象:** 全開発者
**最終更新:** 2025-10-23

---

## 概要

このドキュメントは、新しい機能を実装する際の推奨ディレクトリ構造と、各ディレクトリ内のファイル配置方針を定めます。

関心の分離と Clean Architecture に基づいて、コンポーネント・ロジック・型定義を適切に配置することで、保守性・テスト可能性・再利用性を確保します。

---

## 1. 推奨ディレクトリ構造

### 1-1. 全体構造（Next.js コロケーション中心）

```
project-root/
├── app/                                    # Next.js App Router (ページ + ページ固有実装)
│   ├── (public)/
│   │   ├── page.tsx                       # ホームページ
│   │   └── about/
│   │       └── page.tsx
│   │
│   └── (protected)/
│       ├── notes/                         # ページディレクトリ
│       │   ├── page.tsx                   # Notes ページ
│       │   ├── layout.tsx                 # Notes レイアウト（サーバーコンポーネント）
│       │   ├── components/                # ページ固有コンポーネント
│       │   │   ├── NotesTable.tsx
│       │   │   ├── NoteFilters.tsx
│       │   │   └── NoteActions.tsx
│       │   ├── hooks/                     # ページ固有ロジック
│       │   │   └── use-note-filters.ts
│       │   ├── actions.ts                 # サーバーアクション
│       │   ├── page.module.css
│       │   └── __tests__/
│       │
│       └── notes/[id]/
│           ├── page.tsx
│           └── components/
│
├── components/                             # 共有コンポーネント層
│   ├── ui/                                # UI プリミティブ（ボタン、入力など）
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   └── ...
│   │
│   └── [feature]/                         # 複数ページで共有する機能コンポーネント
│       ├── index.ts                       # 公開 API
│       ├── [Feature].tsx                  # 主要コンポーネント（クライアント）
│       ├── [Feature]Client.tsx            # クライアント分離版（必要な場合）
│       ├── [Feature]Button.tsx            # 子コンポーネント
│       ├── [feature].module.css
│       └── __tests__/
│           └── [Feature].test.tsx
│
│
├── lib/                          # ユーティリティ・サービス層
│   ├── services/
│   │   ├── [feature]Service.ts    # ビジネスロジック（複数 API 統合など）
│   │   └── __tests__/
│   │       └── [feature]Service.test.ts
│   │
│   ├── supabase/
│   │   ├── [feature]-queries.ts   # DB クエリ
│   │   └── types.ts              # DB 関連の型
│   │
│   ├── utils/
│   │   ├── [feature]-helpers.ts   # ヘルパー関数
│   │   └── __tests__/
│   │       └── [feature]-helpers.test.ts
│   │
│   └── validators/
│       └── [feature]-validators.ts # 入力検証
│
├── types/                        # TypeScript 型定義
│   ├── [feature].types.ts        # 機能固有の型
│   ├── index.ts                  # 型の再エクスポート
│   └── database.types.ts         # Supabase 自動生成型
│
├── stores/                       # グローバル状態管理 (Jotai)
│   ├── [feature].store.ts        # 機能固有の状態
│   └── index.ts                  # ストアの再エクスポート
│
└── ...
```

---

## 2. 各ディレクトリの詳細説明

### 2-1. `/app` - Next.js App Router（ページ + ページ固有実装）

**責務:**
- ルーティング定義
- page.tsx は ページコンポーネントをレンダリングするのみ
- ページ固有のコンポーネント・ロジックを配置
- サーバーコンポーネント（layout.tsx）が必要な場合はここに実装

**推奨構造（コロケーション中心）:**
```
app/
├── (protected)/
│   └── notes/                       # ページディレクトリ
│       ├── page.tsx                 # ページ本体（ここで [Feature] を呼び出す）
│       ├── layout.tsx               # サーバーコンポーネント（必要な場合）
│       ├── components/              # ページ固有コンポーネント
│       │   ├── NotesTable.tsx       # このページでのみ使用
│       │   ├── NoteFilters.tsx
│       │   └── NoteActions.tsx
│       ├── hooks/                   # ページ固有ロジック
│       │   └── use-note-filters.ts
│       ├── actions.ts               # サーバーアクション
│       └── page.module.css
│
└── (public)/
    └── page.tsx
```

**ページコンポーネントの実装例:**
```typescript
// app/(protected)/notes/page.tsx
import { Notes } from './components/Notes';

export default function NotesPage() {
  return <Notes />;
}

// または、サーバーコンポーネント機能が必要な場合
import { getInitialData } from './actions';
import { NotesClient } from './components/NotesClient';

export default async function NotesPage() {
  const data = await getInitialData();
  return <NotesClient initialData={data} />;
}
```

**重要:**
- `page.tsx` はページコンポーネントをレンダリングするのみ
- ページ固有のコンポーネントは `./components/` に配置
- ページ固有のロジックは `./hooks/` や `./actions.ts` に配置

---

### 2-2. `/components` - 共有コンポーネント層（複数ページで利用）

このディレクトリは以下のみを対象：
- **UI プリミティブ**: button, input, modal など
- **複数ページで共有する機能コンポーネント**: ユーザープロフィール、通知など

#### 2-2-1. `/components/ui` - UI プリミティブ

**責務:**
- ボタン、入力フィールド、モーダルなど基本的な UI 要素
- Props のみを受け取り、表示するだけ
- 再利用可能で、ビジネスロジックを持たない

**構造:**
```
components/ui/
├── button.tsx
├── input.tsx
├── dialog.tsx
├── select.tsx
└── ...
```

**実装例:**
```typescript
// components/ui/button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${isLoading ? 'loading' : ''}`}
      disabled={isLoading}
      {...props}
    >
      {children}
    </button>
  );
}
```

#### 2-2-2. `/components/[feature]` - 複数ページで共有する機能コンポーネント

**構造:**
```
components/[feature]/
├── index.ts                        # 公開 API（再エクスポート）
├── [Feature].tsx                   # 主要コンポーネント（クライアント）
├── [Feature]Client.tsx             # クライアント分離版（必要な場合）
├── [FeatureSub].tsx               # 子コンポーネント
├── [feature].module.css            # スタイル
└── __tests__/
    └── [Feature].test.tsx
```

**ファイル分類:**

| ファイル | 役割 | 用途 | 例 |
|--------|------|------|-----|
| `[Feature].tsx` | 主要コンポーネント | 複数ページで共有 | UserProfile, NotificationBell |
| `[Feature]Client.tsx` | クライアント分離版 | サーバー/クライアント分離時 | 必要な場合のみ |
| `[FeatureSub].tsx` | 子コンポーネント | [Feature] の内部実装 | UserProfileCard |

**実装例:**

```typescript
// components/user-profile/index.ts
export { UserProfile } from './UserProfile';
export { UserProfileAvatar } from './UserProfileAvatar';
```

```typescript
// components/user-profile/UserProfile.tsx (複数ページで共有するコンポーネント)
'use client';

import { useUserStore } from '@/stores/user.store';
import { UserProfileAvatar } from './UserProfileAvatar';

export function UserProfile() {
  const { user } = useUserStore();

  if (!user) return null;

  return (
    <div className="user-profile">
      <UserProfileAvatar user={user} />
      <div>
        <h3>{user.name}</h3>
        <p>{user.email}</p>
      </div>
    </div>
  );
}
```

```typescript
// components/user-profile/UserProfileAvatar.tsx (子コンポーネント)
import type { User } from '@/types/user.types';

interface UserProfileAvatarProps {
  user: User;
}

export function UserProfileAvatar({ user }: UserProfileAvatarProps) {
  return (
    <img
      src={user.avatar}
      alt={user.name}
      className="w-10 h-10 rounded-full"
    />
  );
}
```

---

### 2-3. ページ固有コンポーネント（`app/[feature]/components/`）

複数のページで使用されない、**ページ固有のコンポーネント**はここに配置します。

**実装例（Note 詳細ページ）:**
```typescript
// app/(protected)/notes/[id]/page.tsx
import { NoteDetail } from './components/NoteDetail';
import { getNote } from './actions';

export default async function NotePage({ params }: Props) {
  const note = await getNote(params.id);
  return <NoteDetail note={note} />;
}

// app/(protected)/notes/[id]/components/NoteDetail.tsx
'use client';

import type { Note } from '@/types/note.types';
import { NoteDetailContent } from './NoteDetailContent';
import { NoteDetailSidebar } from './NoteDetailSidebar';

interface NoteDetailProps {
  note: Note;
}

export function NoteDetail({ note }: NoteDetailProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-2">
        <NoteDetailContent note={note} />
      </div>
      <aside>
        <NoteDetailSidebar note={note} />
      </aside>
    </div>
  );
}
```

---

### 2-4. ページ固有のロジック（`app/[feature]/hooks/`、`app/[feature]/actions.ts`）

**責務:**
- そのページ・機能固有のロジック
- ページの components や actions で使用
- 他のページから利用されない

**構造:**
```
app/(protected)/notes/
├── hooks/
│   └── use-note-filters.ts       # ページ固有ロジック
├── actions.ts                    # サーバーアクション
└── components/
    └── NoteTable.tsx
```

**実装例:**

```typescript
// app/(protected)/notes/hooks/use-note-filters.ts
'use client';

import { useState, useCallback } from 'react';
import type { NoteFilter } from '@/types/note.types';

export function useNoteFilters() {
  const [filters, setFilters] = useState<NoteFilter>({
    category: 'all',
    sortBy: 'date'
  });

  const handleFilterChange = useCallback((newFilter: Partial<NoteFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilter }));
  }, []);

  return { filters, handleFilterChange };
}
```

```typescript
// app/(protected)/notes/actions.ts
'use server';

import { supabase } from '@/lib/supabase/server';
import type { Note } from '@/types/note.types';

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data || [];
}

export async function createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert([note])
    .select()
    .single();

  if (error) throw new Error(`Create failed: ${error.message}`);
  return data;
}
```

---

### 2-5. 共有ロジック（`lib/hooks/`、`lib/services/`）

複数のページ・機能で使用されるロジック

**構造:**
```
lib/
├── hooks/
│   ├── use-pagination.ts         # 共有フック
│   ├── use-form-handler.ts
│   └── __tests__/
│       └── use-pagination.test.ts
│
└── services/
    ├── noteService.ts            # 複数 API 統合
    └── __tests__/
        └── noteService.test.ts
```

**実装例（共有フック）:**

```typescript
// lib/hooks/use-pagination.ts
'use client';

import { useState, useCallback } from 'react';

interface PaginationState {
  page: number;
  limit: number;
}

export function usePagination(initialLimit = 10) {
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: initialLimit
  });

  const goToPage = useCallback((page: number) => {
    setPagination(prev => ({ ...prev, page }));
  }, []);

  const nextPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: prev.page + 1 }));
  }, []);

  const prevPage = useCallback(() => {
    setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }));
  }, []);

  return { pagination, goToPage, nextPage, prevPage };
}
```

**実装例（共有サービス）:**

```typescript
// lib/services/noteService.ts
import { supabase } from '@/lib/supabase/client';
import type { Note } from '@/types/note.types';

export async function saveNoteWithTags(
  note: Note,
  tags: string[]
): Promise<Note> {
  // 1. Note を保存
  const { data: savedNote, error: noteError } = await supabase
    .from('notes')
    .upsert([note])
    .select()
    .single();

  if (noteError) throw new Error(`Save failed: ${noteError.message}`);

  // 2. タグを保存
  const tagRecords = tags.map(tag => ({
    note_id: savedNote.id,
    tag_name: tag
  }));

  const { error: tagError } = await supabase
    .from('note_tags')
    .upsert(tagRecords);

  if (tagError) throw new Error(`Tag save failed: ${tagError.message}`);

  return savedNote;
}
```


---

### 2-6. `/types` - 型定義層

**責務:**
- TypeScript 型定義の集約
- インターフェース定義
- Utility Types の提供

**構造:**
```
types/
├── index.ts                      # 型の再エクスポート
├── note.types.ts                 # Note 機能の型
├── user.types.ts                 # User 機能の型
└── database.types.ts             # Supabase 自動生成型
```

**実装例:**

```typescript
// types/note.types.ts
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type CreateNoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateNoteInput = Partial<CreateNoteInput>;

export interface NoteFilter {
  category?: string;
  tags?: string[];
  searchText?: string;
}

export interface NoteFetchResult {
  notes: Note[];
  total: number;
  hasMore: boolean;
}
```

**重要:** 型定義は機能の「コントラクト」です。コンポーネント・フック・サービス間のデータ構造を明確にします。

---

### 2-7. `/stores` - グローバル状態管理（Jotai）

**責務:**
- アプリケーション全体で共有する状態
- ユーザー認証、言語設定、テーマなど

**構造:**
```
stores/
├── index.ts                      # ストアの再エクスポート
├── user.store.ts                 # ユーザー状態
├── theme.store.ts                # テーマ状態
└── auth.store.ts                 # 認証状態
```

**実装例:**

```typescript
// stores/user.store.ts
import { atom } from 'jotai';
import type { User } from '@/types/user.types';

export const userAtom = atom<User | null>(null);
export const isLoadingAtom = atom(false);

// Hooks で使用
export function useUserStore() {
  const [user, setUser] = useAtom(userAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);

  return { user, setUser, isLoading, setIsLoading };
}
```

---

## 3. ファイル命名規則の詳細

### 3-1. ページ固有コンポーネント（`app/[feature]/components/`）

| 用途 | 命名規則 | 説明 |
|-----|--------|------|
| メインコンポーネント | `[Feature].tsx` | ページの主要 UI コンポーネント |
| 子コンポーネント | `[FeatureSub].tsx` | 機能固有の小コンポーネント |
| サーバーコンポーネント | `[Feature]Server.tsx` | サーバー側のみで実行 |
| クライアント分離 | `[Feature]Client.tsx` | Server Action 使用時のクライアント部分 |

**例:**
```
app/(protected)/notes/components/
├── Notes.tsx              # ✅ メイン表示コンポーネント
├── NoteTable.tsx          # ✅ ページ固有の子コンポーネント
├── NoteFilters.tsx        # ✅ フィルター UI
├── NoteEditor.tsx         # ✅ 編集フォーム
└── NoteEditorClient.tsx   # ✅ クライアント専用ロジック
```

**❌ 避けるべき命名:**
- `NotesPage.tsx` - `page.tsx` と混同
- `NotesContainer.tsx` - Next.js では非推奨
- `NotesPresentation.tsx` - 冗長

### 3-2. 共有コンポーネント（`components/[feature]/`）

| 用途 | 命名規則 | 説明 |
|-----|--------|------|
| コンポーネント | `[Component].tsx` | 複数ページで再利用 |
| UI プリミティブ | `[primitive].tsx` | ボタン、入力など |

**例:**
```
components/
├── ui/
│   ├── button.tsx         # ✅ UI プリミティブ
│   ├── dialog.tsx
│   └── input.tsx
│
└── note-card/             # ✅ 複数ページで共有
    ├── index.ts
    ├── NoteCard.tsx
    └── NoteCardHeader.tsx
```

### 3-3. Hook ファイル

| スコープ | 命名規則 | 例 |
|--------|--------|-----|
| ページ固有フック | `use-[feature].ts` | `app/notes/hooks/use-note-filters.ts` |
| 共有フック | `use-[utility].ts` | `lib/hooks/use-pagination.ts` |
| UI Hook | `use-[ui].ts` | `lib/hooks/use-modal.ts` |

**例:**
```
app/(protected)/notes/hooks/
└── use-note-filters.ts   # ✅ ページ固有

lib/hooks/
├── use-pagination.ts      # ✅ 複数ページで共有
├── use-form-handler.ts
└── use-debounce.ts
```

### 3-4. サーバーアクション（`app/[feature]/actions.ts`）

| 用途 | 命名規則 | 例 |
|-----|--------|-----|
| データ取得 | `fetch[Feature]()` | `fetchUserNotes()` |
| データ作成 | `create[Feature]()` | `createNote()` |
| データ更新 | `update[Feature]()` | `updateNote()` |
| データ削除 | `delete[Feature]()` | `deleteNote()` |

**例:**
```typescript
// app/(protected)/notes/actions.ts
'use server';

export async function fetchUserNotes(userId: string) { }
export async function createNote(data: CreateNoteInput) { }
export async function updateNote(id: string, data: UpdateNoteInput) { }
export async function deleteNote(id: string) { }
```

### 3-5. サービス・ロジックファイル（`lib/services/`）

| 用途 | 命名規則 | 例 |
|-----|--------|-----|
| ビジネスロジック | `[feature]Service.ts` | `noteService.ts` |
| API クライアント | `[api]Client.ts` | `geminiClient.ts` |
| ユーティリティ | `[feature]-helpers.ts` | `note-helpers.ts` |

### 3-6. 型定義ファイル（`types/`）

| 用途 | 命名規則 | 例 |
|-----|--------|-----|
| 機能型定義 | `[feature].types.ts` | `note.types.ts` |
| Validator | `[feature]-validators.ts` | `note-validators.ts` |
| ユーティリティ型 | `common.types.ts` | 共通型 |

### 3-7. Jotai ストア（`stores/`）

| 用途 | 命名規則 | 例 |
|-----|--------|-----|
| グローバル状態 | `[feature].store.ts` | `user.store.ts` |
| Atom 定義 | `export const [feature]Atom` | `export const userAtom` |

---

### 3-8. 命名規則の比較表

| 文脈 | ✅ 推奨 | ❌ 避ける | 理由 |
|-----|--------|---------|------|
| ページ固有コンポーネント | `Notes.tsx` | `NotesPage.tsx` | `page.tsx` と混同 |
| | `Notes.tsx` | `NotesContainer.tsx` | Next.js では非推奨 |
| 共有コンポーネント | `NoteCard.tsx` | `NoteCardComponent.tsx` | 冗長 |
| Server Action | `fetchUserNotes()` | `getNotes()` | 動作を明確化 |
| Hook | `use-note-filters.ts` | `noteFilters.ts` | Hook 規約 |
| Service | `noteService.ts` | `NotesService.ts` | ファイル名は小文字 |

---

## 4. 実装例：完全な機能フロー

### 4-1. Note 機能全体の構成例（コロケーション中心）

```
app/
└── (protected)/
    └── notes/                        # ページディレクトリ
        ├── page.tsx                  # ページ本体
        ├── layout.tsx                # レイアウト
        ├── actions.ts                # サーバーアクション
        ├── components/
        │   ├── Notes.tsx             # ページの主要コンポーネント
        │   ├── NotesTable.tsx
        │   ├── NoteFilters.tsx
        │   └── NoteActions.tsx
        ├── hooks/
        │   └── use-note-filters.ts   # ページ固有ロジック
        ├── notes.module.css
        └── __tests__/
            └── Notes.test.tsx

components/
└── note-card/                        # 複数ページで共有
    ├── index.ts
    ├── NoteCard.tsx
    ├── NoteCardHeader.tsx
    └── __tests__/
        └── NoteCard.test.tsx

lib/
├── hooks/
│   ├── use-pagination.ts            # 複数ページで共有
│   └── __tests__/
│       └── use-pagination.test.ts
│
└── services/
    ├── noteService.ts               # 複数 API 統合
    └── __tests__/
        └── noteService.test.ts

types/
└── note.types.ts

stores/
└── user.store.ts
```

### 4-2. データフロー例（ユーザーが Note を追加）

```
app/(protected)/notes/page.tsx
  ↓
<Notes /> (app/(protected)/notes/components/Notes.tsx)
  ├─ useNoteFilters() (app/(protected)/notes/hooks/use-note-filters.ts)
  ├─ createNote() (app/(protected)/notes/actions.ts - Server Action)
  └─ <NoteForm /> 
       ↓
User clicks "Add Note"
  ↓
handleSubmit() in Notes.tsx
  ↓
actions.createNote() (Server Action)
  ↓
Supabase API
  ↓
state update in Notes.tsx
  ↓
<NotesTable /> re-render
  ↓
<NoteCard /> (components/note-card/NoteCard.tsx) render
```

### 4-3. 複数ページで共有するコンポーネント

```
components/
└── user-profile/
    ├── index.ts
    ├── UserProfile.tsx             # 複数ページで使用
    ├── UserProfileAvatar.tsx       # 子コンポーネント
    └── __tests__/

app/(protected)/dashboard/
├── page.tsx
└── components/
    └── UserGreeting.tsx            # ページ固有、UserProfile を使用

app/(protected)/settings/
├── page.tsx
└── components/
    └── UserSettings.tsx            # ページ固有、UserProfile を使用
```

---

## 4. 新機能実装時のチェックリスト

### ファイル構造の作成

- [ ] ページファイル: `app/(protected)/[feature]/page.tsx`
- [ ] ページコンポーネント: `app/(protected)/[feature]/components/[Feature].tsx`
- [ ] ページ固有フック: `app/(protected)/[feature]/hooks/use-*.ts`
- [ ] サーバーアクション: `app/(protected)/[feature]/actions.ts`
- [ ] 型定義: `types/[feature].types.ts`
- [ ] 複数ページで共有する場合:
  - [ ] UI コンポーネント: `components/[feature]/[Component].tsx`
  - [ ] 共有フック: `lib/hooks/use-*.ts`
  - [ ] インデックス: `components/[feature]/index.ts`

### 責務分離の確認

- [ ] `page.tsx` はコンポーネントをレンダリングするのみ（display-only）
- [ ] `components/[Feature].tsx` がロジック・状態管理を担当（ロジックコンポーネント）
- [ ] 子コンポーネント（`[FeatureSub].tsx`）は Props のみで動作（表示コンポーネント）
- [ ] Hook は UI に依存しない（複数コンポーネントで再利用可能）
- [ ] Server Action は `'use server'` で明記

### テスト・ドキュメント

- [ ] Hook のユニットテスト: `hooks/use-*.test.ts`
- [ ] コンポーネントテスト: `components/[Feature].test.tsx`
- [ ] Server Action のテスト（型チェック）
- [ ] `.spec.md` 仕様書作成（複雑な機能の場合）

### 依存関係の記録

- [ ] ファイル先頭に DEPENDENCY MAP コメント追加（親・依存先を明記）
- [ ] 複数ページで共有する場合は `components/[feature]/` に配置
- [ ] 関連ドキュメントにリンク

---

## 5. よくある実装パターン

### パターン 1: ページ固有の機能（コロケーション）

```
app/(protected)/notes/
├── page.tsx                              # ルート
│   └── <Notes /> を render
├── components/
│   ├── Notes.tsx                         # ✅ ロジックコンポーネント
│   ├── NotesTable.tsx                    # ✅ 表示コンポーネント
│   └── NoteFilters.tsx                   # ✅ 表示コンポーネント
├── hooks/
│   └── use-note-filters.ts               # ✅ ページ固有フック
├── actions.ts                            # ✅ Server Actions
└── notes.module.css
```

**実装の流れ:**

```typescript
// 1. page.tsx - ルートコンポーネント（display-only）
export default function NotesPage() {
  return <Notes />;
}

// 2. components/Notes.tsx - ロジックコンポーネント
'use client';

import { useNoteFilters } from '../hooks/use-note-filters';
import { createNote, fetchUserNotes } from '../actions';

export function Notes() {
  const { filters, updateFilters } = useNoteFilters();
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    fetchUserNotes().then(setNotes);
  }, []);

  return (
    <div>
      <NoteFilters filters={filters} onChange={updateFilters} />
      <NotesTable notes={notes} />
    </div>
  );
}

// 3. actions.ts - Server Action
'use server';

export async function fetchUserNotes(): Promise<Note[]> {
  // DB クエリ
}

export async function createNote(data: CreateNoteInput): Promise<Note> {
  // DB 操作
}
```

### パターン 2: 複数ページで共有するコンポーネント

```
components/
└── note-card/                            # 複数ページで使用
    ├── index.ts
    ├── NoteCard.tsx                      # メインコンポーネント
    ├── NoteCardHeader.tsx                # 子コンポーネント
    └── __tests__/
        └── NoteCard.test.tsx

app/(protected)/notes/
├── page.tsx
└── components/
    └── NotesTable.tsx                    # NoteCard を使用

app/(protected)/dashboard/
├── page.tsx
└── components/
    └── DashboardNotesPreview.tsx         # NoteCard を使用
```

**実装の流れ:**

```typescript
// components/note-card/NoteCard.tsx
'use client';

import type { Note } from '@/types/note.types';

export interface NoteCardProps {
  note: Note;
  onDelete?: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <div className="border rounded-lg p-4">
      <NoteCardHeader title={note.title} />
      <p>{note.content}</p>
      {onDelete && (
        <button onClick={() => onDelete(note.id)}>Delete</button>
      )}
    </div>
  );
}

// components/note-card/index.ts - 再エクスポート
export { NoteCard } from './NoteCard';
export type { NoteCardProps } from './NoteCard';

// app/notes/components/NotesTable.tsx - 使用側
import { NoteCard } from '@/components/note-card';

export function NotesTable({ notes }: Props) {
  return notes.map(note => (
    <NoteCard key={note.id} note={note} />
  ));
}
```

### パターン 3: Server Action と Client Component の分離

複数の Server Action が必要な場合:

```
app/(protected)/notes/
├── page.tsx
├── components/
│   ├── Notes.tsx                         # Client component
│   ├── NoteEditorClient.tsx              # Client component
│   └── NotesServer.tsx                   # Server component（必要に応じて）
├── actions.ts                            # Server Actions
└── hooks/
    └── use-note-editor.ts                # Client-side state
```

**実装例:**

```typescript
// app/(protected)/notes/components/Notes.tsx
'use client';

import { deleteNote } from '../actions';
import { NoteEditorClient } from './NoteEditorClient';

export function Notes() {
  const handleDelete = async (id: string) => {
    await deleteNote(id);
  };

  return (
    <div>
      <NoteEditorClient />
      {/* Other components */}
    </div>
  );
}

// app/(protected)/notes/components/NoteEditorClient.tsx
'use client';

import { createNote } from '../actions';
import { useEditorState } from '../hooks/use-note-editor';

export function NoteEditorClient() {
  const { content, setContent } = useEditorState();

  const handleSave = async () => {
    await createNote({ content });
  };

  return (
    <div>
      <textarea value={content} onChange={e => setContent(e.target.value)} />
      <button onClick={handleSave}>Save</button>
    </div>
  );
}
```

### パターン 4: 共有フック・サービス

複数ページで同じロジックが必要な場合:

```
lib/
├── hooks/
│   └── use-pagination.ts                 # 複数ページで共有
└── services/
    └── noteService.ts                    # ビジネスロジック

app/(protected)/notes/
├── page.tsx
└── components/
    ├── Notes.tsx                         # use-pagination 使用
    └── NotesTable.tsx

app/(protected)/favorites/
├── page.tsx
└── components/
    └── FavoriteNotes.tsx                 # use-pagination 使用
```

**実装例:**

```typescript
// lib/hooks/use-pagination.ts
'use client';

import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, pageSize = 10) {
  const [page, setPage] = useState(initialPage);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(1, p - 1)), []);

  return { page, nextPage, prevPage, pageSize };
}

// app/(protected)/notes/components/Notes.tsx
import { usePagination } from '@/lib/hooks/use-pagination';

export function Notes() {
  const { page, nextPage, prevPage } = usePagination();
  // ...
}
```

---

## 6. ディレクトリ別の責務マトリックス

| ディレクトリ | Server Component | Client Component | Logic | Types |
|------------|-----------------|-----------------|-------|-------|
| `app/` | ✅ page.tsx のみ | ✅ actions.ts で使用 | ✅ actions.ts | |
| `app/[feature]/components/` | | ✅ ロジックコンポーネント | ✅ custom hooks | |
| `components/[feature]/` | | ✅ UI コンポーネント | | |
| `lib/hooks/` | | ✅ 複数 component で使用 | ✅ | |
| `lib/services/` | | | ✅ ビジネスロジック | |
| `types/` | | | | ✅ Interface/Type |
| `stores/` | | ✅ Provider を通じて | ✅ Jotai atoms | |

---

## 7. チェックリスト：よくある間違い

### ❌ よくある間違い

- [ ] `components/[feature]/[Feature]Page.tsx` - `page.tsx` と混同する命名
- [ ] `app/[feature]/components/[Feature]Container.tsx` - Next.js では不要
- [ ] `hooks/use-*.ts` にロジックファイルが混在 - `lib/services/` に分離すべき
- [ ] 複数ページで使用するコンポーネントを `app/` に配置 - `components/` に移動
- [ ] 全ファイルを `lib/` に置く - ページ固有は `app/[feature]/` に配置
- [ ] Server Component と Client Component の区別が曖昧 - 明確に分離

### ✅ 改善例

```
# Before (❌ 複雑)
app/
└── [feature]/
    ├── page.tsx
    ├── [feature]Container.tsx       # ❌ コンテナ
    ├── [feature]Page.tsx            # ❌ ページとの混同
    ├── components/
    │   └── [FeatureSub].tsx
    └── hooks/
        ├── use-[feature].ts
        ├── useDataFetcher.ts        # ❌ Hook ではないロジック
        └── validate[Feature].ts     # ❌ Hook ではない utility

# After (✅ 整理)
app/
└── [feature]/
    ├── page.tsx                     # ✅ ルートのみ
    ├── components/
    │   ├── [Feature].tsx            # ✅ ロジックコンポーネント
    │   └── [FeatureSub].tsx         # ✅ 子コンポーネント
    ├── hooks/
    │   └── use-[feature].ts         # ✅ Hook のみ
    ├── actions.ts                   # ✅ Server Actions
    └── [feature].module.css

lib/
├── hooks/
│   └── use-pagination.ts            # ✅ 共有 Hook
└── services/
    ├── [feature]Service.ts          # ✅ ビジネスロジック
    └── validators/
        └── [feature]-validator.ts   # ✅ Validation logic
```

---

## 8. よくある質問（FAQ）

### Q1. ページ固有フックはどこに置く？
**A:** `app/[feature]/hooks/` に配置。複数ページで使用する場合は `lib/hooks/` に移動。

### Q2. 複雑なフォーム Logic は？
**A:** `lib/services/` に `[Feature]FormService.ts` として配置。複数 Hook から使用可能に。

### Q3. API レスポンスのキャッシング？
**A:** React Query（サーバー状態）のみ使用。クライアント状態は `useState` または Jotai。

### Q4. コンポーネントテストはどこに？
**A:** コンポーネントの同じディレクトリに `[Component].test.tsx` または `__tests__/` に配置。

### Q5. グローバル状態（Jotai）はどこから取得？
**A:** `stores/[feature].store.ts` から `useAtom()` で取得。

---

## 9. 関連ドキュメント

- [REACT_USAGE_GUIDE.md](./REACT_USAGE_GUIDE.md) - React component patterns
- [REACT_ADVANCED_RULES.md](./REACT_ADVANCED_RULES.md) - Performance & Debugging
- [FRONTEND_GUIDES_OVERVIEW.md](./FRONTEND_GUIDES_OVERVIEW.md) - Documentation overview
- [FRONTEND_DESIGN_PRINCIPLES.md](../../../FRONTEND_DESIGN_PRINCIPLES.md) - Architecture principles

---

**最終更新:** 2025-10-22
**対象:** フロントエンド開発チーム全員
- [ ] Service のユニットテスト作成（`noteService.test.ts`）
- [ ] コンポーネント統合テスト作成（`[Feature].test.tsx`）

---

## 6. よくある質問

### Q1: Hook と Service の使い分けは？

**Answer:**

- **Hook (`use-[feature].ts`)**: React の状態・副作用を使う、複数コンポーネント間の共有ロジック
- **Service (`[feature]Service.ts`)**: 純粋な関数、API 統合、データ変換

```typescript
// Hook: React 依存
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchNotes().then(data => setNotes(data));
  }, []);

  return { notes, loading };
}

// Service: React 依存なし
export async function fetchNotes(): Promise<Note[]> {
  return await supabase.from('notes').select();
}
```

### Q2: Container と Page の違いは？

**Answer:**

- **Page (`[Feature]Page.tsx`)**: ページレベルのコンテナ。ユーザーストア、ページ全体の状態を管理
- **Container (`[Feature]Container.tsx`)**: ロジックコンテナ。複数の UI コンポーネントを組み立て、ローカル状態を管理

```typescript
// Page: ページ全体の状態
export function NotesPage() {
  const { user } = useUser(); // グローバル状態
  const { notes, fetchNotes } = useNotes(); // Hook
  return <NotesContainer notes={notes} />;
}

// Container: 部分的なロジック
export function NotesContainer({ notes }: Props) {
  const [filter, setFilter] = useState('all'); // ローカル状態
  const filtered = notes.filter(...);
  return <div>{filtered.map(...)}</div>;
}
```

### Q3: いつ Jotai を使うべき？

**Answer:**

- アプリケーション全体で共有する状態
- 複数ページで参照が必要
- ローカルストレージに保存したい

```typescript
// Jotai: グローバル状態
export const userAtom = atom<User | null>(null);

// useState: ローカル状態
const [filter, setFilter] = useState('all');

// Context API: 3階層以上深いコンポーネント間
const UserContext = createContext<User | null>(null);
```

---

## 🔗 関連ドキュメント

- [フロントエンド設計原則](./FRONTEND_DESIGN_PRINCIPLES.md)
- [React の使い方ガイド](./REACT_USAGE_GUIDE.md)
- [コード品質基準](../rules/code-quality-standards.md)
- [依存関係追跡ガイド](../rules/dependency-mapping.md)

---

**最終更新:** 2025-10-23
**作成者:** AI (GitHub Copilot)
