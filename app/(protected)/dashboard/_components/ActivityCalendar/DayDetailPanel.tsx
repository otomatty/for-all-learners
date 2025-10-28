/**
 * Day Detail Panel Component
 *
 * 選択した日付の詳細な活動内容を表示するパネルコンポーネント
 */

"use client";

import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getDayActivityDetail } from "@/app/_actions/activity_calendar";
import { Button } from "@/components/ui/button";
import { ACTIVITY_COLORS } from "./constants";
import { GoalAchievementSection } from "./GoalAchievementSection";
import { LearningActivitySection } from "./LearningActivitySection";
import { NoteActivitySection } from "./NoteActivitySection";
import type { DayActivityDetail } from "./types";

interface DayDetailPanelProps {
	date: string;
	userId: string;
	onClose: () => void;
}

export function DayDetailPanel({ date, userId, onClose }: DayDetailPanelProps) {
	const [detail, setDetail] = useState<DayActivityDetail | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		async function fetchDetail() {
			setLoading(true);
			try {
				const data = await getDayActivityDetail(userId, new Date(date));
				setDetail(data);
			} finally {
				setLoading(false);
			}
		}
		fetchDetail();
	}, [date, userId]);

	useEffect(() => {
		// ESCキーで閉じる
		function handleKeyDown(e: KeyboardEvent) {
			if (e.key === "Escape") {
				onClose();
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	if (loading) {
		return (
			<div className="w-96 border-l bg-white p-6 flex items-center justify-center">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="h-8 w-8 animate-spin text-blue-600" />
					<p className="text-sm text-gray-600">読み込み中...</p>
				</div>
			</div>
		);
	}

	if (!detail) {
		return (
			<div className="w-96 border-l bg-white p-6">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-bold">詳細情報</h3>
					<Button variant="ghost" size="sm" onClick={onClose}>
						<X className="h-4 w-4" />
					</Button>
				</div>
				<p className="text-gray-600">データを取得できませんでした。</p>
			</div>
		);
	}

	const totalMinutes =
		detail.summary.learning.totalMinutes +
		detail.summary.notes.totalEditMinutes;
	const activityColor = ACTIVITY_COLORS[detail.summary.activityLevel];

	return (
		<div className="w-96 border-l bg-white overflow-y-auto animate-slide-in-right">
			{/* ヘッダー */}
			<div className="sticky top-0 bg-white border-b p-4 z-10">
				<div className="flex items-center justify-between mb-2">
					<h3 className="text-lg font-bold flex items-center gap-2">
						📅{" "}
						{new Date(date).toLocaleDateString("ja-JP", {
							month: "long",
							day: "numeric",
							weekday: "short",
						})}
					</h3>
					<Button
						variant="ghost"
						size="sm"
						onClick={onClose}
						aria-label="閉じる"
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				{/* 総合サマリー */}
				<div className="grid grid-cols-2 gap-2">
					<div className={`p-3 rounded-lg ${activityColor.bg}`}>
						<p className="text-xs text-gray-600 mb-1">活動レベル</p>
						<p className="text-sm font-bold flex items-center gap-1">
							<span>{activityColor.icon}</span>
							<span className={activityColor.text}>
								{detail.summary.activityLevel === "excellent" && "優秀"}
								{detail.summary.activityLevel === "good" && "良好"}
								{detail.summary.activityLevel === "partial" && "わずか"}
								{detail.summary.activityLevel === "none" && "活動なし"}
							</span>
						</p>
					</div>

					<div className="p-3 bg-blue-50 rounded-lg">
						<p className="text-xs text-gray-600 mb-1">総活動時間</p>
						<p className="text-xl font-bold text-blue-700">
							{totalMinutes}
							<span className="text-sm">分</span>
						</p>
					</div>
				</div>
			</div>

			{/* コンテンツ */}
			<div className="p-4 space-y-6">
				{/* 学習活動 */}
				<LearningActivitySection activities={detail.learningActivities} />

				{/* ノート活動 */}
				<NoteActivitySection activities={detail.noteActivities} />

				{/* 目標達成 */}
				<GoalAchievementSection achievements={detail.goalAchievements} />
			</div>
		</div>
	);
}
