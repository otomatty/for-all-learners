# マルチLLMクライアント 仕様書

**対象:** マルチLLMクライアント実装（公式SDK使用）
**最終更新:** 2025-11-02
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## Requirements

### R-001: サポートプロバイダー

以下のLLMプロバイダーをサポート（公式SDKを直接使用）：

- **Google Gemini**
  - Model: `gemini-2.0-flash-exp`, `gemini-1.5-pro`, `gemini-1.5-flash`
  - SDK: `@google/generative-ai`
  - Provider: `google`
- **OpenAI**
  - Model: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
  - SDK: `openai`
  - Provider: `openai`
- **Anthropic Claude**
  - Model: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`, `claude-3-haiku-20240307`
  - SDK: `@anthropic-ai/sdk`
  - Provider: `anthropic`

### R-002: モデル指定形式

シンプルなモデル名文字列を使用：

```typescript
// プロバイダーとモデルを個別に指定
const client = createLLMClient({
  provider: 'google',
  model: 'gemini-2.0-flash-exp',
  apiKey: decryptedApiKey,
});
```

**デフォルトモデル:**
- `google` → `gemini-2.0-flash-exp`
- `openai` → `gpt-4o`
- `anthropic` → `claude-3-5-sonnet-20241022`

### R-003: 統一インターフェース

各プロバイダーの公式SDKを統一インターフェースでラップ：

```typescript
interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: StreamOptions): AsyncGenerator<string>;
}
```

### R-004: クライアント実装

各プロバイダーのクライアントクラス：

- `GoogleGeminiClient`: `@google/generative-ai` を使用
- `OpenAIClient`: `openai` を使用
- `AnthropicClient`: `@anthropic-ai/sdk` を使用

### R-005: エラーハンドリング

以下のエラーを適切に処理：

- 不正なプロバイダー名
- APIキーが空
- APIキーが不正（認証失敗）
- ネットワークエラー
- レート制限エラー

### R-006: 型安全性

- TypeScriptの型定義を活用
- Provider名は型安全な union type
- Model名はプロバイダーごとに型付け
- 統一インターフェースで型安全性を保証

---

## Test Cases

### TC-001: Geminiクライアント初期化

**入力:**
```typescript
provider = 'google'
model = 'gemini-2.0-flash-exp'
apiKey = 'test-api-key'
```

**期待される動作:**
- GoogleGeminiClient インスタンスが正常に作成される
- エラーがスローされない

### TC-002: OpenAIクライアント初期化

**入力:**
```typescript
provider = 'openai'
model = 'gpt-4o'
apiKey = 'test-api-key'
```

**期待される動作:**
- OpenAIClient インスタンスが正常に作成される
- エラーがスローされない

### TC-003: Claudeクライアント初期化

**入力:**
```typescript
provider = 'anthropic'
model = 'claude-3-5-sonnet-20241022'
apiKey = 'test-api-key'
```

**期待される動作:**
- AnthropicClient インスタンスが正常に作成される
- エラーがスローされない

### TC-004: 不正なプロバイダー

**入力:**
```typescript
provider = 'invalid-provider'
```

**期待される動作:**
- Error がスローされる
- エラーメッセージ: "Invalid provider: invalid-provider"

### TC-005: APIキーが空

**入力:**
```typescript
provider = 'google'
apiKey = ''
```

**期待される動作:**
- Error がスローされる
- エラーメッセージ: "API key is required"

### TC-006: デフォルトモデル使用

**入力:**
```typescript
provider = 'google'
model = undefined
apiKey = 'test-api-key'
```

**期待される動作:**
- デフォルトモデル `gemini-2.0-flash-exp` が使用される
- 正常にインスタンス作成

### TC-007: テキスト生成（Gemini）

**入力:**
```typescript
client = new GoogleGeminiClient('test-api-key')
prompt = 'Hello, how are you?'
```

**期待される動作:**
- テキスト応答が返される
- エラーがスローされない

### TC-008: ストリーミング生成（OpenAI）

**入力:**
```typescript
client = new OpenAIClient('test-api-key')
prompt = 'Tell me a story'
```

**期待される動作:**
- AsyncGeneratorが返される
- 複数のチャンクが順次返される

### TC-009: プロバイダーリスト取得

**期待される動作:**
- サポート対象のプロバイダー一覧を取得
- `['google', 'openai', 'anthropic']`

### TC-010: モデルリスト取得

**入力:**
```typescript
provider = 'google'
```

**期待される動作:**
- Googleのサポートモデル一覧を取得
- `['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']`

---

## Implementation Notes

### 統一インターフェース設計

各プロバイダーの公式SDKを統一インターフェースでラップすることで、プロバイダー切り替えを容易にします。

```typescript
interface LLMClient {
  // シンプルなテキスト生成
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  
  // ストリーミング生成
  generateStream(prompt: string, options?: StreamOptions): AsyncGenerator<string>;
}
```

### プロバイダー別の実装

#### Google Gemini

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

class GoogleGeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;
  private model: string;
  
  constructor(apiKey: string, model: string = 'gemini-2.0-flash-exp') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({ model: this.model });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
```

