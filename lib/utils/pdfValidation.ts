/**
 * PDF処理関連のバリデーションユーティリティ
 */

export interface PdfValidationResult {
	valid: boolean;
	error?: string;
	warnings?: string[];
	fileInfo?: {
		name: string;
		size: number;
		type: string;
		sizeFormatted: string;
		estimatedPages?: number;
	};
}

export interface PdfProcessingOptions {
	questionType: "auto" | "multiple_choice" | "descriptive";
	generateMode: "all" | "problems_only" | "key_points";
	chunkSize: number;
}

// 定数
export const PDF_CONSTRAINTS = {
	MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
	MIN_FILE_SIZE: 1024, // 1KB
	MAX_CHUNK_SIZE: 20,
	MIN_CHUNK_SIZE: 1,
	SUPPORTED_MIME_TYPES: [
		"application/pdf",
		"application/x-pdf",
		"application/acrobat",
		"applications/vnd.pdf",
		"text/pdf",
		"text/x-pdf",
	],
	MAX_FILENAME_LENGTH: 255,
	ESTIMATED_PAGES_PER_MB: 20,
} as const;

/**
 * PDFファイルの基本バリデーション
 */
export function validatePdfFile(file: File): PdfValidationResult {
	const warnings: string[] = [];

	// ファイル存在チェック
	if (!file) {
		return {
			valid: false,
			error: "ファイルが選択されていません",
		};
	}

	// ファイル名チェック
	if (!file.name || file.name.trim().length === 0) {
		return {
			valid: false,
			error: "ファイル名が無効です",
		};
	}

	if (file.name.length > PDF_CONSTRAINTS.MAX_FILENAME_LENGTH) {
		return {
			valid: false,
			error: `ファイル名は${PDF_CONSTRAINTS.MAX_FILENAME_LENGTH}文字以下にしてください`,
		};
	}

	// ファイル拡張子チェック
	const fileExtension = file.name.toLowerCase().split(".").pop();
	if (fileExtension !== "pdf") {
		return {
			valid: false,
			error: "PDFファイル（.pdf）のみサポートしています",
		};
	}

	// MIMEタイプチェック
	if (
		!PDF_CONSTRAINTS.SUPPORTED_MIME_TYPES.includes(
			file.type as (typeof PDF_CONSTRAINTS.SUPPORTED_MIME_TYPES)[number],
		)
	) {
		// 警告レベル（一部ブラウザでMIMEタイプが正しく設定されない場合があるため）
		warnings.push(
			"ファイルタイプが正しく検出されませんでした。PDFファイルであることを確認してください。",
		);
	}

	// ファイルサイズチェック
	if (file.size < PDF_CONSTRAINTS.MIN_FILE_SIZE) {
		return {
			valid: false,
			error: "ファイルサイズが小さすぎます",
		};
	}

	if (file.size > PDF_CONSTRAINTS.MAX_FILE_SIZE) {
		return {
			valid: false,
			error: `ファイルサイズは${formatFileSize(PDF_CONSTRAINTS.MAX_FILE_SIZE)}以下にしてください`,
		};
	}

	// 大きなファイルに対する警告
	if (file.size > 20 * 1024 * 1024) {
		// 20MB
		warnings.push(
			"ファイルサイズが大きいため、処理に時間がかかる場合があります。",
		);
	}

	// ファイル情報の構築
	const fileInfo = {
		name: file.name,
		size: file.size,
		type: file.type,
		sizeFormatted: formatFileSize(file.size),
		estimatedPages: Math.ceil(
			(file.size / (1024 * 1024)) * PDF_CONSTRAINTS.ESTIMATED_PAGES_PER_MB,
		),
	};

	return {
		valid: true,
		warnings: warnings.length > 0 ? warnings : undefined,
		fileInfo,
	};
}

/**
 * PDF処理オプションのバリデーション
 */
export function validateProcessingOptions(
	options: PdfProcessingOptions,
): PdfValidationResult {
	if (!options) {
		return {
			valid: false,
			error: "処理オプションが指定されていません",
		};
	}

	// questionType バリデーション
	const validQuestionTypes = [
		"auto",
		"multiple_choice",
		"descriptive",
	] as const;
	if (!validQuestionTypes.includes(options.questionType)) {
		return {
			valid: false,
			error: "無効な問題タイプが指定されています",
		};
	}

	// generateMode バリデーション
	const validGenerateModes = ["all", "problems_only", "key_points"] as const;
	if (!validGenerateModes.includes(options.generateMode)) {
		return {
			valid: false,
			error: "無効な生成モードが指定されています",
		};
	}

	// chunkSize バリデーション
	if (!Number.isInteger(options.chunkSize)) {
		return {
			valid: false,
			error: "チャンクサイズは整数で指定してください",
		};
	}

	if (
		options.chunkSize < PDF_CONSTRAINTS.MIN_CHUNK_SIZE ||
		options.chunkSize > PDF_CONSTRAINTS.MAX_CHUNK_SIZE
	) {
		return {
			valid: false,
			error: `チャンクサイズは${PDF_CONSTRAINTS.MIN_CHUNK_SIZE}-${PDF_CONSTRAINTS.MAX_CHUNK_SIZE}の範囲で指定してください`,
		};
	}

	return { valid: true };
}

/**
 * PDFファイルとオプションの総合バリデーション
 */
