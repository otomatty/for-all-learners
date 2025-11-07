"use client";

import {
	ArrowDownCircle,
	Settings,
	Shield,
	ToggleLeft,
	Trash2,
} from "lucide-react";
/**
 * Installed Plugin Card Component (Client Component)
 *
 * Displays installed plugin information with enable/disable and uninstall actions.
 * Includes uninstall confirmation dialog, update functionality, and settings dialog.
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
	disablePlugin,
	enablePlugin,
	uninstallPlugin,
	updatePlugin,
} from "@/app/_actions/plugins";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import type { PluginMetadata, UserPlugin } from "@/types/plugin";
import { PluginSettingsForm } from "./PluginSettingsForm";

interface InstalledPluginCardProps {
	userPlugin: UserPlugin & {
		metadata: PluginMetadata;
		hasUpdate?: boolean;
		latestVersion?: string;
		installedVersion?: string;
	};
}

export function InstalledPluginCard({ userPlugin }: InstalledPluginCardProps) {
	const { metadata } = userPlugin;
	const hasUpdate = userPlugin.hasUpdate ?? false;
	const latestVersion = userPlugin.latestVersion ?? metadata.version;
	const installedVersion = userPlugin.installedVersion;

	const [showUninstallDialog, setShowUninstallDialog] = useState(false);
	const [showSettingsDialog, setShowSettingsDialog] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [isUpdating, setIsUpdating] = useState(false);

	const hasConfigSchema =
		metadata.manifest.configSchema &&
		metadata.manifest.configSchema.type === "object" &&
		metadata.manifest.configSchema.properties &&
		Object.keys(metadata.manifest.configSchema.properties).length > 0;

	const handleUninstall = () => {
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.append("pluginId", userPlugin.pluginId);
				await uninstallPlugin(formData);
				toast.success("プラグインをアンインストールしました");
				setShowUninstallDialog(false);
				// Refresh the page to update the list
				window.location.reload();
			} catch (error) {
				toast.error(
					error instanceof Error
						? error.message
						: "アンインストールに失敗しました",
				);
			}
		});
	};

	const handleUpdate = () => {
		setIsUpdating(true);
		startTransition(async () => {
			try {
				const formData = new FormData();
				formData.append("pluginId", userPlugin.pluginId);
				await updatePlugin(formData);
				toast.success("プラグインを更新しました");
				// Refresh the page to update the list
				window.location.reload();
			} catch (error) {
				toast.error(
					error instanceof Error ? error.message : "更新に失敗しました",
				);
			} finally {
				setIsUpdating(false);
			}
		});
	};

	return (
		<>
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
								{hasUpdate && (
									<Badge
										variant="default"
										className="gap-1 bg-orange-500 hover:bg-orange-600"
									>
										<ArrowDownCircle className="h-3 w-3" />
										更新あり
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
						<span>
							v{installedVersion}
							{hasUpdate && (
								<span className="ml-2 text-orange-600">→ v{latestVersion}</span>
							)}
						</span>
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
					{hasUpdate && (
						<Button
							variant="default"
							size="sm"
							className="gap-2"
							onClick={handleUpdate}
							disabled={isUpdating || isPending}
						>
							<ArrowDownCircle className="h-4 w-4" />
							{isUpdating ? "更新中..." : "更新"}
						</Button>
					)}
					{hasConfigSchema && (
						<Button
							variant="outline"
							size="sm"
							className="gap-2"
							onClick={() => setShowSettingsDialog(true)}
							disabled={isUpdating || isPending}
						>
							<Settings className="h-4 w-4" />
							設定
						</Button>
					)}
					<form action={userPlugin.enabled ? disablePlugin : enablePlugin}>
						<input type="hidden" name="pluginId" value={userPlugin.pluginId} />
						<Button
							type="submit"
							variant={userPlugin.enabled ? "outline" : "default"}
							size="sm"
							className="gap-2"
							disabled={isUpdating || isPending}
						>
							<ToggleLeft className="h-4 w-4" />
							{userPlugin.enabled ? "無効化" : "有効化"}
						</Button>
					</form>

					<Button
						variant="destructive"
						size="sm"
						className="gap-2"
						onClick={() => setShowUninstallDialog(true)}
						disabled={isUpdating || isPending}
					>
						<Trash2 className="h-4 w-4" />
						アンインストール
					</Button>
				</CardFooter>
			</Card>

			{/* Uninstall Confirmation Dialog */}
			<AlertDialog
				open={showUninstallDialog}
				onOpenChange={setShowUninstallDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							プラグインをアンインストールしますか？
						</AlertDialogTitle>
						<AlertDialogDescription>
							プラグイン「{metadata.name}」をアンインストールします。
							<br />
							この操作は元に戻せません。プラグインの設定データも削除されます。
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isPending}>
							キャンセル
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleUninstall}
							disabled={isPending}
							className="bg-red-600 hover:bg-red-700 text-white"
						>
							{isPending ? "アンインストール中..." : "アンインストール"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Settings Dialog */}
			<PluginSettingsForm
				pluginId={userPlugin.pluginId}
				pluginName={metadata.name}
				configSchema={metadata.manifest.configSchema}
				defaultConfig={metadata.manifest.defaultConfig}
				open={showSettingsDialog}
				onOpenChange={setShowSettingsDialog}
			/>
		</>
	);
}
