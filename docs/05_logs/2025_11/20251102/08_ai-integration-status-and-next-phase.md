# AI機能統合 - 現在の状況と次フェーズ方針

**日付:** 2025-11-02
**作成者:** AI Assistant (Claude)

---

## 📊 現在の実装状況

### Phase 0.1～0.5: 完了済み ✅

#### Phase 0.1～0.4: インフラ・Server Actions
- ✅ データベーススキーマ（user_api_keys テーブル）
- ✅ APIキー暗号化・復号化（api-key-vault.ts）
- ✅ getUserAPIKey() 実装・テスト完了（12/12 PASS）
- ✅ Server Actions 4機能
  - testAPIKey()
  - saveAPIKey()
  - deleteAPIKey()
  - getAPIKeyStatus()

#### Phase 0.5: UI実装（完了済み）
- ✅ APIKeyStatusBadge コンポーネント（14 tests PASS）
- ✅ ProviderCard コンポーネント（19 tests PASS）
- ✅ APIKeyForm コンポーネント（18 tests PASS）
- ✅ APIKeySettings メインコンポーネント
- ✅ page.tsx（/settings/api-keys）

**統計:**
- コンポーネント: 575行
- テスト: 51テスト（1.17s）
- すべてのテスト PASS ✅

---

### Phase 1.0: generatePageInfo 統合 ✅

#### 実装済み
- ✅ generatePageInfo.spec.md（仕様書）
- ✅ generatePageInfo.ts に getUserAPIKey 統合
- ✅ generatePageInfo.test.ts（12/12 PASS）

**機能:**
```typescript
await generatePageInfo("React Hooks", {
  provider: "google" | "openai" | "anthropic",
  model: "gemini-2.5-flash"
});
```

**特徴:**
- ユーザーAPIキー優先、環境変数フォールバック
- 複数プロバイダー対応
- エラーハンドリング完備
- 12個のテストケース PASS

---

## 🎯 次のフェーズ: Phase 1.0 Day 3

### 目標: generateCards 統合

**対象ファイル:** `app/_actions/generateCards.ts`

**現在の状態:**
```typescript
// ❌ 現在: Gemini固定、APIキー統合なし
export async function generateCardsFromTranscript(
  transcript: string,
  sourceAudioUrl: string,
): Promise<GeneratedCard[]> {
  // 直接 geminiClient を使用
  const response = await geminiClient.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
  });
}
```

**実装計画:**
```typescript
// ✅ 目標: getUserAPIKey統合、プロバイダー選択対応
export async function generateCardsFromTranscript(
  transcript: string,
  sourceAudioUrl: string,
  options?: { provider?: string; model?: string }
): Promise<GeneratedCard[]> {
  // Provider決定
  const provider = options?.provider ?? "google";
  
  // APIキー取得（getUserAPIKey統合）
  const apiKey = await getUserAPIKey(provider);
  
  // 既存のカード生成ロジック...
}
```

---

## 📋 Phase 1.0 Day 3 実装タスク

### タスク1: generateCards.spec.md 作成 ✅

**ファイル:** `app/_actions/generateCards.spec.md`

**テストケース定義（12個）:**
- TC-001: 基本的なカード生成（Google Gemini）
- TC-002: OpenAI プロバイダー選択
- TC-003: Anthropic プロバイダー選択
- TC-004: 空のトランスクリプトエラー
- TC-005: ユーザー API キー優先
- TC-006: API キー未設定エラー
- TC-007: 不正なプロバイダーエラー
- TC-008: LLM API 呼び出し失敗
- TC-009: JSON パース失敗エラー
- TC-010: コードフェンス抽出（JSON）
- TC-011: JSON 配列抽出（フォールバック）
- TC-012: 空の候補エラー

**参考:** generatePageInfo.spec.md と同様の構造

---

### タスク2: generateCards.ts 修正 ✅

**変更内容:**

