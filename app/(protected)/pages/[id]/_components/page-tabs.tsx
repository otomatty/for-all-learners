"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLinksGrid from "./page-links-grid";
import RelatedCardsGrid from "./related-cards-grid";

interface PageTabsProps {
	nestedLinks: Record<string, string[]>;
	missingLinks: string[];
	pageId: string;
}

export default function PageTabs({
	nestedLinks,
	missingLinks,
	pageId,
}: PageTabsProps) {
	return (
		<Tabs defaultValue="links" className="my-8 max-w-5xl mx-auto">
			<TabsList>
				<TabsTrigger value="links">リンク一覧</TabsTrigger>
				<TabsTrigger value="cards">関連カード</TabsTrigger>
			</TabsList>
			<TabsContent value="links">
				<PageLinksGrid nestedLinks={nestedLinks} missingLinks={missingLinks} />
			</TabsContent>
			<TabsContent value="cards">
				<RelatedCardsGrid pageId={pageId} />
			</TabsContent>
		</Tabs>
	);
}
