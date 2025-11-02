# Mastra基盤構築 Phase 0.2～0.5 実装プラン

**対象:** Phase 0.2（APIキー暗号化）～ Phase 0.5（UI実装）
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)
**前提条件:** Phase 0.1（データベース構築）完了

---

## 📋 Phase 0.1 完了状況

### ✅ 完了内容

- [x] `user_api_keys` テーブル作成（Supabase MCP使用）
- [x] RLSポリシー設定
- [x] インデックス作成
- [x] 仕様書・テストコード作成
- [x] 作業ログ記録

### 📊 作成されたファイル

```
docs/03_plans/mastra-infrastructure/
└── 20251102_01_implementation-plan.md

database/migrations/
├── 20251102_add_user_api_keys.sql
├── 20251102_add_user_api_keys.spec.md
└── __tests__/
    └── 20251102_add_user_api_keys.test.ts

docs/05_logs/2025_11/20251102/
└── 01_database-migration.md
```

---

## 🎯 Phase 0.2: APIキー暗号化実装

**期間:** 1日（2025-11-03予定）
**目標:** AES-256-GCM方式でAPIキーを安全に暗号化・復号化する機能を実装

### 実装する機能

#### 1. 暗号化関数

```typescript
/**
 * Encrypt API key using AES-256-GCM
 * 
 * @param apiKey - Plain text API key
 * @returns Encrypted string in format: "iv:authTag:encrypted"
 */
export async function encryptAPIKey(apiKey: string): Promise<string>
```

#### 2. 復号化関数

```typescript
/**
 * Decrypt encrypted API key
 * 
 * @param encryptedKey - Encrypted string from encryptAPIKey
 * @returns Plain text API key
 */
export async function decryptAPIKey(encryptedKey: string): Promise<string>
```

### 実装ステップ

#### Step 1: 仕様書作成

**ファイル:** `lib/encryption/api-key-vault.spec.md`

```markdown
# APIキー暗号化 仕様書

## Requirements

### R-001: 暗号化アルゴリズム
- AES-256-GCM を使用
- 128ビット IV（Initialization Vector）をランダム生成
- 認証タグ（Auth Tag）を使用してデータ整合性を保証

### R-002: 環境変数
- 暗号化キーは `ENCRYPTION_KEY` 環境変数から取得
- 32バイト（256ビット）の16進数文字列

### R-003: 出力形式
- `iv:authTag:encrypted` 形式で結合
- 各部分は16進数文字列

## Test Cases

### TC-001: 暗号化成功
入力: "sk-test-123"
期待: 元の文字列と異なる暗号化文字列が返る

### TC-002: 復号化成功
入力: encryptAPIKey() の出力
期待: 元の文字列が復元される

### TC-003: 環境変数未設定
入力: ENCRYPTION_KEY が未設定
期待: エラーがスローされる

### TC-004: 不正な形式
入力: 不正な暗号化文字列
期待: エラーがスローされる
```

#### Step 2: 環境変数設定

**ファイル:** `.env.local`（gitignore済み）

```bash
# Generate encryption key
openssl rand -hex 32

# Add to .env.local
ENCRYPTION_KEY=your_generated_key_here
```

#### Step 3: 実装

**ファイル:** `lib/encryption/api-key-vault.ts`

```typescript
/**
 * API Key Vault - Encryption utilities
 * 
 * DEPENDENCY MAP:
 * 
 * Parents (使用先):
 *   ├─ app/_actions/ai/apiKey.ts
 *   └─ lib/mastra/client.ts (Phase 0.3)
 * 
 * Dependencies (依存先):
 *   ├─ node:crypto (Node.js標準)
 *   └─ process.env.ENCRYPTION_KEY
 * 
 * Related Files:
 *   ├─ Spec: ./api-key-vault.spec.md
 *   └─ Tests: ./__tests__/api-key-vault.test.ts
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

// Get encryption key from environment
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error('ENCRYPTION_KEY environment variable is not set');
}

const KEY = Buffer.from(ENCRYPTION_KEY_HEX, 'hex');

if (KEY.length !== 32) {
  throw new Error('ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
}

/**
 * Encrypt API key using AES-256-GCM
 */
export async function encryptAPIKey(apiKey: string): Promise<string> {
  try {
    // Generate random IV
    const iv = randomBytes(IV_LENGTH);
    
    // Create cipher
    const cipher = createCipheriv(ALGORITHM, KEY, iv);
    
    // Encrypt
    let encrypted = cipher.update(apiKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Get auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Failed to encrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decrypt encrypted API key
 */
export async function decryptAPIKey(encryptedKey: string): Promise<string> {
  try {
    // Split into components
    const parts = encryptedKey.split(':');
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted key format');
    }
    
    const [ivHex, authTagHex, encrypted] = parts;
    
    // Convert from hex
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

#### Step 4: テストコード実装

**ファイル:** `lib/encryption/__tests__/api-key-vault.test.ts`

```typescript
import { describe, test, expect, beforeAll } from 'vitest';
import { encryptAPIKey, decryptAPIKey } from '../api-key-vault';

