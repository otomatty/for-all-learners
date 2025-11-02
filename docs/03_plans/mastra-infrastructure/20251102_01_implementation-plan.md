# Mastra基盤構築とAPIキー管理システム 実装計画

**対象:** AI機能基盤構築
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## 概要

このドキュメントは、Issue #74「Mastra基盤構築とAPIキー管理システムの実装」の段階的な実装計画を定めます。

### 目的

- ✅ マルチLLM対応の基盤構築（Mastra導入）
- ✅ ユーザーごとのAPIキー管理機能
- ✅ セキュアなAPIキー暗号化・保存
- ✅ APIキー設定UI

### 実装方針

- **ドキュメント駆動開発**: 各フェーズで仕様書（.spec.md）を先に作成
- **テスト駆動開発**: テストコードを実装してから本体を実装
- **段階的リリース**: 各Phase完了時点で動作確認
- **依存関係の明示**: すべてのファイルにDEPENDENCY MAPを記載

---

## Phase 0.1: データベース構築（1日目）

**目標**: user_api_keys テーブルとRLSポリシーを作成

### タスク

- [ ] `database/migrations/20251102_add_user_api_keys.spec.md` 作成
- [ ] `database/migrations/20251102_add_user_api_keys.sql` 実装
- [ ] RLSポリシー設定
- [ ] テストコード実装
- [ ] マイグレーション実行
- [ ] 作業ログ記録（`docs/05_logs/2025_11/20251102/01_database-migration.md`）

### 成果物

```
database/migrations/
├── 20251102_add_user_api_keys.sql
├── 20251102_add_user_api_keys.spec.md
└── __tests__/
    └── 20251102_add_user_api_keys.test.ts
```

### 完了条件

- [ ] user_api_keys テーブルが作成されている
- [ ] RLSポリシーが正しく機能する
- [ ] 他ユーザーのAPIキーにアクセスできない
- [ ] すべてのテストがPASS

---

## Phase 0.2: APIキー暗号化（2日目）

**目標**: AES-256-GCMによるAPIキーの暗号化・復号化機能を実装

### タスク

- [ ] `lib/encryption/api-key-vault.spec.md` 作成
- [ ] `lib/encryption/api-key-vault.ts` 実装
- [ ] `lib/encryption/__tests__/api-key-vault.test.ts` 実装
- [ ] 環境変数 `ENCRYPTION_KEY` 設定
- [ ] セキュリティレビュー
- [ ] 作業ログ記録

### 成果物

```
lib/encryption/
├── api-key-vault.ts
├── api-key-vault.spec.md
└── __tests__/
    └── api-key-vault.test.ts
```

### 完了条件

- [ ] APIキーが暗号化できる
- [ ] 暗号化したAPIキーが復号化できる
- [ ] 暗号化後のデータが元の値と異なる
- [ ] すべてのテストがPASS
- [ ] APIキーがログに出力されない

---

## Phase 0.3: Mastraセットアップ（3日目）

**目標**: Mastraフレームワークのインストールと基本クライアント実装

### タスク

- [ ] Mastraパッケージインストール（`@mastra/core`, `@mastra/agent`, `@mastra/llm`）
- [ ] `lib/mastra/client.spec.md` 作成
- [ ] `lib/mastra/client.ts` 実装
- [ ] マルチLLMサポート確認（Gemini, OpenAI, Claude）
- [ ] `lib/mastra/__tests__/client.test.ts` 実装
- [ ] 作業ログ記録

### 成果物

```
lib/mastra/
├── client.ts
├── client.spec.md
├── __tests__/
│   └── client.test.ts
├── agents/           # Phase 1以降で実装
├── tools/            # Phase 1以降で実装
└── prompts/          # Phase 1以降で実装
```

### 完了条件

- [ ] Mastraが正しくインストールされている
- [ ] Geminiクライアントが初期化できる
- [ ] OpenAIクライアントが初期化できる
- [ ] Claudeクライアントが初期化できる
- [ ] すべてのテストがPASS

---

## Phase 0.4: Server Actions実装（4日目）

**目標**: APIキー管理のServer Actionsを実装

### タスク

- [ ] `app/_actions/ai/apiKey.spec.md` 作成
- [ ] `app/_actions/ai/apiKey.ts` 実装
  - `saveAPIKey()` - APIキー保存
  - `getAPIKeyStatus()` - APIキー設定状態取得
  - `deleteAPIKey()` - APIキー削除
  - `testAPIKey()` - APIキーの検証
- [ ] `app/_actions/ai/__tests__/apiKey.test.ts` 実装
- [ ] 作業ログ記録

### 成果物

```
app/_actions/ai/
├── apiKey.ts
├── apiKey.spec.md
└── __tests__/
    └── apiKey.test.ts
```

### 完了条件

- [ ] APIキーが保存できる
- [ ] APIキーが暗号化されて保存される
- [ ] APIキー設定状態が取得できる
- [ ] APIキーが削除できる
- [ ] APIキーの検証ができる
- [ ] すべてのテストがPASS

---

## Phase 0.5: UI実装（5日目）

**目標**: APIキー設定画面とコンポーネントを実装

### タスク

