# TDD実践ガイド

**作成日**: 2025-10-18  
**最終更新日**: 2025-10-18

---

## 概要

テスト駆動開発（Test-Driven Development, TDD）を実践するための具体的なステップバイステップガイドです。

このプロジェクトでは、TDD を実践することで「品質の高いコード」と「評価制度への証跡」の両立を目指しています。

---

## TDDのサイクル

### 1. RED: テストを書く（失敗する）

**目的**: 実装する機能の「仕様」を明確にする

**ステップ**:

1. **要件を理解する**
   - Issue の「実装設計メモ」を読む
   - 「このコンポーネント/フックは何をするべきか」を明確に

2. **テストコードを書く**
   - 要件を満たす「理想的な使い方」をテストコードで表現
   - まだ実装は書かない

3. **テストが失敗することを確認**
   - `npm run test` を実行して、テストが失敗していることを確認
   - テストが失敗していることが RED フェーズの完成

**例**: メモにタグを追加する機能

```typescript
// __tests__/useTags.test.ts
import { renderHook, act } from '@testing-library/react';
import { useTags } from '@/hooks/useTags';

describe('useTags', () => {
  it('should add a tag to the list', () => {
    // Arrange
    const { result } = renderHook(() => useTags());
    expect(result.current.tags).toEqual([]);

    // Act
    act(() => {
      result.current.addTag('学習');
    });

    // Assert
    expect(result.current.tags).toContain('学習');
  });

  it('should show error message when adding empty tag', () => {
    const { result } = renderHook(() => useTags());

    act(() => {
      result.current.addTag('');
    });

    expect(result.current.error).toBe('タグは空にできません');
  });

  it('should persist tags to Supabase', async () => {
    const { result } = renderHook(() => useTags());

    await act(async () => {
      await result.current.addTag('プログラミング');
    });

    // Supabase に保存されたか確認
    expect(result.current.tags).toContain('プログラミング');
  });
});
```

**重要なポイント**:
- AAA パターン（Arrange - Act - Assert）を守る
- テストは「使い方」を表現する、ドキュメントの役割
- 複数のテストケースで要件を網羅する

---

### 2. GREEN: テストをパスする最小限の実装

**目的**: テストが成功するようにコードを書く（完璧さは不要）

**原則**: 「テストをパスさせる」ことだけに焦点を当てる

**ステップ**:

1. **最小限の実装を書く**
   - テストをパスさせるための「必要最小限」のコードだけ
   - 完璧な実装は後で
   - 重複や不完全さが残っていても OK

2. **テストが成功することを確認**
   - すべてのテストが GREEN（成功）になるまで実装を繰り返す

3. **コミットする**
   - 「Green: Add useTags hook」というコミットメッセージで記録

**例**: Green フェーズの実装

```typescript
// hooks/useTags.ts
import { useState } from 'react';

interface UseTagsReturn {
  tags: string[];
  addTag: (tag: string) => void;
  error: string | null;
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addTag = (tag: string) => {
    if (tag === '') {
      setError('タグは空にできません');
      return;
    }
    setTags([...tags, tag]);
  };

  return { tags, addTag, error };
}
```

**重要なポイント**:
- 複雑な実装は不要、単純に GREEN にすることだけ
- Supabase 連携なども一旦 mock してもいい
- テストすべてが成功したら、このフェーズは終了

---

### 3. REFACTOR: 設計を改善する

**目的**: コード品質、パフォーマンス、保守性を改善する（テストは常に成功）

**原則**: テストが成功していることを確認しながら進める

**改善の観点**:

1. **コードの重複を排除（DRY）**
   - 同じロジックが複数箇所に書かれていないか
   - ロジックを共通化できないか

2. **可読性を向上させる**
   - 変数名、関数名を分かりやすく
   - 複雑なロジックをヘルパー関数に切り出す

3. **パフォーマンスを最適化**
   - 不要な状態更新がないか
   - API 呼び出しが無駄になっていないか

4. **エラーハンドリングを強化**
   - 想定外のエラーに対応
   - ユーザーへのメッセージを改善

