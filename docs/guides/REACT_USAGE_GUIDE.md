# React の使い方ガイド

**対象:** 全フロントエンド開発者
**最終更新:** 2025-10-23

---

## 概要

このドキュメントは、For All Learners プロジェクトにおける**React の使用方針**を定めます。

状態管理、コンポーネント設計、データフローに関する具体的なルールを通じて、チーム全体で一貫したコード品質を保つことを目的としています。

---

## 1. ページコンポーネントの責務

### 1-1. ページコンポーネント (`page.tsx`) の役割

**ページコンポーネント**は、Next.js のファイルベースルーティングで使用されるコンポーネントです。

**責務:**
- ✅ ページのルーティング定義
- ✅ コンテナコンポーネントのレンダリング
- ❌ ビジネスロジックの実装
- ❌ 状態管理
- ❌ API 呼び出し

### 1-2. 実装例

```typescript
// ✅ Good: page.tsx はコンポーネントをレンダリングするのみ
// app/(protected)/notes/page.tsx
import { NotesPage } from '@/components/notes';

export default function Page() {
  return <NotesPage />;
}
```

```typescript
// ❌ Bad: page.tsx でロジック・状態管理を実装
// app/(protected)/notes/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function Page() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchNotes() {
      setLoading(true);
      const { data } = await supabase.from('notes').select();
      setNotes(data);
      setLoading(false);
    }
    fetchNotes();
  }, []);

  return <div>{/* ... */}</div>;
}
```

### 1-3. ページコンポーネントの構成図

```
app/(protected)/notes/page.tsx (ページ)
  ↓
components/notes/NotesPage.tsx (ページコンテナ)
  ├→ useNotes() (Hook - ロジック)
  ├→ useUser() (グローバル状態)
  └→ <NotesContainer> (ロジックコンテナ)
      ├→ <NoteForm> (UI コンポーネント)
      └→ <NoteList> (UI コンポーネント)
```

---

## 2. コンポーネント階層と責務分離

### 2-1. Next.js Colocations パターン

**Next.js では、ページ固有のコンポーネントとロジックを `app/[feature]/` ディレクトリ内に配置します。**

**構造:**
```
app/(protected)/notes/
├── page.tsx                         # ✅ Display only
│   └── <Notes /> をレンダリング
├── components/
│   ├── Notes.tsx                    # ✅ Logic component
│   ├── NotesTable.tsx               # ✅ UI component
│   └── NoteFilters.tsx              # ✅ UI component
├── hooks/
│   └── use-note-filters.ts          # ✅ Page-specific logic
├── actions.ts                       # ✅ Server Actions
└── notes.module.css
```

### 2-2. Presentational Component（UI コンポーネント）

**特徴:**
- Props のみを受け取る
- 状態管理を持たない（またはローカル UI 状態のみ）
- 再利用可能
- テストしやすい

**命名:** `[Component].tsx`

**実装例:**

```typescript
// ✅ Good: UI コンポーネント（表示のみ）
// app/(protected)/notes/components/NoteCard.tsx
import type { Note } from '@/types/note.types';

interface NoteCardProps {
  note: Note;
  onDelete?: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return (
    <article className="card">
      <h3>{note.title}</h3>
      <p className="text-gray-600">{note.content}</p>
      <footer className="flex justify-between">
        <time>{new Date(note.createdAt).toLocaleDateString('ja-JP')}</time>
        {onDelete && (
          <button onClick={() => onDelete(note.id)}>削除</button>
        )}
      </footer>
    </article>
  );
}
```

### 2-3. Logic Component（ロジックコンポーネント）

**特徴:**
- ロジック、状態管理を担当
- Hook を使用して API 呼び出し・データ変換
- UI コンポーネントを組み立てる
- `'use client'` で Client Component 宣言

**命名:** `[Feature].tsx` (メイン)

**実装例:**

