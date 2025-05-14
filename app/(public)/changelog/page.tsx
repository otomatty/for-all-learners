import { ChangelogEntry } from "./_components/ChangelogEntry";
import type { Metadata } from "next";
import React from "react";
import {
	type ChangeLogEntry,
	getChangelogData,
} from "../../_actions/changelog";
import HeaderSection from "./_components/header-section";

export const metadata: Metadata = {
	title: "更新履歴 - For All Learners",
	description:
		"For All Learners アプリケーションのこれまでの改善と新機能の履歴です。",
};

export default async function ChangelogPage() {
	const changelogData: ChangeLogEntry[] = await getChangelogData();

	return (
		<>
			<HeaderSection />
			<div className="container mx-auto px-4 sm:px-6 py-12 max-w-4xl">
				<div className="relative">
					{/* タイムラインの縦線 */}
					<div className="absolute left-4 sm:left-5 top-0 bottom-0 w-0.5 bg-border -z-10" />

					{changelogData.map((entry, entryIndex) => (
						<ChangelogEntry entry={entry} key={entry.version} />
					))}
				</div>
			</div>
		</>
	);
}
