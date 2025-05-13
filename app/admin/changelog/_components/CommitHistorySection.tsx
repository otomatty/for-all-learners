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
	getVersionCommitStagingByVersion,
	confirmVersionReleaseNotes,
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
	const [loadingConfirm, setLoadingConfirm] = useState(false);

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
							<div className="mt-4 p-4 bg-white border rounded">
								<h5 className="font-semibold mb-2">要約プレビュー</h5>
								{(() => {
									// DEBUG: log the raw summaryText before processing
									console.log("[DEBUG] summaryText:", summaryText);
									// Remove markdown fences and prepare for JSON parsing
									const raw = summaryText.replace(/```/g, "").trim();
									console.log("[DEBUG] raw:", raw);
									// Attempt to extract JSON after any 'json' prefix
									const bodyMatch = raw.match(/json\s*\n([\s\S]*)/);
									const body = bodyMatch ? bodyMatch[1].trim() : raw;
									console.log("[DEBUG] body for parsing:", body);
									let parsed: any;
									let release: ReleaseNotesJSON;
									try {
										parsed = JSON.parse(body);
									} catch (e) {
										console.error(
											"[DEBUG] initial JSON.parse failed:",
											e,
											body,
										);
										return (
											<pre className="text-gray-800 whitespace-pre-line">
												{summaryText}
											</pre>
										);
									}
									// If top-level has items, use it directly
									if (parsed.items && Array.isArray(parsed.items)) {
										release = parsed as ReleaseNotesJSON;
									} else if (parsed.parts && Array.isArray(parsed.parts)) {
										// Model wrapped format: parse nested parts[0].text
										const text = parsed.parts[0].text || "";
										const innerMatch = text.match(/(\{[\s\S]*\})/);
										const inner = innerMatch ? innerMatch[1] : text;
										console.log("[DEBUG] inner JSON string:", inner);
										try {
											release = JSON.parse(inner) as ReleaseNotesJSON;
										} catch (e) {
											console.error(
												"[DEBUG] inner JSON.parse failed:",
												e,
												inner,
											);
											return (
												<pre className="text-gray-800 whitespace-pre-line">
													{summaryText}
												</pre>
											);
										}
									} else {
										console.error("[DEBUG] Unexpected JSON structure:", parsed);
										return (
											<pre className="text-gray-800 whitespace-pre-line">
												{summaryText}
											</pre>
										);
									}
									// Render release notes
									return (
										<div className="space-y-4">
											{release.items.map((item) => (
												<div
													key={item.display_order}
													className="border rounded-lg p-4"
												>
													<h6 className="font-semibold capitalize text-lg mb-1">
														{item.type}
													</h6>
													<p className="text-gray-800">{item.description}</p>
												</div>
											))}
										</div>
									);
								})()}
								{stagingStatus === "processed" && stagingId && (
									<button
										type="button"
										disabled={loadingConfirm}
										onClick={async () => {
											setLoadingConfirm(true);
											try {
												await confirmVersionReleaseNotes(stagingId);
												setStagingStatus("confirmed");
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
