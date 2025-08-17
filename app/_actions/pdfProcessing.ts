"use server";

import { createClient } from "@/lib/supabase/server";
import { geminiClient } from "@/lib/gemini/client";
import { createUserContent } from "@google/genai";
import type { Json } from "@/types/database.types";
import {
	removeDuplicateProblems,
	convertTextToTiptapJSON,
	estimateTokenCount,
	type PdfProblem,
} from "@/lib/utils/pdfUtils";

// PDF処理関連の型定義
export interface PdfChunk {
	chunkId: string;
	pageNumbers: number[];
	text: string;
	tokenCount: number;
	confidence: number;
}

// PdfProblemの型は lib/utils/pdfUtils.ts から再エクスポート
export type { PdfProblem } from "@/lib/utils/pdfUtils";

export interface PdfProcessingResult {
	chunks: PdfChunk[];
	detectedProblems: PdfProblem[];
	totalPages: number;
	processingTimeMs: number;
}

export interface GeneratedPdfCard {
	front_content: Json; // TiptapJSON形式
	back_content: Json; // TiptapJSON形式
	source_pdf_url: string;
	source_page: number;
	metadata: {
		problem_id: string;
		confidence_score: number;
		chunk_id: string;
		processing_model: string;
	};
}

export interface EnhancedPdfCard {
	front_content: Json; // 問題文（TiptapJSON形式）
	back_content: Json; // 解答 + 解説（TiptapJSON形式）
	source_pdf_url: string;
	source_page: number;
	metadata: {
		problem_id: string;
		confidence_score: number;
		answer_text: string;
		explanation_text: string;
		processing_model: string;
		processing_type: "dual_pdf_ocr" | "enhanced_single_pdf";
	};
}

// TiptapJSON変換とトークン推定関数は lib/utils/pdfUtils.ts に移動済み

// PDFチャンク分割処理
export async function createPdfChunks(
	pagesText: Array<{ pageNumber: number; text: string }>,
	maxTokensPerChunk = 4000,
): Promise<PdfChunk[]> {
	console.log(
		`[チャンク分割] 入力: ${pagesText.length}ページ、各ページの文字数: ${pagesText.map((p) => p.text.length).join(", ")}`,
	);
	console.log(`[チャンク分割] 最大トークン数: ${maxTokensPerChunk}`);
	const chunks: PdfChunk[] = [];
	let currentChunk: { pageNumbers: number[]; text: string } = {
		pageNumbers: [],
		text: "",
	};
	let currentTokenCount = 0;

	for (const page of pagesText) {
		const pageTokens = estimateTokenCount(page.text);

		// 単一ページが制限を超える場合は、そのまま単独チャンクとする
		if (pageTokens > maxTokensPerChunk) {
			// 現在のチャンクがあれば先に保存
			if (currentChunk.pageNumbers.length > 0) {
				chunks.push({
					chunkId: crypto.randomUUID(),
					pageNumbers: currentChunk.pageNumbers,
					text: currentChunk.text,
					tokenCount: currentTokenCount,
					confidence: 1.0,
				});
			}

			// 大きなページを単独チャンクとして追加
			chunks.push({
				chunkId: crypto.randomUUID(),
				pageNumbers: [page.pageNumber],
				text: page.text,
				tokenCount: pageTokens,
				confidence: 0.8, // 大きすぎるチャンクは信頼度を下げる
			});

			// リセット
			currentChunk = { pageNumbers: [], text: "" };
			currentTokenCount = 0;
			continue;
		}

		// 追加するとトークン制限を超える場合
		if (
			currentTokenCount + pageTokens > maxTokensPerChunk &&
			currentChunk.pageNumbers.length > 0
		) {
			chunks.push({
				chunkId: crypto.randomUUID(),
				pageNumbers: currentChunk.pageNumbers,
				text: currentChunk.text,
				tokenCount: currentTokenCount,
				confidence: 1.0,
			});

			// リセット
			currentChunk = { pageNumbers: [], text: "" };
			currentTokenCount = 0;
		}

		// 現在のチャンクに追加
		currentChunk.pageNumbers.push(page.pageNumber);
		currentChunk.text += `${currentChunk.text ? "\n\n" : ""}=== ページ ${page.pageNumber} ===\n${page.text}`;
		currentTokenCount += pageTokens;
	}

	// 最後のチャンクを追加
	if (currentChunk.pageNumbers.length > 0) {
		chunks.push({
			chunkId: crypto.randomUUID(),
			pageNumbers: currentChunk.pageNumbers,
			text: currentChunk.text,
			tokenCount: currentTokenCount,
			confidence: 1.0,
		});
	}

	console.log(
		`[チャンク分割] 結果: ${chunks.length}個のチャンク、各チャンクのトークン数: ${chunks.map((c) => c.tokenCount).join(", ")}`,
	);
	return chunks;
}

