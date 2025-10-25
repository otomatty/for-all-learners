# React 設計ガイド補足：推奨ルール

**対象:** 全フロントエンド開発者
**最終更新:** 2025-10-23

---

## 概要

このドキュメントは、[React の使い方ガイド](./REACT_USAGE_GUIDE.md) を補完するものです。

実装時に守るべき追加のルールと、実装の落とし穴、ベストプラクティスをまとめています。

---

## 1. コンポーネントメモ化ルール

### 1-1. コンポーネントのメモ化が「必須」な場合

```typescript
// ✅ MUST: 親がしょっちゅう再レンダリングされる場合
export const NoteCard = React.memo(function NoteCard({ note }: Props) {
  console.log('Rendered:', note.id); // 不要な再レンダリングをキャッチ
  return <article>{note.title}</article>;
});

// 親が頻繁に再レンダリング
export function NotesList() {
  const [searchTerm, setSearchTerm] = useState('');
  // searchTerm が変わるたびに親が再レンダリング
  // → 子の NoteCard も一緒に再レンダリング（不要）
  return (
    <>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      <NoteCard note={selectedNote} /> {/* memo で防ぐ */}
    </>
  );
}
```

### 1-2. メモ化が「不要」な場合

```typescript
// ❌ Don't: 親が再レンダリングされない場合
export const SimpleButton = React.memo(function SimpleButton(props: Props) {
  return <button>{props.label}</button>;
});

// 例: 親コンポーネントが変わらない場合
export function Form() {
  // state が変わらないため親は再レンダリングされない
  return (
    <form>
      <input /> {/* 入力フィールドは自身の state で管理 */}
      <SimpleButton label="Submit" /> {/* memo は不要 */}
    </form>
  );
}
```

### 1-3. Props の比較に注意

```typescript
// ❌ 危険: オブジェクト Props は毎回新規作成される
export function Parent() {
  return <Child obj={{ a: 1, b: 2 }} />; // 毎回新規オブジェクト
}

export const Child = React.memo(function Child({ obj }: Props) {
  // memo があっても obj が新規作成されるため、毎回比較が false になる
  return <div>{obj.a}</div>;
});

// ✅ 修正1: 親で useMemo
export function Parent() {
  const obj = useMemo(() => ({ a: 1, b: 2 }), []);
  return <Child obj={obj} />;
}

// ✅ 修正2: 分割して渡す
export function Parent() {
  return <Child a={1} b={2} />;
}
```

---

## 2. useCallback の使い分け

### 2-1. useCallback が「必須」な場合

```typescript
// ✅ MUST: メモ化した子コンポーネントにコールバック Props を渡す
export function Parent() {
  const handleDelete = useCallback(
    (id: string) => {
      removeNote(id);
    },
    [removeNote]
  );

  return (
    <>
      {notes.map(note => (
        <MemoizedNoteCard
          key={note.id}
          note={note}
          onDelete={handleDelete} // 毎回同じ関数参照 → 子の再レンダリングを防ぐ
        />
      ))}
    </>
  );
}
```

### 2-2. useCallback が「不要」な場合

```typescript
// ❌ Don't: 子が memo 化されていない場合
export function Parent() {
  const handleDelete = useCallback((id: string) => {
    removeNote(id);
  }, [removeNote]);

  return (
    <>
      {notes.map(note => (
        <NoteCard // memo なし
          key={note.id}
          note={note}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
}

// ❌ Don't: 依存配列が常に変わる場合
export function Parent() {
  const handleDelete = useCallback(
    (id: string) => {
      removeNote(id, timestamp); // timestamp が依存配列に入る
    },
    [removeNote, timestamp] // timestamp が毎回変わる → 毎回新規作成
  );

  return <Child onDelete={handleDelete} />;
}
```

---

## 3. TypeScript 型定義のベストプラクティス

### 3-1. Props インターフェースの命名規則

