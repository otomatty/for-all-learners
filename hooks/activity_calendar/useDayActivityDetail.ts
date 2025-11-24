"use client";

import { useQuery } from "@tanstack/react-query";
import type { DayActivityDetail } from "@/app/(protected)/dashboard/_components/ActivityCalendar/types";
import { createClient } from "@/lib/supabase/client";

/**
 * 特定日の詳細な活動データを取得
 */
export function useDayActivityDetail(userId: string, date: Date) {
	const supabase = createClient();

	return useQuery({
		queryKey: [
			"activity_calendar",
			"day",
			userId,
			date.toISOString().split("T")[0],
		],
		queryFn: async (): Promise<DayActivityDetail> => {
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
				(sum, log) => sum + (log.duration || 0),
				0,
			);
			const sessionCount = learningLogs?.length || 0;
			const editCount = pages?.length || 0;

			let activityLevel: "excellent" | "good" | "partial" | "none" = "none";
			if (totalMinutes >= 60) activityLevel = "excellent";
			else if (totalMinutes >= 30) activityLevel = "good";
			else if (totalMinutes > 0) activityLevel = "partial";

			// Separate created and updated pages
			const createdPages = (pages || []).filter(
				(page) =>
					new Date(page.created_at).toISOString().split("T")[0] === dateStr,
			);
			const updatedPages = (pages || []).filter(
				(page) =>
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
					timeSpentMinutes: log.duration || 0,
				})),
				noteActivities: {
					created: createdPages.map((page) => ({
						title: page.title || "",
						id: page.id,
						createdAt: page.created_at,
					})),
					updated: updatedPages.map((page) => ({
						title: page.title || "",
						id: page.id,
						updatedAt: page.updated_at,
					})),
					linksCreated: 0,
				},
				goalAchievements: [],
			};
		},
	});
}