```typescript
// ✅ Good: ロジックコンポーネント（メイン）
// app/(protected)/notes/components/Notes.tsx
'use client';

import { useEffect } from 'react';
import { useNoteFilters } from '../hooks/use-note-filters';
import { createNote, fetchUserNotes } from '../actions';
import { NotesTable } from './NotesTable';
import { NoteFilters } from './NoteFilters';
import type { Note } from '@/types/note.types';

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const { filters, updateFilters } = useNoteFilters();

  // ページレベルのロジック：ノート一覧を取得
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

  // Server Action を呼び出す
  const handleCreateNote = async (noteData: CreateNoteInput) => {
    try {
      const newNote = await createNote(noteData);
      setNotes(prev => [...prev, newNote]);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <NoteFilters filters={filters} onChange={updateFilters} />
      <NotesTable notes={notes} onDelete={handleCreateNote} />
    </div>
  );
}
```

### 2-4. ページレイアウト（display-only）

```typescript
// ✅ Good: page.tsx はコンポーネントをレンダリングするのみ
// app/(protected)/notes/page.tsx
import { Notes } from './components/Notes';

export default function NotesPage() {
  return <Notes />;
}
```

### 2-5. 階層構造の図

```
page.tsx (Display only)
  ↓
Notes.tsx (Logic component)
  ├─ ページレベルの状態 (useState)
  ├─ ページレベルのロジック (Server Actions, API 呼び出し)
  ├─ use-note-filters.ts (Hook)
  └─ 子コンポーネントを組み立て
       ↓
      NotesTable.tsx (UI component)
      ├─ Props のみ使用
      └─ onDelete() で親に削除要求

      NoteFilters.tsx (UI component)
      ├─ Props のみ使用
      └─ onChange() で親にフィルター変更を通知
```

---

## 3. 状態管理の使い分け

### 3-1. 状態管理方針の比較表

| 状態の性質 | 保存場所 | ツール | 有効範囲 | 使用例 |
|----------|--------|-------|--------|--------|
| **ローカルUI状態** | コンポーネント内 | `useState` | そのコンポーネント | フォーム入力、表示/非表示 |
| **複数コンポーネント間で共有（3階層以下）** |親コンポーネント | `useState` + props | 親から子へ | ツールバー選択状態 |
| **複数コンポーネント間で共有（3階層以上）** | Context | `Context API` | 任意 | ユーザー認証情報の一部 |
| **アプリケーション全体で共有** | グローバルストア | `Jotai` | 全体 | ユーザー情報、テーマ |
| **サーバー状態（API レスポンス）** | Query キャッシュ | `React Query` | 全体 | データベースから取得したリスト |

### 3-2. useState パターン

#### 3-2-1. ローカル状態（そのコンポーネント内のみ）

```typescript
// ✅ Good: ローカル UI 状態
export function NoteForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setErrors({ title: 'Title is required' });
      return;
    }
    // 送信処理
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      {errors.title && <span>{errors.title}</span>}
    </form>
  );
}
```

#### 3-2-2. 親から子へ状態を共有（props 経由）

```typescript
// ✅ Good: 親が状態を管理、子に props で渡す
// components/notes/NotesContainer.tsx
export function NotesContainer({ notes }: Props) {
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <>
      <NoteList
        notes={notes}
        selectedId={selectedNoteId}
        onSelect={setSelectedNoteId}
      />
      <NoteDetail noteId={selectedNoteId} />
    </>
  );
}

// コンポーネントは props のみ使用
interface NoteListProps {
  notes: Note[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function NoteList({ notes, selectedId, onSelect }: NoteListProps) {
  return (
    <ul>
      {notes.map(note => (
        <li
          key={note.id}
          className={selectedId === note.id ? 'active' : ''}
          onClick={() => onSelect(note.id)}
        >
          {note.title}
        </li>
      ))}
    </ul>
  );
}
```

**原則:**
- 状態を必要とする最も親のコンポーネントで管理
- Props で子に値とコールバック関数を渡す
- 子コンポーネントはできるだけステートレスに

### 3-3. Context API パターン

**使用条件:**
- 3階層以上深いコンポーネント間での状態共有
- Props drilling を避けたい場合