**例**: Refactor フェーズ

```typescript
// hooks/useTags.ts (リファクタリング後)
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

interface UseTagsReturn {
  tags: string[];
  addTag: (tag: string) => Promise<void>;
  removeTag: (tag: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export function useTags(noteId: string): UseTagsReturn {
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation をヘルパー関数に切り出す
  const validateTag = useCallback((tag: string): string | null => {
    if (!tag.trim()) {
      return 'タグは空にできません';
    }
    if (tag.length > 50) {
      return 'タグは50文字以内にしてください';
    }
    if (tags.includes(tag)) {
      return 'このタグは既に追加されています';
    }
    return null;
  }, [tags]);

  // API 呼び出しをサービス層に切り出す（後述）
  const addTag = useCallback(
    async (tag: string) => {
      const validationError = validateTag(tag);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        await supabase.from('tags').insert({ note_id: noteId, name: tag });
        setTags([...tags, tag]);
      } catch (err) {
        setError('タグの追加に失敗しました。もう一度試してください。');
        console.error('Failed to add tag:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [noteId, tags, validateTag]
  );

  const removeTag = useCallback(
    async (tag: string) => {
      setIsLoading(true);
      try {
        await supabase.from('tags').delete().eq('name', tag).eq('note_id', noteId);
        setTags(tags.filter(t => t !== tag));
      } catch (err) {
        setError('タグの削除に失敗しました。');
      } finally {
        setIsLoading(false);
      }
    },
    [noteId, tags]
  );

  return { tags, addTag, removeTag, isLoading, error };
}
```

**改善点**:

1. **Validation ロジックをヘルパー関数に分離** → 再利用可能に
2. **Supabase 呼び出しを追加** → 実際の永続化を実装
3. **useCallback でメモ化** → 不要な再レンダリング防止
4. **エラーハンドリングを強化** → ユーザーに分かりやすいメッセージ
5. **removeTag 機能を追加** → より完全な API

**重要なポイント**:
- 各ステップごとに `npm run test` を実行して、テストが常に成功していることを確認
- テストが失敗したら、改善内容を見直す
- リファクタリングは「段階的に」行う

---

## TDD を使った実装フロー（全体）

### ステップバイステップ

```
Step 1: Issue の「実装設計メモ」を読む
   ↓
Step 2: RED フェーズ - テストを書く
   → npm run test (失敗を確認)
   ↓
Step 3: GREEN フェーズ - 最小限の実装
   → npm run test (成功を確認)
   ↓
Step 4: REFACTOR フェーズ - 改善
   → npm run test (成功を確認)
   → コード品質、パフォーマンスを向上
   ↓
Step 5: PR を作成
   → PR テンプレートに Red/Green/Refactor を記載
   → レビューを受ける
   ↓
Step 6: マージ
```

---

## テストコード作成のコツ

### 6-1. テストは「仕様」である

テストは、その機能がどう動くべきかを示すドキュメントです。

```typescript
// ✓ Good: 仕様が明確
describe('useTags', () => {
  it('should add a tag and persist to Supabase', async () => {
    // ...
  });

  it('should prevent duplicate tags', () => {
    // ...
  });

  it('should show error when tag is too long', () => {
    // ...
  });
});

// ✗ Bad: 何をテストしているか不明確
describe('useTags', () => {
  it('works', () => {
    // ...
  });
});
```

### 6-2. 一つのテストは一つの責務

一つのテストで複数の動作をテストしない。

```typescript
// ✗ Bad: 複数の動作をテストしている
it('should add and remove tags', () => {
  const { result } = renderHook(() => useTags());
  
  act(() => {
    result.current.addTag('学習');
  });
  expect(result.current.tags).toContain('学習');

  act(() => {
    result.current.removeTag('学習');
  });
  expect(result.current.tags).not.toContain('学習');
});

// ✓ Good: 一つの責務に分離
it('should add a tag', () => {
  const { result } = renderHook(() => useTags());
  
  act(() => {
    result.current.addTag('学習');
  });
  
  expect(result.current.tags).toContain('学習');
});

it('should remove a tag', () => {
  const { result } = renderHook(() => useTags());
  
  // ...
});
```

