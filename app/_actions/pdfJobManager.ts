"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

// Service Role クライアント（サーバーサイド専用）
const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

// Regular client（ユーザー認証用）
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

export interface CreatePdfJobParams {
	deckId: string;
	pdfFile: File;
	processingOptions: {
		questionType: "auto" | "multiple_choice" | "descriptive";
		generateMode: "all" | "problems_only" | "key_points";
		chunkSize: number;
	};
}

export interface PdfJobResult {
	success: boolean;
	jobId?: string;
	message: string;
	estimatedDuration?: number;
	redirectUrl?: string;
}

/**
 * PDFからカード生成する非同期ジョブを作成
 */
export async function createPdfProcessingJob(
	params: CreatePdfJobParams,
): Promise<PdfJobResult> {
	try {
		// ユーザー認証確認
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return {
				success: false,
				message: "ログインが必要です",
				redirectUrl: "/auth/login",
			};
		}

		// 入力バリデーション
		const validation = validatePdfJobParams(params);
		if (!validation.valid) {
			return { success: false, message: validation.message };
		}

		// ファイルサイズチェック
		if (params.pdfFile.size > 50 * 1024 * 1024) {
			// 50MB
			return {
				success: false,
				message: "ファイルサイズは50MB以下にしてください",
			};
		}

		// PDFファイル形式チェック
		if (!params.pdfFile.type.includes("pdf")) {
			return { success: false, message: "PDFファイルのみサポートしています" };
		}

		// デッキの所有権確認
		const { data: deck, error: deckError } = await supabase
			.from("decks")
			.select("id, user_id")
			.eq("id", params.deckId)
			.eq("user_id", user.id)
			.single();

		if (deckError || !deck) {
			return {
				success: false,
				message: "デッキが見つからないか、アクセス権限がありません",
			};
		}

		// ユーザーの同時処理制限チェック
		const activeJobsCheck = await checkUserActiveJobs(user.id);
		if (!activeJobsCheck.canProcess) {
			return { success: false, message: activeJobsCheck.message };
		}

		// PDFをSupabase Storageにアップロード
		const uploadResult = await uploadPdfToStorage(params.pdfFile, user.id);
		if (!uploadResult.success) {
			return { success: false, message: uploadResult.message };
		}

		// 処理時間推定
		const estimatedDuration = estimateProcessingTime(
			params.pdfFile.size,
			params.processingOptions.chunkSize,
		);

		// ジョブレコード作成
		const { data: jobData, error: jobError } = await supabaseAdmin
			.from("pdf_processing_jobs")
			.insert({
				user_id: user.id,
				deck_id: params.deckId,
				pdf_file_url: uploadResult.publicUrl,
				original_filename: params.pdfFile.name,
				file_size_bytes: params.pdfFile.size,
				processing_options: params.processingOptions,
				estimated_duration_seconds: estimatedDuration,
				current_step: "queued",
				priority: calculateJobPriority(user.id, params.pdfFile.size),
			})
			.select("id")
			.single();

		if (jobError) {
			// アップロードしたファイルをクリーンアップ
			if (uploadResult.filePath) {
				await cleanupUploadedFile(uploadResult.filePath);
			}
			return { success: false, message: "ジョブの作成に失敗しました" };
		}

		// バックグラウンドワーカーに通知（オプション）
		await notifyWorkerOfNewJob(jobData.id);

		// UIの更新
		revalidatePath("/dashboard");
		revalidatePath(`/decks/${params.deckId}`);
		revalidatePath(`/decks/${params.deckId}/pdf`);

		return {
			success: true,
			jobId: jobData.id,
			message: "PDF処理を開始しました。完了時に通知します。",
			estimatedDuration,
			redirectUrl: `/decks/${params.deckId}?tab=processing`,
		};
	} catch (_error) {
		return {
			success: false,
			message:
				"予期しないエラーが発生しました。しばらく時間をおいてから再試行してください。",
		};
	}
}

/**
 * ジョブキャンセル
 */
