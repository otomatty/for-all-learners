import { MoreHorizontal } from "lucide-react";
import type { Change, ChangeLogEntry } from "@/app/_actions/changelog";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangeTypeBadge } from "./ChangeTypeBadge";

interface ChangelogEntryItemProps {
	entry: ChangeLogEntry;
	onEdit: (entry: ChangeLogEntry) => void;
	onDelete: (entryId: string) => void;
}

export function ChangelogEntryItem({
	entry,
	onEdit,
	onDelete,
}: ChangelogEntryItemProps) {
	return (
		<article className="p-6 bg-white dark:bg-gray-800 shadow-xl rounded-lg ring-1 ring-gray-200 dark:ring-gray-700 relative">
			<div className="absolute top-4 right-4 z-10">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<MoreHorizontal className="h-4 w-4" />
							<span className="sr-only">オプション</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onEdit(entry)}>
							編集
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => onDelete(entry.id)}
							className="text-red-600 dark:text-red-400 focus:text-red-700 focus:bg-red-50 dark:focus:text-red-300 dark:focus:bg-red-900/50"
						>
							削除
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3">
				<h2 className="text-2xl font-semibold text-gray-900 dark:text-white pr-10">
					{entry.title
						? `${entry.title} (${entry.version})`
						: `${entry.version}`}
				</h2>
				<time
					dateTime={
						new Date(entry.date.replace(/(\d+)年(\d+)月(\d+)日/, "$1-$2-$3"))
							.toISOString()
							.split("T")[0]
					} // YYYY-MM-DD形式に変換
					className="text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-0"
				>
					{entry.date}
				</time>
			</div>
			{entry.changes.length > 0 ? (
				<ul className="mt-4 space-y-3">
					{entry.changes.map((change: Change, index: number) => (
						<li
							key={index}
							className="flex items-start text-gray-700 dark:text-gray-300"
						>
							<ChangeTypeBadge type={change.type} />
							<p className="ml-3 leading-relaxed">{change.description}</p>
						</li>
					))}
				</ul>
			) : (
				<p className="mt-4 text-gray-600 dark:text-gray-400 italic">
					このバージョンでの具体的な変更点はありません。
				</p>
			)}
		</article>
	);
}
