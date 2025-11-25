import { redirect } from "next/navigation";
import { Container } from "@/components/layouts/container";
import { UserIdSetter } from "@/components/user-id-setter";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { ActivityCalendar } from "./_components/ActivityCalendar";
import type { MonthData } from "./_components/ActivityCalendar/types";
import { DashboardPageClient } from "./_components/DashboardPageClient";
import { GoalSummary } from "./_components/GoalSummary";
import { PluginAutoLoader } from "./_components/PluginAutoLoader";
import { PluginWidgetsSection } from "./_components/PluginWidgetsSection";
import { QuickActionTiles } from "./_components/QuickActionTiles";

async function getMonthlyActivitySummary(
	userId: string,
	year: number,
	month: number,
): Promise<MonthData> {
	// 静的エクスポート時はcookies()を使用できないため、空のデータを返す
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return {
			year,
			month,
			days: [],
			totalActiveDays: 0,
			streakCount: 0,
		};
	}

	const supabase = await createClient();
	const startDate = new Date(year, month - 1, 1);
	const endDate = new Date(year, month, 0, 23, 59, 59);
	const startDateISO = startDate.toISOString();
	const endDateISO = endDate.toISOString();

	const [learningLogsResult, pagesResult] = await Promise.all([
		supabase
			.from("learning_logs")
			.select("*")
			.eq("user_id", userId)
			.gte("answered_at", startDateISO)
			.lte("answered_at", endDateISO),
		supabase
			.from("pages")
			.select("*")
			.eq("owner_id", userId)
			.or(`created_at.gte.${startDateISO},updated_at.gte.${startDateISO}`),
	]);

	if (learningLogsResult.error) throw learningLogsResult.error;
	if (pagesResult.error) throw pagesResult.error;

	const learningLogs = learningLogsResult.data || [];
	const pages = pagesResult.data || [];

	const daysMap = new Map<string, any>();

	for (const log of learningLogs) {
		if (!log.answered_at) continue;
		const date = new Date(log.answered_at).toISOString().split("T")[0];
		if (!daysMap.has(date)) {
			daysMap.set(date, {
				date,
				learning: { totalMinutes: 0, sessionCount: 0 },
				notes: { totalEditMinutes: 0, editCount: 0 },
			});
		}
		const day = daysMap.get(date);
		day.learning.totalMinutes += log.effort_time || 0;
		day.learning.sessionCount += 1;
	}

	for (const page of pages) {
		if (!page.created_at) continue;
		const createdDate = new Date(page.created_at).toISOString().split("T")[0];
		if (
			createdDate >= startDateISO.split("T")[0] &&
			createdDate <= endDateISO.split("T")[0]
		) {
			if (!daysMap.has(createdDate)) {
				daysMap.set(createdDate, {
					date: createdDate,
					learning: { totalMinutes: 0, sessionCount: 0 },
					notes: { totalEditMinutes: 0, editCount: 0 },
				});
			}
			const day = daysMap.get(createdDate);
			day.notes.editCount += 1;
		}
	}

	const days = Array.from(daysMap.values()).map((day) => {
		const totalMinutes = day.learning.totalMinutes + day.notes.totalEditMinutes;
		let activityLevel: "excellent" | "good" | "partial" | "none" = "none";
		if (totalMinutes >= 60) activityLevel = "excellent";
		else if (totalMinutes >= 30) activityLevel = "good";
		else if (totalMinutes > 0) activityLevel = "partial";

		return {
			...day,
			activityLevel,
		};
	});

	const sortedDays = days.sort((a, b) => a.date.localeCompare(b.date));
	let streakCount = 0;
	const totalActiveDays = days.filter((d) => d.activityLevel !== "none").length;

	for (let i = sortedDays.length - 1; i >= 0; i--) {
		if (sortedDays[i].activityLevel !== "none") {
			streakCount++;
		} else {
			break;
		}
	}

	return {
		year,
		month,
		days,
		totalActiveDays,
		streakCount,
	};
}

