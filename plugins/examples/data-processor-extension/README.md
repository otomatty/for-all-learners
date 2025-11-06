# Data Processor Extension サンプルプラグイン

データ処理拡張機能の実装例を示すサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **Importer（インポーター）**
   - Markdown インポーター: `.md`, `.markdown` ファイルをインポート
   - テキスト インポーター: `.txt`, `.text` ファイルをインポート

2. **Exporter（エクスポーター）**
   - JSON エクスポーター: コンテンツをJSON形式でエクスポート
   - Markdown エクスポーター: コンテンツをMarkdown形式でエクスポート

3. **Transformer（トランスフォーマー）**
   - 大文字変換: すべてのテキストを大文字に変換
   - プレフィックス追加: すべての段落にプレフィックスを追加

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、以下のデータ処理機能が利用可能になります：
   - **インポート**: ファイル選択ダイアログで、Markdownやテキストファイルを選択可能
   - **エクスポート**: エクスポートメニューで、JSONやMarkdown形式を選択可能
   - **変換**: コンテンツ変換メニューで、大文字変換やプレフィックス追加を実行可能

## 実装のポイント

### Importer の実装

```typescript
await api.data.registerImporter({
  id: "my-importer",
  name: "インポーター名",
  description: "説明",
  extensions: ["md", "txt"],
  importer: async (file: File | Blob) => {
    const text = await file.text();
    // ファイルを処理してJSONContentに変換
    return {
      type: "doc",
      content: [...],
    };
  },
});
```

### Exporter の実装

```typescript
await api.data.registerExporter({
  id: "my-exporter",
  name: "エクスポーター名",
  description: "説明",
  extension: "md",
  mimeType: "text/markdown",
  exporter: async (content: JSONContent) => {
    // JSONContentを処理してBlobに変換
    return new Blob([markdown], { type: "text/markdown" });
  },
});
```

### Transformer の実装

```typescript
await api.data.registerTransformer({
  id: "my-transformer",
  name: "トランスフォーマー名",
  description: "説明",
  transformer: async (content: JSONContent) => {
    // コンテンツを変換
    return transformedContent;
  },
});
```

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

