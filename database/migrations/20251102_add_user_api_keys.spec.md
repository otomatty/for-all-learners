# user_api_keys マイグレーション仕様書

**対象:** データベーススキーマ
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## 概要

ユーザーごとのLLM APIキーを安全に保存するための `user_api_keys` テーブルを作成します。

### 目的

- ✅ ユーザーごとに複数のLLMプロバイダーのAPIキーを管理
- ✅ APIキーを暗号化して保存
- ✅ Row Level Security (RLS) でユーザー間のデータ分離
- ✅ 最終使用日時の記録

---

## Requirements

### R-001: テーブル構造

`user_api_keys` テーブルは以下のカラムを持つ：

| カラム名           | 型          | 制約                               | 説明                                   |
| ------------------ | ----------- | ---------------------------------- | -------------------------------------- |
| id                 | UUID        | PRIMARY KEY, DEFAULT gen_random_uuid() | 一意識別子                             |
| user_id            | UUID        | NOT NULL, REFERENCES accounts(id) ON DELETE CASCADE | ユーザーID（外部キー）                 |
| provider           | VARCHAR(50) | NOT NULL                           | LLMプロバイダー名（gemini/openai/claude） |
| encrypted_api_key  | TEXT        | NOT NULL                           | 暗号化されたAPIキー                    |
| is_active          | BOOLEAN     | DEFAULT TRUE                       | アクティブフラグ                       |
| created_at         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 作成日時                               |
| updated_at         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 更新日時                               |
| last_used_at       | TIMESTAMPTZ | NULL                               | 最終使用日時                           |

### R-002: 制約

- **UNIQUE制約**: `(user_id, provider)` - 1ユーザーにつき1プロバイダー1キー
- **外部キー制約**: `user_id` は `accounts(id)` を参照、削除時はカスケード

### R-003: Row Level Security (RLS)

- ✅ RLSを有効化
- ✅ ユーザーは自分のAPIキーのみCRUD可能
- ✅ 他のユーザーのAPIキーにはアクセス不可

### R-004: インデックス

- `user_id` にインデックス作成（検索パフォーマンス向上）
- `(user_id, provider)` のUNIQUE制約が複合インデックスとして機能

---

## Test Cases

### TC-001: テーブル作成

**目的**: user_api_keys テーブルが正しく作成される

```typescript
test('TC-001: user_api_keys テーブルが存在する', async () => {
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .limit(1);
  
  expect(error).toBeNull();
  expect(data).toBeDefined();
});
```

**期待結果**: エラーなくクエリが実行される

---

### TC-002: APIキー挿入

**目的**: APIキーが正しく挿入できる

```typescript
test('TC-002: APIキーを挿入できる', async () => {
  const testData = {
    user_id: testUserId,
    provider: 'gemini',
    encrypted_api_key: 'encrypted_test_key_123',
    is_active: true,
  };
  
  const { data, error } = await supabase
    .from('user_api_keys')
    .insert(testData)
    .select()
    .single();
  
  expect(error).toBeNull();
  expect(data.provider).toBe('gemini');
  expect(data.user_id).toBe(testUserId);
});
```

**期待結果**: データが正しく挿入される

---

### TC-003: UNIQUE制約

**目的**: 同じユーザー・プロバイダーの組み合わせは1つのみ

```typescript
test('TC-003: 同じユーザー・プロバイダーで重複挿入できない', async () => {
  const testData = {
    user_id: testUserId,
    provider: 'gemini',
    encrypted_api_key: 'encrypted_test_key_123',
  };
  
  // 1回目の挿入
  await supabase.from('user_api_keys').insert(testData);
  
  // 2回目の挿入（重複）
  const { error } = await supabase
    .from('user_api_keys')
    .insert(testData);
  
  expect(error).not.toBeNull();
  expect(error?.code).toBe('23505'); // PostgreSQL unique violation
});
```

**期待結果**: 2回目の挿入でエラー

---

### TC-004: 外部キー制約

**目的**: 存在しないuser_idは挿入できない

```typescript
test('TC-004: 存在しないuser_idは挿入できない', async () => {
  const { error } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: '00000000-0000-0000-0000-000000000000', // 存在しないID
      provider: 'gemini',
      encrypted_api_key: 'test_key',
    });
  
  expect(error).not.toBeNull();
  expect(error?.code).toBe('23503'); // PostgreSQL foreign key violation
});
```

