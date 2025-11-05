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

import { Code2, Package } from "lucide-react";
import Link from "next/link";
import {
	getAvailablePlugins,
	getInstalledPluginsWithUpdates,
} from "@/app/_actions/plugins";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
		getInstalledPluginsWithUpdates().catch(() => []),
		getAvailablePlugins({
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

	return (
		<div className="container mx-auto px-4 py-8 max-w-6xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">プラグイン</h1>
				<p className="text-muted-foreground">
					プラグインをインストールして機能を拡張できます
				</p>
			</div>

			<Tabs defaultValue={params.tab ?? "installed"} className="w-full">
				<TabsList className="grid w-full grid-cols-3 mb-8">
					<TabsTrigger value="installed">
						インストール済み ({installedPlugins.length})
					</TabsTrigger>
					<TabsTrigger value="marketplace">
						マーケットプレイス ({sortedPlugins.length})
					</TabsTrigger>
					<TabsTrigger value="development">開発環境</TabsTrigger>
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

				{/* Development Environment Tab */}
				<TabsContent value="development" className="space-y-4">
					<Card>
						<CardContent className="pt-6">
							<div className="space-y-4">
								<div className="flex items-center gap-2 mb-4">
									<Code2 className="h-5 w-5 text-muted-foreground" />
									<h2 className="text-xl font-semibold">プラグイン開発環境</h2>
								</div>
								<p className="text-muted-foreground mb-6">
									ローカルでプラグインを開発・デバッグするための開発環境です。
									プラグインの作成、テスト、デバッグが可能です。
								</p>
								<div className="flex flex-col sm:flex-row gap-4">
									<Button asChild variant="default" className="flex-1">
										<Link href="/settings/plugins/dev">
											<Code2 className="mr-2 h-4 w-4" />
											ローカルプラグイン管理
										</Link>
									</Button>
									<Button asChild variant="outline" className="flex-1">
										<Link href="/settings/plugins/dev/debug">
											<Package className="mr-2 h-4 w-4" />
											デバッグツール
										</Link>
									</Button>
								</div>
								<div className="mt-6 pt-6 border-t">
									<h3 className="font-medium mb-2">開発環境の使い方</h3>
									<ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
										<li>
											ローカルプラグイン管理:
											プラグインの読み込み、再読み込み、アンロード
										</li>
										<li>
											デバッグツール:
											プラグインのログ、エラー、パフォーマンスメトリクスの確認
										</li>
										<li>
											CLIツール:
											プラグインの作成、ビルド、テスト、開発モードの実行
										</li>
									</ul>
								</div>
							</div>
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
