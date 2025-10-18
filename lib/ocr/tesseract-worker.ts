/**
 * Tesseract.js Worker管理
 * OCR処理のWorker初期化・管理・リソース解放
 */

import { createWorker, OEM, PSM, type Worker } from "tesseract.js";

export interface TesseractWorkerOptions {
	language?: string;
	ocrEngineMode?: OEM;
	pageSegMode?: PSM;
}

export interface OcrProgress {
	status: string;
	progress: number;
	message: string;
}

/**
 * Tesseract Worker管理クラス
 */
export class TesseractWorkerManager {
	private worker: Worker | null = null;
	private isInitialized = false;
	private initializationPromise: Promise<void> | null = null;

	constructor(private options: TesseractWorkerOptions = {}) {
		// デフォルト設定
		this.options = {
			language: "jpn+eng",
			ocrEngineMode: OEM.LSTM_ONLY, // LSTM OCR Engine
			pageSegMode: PSM.AUTO, // Fully automatic page segmentation
			...options,
		};
	}

	/**
	 * Workerを初期化
	 */
	async initialize(
		onProgress?: (progress: OcrProgress) => void,
	): Promise<void> {
		if (this.isInitialized && this.worker) {
			return;
		}

		if (this.initializationPromise) {
			return this.initializationPromise;
		}

		this.initializationPromise = this._doInitialize(onProgress);
		return this.initializationPromise;
	}

	private async _doInitialize(
		onProgress?: (progress: OcrProgress) => void,
	): Promise<void> {
		try {
			console.log("[TesseractWorker] Initializing worker...");

			// Workerを作成
			const language = this.options.language ?? "jpn+eng";
			this.worker = await createWorker(language, undefined, {
				logger: (m) => {
					console.log("[Tesseract]", m);
					if (onProgress) {
						onProgress({
							status: m.status,
							progress: m.progress || 0,
							message: this.getJapaneseStatus(m.status),
						});
					}
				},
			});

			// OCRエンジンの設定（v6では型安全な方法で設定）
			if (this.options.ocrEngineMode !== undefined) {
				await this.worker.setParameters({
					tessedit_ocr_engine_mode: this.options.ocrEngineMode,
				});
			}

			if (this.options.pageSegMode !== undefined) {
				await this.worker.setParameters({
					tessedit_pageseg_mode: this.options.pageSegMode,
				});
			}

			// 日本語の精度向上設定
			if (this.options.language?.includes("jpn")) {
				await this.worker.setParameters({
					preserve_interword_spaces: "1",
					user_defined_dpi: "300",
				});
			}

			this.isInitialized = true;
			console.log("[TesseractWorker] Worker initialized successfully");
		} catch (error) {
			console.error("[TesseractWorker] Initialization failed:", error);
			this.worker = null;
			this.isInitialized = false;
			this.initializationPromise = null;
			throw new Error(
				`Worker initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * OCR処理を実行
	 */
	async recognize(
		image: Blob | string,
		onProgress?: (progress: OcrProgress) => void,
	): Promise<{
		text: string;
		confidence: number;
		blocks: unknown[];
		processingTime: number;
	}> {
		if (!this.isInitialized || !this.worker) {
			throw new Error("Worker is not initialized. Call initialize() first.");
		}

		const startTime = Date.now();

		try {
			console.log("[TesseractWorker] Starting OCR recognition...");

			const result = await this.worker.recognize(image);

			const processingTime = Date.now() - startTime;

			console.log("[TesseractWorker] OCR completed:", {
				confidence: result.data.confidence,
				textLength: result.data.text.length,
				processingTime,
			});

			return {
				text: result.data.text.trim(),
				confidence: result.data.confidence,
				blocks: result.data.blocks || [],
				processingTime,
			};
		} catch (error) {
			console.error("[TesseractWorker] Recognition failed:", error);
			throw new Error(
				`OCR recognition failed: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}

	/**
	 * Workerリソースを解放
	 */
	async terminate(): Promise<void> {
		if (this.worker) {
			try {
				console.log("[TesseractWorker] Terminating worker...");
				await this.worker.terminate();
				this.worker = null;
				this.isInitialized = false;
				this.initializationPromise = null;
				console.log("[TesseractWorker] Worker terminated successfully");
			} catch (error) {
				console.error("[TesseractWorker] Termination failed:", error);
			}
		}
	}

	/**
	 * Worker状態を取得
	 */
	getStatus(): {
		isInitialized: boolean;
		hasWorker: boolean;
	} {
		return {
			isInitialized: this.isInitialized,
			hasWorker: this.worker !== null,
		};
	}

	/**
	 * Tesseractの状態を日本語に変換
	 */
	private getJapaneseStatus(status: string): string {
		const statusMap: Record<string, string> = {
			"initializing api": "APIを初期化中...",
			"initialized api": "API初期化完了",
			"loading language traineddata": "言語データを読み込み中...",
			"loaded language traineddata": "言語データ読み込み完了",
			"initializing tesseract": "Tesseractを初期化中...",
			"initialized tesseract": "Tesseract初期化完了",
			"recognizing text": "テキストを認識中...",
			"recognized text": "テキスト認識完了",
		};

		return statusMap[status] || status;
	}
}

/**
 * シングルトンWorkerインスタンス管理
 */
class WorkerPool {
	private workers: Map<string, TesseractWorkerManager> = new Map();

	getWorker(language = "jpn+eng"): TesseractWorkerManager {
		if (!this.workers.has(language)) {
			this.workers.set(language, new TesseractWorkerManager({ language }));
		}
		const worker = this.workers.get(language);
		if (!worker) {
			throw new Error(`Worker for language ${language} not found`);
		}
		return worker;
	}

	async terminateAll(): Promise<void> {
		const promises = Array.from(this.workers.values()).map((worker) =>
			worker.terminate(),
		);
		await Promise.all(promises);
		this.workers.clear();
	}

	getActiveWorkerCount(): number {
		return this.workers.size;
	}
}

// シングルトンインスタンス
export const workerPool = new WorkerPool();

/**
 * 使いやすいヘルパー関数
 */
export async function createOcrWorker(
	options?: TesseractWorkerOptions,
): Promise<TesseractWorkerManager> {
	const worker = new TesseractWorkerManager(options);
	await worker.initialize();
	return worker;
}

/**
 * ワンショットOCR処理（Worker自動管理）
 */
export async function recognizeText(
	image: Blob | string,
	language = "jpn+eng",
	onProgress?: (progress: OcrProgress) => void,
): Promise<{
	text: string;
	confidence: number;
	processingTime: number;
}> {
	const worker = workerPool.getWorker(language);

	try {
		await worker.initialize(onProgress);
		const result = await worker.recognize(image, onProgress);

		return {
			text: result.text,
			confidence: result.confidence,
			processingTime: result.processingTime,
		};
	} catch (error) {
		console.error("[OCR] Recognition failed:", error);
		throw error;
	}
}