**期待結果**: 外部キー制約エラー

---

### TC-005: RLS - 自分のAPIキーにアクセス

**目的**: 認証済みユーザーは自分のAPIキーを取得できる

```typescript
test('TC-005: 自分のAPIキーを取得できる', async () => {
  // ユーザーAとして認証
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: 'userA@example.com',
    password: 'password',
  });
  
  // ユーザーAのAPIキー挿入
  await supabase.from('user_api_keys').insert({
    user_id: session!.user.id,
    provider: 'gemini',
    encrypted_api_key: 'encrypted_key_A',
  });
  
  // ユーザーAのAPIキー取得
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('provider', 'gemini');
  
  expect(error).toBeNull();
  expect(data).toHaveLength(1);
  expect(data[0].encrypted_api_key).toBe('encrypted_key_A');
});
```

**期待結果**: 自分のAPIキーが取得できる

---

### TC-006: RLS - 他人のAPIキーにアクセス不可

**目的**: 他のユーザーのAPIキーは取得できない

```typescript
test('TC-006: 他人のAPIキーにアクセスできない', async () => {
  // ユーザーAのAPIキー挿入
  await supabase.from('user_api_keys').insert({
    user_id: userAId,
    provider: 'gemini',
    encrypted_api_key: 'encrypted_key_A',
  });
  
  // ユーザーBとして認証
  await supabase.auth.signInWithPassword({
    email: 'userB@example.com',
    password: 'password',
  });
  
  // ユーザーAのAPIキーを取得しようとする
  const { data, error } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', userAId);
  
  expect(data).toHaveLength(0); // 取得できない
});
```

**期待結果**: 他人のAPIキーは取得できない（空配列）

---

### TC-007: カスケード削除

**目的**: ユーザー削除時にAPIキーも削除される

```typescript
test('TC-007: ユーザー削除時にAPIキーも削除される', async () => {
  // テストユーザー作成
  const { data: user } = await supabase.auth.admin.createUser({
    email: 'test@example.com',
    password: 'password',
  });
  
  // APIキー挿入
  await supabase.from('user_api_keys').insert({
    user_id: user.user!.id,
    provider: 'gemini',
    encrypted_api_key: 'test_key',
  });
  
  // ユーザー削除
  await supabase.auth.admin.deleteUser(user.user!.id);
  
  // APIキーが削除されているか確認
  const { data } = await supabase
    .from('user_api_keys')
    .select('*')
    .eq('user_id', user.user!.id);
  
  expect(data).toHaveLength(0);
});
```

**期待結果**: ユーザー削除時にAPIキーも削除される

---

### TC-008: タイムスタンプ自動設定

**目的**: created_atとupdated_atが自動設定される

```typescript
test('TC-008: タイムスタンプが自動設定される', async () => {
  const { data } = await supabase
    .from('user_api_keys')
    .insert({
      user_id: testUserId,
      provider: 'openai',
      encrypted_api_key: 'test_key',
    })
    .select()
    .single();
  
  expect(data.created_at).toBeDefined();
  expect(data.updated_at).toBeDefined();
  expect(new Date(data.created_at).getTime()).toBeCloseTo(
    new Date().getTime(),
    -3 // 1秒以内の誤差を許容
  );
});
```

**期待結果**: created_atとupdated_atが現在時刻で設定される

---

## Implementation Notes

### セキュリティ考慮事項

1. **APIキーは必ず暗号化**: `encrypted_api_key` カラムには暗号化済みのデータのみ保存
2. **RLSは必須**: 他のユーザーのAPIキーへのアクセスを防ぐ
3. **ログに出力しない**: APIキーをアプリケーションログに出力しない

### パフォーマンス考慮事項

1. **インデックス**: `user_id` にインデックスを作成して検索を高速化
2. **UNIQUE制約**: `(user_id, provider)` の複合インデックスで高速検索

### マイグレーション実行手順

```bash
# ローカル環境で実行
supabase db reset

# 本番環境に適用
supabase db push
```

---

## Related Files

- **実装**: `database/migrations/20251102_add_user_api_keys.sql`
- **テスト**: `database/migrations/__tests__/20251102_add_user_api_keys.test.ts`
- **計画**: `docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md`

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet)