export async function cancelPdfJob(jobId: string): Promise<PdfJobResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, message: "ログインが必要です" };
		}

		// ジョブの存在・所有権確認
		const { data: job, error: jobError } = await supabase
			.from("pdf_processing_jobs")
			.select("id, status, user_id")
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (jobError || !job) {
			return { success: false, message: "ジョブが見つかりません" };
		}

		// 処理中のジョブはキャンセル不可
		if (job.status === "processing") {
			return {
				success: false,
				message:
					"処理中のジョブはキャンセルできません。完了までお待ちください。",
			};
		}

		// 既に完了済みの場合
		if (["completed", "failed", "cancelled"].includes(job.status)) {
			return { success: false, message: "このジョブは既に完了しています" };
		}

		// ジョブをキャンセル状態に更新
		const { error: updateError } = await supabaseAdmin
			.from("pdf_processing_jobs")
			.update({
				status: "cancelled",
				completed_at: new Date().toISOString(),
				current_step: "cancelled",
			})
			.eq("id", jobId);

		if (updateError) {
			return { success: false, message: "キャンセル処理に失敗しました" };
		}

		// UIの更新
		revalidatePath("/dashboard");

		return {
			success: true,
			message: "ジョブをキャンセルしました",
		};
	} catch (_error) {
		return { success: false, message: "予期しないエラーが発生しました" };
	}
}

/**
 * ジョブ再試行
 */
export async function retryPdfJob(jobId: string): Promise<PdfJobResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, message: "ログインが必要です" };
		}

		// 元のジョブ情報を取得
		const { data: originalJob, error: jobError } = await supabase
			.from("pdf_processing_jobs")
			.select(`
        pdf_file_url,
        original_filename,
        file_size_bytes,
        processing_options,
        deck_id,
        user_id
      `)
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (jobError || !originalJob) {
			return { success: false, message: "ジョブが見つかりません" };
		}

		// 同時処理制限チェック
		const activeJobsCheck = await checkUserActiveJobs(user.id);
		if (!activeJobsCheck.canProcess) {
			return { success: false, message: activeJobsCheck.message };
		}

		// 新しいジョブを作成
		const estimatedDuration = estimateProcessingTime(
			originalJob.file_size_bytes,
			originalJob.processing_options.chunkSize,
		);

		const { data: newJobData, error: newJobError } = await supabaseAdmin
			.from("pdf_processing_jobs")
			.insert({
				user_id: originalJob.user_id,
				deck_id: originalJob.deck_id,
				pdf_file_url: originalJob.pdf_file_url,
				original_filename: originalJob.original_filename,
				file_size_bytes: originalJob.file_size_bytes,
				processing_options: originalJob.processing_options,
				estimated_duration_seconds: estimatedDuration,
				current_step: "queued",
				priority: calculateJobPriority(user.id, originalJob.file_size_bytes),
			})
			.select("id")
			.single();

		if (newJobError) {
			return { success: false, message: "ジョブの再作成に失敗しました" };
		}

		// ワーカーに通知
		await notifyWorkerOfNewJob(newJobData.id);

		// UIの更新
		revalidatePath("/dashboard");
		revalidatePath(`/decks/${originalJob.deck_id}`);

		return {
			success: true,
			jobId: newJobData.id,
			message: "ジョブを再試行しました",
			estimatedDuration,
		};
	} catch (_error) {
		return { success: false, message: "予期しないエラーが発生しました" };
	}
}

/**
 * ユーザーのジョブ統計取得
 */
export async function getUserPdfJobStats(userId?: string) {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return null;
		}

		const targetUserId = userId || user.id;

		const { data: stats } = await supabase
			.from("pdf_processing_stats")
			.select("*")
			.eq("user_id", targetUserId)
			.single();

		return stats;
	} catch (_error) {
		return null;
	}
}

// ========================================
// ヘルパー関数
// ========================================

