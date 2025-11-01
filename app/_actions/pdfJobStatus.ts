"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

export interface PdfJobStatus {
	id: string;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	progress_percentage: number;
	current_step: string;
	total_chunks: number;
	processed_chunks: number;
	generated_cards: number;
	original_filename: string;
	estimated_duration_seconds?: number;
	actual_duration_seconds?: number;
	created_at: string;
	started_at?: string;
	completed_at?: string;
	error_details?: Record<string, unknown>;
	result_summary?: Record<string, unknown>;
	deck?: {
		id: string;
		title: string;
	};
}

export interface PdfJobListResult {
	success: boolean;
	jobs: PdfJobStatus[];
	message?: string;
}

export interface PdfJobDetailResult {
	success: boolean;
	job?: PdfJobStatus;
	message?: string;
}

/**
 * ユーザーのPDFジョブ一覧取得
 */
export async function getUserPdfJobs(
	status?: string,
	limit = 10,
	offset = 0,
): Promise<PdfJobListResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, jobs: [], message: "ログインが必要です" };
		}

		let query = supabase
			.from("pdf_processing_jobs")
			.select(`
        id,
        status,
        progress_percentage,
        current_step,
        total_chunks,
        processed_chunks,
        generated_cards,
        original_filename,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        error_details,
        result_summary,
        decks!inner(
          id,
          title
        )
      `)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		if (status && status !== "all") {
			query = query.eq("status", status);
		}

		const { data: jobs, error } = await query;

		if (error) {
			return {
				success: false,
				jobs: [],
				message: "ジョブの取得に失敗しました",
			};
		}

		const formattedJobs: PdfJobStatus[] = jobs.map((job) => ({
			...job,
			deck: Array.isArray(job.decks) ? job.decks[0] : job.decks,
		}));

		return { success: true, jobs: formattedJobs };
	} catch (_error) {
		return {
			success: false,
			jobs: [],
			message: "予期しないエラーが発生しました",
		};
	}
}

/**
 * 特定のPDFジョブ詳細取得
 */
export async function getPdfJobDetail(
	jobId: string,
): Promise<PdfJobDetailResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, message: "ログインが必要です" };
		}

		const { data: job, error } = await supabase
			.from("pdf_processing_jobs")
			.select(`
        id,
        status,
        progress_percentage,
        current_step,
        total_chunks,
        processed_chunks,
        generated_cards,
        original_filename,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        error_details,
        result_summary,
        pdf_file_url,
        file_size_bytes,
        processing_options,
        worker_id,
        last_heartbeat_at,
        decks!inner(
          id,
          title,
          description
        )
      `)
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (error) {
			return { success: false, message: "ジョブが見つかりません" };
		}

		const formattedJob: PdfJobStatus = {
			...job,
			deck: Array.isArray(job.decks) ? job.decks[0] : job.decks,
		};

		return { success: true, job: formattedJob };
	} catch (_error) {
		return { success: false, message: "予期しないエラーが発生しました" };
	}
}

/**
 * アクティブなPDFジョブの監視データ取得
 */
export async function getActivePdfJobs(): Promise<PdfJobListResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, jobs: [], message: "ログインが必要です" };
		}

		const { data: jobs, error } = await supabase
			.from("pdf_processing_jobs")
			.select(`
        id,
        status,
        progress_percentage,
        current_step,
        total_chunks,
        processed_chunks,
        generated_cards,
        original_filename,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        worker_id,
        last_heartbeat_at,
        decks!inner(
          id,
          title
        )
      `)
			.eq("user_id", user.id)
			.in("status", ["pending", "processing"])
			.order("created_at", { ascending: false });

		if (error) {
			return {
				success: false,
				jobs: [],
				message: "アクティブジョブの取得に失敗しました",
			};
		}

		const formattedJobs: PdfJobStatus[] = jobs.map((job) => ({
			...job,
			deck: Array.isArray(job.decks) ? job.decks[0] : job.decks,
		}));

		return { success: true, jobs: formattedJobs };
	} catch (_error) {
		return {
			success: false,
			jobs: [],
			message: "予期しないエラーが発生しました",
		};
	}
}

/**
 * デッキに関連するPDFジョブ取得
 */
