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
} from "lucide-react";
import {
	createVersionCommitStaging,
	processVersionCommitStaging,
} from "@/app/_actions/version";

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

/**
 * コミット履歴セクションコンポーネント
 * バージョンごとにカードを横並び表示し、選択時に詳細を表示
 */
export function CommitHistorySection() {
	const [groups, setGroups] = useState<VersionGroup[]>([]);
	const [selectedVersion, setSelectedVersion] = useState<string>("");
	const [loadingSummary, setLoadingSummary] = useState(false);

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
									await processVersionCommitStaging(staging.id);
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
					</div>
				</div>
			)}
		</>
	);
}