// 全PDFテキストから問題を一括抽出
export async function extractProblemsFromAllPages(
	pagesText: Array<{ pageNumber: number; text: string }>,
): Promise<PdfProblem[]> {
	const systemPrompt = `
あなたはPDFから問題と解答を抽出する専門家です。
以下のテキストから問題文を検出し、解答や解説が含まれている場合は一緒に抽出してください。

出力形式:
[
  {
    "problemText": "問題文（選択肢も含む）",
    "answerText": "解答（あれば）",
    "explanationText": "解説（あれば）",
    "problemType": "multiple_choice" | "descriptive" | "calculation" | "unknown",
    "confidence": 0.0-1.0の信頼度,
    "pageNumber": ページ番号（数値）
  }
]

抽出ルール:
1. **問題文**: 問題番号は除去し、本文と選択肢を完全に含める
2. **解答**: 明確に解答が記載されている場合のみ抽出（推測しない）
3. **解説**: 詳細な説明や解法が記載されている場合のみ抽出
4. **問題タイプ**: 選択肢があれば"multiple_choice"、計算問題なら"calculation"、記述なら"descriptive"
5. **信頼度**: 問題文・解答・解説の完全性に基づいて設定
6. **ページ番号**: 問題が見つかったページ番号を正確に記録

重要な注意事項:
- 解答や解説が明確でない場合は null または空文字にする
- 解答が確実でない場合は推測せず、後の処理で生成する
- 問題文は必須、解答・解説はオプション
- 複数の問題がある場合は個別に抽出
- ページをまたぐ問題の場合は最初のページ番号を記録
`;

	try {
		// 全ページのテキストを結合
		const allText = pagesText
			.map((page) => `=== ページ ${page.pageNumber} ===\n${page.text}`)
			.join("\n\n");

		console.log(`[AI処理] 全${pagesText.length}ページのテキストを一括処理開始`);
		console.log(`[AI処理] 総文字数: ${allText.length}文字`);

		const contents = createUserContent([systemPrompt, allText]);

		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});

		const { candidates } = response as {
			candidates?: Array<{ content: unknown }>;
		};
		const raw = candidates?.[0]?.content;
		if (!raw) {
			throw new Error("問題抽出に失敗しました: 内容が空です");
		}

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
			const start = jsonString.indexOf("[");
			const end = jsonString.lastIndexOf("]");
			if (start !== -1 && end !== -1 && end > start) {
				jsonString = jsonString.slice(start, end + 1);
			}
		}

		const parsed = JSON.parse(jsonString);

		const problems = parsed.map(
			(
				item: {
					problemText?: string;
					answerText?: string;
					explanationText?: string;
					problemType?: string;
					confidence?: number;
					pageNumber?: number;
				},
				index: number,
			) => ({
				id: `batch-${index}`,
				problemText: item.problemText || "",
				answerText: item.answerText || undefined,
				explanationText: item.explanationText || undefined,
				problemType: item.problemType || "unknown",
				confidence: item.confidence || 0.5,
				pageNumber: item.pageNumber || 1, // ページ番号が指定されない場合は1
				chunkId: "batch-processing", // 一括処理用の固定ID
			}),
		);

		console.log(`[AI処理] 一括処理完了: ${problems.length}個の問題を抽出`);
		return problems;
	} catch (error) {
		console.error("一括問題抽出エラー:", error);
		return [];
	}
}

// 注意: 以下の関数群は一括処理に移行したため削除されました
// - extractProblemsWithPrompt
// - extractProblemsFromChunks
// - extractProblemsFromChunk
// 新しい一括処理: extractProblemsFromAllPages を使用してください

