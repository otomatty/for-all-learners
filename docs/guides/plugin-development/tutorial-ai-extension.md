# AI拡張チュートリアル

**最終更新**: 2025-11-06  
**対象**: AI機能を拡張したいプラグイン開発者  
**所要時間**: 30-45分

---

## このチュートリアルについて

このチュートリアルでは、F.A.L のAI機能を拡張するプラグインを作成します。

### 学習内容

- AI拡張の基本概念
- 問題生成器の作成
- プロンプトテンプレートの作成
- コンテンツアナライザーの実装

---

## AI拡張の基本

### AI API とは

AI API を使用すると、プラグインから以下の機能を拡張できます：

- **問題生成器**: フラッシュカードや問題を生成
- **プロンプトテンプレート**: LLM用のプロンプトテンプレート
- **コンテンツアナライザー**: テキストの分析機能

---

## ステップ1: プラグインの生成

```bash
# AI拡張テンプレートから生成
bun run plugins:create my-ai-plugin --template=ai-extension
```

---

## ステップ2: 問題生成器の作成

### 基本的な問題生成器

```typescript
import type {
  PluginAPI,
  QuestionType,
  QuestionDifficulty,
  QuestionData,
} from "../../../../packages/plugin-types";

async function activate(api: PluginAPI) {
  // 問題生成器を登録
  await api.ai.registerQuestionGenerator({
    id: "com.example.my-plugin.generator",
    generator: async (
      front: string,
      back: string,
      type: QuestionType,
      difficulty?: QuestionDifficulty,
    ): Promise<QuestionData> => {
      // 問題タイプに応じて生成
      switch (type) {
        case "flashcard":
          return {
            type: "flashcard",
            question: front,
            answer: back,
          };
        
        case "multiple_choice":
          return {
            type: "multiple_choice",
            question: `「${front}」について、正しい答えはどれですか？`,
            answer: back,
            options: [
              back,
              `選択肢1`,
              `選択肢2`,
              `選択肢3`,
            ],
          };
        
        case "cloze":
          return {
            type: "cloze",
            question: `「${front}」を完成させてください。`,
            answer: back,
            blanks: [back],
          };
        
        default:
          return {
            type: "flashcard",
            question: front,
            answer: back,
          };
      }
    },
    supportedTypes: ["flashcard", "multiple_choice", "cloze"],
    description: "カスタム問題生成器",
  });
}
```

### 難易度に対応した問題生成

```typescript
await api.ai.registerQuestionGenerator({
  id: "com.example.my-plugin.difficulty-aware",
  generator: async (
    front: string,
    back: string,
    type: QuestionType,
    difficulty: QuestionDifficulty = "medium",
  ): Promise<QuestionData> => {
    // 難易度に応じて問題を調整
    const difficultyMultiplier = {
      easy: 1,
      medium: 2,
      hard: 3,
    }[difficulty];

    if (type === "multiple_choice") {
      // 難易度に応じて選択肢の数を変更
      const optionCount = 3 + difficultyMultiplier;
      
      return {
        type: "multiple_choice",
        question: `[${difficulty.toUpperCase()}] ${front}`,
        answer: back,
        options: generateOptions(back, optionCount),
      };
    }

    return {
      type: "flashcard",
      question: front,
      answer: back,
    };
  },
  supportedTypes: ["flashcard", "multiple_choice"],
  description: "難易度対応問題生成器",
});
```

---

## ステップ3: プロンプトテンプレートの作成

### 基本的なプロンプトテンプレート

```typescript
await api.ai.registerPromptTemplate({
  id: "com.example.my-plugin.summary",
  name: "要約テンプレート",
  description: "テキストを要約するプロンプト",
  template: "以下のテキストを{{length}}文字で要約してください:\n\n{{content}}",
  variables: [
    {
      name: "content",
      description: "要約するテキスト",
      required: true,
    },
    {
      name: "length",
      description: "要約の文字数",
      required: false,
      default: "100",
    },
  ],
});
```

### 複雑なプロンプトテンプレート

```typescript
await api.ai.registerPromptTemplate({
  id: "com.example.my-plugin.translation",
  name: "翻訳テンプレート",
  description: "テキストを翻訳するプロンプト",
  template: `以下のテキストを{{targetLanguage}}に翻訳してください。

原文:
{{sourceText}}

追加の指示:
{{additionalInstructions}}

翻訳の形式: {{format}}`,
  variables: [
    {
      name: "sourceText",
      description: "翻訳するテキスト",
      required: true,
    },
    {
      name: "targetLanguage",
      description: "目標言語",
      required: true,
      default: "英語",
    },
    {
      name: "additionalInstructions",
      description: "追加の指示",
      required: false,
    },
    {
      name: "format",
      description: "翻訳の形式",
      required: false,
      default: "自然な文章",
    },
  ],
});
```

---

## ステップ4: コンテンツアナライザーの実装

### 基本的なアナライザー