```typescript
// ✅ Good: Context API で深いコンポーネント間の状態共有
// contexts/NoteFilterContext.tsx
import { createContext, useContext, useState, ReactNode } from 'react';

interface NoteFilterContextType {
  filter: string;
  setFilter: (filter: string) => void;
}

const NoteFilterContext = createContext<NoteFilterContextType | null>(null);

export function NoteFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState('all');

  return (
    <NoteFilterContext.Provider value={{ filter, setFilter }}>
      {children}
    </NoteFilterContext.Provider>
  );
}

export function useNoteFilter() {
  const context = useContext(NoteFilterContext);
  if (!context) {
    throw new Error('useNoteFilter must be used within NoteFilterProvider');
  }
  return context;
}

// 使用側
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <NoteFilterProvider>
      {children}
    </NoteFilterProvider>
  );
}

// 深いコンポーネント内
// components/notes/NoteFilter.tsx
import { useNoteFilter } from '@/contexts/NoteFilterContext';

export function NoteFilter() {
  const { filter, setFilter } = useNoteFilter();

  return (
    <select value={filter} onChange={(e) => setFilter(e.target.value)}>
      <option value="all">All</option>
      <option value="work">Work</option>
      <option value="personal">Personal</option>
    </select>
  );
}
```

### 3-4. Jotai パターン（グローバル状態）

**使用条件:**
- アプリケーション全体で共有する状態
- ユーザー認証、言語設定、テーマなど

```typescript
// ✅ Good: Jotai でグローバル状態管理
// stores/user.store.ts
import { atom } from 'jotai';
import type { User } from '@/types/user.types';

export const userAtom = atom<User | null>(null);
export const isAuthLoadingAtom = atom(false);

// Hook でラップ
export function useUserStore() {
  const [user, setUser] = useAtom(userAtom);
  const [isLoading, setIsLoading] = useAtom(isAuthLoadingAtom);

  return { user, setUser, isLoading, setIsLoading };
}

// 使用側
// components/UserProfile.tsx
import { useUserStore } from '@/stores/user.store';

export function UserProfile() {
  const { user } = useUserStore();

  if (!user) return <div>Not logged in</div>;

  return <div>{user.name}</div>;
}

// 任意のコンポーネントから、どの階層にいてもアクセス可能
// components/notes/NotesPage.tsx
export function NotesPage() {
  const { user } = useUserStore();

  // user は常に最新の値
  return <div>Hello, {user?.name}</div>;
}
```

### 3-5. React Query パターン（サーバー状態）

**使用条件:**
- データベースから取得したデータ
- API レスポンス
- キャッシング・自動更新が必要

```typescript
// ✅ Good: React Query でサーバー状態管理
// hooks/use-notes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUserNotes, createNote } from '@/lib/services/noteService';
import type { Note } from '@/types/note.types';

export function useNotes(userId: string) {
  const queryClient = useQueryClient();

  // Query: データ取得
  const {
    data: notes = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['notes', userId],
    queryFn: () => fetchUserNotes(userId),
    enabled: !!userId // userId がない場合は実行しない
  });

  // Mutation: データ作成
  const { mutate: addNote } = useMutation({
    mutationFn: createNote,
    onSuccess: (newNote) => {
      // キャッシュを自動更新
      queryClient.setQueryData(['notes', userId], (old: Note[]) => [
        ...old,
        newNote
      ]);
    }
  });

  return { notes, isLoading, error, addNote };
}
```

---

## 4. ロジック・型定義・UI の分離方法

### 4-1. ロジックの分離

#### パターン1: Hook に分離

複数のコンポーネントで使用するロジック → Hook

```typescript
// ✅ Good: ロジックを Hook に分離
// hooks/use-notes.ts
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async (userId: string) => {
    setLoading(true);
    try {
      const data = await fetchUserNotes(userId);
      setNotes(data);
    } finally {
      setLoading(false);
    }
  };

  return { notes, loading, fetchNotes };
}

// 複数のコンポーネントで再利用
// components/notes/NotesPage.tsx
export function NotesPage() {
  const { notes, loading, fetchNotes } = useNotes();
  // ...
}

// components/sidebar/NotesPreview.tsx
export function NotesPreview() {
  const { notes } = useNotes();
  // ...
}
```

#### パターン2: Service に分離

複数の API 呼び出しを組み合わせたロジック → Service

```typescript
// ✅ Good: ビジネスロジックを Service に分離
// lib/services/noteService.ts
export async function saveNoteWithTags(
  note: Note,
  tags: string[]
): Promise<Note> {
  // 1. Note を保存
  const savedNote = await supabase
    .from('notes')
    .insert([note])
    .select()
    .single();

  // 2. Tags を保存
  await Promise.all(
    tags.map(tag =>
      supabase.from('note_tags').insert({ note_id: savedNote.id, tag })
    )
  );

  return savedNote;
}

// Hook から Service を呼び出す
// hooks/use-notes.ts
export function useNotes() {
  const addNoteWithTags = async (note: Note, tags: string[]) => {
    const result = await saveNoteWithTags(note, tags);
    return result;
  };

  return { addNoteWithTags };
}
```

