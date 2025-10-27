"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getPageBacklinks } from "@/app/_actions/pages/get-backlinks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * BacklinksGrid Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (使用先):
 *   └─ app/(protected)/pages/[id]/_components/page-tabs.tsx
 *
 * Dependencies (依存先):
 *   ├─ @/app/_actions/pages/get-backlinks
 *   ├─ @/components/ui/card
 *   ├─ next/link
 *   └─ sonner
 *
 * Related Files:
 *   └─ Parent: ./page-tabs.tsx
 */

interface BacklinksGridProps {
	pageId: string;
}

interface BacklinkPage {
	id: string;
	title: string;
	user_id: string;
	created_at: string | null;
	updated_at: string | null;
}

export default function BacklinksGrid({ pageId }: BacklinksGridProps) {
	const [backlinks, setBacklinks] = useState<BacklinkPage[]>([]);
	const [loading, setLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	useEffect(() => {
		// Already loaded, skip
		if (hasLoaded) return;

		const fetchBacklinks = async () => {
			setLoading(true);
			const { data, error } = await getPageBacklinks(pageId);

			if (error) {
				toast.error(error);
				setBacklinks([]);
			} else {
				setBacklinks(data || []);
			}

			setLoading(false);
			setHasLoaded(true);
		};

		fetchBacklinks();
	}, [pageId, hasLoaded]);

	if (loading) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<p className="text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (backlinks.length === 0) {
		return (
			<div className="flex items-center justify-center min-h-[200px]">
				<p className="text-muted-foreground">
					このページへのリンクはまだありません
				</p>
			</div>
		);
	}

	return (
		<section>
			<h2 className="text-lg font-semibold mb-2">
				このページへのリンク ({backlinks.length})
			</h2>
			<div className="grid gap-2 md:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
				{backlinks.map((page) => (
					<Link key={page.id} href={`/pages/${page.id}`}>
						<Card className="h-full overflow-hidden transition-all hover:shadow-md py-2 md:py-4 gap-2 cursor-pointer">
							<CardHeader className="px-2 md:px-4 pb-2">
								<CardTitle className="text-sm font-semibold line-clamp-2">
									{page.title}
								</CardTitle>
							</CardHeader>
							<CardContent className="px-2 md:px-4">
								<p className="text-xs text-muted-foreground">
									更新:{" "}
									{page.updated_at
										? new Date(page.updated_at).toLocaleDateString("ja-JP")
										: "不明"}
								</p>
							</CardContent>
						</Card>
					</Link>
				))}
			</div>
		</section>
	);
}
