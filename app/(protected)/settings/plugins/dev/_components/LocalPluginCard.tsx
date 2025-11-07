"use client";

import { Power, PowerOff, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	type LocalPluginInfo,
	loadLocalPlugin,
	reloadLocalPlugin,
	unloadLocalPlugin,
} from "@/app/_actions/plugins-dev";
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

interface LocalPluginCardProps {
	plugin: LocalPluginInfo;
}

/**
 * Local Plugin Card Component
 *
 * Displays local plugin information with load/unload/reload actions.
 */
export function LocalPluginCard({ plugin }: LocalPluginCardProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isReloading, setIsReloading] = useState(false);

	const handleLoad = () => {
		startTransition(async () => {
			try {
				const result = await loadLocalPlugin(plugin.id);
				if (result.success) {
					toast.success(`${plugin.name} を読み込みました`);
					router.refresh();
				} else {
					toast.error(result.error || "プラグインの読み込みに失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "プラグインの読み込みに失敗しました",
				);
			}
		});
	};

	const handleUnload = () => {
		startTransition(async () => {
			try {
				const result = await unloadLocalPlugin(plugin.id);
				if (result.success) {
					toast.success(`${plugin.name} をアンロードしました`);
					router.refresh();
				} else {
					toast.error(result.error || "プラグインのアンロードに失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "プラグインのアンロードに失敗しました",
				);
			}
		});
	};

	const handleReload = () => {
		setIsReloading(true);
		startTransition(async () => {
			try {
				const result = await reloadLocalPlugin(plugin.id);
				if (result.success) {
					toast.success(`${plugin.name} を再読み込みしました`);
					router.refresh();
				} else {
					toast.error(result.error || "プラグインの再読み込みに失敗しました");
				}
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "プラグインの再読み込みに失敗しました",
				);
			} finally {
				setIsReloading(false);
			}
		});
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div className="flex-1">
						<CardTitle className="text-lg">{plugin.name}</CardTitle>
						<CardDescription className="mt-1">
							{plugin.description || "説明なし"}
						</CardDescription>
					</div>
					<div className="flex gap-2">
						{plugin.isLoaded ? (
							<Badge variant="default" className="bg-green-600">
								読み込み済み
							</Badge>
						) : (
							<Badge variant="secondary">未読み込み</Badge>
						)}
						{plugin.isEnabled && (
							<Badge variant="outline" className="bg-blue-600 text-white">
								有効
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-2 text-sm">
					<div>
						<span className="font-medium">ID:</span>{" "}
						<code className="text-xs bg-muted px-1 py-0.5 rounded">
							{plugin.id}
						</code>
					</div>
					<div>
						<span className="font-medium">バージョン:</span> {plugin.version}
					</div>
					<div>
						<span className="font-medium">作成者:</span> {plugin.author}
					</div>
					<div>
						<span className="font-medium">パス:</span>{" "}
						<code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
							{plugin.path}
						</code>
					</div>
				</div>
			</CardContent>
			<CardFooter className="flex gap-2">
				{plugin.isLoaded ? (
					<>
						<Button
							variant="outline"
							size="sm"
							onClick={handleReload}
							disabled={isReloading || isPending}
						>
							<RefreshCw
								className={`h-4 w-4 mr-2 ${isReloading ? "animate-spin" : ""}`}
							/>
							再読み込み
						</Button>
						<Button
							variant="destructive"
							size="sm"
							onClick={handleUnload}
							disabled={isPending}
						>
							<PowerOff className="h-4 w-4 mr-2" />
							アンロード
						</Button>
					</>
				) : (
					<Button
						variant="default"
						size="sm"
						onClick={handleLoad}
						disabled={isPending}
					>
						<Power className="h-4 w-4 mr-2" />
						読み込む
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
