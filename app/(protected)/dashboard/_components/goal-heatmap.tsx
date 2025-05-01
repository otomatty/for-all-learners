"use client";
import type React from "react";
import CalendarHeatmap from "react-calendar-heatmap";
import "react-calendar-heatmap/dist/styles.css";

interface HeatmapValue {
	date: string;
	count: number;
}

interface GoalHeatmapProps {
	startDate: Date;
	endDate: Date;
	values: HeatmapValue[];
}

export const GoalHeatmap: React.FC<GoalHeatmapProps> = ({
	startDate,
	endDate,
	values,
}) => {
	return (
		<>
			{/* デスクトップ(またはTablet)表示 */}
			<div className="hidden sm:block">
				<CalendarHeatmap
					startDate={startDate}
					endDate={endDate}
					values={values}
					classForValue={(value: HeatmapValue | null) => {
						if (!value) return "color-empty";
						if (value.count >= 4) return "color-scale-4";
						if (value.count >= 3) return "color-scale-3";
						if (value.count >= 2) return "color-scale-2";
						return "color-scale-1";
					}}
					showWeekdayLabels
				/>
			</div>
			{/* スマホ表示: TODO */}
			<div className="block sm:hidden p-4 text-center text-gray-500">
				{/* TODO: モバイル用 Heatmap コンポーネントを実装 */}
			</div>
		</>
	);
};

export default GoalHeatmap;