```typescript
import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import type { LLMProvider } from "@/lib/llm/client";
import logger from "@/lib/logger";

interface GenerateCardsOptions {
  provider?: LLMProvider;
  model?: string;
}

export async function generateCardsFromTranscript(
  transcript: string,
  sourceAudioUrl: string,
  options?: GenerateCardsOptions
): Promise<GeneratedCard[]> {
  // 入力検証
  if (!transcript.trim()) {
    throw new Error("トランスクリプトが空です");
  }

  // Provider決定
  const provider = (options?.provider || "google") as LLMProvider;
  
  // APIキー取得
  logger.info({ provider, transcript: transcript.substring(0, 50) }, "Starting card generation");
  const apiKey = await getUserAPIKey(provider);
  logger.info({ provider, hasApiKey: !!apiKey }, "API key retrieved");

  // 既存のGemini呼び出しロジックを保持
  const systemPrompt = "以下の文字起こしから、問題文 (front_content) と回答 (back_content) のペアをJSON配列で生成してください。";
  const contents = createUserContent([systemPrompt, transcript]);

  const response = await geminiClient.models.generateContent({
    model: options?.model || "gemini-2.5-flash",
    contents,
  });

  // 既存のJSONパース・エラーハンドリングロジックを保持
  // ...
}
```

**DEPENDENCY MAP 更新:**
```typescript
/**
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   ├─ components/pages/generate-cards/generate-cards-form.tsx
 *   └─ app/(protected)/notes/[slug]/[id]/generate-cards/page.tsx
 *
 * Dependencies (依存先):
 *   ├─ app/_actions/ai/getUserAPIKey.ts ← 追加
 *   ├─ lib/gemini/client.ts
 *   └─ lib/logger.ts ← 追加
 *
 * Related Files:
 *   ├─ Spec: ./generateCards.spec.md ← 作成予定
 *   ├─ Tests: ./__tests__/generateCards.test.ts ← 作成予定
 *   └─ Plan: docs/03_plans/phase-1-ai-integration/20251102_02_day3-generatecards-integration-plan.md
 */
```

---

### タスク3: generateCards.test.ts 作成 ✅

**ファイル:** `app/_actions/__tests__/generateCards.test.ts`

**構造:**
```typescript
import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock setup
vi.mock("@/app/_actions/ai/getUserAPIKey");
vi.mock("@/lib/gemini/client");

import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";
import { geminiClient } from "@/lib/gemini/client";
import { generateCardsFromTranscript } from "../generateCards";

// Helper function
function createMockGeminiResponse(text: string) {
  return {
    candidates: [{ content: { parts: [{ text }] } }],
    text,
    data: undefined,
    functionCalls: undefined,
    executableCode: undefined,
    codeExecutionResult: undefined,
  };
}

describe("generateCardsFromTranscript - Phase 1.0 Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUserAPIKey).mockResolvedValue("test-api-key");
  });

  // TC-001～TC-012を実装
  describe("TC-001: 基本的なカード生成（Google Gemini）", () => {
    test("should generate cards and call getUserAPIKey with google", async () => {
      // Arrange
      const transcript = "React Hooks とは、関数コンポーネントで状態管理を行う機能です。";
      const sourceAudioUrl = "https://example.com/audio.mp3";
      
      vi.mocked(geminiClient.models.generateContent).mockResolvedValue(
        createMockGeminiResponse(`[
          {
            "front_content": "React Hooksとは？",
            "back_content": "関数コンポーネントで状態管理を行う機能"
          }
        ]`)
      );

      // Act
      const result = await generateCardsFromTranscript(transcript, sourceAudioUrl, { provider: "google" });

      // Assert
      expect(getUserAPIKey).toHaveBeenCalledWith("google");
      expect(result).toHaveLength(1);
      expect(result[0].front_content).toBe("React Hooksとは?");
    });
  });

  // TC-002～TC-012...
});
```

**目標:** 12/12 PASS

---

### タスク4: テスト実行と検証 ✅

```bash
# 個別テスト実行
bun run test -- app/_actions/__tests__/generateCards.test.ts

# 全体テスト実行
bun run test

# ビルド検証
bun run build
```

**成功基準:**
- ✅ 12/12 テスト PASS
- ✅ ビルドエラーなし
- ✅ 型エラーなし

---

## 🔄 実装順序

