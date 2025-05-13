"use client";

import React, { useEffect, useState } from "react";
import {
	Tag,
	Calendar,
	GitCommit,
	FileDiff,
	Code2,
	Plus,
	Minus,
	SparklesIcon,
	TrendingUpIcon,
	BugIcon,
	ShieldCheckIcon,
	GripVertical,
	Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	createVersionCommitStaging,
	processVersionCommitStaging,
	getVersionCommitStagingByVersion,
} from "@/app/_actions/version";
import { createChangelogEntry } from "@/app/_actions/changelog";
import {
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	closestCenter,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	verticalListSortingStrategy,
	useSortable,
	arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/**
 * コミット履歴の型定義
 */
type CommitLog = {
	hash: string;
	author: string;
	relDate: string;
	message: string;
};

/**
 * バージョンごとにまとめたコミットグループの型定義
 */
type VersionGroup = {
	version: string;
	publishedAt: string; // ISO形式の日付
	diffStat: string; // コード差分統計
	commits: CommitLog[];
};

// 型定義: AI からのリリースノートJSON構造
type ReleaseNoteItem = {
	type: "new" | "improvement" | "fix" | "security";
	description: string;
	display_order: number;
};
type ReleaseNotesJSON = {
	version: string;
	title: string;
	published_at: string;
	items: ReleaseNoteItem[];
};

// Helper to map release note types to labels, icons, and badge variants
const getTypeAttributes = (type: ReleaseNoteItem["type"]) => {
	switch (type) {
		case "new":
			return {
				label: "新機能",
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
		case "improvement":
			return {
				label: "改善",
				icon: TrendingUpIcon,
				badgeVariant: "secondary" as const,
			};
		case "fix":
			return {
				label: "修正",
				icon: BugIcon,
				badgeVariant: "destructive" as const,
			};
		case "security":
			return {
				label: "セキュリティ",
				icon: ShieldCheckIcon,
				badgeVariant: "outline" as const,
			};
		default:
			return {
				label: type,
				icon: SparklesIcon,
				badgeVariant: "default" as const,
			};
	}
};

// Component for each sortable release note item, extracting useSortable into its own component
function SortableReleaseNoteItem({
	item,
	onRemove,
}: {
	item: ReleaseNoteItem;
	onRemove: (id: number) => void;
}) {
	const { attributes, listeners, setNodeRef, transform, transition } =
		useSortable({ id: item.display_order });
	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
	};
	const {
		label,
		icon: IconComponent,
		badgeVariant,
	} = getTypeAttributes(item.type);
	return (
		<div
			ref={setNodeRef}
			style={style}
			className="p-4 mb-2 rounded-md border bg-card text-card-foreground shadow-sm flex items-center justify-between space-x-2"
		>
			<div className="flex items-center gap-2">
				<GripVertical
					{...listeners}
					{...attributes}
					className="cursor-grab text-gray-500"
				/>
				<div>
					<Badge variant={badgeVariant} className="mb-1.5 text-xs">
						<IconComponent className="h-3.5 w-3.5 mr-1.5" />
						{label}
					</Badge>
					<p className="flex-1 text-sm text-muted-foreground leading-relaxed">
						{item.description}
					</p>
				</div>
			</div>
			<Button
				variant="ghost"
				size="icon"
				onClick={() => onRemove(item.display_order)}
			>
				<Trash2 className="h-4 w-4 text-destructive" />
			</Button>
		</div>
	);
}

/**
 * コミット履歴セクションコンポーネント
 * バージョンごとにカードを横並び表示し、選択時に詳細を表示
 */
export function CommitHistorySection() {
	const [groups, setGroups] = useState<VersionGroup[]>([]);
	const [selectedVersion, setSelectedVersion] = useState<string>("");
	const [loadingSummary, setLoadingSummary] = useState(false);
	const [stagingStatus, setStagingStatus] = useState<string>("idle");
	const [stagingId, setStagingId] = useState<number | undefined>(undefined);
	const [summaryText, setSummaryText] = useState<string>("");
	const [previewItems, setPreviewItems] = useState<ReleaseNoteItem[]>([]);
	const [summaryTitle, setSummaryTitle] = useState<string>("");
	const [loadingConfirm, setLoadingConfirm] = useState(false);
	const sensors = useSensors(useSensor(PointerSensor));

	// データ取得
	useEffect(() => {
		fetch("/api/commit-history")
			.then((res) => res.json())
			.then((data: VersionGroup[]) => setGroups(data))
			.catch((e) => console.error("Failed to fetch commit history", e));
	}, []);

	// 初期選択を設定
	useEffect(() => {
		if (groups.length > 0) {
			setSelectedVersion(groups[0].version);
		}
	}, [groups]);

	useEffect(() => {
		if (selectedVersion) {
			(async () => {
				try {
					const record =
						await getVersionCommitStagingByVersion(selectedVersion);
					if (record) {
						setStagingStatus(record.status);
						setStagingId(record.id);
					} else {
						setStagingStatus("idle");
						setStagingId(undefined);
					}
				} catch (e) {
					console.error("ステージング取得エラー", e);
				}
			})();
		}
	}, [selectedVersion]);

	// Parse summaryText into previewItems when summaryText changes
	useEffect(() => {
		if (!summaryText) {
			setPreviewItems([]);
			return;
		}
		const raw = summaryText.replace(/```/g, "").trim();
		const bodyMatch = raw.match(/json\s*\n([\s\S]*)/);
		const body = bodyMatch ? bodyMatch[1].trim() : raw;
		let parsed: unknown;
		try {
			parsed = JSON.parse(body);
		} catch {
			setPreviewItems([]);
			return;
		}
		const data = parsed as ReleaseNotesJSON & { parts?: { text: string }[] };
		let items: ReleaseNoteItem[] = [];
		let title = (Array.isArray(data.items) ? data.title : undefined) || "";
		if (Array.isArray(data.items)) {
			items = data.items;
		} else if (Array.isArray(data.parts)) {
			const text = data.parts[0].text || "";
			const innerMatch = text.match(/(\{[\s\S]*\})/);
			const inner = innerMatch ? innerMatch[1] : text;
			try {
				const release = JSON.parse(inner) as ReleaseNotesJSON;
				items = release.items;
				title = release.title;
			} catch {
				items = [];
			}
		}
		setSummaryTitle(title);
		setPreviewItems(items);
	}, [summaryText]);

	// Handle drag end to reorder items
	const handleDragEnd = ({ active, over }: DragEndEvent) => {
		if (active.id !== over?.id) {
			setPreviewItems((items) => {
				const oldIndex = items.findIndex((i) => i.display_order === active.id);
				const newIndex = items.findIndex((i) => i.display_order === over?.id);
				return arrayMove(items, oldIndex, newIndex);
			});
		}
	};

	if (groups.length === 0) {
		return <p className="text-sm text-gray-500">コミット履歴がありません。</p>;
	}

	const selectedGroup = groups.find((g) => g.version === selectedVersion);

	return (
		<>
			{/* カード一覧 (横スクロール) */}
			<div className="overflow-x-auto py-4">
				<div className="flex space-x-4">
					{groups.map((group) => {
						// diffStatからファイル数、挿入行数、削除行数を抽出
						const fileMatch = group.diffStat.match(/(\d+)\s+files? changed/);
						const insertMatch = group.diffStat.match(
							/(\d+)\s+insertions?\(\+\)/,
						);
						const deleteMatch = group.diffStat.match(/(\d+)\s+deletions?\(-\)/);
						const fileCount = fileMatch ? fileMatch[1] : "0";
						const insertCount = insertMatch ? insertMatch[1] : "0";
						const deleteCount = deleteMatch ? deleteMatch[1] : "0";
						return (
							<button
								key={group.version}
								type="button"
								onClick={() => setSelectedVersion(group.version)}
								className={`min-w-[250px] p-4 border rounded-lg bg-white hover:shadow-lg transition-shadow flex flex-col space-y-2 ${
									selectedVersion === group.version
										? "border-blue-500 bg-blue-50"
										: "border-gray-200"
								}`}
							>
								<div className="flex items-center space-x-2">
									<Tag className="w-5 h-5 text-blue-500" />
									<span className="text-xl font-bold">v{group.version}</span>
								</div>
								<div className="flex items-center text-sm text-gray-600 space-x-1">
									<Calendar className="w-4 h-4" />
									<span>{group.publishedAt.split("T")[0]}</span>
								</div>
								<div className="flex items-center text-sm text-gray-700 space-x-1">
									<Code2 className="w-4 h-4" />
									<span className="italic">サンプル概要テキスト</span>
								</div>
								<div className="flex items-center text-sm text-gray-700 space-x-1">
									<GitCommit className="w-4 h-4" />
									<span>{group.commits.length} commits</span>
								</div>
								{/* 変更ファイル数、挿入、削除を個別表示 */}
								<div className="flex items-center text-sm text-gray-700 space-x-1">
									<FileDiff className="w-4 h-4" />
									<span>変更ファイル数: {fileCount}</span>
								</div>
								<div className="flex items-center text-sm text-green-600 space-x-1">
									<Plus className="w-4 h-4" />
									<span>挿入行数: {insertCount}</span>
								</div>
								<div className="flex items-center text-sm text-red-600 space-x-1">
									<Minus className="w-4 h-4" />
									<span>削除行数: {deleteCount}</span>
								</div>
							</button>
						);
					})}
				</div>
			</div>

			{/* 選択グループの詳細表示 */}
			{selectedGroup && (
				<div className="mt-6 p-4 bg-gray-50 rounded-lg">
					<h4 className="text-lg font-semibold mb-3 flex items-center space-x-2">
						<GitCommit className="w-5 h-5 text-gray-700" />
						<span>詳細 - v{selectedGroup.version}</span>
					</h4>
					<ul className="space-y-4">
						{selectedGroup.commits.map((c) => (
							<li key={c.hash} className="flex items-start space-x-3">
								<GitCommit className="w-4 h-4 mt-1 text-gray-500" />
								<div>
									<p className="text-gray-800">
										<span className="font-mono text-sm mr-2">{c.hash}</span>
										<span className="font-medium">{c.message}</span>
									</p>
									<p className="text-xs text-gray-500 mt-1">
										{c.author} • {c.relDate}
									</p>
								</div>
							</li>
						))}
					</ul>
					<div className="mt-4">
						<button
							type="button"
							onClick={async () => {
								setLoadingSummary(true);
								try {
									const staging = await createVersionCommitStaging({
										version: selectedGroup.version,
										commits: selectedGroup.commits,
									});
									if (!staging || staging.id == null) {
										console.error(
											"ステージング作成失敗: レコードが返されませんでした",
											staging,
										);
										return;
									}
									setStagingId(staging.id);
									setStagingStatus("pending");
									const processed = await processVersionCommitStaging(
										staging.id,
									);
									setStagingStatus(processed.status);
									setSummaryText(processed.summary ?? "");
								} catch (e) {
									console.error("要約作成エラー", e);
								} finally {
									setLoadingSummary(false);
								}
							}}
							disabled={loadingSummary}
							className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
						>
							{loadingSummary ? "作成中..." : "要約を作成"}
						</button>
						<span className="text-sm ml-4">
							ステータス:{" "}
							<span
								className={
									stagingStatus === "pending"
										? "text-gray-500"
										: stagingStatus === "processed"
											? "text-blue-600"
											: stagingStatus === "confirmed"
												? "text-green-600"
												: "text-gray-400"
								}
							>
								{stagingStatus}
							</span>
						</span>
						{/* 要約プレビュー＆確定ボタン */}
						{summaryText && (
							<div className="mt-4 ">
								<h5 className="font-semibold mb-2">要約プレビュー</h5>
								{summaryTitle && (
									<div className="mb-2">
										<h5 className="font-semibold">タイトル</h5>
										<p className="text-sm text-gray-700">{summaryTitle}</p>
									</div>
								)}
								{previewItems.length > 0 && (
									<DndContext
										sensors={sensors}
										collisionDetection={closestCenter}
										onDragEnd={handleDragEnd}
									>
										<SortableContext
											items={previewItems.map((i) => i.display_order)}
											strategy={verticalListSortingStrategy}
										>
											{previewItems.map((item) => (
												<SortableReleaseNoteItem
													key={item.display_order}
													item={item}
													onRemove={(id) =>
														setPreviewItems((prev) =>
															prev.filter((i) => i.display_order !== id),
														)
													}
												/>
											))}
										</SortableContext>
									</DndContext>
								)}
								{stagingStatus === "processed" && stagingId && (
									<button
										type="button"
										disabled={loadingConfirm}
										onClick={async () => {
											setLoadingConfirm(true);
											try {
												const result = await createChangelogEntry({
													version: selectedGroup.version,
													title: summaryTitle,
													published_at: selectedGroup.publishedAt.split("T")[0],
													changes: previewItems.map((item) => ({
														type: item.type,
														description: item.description,
													})),
												});
												if (result.success) {
													setStagingStatus("confirmed");
												} else {
													console.error(
														"Changelog entry creation failed",
														result.error,
													);
												}
											} catch (e) {
												console.error("登録エラー", e);
											} finally {
												setLoadingConfirm(false);
											}
										}}
										className="mt-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
									>
										{loadingConfirm ? "登録中..." : "確定"}
									</button>
								)}
								{stagingStatus === "confirmed" && (
									<span className="ml-4 text-green-600 font-bold">
										登録済み
									</span>
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