function validatePdfJobParams(params: CreatePdfJobParams): {
	valid: boolean;
	message: string;
} {
	if (!params.deckId) {
		return { valid: false, message: "デッキIDが必要です" };
	}

	if (!params.pdfFile) {
		return { valid: false, message: "PDFファイルが必要です" };
	}

	if (!params.processingOptions) {
		return { valid: false, message: "処理オプションが必要です" };
	}

	const { questionType, generateMode, chunkSize } = params.processingOptions;

	if (!["auto", "multiple_choice", "descriptive"].includes(questionType)) {
		return { valid: false, message: "無効な問題タイプです" };
	}

	if (!["all", "problems_only", "key_points"].includes(generateMode)) {
		return { valid: false, message: "無効な生成モードです" };
	}

	if (!chunkSize || chunkSize < 1 || chunkSize > 20) {
		return {
			valid: false,
			message: "チャンクサイズは1-20の範囲で指定してください",
		};
	}

	return { valid: true, message: "OK" };
}

async function checkUserActiveJobs(
	userId: string,
): Promise<{ canProcess: boolean; message: string }> {
	const { data: activeJobs, error } = await supabase
		.from("pdf_processing_jobs")
		.select("id")
		.eq("user_id", userId)
		.in("status", ["pending", "processing"]);

	if (error) {
		return { canProcess: false, message: "システムエラーが発生しました" };
	}

	const maxConcurrentJobs = 3; // ユーザーあたりの最大同時処理数
	if (activeJobs.length >= maxConcurrentJobs) {
		return {
			canProcess: false,
			message: `同時処理できるジョブは${maxConcurrentJobs}個までです。既存ジョブの完了をお待ちください。`,
		};
	}

	return { canProcess: true, message: "OK" };
}

async function uploadPdfToStorage(
	file: File,
	userId: string,
): Promise<{
	success: boolean;
	message: string;
	publicUrl?: string;
	filePath?: string;
}> {
	try {
		const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
		const filePath = `pdf-processing/${userId}/${fileName}`;

		const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
			.from("documents")
			.upload(filePath, file, {
				cacheControl: "3600",
				upsert: false,
			});

		if (uploadError) {
			return {
				success: false,
				message: "ファイルのアップロードに失敗しました",
			};
		}

		// 公開URLを取得
		const { data: urlData } = supabaseAdmin.storage
			.from("documents")
			.getPublicUrl(filePath);

		return {
			success: true,
			message: "アップロード完了",
			publicUrl: urlData.publicUrl,
			filePath,
		};
	} catch (_error) {
		return {
			success: false,
			message: "アップロード処理中にエラーが発生しました",
		};
	}
}

async function cleanupUploadedFile(filePath: string): Promise<void> {
	try {
		await supabaseAdmin.storage.from("documents").remove([filePath]);
	} catch (_error) {}
}

function estimateProcessingTime(
	fileSizeBytes: number,
	chunkSize: number,
): number {
	const avgPagesPerMB = 20; // 平均ページ数
	const avgSecondsPerChunk = 45; // チャンクあたりの処理時間
	const baseProcessingTime = 30; // 基本処理時間

	const estimatedPages = (fileSizeBytes / (1024 * 1024)) * avgPagesPerMB;
	const estimatedChunks = Math.ceil(estimatedPages / chunkSize);

	return Math.max(
		baseProcessingTime + estimatedChunks * avgSecondsPerChunk,
		60, // 最低1分
	);
}

function calculateJobPriority(_userId: string, fileSizeBytes: number): number {
	// 基本優先度は5（中程度）
	let priority = 5;

	// ファイルサイズが小さい場合は優先度を上げる
	if (fileSizeBytes < 5 * 1024 * 1024) {
		// 5MB未満
		priority = Math.max(priority - 1, 1);
	}

	// ファイルサイズが大きい場合は優先度を下げる
	if (fileSizeBytes > 20 * 1024 * 1024) {
		// 20MB以上
		priority = Math.min(priority + 1, 10);
	}

	return priority;
}

async function notifyWorkerOfNewJob(jobId: string): Promise<void> {
	// オプション1: Webhook通知（環境変数で設定）
	if (process.env.PDF_WORKER_WEBHOOK_URL) {
		try {
			await fetch(process.env.PDF_WORKER_WEBHOOK_URL, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					jobId,
					timestamp: Date.now(),
					type: "new_pdf_job",
				}),
			});
		} catch (_error) {}
	}

	// オプション2: データベースによる通知（将来実装）
	// 実際の通知はワーカーのポーリングで処理される
}