// 問題に対して解答・解説を生成
export async function generateAnswerAndExplanation(
	problem: PdfProblem,
): Promise<{
	answerText: string;
	explanationText: string;
	confidence: number;
}> {
	try {
		const systemPrompt = `
あなたは教育専門家です。以下の問題文に対して、適切な解答と詳細な解説を生成してください。

問題文:
${problem.problemText}

出力形式（JSON）:
{
  "answerText": "正解（簡潔に）",
  "explanationText": "詳細な解説",
  "confidence": 0.0-1.0の信頼度
}

解答・解説生成ルール:
1. **解答**: 選択肢問題なら選択肢記号、計算問題なら数値、記述問題なら簡潔な答え
2. **解説**: 以下を含む：
   - なぜその答えが正しいのか
   - 他の選択肢がなぜ間違いか（選択肢問題の場合）
   - 関連する重要な概念や知識
   - 覚えるべきポイント
   - 実務での応用例（可能な場合）

品質基準:
- 学習者が理解しやすい具体的な説明
- 専門用語には簡潔な説明を併記
- 論理的で納得できる解答根拠
- 実践的な学習価値のある内容
`;

		const contents = createUserContent([systemPrompt, ""]);

		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});

		const { candidates } = response as {
			candidates?: Array<{ content: unknown }>;
		};
		const raw = candidates?.[0]?.content;
		if (!raw) {
			throw new Error("解答・解説生成に失敗しました: レスポンスが空です");
		}

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

		const parsed = JSON.parse(jsonString);

		return {
			answerText: parsed.answerText || "解答を生成できませんでした",
			explanationText: parsed.explanationText || "解説を生成できませんでした",
			confidence: parsed.confidence || 0.5,
		};
	} catch (error) {
		console.error(`問題 ${problem.id} の解答・解説生成エラー:`, error);
		return {
			answerText: "解答を生成できませんでした",
			explanationText: "解説を生成できませんでした",
			confidence: 0.1,
		};
	}
}

// 複数問題に対して条件付きで解答・解説を生成
export async function generateAnswersForProblems(
	problems: PdfProblem[],
): Promise<PdfProblem[]> {
	// 解答が不足している問題のみフィルタ
	const problemsNeedingAnswers = problems.filter(
		(problem) => !problem.answerText || problem.answerText.trim() === "",
	);

	console.log(
		`[解答生成] 全${problems.length}問中、${problemsNeedingAnswers.length}問に解答生成が必要`,
	);

	if (problemsNeedingAnswers.length === 0) {
		console.log(
			"[解答生成] 全ての問題に解答が含まれているため、生成処理をスキップ",
		);
		return problems;
	}

	// 5問ずつ並列処理（APIレート制限考慮）
	const batchSize = 5;
	const problemBatches: PdfProblem[][] = [];

	for (let i = 0; i < problemsNeedingAnswers.length; i += batchSize) {
		problemBatches.push(problemsNeedingAnswers.slice(i, i + batchSize));
	}

	const generatedAnswersMap = new Map<
		string,
		{ answerText: string; explanationText: string; confidence: number }
	>();

	for (const [batchIndex, batch] of problemBatches.entries()) {
		console.log(
			`[解答生成] バッチ${batchIndex + 1}/${problemBatches.length}: ${batch.length}問を並列処理中...`,
		);

		const batchPromises = batch.map(async (problem) => {
			const answerResult = await generateAnswerAndExplanation(problem);
			return {
				problemId: problem.id,
				...answerResult,
			};
		});

		const batchResults = await Promise.all(batchPromises);

		// 結果をマップに保存
		for (const result of batchResults) {
			generatedAnswersMap.set(result.problemId, {
				answerText: result.answerText,
				explanationText: result.explanationText,
				confidence: result.confidence,
			});
		}

		console.log(
			`[解答生成] バッチ${batchIndex + 1}完了: ${batchResults.length}問の解答・解説を生成`,
		);
	}

	// 元の問題リストに生成された解答をマージ
	const enrichedProblems = problems.map((problem) => {
		const generated = generatedAnswersMap.get(problem.id);
		if (generated) {
			return {
				...problem,
				answerText: generated.answerText,
				explanationText: problem.explanationText || generated.explanationText, // 既存の解説を優先
				confidence: Math.min(problem.confidence, generated.confidence),
			};
		}
		return problem; // 既に解答がある問題はそのまま
	});

	console.log(
		`[解答生成] 完了: ${problemsNeedingAnswers.length}問の解答を生成、${problems.length - problemsNeedingAnswers.length}問は既存解答を使用`,
	);
	return enrichedProblems;
}

// removeDuplicateProblems関数は lib/utils/pdfUtils.ts に移動済み

// 問題からカード生成
export async function generateCardsFromProblems(
	problems: PdfProblem[],
	sourcePdfUrl: string,
): Promise<EnhancedPdfCard[]> {
	// 信頼度が0.3以上の問題のみフィルタ
	const filteredProblems = problems.filter(
		(problem) => problem.confidence > 0.3,
	);
	console.log(
		`[カード生成] 信頼度フィルタ: ${problems.length}個 → ${filteredProblems.length}個（閾値0.3以上）`,
	);

	return filteredProblems.map((problem) => {
		// 解答と解説を組み合わせた詳細な裏面コンテンツを作成
		const answerText = problem.answerText || "解答が見つかりませんでした";
		const explanationText =
			problem.explanationText || "詳細な解説は抽出されませんでした";

		const backContentText = `## 解答\n${answerText}\n\n## 解説\n${explanationText}`;

		return {
			front_content: convertTextToTiptapJSON(problem.problemText),
			back_content: convertTextToTiptapJSON(backContentText),
			source_pdf_url: sourcePdfUrl,
			source_page: problem.pageNumber,
			metadata: {
				problem_id: problem.id,
				confidence_score: problem.confidence,
				answer_text: answerText,
				explanation_text: explanationText,
				processing_model: "gemini-2.5-flash",
				processing_type: "enhanced_single_pdf" as const,
			},
		};
	});
}

