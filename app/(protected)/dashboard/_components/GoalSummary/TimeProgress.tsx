"use client";

import { Progress } from "@/components/ui/progress";

interface TimeProgressProps {
	createdAt: string;
	deadline: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export default function TimeProgress({
	createdAt,
	deadline,
}: TimeProgressProps) {
	const startDate = new Date(createdAt);
	const endDate = new Date(deadline);
	const now = new Date();

	const totalDays = Math.ceil(
		(endDate.getTime() - startDate.getTime()) / MS_PER_DAY,
	);
	const daysElapsed = Math.floor(
		(now.getTime() - startDate.getTime()) / MS_PER_DAY,
	);
	const remainingDays =
		totalDays - daysElapsed > 0 ? totalDays - daysElapsed : 0;
	const progressValue =
		totalDays > 0
			? Math.min(100, Math.max(0, Math.floor((daysElapsed / totalDays) * 100)))
			: 0;

	const formattedStart = startDate.toISOString().split("T")[0];

	return (
		<div className="mt-4">
			<div className="flex items-center justify-between">
				<span className="text-sm text-gray-500">開始日: {formattedStart}</span>
				<span className="text-sm text-gray-500">残り {remainingDays} 日</span>
			</div>
			<Progress value={progressValue} className="mt-2 w-full h-2" />
		</div>
	);
}