### 4-2. 型定義の分離

```typescript
// ✅ Good: 型を types ファイルに集約
// types/note.types.ts
export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

// 入力用の型（id や timestamp を除く）
export type CreateNoteInput = Omit<Note, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateNoteInput = Partial<CreateNoteInput>;

// フォーム用の型
export interface NoteFormData {
  title: string;
  content: string;
  category: string;
}

// Query パラメータ用の型
export interface NoteFetchParams {
  userId: string;
  category?: string;
  sortBy?: 'created_at' | 'updated_at';
}

// コンポーネントで使用
// components/notes/NoteForm.tsx
interface NoteFormProps {
  onSubmit: (data: NoteFormData) => Promise<void>;
}
```

### 4-3. UI の分離

```typescript
// ✅ Good: UI コンポーネントは Props のみ使用
// components/notes/NoteCard.tsx
import type { Note } from '@/types/note.types';

interface NoteCardProps {
  note: Note;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NoteCard({
  note,
  isSelected,
  onSelect,
  onDelete
}: NoteCardProps) {
  return (
    <article
      className={`card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect?.(note.id)}
    >
      <h3>{note.title}</h3>
      <p>{note.content}</p>
      <button onClick={() => onDelete?.(note.id)}>削除</button>
    </article>
  );
}

// ❌ Bad: ロジックを含む
export function NoteCardBad({ noteId }: Props) {
  const [note, setNote] = useState(null);

  useEffect(() => {
    // ロジックをコンポーネントに含める（再利用性が低い）
    supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .then(data => setNote(data));
  }, [noteId]);

  return <article>{/* ... */}</article>;
}
```

---

## 5. データフロー方向性の明確化

### 5-1. 単一方向データフロー

```
ユーザーイベント (クリック、入力)
  ↓
イベントハンドラー (handleClick, handleChange)
  ↓
状態更新 (setState)
  ↓
Hook から Service を呼び出し (async)
  ↓
API / Supabase 実行
  ↓
レスポンスを受け取り、状態に反映
  ↓
再レンダリング（Props が更新）
```

**実装例:**

```typescript
// components/notes/NotesPage.tsx
export function NotesPage() {
  const { user } = useUserStore();
  const { notes, loading, error, fetchNotes, addNote } = useNotes();

  // 1. マウント時にデータ取得
  useEffect(() => {
    if (user?.id) {
      fetchNotes(user.id); // async
    }
  }, [user?.id, fetchNotes]);

  // 2. フォーム送信ハンドラー
  const handleAddNote = async (formData: NoteFormData) => {
    try {
      await addNote({
        ...formData,
        userId: user!.id
      });
      // 自動的に notes が更新され、再レンダリング
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  // 3. 削除ハンドラー
  const handleDeleteNote = async (noteId: string) => {
    // ...
  };

  return (
    <NotesContainer
      notes={notes}
      loading={loading}
      error={error}
      onAddNote={handleAddNote}
      onDeleteNote={handleDeleteNote}
    />
  );
}
```

### 5-2. Props Drilling 回避

**問題:** Props Drilling（複数層を通して Props を渡す）

```typescript
// ❌ Bad: Props を何層も通す
// components/Level1.tsx
<Level2 selectedId={selectedId} onSelect={onSelect} />

// components/Level2.tsx
<Level3 selectedId={selectedId} onSelect={onSelect} />

// components/Level3.tsx
<Level4 selectedId={selectedId} onSelect={onSelect} />

// components/Level4.tsx (実際に使用)
<div onClick={() => onSelect(id)}>{selectedId}</div>
```

**解決策1: Context API**

```typescript
// ✅ Good: Context で直接アクセス
// contexts/SelectionContext.tsx
export const SelectionContext = createContext<SelectionContextType | null>(null);

export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) throw new Error('useSelection must be within Provider');
  return context;
}

