/**
 * Activity Calendar Component
 *
 * ダッシュボードに表示するカレンダーUIのメインコンポーネント
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { useMonthlyActivitySummary } from "@/hooks/activity_calendar";
import logger from "@/lib/logger";
import { getDailyExtensionData } from "@/lib/plugins/calendar-registry";
import { CalendarGrid } from "./CalendarGrid";
import { CalendarHeader } from "./CalendarHeader";
import { DayDetailPanel } from "./DayDetailPanel";
import type { DailyActivitySummary, MonthData } from "./types";

interface ActivityCalendarProps {
	initialMonthData: MonthData;
	userId: string;
}

export function ActivityCalendar({
	initialMonthData,
	userId,
}: ActivityCalendarProps) {
	const [currentMonth, setCurrentMonth] = useState({
		year: initialMonthData.year,
		month: initialMonthData.month,
	});
	const [monthData, setMonthData] = useState(initialMonthData);
	const [selectedDate, setSelectedDate] = useState<string | null>(null);
	const [isDetailOpen, setIsDetailOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const isEnrichingPluginsRef = useRef(false);
	const lastEnrichedMonthRef = useRef<{ year: number; month: number } | null>(
		null,
	);

	// Enrich monthData with plugin extension data (client-side only)
	useEffect(() => {
		async function enrichWithPluginData() {
			// Check if we've already enriched this month
			const currentMonthKey = `${monthData.year}-${monthData.month}`;
			const lastEnrichedKey = lastEnrichedMonthRef.current
				? `${lastEnrichedMonthRef.current.year}-${lastEnrichedMonthRef.current.month}`
				: null;

			if (currentMonthKey === lastEnrichedKey) {
				return; // Already enriched this month
			}

			if (isEnrichingPluginsRef.current) return; // Prevent concurrent enrichment
			isEnrichingPluginsRef.current = true;

			try {
				// Get plugin extension data for all days in the month
				const enrichmentPromises = monthData.days.map(async (day) => {
					try {
						const pluginExtensions = await getDailyExtensionData(day.date);
						if (pluginExtensions.length === 0) {
							return day; // No plugin data, return as-is
						}
						return {
							...day,
							pluginExtensions,
						};
					} catch (_error) {
						return day;
					}
				});

				const enrichedDays = await Promise.all(enrichmentPromises);

				// Update month data with enriched days
				setMonthData((prev) => ({
					...prev,
					days: enrichedDays,
				}));

				// Mark this month as enriched
				lastEnrichedMonthRef.current = {
					year: monthData.year,
					month: monthData.month,
				};
			} catch (error) {
				logger.error({ error }, "Failed to enrich month data with plugin data");
			} finally {
				isEnrichingPluginsRef.current = false;
			}
		}
		// Only enrich if we have days to process
		if (monthData.days.length > 0) {
			enrichWithPluginData();
		}
		// monthData.days is derived from year/month, but we need to include it in deps
		// since we use monthData.days.map inside the effect
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [monthData.year, monthData.month, monthData.days]); // Re-enrich when month changes

	const { data: monthDataFromQuery, isLoading: isLoadingMonth } = useMonthlyActivitySummary(
		userId,
		currentMonth.year,
		currentMonth.month,
	);

	useEffect(() => {
		if (monthDataFromQuery) {
			setMonthData(monthDataFromQuery);
		}
	}, [monthDataFromQuery]);

	const handlePreviousMonth = () => {
		lastEnrichedMonthRef.current = null; // Reset enrichment state
		const newMonth = currentMonth.month === 1 ? 12 : currentMonth.month - 1;
		const newYear =
			currentMonth.month === 1 ? currentMonth.year - 1 : currentMonth.year;
		setCurrentMonth({ year: newYear, month: newMonth });
		setSelectedDate(null);
		setIsDetailOpen(false);
	};

	const handleNextMonth = () => {
		lastEnrichedMonthRef.current = null; // Reset enrichment state
		const newMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1;
		const newYear =
			currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year;
		setCurrentMonth({ year: newYear, month: newMonth });
		setSelectedDate(null);
		setIsDetailOpen(false);
	};

	const handleToday = () => {
		lastEnrichedMonthRef.current = null; // Reset enrichment state
		const today = new Date();
		const year = today.getFullYear();
		const month = today.getMonth() + 1;
		setCurrentMonth({ year, month });
		setSelectedDate(null);
		setIsDetailOpen(false);
	};

	const handleDayClick = (day: DailyActivitySummary) => {
		setSelectedDate(day.date);
		setIsDetailOpen(true);
	};

	return (
		<div className="flex gap-4">
			<div className="flex-1">
				<CalendarHeader
					year={currentMonth.year}
					month={currentMonth.month}
					onPreviousMonth={handlePreviousMonth}
					onNextMonth={handleNextMonth}
					onToday={handleToday}
				/>

				{isLoadingMonth ? (
					<div className="border rounded-lg p-12 flex items-center justify-center bg-background">
						<div className="text-center">
							<div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent" />
							<p className="mt-3 text-sm text-muted-foreground">
								読み込み中...
							</p>
						</div>
					</div>
				) : (
					<>
						<CalendarGrid
							monthData={monthData}
							onDayClick={handleDayClick}
							selectedDate={selectedDate}
						/>

						{/* 統計サマリー */}
						<div className="mt-4 grid grid-cols-2 gap-4">
							<div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
								<p className="text-sm text-muted-foreground mb-1">
									アクティブな日数
								</p>
								<p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
									{monthData.totalActiveDays}日
								</p>
							</div>
							<div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
								<p className="text-sm text-muted-foreground mb-1">
									連続学習日数
								</p>
								<p className="text-2xl font-bold text-orange-700 dark:text-orange-300 flex items-center gap-1">
									🔥 {monthData.streakCount}日
								</p>
							</div>
						</div>
					</>
				)}
			</div>

			{isDetailOpen && selectedDate && (
				<DayDetailPanel
					date={selectedDate}
					userId={userId}
					onClose={() => setIsDetailOpen(false)}
				/>
			)}
		</div>
	);
}
