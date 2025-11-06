# プラグイン開発のベストプラクティス

**最終更新**: 2025-11-06  
**対象**: プラグイン開発者

---

## 目次

1. [セキュリティのベストプラクティス](#セキュリティのベストプラクティス)
2. [パフォーマンスのベストプラクティス](#パフォーマンスのベストプラクティス)
3. [エラーハンドリングのベストプラクティス](#エラーハンドリングのベストプラクティス)
4. [テストのベストプラクティス](#テストのベストプラクティス)
5. [コード品質のベストプラクティス](#コード品質のベストプラクティス)

---

## セキュリティのベストプラクティス

### 1. ユーザー入力の検証

プラグインはユーザー入力を受け取る場合、必ず検証を行ってください。

```typescript
// ❌ 悪い例
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "unsafe-command",
    label: "コマンド",
    handler: async (userInput: string) => {
      // 検証なしで使用 - セキュリティリスク
      await api.storage.set("data", userInput);
    },
  });
}

// ✅ 良い例
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "safe-command",
    label: "コマンド",
    handler: async (userInput: unknown) => {
      // 入力を検証
      if (typeof userInput !== "string" || userInput.length > 1000) {
        api.notifications.error("無効な入力です");
        return;
      }
      
      // 安全に使用
      await api.storage.set("data", userInput);
    },
  });
}
```

### 2. ストレージデータの保護

機密情報をストレージに保存する場合は、暗号化を検討してください。

```typescript
// ⚠️ 注意: 機密情報は保存しない
await api.storage.set("password", "secret"); // ❌ 避けるべき

// ✅ 代わりに、トークンやハッシュのみを保存
await api.storage.set("authTokenHash", hashToken(token));
```

### 3. API呼び出しの制限

レート制限を考慮してAPI呼び出しを行ってください。

```typescript
// ✅ 良い例: リトライロジックとエラーハンドリング
async function callAPIWithRetry(api: PluginAPI, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // API呼び出し
      return await api.integration.callExternalAPI(/* ... */);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## パフォーマンスのベストプラクティス

### 1. 非同期処理の適切な使用

重い処理は非同期で実行し、UIをブロックしないようにしてください。

```typescript
// ❌ 悪い例: 同期的な重い処理
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "heavy-command",
    handler: async () => {
      // 重い処理を同期的に実行 - UIがフリーズする
      const result = heavyComputation();
      api.notifications.success("完了");
    },
  });
}

// ✅ 良い例: 非同期で処理
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "heavy-command",
    handler: async () => {
      api.notifications.info("処理中...");
      
      // 非同期で処理
      const result = await heavyComputationAsync();
      
      api.notifications.success("完了");
    },
  });
}
```

### 2. ストレージの効率的な使用

ストレージへのアクセスは最小限に抑え、必要に応じてキャッシュを使用してください。

```typescript
// ❌ 悪い例: 頻繁なストレージアクセス
async function getData() {
  const data1 = await api.storage.get("data1");
  const data2 = await api.storage.get("data2");
  const data3 = await api.storage.get("data3");
  // 複数のアクセスが発生
}

// ✅ 良い例: 一度に取得
async function getData() {
  const keys = await api.storage.keys();
  const allData = await Promise.all(
    keys.map((key) => api.storage.get(key))
  );
}
```

### 3. メモリリークの防止

イベントリスナーやタイマーは必ずクリーンアップしてください。

```typescript
// ✅ 良い例: クリーンアップを行う
async function activate(api: PluginAPI) {
  let intervalId: number | undefined;
  
  // タイマーを設定
  intervalId = setInterval(() => {
    // 定期的な処理
  }, 1000);
  
  return {
    dispose: async () => {
      // タイマーをクリア
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    },
  };
}
```

---

## エラーハンドリングのベストプラクティス

### 1. 適切なエラーハンドリング

すべての非同期操作でエラーハンドリングを行ってください。

```typescript
// ❌ 悪い例: エラーハンドリングなし
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "unsafe-command",
    handler: async () => {
      const data = await api.storage.get("data"); // エラーが発生する可能性
      processData(data); // dataがundefinedの可能性
    },
  });
}

