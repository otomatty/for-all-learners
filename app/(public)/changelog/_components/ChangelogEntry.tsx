"use client";

import { Button } from "@/components/ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import React from "react";
import type { ChangeLogEntry } from "../../../_actions/changelog";
import { ChangeItem } from "./ChangeItem";
export function ChangelogEntry({ entry }: { entry: ChangeLogEntry }) {
	const [expanded, setExpanded] = React.useState(false);
	const visibleChanges = expanded ? entry.changes : entry.changes.slice(0, 3);
	const hasMore = entry.changes.length > 3;
	return (
		<div className="relative pl-10 sm:pl-12 mb-10">
			<div className="absolute left-[11px] sm:left-[15px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
			<div className="mb-1">
				<time className="text-sm font-medium text-primary">{entry.date}</time>
				<h2 className="text-2xl font-semibold mt-0.5">
					v{entry.version}
					{entry.title && (
						<span className="ml-2 text-xl font-normal text-muted-foreground">
							- {entry.title}
						</span>
					)}
				</h2>
			</div>
			<div className="space-y-3 mt-3">
				{visibleChanges.map((change) => (
					<ChangeItem change={change} key={change.description} />
				))}
				{hasMore &&
					(expanded ? (
						<Button
							onClick={() => setExpanded(false)}
							variant="ghost"
							className="w-full"
						>
							<ChevronUpIcon className="w-4 h-4 mr-2" />
							閉じる
						</Button>
					) : (
						<Button
							onClick={() => setExpanded(true)}
							variant="ghost"
							className="w-full"
						>
							<ChevronDownIcon className="w-4 h-4 mr-2" />
							もっと見る
						</Button>
					))}
			</div>
		</div>
	);
}
