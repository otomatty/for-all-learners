# API Key Encryption

このディレクトリには、APIキーを安全に暗号化・復号化するためのユーティリティが含まれています。

## セットアップ

### 1. 暗号化キーの生成

以下のコマンドで256ビット（32バイト）の暗号化キーを生成します：

```bash
openssl rand -hex 32
```

### 2. 環境変数の設定

生成されたキーを `.env.local` ファイルに追加します：

```bash
# .env.local
ENCRYPTION_KEY=your_generated_key_here
```

**重要:** 
- `.env.local` は `.gitignore` に含まれていることを確認してください
- 本番環境では、環境変数を安全な方法で管理してください（例: AWS Secrets Manager, Vercel Environment Variables）

### 3. 環境変数の確認

環境変数が正しく設定されているか確認：

```bash
# 開発環境
echo $ENCRYPTION_KEY

# または、Node.jsで確認
node -e "console.log(process.env.ENCRYPTION_KEY ? 'Set' : 'Not Set')"
```

## 使用方法

```typescript
import { encryptAPIKey, decryptAPIKey } from '@/lib/encryption/api-key-vault';

// 暗号化
const encrypted = await encryptAPIKey('sk-test-123');
console.log(encrypted); // "1a2b3c...:4d5e6f...:7g8h9i..."

// 復号化
const decrypted = await decryptAPIKey(encrypted);
console.log(decrypted); // "sk-test-123"
```

## セキュリティ

### 暗号化アルゴリズム
- **AES-256-GCM**: 認証付き暗号化
- **128ビットIV**: ランダム生成
- **認証タグ**: データ整合性を保証

### ベストプラクティス
1. ✅ 暗号化キーは環境変数で管理
2. ✅ 毎回異なるIVを使用（IVの再利用防止）
3. ✅ 認証タグによる改ざん検出
4. ✅ エラーメッセージにAPIキーを含めない
5. ✅ ログにAPIキーを出力しない

### 注意事項
- 🚫 暗号化キーをコードにハードコードしない
- 🚫 暗号化キーをGitにコミットしない
- 🚫 本番環境の暗号化キーを開発環境と共有しない

## テスト

```bash
# テスト実行
bun test lib/encryption/__tests__/api-key-vault.test.ts

# カバレッジ確認
bun test --coverage lib/encryption/__tests__/api-key-vault.test.ts
```

## トラブルシューティング

### エラー: "ENCRYPTION_KEY environment variable is not set"

**原因:** 環境変数が設定されていない

**解決方法:**
1. `.env.local` ファイルが存在するか確認
2. `ENCRYPTION_KEY` が正しく設定されているか確認
3. アプリケーションを再起動

### エラー: "ENCRYPTION_KEY must be 32 bytes (64 hex characters)"

**原因:** 暗号化キーの長さが不正

**解決方法:**
1. `openssl rand -hex 32` で新しいキーを生成
2. 64文字の16進数文字列であることを確認

### エラー: "Failed to decrypt API key"

**原因:** 
- 暗号化文字列の形式が不正
- データが改ざんされている
- 異なる暗号化キーで復号化しようとしている

**解決方法:**
1. 暗号化文字列の形式を確認（`iv:authTag:encrypted`）
2. 暗号化時と同じ環境変数を使用しているか確認

## 関連ドキュメント

- **仕様書**: `api-key-vault.spec.md`
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`
- **Issue**: [#74](https://github.com/otomatty/for-all-learners/issues/74)
