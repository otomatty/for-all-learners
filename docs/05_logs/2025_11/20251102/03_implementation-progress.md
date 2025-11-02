# Phase 0.2～0.3 作業進捗レポート

**日付:** 2025-11-02
**担当:** AI (Claude 3.7 Sonnet)
**関連Issue:** [#74](https://github.com/otomatty/for-all-learners/issues/74)

---

## 実施した作業

### ✅ Phase 0.2 完了

- [x] APIキー暗号化実装
- [x] 仕様書作成
- [x] テストコード実装（全10テストPASS）
- [x] 作業ログ作成
- [x] .env.example 更新

### ⚠️ Phase 0.3 進行中

- [x] @mastra/core インストール
- [x] Mastraの型定義・構造調査
- [x] 仕様書作成（draft）
- [ ] 実装（保留中）
- [ ] テストコード実装
- [ ] 作業ログ作成

---

## 課題と気づき

### Mastraフレームワークについて

**調査結果:**
1. Mastraは、Agent-basedのフレームワーク
2. LLMを直接使用するのではなく、Agentを通してLLMを使用する設計
3. APIキーは環境変数から読み取る方式（`GOOGLE_API_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`）
4. ユーザーごとにAPIキーを切り替える用途には適していない

**問題点:**
- Phase 0.1で実装した「ユーザーごとのAPIキー管理」とMastraの設計が合致しない
- Mastraは環境変数ベースの設定を前提としており、ランタイムでのAPIキー切り替えが困難

---

## 提案: 実装方針の変更

### オプション1: Mastraを使用しない（推奨）

**理由:**
- ユーザーごとのAPIキー管理が要件
- Mastraは環境変数ベースの設定を前提
- 既存のGemini SDKが既にプロジェクトに存在（`lib/gemini.ts`）

**実装方針:**
1. 各LLMプロバイダーの公式SDKを直接使用
   - Google Gemini: `@google/generative-ai`
   - OpenAI: `openai`
   - Anthropic: `@anthropic-ai/sdk`
2. ユーザーごとに復号化したAPIキーでクライアントを初期化
3. 統一インターフェースを提供する薄いラッパーを実装

**メリット:**
- ✅ ユーザーごとのAPIキー管理が容易
- ✅ 既存コードとの統合が簡単
- ✅ 依存関係が軽量
- ✅ 各SDKの最新機能を直接使用可能

**デメリット:**
- ⚠️ プロバイダーごとにAPIが異なる（ラッパーで吸収可能）

### オプション2: Mastraを使用する（非推奨）

**実装方針:**
1. 環境変数を動的に設定
2. Agentを使用してLLMを呼び出し

**メリット:**
- ✅ Mastraの統一インターフェース
- ✅ Agent機能（ツール使用、メモリ管理）

**デメリット:**
- ❌ ユーザーごとのAPIキー管理が複雑
- ❌ 環境変数の動的変更が必要
- ❌ オーバーヘッドが大きい（Agent不要）

---

## 推奨: Phase 0.3の実装方針変更

### 新しいPhase 0.3: マルチLLMクライアント実装

**目標:** 各LLMプロバイダーの公式SDKを使用した統一インターフェースの実装

#### 1. SDKのインストール

```bash
bun add @google/generative-ai openai @anthropic-ai/sdk
```

#### 2. 統一インターフェース設計

```typescript
interface LLMClient {
  generate(prompt: string, options?: GenerateOptions): Promise<string>;
  generateStream(prompt: string, options?: StreamOptions): AsyncGenerator<string>;
}

class GoogleGeminiClient implements LLMClient { }
class OpenAIClient implements LLMClient { }
class AnthropicClient implements LLMClient { }
```

#### 3. クライアントファクトリー

```typescript
function createLLMClient(provider: LLMProvider, apiKey: string): LLMClient {
  switch (provider) {
    case 'google':
      return new GoogleGeminiClient(apiKey);
    case 'openai':
      return new OpenAIClient(apiKey);
    case 'anthropic':
      return new AnthropicClient(apiKey);
  }
}
```

#### 4. 既存コードとの統合

既存の `lib/gemini.ts` を参考に、統一インターフェースに変換

---

## 次のアクション

### ユーザーへの確認事項

以下の点について、ユーザーの判断を仰ぎたい：

1. **Mastraを使用するか？**
   - [ ] オプション1: 使用しない（公式SDKを直接使用）← 推奨
   - [ ] オプション2: 使用する（複雑な設定が必要）

2. **Phase 0.3の実装内容**
   - [ ] 新しい方針で進める（マルチLLMクライアント）
   - [ ] Mastraで進める（設計を調整）

3. **既存のGemini実装との統合**
   - [ ] 既存コード（`lib/gemini.ts`）をリファクタリング
   - [ ] 新規コードとして別途実装

### 推奨スケジュール

**オプション1を選択した場合:**

#### Phase 0.3: マルチLLMクライアント実装（1～2日）
1. SDKインストール
2. 統一インターフェース設計
3. 各プロバイダークライアント実装
4. テストコード実装

#### Phase 0.4: Server Actions実装（1日）
- 変更なし

#### Phase 0.5: UI実装（1日）
- 変更なし

---

## 関連ドキュメント

- **Issue**: [#74](https://github.com/otomatty/for-all-learners/issues/74)
- **実装計画**: `docs/03_plans/mastra-infrastructure/20251102_02_next-phases-plan.md`
- **Phase 0.2 作業ログ**: `docs/05_logs/2025_11/20251102/02_api-key-encryption.md`
- **既存Gemini実装**: `lib/gemini.ts`

---

**最終更新:** 2025-11-02
**ステータス:** Phase 0.2 完了、Phase 0.3 方針検討中
**次のステップ:** ユーザーの判断を待つ
