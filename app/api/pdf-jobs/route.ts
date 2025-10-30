import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

// Regular client（ユーザー認証用）
const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

/**
 * GET /api/pdf-jobs - ユーザーのPDFジョブ一覧取得
 */
export async function GET(request: NextRequest) {
	try {
		// ユーザー認証確認
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

		// URLパラメータから条件を取得
		const { searchParams } = new URL(request.url);
		const status = searchParams.get("status");
		const limit = Math.min(
			Number.parseInt(searchParams.get("limit") || "10", 10),
			100,
		); // 最大100件
		const offset = Math.max(
			Number.parseInt(searchParams.get("offset") || "0", 10),
			0,
		);
		const deckId = searchParams.get("deck_id");

		// クエリ構築
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
        file_size_bytes,
        estimated_duration_seconds,
        actual_duration_seconds,
        created_at,
        started_at,
        completed_at,
        error_details,
        result_summary,
        deck_id,
        decks!inner(
          id,
          title,
          description
        )
      `)
			.eq("user_id", user.id)
			.order("created_at", { ascending: false })
			.range(offset, offset + limit - 1);

		// フィルタ適用
		if (status && status !== "all") {
			if (
				["pending", "processing", "completed", "failed", "cancelled"].includes(
					status,
				)
			) {
				query = query.eq("status", status);
			}
		}

		if (deckId) {
			query = query.eq("deck_id", deckId);
		}

		const { data: jobs, error, count } = await query;

		if (error) {
			return NextResponse.json(
				{ error: "Database error", message: "ジョブの取得に失敗しました" },
				{ status: 500 },
			);
		}

		// レスポンス形式を整える
		const formattedJobs = jobs.map((job) => ({
			id: job.id,
			status: job.status,
			progress_percentage: job.progress_percentage,
			current_step: job.current_step,
			total_chunks: job.total_chunks,
			processed_chunks: job.processed_chunks,
			generated_cards: job.generated_cards,
			original_filename: job.original_filename,
			file_size_bytes: job.file_size_bytes,
			estimated_duration_seconds: job.estimated_duration_seconds,
			actual_duration_seconds: job.actual_duration_seconds,
			created_at: job.created_at,
			started_at: job.started_at,
			completed_at: job.completed_at,
			error_details: job.error_details,
			result_summary: job.result_summary,
			deck: Array.isArray(job.decks) ? job.decks[0] : job.decks,
		}));

		return NextResponse.json({
			success: true,
			jobs: formattedJobs,
			pagination: {
				offset,
				limit,
				total: count || jobs.length,
			},
		});
	} catch (_error) {
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
 * DELETE /api/pdf-jobs - バッチでジョブを削除（完了済み・失敗済みのみ）
 */
export async function DELETE(request: NextRequest) {
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

		const { jobIds, olderThanDays } = await request.json();

		let deleteQuery = supabase
			.from("pdf_processing_jobs")
			.delete()
			.eq("user_id", user.id)
			.in("status", ["completed", "failed", "cancelled"]); // アクティブなジョブは削除不可

		if (jobIds && Array.isArray(jobIds)) {
			// 特定のジョブIDを指定して削除
			deleteQuery = deleteQuery.in("id", jobIds);
		} else if (olderThanDays && typeof olderThanDays === "number") {
			// 指定日数より古いジョブを削除
			const cutoffDate = new Date();
			cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
			deleteQuery = deleteQuery.lt("created_at", cutoffDate.toISOString());
		} else {
			return NextResponse.json(
				{
					error: "Bad request",
					message: "jobIds または olderThanDays が必要です",
				},
				{ status: 400 },
			);
		}

		const { error, count } = await deleteQuery;

		if (error) {
			return NextResponse.json(
				{ error: "Database error", message: "ジョブの削除に失敗しました" },
				{ status: 500 },
			);
		}

		return NextResponse.json({
			success: true,
			message: `${count || 0}件のジョブを削除しました`,
			deletedCount: count || 0,
		});
	} catch (_error) {
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "予期しないエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}