#### OpenAI

```typescript
import OpenAI from 'openai';

class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private model: string;
  
  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.choices[0].message.content || '';
  }
}
```

#### Anthropic

```typescript
import Anthropic from '@anthropic-ai/sdk';

class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;
  
  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }
  
  async generate(prompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    return response.content[0].text;
  }
}
```

### セキュリティ考慮事項

1. **APIキーの復号化**: `decryptAPIKey()` を使用して暗号化されたAPIキーを復号化
2. **メモリ管理**: APIキーを長期間メモリに保持しない
3. **エラーメッセージ**: エラーメッセージにAPIキーを含めない
4. **クライアント破棄**: 使用後はクライアントを適切に破棄

### パフォーマンス考慮事項

1. **インスタンスキャッシュ**: 同じプロバイダー・モデルのインスタンスを再利用可能
2. **遅延初期化**: 必要になるまでクライアントインスタンスを作成しない
3. **ストリーミング**: 大量のテキスト生成時はストリーミングを使用

### 既存コードとの統合

既存の `lib/gemini.ts` を参考に実装：
- 同じインターフェースパターンを使用
- エラーハンドリング方法を統一
- 既存のGemini実装を新しいインターフェースに移行

---

## API Design

### LLMClient インターフェース

```typescript
interface LLMClient {
  /**
   * Generate text from a prompt
   * 
   * @param prompt - Input prompt
   * @param options - Generation options
   * @returns Generated text
   */
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  
  /**
   * Generate text stream from a prompt
   * 
   * @param prompt - Input prompt
   * @param options - Stream options
   * @returns Async generator of text chunks
   */
  generateStream(prompt: string, options?: StreamOptions): AsyncGenerator<string>;
}

interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

interface StreamOptions extends GenerateOptions {
  onChunk?: (chunk: string) => void;
}
```

### createLLMClient

```typescript
interface LLMClientOptions {
  provider: LLMProvider;
  model?: string;
  apiKey: string;
}

type LLMProvider = 'google' | 'openai' | 'anthropic';

/**
 * Create LLM client
 * 
 * @param options - Client configuration
 * @returns LLM client instance
 * @throws Error if provider is invalid or API key is empty
 */
export function createLLMClient(options: LLMClientOptions): LLMClient;
```

### getAvailableProviders

```typescript
/**
 * Get list of supported LLM providers
 * 
 * @returns Array of provider names
 */
export function getAvailableProviders(): LLMProvider[];
```

### getAvailableModels

```typescript
/**
 * Get list of available models for a provider
 * 
 * @param provider - LLM provider name
 * @returns Array of model names
 * @throws Error if provider is invalid
 */
export function getAvailableModels(provider: LLMProvider): string[];
```

### getDefaultModel

```typescript
/**
 * Get default model for a provider
 * 
 * @param provider - LLM provider name
 * @returns Default model name
 * @throws Error if provider is invalid
 * 
 * @example
 * getDefaultModel('google') // => 'gemini-2.0-flash-exp'
 */
export function getDefaultModel(provider: LLMProvider): string;
```

---

## Related Files

- **実装**: `lib/llm/client.ts`（ディレクトリ名変更）
- **テスト**: `lib/llm/__tests__/client.test.ts`
- **使用先**: `app/_actions/ai/apiKey.ts` (Phase 0.4)
- **依存先**: 
  - `lib/encryption/api-key-vault.ts` (Phase 0.2)
  - `@google/generative-ai`
  - `openai`
  - `@anthropic-ai/sdk`
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`
- **既存実装**: `lib/gemini.ts`（参考）

---

**最終更新:** 2025-11-02
**作成者:** AI (Claude 3.7 Sonnet)
**変更内容:** Mastraから公式SDK使用に変更