```typescript
// ✅ Good: コンポーネント名 + Props
interface NoteCardProps {
  note: Note;
  onDelete?: (id: string) => void;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  return <article>{note.title}</article>;
}

// ❌ Bad: 命名が曖昧
interface Props {
  note: Note;
}
```

### 3-2. 関数型の定義

```typescript
// ✅ Good: 型エイリアスで定義
type NoteChangeHandler = (note: Note) => void;
type NoteFetchParams = {
  userId: string;
  category?: string;
};

interface NoteFormProps {
  onSubmit: NoteChangeHandler;
}

// ❌ Bad: 型を展開
interface NoteFormProps {
  onSubmit: (note: Note) => void;
}
```

### 3-3. 型の再利用・拡張

```typescript
// ✅ Good: Utility Types で拡張
interface Note {
  id: string;
  title: string;
  content: string;
}

// 入力時は id を除く
type CreateNoteInput = Omit<Note, 'id'>;

// API レスポンス（タイムスタンプを追加）
type NoteResponse = Note & {
  createdAt: string;
  updatedAt: string;
};

// 部分更新
type UpdateNoteInput = Partial<CreateNoteInput>;
```

### 3-4. React 固有の型

```typescript
// ✅ Good: React 型を適切に使用
import type { ReactNode, FC } from 'react';

// 子要素を受け取る場合
interface ContainerProps {
  children: ReactNode;
}

// HTML 属性を拡張する場合
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function CustomButton({
  variant = 'primary',
  children,
  ...rest
}: CustomButtonProps) {
  return <button className={variant} {...rest}>{children}</button>;
}
```

---

## 4. エラーハンドリングルール

### 4-1. Hook でのエラーハンドリング

```typescript
// ✅ Good: エラー状態を管理
export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchNotes = async (userId: string) => {
    setLoading(true);
    setError(null); // 前回のエラーをクリア

    try {
      const data = await fetchUserNotes(userId);
      setNotes(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      console.error('Failed to fetch notes:', err);
    } finally {
      setLoading(false);
    }
  };

  return { notes, loading, error, fetchNotes };
}
```

### 4-2. コンポーネントでのエラーハンドリング

```typescript
// ✅ Good: エラーメッセージを表示
export function NotesPage() {
  const { notes, loading, error } = useNotes();

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load notes: {error}
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (notes.length === 0) {
    return <Empty message="No notes found" />;
  }

  return <NotesList notes={notes} />;
}
```

### 4-3. Service でのエラーハンドリング

```typescript
// ✅ Good: 詳細なエラー情報を提供
export class NoteServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number
  ) {
    super(message);
  }
}

export async function fetchUserNotes(userId: string): Promise<Note[]> {
  try {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new NoteServiceError(
        `Failed to fetch notes: ${error.message}`,
        'FETCH_ERROR',
        400
      );
    }

    if (!data) {
      throw new NoteServiceError(
        'No data returned from server',
        'NO_DATA',
        500
      );
    }

    return data;
  } catch (err) {
    if (err instanceof NoteServiceError) {
      throw err;
    }
    throw new NoteServiceError(
      err instanceof Error ? err.message : 'Unknown error',
      'UNKNOWN_ERROR'
    );
  }
}
```

---

## 5. カスタムフック設計ルール

### 5-1. Hook の命名規則

```typescript
// ✅ Good: use で始まる
export function useNotes() {}
export function useAuth() {}
export function usePagination() {}
export function useLocalStorage() {}

// ❌ Bad: use で始まらない（React Rule of Hooks に違反）
export function fetchNotes() {} // 関数に見える
export function handleNoteCreate() {} // Hook のように見えない
```

### 5-2. Hook の dependencies に注意

```typescript
// ✅ Good: 依存配列を明確に
export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  const fetchNotes = useCallback(async () => {
    const data = await fetchUserNotes(userId);
    setNotes(data);
  }, [userId]); // userId が変わったら再実行

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]); // fetchNotes が変わったら再実行

  return { notes, fetchNotes };
}

// ❌ Bad: 依存配列を省略したり、不完全
export function useNotes(userId: string) {
  const [notes, setNotes] = useState<Note[]>([]);

  useEffect(() => {
    const fetchNotes = async () => {
      const data = await fetchUserNotes(userId);
      setNotes(data);
    };
    fetchNotes();
  }, []); // userId を依存配列から省略 → バグの原因
}
```

