# 20251102_01 Phase 0.1: データベースマイグレーション実装

**対象:** Mastra基盤構築 Phase 0.1
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## 実施した作業

### ✅ 完了したタスク

- [x] 実装計画ドキュメント作成（`docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md`）
- [x] データベース仕様書作成（`database/migrations/20251102_add_user_api_keys.spec.md`）
- [x] マイグレーションSQL実装（`database/migrations/20251102_add_user_api_keys.sql`）
- [x] テストコード実装（`database/migrations/__tests__/20251102_add_user_api_keys.test.ts`）
- [x] Lintエラー修正（non-null assertion削除）
- [x] **Supabase MCPでマイグレーション実行**（プロジェクト: ForAllLearners）
- [x] **テーブル作成確認**（`user_api_keys` テーブル作成完了）

---

## 変更ファイル

### 新規作成

```
docs/03_plans/mastra-infrastructure/
└── 20251102_01_implementation-plan.md         # 実装計画

database/migrations/
├── 20251102_add_user_api_keys.sql             # マイグレーションSQL
├── 20251102_add_user_api_keys.spec.md         # 仕様書
└── __tests__/
    └── 20251102_add_user_api_keys.test.ts     # テストコード
```

---

## 実装内容

### 1. 実装計画ドキュメント

**ファイル:** `docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md`

- Phase 0.1～0.5 の段階的な実装計画を定義
- 各Phaseのタスク、成果物、完了条件を明記
- リスク管理とマイルストーンを記載

### 2. データベース仕様書

**ファイル:** `database/migrations/20251102_add_user_api_keys.spec.md`

- テーブル構造の定義（8カラム）
- UNIQUE制約、外部キー制約の仕様
- Row Level Security (RLS) ポリシーの要件
- TC-001～TC-008の詳細なテストケース定義

### 3. マイグレーションSQL

**ファイル:** `database/migrations/20251102_add_user_api_keys.sql`

主な機能：

- ✅ `user_api_keys` テーブル作成
- ✅ インデックス作成（`user_id`, `provider`, 複合インデックス）
- ✅ RLSポリシー設定（ユーザーは自分のAPIキーのみアクセス可能）
- ✅ `updated_at` 自動更新トリガー
- ✅ カラムコメント追加（ドキュメント化）

### 4. テストコード

**ファイル:** `database/migrations/__tests__/20251102_add_user_api_keys.test.ts`

実装したテストケース：

- ✅ TC-001: テーブル作成確認
- ✅ TC-002: APIキー挿入
- ✅ TC-003: UNIQUE制約の検証
- ✅ TC-004: 外部キー制約の検証
- ✅ TC-005: RLS - 自分のAPIキーにアクセス
- ✅ TC-006: RLS - 他人のAPIキーにアクセス不可
- ✅ TC-007: カスケード削除の検証
- ✅ TC-008: タイムスタンプ自動設定の検証

追加のテスト：

- ✅ 複数プロバイダーのAPIキーを同時保存
- ✅ `is_active` フラグでのフィルタリング
- ✅ `updated_at` の自動更新確認

---

## テーブル設計詳細

### `user_api_keys` テーブル

| カラム名           | 型          | 制約                               | 説明                                   |
| ------------------ | ----------- | ---------------------------------- | -------------------------------------- |
| id                 | UUID        | PRIMARY KEY                        | 一意識別子                             |
| user_id            | UUID        | NOT NULL, FOREIGN KEY              | ユーザーID（accounts参照）             |
| provider           | VARCHAR(50) | NOT NULL                           | LLMプロバイダー名                      |
| encrypted_api_key  | TEXT        | NOT NULL                           | 暗号化されたAPIキー                    |
| is_active          | BOOLEAN     | DEFAULT TRUE                       | アクティブフラグ                       |
| created_at         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 作成日時                               |
| updated_at         | TIMESTAMPTZ | NOT NULL, DEFAULT NOW()            | 更新日時                               |
| last_used_at       | TIMESTAMPTZ | NULL                               | 最終使用日時                           |

### インデックス

