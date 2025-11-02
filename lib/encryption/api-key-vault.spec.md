# APIキー暗号化 仕様書

**対象:** APIキー暗号化・復号化機能
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## Requirements

### R-001: 暗号化アルゴリズム
- **アルゴリズム**: AES-256-GCM を使用
- **IV（Initialization Vector）**: 128ビット（16バイト）をランダム生成
- **認証タグ（Auth Tag）**: 128ビット（16バイト）を使用してデータ整合性を保証
- **理由**: GCMモードは認証付き暗号化を提供し、暗号化とデータ整合性検証を同時に行える

### R-002: 環境変数
- **環境変数名**: `ENCRYPTION_KEY`
- **形式**: 32バイト（256ビット）の16進数文字列（64文字）
- **必須**: アプリケーション起動時に設定されている必要がある
- **生成方法**: `openssl rand -hex 32` で生成

### R-003: 出力形式
- **形式**: `iv:authTag:encrypted`
- **セパレータ**: コロン（:）で区切る
- **エンコーディング**: 各部分は16進数文字列
- **例**: `1234567890abcdef....:abcdef1234567890....:9876543210fedcba....`

### R-004: エラーハンドリング
- 環境変数未設定時はアプリケーション起動時にエラー
- 暗号化/復号化失敗時は詳細なエラーメッセージを含む
- スタックトレースは本番環境では非表示

### R-005: セキュリティ要件
- APIキーをログに出力しない
- メモリ上にAPIキーを長期間保持しない
- エラーメッセージにAPIキーを含めない

---

## Test Cases

### TC-001: 暗号化成功
**入力:**
```typescript
apiKey = "sk-test-123"
```
**期待される動作:**
- 暗号化された文字列が返る
- 元の文字列と異なる
- `iv:authTag:encrypted` 形式に従う
- 3つの部分に分割できる

### TC-002: 復号化成功
**入力:**
```typescript
encryptedKey = await encryptAPIKey("sk-test-123")
```
**期待される動作:**
- 元の文字列 "sk-test-123" が正確に復元される
- データが改ざんされていない

### TC-003: 複数回暗号化で異なる結果
**入力:**
```typescript
apiKey = "sk-test-123"
encrypted1 = await encryptAPIKey(apiKey)
encrypted2 = await encryptAPIKey(apiKey)
```
**期待される動作:**
- `encrypted1 !== encrypted2`（IVがランダムのため）
- 両方とも正しく復号化できる

### TC-004: 環境変数未設定
**前提条件:**
```typescript
delete process.env.ENCRYPTION_KEY
```
**期待される動作:**
- モジュールインポート時に Error がスローされる
- エラーメッセージ: "ENCRYPTION_KEY environment variable is not set"

### TC-005: 不正な形式の暗号化文字列
**入力:**
```typescript
encryptedKey = "invalid-format"
```
**期待される動作:**
- `decryptAPIKey()` が Error をスロー
- エラーメッセージ: "Invalid encrypted key format"

### TC-006: 空文字列の暗号化
**入力:**
```typescript
apiKey = ""
```
**期待される動作:**
- 正常に暗号化される
- 復号化すると空文字列が返る

### TC-007: 長い文字列の暗号化
**入力:**
```typescript
apiKey = "sk-" + "a".repeat(1000)
```
**期待される動作:**
- 正常に暗号化される
- 復号化すると元の文字列が正確に復元される

### TC-008: 改ざん検出
**入力:**
```typescript
encrypted = await encryptAPIKey("sk-test-123")
// 暗号化文字列の一部を改ざん
tamperedEncrypted = encrypted.slice(0, -2) + "XX"
```
**期待される動作:**
- `decryptAPIKey()` が Error をスロー
- 認証タグ検証失敗のエラー

### TC-009: 不正な長さの暗号化キー
**前提条件:**
```typescript
process.env.ENCRYPTION_KEY = "short_key"
```
**期待される動作:**
- モジュールインポート時に Error がスローされる
- エラーメッセージ: "ENCRYPTION_KEY must be 32 bytes (64 hex characters)"

### TC-010: 特殊文字を含むAPIキー
**入力:**
```typescript
apiKey = "sk-test-!@#$%^&*()_+-=[]{}|;':\",./<>?"
```
**期待される動作:**
- 正常に暗号化される
- 復号化すると元の文字列が正確に復元される

---

## Implementation Notes

### セキュリティ考慮事項

1. **IVの再利用禁止**: 毎回新しいIVをランダム生成することで、同じAPIキーでも異なる暗号化結果を生成
2. **認証タグによる改ざん検出**: GCMモードの認証タグにより、暗号化データの改ざんを検出
3. **環境変数の保護**: 暗号化キーは環境変数から取得し、コードにハードコードしない
4. **エラーメッセージの慎重な設計**: エラーメッセージにAPIキーや暗号化キーを含めない

### パフォーマンス考慮事項

1. **非同期処理**: 暗号化・復号化処理を async/await で実装し、ブロッキングを回避
2. **メモリ管理**: 処理後は必要に応じてメモリをクリア

### 依存関係

- **node:crypto**: Node.js標準モジュール（追加インストール不要）
- **TypeScript**: 型安全性を確保

---

## Related Files

- **実装**: `lib/encryption/api-key-vault.ts`
- **テスト**: `lib/encryption/__tests__/api-key-vault.test.ts`
- **使用先**: `app/_actions/ai/apiKey.ts` (Phase 0.4)
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet)
