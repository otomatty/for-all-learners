"use client";

import type { ChangeLogEntry } from "@/hooks/changelog";
import { useChangelogData } from "@/hooks/changelog";
import { ChangelogEntry } from "./ChangelogEntry";

export function ChangelogClient() {
	const { data: changelogData = [], isLoading } = useChangelogData();

	if (isLoading) {
		return <p className="text-center py-10">読み込み中...</p>;
	}

	return (
		<div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
			<div className="relative">
				{/* タイムラインの縦線 */}
				<div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-border -z-10" />

				{changelogData.map((entry: ChangeLogEntry) => (
					<ChangelogEntry entry={entry} key={entry.version} />
				))}
			</div>
		</div>
	);
}
