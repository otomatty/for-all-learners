# プラグインAPIリファレンス

**最終更新**: 2025-11-06  
**対象**: プラグイン開発者  
**参照**: `packages/plugin-types/index.d.ts`

---

## 目次

1. [App API](#app-api)
2. [Storage API](#storage-api)
3. [Notifications API](#notifications-api)
4. [UI API](#ui-api)
5. [Editor API](#editor-api)
6. [AI API](#ai-api)
7. [Data API](#data-api)
8. [Integration API](#integration-api)
9. [Calendar API](#calendar-api)

---

## App API

アプリケーション情報を取得するAPIです。

### `getVersion()`

アプリケーションのバージョンを取得します。

**戻り値**: `string` - アプリケーションのバージョン文字列

**使用例**:
```typescript
const version = api.app.getVersion();
console.log(`F.A.L version: ${version}`);
```

### `getName()`

アプリケーション名を取得します。

**戻り値**: `string` - アプリケーション名

**使用例**:
```typescript
const appName = api.app.getName();
console.log(`Application: ${appName}`);
```

### `getUserId()`

現在のユーザーIDを取得します。

**戻り値**: `Promise<string | null>` - ユーザーID（未認証の場合は`null`）

**使用例**:
```typescript
const userId = await api.app.getUserId();
if (userId) {
  console.log(`Current user: ${userId}`);
} else {
  console.log("Not authenticated");
}
```

---

## Storage API

プラグイン固有のキー・バリューストレージです。各プラグインは独立したストレージを持ちます。

### `get<T>(key: string)`

ストレージから値を取得します。

**パラメータ**:
- `key`: ストレージキー

**戻り値**: `Promise<T | undefined>` - 値（存在しない場合は`undefined`）

**使用例**:
```typescript
// 値を取得
const count = await api.storage.get<number>("count");
if (count !== undefined) {
  console.log(`Count: ${count}`);
}

// オブジェクトを取得
const config = await api.storage.get<{ theme: string }>("config");
```

### `set(key: string, value: unknown)`

ストレージに値を保存します。

**パラメータ**:
- `key`: ストレージキー
- `value`: 保存する値（JSONシリアライズ可能である必要があります）

**戻り値**: `Promise<void>`

**使用例**:
```typescript
// 値を保存
await api.storage.set("count", 42);
await api.storage.set("config", { theme: "dark" });
await api.storage.set("lastUpdate", new Date().toISOString());
```

### `delete(key: string)`

ストレージから値を削除します。

**パラメータ**:
- `key`: 削除するキー

**戻り値**: `Promise<void>`

**使用例**:
```typescript
await api.storage.delete("oldKey");
```

### `keys()`

ストレージ内のすべてのキーを取得します。

**戻り値**: `Promise<string[]>` - キーの配列

**使用例**:
```typescript
const keys = await api.storage.keys();
console.log(`Stored keys: ${keys.join(", ")}`);
```

### `clear()`

ストレージ内のすべてのデータを削除します。

**戻り値**: `Promise<void>`

**使用例**:
```typescript
await api.storage.clear();
```

---

## Notifications API

ユーザーに通知を表示するAPIです。

### `show(message: string, type?: NotificationType)`

通知を表示します。

**パラメータ**:
- `message`: 表示するメッセージ
- `type`: 通知タイプ（`"info" | "success" | "error" | "warning"`、デフォルト: `"info"`）

**戻り値**: `void`

**使用例**:
```typescript
api.notifications.show("処理が完了しました", "success");
api.notifications.show("エラーが発生しました", "error");
```

### `info(message: string)`

情報通知を表示します。

**パラメータ**:
- `message`: 表示するメッセージ

**戻り値**: `void`

### `success(message: string)`

成功通知を表示します。

**パラメータ**:
- `message`: 表示するメッセージ

**戻り値**: `void`

### `error(message: string)`

エラー通知を表示します。

**パラメータ**:
- `message`: 表示するメッセージ

**戻り値**: `void`

### `warning(message: string)`

警告通知を表示します。

**パラメータ**:
- `message`: 表示するメッセージ

**戻り値**: `void`

---

## UI API

UI要素を登録・操作するAPIです。

### `registerCommand(command: Command)`

コマンドを登録します。

**パラメータ**:
- `command`: コマンド定義
  ```typescript
  {
    id: string;              // コマンドID（一意である必要があります）
    label: string;            // 表示名
    description?: string;    // 説明
    shortcut?: string;       // ショートカットキー
    handler: () => void | Promise<void>; // ハンドラー関数
  }
  ```

**戻り値**: `Promise<void>`

**使用例**:
```typescript
await api.ui.registerCommand({
  id: "com.example.my-plugin.my-command",
  label: "マイコマンド",
  description: "何か処理を実行します",
  handler: async () => {
    api.notifications.success("コマンドを実行しました");
  },
});
```

### `unregisterCommand(commandId: string)`

コマンドを削除します。

**パラメータ**:
- `commandId`: 削除するコマンドID

**戻り値**: `Promise<void>`

### `showDialog(options: DialogOptions)`

ダイアログを表示します。

**パラメータ**:
- `options`: ダイアログオプション
  ```typescript
  {
    title: string;                    // タイトル
    message?: string;                 // メッセージ
    content?: string;                 // HTMLコンテンツ
    buttons?: DialogButton[];         // ボタン
    width?: number;                   // 幅（ピクセル）
    height?: number;                  // 高さ（ピクセル）
  }
  ```

**戻り値**: `Promise<unknown>` - ボタンがクリックされた場合の結果

**使用例**:
```typescript
const result = await api.ui.showDialog({
  title: "確認",
  message: "この操作を実行しますか？",
  buttons: [
    { label: "キャンセル", variant: "default" },
    { label: "実行", variant: "primary" },
  ],
});
```

### `registerWidget(options: WidgetOptions)`

Widgetを登録します。

**パラメータ**:
- `options`: Widgetオプション
  ```typescript
  {
    id: string;              // Widget ID
    title: string;           // タイトル
    description?: string;    // 説明
    component: string;       // コンポーネント名
    location: "dashboard" | "sidebar"; // 表示場所
    settings?: Record<string, unknown>; // 設定
  }
  ```

**戻り値**: `Promise<void>`

### `registerPage(options: PageOptions)`

カスタムページを登録します。

**パラメータ**:
- `options`: Pageオプション
  ```typescript
  {
    id: string;              // Page ID
    title: string;           // タイトル
    description?: string;    // 説明
    path: string;            // URLパス
    component: string;       // コンポーネント名
    icon?: string;           // アイコン
  }
  ```

**戻り値**: `Promise<void>`

### `registerSidebarPanel(options: SidebarPanelOptions)`

サイドバーパネルを登録します。

**パラメータ**:
- `options`: SidebarPanelオプション
  ```typescript
  {
    id: string;              // Panel ID
    title: string;           // タイトル
    description?: string;    // 説明
    component: string;       // コンポーネント名
    icon?: string;           // アイコン
    position?: "top" | "bottom"; // 位置
    defaultOpen?: boolean;   // デフォルトで開く
  }
  ```

**戻り値**: `Promise<void>`

---

## Editor API

エディタ機能を拡張・操作するAPIです。

### `registerExtension(options: EditorExtensionOptions)`

カスタムTiptap拡張を登録します。

**パラメータ**:
- `options`: 拡張オプション
  ```typescript
  {
    id: string;              // 拡張ID
    type: "node" | "mark" | "plugin"; // 拡張タイプ
    extension: Extension;    // Tiptap拡張オブジェクト
  }
  ```

**戻り値**: `Promise<void>`

### `executeCommand(command: string, ...args: unknown[])`

エディタコマンドを実行します。

**パラメータ**:
- `command`: コマンド名（例: `"toggleBold"`, `"insertContent"`）
- `...args`: コマンド引数

**戻り値**: `Promise<unknown>` - コマンドの結果

**使用例**:
```typescript
// 太字をトグル
await api.editor.executeCommand("toggleBold");

// コンテンツを挿入
await api.editor.executeCommand("insertContent", "Hello, World!");

// 選択範囲を削除
await api.editor.executeCommand("deleteSelection");
```

### `getContent(editorId?: string)`

エディタのコンテンツを取得します。

**パラメータ**:
- `editorId`: エディタID（省略時はアクティブなエディタ）

**戻り値**: `Promise<JSONContent>` - エディタコンテンツ（JSONContent形式）

**使用例**:
```typescript
const content = await api.editor.getContent();
console.log(JSON.stringify(content, null, 2));
```

### `setContent(content: JSONContent, editorId?: string)`

エディタのコンテンツを設定します。

**パラメータ**:
- `content`: 設定するコンテンツ（JSONContent形式）
- `editorId`: エディタID（省略時はアクティブなエディタ）

**戻り値**: `Promise<void>`

**使用例**:
```typescript
await api.editor.setContent({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hello, World!" }],
    },
  ],
});
```

### `getSelection(editorId?: string)`

エディタの選択範囲を取得します。

**パラメータ**:
- `editorId`: エディタID（省略時はアクティブなエディタ）

**戻り値**: `Promise<EditorSelection | null>` - 選択範囲（選択がない場合は`null`）

**使用例**:
```typescript
const selection = await api.editor.getSelection();
if (selection) {
  console.log(`Selected: ${selection.text}`);
  console.log(`From: ${selection.from}, To: ${selection.to}`);
}
```

### `setSelection(from: number, to: number, editorId?: string)`

エディタの選択範囲を設定します。

**パラメータ**:
- `from`: 選択開始位置
- `to`: 選択終了位置
- `editorId`: エディタID（省略時はアクティブなエディタ）

**戻り値**: `Promise<void>`

### `canExecuteCommand(command: string, editorId?: string)`

コマンドが実行可能かチェックします。

**パラメータ**:
- `command`: コマンド名
- `editorId`: エディタID（省略時はアクティブなエディタ）

**戻り値**: `Promise<boolean>` - 実行可能な場合`true`

---

## AI API

AI機能を拡張するAPIです。

### `registerQuestionGenerator(options: QuestionGeneratorOptions)`

問題生成器を登録します。

**パラメータ**:
- `options`: 問題生成器オプション
  ```typescript
  {
    id: string;              // 生成器ID
    generator: (front: string, back: string, type: QuestionType, difficulty?: QuestionDifficulty) => Promise<QuestionData>;
    supportedTypes: QuestionType[]; // サポートする問題タイプ
    description?: string;    // 説明
  }
  ```

**戻り値**: `Promise<void>`

### `registerPromptTemplate(options: PromptTemplateOptions)`

プロンプトテンプレートを登録します。

**パラメータ**:
- `options`: テンプレートオプション
  ```typescript
  {
    id: string;              // テンプレートID
    name: string;            // テンプレート名
    description?: string;    // 説明
    template: string;         // テンプレート文字列（{{変数名}}で変数を指定）
    variables?: Array<{       // 変数定義
      name: string;
      description?: string;
      required?: boolean;
      default?: string;
    }>;
  }
  ```

**戻り値**: `Promise<void>`

### `registerContentAnalyzer(options: ContentAnalyzerOptions)`

コンテンツアナライザーを登録します。

**パラメータ**:
- `options`: アナライザーオプション
  ```typescript
  {
    id: string;              // アナライザーID
    name: string;            // アナライザー名
    description?: string;    // 説明
    analyzer: (content: string) => Promise<Record<string, unknown>>;
  }
  ```

**戻り値**: `Promise<void>`

---

## Data API

データ処理機能を拡張するAPIです。

### `registerImporter(options: ImporterOptions)`

インポーターを登録します。

**パラメータ**:
- `options`: インポーターオプション
  ```typescript
  {
    id: string;              // インポーターID
    name: string;            // インポーター名
    description?: string;    // 説明
    extensions: string[];    // サポートする拡張子（例: ["md", "txt"]）
    importer: (file: File | Blob) => Promise<JSONContent>;
  }
  ```

**戻り値**: `Promise<void>`

### `registerExporter(options: ExporterOptions)`

エクスポーターを登録します。

**パラメータ**:
- `options`: エクスポーターオプション
  ```typescript
  {
    id: string;              // エクスポーターID
    name: string;            // エクスポーター名
    description?: string;    // 説明
    format: string;          // フォーマット（例: "markdown", "json"）
    exporter: (content: JSONContent) => Promise<string | Blob>;
  }
  ```

**戻り値**: `Promise<void>`

### `registerTransformer(options: TransformerOptions)`

トランスフォーマーを登録します。

**パラメータ**:
- `options`: トランスフォーマーオプション
  ```typescript
  {
    id: string;              // トランスフォーマーID
    name: string;            // トランスフォーマー名
    description?: string;    // 説明
    transformer: (content: JSONContent) => Promise<JSONContent>;
  }
  ```

**戻り値**: `Promise<void>`

---

## Integration API

外部統合機能を拡張するAPIです。

### `registerOAuthProvider(options: OAuthProviderOptions)`

OAuthプロバイダーを登録します。

**パラメータ**:
- `options`: OAuthプロバイダーオプション
  ```typescript
  {
    id: string;              // プロバイダーID
    name: string;            // プロバイダー名
    authUrl: string;         // 認証URL
    tokenUrl: string;        // トークンURL
    clientId: string;        // クライアントID
    scopes?: string[];       // スコープ
  }
  ```

**戻り値**: `Promise<void>`

### `registerWebhook(options: WebhookOptions)`

Webhookを登録します。

**パラメータ**:
- `options`: Webhookオプション
  ```typescript
  {
    id: string;              // Webhook ID
    url: string;             // Webhook URL
    events: string[];        // イベントタイプ
    handler?: (event: WebhookEvent) => Promise<void>;
  }
  ```

**戻り値**: `Promise<void>`

### `registerExternalAPI(options: ExternalAPIOptions)`

外部APIを登録します。

**パラメータ**:
- `options`: 外部APIオプション
  ```typescript
  {
    id: string;              // API ID
    name: string;            // API名
    baseUrl: string;         // ベースURL
    authentication?: {
      type: "bearer" | "basic" | "oauth";
      // ... 認証設定
    };
  }
  ```

**戻り値**: `Promise<void>`

---

## Calendar API

カレンダー機能を拡張するAPIです。

### `registerExtension(options: CalendarExtensionOptions)`

カレンダー拡張を登録します。

**パラメータ**:
- `options`: カレンダー拡張オプション
  ```typescript
  {
    id: string;              // 拡張ID
    name: string;            // 拡張名
    // ... カレンダー拡張設定
  }
  ```

**戻り値**: `Promise<void>`

---

## 型定義

型定義の詳細は `packages/plugin-types/index.d.ts` を参照してください。

---

**前のドキュメント**: [UI拡張チュートリアル](./tutorial-ui-extension.md)  
**次のドキュメント**: [ベストプラクティス](./best-practices.md)

