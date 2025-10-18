"use client";

import {
	CalendarClockIcon,
	CheckCircle2Icon,
	ChevronLeftIcon,
	ChevronRightIcon,
	ConstructionIcon,
	LightbulbIcon,
	PauseCircleIcon,
	RocketIcon,
} from "lucide-react";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ResponsiveDialog } from "@/components/responsive-dialog"; // ResponsiveDialogをインポート
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription, // Badgeの代わりに使うことを想定
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import MilestoneDetail from "./milestone-detail"; // 新しい詳細コンポーネントをインポート

export type MilestoneStatus =
	| "planning"
	| "in-progress"
	| "completed"
	| "launched"
	| "on-hold";

export interface MilestoneEntry {
	id: string;
	timeframe: string;
	title: string;
	description: string;
	status: MilestoneStatus;
	progress?: number; // 0-100
	// 詳細表示用の追加プロパティ (任意)
	features?: string[]; // 主要な機能・変更点リスト
	imageUrl?: string; // ビジュアルコンテンツのURL
	videoUrl?: string; // 動画コンテンツのURL
	relatedLinks?: { label: string; url: string }[]; // 関連リンク
	sort_order: number;
}

interface MilestoneTimelineProps {
	milestones: MilestoneEntry[];
}

export const getStatusAttributes = (status: MilestoneStatus) => {
	// milestone-detail.tsx からインポートするために export
	switch (status) {
		case "planning":
			return {
				label: "計画中",
				icon: LightbulbIcon,
				badgeVariant: "outline" as const,
				textColor: "text-blue-600 dark:text-blue-400",
			};
		case "in-progress":
			return {
				label: "開発中",
				icon: ConstructionIcon,
				badgeVariant: "outline" as const,
				textColor: "text-yellow-600 dark:text-yellow-400",
			};
		case "completed":
			return {
				label: "完了",
				icon: CheckCircle2Icon,
				badgeVariant: "outline" as const,
				textColor: "text-green-600 dark:text-green-400",
			};
		case "launched":
			return {
				label: "ローンチ済",
				icon: RocketIcon,
				badgeVariant: "outline" as const,
				textColor: "text-purple-600 dark:text-purple-400",
			};
		case "on-hold":
			return {
				label: "保留中",
				icon: PauseCircleIcon,
				badgeVariant: "destructive" as const,
				textColor: "text-white",
			};
		default:
			return {
				label: status,
				icon: LightbulbIcon,
				badgeVariant: "outline" as const,
				textColor: "text-foreground",
			};
	}
};

function parseTimeframe(timeframe: string): {
	year: number;
	periodValue: number;
	special?: "upcoming" | "tbd";
} {
	const cleanedTimeframe = timeframe
		.replace(/\s*(予定|開発中|ローンチ済|など)/g, "")
		.trim();

	if (cleanedTimeframe === "時期未定") {
		return { year: 9999, periodValue: 12, special: "tbd" };
	}
	if (cleanedTimeframe === "近日公開") {
		return { year: 9998, periodValue: 12, special: "upcoming" };
	}

	const yearMatch = cleanedTimeframe.match(/(\d{4})年/);
	const year = yearMatch ? Number.parseInt(yearMatch[1], 10) : 9997;

	const quarterMatch = cleanedTimeframe.match(/Q([1-4])/);
	if (quarterMatch) {
		const quarter = Number.parseInt(quarterMatch[1], 10);
		return { year, periodValue: (quarter - 1) * 3 + 1 };
	}

	if (cleanedTimeframe.includes("前半")) return { year, periodValue: 1 };
	if (cleanedTimeframe.includes("後半")) return { year, periodValue: 7 };

	const seasonMap: { [key: string]: number } = { 春: 3, 夏: 6, 秋: 9, 冬: 12 };
	for (const season in seasonMap) {
		if (cleanedTimeframe.includes(season)) {
			return { year, periodValue: seasonMap[season] };
		}
	}

	const monthMatch = cleanedTimeframe.match(/(\d{1,2})月/);
	if (monthMatch) {
		const month = Number.parseInt(monthMatch[1], 10);
		return { year, periodValue: month };
	}

	if (yearMatch) return { year, periodValue: 1 };

	return { year: 9999, periodValue: 12, special: "tbd" };
}