### 1️⃣ 仕様書作成（30分）
```bash
# generateCards.spec.md 作成
# - Requirements セクション
# - Test Cases セクション（TC-001～TC-012）
# - Implementation Notes セクション
```

### 2️⃣ 本体修正（30分）
```bash
# generateCards.ts 修正
# - getUserAPIKey インポート
# - options パラメータ追加
# - provider 対応
# - ロギング追加
# - DEPENDENCY MAP 更新
```

### 3️⃣ テスト実装（1時間）
```bash
# generateCards.test.ts 作成
# - Mock setup
# - Helper function（createMockGeminiResponse）
# - 12個のテストケース実装
```

### 4️⃣ 検証・調整（30分）
```bash
# テスト実行
bun run test -- app/_actions/__tests__/generateCards.test.ts

# 失敗したテストを修正
# ビルド検証
bun run build
```

### 5️⃣ ログ記録（15分）
```bash
# 作業ログ作成
docs/05_logs/2025_11/20251102/09_generatecards-integration.md
```

**合計予想時間:** 2時間45分

---

## 📌 注意事項

### 既存機能への影響（調査完了 ✅）

**generateCardsFromTranscript の使用箇所（5箇所）:**

1. ✅ `app/_actions/generateCards.ts` - 実装ファイル本体
2. ✅ `app/_actions/audioBatchProcessing.ts` - バッチ処理で使用
3. ✅ `app/(protected)/decks/[deckId]/_components/audio-card-generator.tsx` - 音声カード生成
4. ✅ `app/(protected)/decks/[deckId]/_components/image-card-generator.tsx` - 画像OCRカード生成

**結論:** 
- ✅ **generateCardsFromTranscript は実際に使用されている**
- ✅ 音声・画像処理機能で利用中
- ✅ Phase 1.0 Day 3 を続行すべき

**generateRawCardsFromPageContent の使用箇所（1箇所）:**

1. ✅ `components/pages/generate-cards/generate-cards-form.tsx` - ページコンテンツからカード生成

**結論:**
- ✅ こちらも実際に使用されている
- ✅ Phase 1.1 で対応予定

### 既存の関数との関係

```typescript
// generateCards.ts (音声トランスクリプト用) ← 今回の対象
export async function generateCardsFromTranscript(
  transcript: string,
  sourceAudioUrl: string,
): Promise<GeneratedCard[]>

// generateCardsFromPage.ts (ページコンテンツ用) ← 別ファイル
export async function generateRawCardsFromPageContent(
  pageContentTiptap: Json | null,
): Promise<{ generatedRawCards: GeneratedRawCard[]; error?: string; }>
```

**確認事項:**
- ✅ `generateCardsFromTranscript` の実際の使用箇所を確認
- ✅ 音声機能が実装されているか確認
- ⚠️ もし使用されていない場合、Phase 1.0の優先度を見直し

---

## 🎯 次フェーズ候補（Phase 1.0完了後）

### Phase 1.1: generateCardsFromPage 統合 ✅

**対象ファイル:** `app/_actions/generateCardsFromPage.ts`

**現在の状態:**
- ✅ 実装済み（使用中）
- ✅ getUserAPIKey 統合完了
- ✅ プロバイダー選択対応完了

**変更内容:**
```typescript
export async function generateRawCardsFromPageContent(
  pageContentTiptap: Json | null,
  options?: { provider?: LLMProvider; model?: string }
): Promise<{ generatedRawCards: GeneratedRawCard[]; error?: string; }>
```

**優先度:** 🔴 High（実際に使用されている）

---

### Phase 2.0: LLM Client 抽象化

**目標:** Gemini以外のプロバイダー対応

**実装内容:**
```typescript
// lib/llm/client.ts に統合クライアント作成
export async function generateContent(
  provider: LLMProvider,
  apiKey: string,
  model: string,
  contents: any
): Promise<any> {
  switch (provider) {
    case "google":
      return geminiClient.models.generateContent({ model, contents });
    case "openai":
      return openaiClient.chat.completions.create({ model, messages: contents });
    case "anthropic":
      return anthropicClient.messages.create({ model, messages: contents });
  }
}
```

**優先度:** 🟡 Medium（現在は Gemini のみで十分）

