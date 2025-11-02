# ENCRYPTION_KEY環境変数エラー修正ログ

**作業日**: 2025-11-03
**担当**: AI Assistant
**Phase**: Phase 0.2（APIキー暗号化基盤）

---

## 🐛 発生したエラー

### エラー内容

```
Error: ENCRYPTION_KEY environment variable is not set
    at [project]/lib/encryption/api-key-vault.ts
```

### 原因

1. **モジュールレベルでのチェック**: `api-key-vault.ts`がモジュールのトップレベルで`process.env.ENCRYPTION_KEY`をチェックしていた
2. **環境変数未設定**: `.env.local`に`ENCRYPTION_KEY`が設定されていなかった
3. **即座のエラー**: ファイルがimportされた瞬間にエラーが発生し、アプリ全体が起動不可

### 影響範囲

- 開発サーバーが起動しない
- ビルドが失敗する
- 全てのページでエラー

---

## 🔧 実施した修正

### 1. `api-key-vault.ts` の遅延初期化パターン実装

**ファイル**: `lib/encryption/api-key-vault.ts`

#### Before（問題のあるコード）

```typescript
// モジュールレベルで即座にチェック
const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY_HEX) {
  throw new Error("ENCRYPTION_KEY environment variable is not set");
}

const KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
```

**問題点**:
- ファイルが`import`された瞬間にエラーが発生
- 環境変数が設定されていない開発環境では使用不可
- フォールバック処理ができない

#### After（修正後のコード）

```typescript
/**
 * Lazy initialization of encryption key
 * This prevents errors during module import when ENCRYPTION_KEY is not set
 */
let ENCRYPTION_KEY: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (ENCRYPTION_KEY) {
    return ENCRYPTION_KEY;
  }

  const ENCRYPTION_KEY_HEX = process.env.ENCRYPTION_KEY;

  if (!ENCRYPTION_KEY_HEX) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate with: openssl rand -hex 32"
    );
  }

  // Validate hex string format and length
  if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
    throw new Error(
      "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
        "Generate with: openssl rand -hex 32"
    );
  }

  ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
  return ENCRYPTION_KEY;
}
```

**改善点**:
- ✅ モジュールimport時にエラーが発生しない
- ✅ 実際に暗号化/復号化関数が呼ばれたときにチェック
- ✅ 環境変数フォーマットのバリデーション追加
- ✅ ユーザーフレンドリーなエラーメッセージ（生成コマンド付き）
- ✅ 一度読み込んだらキャッシュして再利用

#### `encryptAPIKey()`の修正

```typescript
export async function encryptAPIKey(apiKey: string): Promise<string> {
  try {
    // Get encryption key (lazy initialization)
    const key = getEncryptionKey();

    // Generate random IV
    const iv = randomBytes(IV_LENGTH);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);
    // ... 以降のコード
  }
}
```

#### `decryptAPIKey()`の修正

```typescript
export async function decryptAPIKey(encryptedKey: string): Promise<string> {
  try {
    // Get encryption key (lazy initialization)
    const key = getEncryptionKey();

    // Split into components
    const parts = encryptedKey.split(":");
    // ... 以降のコード
  }
}
```

---

### 2. `.env.local` に `ENCRYPTION_KEY` 追加

**ファイル**: `.env.local`（Gitに含まれない）

#### 生成コマンド

```bash
openssl rand -hex 32
```

**出力例**:
```
feca918f05dc7f72c3a204b40b6f6d9588d4e6c7a3f818dcd77af19a79df3c5e
```

#### 追加内容

```bash
# API Key Encryption (Phase 0.2)
# Used to encrypt/decrypt user API keys in the database
# Generated with: openssl rand -hex 32
# Must be 64 hex characters (32 bytes / 256 bits)
ENCRYPTION_KEY=feca918f05dc7f72c3a204b40b6f6d9588d4e6c7a3f818dcd77af19a79df3c5e
```

---

### 3. `.env.example` の確認

**ファイル**: `.env.example`

既に適切なコメントが記載されていることを確認：

```bash
# API Key Encryption (Phase 0.2)
# Generate with: openssl rand -hex 32
# Must be 64 hex characters (32 bytes / 256 bits)
ENCRYPTION_KEY=your-encryption-key-here
```

---

## ✅ 修正結果

### ビルド成功

```bash
$ bun run build
   ▲ Next.js 15.4.7
   - Environments: .env.local
   - Experiments (use with caution):
     · serverActions

   Creating an optimized production build ...
 ✓ Compiled successfully in 17.0s
   Linting and checking validity of types ...
   Collecting page data ...
 ✓ Generating static pages (42/42)
   Finalizing page optimization ...
   Collecting build traces ...

Route (app)                                               Size  First Load JS
... (42 routes compiled successfully)
```

### Lint チェック

```bash
$ bun lint
Checked 662 files in 404ms. No fixes applied.
Found 11 warnings.
```

- ✅ エラー: 0
- ⚠️ ワーニング: 11（既存の軽微な警告のみ）

