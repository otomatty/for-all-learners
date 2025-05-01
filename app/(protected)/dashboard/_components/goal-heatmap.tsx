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
	);
};

export default GoalHeatmap;