// components/Level4.tsx
export function Level4() {
  const { selectedId, onSelect } = useSelection();
  return <div onClick={() => onSelect(id)}>{selectedId}</div>;
}
```

**解決策2: Jotai（アプリレベルの状態）**

```typescript
// ✅ Good: グローバル状態
// stores/selection.store.ts
export const selectedIdAtom = atom<string | null>(null);

// components/Level4.tsx
export function Level4() {
  const [selectedId, setSelectedId] = useAtom(selectedIdAtom);
  return <div onClick={() => setSelectedId(id)}>{selectedId}</div>;
}
```

---

## 6. コンポーネントのメモ化

### 6-1. React.memo

不要な再レンダリング防止のため、Props が変わらないコンポーネントはメモ化

```typescript
// ✅ Good: 頻繁に再レンダリングされる親の下にあるコンポーネント
interface NoteCardProps {
  note: Note;
  onDelete: (id: string) => void;
}

export const NoteCard = React.memo(function NoteCard({
  note,
  onDelete
}: NoteCardProps) {
  return (
    <article>
      <h3>{note.title}</h3>
      <button onClick={() => onDelete(note.id)}>削除</button>
    </article>
  );
});
```

### 6-2. useCallback

コールバック Props をメモ化

```typescript
// ✅ Good: コールバックをメモ化
export function NotesContainer({ notes }: Props) {
  const { removeNote } = useNotes();

  // handleDelete が再生成されない限り、NoteCard は再レンダリングされない
  const handleDelete = useCallback(
    (noteId: string) => {
      removeNote(noteId);
    },
    [removeNote]
  );

  return notes.map(note => (
    <NoteCard key={note.id} note={note} onDelete={handleDelete} />
  ));
}
```

### 6-3. useMemo

計算量の大きい処理をメモ化

```typescript
// ✅ Good: フィルタリング・ソート結果をメモ化
export function NotesContainer({ notes }: Props) {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('date');

  const filteredAndSorted = useMemo(() => {
    return notes
      .filter(note => filter === 'all' || note.category === filter)
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.title.localeCompare(b.title);
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }, [notes, filter, sortBy]);

  return <NoteList notes={filteredAndSorted} />;
}
```

---

## 7. Server Actions の使用方法

### 7-1. Server Actions とは

**Next.js の Server Actions** により、Client Component から直接サーバー関数を呼び出せます。

**特徴:**
- データベース操作が安全（API 層を経由しない）
- 認証情報にアクセス可能
- Client Component からシームレスに呼び出し
- 型安全性が保証される

### 7-2. Server Actions の配置場所

`app/[feature]/actions.ts` に配置

```typescript
// ✅ Good: Server Actions
// app/(protected)/notes/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase/server';
import type { Note, CreateNoteInput } from '@/types/note.types';

export async function fetchUserNotes(): Promise<Note[]> {
  const { data, error } = await supabase.from('notes').select('*');
  if (error) throw new Error(`Fetch failed: ${error.message}`);
  return data;
}

export async function createNote(input: CreateNoteInput): Promise<Note> {
  const { data, error } = await supabase
    .from('notes')
    .insert([input])
    .select()
    .single();

  if (error) throw new Error(`Create failed: ${error.message}`);

  // キャッシュを再検証
  revalidatePath('/notes');

  return data;
}

export async function deleteNote(noteId: string): Promise<void> {
  const { error } = await supabase.from('notes').delete().eq('id', noteId);

  if (error) throw new Error(`Delete failed: ${error.message}`);

  revalidatePath('/notes');
}
```

### 7-3. Client Component から Server Actions を呼び出し

```typescript
// ✅ Good: Logic Component から Server Action を呼び出し
// app/(protected)/notes/components/Notes.tsx
'use client';

import { useState, useCallback } from 'react';
import { createNote, deleteNote, fetchUserNotes } from '../actions';
import { NotesTable } from './NotesTable';
import type { Note, CreateNoteInput } from '@/types/note.types';

