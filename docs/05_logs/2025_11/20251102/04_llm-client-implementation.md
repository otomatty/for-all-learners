# Phase 0.3: マルチLLMクライアント実装

**日付:** 2025-11-02
**担当:** AI (Claude 3.7 Sonnet)
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)
**実装計画:** `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`

---

## 実施した作業

### ✅ 完了内容

- [x] 実装方針変更（Mastraから公式SDKへ）
- [x] 必要なSDKをインストール
- [x] 仕様書更新
- [x] 統一インターフェース設計
- [x] Google Geminiクライアント実装
- [x] OpenAIクライアント実装
- [x] Anthropicクライアント実装
- [x] ビルド成功確認

### 📊 作成されたファイル

```
lib/llm/
├── client.spec.md                      # 仕様書（更新）
├── client.ts                           # 統一インターフェース
├── google-client.ts                    # Gemini実装
├── openai-client.ts                    # OpenAI実装
└── anthropic-client.ts                 # Anthropic実装

package.json                             # 依存関係追加
```

### 📦 インストールしたパッケージ

```json
{
  "@google/generative-ai": "^0.24.1",
  "openai": "^6.7.0",
  "@anthropic-ai/sdk": "^0.68.0"
}
```

### 🗑️ 削除したパッケージ

```json
{
  "@mastra/core": "削除（ユーザーごとのAPIキー管理に不適合）"
}
```

---

## 実装詳細

### 設計変更の理由

**当初の計画:** Mastraフレームワークを使用
**変更後:** 各LLMプロバイダーの公式SDKを直接使用

**変更理由:**
1. Mastraは環境変数ベースの設計
2. ユーザーごとのAPIキー管理が困難
3. Agent-basedフレームワークでオーバーヘッドが大きい
4. シンプルなLLM呼び出しには過剰な機能

### 統一インターフェース設計

```typescript
export interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: StreamOptions): AsyncGenerator<string>;
}
```

**利点:**
- プロバイダー切り替えが容易
- 型安全性を確保
- ストリーミング対応
- オプション設定を統一

### プロバイダー別実装

#### 1. Google Gemini (`google-client.ts`)

```typescript
class GoogleGeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;
  private model: string;
  
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.model,
      generationConfig: {
        temperature: options?.temperature,
        maxOutputTokens: options?.maxTokens,
        topP: options?.topP,
      },
    });
    
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
```

**特徴:**
- `@google/generative-ai` SDK使用
- デフォルトモデル: `gemini-2.0-flash-exp`
- ストリーミング対応

#### 2. OpenAI (`openai-client.ts`)

```typescript
class OpenAIClient implements LLMClient {
  private client: OpenAI;
  private model: string;
  
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: options?.temperature,
      max_tokens: options?.maxTokens,
      top_p: options?.topP,
    });
    
    return response.choices[0]?.message?.content || '';
  }
}
```

**特徴:**
- `openai` SDK使用
- デフォルトモデル: `gpt-4o`
- Chat Completions API使用

#### 3. Anthropic (`anthropic-client.ts`)

```typescript
class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;
  
  async generate(prompt: string, options?: GenerateOptions): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options?.maxTokens || 1024,
      temperature: options?.temperature,
      top_p: options?.topP,
      messages: [{ role: 'user', content: prompt }],
    });
    
    const textBlock = response.content.find((block) => block.type === 'text');
    return textBlock && textBlock.type === 'text' ? textBlock.text : '';
  }
}
```

**特徴:**
- `@anthropic-ai/sdk` SDK使用
- デフォルトモデル: `claude-3-5-sonnet-20241022`
- Messages API使用

### クライアントファクトリー

```typescript
export async function createLLMClient(options: LLMClientOptions): Promise<LLMClient> {
  const { provider, apiKey } = options;
  const model = options.model || DEFAULT_MODELS[provider];
  
  switch (provider) {
    case 'google':
      const { GoogleGeminiClient } = await import('./google-client');
      return new GoogleGeminiClient(apiKey, model);
    case 'openai':
      const { OpenAIClient } = await import('./openai-client');
      return new OpenAIClient(apiKey, model);
    case 'anthropic':
      const { AnthropicClient } = await import('./anthropic-client');
      return new AnthropicClient(apiKey, model);
  }
}
```

**特徴:**
- 動的インポートでコード分割
- APIキー検証
- デフォルトモデル自動選択

---

## 使用例

### 基本的な使用方法

```typescript
import { createLLMClient } from '@/lib/llm/client';
import { decryptAPIKey } from '@/lib/encryption/api-key-vault';

// 暗号化されたAPIキーを復号化
const encryptedKey = await getEncryptedKeyFromDB(userId, 'google');
const apiKey = await decryptAPIKey(encryptedKey);

// クライアント作成
const client = await createLLMClient({
  provider: 'google',
  model: 'gemini-2.0-flash-exp',
  apiKey,
});

// テキスト生成
const response = await client.generate('こんにちは！');
console.log(response);
```

### ストリーミング使用

```typescript
const client = await createLLMClient({
  provider: 'openai',
  apiKey,
});

// ストリーミング生成
for await (const chunk of client.generateStream('長い話をしてください')) {
  process.stdout.write(chunk);
}
```

### プロバイダー切り替え

```typescript
const providers = getAvailableProviders();
// ['google', 'openai', 'anthropic']

const models = getAvailableModels('google');
// ['gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']

const defaultModel = getDefaultModel('google');
// 'gemini-2.0-flash-exp'
```