### 5-3. Hook の条件付き呼び出しは禁止

```typescript
// ❌ Bad: 条件付き Hook（React Rule of Hooks 違反）
export function Component({ shouldFetch }: Props) {
  if (shouldFetch) {
    const { notes } = useNotes(); // ❌ 条件付き呼び出し
  }
}

// ✅ Good: Hook は常に呼び出す、条件は内側で
export function Component({ shouldFetch }: Props) {
  const { notes } = useNotes(); // 常に呼び出す

  if (!shouldFetch) {
    return null;
  }

  return <div>{notes}</div>;
}
```

---

## 6. Props Drilling 回避パターン

### 6-1. Compound Components パターン

複数のコンポーネントが緊密に関連している場合

```typescript
// ✅ Good: Compound Components で Props を集約
// components/Tabs/index.ts
export function Tabs({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState(0);
  return (
    <TabContext.Provider value={{ activeTab, setActiveTab }}>
      {children}
    </TabContext.Provider>
  );
}

export function TabsList({ children }: Props) {
  return <div className="tabs-list">{children}</div>;
}

export function TabsTrigger({ value, children }: Props) {
  const { activeTab, setActiveTab } = useContext(TabContext);
  return (
    <button
      className={activeTab === value ? 'active' : ''}
      onClick={() => setActiveTab(value)}
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: Props) {
  const { activeTab } = useContext(TabContext);
  return activeTab === value && <div>{children}</div>;
}

// 使用側
export function Page() {
  return (
    <Tabs>
      <TabsList>
        <TabsTrigger value={0}>Tab 1</TabsTrigger>
        <TabsTrigger value={1}>Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value={0}>Content 1</TabsContent>
      <TabsContent value={1}>Content 2</TabsContent>
    </Tabs>
  );
}
```

### 6-2. Render Props パターン

柔軟なコンポーネント構成が必要な場合

```typescript
// ✅ Good: Render Props で状態を渡す
interface ListRenderProps<T> {
  items: T[];
  isLoading: boolean;
  error: string | null;
}

interface ListProps<T> {
  fetcher: () => Promise<T[]>;
  children: (props: ListRenderProps<T>) => React.ReactNode;
}

export function List<T>({ fetcher, children }: ListProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await fetcher();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetcher]);

  return children({ items, isLoading, error });
}

// 使用側
export function NotesList() {
  return (
    <List fetcher={() => fetchUserNotes(userId)}>
      {({ items, isLoading, error }) => (
        <>
          {isLoading && <Skeleton />}
          {error && <Alert>{error}</Alert>}
          {items.map(item => <NoteCard key={item.id} note={item} />)}
        </>
      )}
    </List>
  );
}
```

---

## 7. パフォーマンス最適化チェックリスト

### 7-1. 再レンダリング最適化

- [ ] 不要な state がないか（ローカル state と グローバル state の区別）
- [ ] memo 化すべきコンポーネントが逃してないか
- [ ] useCallback / useMemo が必要なケースで使用しているか
- [ ] 依存配列は正確か

### 7-2. バンドルサイズ最適化

- [ ] 大きなコンポーネントは動的インポートしているか
- [ ] 不要なライブラリをインポートしていないか

```typescript
// ✅ Good: 動的インポート
const HeavyEditor = dynamic(() => import('@/components/HeavyEditor'), {
  loading: () => <Skeleton />
});
```

### 7-3. API 呼び出し最適化

- [ ] React Query / SWR でキャッシングしているか
- [ ] リクエスト deduplication されているか
- [ ] ページング・無限スクロール実装しているか

---

## 8. よくある間違いと修正

### 8-1. 無限ループ

