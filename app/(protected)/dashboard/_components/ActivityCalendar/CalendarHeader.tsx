/**
 * Calendar Header Component
 *
 * カレンダーのヘッダー（月選択、ナビゲーション）を表示するコンポーネント
 */

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMonthDisplayName } from "./utils";

interface CalendarHeaderProps {
	year: number;
	month: number;
	onPreviousMonth: () => void;
	onNextMonth: () => void;
	onToday: () => void;
}

export function CalendarHeader({
	year,
	month,
	onPreviousMonth,
	onNextMonth,
	onToday,
}: CalendarHeaderProps) {
	return (
		<div className="flex items-center justify-between mb-4">
			<div className="flex items-center gap-2">
				<Calendar className="h-6 w-6 text-blue-600" />
				<h2 className="text-2xl font-bold text-gray-900">
					{getMonthDisplayName(year, month)}
				</h2>
			</div>

			<div className="flex gap-2">
				<Button
					variant="outline"
					size="sm"
					onClick={onPreviousMonth}
					aria-label="前月"
				>
					<ChevronLeft className="h-4 w-4" />
				</Button>

				<Button variant="outline" size="sm" onClick={onToday}>
					今月
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={onNextMonth}
					aria-label="次月"
				>
					<ChevronRight className="h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