- [ ] `components/settings/APIKeySettings.spec.md` 作成
- [ ] `components/settings/APIKeySettings.tsx` 実装
- [ ] `components/settings/APIKeyForm.tsx` 実装
- [ ] `components/settings/ProviderSelector.tsx` 実装
- [ ] `app/(protected)/settings/api-keys/page.tsx` 作成
- [ ] ナビゲーションメニューに「APIキー設定」追加
- [ ] `components/ai-command-bar/APIKeyPrompt.tsx` 実装（未設定時のプロンプト）
- [ ] テスト実装
- [ ] 作業ログ記録

### 成果物

```
components/settings/
├── APIKeySettings.tsx
├── APIKeySettings.spec.md
├── APIKeyForm.tsx
├── ProviderSelector.tsx
└── __tests__/
    ├── APIKeySettings.test.tsx
    └── APIKeyForm.test.tsx

app/(protected)/settings/api-keys/
└── page.tsx

components/ai-command-bar/
└── APIKeyPrompt.tsx
```

### 完了条件

- [ ] `/settings/api-keys` ページが表示される
- [ ] プロバイダーを選択できる（Gemini, OpenAI, Claude）
- [ ] APIキーを入力・保存できる
- [ ] APIキー設定状態が表示される
- [ ] APIキーが削除できる
- [ ] APIキー未設定時に適切なプロンプトが表示される
- [ ] すべてのテストがPASS

---

## リスク管理

### Phase 0.1: データベース構築

| リスク                         | 対策                                         |
| ------------------------------ | -------------------------------------------- |
| RLSポリシーの設定ミス          | テストで他ユーザーアクセスを確認             |
| マイグレーション失敗           | ローカルで十分にテスト、ロールバック計画作成 |

### Phase 0.2: APIキー暗号化

| リスク                         | 対策                                         |
| ------------------------------ | -------------------------------------------- |
| 暗号化キーの漏洩               | 環境変数で管理、.env.localをgitignore        |
| 暗号化アルゴリズムの脆弱性     | AES-256-GCM（業界標準）を使用                |

### Phase 0.3: Mastraセットアップ

| リスク                         | 対策                                         |
| ------------------------------ | -------------------------------------------- |
| Mastraのバージョン非互換性     | package.jsonでバージョン固定                 |
| LLMプロバイダーAPI変更         | Mastraが抽象化レイヤーを提供                 |

### Phase 0.4: Server Actions

| リスク                         | 対策                                         |
| ------------------------------ | -------------------------------------------- |
| 認証エラー                     | supabase.auth.getUser()で必ず認証確認        |
| APIキー検証失敗                | try-catch で適切なエラーハンドリング         |

### Phase 0.5: UI実装

| リスク                         | 対策                                         |
| ------------------------------ | -------------------------------------------- |
| UIの複雑化                     | コンポーネントを小さく分割                   |
| パスワード入力の可視性         | type="password"で非表示、トグル機能追加      |

---

## 依存関係

### Phase間の依存関係

```
Phase 0.1 (DB)
    ↓
Phase 0.2 (暗号化)
    ↓
Phase 0.3 (Mastra)
    ↓
Phase 0.4 (Server Actions)
    ↓
Phase 0.5 (UI)
```

### 外部依存

- **Supabase**: データベース、認証
- **Next.js**: Server Actions、App Router
- **Mastra**: LLM統合フレームワーク
- **Node.js Crypto**: 暗号化

---

## テスト戦略

### ユニットテスト

- 各関数が単独で正しく動作することを確認
- モックを使用して外部依存を分離

### 統合テスト

- データベース ↔ Server Actions の連携
- 暗号化 ↔ データベース保存の連携

### セキュリティテスト

- RLSポリシーが正しく機能するか
- APIキーが平文で保存されていないか
- 他ユーザーのAPIキーにアクセスできないか

### E2Eテスト（Phase 0.5完了後）

- ユーザーがAPIキーを設定できる
- APIキー設定後にAI機能が使用できる

---

## マイルストーン

| Phase   | 開始日     | 完了予定日 | 状態        |
| ------- | ---------- | ---------- | ----------- |
| Phase 0.1 | 2025-11-02 | 2025-11-02 | Not Started |
| Phase 0.2 | 2025-11-03 | 2025-11-03 | Not Started |
| Phase 0.3 | 2025-11-04 | 2025-11-04 | Not Started |
| Phase 0.4 | 2025-11-05 | 2025-11-05 | Not Started |
| Phase 0.5 | 2025-11-06 | 2025-11-06 | Not Started |

---

## 関連ドキュメント

- **Issue**: [#74 Mastra基盤構築とAPIキー管理システムの実装](https://github.com/otomatty/for-all-learners/issues/74)
- **Research**: `docs/02_research/2025_10/20251030_mastra_ai_infrastructure_requirements.md`
- **関連Issue**:
  - #70: AI Toolbar Phase 1 - 基本実装
  - #71: AI Toolbar Phase 2 - コンテキスト応答
  - #72: AI Toolbar Phase 3 - ページ要約
  - #73: AI Toolbar Phase 4-8 - 高度な機能

---

## 進捗更新ログ

| 日付       | Phase   | 状態      | 備考                   |
| ---------- | ------- | --------- | ---------------------- |
| 2025-11-02 | -       | 計画作成  | 実装計画ドキュメント作成 |

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet)
