"use client";

import { useQuery } from "@tanstack/react-query";
import type { MonthData } from "@/app/(protected)/dashboard/_components/ActivityCalendar/types";
import { createClient } from "@/lib/supabase/client";

/**
 * 指定月の日別活動サマリーを取得
 */
export function useMonthlyActivitySummary(
	userId: string,
	year: number,
	month: number,
) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["activity_calendar", "monthly", userId, year, month],
		queryFn: async (): Promise<MonthData> => {
			// Calculate date range for the month
			const startDate = new Date(year, month - 1, 1);
			const endDate = new Date(year, month, 0, 23, 59, 59);
			const startDateISO = startDate.toISOString();
			const endDateISO = endDate.toISOString();

			// Fetch learning logs for the month
			const { data: learningLogs, error: learningError } = await supabase
				.from("learning_logs")
				.select("*")
				.eq("user_id", userId)
				.gte("answered_at", startDateISO)
				.lte("answered_at", endDateISO);

			if (learningError) throw learningError;

			// Fetch pages created/updated in the month
			const { data: pages, error: pagesError } = await supabase
				.from("pages")
				.select("*")
				.eq("owner_id", userId)
				.or(`created_at.gte.${startDateISO},updated_at.gte.${startDateISO}`);

			if (pagesError) throw pagesError;

			// Group by date and calculate stats
			const daysMap = new Map<string, any>();

			// Process learning logs
			for (const log of learningLogs || []) {
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
				// effort_time is in milliseconds, convert to minutes
				day.learning.totalMinutes += (log.effort_time || 0) / 60000;
				day.learning.sessionCount += 1;
			}

			// Process pages (simplified - you may need to adjust based on actual requirements)
			for (const page of pages || []) {
				if (!page.created_at) continue;
				const createdDate = new Date(page.created_at)
					.toISOString()
					.split("T")[0];
				const _updatedDate = page.updated_at
					? new Date(page.updated_at).toISOString().split("T")[0]
					: null;

				// Count creation
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

			// Convert to array and calculate activity levels
			const todayStr = new Date().toISOString().split("T")[0];
			const days = Array.from(daysMap.values()).map((day) => {
				const totalMinutes =
					day.learning.totalMinutes + day.notes.totalEditMinutes;
				let activityLevel: "excellent" | "good" | "partial" | "none" = "none";
				if (totalMinutes >= 60) activityLevel = "excellent";
				else if (totalMinutes >= 30) activityLevel = "good";
				else if (totalMinutes > 0) activityLevel = "partial";

				return {
					date: day.date,
					isToday: day.date === todayStr,
					activityLevel,
					learning: {
						totalCards: 0,
						reviewedCards: day.learning.sessionCount,
						newCards: 0,
						correctRate: 0,
						totalMinutes: day.learning.totalMinutes,
					},
					notes: {
						pagesCreated: 0,
						pagesUpdated: day.notes.editCount,
						linksCreated: 0,
						totalEditMinutes: day.notes.totalEditMinutes,
					},
				};
			});

			// Calculate streak and active days
			const sortedDays = days.sort((a, b) => a.date.localeCompare(b.date));
			let streakCount = 0;
			const totalActiveDays = days.filter(
				(d) => d.activityLevel !== "none",
			).length;

			// Calculate streak (simplified)
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
		},
	});
}
