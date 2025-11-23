import type { Metadata } from "next";
import { ChangelogClient } from "./_components/ChangelogClient";
import HeaderSection from "./_components/header-section";

export const metadata: Metadata = {
	title: "更新履歴 - For All Learners",
	description:
		"For All Learners アプリケーションのこれまでの改善と新機能の履歴です。",
};

export default function ChangelogPage() {
	return (
		<>
			<HeaderSection />
			<ChangelogClient />
		</>
	);
}