---

## セキュリティ考慮事項

### 実装済み

1. ✅ **APIキーの復号化**: Phase 0.2の暗号化機能を使用
2. ✅ **APIキー検証**: 空文字列チェック
3. ✅ **エラーメッセージ**: APIキーを含めない
4. ✅ **動的インポート**: 未使用プロバイダーのコード読み込みを回避

### 今後の実装

- [ ] レート制限エラーのハンドリング
- [ ] リトライ機構
- [ ] タイムアウト処理
- [ ] 使用量トラッキング

---

## 依存関係

### DEPENDENCY MAP

```
lib/llm/client.ts
├─ Parents (使用先):
│  ├─ app/_actions/ai/apiKey.ts (Phase 0.4 - 未実装)
│  └─ app/_actions/ai/generate.ts (Phase 0.4 - 未実装)
│
├─ Dependencies (依存先):
│  ├─ @google/generative-ai
│  ├─ openai
│  ├─ @anthropic-ai/sdk
│  └─ lib/encryption/api-key-vault.ts (Phase 0.2)
│
└─ Related Files:
   ├─ Spec: ./client.spec.md
   ├─ Tests: ./__tests__/client.test.ts (未実装)
   ├─ Google Client: ./google-client.ts
   ├─ OpenAI Client: ./openai-client.ts
   └─ Anthropic Client: ./anthropic-client.ts
```

---

## 気づき・学び

### 1. Mastraの適用範囲

Mastraは以下の用途に適している：
- Agent-basedのアプリケーション
- ツール使用が必要な場合
- 環境変数でAPIキーを管理する場合

今回のように**ユーザーごとにAPIキーを管理**する場合は、公式SDKを直接使用する方がシンプルで適切。

### 2. 統一インターフェースの利点

プロバイダーごとにAPIが異なるが、統一インターフェースを提供することで：
- プロバイダー切り替えが容易
- テストが書きやすい
- コードの保守性が向上

### 3. 動的インポートの活用

プロバイダーごとのクライアントを動的にインポートすることで：
- バンドルサイズを削減
- 使用しないプロバイダーのコードを読み込まない
- パフォーマンス向上

### 4. ストリーミング対応の重要性

長いレスポンスの場合、ストリーミングは：
- ユーザーエクスペリエンスの向上
- タイムアウトの回避
- リアルタイムフィードバック

---

## テスト計画（Phase 0.4で実施）

### ユニットテスト

```typescript
describe('createLLMClient', () => {
  test('should create Google client', async () => {
    const client = await createLLMClient({
      provider: 'google',
      apiKey: 'test-key',
    });
    expect(client).toBeInstanceOf(GoogleGeminiClient);
  });
  
  test('should throw error for invalid provider', async () => {
    await expect(createLLMClient({
      provider: 'invalid' as any,
      apiKey: 'test-key',
    })).rejects.toThrow('Invalid provider');
  });
});
```

### 統合テスト

```typescript
describe('LLM Client Integration', () => {
  test('should generate text with Google', async () => {
    const client = await createLLMClient({
      provider: 'google',
      apiKey: process.env.GOOGLE_API_KEY,
    });
    
    const response = await client.generate('Hello!');
    expect(response).toBeTruthy();
  });
});
```

---

## 次回の作業

### Phase 0.4: Server Actions実装（予定: 2025-11-03）

1. **APIキー管理Actions**
   - `saveAPIKey()`: 暗号化して保存
   - `getAPIKeyStatus()`: 設定状態確認
   - `deleteAPIKey()`: APIキー削除
   - `testAPIKey()`: APIキー検証

2. **ファイル構成**
   ```
   app/_actions/ai/
   ├── apiKey.ts           # APIキー管理
   ├── apiKey.spec.md      # 仕様書
   └── __tests__/
       └── apiKey.test.ts  # テスト
   ```

3. **実装内容**
   - Supabase連携
   - RLSポリシー確認
   - Phase 0.2の暗号化機能使用
   - Phase 0.3のLLMクライアント使用（検証用）

---

## チェックリスト

### Phase 0.3 完了確認

- [x] 実装方針決定・変更
- [x] SDKインストール
- [x] 仕様書更新
- [x] 統一インターフェース実装
- [x] Google Geminiクライアント実装
- [x] OpenAIクライアント実装
- [x] Anthropicクライアント実装
- [x] ビルド成功
- [x] 作業ログ作成
- [ ] テストコード実装（Phase 0.4で実施）

### セキュリティチェック

- [x] APIキーが暗号化される
- [x] エラーメッセージにAPIキーが含まれない
- [x] 動的インポートで未使用コード削減
- [x] 型安全性を確保

---

## 関連ドキュメント

- **Issue**: [#74 Mastra基盤構築とAPIキー管理システムの実装](https://github.com/otomatty/for-all-learners/issues/74)
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`
- **Phase 0.1 作業ログ**: `docs/05_logs/2025_11/20251102/01_database-migration.md`
- **Phase 0.2 作業ログ**: `docs/05_logs/2025_11/20251102/02_api-key-encryption.md`
- **進捗レポート**: `docs/05_logs/2025_11/20251102/03_implementation-progress.md`
- **仕様書**: `lib/llm/client.spec.md`

---

**最終更新:** 2025-11-02
**ステータス:** ✅ Phase 0.3 完了
**次のステップ:** Phase 0.4（Server Actions実装）