describe('API Key Vault', () => {
  beforeAll(() => {
    // Ensure ENCRYPTION_KEY is set for tests
    if (!process.env.ENCRYPTION_KEY) {
      process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
    }
  });

  // TC-001: 暗号化成功
  test('TC-001: Should encrypt API key', async () => {
    const apiKey = 'sk-test-123';
    const encrypted = await encryptAPIKey(apiKey);
    
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(apiKey);
    expect(encrypted.split(':').length).toBe(3);
  });

  // TC-002: 復号化成功
  test('TC-002: Should decrypt API key', async () => {
    const original = 'sk-test-123';
    const encrypted = await encryptAPIKey(original);
    const decrypted = await decryptAPIKey(encrypted);
    
    expect(decrypted).toBe(original);
  });

  // TC-003: 複数回の暗号化で異なる結果
  test('TC-003: Should produce different encrypted strings', async () => {
    const apiKey = 'sk-test-123';
    const encrypted1 = await encryptAPIKey(apiKey);
    const encrypted2 = await encryptAPIKey(apiKey);
    
    expect(encrypted1).not.toBe(encrypted2);
  });

  // TC-004: 不正な形式
  test('TC-004: Should throw error for invalid format', async () => {
    await expect(decryptAPIKey('invalid-format')).rejects.toThrow();
  });

  // TC-005: 空文字列の暗号化
  test('TC-005: Should handle empty string', async () => {
    const encrypted = await encryptAPIKey('');
    const decrypted = await decryptAPIKey(encrypted);
    
    expect(decrypted).toBe('');
  });

  // TC-006: 長い文字列の暗号化
  test('TC-006: Should handle long strings', async () => {
    const longKey = 'sk-' + 'a'.repeat(1000);
    const encrypted = await encryptAPIKey(longKey);
    const decrypted = await decryptAPIKey(encrypted);
    
    expect(decrypted).toBe(longKey);
  });
});
```

#### Step 5: 作業ログ作成

**ファイル:** `docs/05_logs/2025_11/20251103/01_api-key-encryption.md`

---

## 🎯 Phase 0.3: Mastraセットアップ

**期間:** 1日（2025-11-04予定）
**目標:** Mastraフレームワークをインストールし、マルチLLM対応のクライアントを実装

### 実装する機能

#### 1. Mastraインストール

```bash
bun add @mastra/core @mastra/agent @mastra/llm
```

#### 2. Mastraクライアント

```typescript
/**
 * Create Mastra client for LLM interactions
 * 
 * @param provider - LLM provider (gemini, openai, claude)
 * @param apiKey - Decrypted API key
 * @param model - Model name (optional)
 * @returns Mastra instance
 */
export function createMastraClient(options: MastraClientOptions): Mastra
```

### 実装ステップ

#### Step 1: 仕様書作成

**ファイル:** `lib/mastra/client.spec.md`

```markdown
# Mastra Client 仕様書

## Requirements

### R-001: サポートプロバイダー
- Google Gemini (gemini-pro, gemini-pro-vision)
- OpenAI (gpt-4, gpt-3.5-turbo)
- Anthropic Claude (claude-3-opus, claude-3-sonnet)

### R-002: クライアント初期化
- プロバイダーとAPIキーを受け取る
- モデル名は省略可能（デフォルト値を使用）

### R-003: エラーハンドリング
- 不正なプロバイダー名でエラー
- APIキーが空の場合エラー

## Test Cases

