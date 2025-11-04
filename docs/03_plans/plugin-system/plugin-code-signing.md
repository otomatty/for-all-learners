# プラグインコード署名・検証システム実装計画

**作成日**: 2025-01-05  
**ステータス**: ✅ 実装完了（Phase 3完了）  
**関連Issue**: [#96](https://github.com/otomatty/for-all-learners/issues/96) - Plugin System Security Enhancement  
**推定時間**: 6時間

---

## 概要

プラグインコードの改ざんを防止し、プラグインの真正性を保証するための署名・検証システムを実装します。これにより、悪意のあるコードの実行を防ぎ、ユーザーが信頼できるプラグインのみを実行できるようにします。

---

## 目的

1. **コード改ざんの検出**: プラグインコードが署名後に改ざんされていないことを検証
2. **真正性の保証**: プラグインが正規の作成者によって提供されたことを証明
3. **セキュリティ強化**: 署名されていない、または署名が無効なプラグインの実行を防止

---

## 実装アプローチ

### 1. 署名方式

**推奨**: Ed25519 デジタル署名（高速・軽量）

- Ed25519は署名生成・検証が高速
- 署名サイズが小さく（64バイト）、ストレージ効率が良い
- 暗号学的に安全

**代替案**: RSA (2048ビット) - より広くサポートされているが、Ed25519より遅い

### 2. 署名プロセス

#### プラグイン公開時（開発者側）

1. プラグインコードのハッシュを計算（SHA-256）
2. マニフェスト情報（id, version, author等）を含む署名データを作成
3. 秘密鍵で署名を生成
4. 署名をプラグインに含めて公開

#### プラグイン読み込み時（システム側）

1. プラグインコードのハッシュを再計算
2. 署名データを再構築
3. 公開鍵で署名を検証
4. 検証失敗時はプラグインの読み込みを拒否

### 3. データベーススキーマ

#### `plugins`テーブルに追加

```sql
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS public_key TEXT;
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signature_algorithm TEXT DEFAULT 'ed25519';
ALTER TABLE plugins ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;
```

#### 署名検証ログテーブル（オプション）

```sql
CREATE TABLE IF NOT EXISTS plugin_signature_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_id TEXT NOT NULL REFERENCES plugins(plugin_id),
  user_id UUID REFERENCES accounts(id),
  verification_result TEXT NOT NULL, -- 'valid', 'invalid', 'missing', 'error'
  error_message TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. 実装ファイル構成

```
lib/plugins/
├── plugin-signature/
│   ├── signer.ts          # 署名生成（開発者ツール）
│   ├── verifier.ts        # 署名検証（システム）
│   ├── key-manager.ts    # 鍵ペア生成・管理
│   └── types.ts          # 型定義
└── plugin-loader/
    └── plugin-loader.ts  # 検証ロジック統合
```

---

## 実装ステップ

### Phase 1: 基盤実装（2時間）

1. **型定義の追加** (`lib/plugins/plugin-signature/types.ts`)
   - `PluginSignature`型
   - `SignatureVerificationResult`型
   - `SignatureData`型

2. **鍵管理の実装** (`lib/plugins/plugin-signature/key-manager.ts`)
   - Ed25519鍵ペア生成
   - 公開鍵のエクスポート（Base64）
   - 秘密鍵の安全な保存（環境変数）

3. **署名生成の実装** (`lib/plugins/plugin-signature/signer.ts`)
   - プラグインコードのハッシュ計算
   - 署名データの構築
   - Ed25519署名生成

### Phase 2: 検証システム実装（2時間）

1. **署名検証の実装** (`lib/plugins/plugin-signature/verifier.ts`)
   - 署名データの再構築
   - Ed25519署名検証
   - エラーハンドリング

2. **プラグインローダーへの統合** (`lib/plugins/plugin-loader/plugin-loader.ts`)
   - `loadPlugin`メソッドに検証ロジック追加
   - 検証失敗時のエラー処理
   - セキュリティ監査ログへの記録

3. **データベースマイグレーション**
   - `plugins`テーブルに署名関連カラム追加
   - 検証ログテーブル作成（オプション）

### Phase 3: UI・管理機能（1時間）

1. **管理者向けUI** (`app/admin/plugins/signatures/`)
   - プラグイン署名状態の表示
   - 公開鍵の管理画面
   - 検証ログの表示

2. **開発者向けツール** (`scripts/plugin-sign.ts`)
   - コマンドライン署名ツール
   - プラグイン公開時の署名生成

### Phase 4: テスト・ドキュメント（1時間）

1. **テストケース実装**
   - 署名生成・検証のテスト
   - 改ざん検出のテスト
   - エラーハンドリングのテスト

2. **ドキュメント作成**
   - プラグイン開発者向けガイド
   - 署名プロセスの説明
   - トラブルシューティングガイド

---

## 技術的詳細

### 署名データ構造

```typescript
interface SignatureData {
  pluginId: string;
  version: string;
  codeHash: string; // SHA-256 hash of plugin code
  timestamp: number;
  author: string;
}
```

### 検証フロー

```typescript
async function verifyPluginSignature(
  manifest: PluginManifest,
  code: string,
  signature: string,
  publicKey: string,
): Promise<SignatureVerificationResult> {
  // 1. コードハッシュを計算
  const codeHash = await calculateHash(code);
  
  // 2. 署名データを再構築
  const signatureData = {
    pluginId: manifest.id,
    version: manifest.version,
    codeHash,
    timestamp: manifest.publishedAt?.getTime() || Date.now(),
    author: manifest.author,
  };
  
  // 3. 署名を検証
  const isValid = await verifySignature(
    signatureData,
    signature,
    publicKey,
  );
  
  return {
    valid: isValid,
    error: isValid ? null : 'Invalid signature',
  };
}
```

---

## セキュリティ考慮事項

1. **公開鍵の管理**
   - 公式プラグイン: システム管理者が公開鍵を管理
   - コミュニティプラグイン: プラグイン作成者が公開鍵を提供
   - 公開鍵の改ざん防止: データベースに保存し、RLSで保護

2. **署名の検証タイミング**
   - プラグイン読み込み時（必須）
   - プラグイン更新時（再検証）
   - 定期的な検証（オプション）

3. **エラーハンドリング**
   - 署名なしプラグイン: 警告表示（開発モード）または拒否（本番モード）
   - 無効な署名: プラグインの読み込みを拒否
   - セキュリティ監査ログに記録

---

## 依存関係

- **crypto**: Node.js組み込みモジュール（Ed25519署名用）
- **@noble/ed25519**: Ed25519実装（オプション、より高度な機能が必要な場合）

---

## 関連ドキュメント

- [プラグインシステム実装状況](./implementation-status.md)
- [Issue #96 - Plugin System Security Enhancement](https://github.com/otomatty/for-all-learners/issues/96)
- [セキュリティ監査ログ実装](./../05_logs/2025_11/20251105/01_security-audit-logs.md)

---

## 実装後の確認事項

- [ ] 署名生成・検証が正常に動作するか
- [ ] 改ざんされたプラグインが検出されるか
- [ ] エラーハンドリングが適切か
- [ ] セキュリティ監査ログに記録されるか
- [ ] パフォーマンスへの影響は許容範囲内か
- [ ] テストケースが全てパスするか

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|----------|------|
| 2025-01-05 | 実装計画作成 | AI Agent |

