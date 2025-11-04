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
 *   └─ types/plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase1-core-system.md
 */

import {
	Download,
	Package,
	Shield,
	Star,
	ToggleLeft,
	Trash2,
} from "lucide-react";
import {
	disablePlugin,
	enablePlugin,
	getAvailablePlugins,
	getInstalledPlugins,
	installPlugin,
	uninstallPlugin,
} from "@/app/_actions/plugins";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { PluginMetadata, UserPlugin } from "@/types/plugin";

/**
 * Plugin Settings Page Component
 */
export default async function PluginsPage() {
	// Fetch data
	const [installedPlugins, availablePlugins] = await Promise.all([
		getInstalledPlugins().catch(() => []),
		getAvailablePlugins({ limit: 50 }).catch(() => []),
	]);

	const installedIds = new Set(installedPlugins.map((p) => p.pluginId));

	return (
		<div className="container mx-auto px-4 py-8 max-w-6xl">
			<div className="mb-8">
				<h1 className="text-3xl font-bold mb-2">プラグイン</h1>
				<p className="text-muted-foreground">
					プラグインをインストールして機能を拡張できます
				</p>
			</div>

			<Tabs defaultValue="installed" className="w-full">
				<TabsList className="grid w-full grid-cols-2 mb-8">
					<TabsTrigger value="installed">
						インストール済み ({installedPlugins.length})
					</TabsTrigger>
					<TabsTrigger value="marketplace">
						マーケットプレイス ({availablePlugins.length})
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
					{availablePlugins.length === 0 ? (
						<Card>
							<CardContent className="pt-6 text-center">
								<p className="text-muted-foreground">
									利用可能なプラグインはありません
								</p>
							</CardContent>
						</Card>
					) : (
						availablePlugins.map((plugin) => (
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

/**
 * Installed Plugin Card Component
 */
function InstalledPluginCard({
	userPlugin,
}: {
	userPlugin: UserPlugin & { metadata: PluginMetadata };
}) {
	const { metadata } = userPlugin;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<CardTitle>{metadata.name}</CardTitle>
							{metadata.isOfficial && (
								<Badge variant="default" className="gap-1">
									<Shield className="h-3 w-3" />
									公式
								</Badge>
							)}
							{userPlugin.enabled ? (
								<Badge variant="outline" className="bg-green-50">
									有効
								</Badge>
							) : (
								<Badge variant="secondary">無効</Badge>
							)}
						</div>
						<CardDescription>{metadata.description}</CardDescription>
					</div>
				</div>
				<div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
					<span>v{userPlugin.installedVersion}</span>
					<span>作成者: {metadata.author}</span>
				</div>
			</CardHeader>

			<CardContent>
				<div className="flex flex-wrap gap-2">
					{metadata.manifest.extensionPoints.editor && (
						<Badge variant="outline">エディタ</Badge>
					)}
					{metadata.manifest.extensionPoints.ai && (
						<Badge variant="outline">AI</Badge>
					)}
					{metadata.manifest.extensionPoints.ui && (
						<Badge variant="outline">UI</Badge>
					)}
					{metadata.manifest.extensionPoints.dataProcessor && (
						<Badge variant="outline">データ処理</Badge>
					)}
					{metadata.manifest.extensionPoints.integration && (
						<Badge variant="outline">外部連携</Badge>
					)}
				</div>
			</CardContent>

			<CardFooter className="flex gap-2">
				<form action={userPlugin.enabled ? disablePlugin : enablePlugin}>
					<input type="hidden" name="pluginId" value={userPlugin.pluginId} />
					<Button
						type="submit"
						variant={userPlugin.enabled ? "outline" : "default"}
						size="sm"
						className="gap-2"
					>
						<ToggleLeft className="h-4 w-4" />
						{userPlugin.enabled ? "無効化" : "有効化"}
					</Button>
				</form>

				<form action={uninstallPlugin}>
					<input type="hidden" name="pluginId" value={userPlugin.pluginId} />
					<Button
						type="submit"
						variant="destructive"
						size="sm"
						className="gap-2"
					>
						<Trash2 className="h-4 w-4" />
						アンインストール
					</Button>
				</form>
			</CardFooter>
		</Card>
	);
}

/**
 * Marketplace Plugin Card Component
 */
function MarketplacePluginCard({
	plugin,
	isInstalled,
}: {
	plugin: PluginMetadata;
	isInstalled: boolean;
}) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<div className="flex items-center gap-2 mb-1">
							<CardTitle>{plugin.name}</CardTitle>
							{plugin.isOfficial && (
								<Badge variant="default" className="gap-1">
									<Shield className="h-3 w-3" />
									公式
								</Badge>
							)}
							{plugin.isReviewed && (
								<Badge variant="secondary">レビュー済み</Badge>
							)}
							{isInstalled && (
								<Badge variant="outline" className="bg-blue-50">
									インストール済み
								</Badge>
							)}
						</div>
						<CardDescription>{plugin.description}</CardDescription>
					</div>
				</div>

				<div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
					<span>v{plugin.version}</span>
					<span>作成者: {plugin.author}</span>
					<span className="flex items-center gap-1">
						<Download className="h-3 w-3" />
						{plugin.downloadsCount.toLocaleString()}
					</span>
					{plugin.ratingAverage && (
						<span className="flex items-center gap-1">
							<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
							{plugin.ratingAverage.toFixed(1)}
						</span>
					)}
				</div>
			</CardHeader>

			<CardContent>
				<div className="flex flex-wrap gap-2">
					{plugin.manifest.extensionPoints.editor && (
						<Badge variant="outline">エディタ</Badge>
					)}
					{plugin.manifest.extensionPoints.ai && (
						<Badge variant="outline">AI</Badge>
					)}
					{plugin.manifest.extensionPoints.ui && (
						<Badge variant="outline">UI</Badge>
					)}
					{plugin.manifest.extensionPoints.dataProcessor && (
						<Badge variant="outline">データ処理</Badge>
					)}
					{plugin.manifest.extensionPoints.integration && (
						<Badge variant="outline">外部連携</Badge>
					)}
				</div>
			</CardContent>

			<CardFooter>
				{isInstalled ? (
					<Button disabled variant="outline" size="sm">
						インストール済み
					</Button>
				) : (
					<form action={installPlugin}>
						<input type="hidden" name="pluginId" value={plugin.pluginId} />
						<Button type="submit" size="sm" className="gap-2">
							<Download className="h-4 w-4" />
							インストール
						</Button>
					</form>
				)}
			</CardFooter>
		</Card>
	);
}
