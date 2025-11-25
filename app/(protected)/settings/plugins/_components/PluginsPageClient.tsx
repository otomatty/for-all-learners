"use client";

import { Package } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAvailablePlugins } from "@/hooks/plugins/useAvailablePlugins";
import { useInstalledPluginsWithUpdates } from "@/hooks/plugins/useInstalledPluginsWithUpdates";
import { InstalledPluginCard } from "./InstalledPluginCard";
import { MarketplacePluginCard } from "./MarketplacePluginCard";
import { PluginFiltersClient } from "./PluginFiltersClient";

/**
 * Plugins Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ hooks/plugins/useInstalledPluginsWithUpdates.ts
 *   ├─ hooks/plugins/useAvailablePlugins.ts
 *   └─ next/navigation
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function PluginsPageClient() {
	const searchParams = useSearchParams();

	// URLパラメータから値を取得
	const search = searchParams.get("search") ?? "";
	const isOfficial = searchParams.get("official") === "true" ? true : null;
	const isReviewed = searchParams.get("reviewed") === "true" ? true : null;
	const extensionPointParam = searchParams.get("extensionPoint");
	const extensionPoint =
		extensionPointParam && extensionPointParam !== "all"
			? extensionPointParam
			: undefined;
	const sort =
		(searchParams.get("sort") as "popular" | "rating" | "updated" | "name") ??
		"popular";
	const tab = searchParams.get("tab") ?? "installed";
	const validTab =
		tab === "installed" || tab === "marketplace" ? tab : "installed";

	// インストール済みプラグインを取得
	const { data: installedPlugins = [], isLoading: isLoadingInstalled } =
		useInstalledPluginsWithUpdates();

	// 利用可能なプラグインを取得
	const { data: availablePlugins = [], isLoading: isLoadingAvailable } =
		useAvailablePlugins({
			search: search || undefined,
			isOfficial: isOfficial ?? undefined,
			isReviewed: isReviewed ?? undefined,
			extensionPoint: extensionPoint ?? undefined,
			limit: 50,
		});

	// プラグインをソート
	const sortedPlugins = useMemo(() => {
		return [...availablePlugins].sort((a, b) => {
			if (sort === "popular") {
				return b.downloadsCount - a.downloadsCount;
			}
			if (sort === "rating") {
				const aRating = a.ratingAverage ?? 0;
				const bRating = b.ratingAverage ?? 0;
				return bRating - aRating;
			}
			if (sort === "updated") {
				return b.updatedAt.getTime() - a.updatedAt.getTime();
			}
			if (sort === "name") {
				return a.name.localeCompare(b.name, "ja");
			}
			return 0;
		});
	}, [availablePlugins, sort]);

	const installedIds = useMemo(
		() => new Set(installedPlugins.map((p) => p.pluginId)),
		[installedPlugins],
	);

	const isLoading = isLoadingInstalled || isLoadingAvailable;

	return (
		<div className="container mx-auto px-4 py-8 max-w-6xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">プラグイン</h1>
				<p className="text-muted-foreground">
					プラグインをインストールして機能を拡張できます
				</p>
			</div>

			<Tabs defaultValue={validTab} className="w-full">
				<TabsList className="grid w-full grid-cols-2 mb-8">
					<TabsTrigger value="installed">
						インストール済み ({installedPlugins.length})
					</TabsTrigger>
					<TabsTrigger value="marketplace">
						マーケットプレイス ({sortedPlugins.length})
					</TabsTrigger>
				</TabsList>

				{/* Installed Plugins Tab */}
				<TabsContent value="installed" className="space-y-4">
					{isLoading ? (
						<Card>
							<CardContent className="pt-6 text-center">
								<p className="text-muted-foreground">読み込み中...</p>
							</CardContent>
						</Card>
					) : installedPlugins.length === 0 ? (
						<Card>
							<CardContent className="pt-6 text-center">
								<Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
								<p className="text-muted-foreground">
									インストールされているプラグインはありません
								</p>
							</CardContent>
						</Card>
					) : (
						installedPlugins.map((userPlugin) => (
							<InstalledPluginCard
								key={userPlugin.pluginId}
								userPlugin={userPlugin}
							/>
						))
					)}
				</TabsContent>

				{/* Marketplace Tab */}
				<TabsContent value="marketplace" className="space-y-4">
					<PluginFiltersClient
						initialSearch={search}
						initialOfficial={isOfficial}
						initialReviewed={isReviewed}
						initialExtensionPoint={
							extensionPoint as
								| "editor"
								| "ai"
								| "ui"
								| "dataProcessor"
								| "integration"
								| null
								| undefined
						}
						initialSort={sort}
					/>

					{isLoading ? (
						<Card>
							<CardContent className="pt-6 text-center">
								<p className="text-muted-foreground">読み込み中...</p>
							</CardContent>
						</Card>
					) : sortedPlugins.length === 0 ? (
						<Card>
							<CardContent className="pt-6 text-center">
								<p className="text-muted-foreground">
									利用可能なプラグインはありません
								</p>
							</CardContent>
						</Card>
					) : (
						sortedPlugins.map((plugin) => (
							<MarketplacePluginCard
								key={plugin.pluginId}
								plugin={plugin}
								isInstalled={installedIds.has(plugin.pluginId)}
							/>
						))
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