export function Notes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);

  // Server Action を呼び出す
  const handleFetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserNotes();
      setNotes(data);
    } catch (error) {
      console.error('Fetch failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateNote = useCallback(async (input: CreateNoteInput) => {
    try {
      const newNote = await createNote(input);
      setNotes(prev => [...prev, newNote]);
    } catch (error) {
      console.error('Create failed:', error);
    }
  }, []);

  const handleDeleteNote = useCallback(async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  }, []);

  return (
    <div className="space-y-4">
      <button onClick={handleFetchNotes} disabled={loading}>
        {loading ? 'Loading...' : 'Refresh'}
      </button>
      <NotesTable
        notes={notes}
        onDelete={handleDeleteNote}
      />
    </div>
  );
}
```

### 7-4. Server Action vs Client-side Fetch

| 項目 | Server Action | Client-side Fetch |
|------|--------------|------------------|
| **実行場所** | サーバー | ブラウザ |
| **認証** | 自動でセッション取得 | 手動で token を管理 |
| **型安全性** | ✅ 完全 | ⚠️ fetch の戻り値型は any |
| **セキュリティ** | ✅ DB credentials 安全 | ❌ API キーが見える可能性 |
| **キャッシュ再検証** | ✅ `revalidatePath()` で簡単 | ❌ 複雑な手動管理 |
| **使用例** | DB 操作、ファイルアップロード | リアルタイムデータ、WebSocket |

**推奨**: データベース操作は Server Action を使用

### 7-5. Server Action でのエラーハンドリング

```typescript
// ✅ Good: エラーハンドリング
'use server';

export async function createNote(input: CreateNoteInput): Promise<Note> {
  try {
    // バリデーション
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('タイトルは必須です');
    }

    // DB 操作
    const { data, error } = await supabase
      .from('notes')
      .insert([input])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('このノートは既に存在します');
      }
      throw new Error(`作成に失敗しました: ${error.message}`);
    }

    revalidatePath('/notes');
    return data;
  } catch (err) {
    // ユーザーフレンドリーなエラーメッセージ
    const message = err instanceof Error ? err.message : '予期しないエラーが発生しました';
    throw new Error(message);
  }
}

// Client Component での使用
const handleCreateNote = async (input: CreateNoteInput) => {
  try {
    await createNote(input);
  } catch (error) {
    // Server Action からスローされたエラーを catch
    const message = error instanceof Error ? error.message : 'エラーが発生しました';
    alert(message);
  }
};
```

### 7-6. Server Action + Client State の組み合わせ

複雑な UI ロジックが必要な場合、Server Action と Client State を組み合わせます:

```typescript
// ✅ Good: 複雑なロジック
'use client';

import { useOptimistic, useTransition } from 'react';
import { deleteNote } from '../actions';

export function NoteList({ notes }: Props) {
  const [optimisticNotes, removeOptimisticNote] = useOptimistic(
    notes,
    (state, noteId: string) => state.filter(n => n.id !== noteId)
  );
  const [isPending, startTransition] = useTransition();

  const handleDelete = (noteId: string) => {
    // Optimistic update: 即座に UI を更新
    startTransition(async () => {
      removeOptimisticNote(noteId);
      try {
        await deleteNote(noteId);
      } catch (error) {
        // エラー時は自動的にロールバック
        console.error(error);
      }
    });
  };

  return (
    <ul>
      {optimisticNotes.map(note => (
        <li key={note.id}>
          {note.title}
          <button onClick={() => handleDelete(note.id)} disabled={isPending}>
            削除
          </button>
        </li>
      ))}
    </ul>
  );
}
```

---

## 8. カスタムフックの設計ルール

### 8-1. 単一責任の原則

1 つの Hook は 1 つのロジックのみを担当

```typescript
// ✅ Good: 単一責任
// hooks/use-notes.ts
export function useNotes() {
  const [notes, setNotes] = useState([]);
  // Note 取得・作成・削除のみ
  return { notes, addNote, removeNote };
}

// hooks/use-note-filter.ts
export function useNoteFilter() {
  const [filter, setFilter] = useState('all');
  // フィルタリングのみ
  return { filter, setFilter };
}

// ❌ Bad: 責任が多すぎる
export function useNoteManager() {
  const [notes, setNotes] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedId, setSelectedId] = useState(null);
  // 複数の責務 → 分割すべき
  return { notes, filter, sortBy, selectedId, /* ... */ };
}
```

### 8-2. Hook の戻り値の型付け

```typescript
// ✅ Good: 明確な戻り値型
// hooks/use-notes.ts
interface UseNotesReturn {
  notes: Note[];
  loading: boolean;
  error: string | null;
  fetchNotes: (userId: string) => Promise<void>;
  addNote: (note: CreateNoteInput) => Promise<Note>;
  removeNote: (noteId: string) => Promise<void>;
}