// ✅ 良い例: 適切なエラーハンドリング
async function activate(api: PluginAPI) {
  await api.ui.registerCommand({
    id: "safe-command",
    handler: async () => {
      try {
        const data = await api.storage.get("data");
        
        if (data === undefined) {
          api.notifications.warning("データが見つかりません");
          return;
        }
        
        processData(data);
        api.notifications.success("処理完了");
      } catch (error) {
        api.notifications.error(
          `エラー: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
  });
}
```

### 2. エラーメッセージのユーザーフレンドリーな表現

エラーメッセージは、ユーザーが理解しやすい形式で表示してください。

```typescript
// ❌ 悪い例: 技術的なエラーメッセージ
catch (error) {
  api.notifications.error(`Error: ${error.message}`);
}

// ✅ 良い例: ユーザーフレンドリーなメッセージ
catch (error) {
  if (error instanceof Error) {
    if (error.message.includes("network")) {
      api.notifications.error("ネットワークエラーが発生しました。接続を確認してください。");
    } else if (error.message.includes("permission")) {
      api.notifications.error("権限が不足しています。設定を確認してください。");
    } else {
      api.notifications.error("エラーが発生しました。もう一度お試しください。");
    }
  }
}
```

### 3. エラーの記録

重要なエラーはログに記録してください。

```typescript
// ✅ 良い例: エラーを記録
try {
  await riskyOperation();
} catch (error) {
  // ユーザーに通知
  api.notifications.error("操作に失敗しました");
  
  // エラーを記録（プラグイン開発時にデバッグ用）
  console.error("Plugin error:", error);
}
```

---

## テストのベストプラクティス

### 1. 単体テストの作成

プラグインの各機能は、単体テストで検証してください。

```typescript
// __tests__/my-plugin.test.ts
import { describe, it, expect, vi } from "vitest";
import activate from "../src/index";

describe("My Plugin", () => {
  it("should register a command", async () => {
    const mockAPI = {
      ui: {
        registerCommand: vi.fn().mockResolvedValue(undefined),
      },
      notifications: {
        success: vi.fn(),
      },
    };
    
    await activate(mockAPI as unknown as PluginAPI);
    
    expect(mockAPI.ui.registerCommand).toHaveBeenCalled();
  });
});
```

### 2. モックの使用

プラグインAPIは、モックを使用してテストしてください。

```typescript
// ✅ 良い例: APIをモック
const createMockAPI = (): PluginAPI => ({
  app: {
    getVersion: () => "1.0.0",
    getName: () => "F.A.L",
    getUserId: async () => "user123",
  },
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    keys: vi.fn(),
    clear: vi.fn(),
  },
  // ... 他のAPI
});
```

### 3. エッジケースのテスト

エッジケースもテストしてください。

```typescript
describe("Edge cases", () => {
  it("should handle undefined storage values", async () => {
    const mockAPI = createMockAPI();
    mockAPI.storage.get = vi.fn().mockResolvedValue(undefined);
    
    // プラグインがundefinedを適切に処理することを確認
    const result = await activate(mockAPI);
    expect(result).toBeDefined();
  });
  
  it("should handle API errors gracefully", async () => {
    const mockAPI = createMockAPI();
    mockAPI.storage.get = vi.fn().mockRejectedValue(new Error("Network error"));
    
    // エラーが適切に処理されることを確認
    await expect(activate(mockAPI)).resolves.toBeDefined();
  });
});
```

---

## コード品質のベストプラクティス

### 1. 型安全性の確保

TypeScriptの型を適切に使用してください。

```typescript
// ❌ 悪い例: any型の使用
function processData(data: any) {
  return data.value;
}

// ✅ 良い例: 適切な型定義
interface Data {
  value: string;
}

function processData(data: Data): string {
  return data.value;
}
```

### 2. コードの可読性

意味のある変数名と関数名を使用してください。

```typescript
// ❌ 悪い例: 意味のない名前
const x = await api.storage.get("d");
const y = x + 1;

// ✅ 良い例: 意味のある名前
const count = await api.storage.get<number>("count");
const incrementedCount = count !== undefined ? count + 1 : 1;
```

### 3. コメントの適切な使用

複雑なロジックにはコメントを追加してください。

```typescript
// ✅ 良い例: 適切なコメント
/**
 * 選択範囲のテキストを大文字に変換します
 * 
 * @param api Plugin API instance
 */
async function convertSelectionToUppercase(api: PluginAPI) {
  // 選択範囲を取得
  const selection = await api.editor.getSelection();
  
  if (!selection || !selection.text) {
    api.notifications.warning("テキストを選択してください");
    return;
  }
  
  // 大文字に変換して置換
  const uppercase = selection.text.toUpperCase();
  await api.editor.setSelection(selection.from, selection.to);
  await api.editor.executeCommand("deleteSelection");
  await api.editor.executeCommand("insertContent", uppercase);
}
```

### 4. 関数の分割

大きな関数は小さな関数に分割してください。

```typescript
// ❌ 悪い例: 大きな関数
async function complexHandler() {
  // 100行以上のコード
}

// ✅ 良い例: 小さな関数に分割
async function validateInput(input: string): boolean {
  // 検証ロジック
}

async function processData(data: Data): ProcessedData {
  // 処理ロジック
}

async function displayResult(result: ProcessedData): void {
  // 表示ロジック
}
```

### 5. 依存関係の管理

プラグインの依存関係は最小限にしてください。

```typescript
// ❌ 悪い例: 多くの依存関係
import { library1, library2, library3 } from "heavy-library";

// ✅ 良い例: 必要な機能のみをインポート
import { specificFunction } from "lightweight-library";
```

---

## まとめ

これらのベストプラクティスに従うことで、安全で保守性の高いプラグインを作成できます。

### チェックリスト

プラグインを公開する前に、以下を確認してください：

- [ ] ユーザー入力の検証が実装されている
- [ ] エラーハンドリングが適切に実装されている
- [ ] メモリリークがない（dispose関数が適切に実装されている）
- [ ] 単体テストが作成されている
- [ ] 型定義が適切に使用されている
- [ ] コードが読みやすく、コメントが適切に追加されている
- [ ] パフォーマンスが考慮されている

---

**前のドキュメント**: [APIリファレンス](./api-reference.md)  
**次のドキュメント**: [トラブルシューティング](./troubleshooting.md)