---

## 📊 技術的詳細

### 遅延初期化パターンのメリット

1. **エラーの遅延**: 実際に機能が使われるまでエラーが発生しない
2. **フォールバック可能**: `getUserAPIKey()`が環境変数フォールバックを実装している場合、ユーザーAPIキー未設定時でも動作
3. **開発体験向上**: 環境変数が未設定でも他の機能は使用可能
4. **セキュリティ**: 暗号化キーは初回使用時のみメモリにロード

### 暗号化キーの要件

- **フォーマット**: 16進数（hex）
- **長さ**: 64文字（32バイト = 256ビット）
- **アルゴリズム**: AES-256-GCM
- **生成方法**: `openssl rand -hex 32`

### バリデーション

```typescript
// 64文字の16進数文字列かチェック
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error(
    "ENCRYPTION_KEY must be 64 hex characters (32 bytes). " +
      "Generate with: openssl rand -hex 32"
  );
}
```

---

## 🔐 セキュリティ考慮事項

### `.env.local` の扱い

- ✅ `.gitignore`に含まれている（コミットされない）
- ✅ ローカル開発環境のみで使用
- ✅ 本番環境では別途環境変数を設定

### 本番環境デプロイ時の注意

1. **環境変数設定**: Vercel/Netlify/AWS等のプラットフォームで`ENCRYPTION_KEY`を設定
2. **キーの管理**: 安全な場所に保管（1Password, AWS Secrets Manager等）
3. **キーのローテーション**: 定期的な更新を推奨
4. **アクセス制限**: 必要最小限の人員のみアクセス可能に

---

## 🧪 テスト影響

### 既存テスト

- ✅ `api-key-vault.test.ts`: 影響なし（テスト環境でモック設定済み）
- ✅ `getUserAPIKey.test.ts`: 影響なし（環境変数フォールバックでカバー）

### 新規テストケース（今後追加推奨）

```typescript
// TC-XXX: ENCRYPTION_KEY未設定時のエラー
test("Should throw error when ENCRYPTION_KEY is not set", async () => {
  delete process.env.ENCRYPTION_KEY;
  
  await expect(encryptAPIKey("test")).rejects.toThrow(
    "ENCRYPTION_KEY environment variable is not set"
  );
});

// TC-XXX: ENCRYPTION_KEY不正フォーマット
test("Should throw error for invalid ENCRYPTION_KEY format", async () => {
  process.env.ENCRYPTION_KEY = "invalid-key";
  
  await expect(encryptAPIKey("test")).rejects.toThrow(
    "ENCRYPTION_KEY must be 64 hex characters"
  );
});
```

---

## 📝 残タスク

### Phase 1.4 完了後

- [ ] **Phase 1.4 検証**: 実際のブラウザで動作確認
- [ ] **Phase 1.5 実装**: エラーハンドリング強化
- [ ] **Phase 2.0 実装**: 統合LLMクライアント

### セキュリティ関連（中期）

- [ ] 環境変数暗号化キーのローテーション手順書作成
- [ ] 本番環境デプロイガイド更新
- [ ] セキュリティ監査実施

---

## 🔗 関連ドキュメント

### 修正ファイル

- `lib/encryption/api-key-vault.ts` - 遅延初期化パターン実装
- `.env.local` - ENCRYPTION_KEY追加（Git非管理）
- `.env.example` - コメント確認

### 関連計画

- [Phase 0.2 実装計画](../../03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md)
- [Phase 1.4 完了サマリー](../../03_plans/ai-integration/20251103_02_phase14-summary-and-next-steps.md)

### テストファイル

- `lib/encryption/__tests__/api-key-vault.test.ts`（影響なし）
- `app/_actions/ai/__tests__/getUserAPIKey.test.ts`（影響なし）

---

## 💡 学び・気づき

### 遅延初期化パターンの重要性

Node.jsモジュールは`import`時に評価されるため、モジュールトップレベルでの環境変数チェックは以下の問題を引き起こす：

1. **開発体験の悪化**: 環境変数未設定でアプリ全体が起動不可
2. **テスト困難**: モックが効かない
3. **フォールバック不可**: 条件分岐ができない

**解決策**: 関数呼び出し時に初めて環境変数をチェックする遅延初期化パターン

### 環境変数の段階的検証

```typescript
// Step 1: 存在チェック
if (!ENCRYPTION_KEY_HEX) {
  throw new Error("環境変数が設定されていません");
}

// Step 2: フォーマット検証
if (!/^[0-9a-fA-F]{64}$/.test(ENCRYPTION_KEY_HEX)) {
  throw new Error("フォーマットが正しくありません");
}

// Step 3: バッファ変換
ENCRYPTION_KEY = Buffer.from(ENCRYPTION_KEY_HEX, "hex");
```

明確なエラーメッセージにより、デバッグ時間を大幅に短縮できる。

---

**作業時間**: 約30分
**次回作業**: Phase 1.4 検証（ブラウザでの動作確認）
**最終更新**: 2025-11-03 01:00
