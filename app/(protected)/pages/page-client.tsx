"use client";

import React, { useState } from "react";
import { PagesListContainer } from "@/app/(protected)/pages/_components/pages-list-container";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PagesPageClientProps {
	userId: string;
	totalCount: number;
}

export default function PagesPageClient({
	userId,
	totalCount,
}: PagesPageClientProps) {
	const [sortBy, setSortBy] = useState<"updated" | "created">("updated");
	const [activeTab, setActiveTab] = useState<"my-pages" | "shared-pages">(
		"my-pages",
	);

	const handleNewPage = () => {
		window.location.href = "/pages/new";
	};

	return (
		<>
			<div className="space-y-4">
				{/* モバイル用: セレクトボックスでページタイプ切り替え */}
				<div className="md:hidden">
					<div className="flex flex-col space-y-2 mb-4">
						<div className="flex items-center space-x-2">
							<Select
								value={activeTab}
								onValueChange={(value) =>
									setActiveTab(value as "my-pages" | "shared-pages")
								}
							>
								<SelectTrigger className="flex-1">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="my-pages">マイページ</SelectItem>
									<SelectItem value="shared-pages">共有ページ</SelectItem>
								</SelectContent>
							</Select>
							<Button onClick={handleNewPage} size="sm">
								新規
							</Button>
						</div>
						<div className="flex items-center space-x-2">
							<Select
								value={sortBy}
								onValueChange={(value) =>
									setSortBy(value as "updated" | "created")
								}
							>
								<SelectTrigger className="flex-1">
									<SelectValue placeholder="表示順" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="updated">更新順</SelectItem>
									<SelectItem value="created">作成順</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* デスクトップ用: タブでページタイプ切り替え */}
				<Tabs
					value={activeTab}
					onValueChange={(value) =>
						setActiveTab(value as "my-pages" | "shared-pages")
					}
					className="hidden md:block space-y-4"
				>
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
							<Button onClick={handleNewPage}>新規ページ</Button>
						</div>
					</div>
				</Tabs>

				{/* 共通: コンテンツ表示 */}
				<div className="space-y-4">
					{activeTab === "my-pages" && (
						<PagesListContainer userId={userId} sortBy={sortBy} />
					)}
					{activeTab === "shared-pages" && (
						<PagesListContainer userId={userId} sortBy={sortBy} />
					)}
				</div>
			</div>

			<div className="hidden md:block fixed bottom-0 right-0 p-2 border-t border-l bg-background text-sm text-muted-foreground mt-4">
				総ページ数: {totalCount}
			</div>
		</>
	);
}