export async function getDeckPdfJobs(
	deckId: string,
): Promise<PdfJobListResult> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, jobs: [], message: "ログインが必要です" };
		}

		// デッキの所有権確認
		const { data: deck, error: deckError } = await supabase
			.from("decks")
			.select("id")
			.eq("id", deckId)
			.eq("user_id", user.id)
			.single();

		if (deckError || !deck) {
			return { success: false, jobs: [], message: "デッキが見つかりません" };
		}

		const { data: jobs, error } = await supabase
			.from("pdf_processing_jobs")
			.select(`
        id,
        status,
        progress_percentage,
        current_step,
        total_chunks,
        processed_chunks,
        generated_cards,
        original_filename,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        error_details,
        result_summary
      `)
			.eq("deck_id", deckId)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false });

		if (error) {
			return {
				success: false,
				jobs: [],
				message: "ジョブの取得に失敗しました",
			};
		}

		return { success: true, jobs: jobs as PdfJobStatus[] };
	} catch (_error) {
		return {
			success: false,
			jobs: [],
			message: "予期しないエラーが発生しました",
		};
	}
}

/**
 * ジョブの進捗を強制更新（リアルタイム同期用）
 */
export async function refreshJobStatus(
	jobId: string,
): Promise<{ success: boolean; message: string }> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, message: "ログインが必要です" };
		}

		// ジョブの所有権確認と最新状態取得
		const { data: job, error } = await supabase
			.from("pdf_processing_jobs")
			.select("id, status, updated_at")
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (error || !job) {
			return { success: false, message: "ジョブが見つかりません" };
		}

		// UIの強制更新
		revalidatePath("/dashboard");
		revalidatePath("/decks");

		return { success: true, message: "ステータスを更新しました" };
	} catch (_error) {
		return { success: false, message: "更新に失敗しました" };
	}
}

/**
 * 完了したジョブからカード一覧取得
 */
export async function getJobGeneratedCards(jobId: string) {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, cards: [], message: "ログインが必要です" };
		}

		// ジョブの所有権と完了状態確認
		const { data: job, error: jobError } = await supabase
			.from("pdf_processing_jobs")
			.select("id, status, deck_id")
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (jobError || !job) {
			return { success: false, cards: [], message: "ジョブが見つかりません" };
		}

		if (job.status !== "completed") {
			return {
				success: false,
				cards: [],
				message: "ジョブがまだ完了していません",
			};
		}

		// ジョブで生成されたカード一覧取得
		const { data: cards, error: cardsError } = await supabase
			.from("cards")
			.select(`
        id,
        front_content,
        back_content,
        source_page,
        pdf_metadata,
        created_at,
        updated_at
      `)
			.eq("pdf_job_id", jobId)
			.eq("user_id", user.id)
			.order("source_page", { ascending: true });

		if (cardsError) {
			return {
				success: false,
				cards: [],
				message: "カードの取得に失敗しました",
			};
		}

		return {
			success: true,
			cards,
			message: `${cards.length}枚のカードが見つかりました`,
		};
	} catch (_error) {
		return {
			success: false,
			cards: [],
			message: "予期しないエラーが発生しました",
		};
	}
}

/**
 * システム全体のPDF処理統計取得（管理者用）
 */
export async function getSystemPdfStats() {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return null;
		}

		// 管理者権限チェック（必要に応じて）
		const { data: adminUser } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.single();

		if (!adminUser) {
			return null; // 管理者以外はアクセス不可
		}

		const { data: stats, error } = await supabaseAdmin
			.from("pdf_processing_system_stats")
			.select("*")
			.single();

		if (error) {
			return null;
		}

		return stats;
	} catch (_error) {
		return null;
	}
}

/**
 * バックグラウンドでの定期ジョブ監視（開発用）
 */
export async function runJobMaintenance(): Promise<{
	success: boolean;
	result?: Record<string, unknown>;
	message: string;
}> {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return { success: false, message: "ログインが必要です" };
		}

		// 管理者権限チェック
		const { data: adminUser } = await supabase
			.from("admin_users")
			.select("id")
			.eq("user_id", user.id)
			.single();

		if (!adminUser) {
			return { success: false, message: "管理者権限が必要です" };
		}

		// メンテナンス実行（データベース関数を呼び出し）
		const { data: result, error } =
			await supabaseAdmin.rpc("maintain_pdf_jobs");

		if (error) {
			return { success: false, message: "メンテナンス処理に失敗しました" };
		}

		return {
			success: true,
			result,
			message: "メンテナンス処理が完了しました",
		};
	} catch (_error) {
		return { success: false, message: "予期しないエラーが発生しました" };
	}
}
