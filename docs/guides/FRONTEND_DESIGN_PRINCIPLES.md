# フロントエンド設計原則

**関連ドキュメント**: `docs/README.md`, `.github/pull_request_template.md`

---

## 目的

このドキュメントは、For All Learners プロジェクトにおけるフロントエンド実装の指針となる「憲法」です。

全ての設計判断、実装方針、コードレビュー時の判断基準となります。

---

## 1. 全体アーキテクチャの方針

### 採用思想: 関心の分離 + Clean Architecture

**基本的な考え方**:

フロントエンドアーキテクチャは、以下の層に分離します：

```
UI Layer (Components)
    ↓ (props, callbacks)
Logic Layer (Hooks, Services)
    ↓ (API calls)
Data Layer (Supabase, External APIs)
```

**理由**:

1. **テスト可能性**: ロジックをUIから分離することで、ロジックのテストが容易になる
2. **再利用性**: 同じロジックを複数のコンポーネントで再利用できる
3. **保守性**: 各層の責務が明確であり、変更の影響範囲を限定できる
4. **スケーラビリティ**: 複雑な機能を追加する際に、既存のアーキテクチャを拡張できる

---

## 2. ディレクトリ構成と責務定義

### ディレクトリツリー

```
/app                    → Next.js App Router (ページ・レイアウト)
  /api                  → API Route (バックエンド処理)
  /auth                 → 認証関連ページ
  /(protected)          → ログイン必須ページ
  /(public)             → 公開ページ

/components             → React コンポーネント
  /ui                   → UI プリミティブ (Button, Input など)
  /goals                → 機能別コンポーネント (Goals 機能の各コンポーネント)
  /[feature]            → 機能別ディレクトリ

/hooks                  → カスタムフック (ロジック層)
  use-navigation.ts     → ページ遷移関連
  use-mobile.tsx        → レスポンシブ判定
  useGenerateQuestions.ts → 問題生成ロジック

/lib                    → ユーティリティ・サービス層
  /gemini               → AI API (Gemini) 統合
  /supabase             → Supabase クライアント
  /services             → ビジネスロジック (複数の API 呼び出しなど)
  /utils                → ヘルパー関数
  gemini.ts             → Gemini API の共通処理
  logger.ts             → ログ出力

/stores                 → 状態管理 (Jotai)
  user.ts               → ユーザー状態

/types                  → TypeScript 型定義

/database               → データベーススキーマ・マイグレーション
  schema.sql            → Supabase スキーマ
  migrations/           → マイグレーション
```

### 各層の責務

| レイヤー | 場所 | 責務 | 依存関係 |
|--------|------|------|--------|
| **UI Layer** | `/components` | 画面表示、ユーザー入力の受け取り | UI専用。ビジネスロジックは持たない |
| **Logic Layer** | `/hooks`, `/lib/services` | ビジネスロジック、データ変換、API呼び出し調整 | Data Layer に依存 |
| **Data Layer** | `/lib/supabase`, `/lib/gemini`, `/stores` | 外部API・DB とのやり取り | 下位層には依存しない |

---

## 3. コンポーネント設計方針

### 3-1. Presentational vs Container パターン

#### Presentational Component（プレゼンテーションコンポーネント）

**特徴**:
- Props のみを受け取り、UI を描画する
- 状態管理を持たない（またはローカル UI 状態のみ）
- 再利用可能
- テストしやすい

**命名規則**: PascalCase、`Component.tsx`

**例**:
```typescript
// ✓ Good: Presentational Component
export function TagInput({
  value,
  onChange,
  onAdd,
  placeholder
}: TagInputProps) {
  return (
    <div>
      <input value={value} onChange={onChange} placeholder={placeholder} />
      <button onClick={onAdd}>追加</button>
    </div>
  );
}
```

#### Container Component（コンテナコンポーネント）

**特徴**:
- ロジック、状態管理を担当
- Presentational コンポーネントを組み立てる
- テストが難しい場合がある

**命名規則**: PascalCase、しばしば `[Feature]Page.tsx` または `[Feature]Container.tsx`

**例**:
```typescript
// ✓ Good: Container Component
export function NoteEditorContainer() {
  const [tags, setTags] = useState<string[]>([]);
  const { addTag } = useTags();

  const handleAdd = async (tag: string) => {
    await addTag(tag);
    setTags([...tags, tag]);
  };

  return <NoteEditor tags={tags} onAddTag={handleAdd} />;
}
```

### 3-2. 関心の分離（UIとロジックの分離）

#### ロジックをカスタムフックに切り出す

複数のコンポーネントで同じロジックが使われる場合、または複雑なロジックがある場合は、カスタムフックに切り出します。

**命名規則**: `use` で始まる、camelCase

**例**:
```typescript
// hooks/useTags.ts
export function useTags() {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addTag = async (tag: string) => {
    try {
      setIsLoading(true);
      const result = await supabase
        .from('tags')
        .insert({ name: tag });
      setTags([...tags, tag]);
    } catch (err) {
      setError('タグの追加に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return { tags, addTag, isLoading, error };
}

// components/TagManagement.tsx (複数箇所で再利用)
export function TagManagement() {
  const { tags, addTag } = useTags();
  return <TagUI tags={tags} onAdd={addTag} />;
}
```

