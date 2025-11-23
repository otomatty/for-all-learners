"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Stats } from "@/types/dashboard";

/**
 * Hook for fetching dashboard statistics for a user
 * Includes page and card counts, diffs from previous day/week,
 * review counts, practice counts, and action durations
 */
export function useDashboardStats(userId: string) {
	const supabase = createClient();

	return useQuery({
		queryKey: ["dashboard_stats", userId],
		queryFn: async (): Promise<Stats> => {
			// Setup date boundaries
			const now = new Date();
			const startOfToday = new Date(
				now.getFullYear(),
				now.getMonth(),
				now.getDate(),
			);
			const startOfTodayISO = startOfToday.toISOString();
			const startOfWeekISO = new Date(
				startOfToday.getFullYear(),
				startOfToday.getMonth(),
				startOfToday.getDate() - 7,
			).toISOString();

			// Execute all queries in parallel for better performance
			const [
				totalPagesResult,
				previousTotalPagesResult,
				previousWeekTotalPagesResult,
				totalCardsResult,
				previousTotalCardsResult,
				previousWeekTotalCardsResult,
				totalProblemsResult,
				previousTotalProblemsResult,
				previousWeekTotalProblemsResult,
				actionLogsResult,
			] = await Promise.all([
				// Total pages
				supabase
					.from("pages")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId),
				// Pages before today
				supabase
					.from("pages")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("created_at", startOfTodayISO),
				// Pages before a week ago
				supabase
					.from("pages")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("created_at", startOfWeekISO),
				// Total cards
				supabase
					.from("cards")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId),
				// Cards before today
				supabase
					.from("cards")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("created_at", startOfTodayISO),
				// Cards before a week ago
				supabase
					.from("cards")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("created_at", startOfWeekISO),
				// Total problems (learning_logs)
				supabase
					.from("learning_logs")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId),
				// Problems before today
				supabase
					.from("learning_logs")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("answered_at", startOfTodayISO),
				// Problems before a week ago
				supabase
					.from("learning_logs")
					.select("id", { count: "exact", head: true })
					.eq("user_id", userId)
					.lt("answered_at", startOfWeekISO),
				// Action log durations
				supabase
					.from("action_logs")
					.select("action_type, duration")
					.eq("user_id", userId),
			]);

			// Check for errors
			if (totalPagesResult.error) throw totalPagesResult.error;
			if (previousTotalPagesResult.error) throw previousTotalPagesResult.error;
			if (previousWeekTotalPagesResult.error)
				throw previousWeekTotalPagesResult.error;
			if (totalCardsResult.error) throw totalCardsResult.error;
			if (previousTotalCardsResult.error) throw previousTotalCardsResult.error;
			if (previousWeekTotalCardsResult.error)
				throw previousWeekTotalCardsResult.error;
			if (totalProblemsResult.error) throw totalProblemsResult.error;
			if (previousTotalProblemsResult.error)
				throw previousTotalProblemsResult.error;
			if (previousWeekTotalProblemsResult.error)
				throw previousWeekTotalProblemsResult.error;
			if (actionLogsResult.error) throw actionLogsResult.error;

			// Calculate action log durations
			let audioTime = 0;
			let ocrTime = 0;
			let learnTime = 0;
			let memoTime = 0;
			for (const log of actionLogsResult.data || []) {
				switch (log.action_type) {
					case "audio":
						audioTime += log.duration;
						break;
					case "ocr":
						ocrTime += log.duration;
						break;
					case "learn":
						learnTime += log.duration;
						break;
					case "memo":
						memoTime += log.duration;
						break;
				}
			}
			const totalTime = audioTime + ocrTime + learnTime + memoTime;

			return {
				totalPages: totalPagesResult.count || 0,
				previousTotalPages: previousTotalPagesResult.count || 0,
				previousWeekTotalPages: previousWeekTotalPagesResult.count || 0,
				totalCards: totalCardsResult.count || 0,
				previousTotalCards: previousTotalCardsResult.count || 0,
				previousWeekTotalCards: previousWeekTotalCardsResult.count || 0,
				totalProblems: totalProblemsResult.count || 0,
				previousTotalProblems: previousTotalProblemsResult.count || 0,
				previousWeekTotalProblems: previousWeekTotalProblemsResult.count || 0,
				totalTime,
				audioTime,
				ocrTime,
				learnTime,
				memoTime,
			};
		},
	});
}
