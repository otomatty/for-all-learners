/**
 * Plugin Settings Page
 *
 * Allows users to browse, install, and manage plugins.
 *
 * DEPENDENCY MAP:
 *
 * Parents: app/(protected)/settings/layout.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugins.ts
 *   ├─ components/ui/* (Button, Card, Switch, etc.)
 *   ├─ types/plugin.ts
 *   └─ ./_components/PluginFiltersClient.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	getAvailablePluginsServer,
	getInstalledPluginsWithUpdatesServer,
} from "@/lib/services/pluginsService";
import { InstalledPluginCard } from "./_components/InstalledPluginCard";
import { MarketplacePluginCard } from "./_components/MarketplacePluginCard";
import { PluginFiltersClient } from "./_components/PluginFiltersClient";

/**
 * Plugin Settings Page Component
 */
export default async function PluginsPage({
	searchParams,
}: {
	searchParams: Promise<{
		search?: string;
		official?: string;
		reviewed?: string;
		extensionPoint?: string;
		sort?: string;
		tab?: string;
	}>;
}) {
	const params = await searchParams;
	const search = params.search ?? "";
	const isOfficial = params.official === "true" ? true : null;
	const isReviewed = params.reviewed === "true" ? true : null;
	const extensionPoint =
		params.extensionPoint && params.extensionPoint !== "all"
			? params.extensionPoint
			: undefined;
	const sort = params.sort ?? "popular";

	// Fetch data
	const [installedPlugins, availablePlugins] = await Promise.all([
		getInstalledPluginsWithUpdatesServer().catch(() => []),
		getAvailablePluginsServer({
			search: search || undefined,
			isOfficial: isOfficial ?? undefined,
			isReviewed: isReviewed ?? undefined,
			extensionPoint,
			limit: 50,
		}).catch(() => []),
	]);

	// Sort plugins based on sort parameter
	const sortedPlugins = [...availablePlugins].sort((a, b) => {
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

	const installedIds = new Set(installedPlugins.map((p) => p.pluginId));

	// Validate tab parameter - redirect development tab to dev page
	const tab = params.tab ?? "installed";
	const validTab =
		tab === "installed" || tab === "marketplace" ? tab : "installed";

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
					{installedPlugins.length === 0 ? (
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
						initialSort={sort as "popular" | "rating" | "updated" | "name"}
					/>

					{sortedPlugins.length === 0 ? (
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
