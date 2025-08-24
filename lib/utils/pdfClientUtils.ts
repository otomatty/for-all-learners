/**
 * PDF処理用のクライアントサイドユーティリティ
 */

import {
	type PdfProcessingOptions,
	type PdfValidationResult,
	validatePdfProcessingRequest,
} from "./pdfValidation";

export interface PdfUploadProgress {
	stage: "validation" | "upload" | "job_creation" | "completed" | "error";
	percentage: number;
	message: string;
	error?: string;
}

export interface PdfPreviewInfo {
	fileName: string;
	fileSize: string;
	estimatedPages: number;
	estimatedProcessingTime: string;
	estimatedChunks: number;
	warnings?: string[];
}

/**
 * PDFファイルのクライアントサイド検証とプレビュー情報生成
 */
export function validateAndPreviewPdf(
	file: File,
	options: PdfProcessingOptions,
): { validation: PdfValidationResult; preview?: PdfPreviewInfo } {
	const validation = validatePdfProcessingRequest(file, options);

	if (!validation.valid || !validation.fileInfo) {
		return { validation };
	}

	// プレビュー情報の生成
	const estimatedChunks = Math.ceil(
		(validation.fileInfo.estimatedPages || 0) / options.chunkSize,
	);
	const estimatedSeconds = estimateClientProcessingTime(
		validation.fileInfo.size,
		options.chunkSize,
	);

	const preview: PdfPreviewInfo = {
		fileName: validation.fileInfo.name,
		fileSize: validation.fileInfo.sizeFormatted,
		estimatedPages: validation.fileInfo.estimatedPages || 0,
		estimatedProcessingTime: formatDuration(estimatedSeconds),
		estimatedChunks,
		warnings: validation.warnings,
	};

	return { validation, preview };
}

/**
 * PDF処理進捗の監視
 */
export class PdfProcessingTracker {
	private jobId: string | null = null;
	private pollInterval: NodeJS.Timeout | null = null;
	private onProgressCallbacks: ((progress: PdfUploadProgress) => void)[] = [];

	/**
	 * 進捗コールバックを追加
	 */
	onProgress(callback: (progress: PdfUploadProgress) => void) {
		this.onProgressCallbacks.push(callback);
	}

	/**
	 * 進捗を通知
	 */
	private notifyProgress(progress: PdfUploadProgress) {
		for (const callback of this.onProgressCallbacks) {
			try {
				callback(progress);
			} catch (error) {
				console.error("Progress callback error:", error);
			}
		}
	}

	/**
	 * ジョブ処理開始
	 */
	startTracking(jobId: string) {
		this.jobId = jobId;
		this.startPolling();
	}

	/**
	 * ポーリング開始
	 */
	private startPolling() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
		}

		this.pollInterval = setInterval(async () => {
			if (!this.jobId) return;

			try {
				const response = await fetch(`/api/pdf-jobs/${this.jobId}`);
				if (!response.ok) {
					throw new Error("Failed to fetch job status");
				}

				const { job } = await response.json();

				if (!job) {
					this.notifyProgress({
						stage: "error",
						percentage: 0,
						message: "ジョブが見つかりません",
						error: "Job not found",
					});
					this.stopTracking();
					return;
				}

				// ステータスに応じて進捗を更新
				const progress = this.mapJobStatusToProgress(job);
				this.notifyProgress(progress);

				// 完了またはエラーの場合はポーリング停止
				if (["completed", "failed", "cancelled"].includes(job.status)) {
					this.stopTracking();
				}
			} catch (error) {
				console.error("Polling error:", error);
				this.notifyProgress({
					stage: "error",
					percentage: 0,
					message: "進捗の取得に失敗しました",
					error: error instanceof Error ? error.message : "Unknown error",
				});
			}
		}, 2000); // 2秒間隔でポーリング
	}

	/**
	 * ジョブステータスを進捗情報にマッピング
	 */
	private mapJobStatusToProgress(job: {
		status: string;
		progress_percentage?: number;
		current_step?: string;
		processed_chunks?: number;
		total_chunks?: number;
		generated_cards?: number;
		error_details?: { message?: string };
	}): PdfUploadProgress {
		switch (job.status) {
			case "pending":
				return {
					stage: "upload",
					percentage: 10,
					message: "処理待ち...",
				};

			case "processing":
				return {
					stage: "upload",
					percentage: Math.max(20, job.progress_percentage || 20),
					message: this.getProcessingMessage(
						job.current_step || "processing",
						job.processed_chunks,
						job.total_chunks,
					),
				};

			case "completed":
				return {
					stage: "completed",
					percentage: 100,
					message: `処理完了！${job.generated_cards}枚のカードが生成されました`,
				};

			case "failed":
				return {
					stage: "error",
					percentage: job.progress_percentage || 0,
					message: "処理に失敗しました",
					error: job.error_details?.message || "Unknown error",
				};

			case "cancelled":
				return {
					stage: "error",
					percentage: job.progress_percentage || 0,
					message: "処理がキャンセルされました",
				};

			default:
				return {
					stage: "upload",
					percentage: 0,
					message: "状態不明",
				};
		}
	}

	/**
	 * 処理ステップに応じたメッセージ生成
	 */
	private getProcessingMessage(
		currentStep: string,
		processedChunks?: number,
		totalChunks?: number,
	): string {
		const progressText =
			processedChunks && totalChunks
				? ` (${processedChunks}/${totalChunks})`
				: "";

		switch (currentStep) {
			case "initializing":
				return " 初期化中...";
			case "loading_pdf":
				return "PDFを読み込み中...";
			case "chunking_complete":
				return "PDF分割完了";
			case "processing_chunks":
				return `問題を抽出中${progressText}`;
			case "generating_cards":
				return "カードを生成中...";
			case "saving_cards":
				return "カードを保存中...";
			case "completed":
				return "処理完了";
			default:
				return `処理中${progressText}`;
		}
	}

	/**
	 * 追跡停止
	 */
	stopTracking() {
		if (this.pollInterval) {
			clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
		this.jobId = null;
	}

	/**
	 * クリーンアップ
	 */
	destroy() {
		this.stopTracking();
		this.onProgressCallbacks = [];
	}
}