#### ビジネスロジックをサービス層に切り出す

複数のAPI呼び出しを組み合わせた複雑なロジックは、`lib/services/` に配置します。

**命名規則**: `[feature]Service.ts`

**例**:
```typescript
// lib/services/noteService.ts
export async function saveNoteWithTags(note: Note, tags: string[]) {
  // 1. Note を保存
  const savedNote = await supabase.from('notes').insert(note).single();
  
  // 2. Tags を保存
  await Promise.all(
    tags.map(tag =>
      supabase.from('note_tags').insert({
        note_id: savedNote.id,
        tag_name: tag
      })
    )
  );
  
  return savedNote;
}
```

### 3-3. Props の命名規則

**原則**:
- 明確で意図が分かる名前
- 動作を表すコールバック Props は `on` で始まる

**例**:
```typescript
// ✓ Good
interface ButtonProps {
  label: string;
  onClick: () => void;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// ✗ Bad: 曖昧
interface ButtonProps {
  text: string;      // label でより明確に
  handleClick: () => void;  // onClick が慣例
  loading?: boolean;  // isLoading で統一
}
```

---

## 4. 状態管理の方針

### 4-1. 状態の分類と保存場所

| 状態の種類 | 保存場所 | 例 | ツール |
|---------|--------|-----|-------|
| **ローカルUI状態** | コンポーネント内 | フォーム入力、表示/非表示、折りたたみ | `useState` |
| **フェッチ中の状態** | カスタムフック | API 呼び出し中フラグ、エラー | `useState` |
| **ユーザー認証** | グローバル状態 | ユーザーID、ロール、プロフィール | Jotai + Supabase |
| **キャッシュ** | API キャッシュ層 | API レスポンスの一時保存 | React Query / SWR |

### 4-2. グローバル状態の原則

**最小化**:
- グローバル状態は「複数のページ・コンポーネントから参照される状態」のみ
- 過度にグローバル状態を増やさない

**例**:
```typescript
// ✓ Good: ユーザーはグローバルで必要
// stores/user.ts
export const useUserStore = create((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

// ✗ Bad: これはコンポーネント内で管理すべき
export const useModalStore = create((set) => ({
  isOpen: false,
  setIsOpen: (isOpen) => set({ isOpen }),
}));
```

### 4-3. Server State vs Client State の区別

**Server State** (Supabase のデータ):
- 複数タブ間での同期が必要
- React Query や SWR で管理することを検討

**Client State** (UI の状態):
- ローカルの `useState` で十分

---

## 5. データフローの方向性

### 単一方向データフロー

**基本的なフロー**:

```
User Event (e.g., click)
    ↓
Event Handler (コンポーネント)
    ↓
State Update (Hook)
    ↓
API Call (Service)
    ↓
Data Update
    ↓
Re-render (State 経由で Props 更新)
```

**原則**:
- データは親から子へ Props で渡す
- 子から親への通知はコールバック Props で行う
- 双方向バインディングは使用しない

---

## 6. 非機能要件への対応

### 6-1. パフォーマンス最適化

#### 不要な再レンダリングの防止

```typescript
// ✓ Good: React.memo を使用
const TagList = React.memo(function TagList({ tags, onRemove }: Props) {
  return (
    <ul>
      {tags.map(tag => (
        <TagItem key={tag.id} tag={tag} onRemove={onRemove} />
      ))}
    </ul>
  );
});

// ✓ Good: useCallback でコールバックをメモ化
export function NoteEditor() {
  const handleAddTag = useCallback((tag: string) => {
    // ...
  }, []); // 依存配列を明示

  return <TagInput onAdd={handleAddTag} />;
}
```

#### コード分割

```typescript
// ✓ Good: 大規模コンポーネントは動的インポート
const HeavyEditor = dynamic(
  () => import('@/components/HeavyEditor'),
  { loading: () => <Skeleton /> }
);
```

### 6-2. アクセシビリティ (a11y)

#### 基本的な対応

```typescript
// ✓ Good: aria-* 属性の使用
export function IconButton({ icon, label, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {icon}
    </button>
  );
}

// ✓ Good: キーボード操作に対応
export function TagInput({ onAdd }: Props) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onAdd(e.currentTarget.value);
      e.currentTarget.value = '';
    }
  };

  return <input onKeyDown={handleKeyDown} />;
}
```

#### スクリーンリーダー対応

- form には label を付ける
- 画像には alt 属性を付ける
- ランドマーク要素（`<main>`, `<nav>`, `<aside>`）を適切に使用

### 6-3. エラーハンドリング

#### ユーザーに分かりやすいエラーメッセージ

```typescript
// ✓ Good: カスタマイズされたエラーメッセージ
const handleSave = async (note: Note) => {
  try {
    await saveNote(note);
  } catch (error) {
    if (error instanceof NetworkError) {
      setErrorMessage('インターネット接続がありません。もう一度試してください。');
    } else if (error instanceof PermissionError) {
      setErrorMessage('この操作を行う権限がありません。');
    } else {
      setErrorMessage('予期しないエラーが発生しました。管理者に連絡してください。');
      logger.error('Save failed', error);
    }
  }
};
```

