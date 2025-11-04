/**
 * Activity Calendar Component
 *
 * ダッシュボードに表示するカレンダーUIのメインコンポーネント
 */

"use client";

import { useState } from "react";
import { getMonthlyActivitySummary } from "@/app/_actions/activity_calendar";
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

	const handlePreviousMonth = async () => {
		setLoading(true);
		try {
			const newMonth = currentMonth.month === 1 ? 12 : currentMonth.month - 1;
			const newYear =
				currentMonth.month === 1 ? currentMonth.year - 1 : currentMonth.year;

			const data = await getMonthlyActivitySummary(userId, newYear, newMonth);
			setCurrentMonth({ year: newYear, month: newMonth });
			setMonthData(data);
			setSelectedDate(null);
			setIsDetailOpen(false);
		} finally {
			setLoading(false);
		}
	};

	const handleNextMonth = async () => {
		setLoading(true);
		try {
			const newMonth = currentMonth.month === 12 ? 1 : currentMonth.month + 1;
			const newYear =
				currentMonth.month === 12 ? currentMonth.year + 1 : currentMonth.year;

			const data = await getMonthlyActivitySummary(userId, newYear, newMonth);
			setCurrentMonth({ year: newYear, month: newMonth });
			setMonthData(data);
			setSelectedDate(null);
			setIsDetailOpen(false);
		} finally {
			setLoading(false);
		}
	};

	const handleToday = async () => {
		setLoading(true);
		try {
			const today = new Date();
			const year = today.getFullYear();
			const month = today.getMonth() + 1;

			const data = await getMonthlyActivitySummary(userId, year, month);
			setCurrentMonth({ year, month });
			setMonthData(data);
			setSelectedDate(null);
			setIsDetailOpen(false);
		} finally {
			setLoading(false);
		}
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

				{loading ? (
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
