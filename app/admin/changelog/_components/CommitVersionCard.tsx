import {
	Calendar,
	Code2,
	FileDiff,
	GitCommit,
	Minus,
	Plus,
	Tag,
} from "lucide-react";
import React from "react";

interface CommitVersionCardProps {
	version: string;
	publishedAt: string;
	commitCount: number;
	diffStat: string;
	selected: boolean;
	onClick: () => void;
}

export function CommitVersionCard({
	version,
	publishedAt,
	commitCount,
	diffStat,
	selected,
	onClick,
}: CommitVersionCardProps) {
	const fileMatch = diffStat.match(/(\d+)\s+files? changed/);
	const insertMatch = diffStat.match(/(\d+)\s+insertions?\(\+\)/);
	const deleteMatch = diffStat.match(/(\d+)\s+deletions?\(-\)/);
	const fileCount = fileMatch ? fileMatch[1] : "0";
	const insertCount = insertMatch ? insertMatch[1] : "0";
	const deleteCount = deleteMatch ? deleteMatch[1] : "0";

	return (
		<button
			type="button"
			onClick={onClick}
			className={`min-w-[250px] p-4 border rounded-lg bg-white hover:shadow-lg transition-shadow flex flex-col space-y-2 ${
				selected ? "border-blue-500 bg-blue-50" : "border-gray-200"
			}`}
		>
			<div className="flex items-center space-x-2">
				<Tag className="w-5 h-5 text-blue-500" />
				<span className="text-xl font-bold">v{version}</span>
			</div>
			<div className="flex items-center text-sm text-gray-600 space-x-1">
				<Calendar className="w-4 h-4" />
				<span>{publishedAt.split("T")[0]}</span>
			</div>
			<div className="flex items-center text-sm text-gray-700 space-x-1">
				<Code2 className="w-4 h-4" />
				<span className="italic">サンプル概要テキスト</span>
			</div>
			<div className="flex items-center text-sm text-gray-700 space-x-1">
				<GitCommit className="w-4 h-4" />
				<span>{commitCount} commits</span>
			</div>
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
}