### TC-001: Geminiクライアント初期化
入力: { provider: 'gemini', apiKey: 'test-key' }
期待: Mastraインスタンスが返る

### TC-002: OpenAIクライアント初期化
入力: { provider: 'openai', apiKey: 'test-key' }
期待: Mastraインスタンスが返る

### TC-003: Claudeクライアント初期化
入力: { provider: 'claude', apiKey: 'test-key' }
期待: Mastraインスタンスが返る

### TC-004: 不正なプロバイダー
入力: { provider: 'invalid', apiKey: 'test-key' }
期待: エラーがスローされる
```

#### Step 2: 実装

**ファイル:** `lib/mastra/client.ts`

#### Step 3: テストコード実装

**ファイル:** `lib/mastra/__tests__/client.test.ts`

#### Step 4: 作業ログ作成

**ファイル:** `docs/05_logs/2025_11/20251104/01_mastra-setup.md`

---

## 🎯 Phase 0.4: Server Actions実装

**期間:** 1日（2025-11-05予定）
**目標:** APIキー管理のためのServer Actionsを実装

### 実装する機能

#### 1. APIキー保存

```typescript
/**
 * Save encrypted API key to database
 * 
 * @param provider - LLM provider
 * @param apiKey - Plain text API key
 * @returns Success or error result
 */
export async function saveAPIKey(provider: string, apiKey: string)
```

#### 2. APIキー取得状態

```typescript
/**
 * Get API key status for a provider
 * 
 * @param provider - LLM provider
 * @returns API key status (exists, active, last_used)
 */
export async function getAPIKeyStatus(provider: string)
```

#### 3. APIキー削除

```typescript
/**
 * Delete API key for a provider
 * 
 * @param provider - LLM provider
 * @returns Success or error result
 */
export async function deleteAPIKey(provider: string)
```

#### 4. APIキー検証

```typescript
/**
 * Test API key validity
 * 
 * @param provider - LLM provider
 * @param apiKey - API key to test
 * @returns Validation result
 */
export async function testAPIKey(provider: string, apiKey: string)
```

### 実装ステップ

#### Step 1: 仕様書作成

**ファイル:** `app/_actions/ai/apiKey.spec.md`

#### Step 2: 実装

**ファイル:** `app/_actions/ai/apiKey.ts`

#### Step 3: テストコード実装

**ファイル:** `app/_actions/ai/__tests__/apiKey.test.ts`

#### Step 4: 作業ログ作成

**ファイル:** `docs/05_logs/2025_11/20251105/01_server-actions.md`

---

## 🎯 Phase 0.5: UI実装

**期間:** 1日（2025-11-06予定）
**目標:** APIキー設定画面とコンポーネントを実装

### 実装する機能

#### 1. APIキー設定ページ

**パス:** `/settings/api-keys`

#### 2. コンポーネント構成

```
components/settings/
├── APIKeySettings.tsx        # メイン設定画面
├── APIKeyForm.tsx           # APIキー入力フォーム
├── ProviderSelector.tsx     # プロバイダー選択
└── APIKeyStatus.tsx         # 現在の設定状態表示
```

#### 3. 未設定時のプロンプト

**コンポーネント:** `components/ai-command-bar/APIKeyPrompt.tsx`

```tsx
<APIKeyPrompt>
  AI機能を使用するには、LLMプロバイダーのAPIキーを設定してください
  [APIキーを設定] → /settings/api-keys
</APIKeyPrompt>
```

### 実装ステップ

#### Step 1: 仕様書作成

**ファイル:** `components/settings/APIKeySettings.spec.md`

#### Step 2: コンポーネント実装

- `components/settings/APIKeySettings.tsx`
- `components/settings/APIKeyForm.tsx`
- `components/settings/ProviderSelector.tsx`
- `components/settings/APIKeyStatus.tsx`

#### Step 3: ページ作成

**ファイル:** `app/(protected)/settings/api-keys/page.tsx`

#### Step 4: ナビゲーション更新

既存のナビゲーションメニューに「APIキー設定」を追加

#### Step 5: テストコード実装

- `components/settings/__tests__/APIKeySettings.test.tsx`
- `components/settings/__tests__/APIKeyForm.test.tsx`

#### Step 6: 作業ログ作成

**ファイル:** `docs/05_logs/2025_11/20251106/01_ui-implementation.md`

---

## 📊 全体の依存関係

```
Phase 0.1: Database
    ↓