#### リトライ機構

```typescript
// ✓ Good: 指数バックオフでリトライ
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(delay * Math.pow(2, i)); // 指数バックオフ
    }
  }
  throw new Error('Failed after retries');
}
```

---

## 7. テスト戦略

### 7-1. テストの範囲

| テストタイプ | 対象 | ツール | 例 |
|---------|------|-------|-----|
| **ユニットテスト** | 関数、フック | Vitest | `useTags` の addTag メソッド |
| **統合テスト** | コンポーネント群 | Vitest + React Testing Library | `TagInput` + `useTags` の連携 |
| **E2Eテスト** | ユーザーフロー全体 | Playwright / Cypress | ユーザーがタグを追加して保存する |

### 7-2. テスト駆動開発（TDD）の実践

**実装の流れ**:

1. **Red**: テストを書く（失敗する）
2. **Green**: テストをパスするコードを書く（最小限）
3. **Refactor**: コードを改善する（テストは常に成功）

**例**:
```typescript
// 1. RED: 失敗するテストを先に書く
describe('useTags', () => {
  it('should add a tag', () => {
    const { result } = renderHook(() => useTags());
    expect(result.current.tags).toEqual([]);
    
    act(() => {
      result.current.addTag('学習');
    });
    
    expect(result.current.tags).toEqual(['学習']);
  });
});

// 2. GREEN: テストをパスするコードを書く
export function useTags() {
  const [tags, setTags] = useState<string[]>([]);
  
  const addTag = (tag: string) => {
    setTags([...tags, tag]);
  };

  return { tags, addTag };
}

// 3. REFACTOR: ロジックを改善
// （例：Supabase への保存を追加、エラーハンドリングを追加）
```

### 7-3. テストの保守性

**原則**:
- 実装詳細ではなく「振る舞い」をテストする
- DRY 原則を守り、テスト間の重複を避ける
- テストは「仕様書」の役割も果たす

```typescript
// ✗ Bad: 実装詳細をテストしている
it('should call useState', () => {
  // useState が呼ばれたかを検証...
});

// ✓ Good: 振る舞いをテストしている
it('should increase count when add button is clicked', () => {
  render(<Counter />);
  const button = screen.getByRole('button', { name: /add/i });
  fireEvent.click(button);
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

---

## 8. コーディング規約

### 8-1. TypeScript の使用

**原則**:
- `any` 型を避ける
- 型推論に頼らず、明示的に型を指定する（関数の戻り値など）
- Generic を活用した再利用可能なコード

```typescript
// ✓ Good: 明示的な型指定
function useList<T>(initialValue: T[]): [T[], (item: T) => void] {
  const [items, setItems] = useState<T[]>(initialValue);
  
  const add = (item: T) => {
    setItems([...items, item]);
  };

  return [items, add];
}

// ✗ Bad: any 型
function useList(initialValue: any) {
  // ...
}
```

### 8-2. 命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ファイル（コンポーネント） | PascalCase | `TagInput.tsx` |
| ファイル（その他） | kebab-case | `use-tags.ts`, `tag-service.ts` |
| 関数・変数 | camelCase | `handleAddTag`, `tagList` |
| 定数 | UPPER_SNAKE_CASE | `MAX_TAGS = 50` |
| Boolean 変数 | `is` / `has` で始まる | `isLoading`, `hasError` |
| Event Handler | `handle` + 動詞 | `handleClick`, `handleChange` |

### 8-3. コメント

**原則**:
- **Why** を書く（What ではなく）
- 将来の開発者が意思決定を理解できるようにする

```typescript
// ✓ Good: なぜこの実装が必要か説明
// Firebase の制限により、subcollection は複数の where 句で
// 絞り込めないため、ここで手動フィルタリングを行う
const filteredTags = tags.filter(tag => tag.status === 'active');

// ✗ Bad: 何をしているかは自明だが、なぜが不明
// tags をフィルタリング
const filteredTags = tags.filter(tag => tag.status === 'active');
```

---

## 9. 改善・変更時のプロセス

### 9-1. 設計原則の更新

このドキュメントが時代とともに古くなった場合：

1. 関連する Issue を作成
2. 変更内容と理由を記載
3. PR で設計原則を更新
4. チーム全体で確認

### 9-2. 設計判断の記録

新しい技術選定や重要な設計変更があった場合：

- Issue の「実装設計メモ」に記載
- PR テンプレートで背景を説明
- 後で参照できるように、この設計原則に反映させることを検討

---

## 10. 参考資料

- React Official Docs: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Web.dev - Accessibility: https://web.dev/accessibility/
- Clean Code in React: Robert C. Martin の Clean Code 原則の React 適用

---

## 関連ドキュメント

- PR テンプレート: `.github/pull_request_template.md`
- TDD 実践ガイド: `docs/04_implementation/guides/`
- プロジェクト全体のドキュメント: `docs/README.md`
