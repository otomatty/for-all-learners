"use client";

import { createChangelogEntry } from "@/app/_actions/changelog";
import {
	createVersionCommitStaging,
	getVersionCommitStagingByVersion,
	processVersionCommitStaging,
} from "@/app/_actions/version";
import {
	type DragEndEvent,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import React, { useEffect, useState } from "react";

import { CommitDetails } from "./CommitDetails";
import { CommitVersionCard } from "./CommitVersionCard";
import { ReleaseNotePreview } from "./ReleaseNotePreview";

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

	// Handlers for summary creation and confirmation
	const handleCreateSummary = async () => {
		setLoadingSummary(true);
		try {
			const staging = await createVersionCommitStaging({
				version: selectedGroup?.version ?? "",
				commits: selectedGroup?.commits ?? [],
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
			const processed = await processVersionCommitStaging(staging.id);
			setStagingStatus(processed.status);
			setSummaryText(processed.summary ?? "");
		} catch (e) {
			console.error("要約作成エラー", e);
		} finally {
			setLoadingSummary(false);
		}
	};

	const handleConfirm = async () => {
		setLoadingConfirm(true);
		try {
			const result = await createChangelogEntry({
				version: selectedGroup?.version ?? "",
				title: summaryTitle,
				published_at: selectedGroup?.publishedAt.split("T")[0] ?? "",
				changes: previewItems.map((item) => ({
					type: item.type,
					description: item.description,
				})),
			});
			if (result.success) {
				setStagingStatus("confirmed");
			} else {
				console.error("Changelog entry creation failed", result.error);
			}
		} catch (e) {
			console.error("登録エラー", e);
		} finally {
			setLoadingConfirm(false);
		}
	};

	return (
		<>
			{/* カード一覧 (横スクロール) */}
			<div className="overflow-x-auto py-4">
				<div className="flex space-x-4">
					{groups.map((group) => (
						<CommitVersionCard
							key={group.version}
							version={group.version}
							publishedAt={group.publishedAt}
							commitCount={group.commits.length}
							diffStat={group.diffStat}
							selected={selectedVersion === group.version}
							onClick={() => setSelectedVersion(group.version)}
						/>
					))}
				</div>
			</div>

			{/* 選択グループの詳細表示 */}
			{selectedGroup && (
				<>
					<CommitDetails
						version={selectedGroup.version}
						commits={selectedGroup.commits}
					/>
					<ReleaseNotePreview
						summaryTitle={summaryTitle}
						previewItems={previewItems}
						stagingStatus={stagingStatus}
						stagingId={stagingId}
						loadingSummary={loadingSummary}
						loadingConfirm={loadingConfirm}
						onCreateSummary={handleCreateSummary}
						onConfirm={handleConfirm}
						onEdit={(item) =>
							setPreviewItems((prev) =>
								prev.map((i) =>
									i.display_order === item.display_order ? item : i,
								),
							)
						}
						onRemove={(id) =>
							setPreviewItems((prev) =>
								prev.filter((i) => i.display_order !== id),
							)
						}
						onDragEnd={handleDragEnd}
						sensors={sensors}
					/>
				</>
			)}
		</>
	);
}
