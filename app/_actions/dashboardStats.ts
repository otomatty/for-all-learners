"use server";

import { createClient } from "@/lib/supabase/server";
import type { Stats } from "@/types/dashboard";

/**
 * Fetch and compute dashboard statistics for a user.
 * Includes page and card counts, diffs from previous day/week,
 * review counts, practice counts, study streak, and action durations.
 */
export async function getDashboardStats(userId: string): Promise<Stats> {
	const supabase = await createClient();

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

	// Total pages
	const { count: totalPages, error: totalPagesError } = await supabase
		.from("pages")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId);
	if (totalPagesError) throw totalPagesError;

	// Pages before today
	const { count: previousTotalPages, error: prevPagesError } = await supabase
		.from("pages")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.lt("created_at", startOfTodayISO);
	if (prevPagesError) throw prevPagesError;

	// Pages before a week ago
	const { count: previousWeekTotalPages, error: prevWeekPagesError } =
		await supabase
			.from("pages")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.lt("created_at", startOfWeekISO);
	if (prevWeekPagesError) throw prevWeekPagesError;

	// Total cards
	const { count: totalCards, error: totalCardsError } = await supabase
		.from("cards")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId);
	if (totalCardsError) throw totalCardsError;

	// Cards before today
	const { count: previousTotalCards, error: prevCardsError } = await supabase
		.from("cards")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId)
		.lt("created_at", startOfTodayISO);
	if (prevCardsError) throw prevCardsError;

	// Cards before a week ago
	const { count: previousWeekTotalCards, error: prevWeekCardsError } =
		await supabase
			.from("cards")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.lt("created_at", startOfWeekISO);
	if (prevWeekCardsError) throw prevWeekCardsError;

	// Problem counts (learning_logs)
	const { count: totalProblems, error: totalProblemsError } = await supabase
		.from("learning_logs")
		.select("id", { count: "exact", head: true })
		.eq("user_id", userId);
	if (totalProblemsError) throw totalProblemsError;

	const { count: previousTotalProblems, error: prevProblemsError } =
		await supabase
			.from("learning_logs")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.lt("answered_at", startOfTodayISO);
	if (prevProblemsError) throw prevProblemsError;

	const { count: previousWeekTotalProblems, error: prevWeekProblemsError } =
		await supabase
			.from("learning_logs")
			.select("id", { count: "exact", head: true })
			.eq("user_id", userId)
			.lt("answered_at", startOfWeekISO);
	if (prevWeekProblemsError) throw prevWeekProblemsError;

	// Action log durations
	const { data: actionLogs, error: actionLogsError } = await supabase
		.from("action_logs")
		.select("action_type, duration")
		.eq("user_id", userId);
	if (actionLogsError) throw actionLogsError;

	let audioTime = 0;
	let ocrTime = 0;
	let learnTime = 0;
	let memoTime = 0;
	for (const log of actionLogs || []) {
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
		totalPages: totalPages || 0,
		previousTotalPages: previousTotalPages || 0,
		previousWeekTotalPages: previousWeekTotalPages || 0,
		totalCards: totalCards || 0,
		previousTotalCards: previousTotalCards || 0,
		previousWeekTotalCards: previousWeekTotalCards || 0,
		totalProblems: totalProblems || 0,
		previousTotalProblems: previousTotalProblems || 0,
		previousWeekTotalProblems: previousWeekTotalProblems || 0,
		totalTime,
		audioTime,
		ocrTime,
		learnTime,
		memoTime,
	};
}