### 6-3. Mock と実 API の使い分け

**Mock**:
- ユニットテスト
- 外部 API の動作を制御する必要があるとき
- テストの実行速度が重要なとき

**実 API**:
- 統合テスト
- 本当に動作するか確認したいとき

```typescript
// Mock の例
it('should handle API error gracefully', () => {
  // Supabase をモック化
  const mockSupabase = {
    from: jest.fn().mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('Network error'))
    })
  };

  // モックを使ってテスト
  // ...
});
```

---

## 実装パターン集

### パターン1: シンプルなフック

```typescript
// __tests__/useCounter.test.ts
it('should increment count', () => {
  const { result } = renderHook(() => useCounter());
  
  act(() => {
    result.current.increment();
  });
  
  expect(result.current.count).toBe(1);
});

// hooks/useCounter.ts
export function useCounter(initialValue = 0) {
  const [count, setCount] = useState(initialValue);
  
  const increment = () => setCount(count + 1);
  
  return { count, increment };
}
```

### パターン2: Async 処理を含むフック

```typescript
// __tests__/useFetchNotes.test.ts
it('should fetch notes and update state', async () => {
  const { result } = renderHook(() => useFetchNotes());
  
  expect(result.current.isLoading).toBe(true);
  
  await waitFor(() => {
    expect(result.current.isLoading).toBe(false);
  });
  
  expect(result.current.notes).toBeDefined();
});

// hooks/useFetchNotes.ts
export function useFetchNotes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await supabase.from('notes').select();
        setNotes(data);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, []);

  return { notes, isLoading, error };
}
```

### パターン3: コンポーネントのテスト

```typescript
// __tests__/TagInput.test.tsx
it('should call onAdd when button is clicked', () => {
  const onAdd = jest.fn();
  render(<TagInput onAdd={onAdd} />);
  
  const input = screen.getByRole('textbox');
  fireEvent.change(input, { target: { value: '学習' } });
  
  const button = screen.getByRole('button', { name: /add/i });
  fireEvent.click(button);
  
  expect(onAdd).toHaveBeenCalledWith('学習');
});

// components/TagInput.tsx
export function TagInput({ onAdd }: { onAdd: (tag: string) => void }) {
  const [value, setValue] = useState('');

  const handleAdd = () => {
    onAdd(value);
    setValue('');
  };

  return (
    <div>
      <input value={value} onChange={(e) => setValue(e.target.value)} />
      <button onClick={handleAdd}>Add</button>
    </div>
  );
}
```

---

## よくある落とし穴と対処

### 落とし穴1: テストファーストが難しい

**症状**: 実装してからテストを書きたくなる

**対処**:
- 実装の前に「何をするべきか」を紙に書く
- その「何をするべきか」をテストコードに直訳する
- 最初は難しいが、繰り返すと慣れる

### 落とし穴2: テストが複雑になりすぎた

**症状**: テストコード > 実装コード、テストが読みにくい

**対処**:
- テストが複雑 = 実装の責務が不明確 の可能性
- 実装の責務を分割する
- ヘルパー関数を使ってテストを簡潔に

### 落とし穴3: テストが脆弱（すぐに壊れる）

**症状**: 実装の細かい変更でテストが失敗する

**対処**:
- 実装詳細ではなく、「振る舞い」をテストする
- HTML 構造ではなく、role や label でセレクトする
- 関数の内部実装ではなく、入出力をテストする

---

## PR を作成するときの確認リスト

- [ ] すべてのテストが成功している（`npm run test`）
- [ ] PR テンプレートに Red/Green/Refactor を記載した
- [ ] テストコードへのリンクを貼った
- [ ] CIの実行結果を確認した
- [ ] 関連 Issue にリンクを張った

---

## 関連ドキュメント

- フロントエンド設計原則: `docs/03_design/specifications/FRONTEND_DESIGN_PRINCIPLES.md`
- PR テンプレート: `.github/pull_request_template.md`
- Issue テンプレート: `.github/ISSUE_TEMPLATE/feature.md`