- `idx_user_api_keys_user_id`: `user_id` 単一インデックス
- `idx_user_api_keys_provider`: `provider` 単一インデックス
- `idx_user_api_keys_user_provider_active`: `(user_id, provider, is_active)` 複合インデックス

### RLSポリシー

1. **Users can manage their own API keys**: ユーザーは自分のAPIキーのみCRUD可能
2. **Service role can access all API keys**: サービスロールは全APIキーにアクセス可能（管理・マイグレーション用）

---

## Lint修正履歴

### 問題

TypeScriptの`non-null assertion (!)`がBiomeによって禁止されていた

### 修正内容

すべての`data!`を以下のパターンで修正：

```typescript
// Before
expect(data!.provider).toBe('gemini');

// After
if (data) {
  expect(data.provider).toBe('gemini');
}
```

```typescript
// Before
const userId = userData.user!.id;

// After
if (!userData.user) {
  throw new Error('Failed to create user');
}
const userId = userData.user.id;
```

---

## マイグレーション実行結果

### Supabase MCP使用

- **プロジェクト**: ForAllLearners (ID: `ablwpfboagwcegeehmtg`)
- **リージョン**: ap-northeast-1
- **ステータス**: ACTIVE_HEALTHY
- **実行結果**: ✅ Success

### 作成されたオブジェクト

#### テーブル
- ✅ `public.user_api_keys` - 8カラム、0行（初期状態）

#### インデックス
- ✅ `idx_user_api_keys_user_id` - user_id単一インデックス
- ✅ `idx_user_api_keys_provider` - provider単一インデックス
- ✅ `idx_user_api_keys_user_provider_active` - 複合インデックス

#### RLSポリシー
- ✅ "Users can manage their own API keys" - ユーザー自身のキーのみアクセス可
- ✅ "Service role can access all API keys" - サービスロール全アクセス可

#### トリガー
- ✅ `trigger_update_user_api_keys_updated_at` - updated_at自動更新

#### 外部キー
- ✅ `user_api_keys_user_id_fkey` → `accounts.id` (ON DELETE CASCADE)

---

## 次回の作業

### Phase 0.2: APIキー暗号化

- [ ] `lib/encryption/api-key-vault.spec.md` 作成
- [ ] `lib/encryption/api-key-vault.ts` 実装
- [ ] AES-256-GCM暗号化・復号化関数実装
- [ ] 環境変数 `ENCRYPTION_KEY` 設定
- [ ] テストコード実装
- [ ] セキュリティレビュー

---

## 気づき・学び

### ✅ ドキュメント駆動開発の効果

- 仕様書（.spec.md）を先に作成することで、実装の方向性が明確化
- テストケースを事前定義することで、実装漏れを防止
- ドキュメントとコードの整合性が保たれる

### ✅ TDDの実践

- テストケースを先に実装することで、仕様への理解が深まる
- Lintエラーの早期発見・修正が可能

### ✅ Supabase RLSの強力さ

- Row Level Securityにより、アプリケーションコード側でアクセス制御を実装する必要がない
- SQLレベルでセキュリティが担保される

### ✅ Supabase MCPの利点

- ローカルのSupabase CLIを使用せずにマイグレーションを適用可能
- プロジェクト一覧から対象を選択してマイグレーション実行
- マイグレーション結果が即座に確認可能
- テーブル構造の確認も簡単

### ⚠️ 注意点

- TypeScriptのstrict modeでは`non-null assertion`を避けるべき
- テストコードでも型安全性を重視する必要がある
- マイグレーション名は `snake_case` を使用（`add_user_api_keys`）

---

## 関連ドキュメント

- **Issue**: [#74 Mastra基盤構築とAPIキー管理システムの実装](https://github.com/otomatty/for-all-learners/issues/74)
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md`
- **仕様書**: `database/migrations/20251102_add_user_api_keys.spec.md`
- **マイグレーション**: `database/migrations/20251102_add_user_api_keys.sql`
- **テスト**: `database/migrations/__tests__/20251102_add_user_api_keys.test.ts`

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet) + Human