export function validatePdfProcessingRequest(
	file: File,
	options: PdfProcessingOptions,
): PdfValidationResult {
	// ファイルバリデーション
	const fileValidation = validatePdfFile(file);
	if (!fileValidation.valid) {
		return fileValidation;
	}

	// オプションバリデーション
	const optionsValidation = validateProcessingOptions(options);
	if (!optionsValidation.valid) {
		return optionsValidation;
	}

	// 組み合わせチェック
	const warnings = [...(fileValidation.warnings || [])];

	// 大きなファイル × 小さなチャンクサイズの警告
	if (fileValidation.fileInfo?.estimatedPages) {
		const estimatedChunks = Math.ceil(
			fileValidation.fileInfo.estimatedPages / options.chunkSize,
		);

		if (estimatedChunks > 20) {
			warnings.push(
				`推定チャンク数が${estimatedChunks}個と多くなります。処理時間が長くなる可能性があります。`,
			);
		}
	}

	return {
		valid: true,
		warnings: warnings.length > 0 ? warnings : undefined,
		fileInfo: fileValidation.fileInfo,
	};
}

/**
 * ファイルサイズを人間が読みやすい形式にフォーマット
 */
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return "0 Bytes";

	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * 処理時間の推定
 */
export function estimateProcessingTime(
	fileSizeBytes: number,
	chunkSize: number,
	detailed = false,
): number | { total: number; breakdown: Record<string, number> } {
	const sizeMB = fileSizeBytes / (1024 * 1024);
	const estimatedPages = sizeMB * PDF_CONSTRAINTS.ESTIMATED_PAGES_PER_MB;
	const estimatedChunks = Math.ceil(estimatedPages / chunkSize);

	// 処理時間の内訳
	const breakdown = {
		upload: Math.min(10, sizeMB * 0.5), // アップロード時間
		preprocessing: Math.max(30, estimatedPages * 1), // 前処理（PDF読み込み・分割）
		llmProcessing: estimatedChunks * 45, // LLM処理（チャンクあたり45秒）
		postprocessing: Math.max(15, estimatedChunks * 2), // 後処理（カード生成・保存）
		buffer: Math.max(30, estimatedChunks * 5), // バッファ時間
	};

	const total = Object.values(breakdown).reduce((sum, time) => sum + time, 0);

	if (detailed) {
		return { total: Math.ceil(total), breakdown };
	}

	return Math.ceil(total);
}

/**
 * 推定リソース使用量計算
 */
export function estimateResourceUsage(
	fileSizeBytes: number,
	chunkSize: number,
) {
	const sizeMB = fileSizeBytes / (1024 * 1024);
	const estimatedPages = sizeMB * PDF_CONSTRAINTS.ESTIMATED_PAGES_PER_MB;
	const estimatedChunks = Math.ceil(estimatedPages / chunkSize);

	return {
		estimatedPages: Math.ceil(estimatedPages),
		estimatedChunks,
		estimatedTokens: estimatedChunks * 3000, // チャンクあたり約3000トークン
		estimatedApiCalls: estimatedChunks,
		estimatedStorageUsed: fileSizeBytes + estimatedChunks * 1024, // PDF + メタデータ
		estimatedMemoryPeak: Math.max(128, sizeMB * 2), // MB単位
	};
}

/**
 * ファイル名のサニタイズ
 */
export function sanitizeFileName(fileName: string): string {
	// 危険な文字を除去・置換
	return fileName
		.replace(/[<>:"/\\|?*]/g, "_") // 危険な文字を_に置換
		.replace(/\s+/g, "_") // スペースを_に置換
		.replace(/_{2,}/g, "_") // 連続する_を1つに
		.replace(/^_+|_+$/g, "") // 先頭・末尾の_を除去
		.substring(0, PDF_CONSTRAINTS.MAX_FILENAME_LENGTH); // 長さ制限
}

/**
 * 処理オプションの推奨値を取得
 */
export function getRecommendedOptions(
	fileSizeBytes: number,
): PdfProcessingOptions {
	const sizeMB = fileSizeBytes / (1024 * 1024);

	// ファイルサイズに応じてチャンクサイズを調整
	let recommendedChunkSize = 5; // デフォルト

	if (sizeMB > 30) {
		recommendedChunkSize = 8; // 大きなファイルは大きなチャンク
	} else if (sizeMB < 5) {
		recommendedChunkSize = 3; // 小さなファイルは小さなチャンク
	}

	return {
		questionType: "auto",
		generateMode: "all",
		chunkSize: recommendedChunkSize,
	};
}

/**
 * 処理優先度の計算
 */
export function calculateProcessingPriority(
	fileSizeBytes: number,
	userTier: "free" | "premium" | "enterprise" = "free",
): number {
	let priority = 5; // デフォルト優先度

	// ユーザータイヤーによる調整
	switch (userTier) {
		case "enterprise":
			priority = Math.max(priority - 2, 1);
			break;
		case "premium":
			priority = Math.max(priority - 1, 1);
			break;
	}

	// ファイルサイズによる調整
	const sizeMB = fileSizeBytes / (1024 * 1024);
	if (sizeMB < 5) {
		priority = Math.max(priority - 1, 1); // 小さなファイルは優先
	} else if (sizeMB > 30) {
		priority = Math.min(priority + 1, 10); // 大きなファイルは後回し
	}

	return priority;
}
