"use server";

import { getGeminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";

/**
 * PDF内容分析結果の型
 */
export interface PdfContentAnalysisResult {
	success: boolean;
	message: string;
	contentType: "questions_only" | "mixed_content" | "answers_only" | "unknown";
	hasQuestions: boolean;
	hasAnswers: boolean;
	hasExplanations: boolean;
	confidence: number;
	recommendedProcessing: "single_basic" | "single_enhanced" | "dual_required";
	error?: string;
}

/**
 * PDFテキストを分析して内容タイプを判定
 *
 * @param extractedText - 抽出されたテキストデータ
 * @returns 分析結果
 */
export async function analyzePdfContent(
	extractedText: Array<{ pageNumber: number; text: string }>,
): Promise<PdfContentAnalysisResult> {
	try {
		// 全ページのテキストを結合（分析用サンプル）
		const sampleText = extractedText
			.slice(0, 3) // 最初の3ページのみ分析（コスト削減）
			.map((page) => page.text)
			.join("\n\n")
			.slice(0, 4000); // 4000文字まで

		const systemPrompt = `あなたはPDF文書の内容タイプを分析する専門家です。
以下のテキストを分析し、どのような種類の学習教材かを判定してください。

判定項目:
1. **問題の有無**: 問題文、設問、演習問題が含まれているか
2. **解答の有無**: 正解、答え、解答が明記されているか  
3. **解説の有無**: 解答の根拠、詳細説明、解法が含まれているか

出力形式（JSON）:
{
  "contentType": "questions_only" | "mixed_content" | "answers_only" | "unknown",
  "hasQuestions": boolean,
  "hasAnswers": boolean,
  "hasExplanations": boolean,
  "confidence": 0.0-1.0,
  "recommendedProcessing": "single_basic" | "single_enhanced" | "dual_required",
  "reasoning": "判定理由の説明"
}

判定基準:
- **questions_only**: 問題のみで解答がほとんど含まれていない
- **mixed_content**: 問題・解答・解説が同一文書内に混在している  
- **answers_only**: 主に解答・解説で構成されている
- **unknown**: 判定困難

処理推奨:
- **single_basic**: 基本的なシングル処理で十分
- **single_enhanced**: 強化シングル処理が適している（問題・解答混在時）
- **dual_required**: デュアル処理（別ファイル）が必要

特に注目すべきキーワード:
- 問題関連: "問題", "設問", "Q", "問", "(1)", "選択肢", "次のうち", "正しいのは"
- 解答関連: "解答", "答え", "正解", "解", "A:", "答:", "解答例"
- 解説関連: "解説", "説明", "理由", "根拠", "なぜなら", "ポイント"`;

		const contents = createUserContent([systemPrompt, sampleText]);

		const geminiClient = getGeminiClient();
		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});

		const { candidates } = response as {
			candidates?: Array<{ content: unknown }>;
		};
		const raw = candidates?.[0]?.content;
		if (!raw) {
			throw new Error("内容分析に失敗しました: レスポンスが空です");
		}

		// レスポンス解析
		let jsonString: string;
		if (typeof raw === "string") {
			jsonString = raw;
		} else if (
			typeof raw === "object" &&
			raw !== null &&
			"parts" in raw &&
			Array.isArray((raw as { parts: unknown }).parts)
		) {
			jsonString = (raw as { parts: { text: string }[] }).parts
				.map((p) => p.text)
				.join("");
		} else {
			jsonString = String(raw);
		}

		// JSON抽出
		const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/;
		const fenceMatch = jsonString.match(fencePattern);
		if (fenceMatch) {
			jsonString = fenceMatch[1].trim();
		} else {
			const start = jsonString.indexOf("{");
			const end = jsonString.lastIndexOf("}");
			if (start !== -1 && end !== -1 && end > start) {
				jsonString = jsonString.slice(start, end + 1);
			}
		}

		const analysisResult = JSON.parse(jsonString);

		return {
			success: true,
			message: "PDF内容分析が完了しました",
			contentType: analysisResult.contentType || "unknown",
			hasQuestions: analysisResult.hasQuestions || false,
			hasAnswers: analysisResult.hasAnswers || false,
			hasExplanations: analysisResult.hasExplanations || false,
			confidence: analysisResult.confidence || 0.5,
			recommendedProcessing:
				analysisResult.recommendedProcessing || "single_basic",
		};
	} catch (error) {
		console.error("PDF内容分析エラー:", error);
		return {
			success: false,
			message: "PDF内容分析中にエラーが発生しました",
			contentType: "unknown",
			hasQuestions: false,
			hasAnswers: false,
			hasExplanations: false,
			confidence: 0.0,
			recommendedProcessing: "single_basic",
			error: error instanceof Error ? error.message : "不明なエラー",
		};
	}
}