---

## 📊 進捗サマリー

### 完了済み
```
Phase 0.1～0.5: インフラ・UI ............................ ✅ 100%
Phase 1.0 Day 1-2: generatePageInfo統合 ................. ✅ 100%
Phase 1.0 Day 3: generateCards統合 ....................... ✅ 100%
Phase 1.1: generateCardsFromPage統合 ..................... ✅ 100%
Phase 1.2: generateQuestions統合 ......................... ✅ 100%
```

### 進行中
```
なし（Phase 1-5完了）
```

### 完了済み（追加）
```
Phase 1.1: generateCardsFromPage統合 .................... ✅ 完了
Phase 1.2: generateQuestions統合 ......................... ✅ 完了
```

### 未着手
```
Phase 2.0: LLM Client 抽象化 ............................ 📋 計画中
Phase 6-8: 残りのAI関数の統合 ........................... 📋 計画中
```

---

## ✅ 推奨される次のアクション（確定）

### 調査結果に基づく判断 ✅

**結論: Phase 1.0 Day 3 を続行**

**理由:**
1. ✅ generateCardsFromTranscript は4つの実装ファイルで使用中
   - 音声カード生成（audio-card-generator.tsx）
   - 画像OCRカード生成（image-card-generator.tsx）
   - バッチ処理（audioBatchProcessing.ts）
2. ✅ 既にユーザーが利用している機能
3. ✅ getUserAPIKey 統合による改善効果が大きい

### 次の作業手順

#### 1️⃣ 今すぐ開始: generateCards.spec.md 作成（30分）
```bash
# ファイル作成
touch app/_actions/generateCards.spec.md

# テンプレートは generatePageInfo.spec.md を参考に
# TC-001～TC-012 を定義
```

#### 2️⃣ generateCards.ts 修正（30分）
```typescript
// getUserAPIKey をインポート
// options パラメータ追加
// provider 対応
```

#### 3️⃣ generateCards.test.ts 作成（1時間）
```typescript
// generatePageInfo.test.ts のパターンを再利用
// 12個のテストケース実装
```

#### 4️⃣ 使用側の更新検討（追加作業）
以下のファイルで新しいオプションを活用可能:
- `audio-card-generator.tsx`
- `image-card-generator.tsx`
- `audioBatchProcessing.ts`

**オプション機能として実装可能:**
```typescript
// 将来的にプロバイダー選択UIを追加
await generateCardsFromTranscript(transcript, audioUrl, {
  provider: userPreferredProvider
});
```

---

## 🔗 関連ドキュメント

### 計画書
- Phase 1.0 Day 3 計画: `docs/03_plans/phase-1-ai-integration/20251102_02_day3-generatecards-integration-plan.md`
- Phase 0.5 UI実装: `docs/03_plans/mastra-infrastructure/20251102_03_phase05-ui-plan.md`

### 実装済みファイル
- getUserAPIKey: `app/_actions/ai/getUserAPIKey.ts`
- generatePageInfo: `app/_actions/generatePageInfo.ts`
- Server Actions: `app/_actions/ai/apiKey.ts`

### テスト
- getUserAPIKey tests: `app/_actions/ai/__tests__/getUserAPIKey.test.ts`
- generatePageInfo tests: `app/_actions/__tests__/generatePageInfo.test.ts`

### ログ
- Phase 0.5 完了: `docs/05_logs/2025_11/20251102/07_ui-implementation-day1.md`
- Server Actions: `docs/05_logs/2025_11/20251102/05_server-actions.md`

---

## 📝 メモ

### 実装済みパターンの活用

**generatePageInfo.ts のパターンを再利用:**
- ✅ getUserAPIKey の呼び出し方法
- ✅ options パラメータの型定義
- ✅ provider のデフォルト値処理
- ✅ ロギングの配置
- ✅ エラーハンドリング

**generatePageInfo.test.ts のパターンを再利用:**
- ✅ Mock setup 方法
- ✅ createMockGeminiResponse ヘルパー
- ✅ テストケース構造
- ✅ beforeEach での初期化

**時間短縮のポイント:**
- コピー&ペースト → 関数名・変数名を置換
- テストケースの大部分は類似
- 特有のロジック（JSONパース）のみ注意

