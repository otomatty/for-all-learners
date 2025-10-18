"use client";

import type { JSONContent } from "@tiptap/core";
import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageLinksGrid from "./page-links-grid";
import RelatedCardsGrid from "./related-cards-grid";

interface PageTabsProps {
	outgoingPages: {
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	}[];
	nestedLinks: Record<string, string[]>;
	missingLinks: string[];
	pageId: string;
	incomingPages: {
		id: string;
		title: string;
		thumbnail_url: string | null;
		content_tiptap: JSONContent;
	}[];
}

export default function PageTabs({
	outgoingPages,
	nestedLinks,
	missingLinks,
	pageId,
	incomingPages,
}: PageTabsProps) {
	return (
		<Tabs defaultValue="links" className="my-8 max-w-5xl mx-auto">
			<TabsList>
				<TabsTrigger value="links">リンク一覧</TabsTrigger>
				<TabsTrigger value="cards">関連カード</TabsTrigger>
			</TabsList>
			<TabsContent value="links">
				<PageLinksGrid
					outgoingPages={outgoingPages}
					nestedLinks={nestedLinks}
					missingLinks={missingLinks}
					incomingPages={incomingPages}
				/>
			</TabsContent>
			<TabsContent value="cards">
				<RelatedCardsGrid pageId={pageId} />
			</TabsContent>
		</Tabs>
	);
}