```typescript
await api.ai.registerContentAnalyzer({
  id: "com.example.my-plugin.word-counter",
  name: "単語数カウント",
  description: "テキストの単語数をカウントします",
  analyzer: async (content: string): Promise<Record<string, unknown>> => {
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const characters = content.length;
    const charactersNoSpaces = content.replace(/\s/g, "").length;

    return {
      wordCount: words.length,
      characterCount: characters,
      characterCountNoSpaces: charactersNoSpaces,
      averageWordLength: words.length > 0
        ? charactersNoSpaces / words.length
        : 0,
    };
  },
});
```

### 高度なアナライザー

```typescript
await api.ai.registerContentAnalyzer({
  id: "com.example.my-plugin.readability",
  name: "可読性分析",
  description: "テキストの可読性を分析します",
  analyzer: async (content: string): Promise<Record<string, unknown>> => {
    const sentences = content.split(/[.!?。！？]/).filter((s) => s.trim().length > 0);
    const words = content.split(/\s+/).filter((w) => w.length > 0);
    const paragraphs = content.split(/\n\n/).filter((p) => p.trim().length > 0);

    // 簡易的な可読性スコア（Flesch Reading Ease 風）
    const avgSentenceLength = words.length / sentences.length;
    const avgWordsPerSentence = words.length / sentences.length;
    const readabilityScore = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSentenceLength);

    return {
      sentenceCount: sentences.length,
      wordCount: words.length,
      paragraphCount: paragraphs.length,
      averageWordsPerSentence: avgWordsPerSentence,
      averageSentenceLength: avgSentenceLength,
      readabilityScore: Math.max(0, Math.min(100, readabilityScore)),
      readabilityLevel: readabilityScore > 80
        ? "非常に簡単"
        : readabilityScore > 60
          ? "簡単"
          : readabilityScore > 40
            ? "普通"
            : readabilityScore > 20
              ? "難しい"
              : "非常に難しい",
    };
  },
});
```

---

## ステップ5: 実用的な例

### 例1: 言語学習用問題生成器

```typescript
await api.ai.registerQuestionGenerator({
  id: "com.example.my-plugin.language-learning",
  generator: async (
    front: string,
    back: string,
    type: QuestionType,
  ): Promise<QuestionData> => {
    if (type === "multiple_choice") {
      // 言語学習用の選択肢を生成
      const wrongAnswers = generateSimilarWords(back);
      
      return {
        type: "multiple_choice",
        question: `「${front}」の意味は？`,
        answer: back,
        options: shuffleArray([back, ...wrongAnswers]),
      };
    }

    return {
      type: "flashcard",
      question: front,
      answer: back,
    };
  },
  supportedTypes: ["flashcard", "multiple_choice"],
  description: "言語学習用問題生成器",
});
```

### 例2: 数学問題生成器

```typescript
await api.ai.registerQuestionGenerator({
  id: "com.example.my-plugin.math",
  generator: async (
    front: string,
    back: string,
    type: QuestionType,
    difficulty?: QuestionDifficulty,
  ): Promise<QuestionData> => {
    // 数式をパース
    const equation = parseEquation(front);
    const answer = parseEquation(back);

    if (type === "cloze") {
      // 数式の一部を空欄にする
      const blank = generateBlank(equation, difficulty);
      
      return {
        type: "cloze",
        question: `次の数式の空欄を埋めてください: ${blank}`,
        answer: back,
        blanks: [answer.toString()],
      };
    }

    return {
      type: "flashcard",
      question: front,
      answer: back,
    };
  },
  supportedTypes: ["flashcard", "cloze"],
  description: "数学問題生成器",
});
```

---

## クリーンアップ

```typescript
async function activate(api: PluginAPI) {
  // 問題生成器を登録
  await api.ai.registerQuestionGenerator({ /* ... */ });
  
  // プロンプトテンプレートを登録
  await api.ai.registerPromptTemplate({ /* ... */ });
  
  // アナライザーを登録
  await api.ai.registerContentAnalyzer({ /* ... */ });

  return {
    dispose: async () => {
      // すべての登録を解除
      await api.ai.unregisterQuestionGenerator("com.example.my-plugin.generator");
      await api.ai.unregisterPromptTemplate("com.example.my-plugin.summary");
      await api.ai.unregisterContentAnalyzer("com.example.my-plugin.word-counter");
    },
  };
}
```

---

## サンプルプラグイン

詳細な実装例は、`plugins/examples/ai-extension/` を参照してください。

---

## 次のステップ

- **[UI拡張チュートリアル](./tutorial-ui-extension.md)**: Widgetの作成
- **[APIリファレンス](./api-reference.md)**: AI APIの詳細
- **[ベストプラクティス](./best-practices.md)**: 開発のベストプラクティス

---

## よくある質問

### Q: LLM APIを直接呼び出せますか？

**A**: 現在は直接呼び出せません。プロンプトテンプレートを使用して、アプリケーションのLLM機能を活用してください。

### Q: 問題生成器で画像を生成できますか？

**A**: 現在はテキストベースの問題生成のみサポートしています。将来的に画像対応を検討しています。

### Q: カスタムの問題タイプを追加できますか？

**A**: 現在は定義済みのタイプ（flashcard, multiple_choice, cloze）のみサポートしています。

---

**前のチュートリアル**: [エディタ拡張チュートリアル](./tutorial-editor-extension.md)  
**次のチュートリアル**: [UI拡張チュートリアル](./tutorial-ui-extension.md)

