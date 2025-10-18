"use server";

import { createUserContent } from "@google/genai";
import { geminiClient } from "@/lib/gemini/client";
import { createClient } from "@/lib/supabase/server";
import {
	convertTextToTiptapJSON,
	estimateTokenCount,
	type PdfProblem,
	removeDuplicateProblems,
} from "@/lib/utils/pdfUtils";
import type { Json } from "@/types/database.types";

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

/**
 * 全PDFテキストから一問一答カードに適した問題を一括抽出
 *
 * @description PDFから抽出されたテキストを基に、既存の問題文・解答・解説を
 * 一問一答学習カード形式に変換して抽出します。新しい問題は生成せず、
 * PDFの内容を忠実に反映することを最優先とします。
 *
 * @param pagesText - PDFページごとのテキスト配列
 * @returns 一問一答形式に変換された問題配列
 *
 * @example
 * const problems = await extractProblemsFromAllPages([
 *   { pageNumber: 1, text: "問1. 次のうち正しいものは？\n(1)A (2)B\n正解：(2)" }
 * ]);
 */
export async function extractProblemsFromAllPages(
	pagesText: Array<{ pageNumber: number; text: string }>,
): Promise<PdfProblem[]> {
	const systemPrompt = `
あなたはPDF学習カード作成の専門家です。
以下のPDFテキストから実際に記載されている問題を忠実に抽出し、一問一答学習カードに適した形式に変換してください。

**重要：PDFの内容をベースにした抽出・変換のみ行うこと**
- 新しい問題は作成しない
- PDFに記載されている問題文・解答・解説のみを使用
- 内容の忠実性を最優先とする

**一問一答カード変換の原則:**
- 表面: PDFの問題文をシンプルで明確に変換
- 裏面: PDFの解答を簡潔で覚えやすく変換
- 3秒以内で確認できる内容を目指す

出力形式:
[
  {
    "problemText": "PDFの問題文を簡潔に変換（選択肢は含めない）",
    "answerText": "PDFの解答を簡潔に変換（推測不可な場合はnull）",
    "explanationText": "PDFの解説から重要ポイントのみ抽出（20字以内推奨）",
    "problemType": "multiple_choice" | "descriptive" | "calculation" | "unknown",
    "confidence": 0.0-1.0の信頼度,
    "pageNumber": ページ番号（数値）
  }
]

抽出・変換ルール:
1. **問題文**: PDFの問題から問題番号・選択肢を除去し、質問部分のみを忠実に抽出
   - 元: "問1. 次のうち正しいものを選べ。(1)A (2)B (3)C"
   - 変換: "〇〇について正しいものは何か？"（PDFの文脈に基づく）

2. **解答**: PDFに記載された解答から正解のみを忠実に抽出
   - 元: "正解は(2)Bです。なぜなら..."
   - 変換: "B" または PDFに記載された解答内容

3. **解説**: PDFの解説から覚えるべき重要ポイントのみを忠実に抽出
   - 元: PDFの詳細な解説
   - 変換: 解説の要点（20字以内推奨）

4. **問題タイプ**: PDFの問題形式に基づいて正確に判定
5. **信頼度**: PDFでの問題・解答の明確さに基づいて評価

重要な制約事項:
- PDFに記載されていない情報は推測・生成しない
- 解答がPDFで不明確な場合は null にする
- PDFの内容を忠実に反映することを最優先とする
- 複雑すぎてカード化に適さない問題は confidence を下げる
- 学習カードとして不適切な内容（手順説明等）は除外
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

/**
 * PDF抽出問題に対して一問一答形式の解答・解説を生成
 *
 * @description PDFから抽出された問題文に対して、一般的な知識に基づいて
 * 簡潔で覚えやすい解答と補足説明を生成します。不確実な内容については
 * 謙虚にconfidenceを下げて対応します。
 *
 * @param problem - PDF抽出された問題オブジェクト
 * @returns 一問一答形式に最適化された解答・解説・信頼度
 *
 * @example
 * const result = await generateAnswerAndExplanation({
 *   problemText: "効率性を向上させる基本原則は何か？",
 *   // ... other properties
 * });
 * // result: { answerText: "生産性の向上", explanationText: "基本原則", confidence: 0.8 }
 */
export async function generateAnswerAndExplanation(
	problem: PdfProblem,
): Promise<{
	answerText: string;
	explanationText: string;
	confidence: number;
}> {
	try {
		const systemPrompt = `
あなたは一問一答学習カードの専門家です。以下のPDF抽出問題に対して、一般的な知識に基づいて簡潔な解答を生成してください。

**重要：PDF抽出された問題に基づく解答生成**
- この問題はPDFから抽出されたものです
- 一般的な知識・常識に基づいて適切な解答を生成してください
- 推測が困難な専門的内容の場合は confidence を下げてください

抽出された問題文:
${problem.problemText}

出力形式（JSON）:
{
  "answerText": "簡潔で覚えやすい正解",
  "explanationText": "重要ポイントのみの補足（必要時のみ）",
  "confidence": 0.0-1.0の信頼度
}

一問一答カード生成ルール:
1. **解答**: 3秒で確認できる簡潔さを最優先
   - 選択肢問題: 正解の内容のみ（記号不要）
   - 計算問題: 数値と単位のみ
   - 記述問題: キーワードまたは一文で要約
   - 推測困難な場合: 「要確認」等の適切な表示

2. **解説**: 20字以内で覚えるべき重要ポイントのみ
   - 暗記のコツやゴロ合わせ
   - 混同しやすい概念との違い
   - 実務で重要な理由（簡潔に）
   - 推測困難な場合は空文字

3. **信頼度評価**: PDF問題の解答可能性を正確に評価
   - 一般知識で解答可能: 0.7-0.9
   - 専門知識が必要: 0.4-0.6
   - 推測困難: 0.1-0.3

品質基準（一問一答特化）:
- 暗記効率: 繰り返し学習に最適化
- 即答性: 瞬時に答えを確認できる
- 要点集約: 本質的な内容のみに絞る
- 謙虚さ: 不確実な内容は無理に解答しない

例:
❌ 推測: "恐らく○○だと思います。詳細は..."
⭕ 適切: "効率性の向上" + 補足: "生産性の基本原則"
⭕ 謙虚: "要確認" + 補足: "専門的内容"
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
		// 一問一答形式：答えを主役とした簡潔な裏面コンテンツを作成
		const answerText = problem.answerText || "解答が見つかりませんでした";
		const explanationText = problem.explanationText || "";

		// 一問一答形式：答えメインで、必要時のみ補足を追加
		let backContentText = answerText;
		if (explanationText && explanationText.trim() !== "") {
			backContentText += `\n\n${explanationText}`;
		}

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
		// 一問一答形式：答えメインで、必要時のみ補足を追加
		let backContentText = item.answerText;
		if (item.explanationText && item.explanationText.trim() !== "") {
			backContentText += `\n\n${item.explanationText}`;
		}

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