export default function MilestoneTimeline({
	milestones: initialMilestones, // Prop名を変更して区別しやすくする
}: MilestoneTimelineProps) {
	const [selectedMilestone, setSelectedMilestone] =
		useState<MilestoneEntry | null>(null);

	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);

	const handleMilestoneClick = useCallback((milestone: MilestoneEntry) => {
		setSelectedMilestone(milestone);
	}, []);

	const handleCloseDetail = useCallback(() => {
		setSelectedMilestone(null);
	}, []);

	const milestoneRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
	const scrollContainerRef = useRef<HTMLDivElement>(null);

	const chronoSortedMilestones = useMemo(() => {
		return [...initialMilestones].sort((a, b) => {
			const parsedA = parseTimeframe(a.timeframe);
			const parsedB = parseTimeframe(b.timeframe);

			if (parsedA.year !== parsedB.year) return parsedA.year - parsedB.year;
			if (parsedA.periodValue !== parsedB.periodValue)
				return parsedA.periodValue - parsedB.periodValue;

			const statusPriority = (status: MilestoneStatus): number => {
				switch (status) {
					case "in-progress":
						return 1;
					case "planning":
						return 2;
					case "launched":
						return 3;
					case "completed":
						return 4;
					case "on-hold":
						return 5;
					default:
						return 6;
				}
			};
			return statusPriority(a.status) - statusPriority(b.status);
		});
	}, [initialMilestones]);

	const processedMilestoneGroups = useMemo(() => {
		if (!chronoSortedMilestones.length) return [];

		const groups: Map<string, MilestoneEntry[]> = new Map();

		// グループ化
		for (const milestone of chronoSortedMilestones) {
			const parsed = parseTimeframe(milestone.timeframe);
			let yearKey: string;

			if (parsed.special === "tbd") yearKey = "時期未定";
			else if (parsed.special === "upcoming") yearKey = "近日公開";
			else if (parsed.year >= 9997)
				yearKey = "その他"; // 9997はparseTimeframeのデフォルト年
			else yearKey = `${parsed.year}年`;

			let groupList = groups.get(yearKey);
			if (!groupList) {
				groupList = [];
				groups.set(yearKey, groupList);
			}
			groupList.push(milestone);
		}

		// chronoSortedMilestonesのソート順を維持してグループの順序を決定
		const orderedGroupKeys = Array.from(
			new Set(
				chronoSortedMilestones.map((m) => {
					const parsed = parseTimeframe(m.timeframe);
					if (parsed.special === "tbd") return "時期未定";
					if (parsed.special === "upcoming") return "近日公開";
					if (parsed.year >= 9997) return "その他";
					return `${parsed.year}年`;
				}),
			),
		);

		return orderedGroupKeys
			.map((key) => ({
				yearDisplay: key,
				milestones: groups.get(key) || [],
			}))
			.filter((group) => group.milestones.length > 0); // 空のグループを除外
	}, [chronoSortedMilestones]);

	const centralMilestoneId = useMemo(() => {
		const nextUpdateMilestone = chronoSortedMilestones.find(
			(m) => m.status === "in-progress" || m.status === "planning",
		);
		if (nextUpdateMilestone) return nextUpdateMilestone.id;

		const pastMilestones = chronoSortedMilestones.filter(
			(m) => m.status === "launched" || m.status === "completed",
		);
		if (pastMilestones.length > 0)
			return pastMilestones[pastMilestones.length - 1].id;

		return chronoSortedMilestones.length > 0
			? chronoSortedMilestones[0].id
			: null;
	}, [chronoSortedMilestones]);

	useEffect(() => {
		const centralNode = centralMilestoneId
			? milestoneRefs.current.get(centralMilestoneId)
			: null;
		if (centralNode && scrollContainerRef.current) {
			const container = scrollContainerRef.current;
			const nodeRect = centralNode.getBoundingClientRect();
			const containerRect = container.getBoundingClientRect();

			const scrollLeft =
				nodeRect.left -
				containerRect.left -
				containerRect.width / 2 +
				nodeRect.width / 2;

			container.scrollTo({ left: scrollLeft, behavior: "auto" });
		}
	}, [centralMilestoneId]);

	const SCROLL_AMOUNT = 340; // 1回のスクロール量 (カード幅約320px + マージン)

	const checkScrollability = useCallback(() => {
		const container = scrollContainerRef.current;
		if (container) {
			const currentScrollLeft = container.scrollLeft;
			const maxScrollLeft = container.scrollWidth - container.clientWidth;

			setCanScrollLeft(currentScrollLeft > 0);
			// 浮動小数点数の誤差を考慮して、1px程度の許容範囲を持たせる
			setCanScrollRight(currentScrollLeft < maxScrollLeft - 1);
		}
	}, []);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container) {
			checkScrollability(); // 初期チェック
			container.addEventListener("scroll", checkScrollability);

			// ウィンドウリサイズ時にもチェック（コンテナサイズが変わるため）
			window.addEventListener("resize", checkScrollability);

			return () => {
				container.removeEventListener("scroll", checkScrollability);
				window.removeEventListener("resize", checkScrollability);
			};
		}
	}, [checkScrollability]);

	const scrollHorizontally = (amount: number) => {
		scrollContainerRef.current?.scrollBy({
			left: amount,
			behavior: "smooth",
		});
	};

	// processedMilestoneGroupsが空、または1グループでカードが少ない場合はスクロールボタンを表示しない判定も追加可能
	const showScrollButtons = useMemo(() => {
		return (
			processedMilestoneGroups.length > 0 &&
			(scrollContainerRef.current?.scrollWidth ?? 0) >
				(scrollContainerRef.current?.clientWidth ?? 0)
		);
	}, [processedMilestoneGroups]);

	return (
		<>
			<div
				ref={scrollContainerRef}
				className="overflow-x-auto overflow-y-hidden py-6 hidden-scrollbar" // 縦のpaddingを少し調整
			>
				<div className="inline-flex h-full items-start space-x-8 px-4 sm:px-8">
					{/* 年グループを横に並べるコンテナ */}
					{processedMilestoneGroups.map((group) => (
						<div key={group.yearDisplay} className="flex flex-col h-full">
							{/* 各年の縦コンテナ */}
							<div className="sticky top-0 z-10 bg-background pt-3 pb-2 mb-4 shadow-sm">
								{/* スティッキーヘッダー */}
								<h2 className="text-lg font-semibold text-left whitespace-nowrap px-3">
									{group.yearDisplay}
								</h2>
							</div>
							<div className="flex space-x-6 items-stretch">
								{group.milestones.map((milestone) => {
									const {
										label,
										icon: Icon,
										badgeVariant,
										textColor,
									} = getStatusAttributes(milestone.status);
									const isPast =
										milestone.status === "completed" ||
										milestone.status === "launched";

									return (
										<Card
											key={milestone.id}
											ref={(el) => {
												// Cardコンポーネントはdivなので、型は合うはず
												milestoneRefs.current.set(
													milestone.id,
													el as HTMLDivElement | null,
												);
											}}
											className={`flex-shrink-0 w-[320px] md:w-[360px] min-h-[300px] max-h-[480px] p-0 ${isPast ? "opacity-80 hover:opacity-100 transition-opacity" : "hover:shadow-xl transition-shadow"} cursor-pointer`} // Cardコンポーネントのデフォルトpaddingを活かすため、p-6をp-0に変更
											onClick={() => handleMilestoneClick(milestone)}
											onKeyDown={(e) => {
												if (e.key === "Enter" || e.key === " ") {
													e.preventDefault();
													handleMilestoneClick(milestone);
												}
											}}
											aria-label={`${milestone.title}の詳細を見る`}
										>
											<CardHeader className="p-0 mb-3">
												{/* CardHeaderのデフォルトpaddingを削除 */}
												<div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1 px-6 pt-6">
													{/* Cardコンポーネントのデフォルトpy-6があるので、pt-6は不要かも。Cardのpy-6をp-0にするならpt-6は必要 */}
													{/* 今回はCardのp-6をp-0にしたので、pt-6は残す */}
													{/* 元のpaddingを適用 */}
													<CalendarClockIcon className="h-3.5 w-3.5 shrink-0" />
													<span className="truncate">
														{milestone.timeframe}
													</span>
												</div>
												<CardTitle className="text-xl font-semibold px-6">
													{/* 元のpaddingを適用 */}
													{milestone.title}
												</CardTitle>
											</CardHeader>
											<CardContent className="p-0 flex flex-col flex-grow">
												{/* CardContentのデフォルトpaddingを削除し、flex関連クラス追加 */}
												<div className="px-6 mb-3">
													{/* 元のpaddingを適用 */}
													<Badge
														variant={badgeVariant}
														className={`text-xs ${textColor}`}
													>
														<Icon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
														{label}
														{milestone.status === "in-progress" &&
															milestone.progress && (
																<span className="ml-1.5">
																	({milestone.progress}%)
																</span>
															)}
													</Badge>
												</div>
												<CardDescription className="text-sm text-muted-foreground leading-relaxed overflow-y-auto flex-grow px-6 pb-6">
													{/* 元のpaddingを適用 */}
													{milestone.description}
												</CardDescription>
											</CardContent>
										</Card>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</div>

			{showScrollButtons && (
				<div className="flex justify-center items-center space-x-4 mt-4 mb-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => scrollHorizontally(-SCROLL_AMOUNT)}
						disabled={!canScrollLeft}
						aria-label="左にスクロール"
					>
						<ChevronLeftIcon className="h-5 w-5" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => scrollHorizontally(SCROLL_AMOUNT)}
						disabled={!canScrollRight}
						aria-label="右にスクロール"
					>
						<ChevronRightIcon className="h-5 w-5" />
					</Button>
				</div>
			)}

			<ResponsiveDialog
				open={!!selectedMilestone}
				onOpenChange={(isOpen) => {
					if (!isOpen) {
						handleCloseDetail();
					}
				}}
				dialogTitle={selectedMilestone?.title || "マイルストーン詳細"}
				className="max-w-3xl" // デスクトップ時のDialogContentの幅
			>
				{selectedMilestone && (
					<MilestoneDetail
						milestone={selectedMilestone}
						onClose={handleCloseDetail}
					/>
				)}
			</ResponsiveDialog>
		</>
	);
}
