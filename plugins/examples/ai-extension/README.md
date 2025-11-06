# AI Extension サンプルプラグイン

AI拡張機能の実装例を示すサンプルプラグインです。

## 機能

このプラグインは以下の機能を実装しています：

1. **Question Generator（問題生成器）**
   - フロントとバックから問題を生成
   - 複数の問題タイプ（flashcard, multiple_choice, cloze）をサポート

2. **Prompt Template（プロンプトテンプレート）**
   - 要約プロンプトテンプレート
   - 説明プロンプトテンプレート

3. **Content Analyzer（コンテンツアナライザー）**
   - 単語数アナライザー: テキストの統計情報を分析
   - キーワード抽出アナライザー: 重要なキーワードを抽出

## 使用方法

1. プラグインをインストール
2. プラグインが有効化されると、以下の拡張が利用可能になります：
   - **問題生成器**: 学習コンテンツから問題を自動生成
   - **プロンプトテンプレート**: AIチャットで使用可能なテンプレート
   - **コンテンツアナライザー**: テキスト分析ツール

## 実装のポイント

### Question Generator の実装

```typescript
await api.ai.registerQuestionGenerator({
  id: "my-generator",
  generator: async (front, back, type, difficulty) => {
    // 問題を生成
    return {
      type: "multiple_choice",
      question: "...",
      answer: "...",
      options: ["...", "...", "...", "..."],
    };
  },
  supportedTypes: ["flashcard", "multiple_choice", "cloze"],
  description: "説明",
});
```

### Prompt Template の実装

```typescript
await api.ai.registerPromptTemplate({
  id: "my-template",
  name: "テンプレート名",
  description: "説明",
  template: "テンプレート内容 {{variable}}",
  variables: [
    {
      name: "variable",
      description: "変数の説明",
      required: true,
    },
  ],
});
```

### Content Analyzer の実装

```typescript
await api.ai.registerContentAnalyzer({
  id: "my-analyzer",
  name: "アナライザー名",
  description: "説明",
  analyzer: async (content: string) => {
    // コンテンツを分析
    return {
      wordCount: 100,
      // ... その他の分析結果
    };
  },
});
```

## 関連ドキュメント

- [プラグイン開発ガイド](../../../docs/guides/plugin-development.md)
- [プラグインAPIリファレンス](../../../packages/plugin-types/index.d.ts)