// PDF処理の完全なワークフロー（一括処理）
export async function processPdfToCards(
	pagesText: Array<{ pageNumber: number; text: string }>,
	sourcePdfUrl: string,
	maxTokensPerChunk = 4000, // 下位互換のため残すが使用しない
): Promise<{
	cards: EnhancedPdfCard[];
	processingResult: PdfProcessingResult;
}> {
	const startTime = Date.now();

	try {
		// 1. 全ページから問題を一括抽出
		console.log(`[PDF処理] 1. 問題一括抽出開始: ${pagesText.length}ページ`);
		const allProblems = await extractProblemsFromAllPages(pagesText);
		console.log(`[PDF処理] 1. 問題抽出完了: ${allProblems.length}個の問題`);

		// 2. 重複除去
		const uniqueProblems = removeDuplicateProblems(allProblems);
		console.log(
			`[PDF処理] 2. 重複除去完了: ${uniqueProblems.length}個の問題（ユニーク）`,
		);

		// 3. 条件付き解答・解説生成
		let enrichedProblems: PdfProblem[] = [];
		if (uniqueProblems.length > 0) {
			enrichedProblems = await generateAnswersForProblems(uniqueProblems);
			console.log(
				`[PDF処理] 3. 解答・解説生成完了: ${enrichedProblems.length}個の問題`,
			);
		} else {
			console.log(
				"[PDF処理] 3. 問題が見つからなかったため、解答・解説生成をスキップ",
			);
		}

		// 4. カード生成
		const cards = await generateCardsFromProblems(
			enrichedProblems,
			sourcePdfUrl,
		);
		console.log(
			`[PDF処理] 4. カード生成完了: ${cards.length}個のカード（解説付き）`,
		);

		// 処理結果（チャンクは使用しないため空配列）
		const processingResult: PdfProcessingResult = {
			chunks: [], // 一括処理のためチャンクは不要
			detectedProblems: enrichedProblems,
			totalPages: pagesText.length,
			processingTimeMs: Date.now() - startTime,
		};

		return { cards, processingResult };
	} catch (error) {
		console.error("PDF処理エラー:", error);
		throw new Error(
			`PDF処理に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
		);
	}
}

// raw_inputsにPDF処理結果を保存
export async function savePdfProcessingResult(
	userId: string,
	sourcePdfUrl: string,
	processingResult: PdfProcessingResult,
): Promise<void> {
	const supabase = await createClient();

	const { error } = await supabase.from("raw_inputs").insert({
		user_id: userId,
		type: "pdf",
		source_url: sourcePdfUrl,
		text_content: JSON.stringify(processingResult),
	});

	if (error) {
		throw new Error(`処理結果の保存に失敗しました: ${error.message}`);
	}
}

/**
 * デュアルPDFの問題・解答・解説データから高品質カードを生成
 *
 * @param dualPdfData - デュアルPDF OCRで抽出されたデータ
 * @param sourcePdfUrl - 問題PDFのURL
 * @returns 生成されたカード配列
 */
export async function generateCardsFromDualPdfData(
	dualPdfData: Array<{
		pageNumber: number;
		questionText: string;
		answerText: string;
		explanationText?: string;
	}>,
	sourcePdfUrl: string,
): Promise<EnhancedPdfCard[]> {
	console.log(
		`[デュアルカード生成] ${dualPdfData.length}個の問題・解答セットからカード生成開始`,
	);

	return dualPdfData.map((item) => {
		// 解答と解説を組み合わせた詳細な裏面コンテンツを作成
		const backContentText = `## 解答\n${item.answerText}\n\n## 解説\n${item.explanationText || "（解説情報なし）"}`;

		return {
			front_content: convertTextToTiptapJSON(item.questionText),
			back_content: convertTextToTiptapJSON(backContentText),
			source_pdf_url: sourcePdfUrl,
			source_page: item.pageNumber,
			metadata: {
				problem_id: `dual-${item.pageNumber}-${crypto.randomUUID()}`,
				confidence_score: 0.95, // デュアルPDF処理は高品質
				answer_text: item.answerText,
				explanation_text: item.explanationText || "",
				processing_model: "gemini-2.5-flash",
				processing_type: "dual_pdf_ocr" as const,
			},
		};
	});
}
