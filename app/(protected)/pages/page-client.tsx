"use client";

import React, { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { PagesListContainer } from "@/app/(protected)/pages/_components/pages-list-container";

interface PagesPageClientProps {
	userId: string;
	totalCount: number;
}

export default function PagesPageClient({
	userId,
	totalCount,
}: PagesPageClientProps) {
	const [sortBy, setSortBy] = useState<"updated" | "created">("updated");

	return (
		<>
			<Tabs defaultValue="my-pages" className="space-y-4">
				<div className="flex justify-between mb-4 items-center">
					<TabsList>
						<TabsTrigger value="my-pages">マイページ</TabsTrigger>
						<TabsTrigger value="shared-pages">共有ページ</TabsTrigger>
					</TabsList>
					<div className="flex items-center space-x-2">
						<Select
							value={sortBy}
							onValueChange={(value) =>
								setSortBy(value as "updated" | "created")
							}
						>
							<SelectTrigger className="p-2 border rounded">
								<SelectValue placeholder="表示順" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="updated">更新順</SelectItem>
								<SelectItem value="created">作成順</SelectItem>
							</SelectContent>
						</Select>
						<Button asChild>
							<Link href="/pages/new">新規ページ</Link>
						</Button>
					</div>
				</div>

				<TabsContent value="my-pages" className="space-y-4">
					<PagesListContainer userId={userId} sortBy={sortBy} />
				</TabsContent>
				<TabsContent value="shared-pages" className="space-y-4">
					<PagesListContainer userId={userId} sortBy={sortBy} />
				</TabsContent>
			</Tabs>

			<div className="hidden md:block fixed bottom-0 right-0 p-2 border-t border-l bg-background text-sm text-muted-foreground mt-4">
				総ページ数: {totalCount}
			</div>
		</>
	);
}