```typescript
// ❌ Bad: 依存配列がない → 毎レンダリングで実行
export function Component() {
  useEffect(() => {
    fetchData();
  }); // 依存配列なし
}

// ✅ Good: 依存配列を明記
export function Component() {
  useEffect(() => {
    fetchData();
  }, []); // マウント時のみ実行
}
```

### 8-2. Stale Closure

```typescript
// ❌ Bad: count の古い値を参照
export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count); // 常に 0 を出力
    }, 1000);
    return () => clearInterval(interval);
  }, []); // count を依存配列から除外
}

// ✅ Good: 依存配列に count を含める
export function Counter() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      console.log(count); // 最新の count を出力
    }, 1000);
    return () => clearInterval(interval);
  }, [count]); // count を依存配列に含める
}
```

### 8-3. Ref の誤用

```typescript
// ❌ Bad: ref に state のように使用
export function Component() {
  const ref = useRef(0);

  const handleClick = () => {
    ref.current++;
    console.log(ref.current); // 画面は更新されない
  };
}

// ✅ Good: state が必要な場合は useState
export function Component() {
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1); // 画面が更新される
  };
}

// ✅ Good: DOM 操作のために ref を使用
export function Component() {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    inputRef.current?.focus();
  };

  return <input ref={inputRef} />;
}
```

---

## 9. テスト戦略

### 9-1. Hook のテスト

```typescript
// ✅ Good: renderHook でテスト
import { renderHook, act } from '@testing-library/react';
import { useNotes } from '@/hooks/use-notes';

describe('useNotes', () => {
  it('should fetch notes on mount', async () => {
    const { result } = renderHook(() => useNotes());

    await act(async () => {
      await result.current.fetchNotes('user-123');
    });

    expect(result.current.notes.length).toBeGreaterThan(0);
  });
});
```

### 9-2. コンポーネントのテスト

```typescript
// ✅ Good: ユーザーの視点からテスト
import { render, screen } from '@testing-library/react';
import { NoteCard } from '@/components/NoteCard';

describe('NoteCard', () => {
  it('should display note title', () => {
    const note = { id: '1', title: 'Test Note', content: 'Content' };
    render(<NoteCard note={note} />);

    expect(screen.getByText('Test Note')).toBeInTheDocument();
  });

  it('should call onDelete when delete button is clicked', () => {
    const handleDelete = jest.fn();
    const note = { id: '1', title: 'Test', content: 'Content' };

    render(<NoteCard note={note} onDelete={handleDelete} />);

    screen.getByRole('button', { name: /delete/i }).click();

    expect(handleDelete).toHaveBeenCalledWith('1');
  });
});
```

---

## 10. デバッグ Tips

### 10-1. React DevTools Profiler

```typescript
// 1. Chrome Extension: React Developer Tools をインストール
// 2. DevTools → Profiler タブを開く
// 3. 記録開始 → アクション実行 → 分析

// 無駄な再レンダリングをチェック：
// - グラフで「何がレンダリングされているか」を確認
// - render time と commit time を確認
// - Props の変更を追跡
```

### 10-2. Console.log の活用

```typescript
// ✅ Good: レンダリングをトラッキング
export const NoteCard = React.memo(function NoteCard({ note }: Props) {
  console.log('NoteCard rendered:', note.id); // いつ実行されるか確認

  return <article>{note.title}</article>;
});
```

### 10-3. useDeferredValue でレンダリング最適化をテスト

```typescript
// ✅ Good: 高速な入力と遅い検索結果の同期
export function SearchNotes() {
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const results = useMemo(
    () => performSlowSearch(deferredSearchTerm),
    [deferredSearchTerm]
  );

  return (
    <>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <Results results={results} />
    </>
  );
}
```

---

## 🔗 関連ドキュメント

- [React の使い方ガイド](./REACT_USAGE_GUIDE.md)
- [機能別ディレクトリ構造ガイド](./DIRECTORY_STRUCTURE.md)
- [コード品質基準](../rules/code-quality-standards.md)

---

**最終更新:** 2025-10-23
**作成者:** AI (GitHub Copilot)
