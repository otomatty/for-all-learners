"use client";

/**
 * Marketplace Plugin Card Component (Client Component)
 *
 * Displays plugin card with install button and details dialog.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ app/(protected)/settings/plugins/page.tsx
 *
 * Dependencies:
 *   ├─ app/_actions/plugins.ts
 *   ├─ components/ui/* (Button, Card, Dialog, etc.)
 *   ├─ types/plugin.ts
 *   └─ ./PluginDetails.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { Download, Eye, Shield, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { installPlugin } from "@/app/_actions/plugins";
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
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useLoadPlugin } from "@/lib/hooks/use-load-plugin";
import type { PluginMetadata } from "@/types/plugin";
import { PluginDetails } from "./PluginDetails";

interface MarketplacePluginCardProps {
	plugin: PluginMetadata;
	isInstalled: boolean;
}

export function MarketplacePluginCard({
	plugin,
	isInstalled,
}: MarketplacePluginCardProps) {
	const [showDetails, setShowDetails] = useState(false);
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const { loadPlugin } = useLoadPlugin();

	const handleInstall = async () => {
		startTransition(async () => {
			try {
				// Install plugin (database registration only)
				const formData = new FormData();
				formData.append("pluginId", plugin.pluginId);
				await installPlugin(formData);

				// Load plugin in browser
				const loadResult = await loadPlugin(plugin);

				if (loadResult.success) {
					toast.success(`${plugin.name} をインストールしました`);
					router.refresh();
				} else {
					toast.error(
						`インストールしましたが、プラグインの読み込みに失敗しました: ${loadResult.error}`,
					);
					router.refresh();
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "プラグインのインストールに失敗しました",
				);
			}
		});
	};

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

			<CardFooter className="flex gap-2">
				<Dialog open={showDetails} onOpenChange={setShowDetails}>
					<DialogTrigger asChild>
						<Button variant="outline" size="sm" className="gap-2">
							<Eye className="h-4 w-4" />
							詳細を見る
						</Button>
					</DialogTrigger>
					<DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>{plugin.name}</DialogTitle>
						</DialogHeader>
						<PluginDetails plugin={plugin} />
					</DialogContent>
				</Dialog>

				{isInstalled ? (
					<Button disabled variant="outline" size="sm">
						インストール済み
					</Button>
				) : (
					<Button
						onClick={handleInstall}
						disabled={isPending}
						size="sm"
						className="gap-2"
					>
						<Download className="h-4 w-4" />
						{isPending ? "インストール中..." : "インストール"}
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
