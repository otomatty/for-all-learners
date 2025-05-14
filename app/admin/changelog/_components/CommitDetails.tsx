import React, { useState } from "react";
import { GitCommit, ChevronRight, ChevronDown } from "lucide-react";

interface CommitLog {
	hash: string;
	author: string;
	relDate: string;
	message: string;
}

interface CommitDetailsProps {
	version: string;
	commits: CommitLog[];
}

export function CommitDetails({ version, commits }: CommitDetailsProps) {
	// 折りたたみ状態管理
	const [open, setOpen] = useState(false);
	return (
		<div className="mt-6 p-4 bg-gray-50 rounded-lg">
			{/* ヘッダーをクリックして展開/折りたたみ */}
			<button
				type="button"
				className="flex items-center justify-between mb-3 cursor-pointer"
				onClick={() => setOpen(!open)}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						setOpen(!open);
					}
				}}
			>
				<h4 className="text-lg font-semibold flex items-center space-x-2">
					<GitCommit className="w-5 h-5 text-gray-700" />
					<span>詳細 - v{version}</span>
				</h4>
				{open ? (
					<ChevronDown className="w-5 h-5 text-gray-500" />
				) : (
					<ChevronRight className="w-5 h-5 text-gray-500" />
				)}
			</button>
			{open && (
				<ul className="space-y-4">
					{commits.map((c) => (
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
			)}
		</div>
	);
}
