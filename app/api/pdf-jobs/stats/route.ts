import { createClient } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

const supabase = createClient(
	process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
);

/**
 * GET /api/pdf-jobs/stats - ユーザーのPDF処理統計取得
 */
export async function GET(request: NextRequest) {
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

		const { searchParams } = new URL(request.url);
		const period = searchParams.get("period") || "30"; // デフォルト30日
		const periodDays = Math.min(Math.max(Number.parseInt(period), 1), 365); // 1-365日の範囲

		// 期間の開始日を計算
		const startDate = new Date();
		startDate.setDate(startDate.getDate() - periodDays);

		// 基本統計を取得
		const { data: basicStats, error: basicError } = await supabase
			.from("pdf_processing_jobs")
			.select(
				"status, created_at, actual_duration_seconds, generated_cards, file_size_bytes",
			)
			.eq("user_id", user.id)
			.gte("created_at", startDate.toISOString());

		if (basicError) {
			console.error("Get basic stats error:", basicError);
			return NextResponse.json(
				{ error: "Database error", message: "統計の取得に失敗しました" },
				{ status: 500 },
			);
		}

		// 全期間の統計も取得
		const { data: allTimeStats, error: allTimeError } = await supabase
			.from("pdf_processing_jobs")
			.select(
				"status, actual_duration_seconds, generated_cards, file_size_bytes",
			)
			.eq("user_id", user.id);

		if (allTimeError) {
			console.error("Get all time stats error:", allTimeError);
			return NextResponse.json(
				{ error: "Database error", message: "全期間統計の取得に失敗しました" },
				{ status: 500 },
			);
		}

		// 統計計算
		const periodStats = calculateStats(basicStats);
		const allTimeStatsCalculated = calculateStats(allTimeStats);

		// 日別統計も計算
		const dailyStats = calculateDailyStats(basicStats, periodDays);

		// 処理時間の分布統計
		const processingTimeStats = calculateProcessingTimeStats(basicStats);

		return NextResponse.json({
			success: true,
			period: {
				days: periodDays,
				start_date: startDate.toISOString(),
				end_date: new Date().toISOString(),
			},
			stats: {
				period: {
					...periodStats,
					daily_breakdown: dailyStats,
				},
				all_time: allTimeStatsCalculated,
				processing_time: processingTimeStats,
			},
		});
	} catch (error) {
		console.error("PDF jobs stats API error:", error);
		return NextResponse.json(
			{
				error: "Internal server error",
				message: "予期しないエラーが発生しました",
			},
			{ status: 500 },
		);
	}
}

// 統計計算関数
function calculateStats(
	jobs: Array<{
		status: string;
		created_at?: string;
		actual_duration_seconds?: number;
		generated_cards?: number;
		file_size_bytes?: number;
	}>,
) {
	const total = jobs.length;
	const completed = jobs.filter((job) => job.status === "completed").length;
	const failed = jobs.filter((job) => job.status === "failed").length;
	const cancelled = jobs.filter((job) => job.status === "cancelled").length;
	const processing = jobs.filter((job) => job.status === "processing").length;
	const pending = jobs.filter((job) => job.status === "pending").length;

	const totalCards = jobs
		.filter((job) => job.status === "completed")
		.reduce((sum, job) => sum + (job.generated_cards || 0), 0);

	const completedJobs = jobs.filter(
		(job): job is typeof job & { actual_duration_seconds: number } =>
			job.status === "completed" &&
			typeof job.actual_duration_seconds === "number",
	);
	const avgDuration =
		completedJobs.length > 0
			? completedJobs.reduce(
					(sum, job) => sum + job.actual_duration_seconds,
					0,
				) / completedJobs.length
			: 0;

	const totalFileSize = jobs.reduce(
		(sum, job) => sum + (job.file_size_bytes || 0),
		0,
	);
	const avgFileSize = total > 0 ? totalFileSize / total : 0;

	const successRate = total > 0 ? (completed / total) * 100 : 0;

	return {
		total_jobs: total,
		completed_jobs: completed,
		failed_jobs: failed,
		cancelled_jobs: cancelled,
		processing_jobs: processing,
		pending_jobs: pending,
		total_cards_generated: totalCards,
		avg_duration_seconds: Math.round(avgDuration),
		avg_file_size_bytes: Math.round(avgFileSize),
		success_rate_percentage: Math.round(successRate * 100) / 100,
		cards_per_job:
			completed > 0 ? Math.round((totalCards / completed) * 100) / 100 : 0,
	};
}

// 日別統計計算
function calculateDailyStats(
	jobs: Array<{
		status: string;
		created_at: string;
		actual_duration_seconds?: number;
		generated_cards?: number;
	}>,
	periodDays: number,
) {
	const dailyMap = new Map<
		string,
		{
			date: string;
			jobs_created: number;
			jobs_completed: number;
			cards_generated: number;
			total_processing_time: number;
		}
	>();

	// 期間内の全日付を初期化
	for (let i = 0; i < periodDays; i++) {
		const date = new Date();
		date.setDate(date.getDate() - i);
		const dateStr = date.toISOString().split("T")[0];

		dailyMap.set(dateStr, {
			date: dateStr,
			jobs_created: 0,
			jobs_completed: 0,
			cards_generated: 0,
			total_processing_time: 0,
		});
	}

	// ジョブデータを日別に集計
	for (const job of jobs) {
		const createdDate = new Date(job.created_at).toISOString().split("T")[0];
		const dayStats = dailyMap.get(createdDate);

		if (dayStats) {
			dayStats.jobs_created++;

			if (job.status === "completed") {
				dayStats.jobs_completed++;
				dayStats.cards_generated += job.generated_cards || 0;
				dayStats.total_processing_time += job.actual_duration_seconds || 0;
			}
		}
	}

	return Array.from(dailyMap.values()).sort((a, b) =>
		a.date.localeCompare(b.date),
	);
}

// 処理時間統計計算
function calculateProcessingTimeStats(
	jobs: Array<{
		status: string;
		actual_duration_seconds?: number;
	}>,
) {
	const completedJobs = jobs.filter(
		(job): job is typeof job & { actual_duration_seconds: number } =>
			job.status === "completed" &&
			typeof job.actual_duration_seconds === "number",
	);

	if (completedJobs.length === 0) {
		return {
			min_duration: 0,
			max_duration: 0,
			median_duration: 0,
			avg_duration: 0,
			percentiles: {
				p25: 0,
				p50: 0,
				p75: 0,
				p90: 0,
				p95: 0,
			},
		};
	}

	const durations = completedJobs
		.map((job) => job.actual_duration_seconds)
		.sort((a, b) => a - b);

	const min = durations[0];
	const max = durations[durations.length - 1];
	const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;

	const getPercentile = (arr: number[], percentile: number) => {
		const index = Math.ceil((percentile / 100) * arr.length) - 1;
		return arr[Math.max(0, index)];
	};

	return {
		min_duration: min,
		max_duration: max,
		median_duration: getPercentile(durations, 50),
		avg_duration: Math.round(avg),
		percentiles: {
			p25: getPercentile(durations, 25),
			p50: getPercentile(durations, 50),
			p75: getPercentile(durations, 75),
			p90: getPercentile(durations, 90),
			p95: getPercentile(durations, 95),
		},
	};
}