async function getAllDueCountsByUser(
	userId: string,
): Promise<Record<string, number>> {
	// 静的エクスポート時はcookies()を使用できないため、空のデータを返す
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return {};
	}

	const supabase = await createClient();
	const now = new Date().toISOString();
	const { data, error } = await supabase
		.from("cards")
		.select("deck_id")
		.eq("user_id", userId)
		.lte("next_review_at", now);

	if (error) throw error;

	const map: Record<string, number> = {};
	for (const row of data || []) {
		map[row.deck_id] = (map[row.deck_id] ?? 0) + 1;
	}
	return map;
}

export default async function DashboardPage({
	searchParams: searchParamsPromise,
}: {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <DashboardPageClient />;
	}

	let user: { id: string; email?: string } | null = null;
	let _account = null;
	let studyGoals: unknown[] = [];
	let logs: unknown[] = [];
	let decksResult: {
		data: Database["public"]["Tables"]["decks"]["Row"][] | null;
		error: unknown;
	} = {
		data: [],
		error: null,
	};
	let dueMap: Record<string, number> = {};
	let monthData: MonthData = {
		year: new Date().getFullYear(),
		month: new Date().getMonth() + 1,
		days: [],
		totalActiveDays: 0,
		streakCount: 0,
	};

	const supabase = await createClient();
	const {
		data: { user: authUser },
		error: userError,
	} = await supabase.auth.getUser();
	if (userError || !authUser) {
		redirect("/auth/login");
	}
	user = authUser;

	const today = new Date();
	const currentYear = today.getFullYear();
	const currentMonth = today.getMonth() + 1;

	// Fetch account info (ensure account exists)
	const { data: accountData } = await supabase
		.from("accounts")
		.select("*")
		.eq("id", user.id)
		.single();

	if (!accountData) {
		// Create account if it doesn't exist
		await supabase.from("accounts").insert({
			id: user.id,
			email: user.email,
			user_slug: user.id,
		});
	}
	_account = accountData;

	// Fetch all required data in parallel
	const [
		studyGoalsResult,
		logsResult,
		decksResultData,
		dueMapData,
		monthDataResult,
	] = await Promise.all([
		supabase
			.from("study_goals")
			.select("*")
			.eq("user_id", user.id)
			.order("priority_order", { ascending: true })
			.order("created_at", { ascending: false }),
		supabase.from("learning_logs").select("*").eq("user_id", user.id),
		supabase.from("decks").select("*").eq("user_id", user.id),
		getAllDueCountsByUser(user.id),
		getMonthlyActivitySummary(user.id, currentYear, currentMonth),
	]);

	if (studyGoalsResult.error) throw studyGoalsResult.error;
	if (logsResult.error) throw logsResult.error;
	if (decksResultData.error || !decksResultData.data) {
		return (
			<Container>
				<p>デッキの取得に失敗しました。</p>
			</Container>
		);
	}

	studyGoals = studyGoalsResult.data || [];
	logs = logsResult.data || [];
	decksResult = decksResultData;
	dueMap = dueMapData;
	monthData = monthDataResult;

	const searchParams = searchParamsPromise
		? await searchParamsPromise
		: undefined;
	const currentGoalIdFromUrl = searchParams?.goalId as string | undefined;

	// シリアライズしてプロトタイプを剥がす
	const safeStudyGoals = JSON.parse(JSON.stringify(studyGoals));
	const safeLogs = JSON.parse(JSON.stringify(logs));

	// デッキに復習数をマージ
	const decksWithDueCount = (decksResult.data || []).map((d) => ({
		...d,
		todayReviewCount: dueMap[d.id] ?? 0,
	}));

	return (
		<Container>
			{/* Set the current user ID for downstream components */}
			{user && <UserIdSetter userId={user.id} />}
			{/* Auto-load installed plugins on app startup */}
			<PluginAutoLoader />
			<div className="space-y-6">
				{/* 目標サマリー */}
				<GoalSummary
					goals={safeStudyGoals}
					logs={safeLogs}
					currentGoalIdFromUrl={currentGoalIdFromUrl}
					dueMap={dueMap}
				/>

				{/* カレンダーUI */}
				{user && (
					<ActivityCalendar initialMonthData={monthData} userId={user.id} />
				)}

				{/* クイックアクション */}
				<QuickActionTiles decks={decksWithDueCount} />

				{/* プラグインWidget */}
				<PluginWidgetsSection />
			</div>
		</Container>
	);
}