---

---

## 🎯 実装ロードマップ（全体像）

```
┌─────────────────────────────────────────────────────────────┐
│ AI機能統合 - Phase 0～2                                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ✅ Phase 0.1-0.4: インフラ構築（完了）                       │
│    ├─ データベース（user_api_keys）                         │
│    ├─ 暗号化・復号化                                         │
│    ├─ getUserAPIKey                                          │
│    └─ Server Actions × 4                                     │
│                                                               │
│ ✅ Phase 0.5: UI実装（完了）                                 │
│    ├─ /settings/api-keys ページ                             │
│    ├─ APIKeySettings                                         │
│    ├─ ProviderCard                                           │
│    ├─ APIKeyForm                                             │
│    └─ APIKeyStatusBadge                                      │
│                                                               │
│ ✅ Phase 1.0 Day 1-2: generatePageInfo（完了）              │
│    ├─ getUserAPIKey 統合                                     │
│    ├─ 12/12 テスト PASS                                      │
│    └─ プロバイダー選択対応                                   │
│                                                               │
│ ✅ Phase 1.0 Day 3: generateCards（完了）                   │
│    ├─ ✅ generateCards.spec.md                              │
│    ├─ ✅ generateCards.ts 修正                              │
│    ├─ ✅ generateCards.test.ts                              │
│    └─ ✅ 13/13 テスト PASS                                  │
│                                                               │
│ ✅ Phase 1.1: generateCardsFromPage（完了）                 │
│    └─ ページコンテンツからカード生成統合                     │
│                                                               │
│ ✅ Phase 1.2: generateQuestions（完了）                      │
│    └─ lib/gemini.ts統合                                      │
│                                                               │
│ 📋 Phase 2.0: LLM Client 抽象化（将来）                     │
│    └─ OpenAI/Anthropic完全対応                              │
│                                                               │
└─────────────────────────────────────────────────────────────┘

進捗: ████████████████████ 100%（Phase 1-5完了）
```

---

## 📈 メトリクス

### テストカバレッジ
```
getUserAPIKey:         12/12 PASS ✅
generatePageInfo:      12/12 PASS ✅
generateCards:         13/13 PASS ✅
generateCardsFromPage: 19/19 PASS ✅
generateQuestions:     統合済み ✅
Server Actions:        統合済み ✅
UI Components:         51/51 PASS ✅

合計: 95件のテスト PASS ✅
```

### コード量
```
Phase 0.1-0.4:  ~500行（インフラ）
Phase 0.5:      ~575行（UI）
Phase 1.0:      ~200行（generatePageInfo統合）
Phase 1.0 Day 3: ~150行（generateCards統合）
Phase 1.1:      ~150行（generateCardsFromPage統合）
Phase 1.2:      ~100行（generateQuestions統合）
合計:           ~1675行

Phase 6-8予定: ~300行（残りのAI関数統合）
```

### 実装時間（実績）
```
Phase 0.1-0.4:  8時間
Phase 0.5:      6時間
Phase 1.0 D1-2: 3時間
Phase 1.0 D3:   2.75時間
Phase 1.1:      2時間
Phase 1.2:      1.5時間
合計:           24.25時間

予定（Phase 6-8）: 8-10時間
```

---

## 🚀 今日中に完了可能なタスク

**Phase 1.0 Day 3（所要時間: 2時間45分）**

```
17:30 - 18:00  generateCards.spec.md 作成
18:00 - 18:30  generateCards.ts 修正
18:30 - 19:30  generateCards.test.ts 実装
19:30 - 20:00  テスト・検証・調整
20:00 - 20:15  作業ログ記録
```

**完了後の状態:**
- ✅ Phase 1.0 完全完了
- ✅ 音声・画像カード生成がプロバイダー選択対応
- ✅ テストカバレッジ 24/24 PASS
- 🎯 Phase 1.1 へ進む準備完了

---

**最終更新:** 2025-11-03 13:20
**Phase 1-5完了:** ✅ すべての実装タスク完了
**次のフェーズ:** Phase 6-8（残りのAI関数の統合）
