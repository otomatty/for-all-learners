/**
 * Activity Calendar Server Actions (Placeholder for Tauri Migration)
 *
 * This file is a placeholder to allow imports in tests.
 * The actual implementation should be migrated to client-side hooks.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/dashboard/_components/ActivityCalendar/__tests__/DayDetailPanel.test.tsx
 *
 * Dependencies (External files that this file imports):
 *   └─ hooks/activity_calendar/useDayActivityDetail.ts (actual implementation)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20251109_01_implementation-plan.md (Phase 5.2)
 */

import type { DayActivityDetail } from "@/app/(protected)/dashboard/_components/ActivityCalendar/types";
import logger from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

/**
 * Get day activity detail
 * @deprecated Use hooks/activity_calendar/useDayActivityDetail instead
 */
export async function getDayActivityDetail(
	userId: string,
	date: Date,
): Promise<DayActivityDetail> {
	try {
		const supabase = await createClient();
		const dateStr = date.toISOString().split("T")[0];
		const startDate = new Date(dateStr);
		startDate.setHours(0, 0, 0, 0);
		const endDate = new Date(dateStr);
		endDate.setHours(23, 59, 59, 999);

		// Fetch learning logs for the day
		const { data: learningLogs, error: learningError } = await supabase
			.from("learning_logs")
			.select("*, cards(*)")
			.eq("user_id", userId)
			.gte("answered_at", startDate.toISOString())
			.lte("answered_at", endDate.toISOString())
			.order("answered_at", { ascending: false });

		if (learningError) throw learningError;

		// Fetch pages for the day
		const { data: pages, error: pagesError } = await supabase
			.from("pages")
			.select("*")
			.eq("owner_id", userId)
			.or(
				`created_at.gte.${startDate.toISOString()},updated_at.gte.${startDate.toISOString()}`,
			)
			.order("updated_at", { ascending: false });

		if (pagesError) throw pagesError;

		// Calculate summary
		const totalMinutes = (learningLogs || []).reduce(
			(sum, log) => sum + (log.effort_time || 0) / 60000,
			0,
		);
		const sessionCount = learningLogs?.length || 0;

		let activityLevel: "excellent" | "good" | "partial" | "none" = "none";
		if (totalMinutes >= 60) activityLevel = "excellent";
		else if (totalMinutes >= 30) activityLevel = "good";
		else if (totalMinutes > 0) activityLevel = "partial";

		// Separate created and updated pages
		const createdPages = (pages || []).filter(
			(page) =>
				page.created_at &&
				new Date(page.created_at).toISOString().split("T")[0] === dateStr,
		);
		const updatedPages = (pages || []).filter(
			(page) =>
				page.updated_at &&
				page.created_at &&
				new Date(page.updated_at).toISOString().split("T")[0] === dateStr &&
				new Date(page.created_at).toISOString().split("T")[0] !== dateStr,
		);

		return {
			date: dateStr,
			summary: {
				date: dateStr,
				isToday: dateStr === new Date().toISOString().split("T")[0],
				activityLevel,
				learning: {
					totalCards: 0,
					reviewedCards: sessionCount,
					newCards: 0,
					correctRate: 0,
					totalMinutes,
				},
				notes: {
					pagesCreated: createdPages.length,
					pagesUpdated: updatedPages.length,
					linksCreated: 0,
					totalEditMinutes: totalMinutes,
				},
			},
			learningActivities: (learningLogs || []).map((log) => ({
				deckName: "",
				deckId: "",
				reviewedCards: 1,
				newCards: 0,
				correctRate: 0,
				timeSpentMinutes: (log.effort_time || 0) / 60000,
			})),
			noteActivities: {
				created: createdPages
					.filter(
						(page): page is typeof page & { created_at: string } =>
							page.created_at !== null,
					)
					.map((page) => ({
						title: page.title || "",
						id: page.id,
						createdAt: page.created_at,
					})),
				updated: updatedPages
					.filter(
						(page): page is typeof page & { updated_at: string } =>
							page.updated_at !== null,
					)
					.map((page) => ({
						title: page.title || "",
						id: page.id,
						updatedAt: page.updated_at,
					})),
				linksCreated: 0,
			},
			goalAchievements: [],
		};
	} catch (error) {
		logger.error(
			{
				error: error instanceof Error ? error.message : String(error),
				userId,
				date: date.toISOString(),
			},
			"Failed to get day activity detail",
		);
		throw error;
	}
}
