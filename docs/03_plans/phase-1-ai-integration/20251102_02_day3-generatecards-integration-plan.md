# Phase 1.0 Day 3: generateCards 統合計画

**目標**: generateCardsFromTranscript() へ getUserAPIKey を統合

---

## 実装タスク

### タスク 1: generateCards.spec.md 作成

**ファイル**: `app/_actions/generateCards.spec.md`

以下のテストケースを定義：

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

---

### タスク 2: generateCards.ts 修正

**変更内容**:

```typescript
import { getUserAPIKey } from "@/app/_actions/ai/getUserAPIKey";

export async function generateCardsFromTranscript(
	transcript: string,
	sourceAudioUrl: string,
	options?: { provider?: string; model?: string }
): Promise<GeneratedCard[]> {
	// 入力検証
	if (!transcript.trim()) {
		throw new Error("トランスクリプトが空です");
	}

	// Provider 決定
	const provider = options?.provider ?? "google";
	
	// API キー取得
	const apiKey = await getUserAPIKey(provider);
	
	// ロギング
	logger.info(
		{ provider, hasApiKey: !!apiKey },
		"Starting card generation"
	);

	// 既存ロジックを保持...
}
```

---

### タスク 3: generateCards.test.ts 作成

**ファイル**: `app/_actions/__tests__/generateCards.test.ts`

- 12 個のテストケースを実装
- `createMockGeminiResponse()` を再利用
- JSON パース エッジケースもテスト

---

### タスク 4: テスト実行と検証

```bash
bun run test -- app/_actions/__tests__/generateCards.test.ts
```

目標: 12/12 PASS

---

## 実装順序

1. **generateCards.spec.md** 作成（仕様定義）
2. **generateCards.ts** 修正（getUserAPIKey 統合）
3. **generateCards.test.ts** 作成（テスト実装）
4. **テスト実行** （12/12 PASS 確認）
5. **ビルド検証** （bun run build）
6. **作業ログ記録** （docs/05_logs/）

---

## 開始時刻

2025-11-02

