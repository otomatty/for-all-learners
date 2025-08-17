import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

const supabaseAdmin = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
);

/**
 * GET /api/pdf-jobs/[jobId] - 特定のPDFジョブ詳細取得
 */
export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "ログインが必要です" },
				{ status: 401 },
			);
		}

		const { jobId } = await params;

		if (!jobId) {
			return NextResponse.json(
				{ error: "Bad request", message: "ジョブIDが必要です" },
				{ status: 400 },
			);
		}

		const { data: job, error } = await supabase
			.from("pdf_processing_jobs")
			.select(`
        id,
        status,
        priority,
        progress_percentage,
        current_step,
        total_chunks,
        processed_chunks,
        generated_cards,
        original_filename,
        file_size_bytes,
        processing_options,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        updated_at,
        error_details,
        result_summary,
        worker_id,
        last_heartbeat_at,
        pdf_file_url,
        deck_id,
        decks!inner(
          id,
          title,
          description,
          user_id
        )
      `)
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (error) {
			console.error("Get PDF job detail error:", error);
			return NextResponse.json(
				{ error: "Not found", message: "ジョブが見つかりません" },
				{ status: 404 },
			);
		}

		// レスポンス形式を整える
		const formattedJob = {
			id: job.id,
			status: job.status,
			priority: job.priority,
			progress_percentage: job.progress_percentage,
			current_step: job.current_step,
			total_chunks: job.total_chunks,
			processed_chunks: job.processed_chunks,
			generated_cards: job.generated_cards,
			original_filename: job.original_filename,
			file_size_bytes: job.file_size_bytes,
			processing_options: job.processing_options,
			estimated_duration_seconds: job.estimated_duration_seconds,
			actual_duration_seconds: job.actual_duration_seconds,
			created_at: job.created_at,
			started_at: job.started_at,
			completed_at: job.completed_at,
			updated_at: job.updated_at,
			error_details: job.error_details,
			result_summary: job.result_summary,
			worker_info: {
				worker_id: job.worker_id,
				last_heartbeat_at: job.last_heartbeat_at,
			},
			deck: Array.isArray(job.decks) ? job.decks[0] : job.decks,
			// PDF URLは認証されたユーザーのみに提供
			pdf_file_url: job.pdf_file_url,
		};

		return NextResponse.json({
			success: true,
			job: formattedJob,
		});
	} catch (error) {
		console.error("PDF job detail API error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "予期しないエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * PATCH /api/pdf-jobs/[jobId] - ジョブステータス更新（主にキャンセル用）
 */
export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "ログインが必要です" },
				{ status: 401 },
			);
		}

		const { jobId } = await params;
		const { action } = await request.json();

		if (!jobId) {
			return NextResponse.json(
				{ error: "Bad request", message: "ジョブIDが必要です" },
				{ status: 400 },
			);
		}

		// 現在のジョブ状態を確認
		const { data: currentJob, error: fetchError } = await supabase
			.from("pdf_processing_jobs")
			.select("id, status, user_id")
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (fetchError || !currentJob) {
			return NextResponse.json(
				{ error: "Not found", message: "ジョブが見つかりません" },
				{ status: 404 },
			);
		}

		// アクションに応じた処理
		switch (action) {
			case "cancel": {
				if (currentJob.status === "processing") {
					return NextResponse.json(
						{
							error: "Bad request",
							message: "処理中のジョブはキャンセルできません",
						},
						{ status: 400 },
					);
				}

				if (["completed", "failed", "cancelled"].includes(currentJob.status)) {
					return NextResponse.json(
						{ error: "Bad request", message: "このジョブは既に完了しています" },
						{ status: 400 },
					);
				}

				// キャンセル実行
				const { error: cancelError } = await supabaseAdmin
					.from("pdf_processing_jobs")
					.update({
						status: "cancelled",
						completed_at: new Date().toISOString(),
						current_step: "cancelled",
					})
					.eq("id", jobId);

				if (cancelError) {
					console.error("Job cancellation error:", cancelError);
					return NextResponse.json(
						{
							error: "Database error",
							message: "キャンセル処理に失敗しました",
						},
						{ status: 500 },
					);
				}

				return NextResponse.json({
					success: true,
					message: "ジョブをキャンセルしました",
					job: { id: jobId, status: "cancelled" },
				});
			}

			case "retry": {
				if (!["failed", "cancelled"].includes(currentJob.status)) {
					return NextResponse.json(
						{
							error: "Bad request",
							message: "失敗またはキャンセルされたジョブのみ再試行できます",
						},
						{ status: 400 },
					);
				}

				// 元のジョブ情報を取得して新しいジョブを作成
				const { data: originalJob, error: originalError } = await supabase
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
					.single();

				if (originalError || !originalJob) {
					return NextResponse.json(
						{
							error: "Database error",
							message: "元のジョブ情報の取得に失敗しました",
						},
						{ status: 500 },
					);
				}

				// 処理時間推定
				const estimatedDuration = estimateProcessingTime(
					originalJob.file_size_bytes,
					originalJob.processing_options.chunkSize,
				);

				// 新しいジョブ作成
				const { data: newJob, error: newJobError } = await supabaseAdmin
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
						priority: 5, // デフォルト優先度
					})
					.select("id, status")
					.single();

				if (newJobError) {
					console.error("Job retry error:", newJobError);
					return NextResponse.json(
						{
							error: "Database error",
							message: "ジョブの再作成に失敗しました",
						},
						{ status: 500 },
					);
				}

				return NextResponse.json({
					success: true,
					message: "ジョブを再試行しました",
					job: newJob,
				});
			}

			default:
				return NextResponse.json(
					{ error: "Bad request", message: "無効なアクションです" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("PDF job update API error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "予期しないエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

/**
 * DELETE /api/pdf-jobs/[jobId] - 特定のジョブを削除
 */
export async function DELETE(
	request: NextRequest,
	{ params }: { params: Promise<{ jobId: string }> },
) {
	try {
		const {
			data: { user },
			error: authError,
		} = await supabase.auth.getUser();
		if (authError || !user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "ログインが必要です" },
				{ status: 401 },
			);
		}

		const { jobId } = await params;

		if (!jobId) {
			return NextResponse.json(
				{ error: "Bad request", message: "ジョブIDが必要です" },
				{ status: 400 },
			);
		}

		// アクティブなジョブは削除不可
		const { data: job, error: fetchError } = await supabase
			.from("pdf_processing_jobs")
			.select("id, status")
			.eq("id", jobId)
			.eq("user_id", user.id)
			.single();

		if (fetchError || !job) {
			return NextResponse.json(
				{ error: "Not found", message: "ジョブが見つかりません" },
				{ status: 404 },
			);
		}

		if (["pending", "processing"].includes(job.status)) {
			return NextResponse.json(
				{
					error: "Bad request",
					message:
						"アクティブなジョブは削除できません。先にキャンセルしてください。",
				},
				{ status: 400 },
			);
		}

		// ジョブ削除
		const { error: deleteError } = await supabase
			.from("pdf_processing_jobs")
			.delete()
			.eq("id", jobId)
			.eq("user_id", user.id);

		if (deleteError) {
			console.error("Job deletion error:", deleteError);
			return NextResponse.json(
				{ error: "Database error", message: "ジョブの削除に失敗しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: "ジョブを削除しました",
		});
	} catch (error) {
		console.error("Delete PDF job API error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "予期しないエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

// ヘルパー関数
function estimateProcessingTime(
	fileSizeBytes: number,
	chunkSize: number,
): number {
	const avgPagesPerMB = 20;
	const avgSecondsPerChunk = 45;
	const baseProcessingTime = 30;

	const estimatedPages = (fileSizeBytes / (1024 * 1024)) * avgPagesPerMB;
	const estimatedChunks = Math.ceil(estimatedPages / chunkSize);

	return Math.max(
		baseProcessingTime + estimatedChunks * avgSecondsPerChunk,
		60,
	);
}