Phase 0.2: Encryption
    ↓
Phase 0.3: Mastra Setup
    ↓
Phase 0.4: Server Actions
    ↓
Phase 0.5: UI
```

### 依存関係の詳細

- **Phase 0.2 → Phase 0.4**: Server ActionsでAPIキー暗号化を使用
- **Phase 0.3 → Phase 0.4**: APIキー検証でMastraクライアントを使用
- **Phase 0.4 → Phase 0.5**: UIからServer Actionsを呼び出し

---

## 🔒 セキュリティチェックリスト

各Phase完了時に確認：

### Phase 0.2
- [ ] 環境変数 `ENCRYPTION_KEY` が .gitignore に含まれている
- [ ] 暗号化キーが32バイト（256ビット）である
- [ ] APIキーがログに出力されない

### Phase 0.3
- [ ] Mastraクライアントがメモリ上にAPIキーを保持しない
- [ ] エラーメッセージにAPIキーが含まれない

### Phase 0.4
- [ ] RLSポリシーが正しく機能している
- [ ] 他ユーザーのAPIキーにアクセスできない
- [ ] Server Actionsが認証済みユーザーのみ実行可能

### Phase 0.5
- [ ] APIキー入力フォームが type="password"
- [ ] APIキーがブラウザコンソールに表示されない
- [ ] APIキーが履歴に保存されない

---

## 🧪 統合テスト計画

Phase 0.5完了後に実施：

### E2Eテストシナリオ

#### シナリオ1: APIキー登録フロー
1. ユーザーがログイン
2. `/settings/api-keys` に遷移
3. プロバイダー選択（Gemini）
4. APIキー入力
5. 保存ボタンクリック
6. 成功メッセージ表示
7. 設定状態が「設定済み」に変更

#### シナリオ2: APIキー更新フロー
1. 既存のAPIキーがある状態
2. 新しいAPIキーを入力
3. 保存
4. 古いAPIキーが上書きされる

#### シナリオ3: APIキー削除フロー
1. APIキーが設定済み
2. 削除ボタンクリック
3. 確認ダイアログ表示
4. 削除実行
5. 設定状態が「未設定」に変更

---

## 📝 ドキュメント更新タイミング

### 各Phase完了時

1. **実装計画を更新**: 進捗状況を記録
2. **作業ログを作成**: 実施内容・気づきを記録
3. **Issue #74を更新**: チェックボックスを更新

### 全Phase完了時

1. **README.md を更新**: 新機能の説明を追加
2. **CHANGELOG.md を更新**: バージョン情報を追加
3. **Issue #74をクローズ**: 完了報告

---

## 🎯 成功基準

### Phase 0.2
- [ ] APIキーが正しく暗号化される
- [ ] 暗号化されたAPIキーが復号化できる
- [ ] すべてのテストがPASS

### Phase 0.3
- [ ] 3つのプロバイダー（Gemini, OpenAI, Claude）が使用可能
- [ ] Mastraクライアントが正しく初期化される
- [ ] すべてのテストがPASS

### Phase 0.4
- [ ] APIキーが保存できる
- [ ] APIキーが取得できる
- [ ] APIキーが削除できる
- [ ] APIキーの検証ができる
- [ ] すべてのテストがPASS

### Phase 0.5
- [ ] APIキー設定画面が表示される
- [ ] プロバイダーを選択できる
- [ ] APIキーを入力・保存できる
- [ ] APIキー未設定時にプロンプトが表示される
- [ ] すべてのテストがPASS

---

## 🔗 関連ドキュメント

- **Issue**: [#74 Mastra基盤構築とAPIキー管理システムの実装](https://github.com/otomatty/for-all-learners/issues/74)
- **Phase 0.1 実装計画**: `docs/03_plans/mastra-infrastructure/20251102_01_implementation-plan.md`
- **Phase 0.1 作業ログ**: `docs/05_logs/2025_11/20251102/01_database-migration.md`
- **Research**: `docs/02_research/2025_10/20251030_mastra_ai_infrastructure_requirements.md`

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet)
**ステータス:** Phase 0.1 完了、Phase 0.2～0.5 計画中