export function useNotes(): UseNotesReturn {
  // ...
}
```

### 8-3. 依存配列の明示

```typescript
// ✅ Good: 依存配列を明確に
export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  const fetchNotes = useCallback(async () => {
    const data = await fetchUserNotes(userId);
    setNotes(data);
  }, [userId]); // userId が変わったら再生成

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes, userId]); // 依存関係を明示

  return { notes, fetchNotes };
}
```

---

## 9. よくある質問

### Q1: Hook と Service の違いは？

**Answer:**

| Hook | Service |
|------|---------|
| React の state・effect に依存 | React に依存しない |
| コンポーネント内で呼び出し | Hook や Service から呼び出し |
| 複数 API の調整 + 状態管理 | 複数 API の調整のみ |

```typescript
// Hook: React 依存
export function useNotes() {
  const [notes, setNotes] = useState([]);
  useEffect(() => { /* 初期化 */ }, []);
  return { notes };
}

// Service: 純粋な関数
export async function fetchNotes(userId: string) {
  return await supabase.from('notes').select();
}
```

### Q2: ローカル状態と グローバル状態の判断基準は？

**Answer:**

- **ローカル状態**: そのコンポーネント内でのみ使用 → `useState`
- **複数コンポーネント（3階層以下）**: 親から子へ props で共有 → `useState` + props
- **複数コンポーネント（3階層以上）**: Context で共有 → `Context API`
- **アプリケーション全体**: → `Jotai`
- **サーバー状態**: キャッシング必要 → `React Query`

### Q3: Props が深くなった場合はどうする？

**Answer:**

```typescript
// ❌ Before: Props Drilling
<A prop1={x} prop2={y} prop3={z}>
  <B prop1={x} prop2={y} prop3={z}>
    <C prop1={x} prop2={y} prop3={z} />
  </B>
</A>

// ✅ After: Context API
<Provider value={{ prop1: x, prop2: y, prop3: z }}>
  <A>
    <B>
      <C />
    </B>
  </A>
</Provider>
```

### Q4: コンポーネントをいつメモ化すべき？

**Answer:**

以下の場合はメモ化を検討：

1. 頻繁に再レンダリングされる親の下にある
2. Props が複雑で計算量が多い
3. 子コンポーネントが重い（アニメーション、大量描画など）

```typescript
// 確認方法: React DevTools Profiler で無駄な再レンダリングを検出
// 実測値が重要 → まず実装、問題が出たら最適化
```

---

## 10. チェックリスト

### コンポーネント設計

- [ ] ページコンポーネント（`page.tsx`）はレンダリングのみか
- [ ] ロジックはコンテナコンポーネント（`Page.tsx`, `Container.tsx`）に分離か
- [ ] UI コンポーネントは Props のみを使用しているか
- [ ] 不要な state を持っていないか

### 状態管理

- [ ] ローカル UI 状態は `useState` を使用しているか
- [ ] グローバル状態は Jotai を使用しているか
- [ ] Props Drilling がないか（3階層以上の場合 Context/Jotai を検討）
- [ ] サーバー状態は React Query でキャッシングしているか

### ロジック分離

- [ ] API 呼び出しはフック/サービスに分離しているか
- [ ] 複数コンポーネントで共有するロジックはフック化しているか
- [ ] 複数 API 統合は Service に分離しているか

### 型定義

- [ ] `types/[feature].types.ts` に型定義をまとめているか
- [ ] Props インターフェースは明確か
- [ ] `any` 型を使用していないか

### パフォーマンス

- [ ] 不必要な再レンダリングがないか（React.memo, useCallback）
- [ ] 計算量の大きい処理をメモ化しているか（useMemo）
- [ ] 依存配列は正確か

---

## 🔗 関連ドキュメント

- [機能別ディレクトリ構造ガイド](./DIRECTORY_STRUCTURE.md)
- [フロントエンド設計原則](./FRONTEND_DESIGN_PRINCIPLES.md)
- [コード品質基準](../rules/code-quality-standards.md)
- [言語規則](../rules/language-rules.md)

---

**最終更新:** 2025-10-23
**作成者:** AI (GitHub Copilot)
