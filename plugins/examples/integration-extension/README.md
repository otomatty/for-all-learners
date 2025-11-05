# Integration Extension サンプルプラグイン

統合拡張機能の実装例を示すサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **OAuth Provider（OAuthプロバイダー）**
   - サンプルOAuthプロバイダーの登録（デモ用）

2. **External API（外部API）**
   - サンプル外部APIの登録と呼び出し

3. **Webhook（ウェブフック）**
   - Webhookエンドポイントの登録
   - 受信したイベントの保存と管理

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、以下の統合機能が利用可能になります：
   - **OAuth認証**: サンプルOAuthプロバイダーを使用（デモ用）
   - **外部API呼び出し**: `callSampleAPI()` メソッドでAPIを呼び出し
   - **Webhook受信**: `/webhook/integration-extension-sample` エンドポイントでWebhookを受信

## 実装のポイント

### OAuth Provider の登録

```typescript
await api.integration.registerOAuthProvider({
  id: "my-oauth",
  name: "OAuth名",
  description: "説明",
  authorizationUrl: "https://example.com/oauth/authorize",
  tokenUrl: "https://example.com/oauth/token",
  clientId: "client-id",
  scopes: ["read", "write"],
});
```

### External API の登録と呼び出し

```typescript
// 登録
await api.integration.registerExternalAPI({
  id: "my-api",
  name: "API名",
  description: "説明",
  baseUrl: "https://api.example.com",
  defaultHeaders: {
    Accept: "application/json",
  },
});

// 呼び出し
const response = await api.integration.callExternalAPI("my-api", {
  method: "GET",
  url: "/endpoint",
});
```

### Webhook の登録

```typescript
await api.integration.registerWebhook({
  id: "my-webhook",
  name: "Webhook名",
  description: "説明",
  path: "/webhook/my-plugin",
  methods: ["POST"],
  handler: async (event) => {
    // Webhookイベントの処理
  },
});
```

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

