"use server";

import { geminiClient } from "@/lib/gemini/client";
import { createPartFromUri, createUserContent } from "@google/genai";

/**
 * 正規表現を使ったフォールバックデータ抽出
 */
function extractDataWithRegex(text: string): Array<{
	pageNumber: number;
	questionText: string;
	answerText: string;
	explanationText?: string;
}> {
	const results: Array<{
		pageNumber: number;
		questionText: string;
		answerText: string;
		explanationText?: string;
	}> = [];

	// パターン1: 問題・解答・解説の構造化抽出
	const structuredPattern =
		/問題\s*[：:]\s*(.*?)(?:\n|$).*?解答\s*[：:]\s*(.*?)(?:\n|$).*?(?:解説\s*[：:]\s*(.*?)(?:\n|$))?/g;
	const structuredMatches = [...text.matchAll(structuredPattern)];

	structuredMatches.forEach((match, index) => {
		results.push({
			pageNumber: index + 1,
			questionText: match[1]?.trim() || "",
			answerText: match[2]?.trim() || "",
			explanationText: match[3]?.trim() || "正規表現抽出のため解説なし",
		});
	});

	// パターン2: JSON風の構造を正規表現で抽出
	if (results.length === 0) {
		const jsonLikePattern =
			/"pageNumber"\s*:\s*(\d+).*?"questionText"\s*:\s*"(.*?)".*?"answerText"\s*:\s*"(.*?)".*?(?:"explanationText"\s*:\s*"(.*?)")?/g;
		const jsonMatches = [...text.matchAll(jsonLikePattern)];

		for (const match of jsonMatches) {
			results.push({
				pageNumber: Number.parseInt(match[1]) || 1,
				questionText: match[2]?.replace(/\\"/g, '"').trim() || "",
				answerText: match[3]?.replace(/\\"/g, '"').trim() || "",
				explanationText:
					match[4]?.replace(/\\"/g, '"').trim() || "正規表現抽出のため解説なし",
			});
		}
	}

	return results;
}

export interface BatchOcrResult {
	success: boolean;
	message: string;
	extractedText?: Array<{ pageNumber: number; text: string }>;
	error?: string;
	processingTimeMs?: number;
}

export interface DualPdfOcrResult {
	success: boolean;
	message: string;
	extractedText?: Array<{
		pageNumber: number;
		questionText: string;
		answerText: string;
		explanationText?: string;
	}>;
	error?: string;
	processingTimeMs?: number;
}

/**
 * 複数ページのPDF画像を一括でOCR処理（高速版）
 *
 * Gemini Files APIに直接複数画像をアップロードして一括処理
 *
 * @param imagePages - 複数ページの画像データ
 * @returns バッチOCR結果
 */
export async function processPdfBatchOcr(
	imagePages: Array<{ pageNumber: number; imageBlob: Blob }>,
): Promise<BatchOcrResult> {
	const startTime = Date.now();

	try {
		console.log(`[バッチOCR] ${imagePages.length}ページの一括処理開始`);

		// 1. 全画像をGemini Files APIにアップロード
		const uploadPromises = imagePages.map(async ({ pageNumber, imageBlob }) => {
			const uploadStart = Date.now();
			const { uri, mimeType } = await geminiClient.files.upload({
				file: imageBlob,
				config: { mimeType: imageBlob.type || "image/png" },
			});
			console.log(
				`[バッチOCR] ページ${pageNumber}: アップロード完了 (${Date.now() - uploadStart}ms)`,
			);

			return {
				pageNumber,
				uri,
				mimeType: mimeType || imageBlob.type || "image/png",
			};
		});

		const uploadedFiles = await Promise.all(uploadPromises);
		console.log(
			`[バッチOCR] 全ページアップロード完了 (${Date.now() - startTime}ms)`,
		);

		// 2. 画像パーツを作成
		const imageParts = uploadedFiles
			.filter((file) => file.uri)
			.map(({ uri, mimeType }) =>
				createPartFromUri(uri as string, mimeType || "image/png"),
			);

		// 3. バッチOCR用のプロンプト
		const systemPrompt = `以下の複数のPDF画像から、ページごとにテキストを抽出してください。

出力形式（JSON）:
[
  {
    "pageNumber": 1,
    "extractedText": "ページ1の抽出テキスト"
  },
  {
    "pageNumber": 2,
    "extractedText": "ページ2の抽出テキスト"
  }
]

注意事項:
- 画像の順序通りにページ番号を付けてください（1から開始）
- テキストが存在しないページの場合は、extractedTextを空文字列にしてください
- 可能な限り正確にテキストを抽出してください
- 数式や特殊記号も含めて抽出してください`;

		const contents = createUserContent([systemPrompt, ...imageParts]);

		// 4. Geminiで一括OCR処理
		const ocrStart = Date.now();
		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});
		console.log(`[バッチOCR] Gemini処理完了 (${Date.now() - ocrStart}ms)`);

		// 5. レスポンス解析
		const { candidates } = response as {
			candidates?: Array<{ content: unknown }>;
		};
		const raw = candidates?.[0]?.content;

		if (!raw) {
			throw new Error("OCR処理に失敗しました: 内容が空です");
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

		const parsed = JSON.parse(jsonString) as Array<{
			pageNumber: number;
			extractedText: string;
		}>;

		// 6. 結果変換
		const extractedText = parsed
			.filter(
				(item) => item.extractedText && item.extractedText.trim().length > 0,
			)
			.map((item) => ({
				pageNumber: item.pageNumber,
				text: item.extractedText.trim(),
			}));

		const processingTimeMs = Date.now() - startTime;
		console.log(
			`[バッチOCR] 完了: ${extractedText.length}/${imagePages.length}ページ処理 (総時間: ${processingTimeMs}ms)`,
		);

		return {
			success: true,
			message: `バッチOCRで${extractedText.length}/${imagePages.length}ページからテキストを抽出しました`,
			extractedText,
			processingTimeMs,
		};
	} catch (error) {
		console.error("[バッチOCR] エラー:", error);
		return {
			success: false,
			message: "バッチOCR処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
			processingTimeMs: Date.now() - startTime,
		};
	}
}

/**
 * 問題PDFと解答PDFを同時処理して高品質なカードを生成（超高速版）
 *
 * @param questionPages - 問題PDFの画像データ
 * @param answerPages - 解答PDFの画像データ
 * @returns デュアルPDF OCR結果
 */
export async function processDualPdfBatchOcr(
	questionPages: Array<{ pageNumber: number; imageBlob: Blob }>,
	answerPages: Array<{ pageNumber: number; imageBlob: Blob }>,
): Promise<DualPdfOcrResult> {
	const startTime = Date.now();

	try {
		console.log(
			`[デュアルPDF-OCR] 問題${questionPages.length}ページ + 解答${answerPages.length}ページの処理開始`,
		);

		// 1. 問題PDFと解答PDFを並列アップロード
		const questionUploadPromises = questionPages.map(
			async ({ pageNumber, imageBlob }) => {
				const uploadStart = Date.now();
				const { uri, mimeType } = await geminiClient.files.upload({
					file: imageBlob,
					config: { mimeType: imageBlob.type || "image/png" },
				});
				console.log(
					`[デュアルPDF-OCR] 問題ページ${pageNumber}: アップロード完了 (${Date.now() - uploadStart}ms)`,
				);
				return { pageNumber, uri, mimeType, type: "question" as const };
			},
		);

		const answerUploadPromises = answerPages.map(
			async ({ pageNumber, imageBlob }) => {
				const uploadStart = Date.now();
				const { uri, mimeType } = await geminiClient.files.upload({
					file: imageBlob,
					config: { mimeType: imageBlob.type || "image/png" },
				});
				console.log(
					`[デュアルPDF-OCR] 解答ページ${pageNumber}: アップロード完了 (${Date.now() - uploadStart}ms)`,
				);
				return { pageNumber, uri, mimeType, type: "answer" as const };
			},
		);

		const [questionFiles, answerFiles] = await Promise.all([
			Promise.all(questionUploadPromises),
			Promise.all(answerUploadPromises),
		]);

		console.log(
			`[デュアルPDF-OCR] 全ファイルアップロード完了 (${Date.now() - startTime}ms)`,
		);

		// 2. 画像パーツを作成（問題→解答の順序で配置）
		const questionParts = questionFiles
			.filter((file) => file.uri)
			.map(({ uri, mimeType }) =>
				createPartFromUri(uri as string, mimeType || "image/png"),
			);

		const answerParts = answerFiles
			.filter((file) => file.uri)
			.map(({ uri, mimeType }) =>
				createPartFromUri(uri as string, mimeType || "image/png"),
			);

		// 3. 高度なデュアルPDF OCR用プロンプト
		const systemPrompt = `以下の画像セットから学習カード用の問題・解答・解説を抽出してください。

画像構成:
- 最初の${questionParts.length}枚: 問題PDF（問題文が記載）
- 次の${answerParts.length}枚: 解答PDF（解答と解説が記載）

出力形式（JSON）:
[
  {
    "pageNumber": 1,
    "questionText": "問題文（選択肢も含む）",
    "answerText": "正解（簡潔に）",
    "explanationText": "詳細な解説（なぜその答えになるか、重要なポイント、覚えるべき知識）"
  }
]

抽出ルール:
1. **問題文**: 問題番号は除去し、本文と選択肢を含める
2. **解答**: 正解を簡潔に記載（例：「エ」「4」「TCP/IP」）
3. **解説**: 以下を含む詳細な説明を作成：
   - なぜその答えが正しいのか
   - 間違いの選択肢がなぜ違うのか
   - 関連する重要な概念や知識
   - 覚えるべきポイント
   - 類似問題への応用

品質基準:
- 解説は学習者が理解しやすいよう具体的に記載
- 専門用語には簡潔な説明を併記
- 解答根拠を論理的に説明
- 実務での応用例も含める（可能な場合）

注意事項:
- ページ番号は問題PDFの順序に従って設定
- 解答が見つからない問題はanswerTextを空文字列に
- 解説が不十分な場合は問題文から推測して補完
- 数式や図表の内容も可能な限りテキスト化`;

		const contents = createUserContent([
			systemPrompt,
			"【問題PDF】",
			...questionParts,
			"【解答PDF】",
			...answerParts,
		]);

		// 4. Geminiで高品質OCR処理
		const ocrStart = Date.now();
		const response = await geminiClient.models.generateContent({
			model: "gemini-2.5-flash",
			contents,
		});
		console.log(
			`[デュアルPDF-OCR] Gemini処理完了 (${Date.now() - ocrStart}ms)`,
		);

		// 5. レスポンス解析
		const { candidates } = response as {
			candidates?: Array<{ content: unknown }>;
		};
		const raw = candidates?.[0]?.content;

		if (!raw) {
			throw new Error("デュアルPDF OCR処理に失敗しました: 内容が空です");
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

		// 強化されたJSON抽出処理
		let parsed: Array<{
			pageNumber: number;
			questionText: string;
			answerText: string;
			explanationText?: string;
		}> = [];

		try {
			// Step 1: コードフェンス内のJSON抽出
			const fencePattern = /```(?:json)?\s*?\n([\s\S]*?)```/g;
			const fenceMatches = [...jsonString.matchAll(fencePattern)];

			if (fenceMatches.length > 0) {
				// 最も長いJSON候補を選択
				const jsonCandidates = fenceMatches.map((match) => match[1].trim());
				jsonString = jsonCandidates.reduce((longest, current) =>
					current.length > longest.length ? current : longest,
				);
			} else {
				// Step 2: 角括弧内のJSON抽出
				const start = jsonString.indexOf("[");
				const end = jsonString.lastIndexOf("]");
				if (start !== -1 && end !== -1 && end > start) {
					jsonString = jsonString.slice(start, end + 1);
				}
			}

			// Step 3: 制御文字と問題のある文字をクリーンアップ
			jsonString = jsonString
				// biome-ignore lint/suspicious/noControlCharactersInRegex: 制御文字除去のため必要
				.replace(/[\x00-\x1f\x7f]/g, "") // 制御文字除去
				.replace(/\\/g, "\\\\") // バックスラッシュエスケープ
				.replace(/"/g, '"') // スマートクォート正規化
				.replace(/"/g, '"')
				.replace(/'/g, "'")
				.replace(/'/g, "'")
				.trim();

			// Step 4: JSON解析試行
			parsed = JSON.parse(jsonString);
			console.log(`[JSON解析] 成功: ${parsed.length}個のアイテムを解析`);
		} catch (parseError) {
			console.warn("[JSON解析] 第1試行失敗:", parseError);
			console.log(
				"[JSON解析] 問題のあるJSON文字列（最初の500文字）:",
				jsonString.slice(0, 500),
			);

			// Step 5: フォールバック - 正規表現でのデータ抽出
			try {
				const fallbackData = extractDataWithRegex(jsonString);
				if (fallbackData.length > 0) {
					parsed = fallbackData;
					console.log(
						`[正規表現フォールバック] 成功: ${parsed.length}個のアイテムを抽出`,
					);
				} else {
					console.warn(
						"[正規表現フォールバック] データなし、元テキストを確認:",
						jsonString.slice(0, 300),
					);
					throw new Error("正規表現でもデータ抽出に失敗");
				}
			} catch (fallbackError) {
				console.error("[フォールバック] 失敗:", fallbackError);
				console.log(
					"[フォールバック] 元レスポンス確認用:",
					raw ? String(raw).slice(0, 200) : "raw data is null",
				);
				// 空の配列を返して処理継続
				parsed = [];
			}
		}

		// 6. 結果変換
		const extractedText = parsed
			.filter(
				(item) => item.questionText && item.questionText.trim().length > 0,
			)
			.map((item) => ({
				pageNumber: item.pageNumber,
				questionText: item.questionText.trim(),
				answerText: item.answerText?.trim() || "",
				explanationText: item.explanationText?.trim() || "",
			}));

		const processingTimeMs = Date.now() - startTime;
		console.log(
			`[デュアルPDF-OCR] 完了: ${extractedText.length}個の問題・解答セットを生成 (総時間: ${processingTimeMs}ms)`,
		);

		return {
			success: true,
			message: `デュアルPDF処理で${extractedText.length}個の詳細な問題・解答・解説セットを生成しました`,
			extractedText,
			processingTimeMs,
		};
	} catch (error) {
		console.error("[デュアルPDF-OCR] エラー:", error);
		return {
			success: false,
			message: "デュアルPDF OCR処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
			processingTimeMs: Date.now() - startTime,
		};
	}
}

/**
 * 大容量PDFを分割バッチ処理（最適化版）
 *
 * @param questionPages - 問題PDF画像データ
 * @param answerPages - 解答PDF画像データ
 * @param batchSize - バッチサイズ（デフォルト: 5ページずつ）
 * @returns 統合されたデュアルPDF OCR結果（詳細な進捗情報付き）
 */
export async function processLargeDualPdfInBatches(
	questionPages: Array<{ pageNumber: number; imageBlob: Blob }>,
	answerPages: Array<{ pageNumber: number; imageBlob: Blob }>,
	batchSize = 5,
): Promise<
	DualPdfOcrResult & {
		progressDetails?: Array<{
			batchNumber: number;
			extractedCount: number;
			processingTimeMs: number;
		}>;
	}
> {
	const startTime = Date.now();

	try {
		console.log(
			`[分割バッチOCR] 開始: 問題${questionPages.length}ページ + 解答${answerPages.length}ページ (${batchSize}ページずつ処理)`,
		);

		const allExtractedData: Array<{
			pageNumber: number;
			questionText: string;
			answerText: string;
			explanationText?: string;
		}> = [];

		const totalBatches = Math.ceil(questionPages.length / batchSize);
		const progressDetails: Array<{
			batchNumber: number;
			extractedCount: number;
			processingTimeMs: number;
		}> = [];

		// 問題PDFをバッチ単位で分割
		for (let i = 0; i < questionPages.length; i += batchSize) {
			const questionBatch = questionPages.slice(i, i + batchSize);
			const answerBatch = answerPages.slice(i, i + batchSize);
			const currentBatch = Math.floor(i / batchSize) + 1;
			const batchStartTime = Date.now();

			console.log(
				`[分割バッチOCR] バッチ${currentBatch}/${totalBatches}: 問題${questionBatch.length}ページ + 解答${answerBatch.length}ページを処理中`,
			);

			let batchExtractedCount = 0;

			try {
				// 各バッチでデュアルPDF OCR実行
				const batchResult = await processDualPdfBatchOcr(
					questionBatch,
					answerBatch,
				);

				if (batchResult.success && batchResult.extractedText) {
					allExtractedData.push(...batchResult.extractedText);
					batchExtractedCount = batchResult.extractedText.length;
					console.log(
						`[分割バッチOCR] バッチ${currentBatch}完了: ${batchExtractedCount}個抽出`,
					);
				} else {
					console.warn(
						`[分割バッチOCR] バッチ${currentBatch}失敗: ${batchResult.message}`,
					);
				}
			} catch (batchError) {
				console.error(
					`[分割バッチOCR] バッチ${currentBatch}エラー:`,
					batchError,
				);
			}

			// バッチ進捗詳細を記録
			progressDetails.push({
				batchNumber: currentBatch,
				extractedCount: batchExtractedCount,
				processingTimeMs: Date.now() - batchStartTime,
			});

			// バッチ間で短い待機（API負荷軽減）
			await new Promise((resolve) => setTimeout(resolve, 500));
		}

		const processingTimeMs = Date.now() - startTime;

		console.log(
			`[分割バッチOCR] 完了: ${allExtractedData.length}個の問題・解答セットを抽出 (総時間: ${processingTimeMs}ms)`,
		);

		return {
			success: allExtractedData.length > 0,
			message: `分割バッチ処理で${allExtractedData.length}個の高品質問題・解答・解説セットを生成しました`,
			extractedText: allExtractedData,
			processingTimeMs,
			progressDetails,
		};
	} catch (error) {
		console.error("[分割バッチOCR] 全体エラー:", error);
		return {
			success: false,
			message: "分割バッチOCR処理中にエラーが発生しました",
			error: error instanceof Error ? error.message : "不明なエラー",
			processingTimeMs: Date.now() - startTime,
		};
	}
}
