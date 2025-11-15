# トラブルシューティングガイド

**最終更新**: 2025-11-06  
**対象**: プラグイン開発者

---

## 目次

1. [よくあるエラーと解決方法](#よくあるエラーと解決方法)
2. [デバッグ方法](#デバッグ方法)
3. [パフォーマンス問題の解決](#パフォーマンス問題の解決)
4. [セキュリティ問題の解決](#セキュリティ問題の解決)

---

## よくあるエラーと解決方法

### エラー: "Cannot find module '@fal/plugin-types'"

**原因**: 型定義パッケージが見つかりません。

**解決方法**:

1. 型定義を生成：
   ```bash
   bun run plugins:generate-types
   ```

2. プラグインで相対パスを使用：
   ```typescript
   // tsconfig.json の types フィールドを削除
   // インポートは相対パスで
   import type { PluginAPI } from "../../../../packages/plugin-types";
   ```

### エラー: "Plugin not found"

**原因**: プラグインIDが正しくないか、プラグインディレクトリが見つかりません。

**解決方法**:

1. プラグインIDを確認：
   ```bash
   # プラグインのディレクトリ名を確認
   ls plugins/examples/
   
   # プラグインIDは kebab-case に変換される
   # 例: com.example.my-plugin → com-example-my-plugin
   ```

2. マニフェストファイルを確認：
   ```json
   {
     "id": "com.example.my-plugin",
     "main": "src/index.ts"
   }
   ```

### エラー: "Manifest validation failed"

**原因**: `plugin.json` の形式が正しくありません。

**解決方法**:

1. マニフェストの必須フィールドを確認：
   ```json
   {
     "id": "com.example.my-plugin",  // 必須
     "name": "My Plugin",            // 必須
     "version": "1.0.0",             // 必須
     "author": "Your Name",          // 必須
     "main": "src/index.ts"          // 必須
   }
   ```

2. 型チェックを実行：
   ```bash
   bunx tsc --noEmit
   ```

### エラー: "Build failed"

**原因**: ビルドエラーが発生しています。

**解決方法**:

1. 型エラーを確認：
   ```bash
   bunx tsc --noEmit
   ```

2. 依存関係を確認：
   ```bash
   bun install
   ```

3. ビルドログを確認：
   ```bash
   bun run plugins:build my-plugin 2>&1 | tee build.log
   ```

### エラー: "Plugin failed to load"

**原因**: プラグインの読み込みに失敗しました。

**解決方法**:

1. プラグインのコードを確認：
   - `activate()` 関数が正しく実装されているか
   - エラーが発生していないか

2. ブラウザのコンソールを確認：
   - エラーメッセージを確認
   - スタックトレースを確認

---

## デバッグ方法

### 1. ログの確認

プラグインコード内で `console.log` を使用すると、メインスレッドに転送されます：

```typescript
async function activate(api: PluginAPI) {
  console.log("Plugin activated"); // ブラウザのコンソールに表示される
  
  // デバッグ情報を出力
  console.log("API version:", api.app.getVersion());
  console.log("User ID:", await api.app.getUserId());
}
```

### 2. ブラウザ開発者ツール

1. ブラウザの開発者ツールを開く（F12）
2. `Application` → `Workers` で Worker を確認
3. `Console` でログを確認

### 4. プラグインの状態確認

```typescript
// プラグインの状態を確認
const registry = getPluginRegistry();
const plugin = registry.get("com.example.my-plugin");
console.log("Plugin state:", {
  loaded: plugin !== null,
  enabled: plugin?.enabled,
  error: plugin?.error,
});
```

---

## パフォーマンス問題の解決

### 問題: プラグインの読み込みが遅い

**原因**: プラグインのコードが大きすぎる、または重い処理が含まれている。

**解決方法**:

1. コードを分割：
   ```typescript
   // 重い処理は遅延読み込み
   async function heavyOperation() {
     const module = await import("./heavy-module");
     return module.process();
   }
   ```

2. 不要な依存関係を削除：
   ```bash
   # package.json を確認
   # 不要な依存関係を削除
   ```

### 問題: メモリリーク

**原因**: イベントリスナーやタイマーがクリーンアップされていない。

**解決方法**:

```typescript
// ✅ 良い例: クリーンアップを行う
async function activate(api: PluginAPI) {
  const listeners: Array<() => void> = [];
  
  // イベントリスナーを追加
  const listener = () => { /* ... */ };
  listeners.push(listener);
  
  return {
    dispose: async () => {
      // すべてのリスナーを削除
      listeners.forEach((l) => l());
    },
  };
}
```

### 問題: ストレージアクセスが遅い

**原因**: ストレージへの頻繁なアクセス。

**解決方法**:

```typescript
// ❌ 悪い例: 頻繁なアクセス
for (let i = 0; i < 100; i++) {
  await api.storage.set(`key-${i}`, i);
}

// ✅ 良い例: バッチ処理
const data: Record<string, unknown> = {};
for (let i = 0; i < 100; i++) {
  data[`key-${i}`] = i;
}
await api.storage.set("batch", data);
```

---

## セキュリティ問題の解決

### 問題: ユーザー入力の検証不足

**解決方法**:

```typescript
// ✅ 良い例: 入力検証
function validateInput(input: unknown): input is string {
  return typeof input === "string" && input.length > 0 && input.length < 1000;
}

async function handler(input: unknown) {
  if (!validateInput(input)) {
    api.notifications.error("無効な入力です");
    return;
  }
  
  // 検証済みの入力を使用
  await api.storage.set("data", input);
}
```

### 問題: 機密情報の漏洩

**解決方法**:

```typescript
// ❌ 悪い例: 機密情報をストレージに保存
await api.storage.set("password", "secret");

// ✅ 良い例: 機密情報は保存しない、またはハッシュ化
// トークンは一時的なもののみ保存
await api.storage.set("tempToken", token, { expires: 3600 });
```

---


## よくある質問

### Q: プラグインが読み込まれません

**A**: 以下を確認してください：
1. プラグインがビルドされているか（`dist/index.js` が存在するか）
2. マニフェストファイルが正しいか
3. エラーが発生していないか（ブラウザのコンソールで確認）
4. プラグインを公開してマーケットプレイスからインストールしてテスト

### Q: 型エラーが解決できません

**A**: 
1. 型定義を再生成：
   ```bash
   bun run plugins:generate-types
   ```
2. TypeScriptの設定を確認：
   ```json
   {
     "compilerOptions": {
       "moduleResolution": "bundler",
       "skipLibCheck": true
     }
   }
   ```

### Q: Worker内でエラーが発生します

**A**: 
1. ブラウザのコンソールでエラーを確認
2. `console.log` を使ってデバッグ情報を出力
3. プラグインを公開してマーケットプレイスからインストールしてテスト

---

## サポート

問題が解決しない場合は、以下を確認してください：

1. **ドキュメント**: [プラグイン開発ガイド](./plugin-development.md)
2. **サンプルプラグイン**: `plugins/examples/` を参照
3. **Issue**: GitHubでIssueを作成

---

**前のドキュメント**: [ベストプラクティス](./best-practices.md)  
**関連ドキュメント**: [はじめに](./tutorial-getting-started.md)