/**
 * ファイル選択の検証
 */
export function validateFileSelection(files: FileList | null): {
	valid: boolean;
	error?: string;
	file?: File;
} {
	if (!files || files.length === 0) {
		return { valid: false, error: "ファイルが選択されていません" };
	}

	if (files.length > 1) {
		return { valid: false, error: "一度に処理できるファイルは1つだけです" };
	}

	const file = files[0];
	return { valid: true, file };
}

/**
 * ドラッグ&ドロップの処理
 */
export function handlePdfDrop(event: DragEvent): {
	valid: boolean;
	error?: string;
	file?: File;
} {
	event.preventDefault();

	const files = event.dataTransfer?.files;
	if (!files || files.length === 0) {
		return { valid: false, error: "ファイルが見つかりません" };
	}

	return validateFileSelection(files);
}

/**
 * クライアントサイド処理時間推定
 */
function estimateClientProcessingTime(
	fileSizeBytes: number,
	chunkSize: number,
): number {
	const sizeMB = fileSizeBytes / (1024 * 1024);
	const estimatedPages = sizeMB * 20; // 1MBあたり約20ページ
	const estimatedChunks = Math.ceil(estimatedPages / chunkSize);

	// 各段階の推定時間
	const uploadTime = Math.min(10, sizeMB * 0.5);
	const processingTime = estimatedChunks * 45;
	const bufferTime = Math.max(30, estimatedChunks * 5);

	return Math.ceil(uploadTime + processingTime + bufferTime);
}

/**
 * 秒数を人間が読みやすい形式にフォーマット
 */
function formatDuration(seconds: number): string {
	if (seconds < 60) {
		return `約${Math.ceil(seconds)}秒`;
	}

	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;

	if (minutes < 60) {
		if (remainingSeconds < 30) {
			return `約${minutes}分`;
		}
		return `約${minutes + 1}分`;
	}

	const hours = Math.floor(minutes / 60);
	const remainingMinutes = minutes % 60;

	return `約${hours}時間${remainingMinutes}分`;
}

/**
 * PDFファイルのメタデータ抽出（基本情報のみ）
 */
export async function extractPdfBasicInfo(file: File): Promise<{
	pageCount?: number;
	title?: string;
	author?: string;
	creator?: string;
	creationDate?: Date;
	error?: string;
}> {
	try {
		// PDF.jsを使用する場合の実装例
		// 実際の実装では dynamic import で PDF.js を読み込む

		// 簡易版の実装（サイズベースの推定）
		const sizeMB = file.size / (1024 * 1024);
		const estimatedPageCount = Math.ceil(sizeMB * 20);

		return {
			pageCount: estimatedPageCount,
			title: file.name.replace(".pdf", ""),
			// 他のメタデータは実際のPDF.js実装で取得
		};
	} catch (error) {
		console.error("PDF info extraction error:", error);
		return {
			error: "PDFの情報を取得できませんでした",
		};
	}
}

/**
 * 処理オプションの保存/復元
 */
export const PdfOptionsStorage = {
	STORAGE_KEY: "pdf_processing_options",

	save(options: PdfProcessingOptions) {
		try {
			localStorage.setItem(this.STORAGE_KEY, JSON.stringify(options));
		} catch (error) {
			console.warn("Failed to save PDF options:", error);
		}
	},

	load(): PdfProcessingOptions | null {
		try {
			const stored = localStorage.getItem(this.STORAGE_KEY);
			if (stored) {
				return JSON.parse(stored);
			}
		} catch (error) {
			console.warn("Failed to load PDF options:", error);
		}
		return null;
	},

	clear() {
		try {
			localStorage.removeItem(this.STORAGE_KEY);
		} catch (error) {
			console.warn("Failed to clear PDF options:", error);
		}
	},

	getDefault(): PdfProcessingOptions {
		return {
			questionType: "auto",
			generateMode: "all",
			chunkSize: 5,
		};
	},
};

/**
 * PDF処理の結果通知
 */
export function showPdfProcessingNotification(
	title: string,
	message: string,
	type: "success" | "error" | "info" = "info",
) {
	// ブラウザ通知が許可されている場合
	if ("Notification" in window && Notification.permission === "granted") {
		const notification = new Notification(title, {
			body: message,
			icon: "/favicon.ico",
			tag: "pdf-processing",
		});

		// 5秒後に自動で閉じる
		setTimeout(() => {
			notification.close();
		}, 5000);

		return notification;
	}

	return null;
}

/**
 * ブラウザ通知の許可リクエスト
 */
export async function requestNotificationPermission(): Promise<boolean> {
	if (!("Notification" in window)) {
		return false;
	}

	if (Notification.permission === "granted") {
		return true;
	}

	if (Notification.permission === "denied") {
		return false;
	}

	const permission = await Notification.requestPermission();
	return permission === "granted";
}
