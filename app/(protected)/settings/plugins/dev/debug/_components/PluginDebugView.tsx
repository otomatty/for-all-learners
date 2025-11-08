"use client";

import {
	Activity,
	AlertCircle,
	Calendar,
	Clock,
	Cog,
	Database,
	Trash2,
	Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	clearPluginErrors,
	clearPluginLogs,
	type PluginDebugInfo,
} from "@/lib/plugins/debug-tools";

interface PluginDebugViewProps {
	debugInfo: PluginDebugInfo;
}

/**
 * Plugin Debug View Component
 *
 * Displays debug information for a single plugin.
 */
export function PluginDebugView({ debugInfo }: PluginDebugViewProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const { plugin, metrics, logs, errors, registryState, configInfo } =
		debugInfo;

	const handleClearLogs = () => {
		startTransition(async () => {
			try {
				clearPluginLogs(plugin.manifest.id);
				toast.success("ログをクリアしました");
				router.refresh();
			} catch (_error) {
				toast.error("ログのクリアに失敗しました");
			}
		});
	};

	const handleClearErrors = () => {
		startTransition(async () => {
			try {
				clearPluginErrors(plugin.manifest.id);
				toast.success("エラーをクリアしました");
				router.refresh();
			} catch (_error) {
				toast.error("エラーのクリアに失敗しました");
			}
		});
	};

	const formatTimestamp = (date: Date): string => {
		return new Date(date).toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	const formatDuration = (ms: number): string => {
		if (ms < 1000) return `${ms}ms`;
		if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
		return `${(ms / 60000).toFixed(1)}min`;
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="flex items-center gap-2">
							{plugin.manifest.name}
							{plugin.enabled ? (
								<Badge variant="default" className="bg-green-600">
									有効
								</Badge>
							) : (
								<Badge variant="secondary">無効</Badge>
							)}
							{plugin.error && (
								<Badge variant="destructive">
									<AlertCircle className="h-3 w-3 mr-1" />
									エラー
								</Badge>
							)}
						</CardTitle>
						<p className="text-sm text-muted-foreground mt-1">
							{plugin.manifest.id} v{plugin.manifest.version}
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Tabs defaultValue="metrics" className="w-full">
					<TabsList className="grid w-full grid-cols-5">
						<TabsTrigger value="metrics">
							<Activity className="h-4 w-4 mr-2" />
							パフォーマンス
						</TabsTrigger>
						<TabsTrigger value="registry">
							<Database className="h-4 w-4 mr-2" />
							レジストリ
						</TabsTrigger>
						<TabsTrigger value="config">
							<Cog className="h-4 w-4 mr-2" />
							設定
						</TabsTrigger>
						<TabsTrigger value="logs">ログ ({logs.length})</TabsTrigger>
						<TabsTrigger value="errors">
							<AlertCircle className="h-4 w-4 mr-2" />
							エラー ({errors.length})
						</TabsTrigger>
					</TabsList>

					<TabsContent value="metrics" className="space-y-4">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground flex items-center gap-1">
									<Clock className="h-3 w-3" />
									読み込み時間
								</div>
								<div className="text-2xl font-bold">
									{formatDuration(metrics.loadTime)}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground flex items-center gap-1">
									<Zap className="h-3 w-3" />
									実行時間
								</div>
								<div className="text-2xl font-bold">
									{formatDuration(metrics.totalExecutionTime)}
								</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">API呼び出し</div>
								<div className="text-2xl font-bold">{metrics.apiCallCount}</div>
							</div>
							<div className="space-y-1">
								<div className="text-sm text-muted-foreground">エラー数</div>
								<div className="text-2xl font-bold text-red-600">
									{metrics.errorCount}
								</div>
							</div>
						</div>
						<div className="text-sm text-muted-foreground">
							最終活動: {formatTimestamp(metrics.lastActivityTime)}
						</div>
					</TabsContent>

					<TabsContent value="logs" className="space-y-2">
						<div className="flex justify-between items-center">
							<p className="text-sm text-muted-foreground">
								最新{logs.length}件のログ
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={handleClearLogs}
								disabled={isPending || logs.length === 0}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								クリア
							</Button>
						</div>
						<ScrollArea className="h-[400px] rounded-md border p-4">
							{logs.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									ログがありません
								</p>
							) : (
								<div className="space-y-2">
									{logs.map((log, index) => (
										<div
											key={index}
											className="text-sm border-l-2 pl-3 py-1 border-l-muted"
										>
											<div className="flex items-center gap-2 mb-1">
												<Badge
													variant={
														log.level === "error"
															? "destructive"
															: log.level === "warn"
																? "default"
																: "secondary"
													}
													className="text-xs"
												>
													{log.level}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{formatTimestamp(log.timestamp)}
												</span>
											</div>
											<div className="font-mono text-xs">{log.message}</div>
											{log.data && Object.keys(log.data).length > 0 && (
												<pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
													{JSON.stringify(log.data, null, 2)}
												</pre>
											)}
										</div>
									))}
								</div>
							)}
						</ScrollArea>
					</TabsContent>

					<TabsContent value="registry" className="space-y-4">
						<div className="space-y-4">
							{/* Calendar Extensions */}
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Calendar className="h-4 w-4" />
									<h3 className="text-sm font-semibold">カレンダー拡張</h3>
									<Badge variant="secondary">
										{registryState.calendarExtensions.length}件
									</Badge>
								</div>
								{registryState.calendarExtensions.length === 0 ? (
									<p className="text-sm text-muted-foreground pl-6">
										登録されていません
									</p>
								) : (
									<div className="space-y-2 pl-6">
										{registryState.calendarExtensions.map((ext) => (
											<div
												key={ext.extensionId}
												className="p-2 border rounded text-sm"
											>
												<div className="font-medium">{ext.name}</div>
												<div className="text-xs text-muted-foreground">
													ID: {ext.extensionId}
												</div>
												{ext.description && (
													<div className="text-xs text-muted-foreground mt-1">
														{ext.description}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Widgets */}
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Zap className="h-4 w-4" />
									<h3 className="text-sm font-semibold">Widget</h3>
									<Badge variant="secondary">
										{registryState.widgets.length}件
									</Badge>
								</div>
								{registryState.widgets.length === 0 ? (
									<p className="text-sm text-muted-foreground pl-6">
										登録されていません
									</p>
								) : (
									<div className="space-y-2 pl-6">
										{registryState.widgets.map((widget) => (
											<div
												key={widget.widgetId}
												className="p-2 border rounded text-sm"
											>
												<div className="flex items-center gap-2">
													<span className="font-medium">{widget.name}</span>
													{widget.icon && <span>{widget.icon}</span>}
												</div>
												<div className="text-xs text-muted-foreground">
													ID: {widget.widgetId} | 位置: {widget.position} |
													サイズ: {widget.size}
												</div>
												{widget.description && (
													<div className="text-xs text-muted-foreground mt-1">
														{widget.description}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>

							{/* Commands */}
							<div>
								<div className="flex items-center gap-2 mb-2">
									<Cog className="h-4 w-4" />
									<h3 className="text-sm font-semibold">コマンド</h3>
									<Badge variant="secondary">
										{registryState.commands.length}件
									</Badge>
								</div>
								{registryState.commands.length === 0 ? (
									<p className="text-sm text-muted-foreground pl-6">
										登録されていません
									</p>
								) : (
									<div className="space-y-2 pl-6">
										{registryState.commands.map((cmd) => (
											<div
												key={cmd.commandId}
												className="p-2 border rounded text-sm"
											>
												<div className="flex items-center gap-2">
													<span className="font-medium">{cmd.name}</span>
													{cmd.icon && <span>{cmd.icon}</span>}
												</div>
												<div className="text-xs text-muted-foreground">
													ID: {cmd.commandId}
												</div>
												{cmd.description && (
													<div className="text-xs text-muted-foreground mt-1">
														{cmd.description}
													</div>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="config" className="space-y-2">
						{configInfo === null ? (
							<p className="text-sm text-muted-foreground text-center py-8">
								設定情報の取得に失敗しました
							</p>
						) : configInfo.keys.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-8">
								設定がありません
							</p>
						) : (
							<>
								<div className="flex items-center gap-2 mb-4">
									<p className="text-sm text-muted-foreground">
										設定キー: {configInfo.keys.length}件
									</p>
									{configInfo.hasGitHubToken && (
										<Badge variant="default" className="bg-green-600">
											GitHubトークン設定済み
										</Badge>
									)}
								</div>
								<ScrollArea className="h-[400px] rounded-md border p-4">
									<div className="space-y-2">
										{Object.entries(configInfo.config).map(([key, value]) => (
											<div
												key={key}
												className="text-sm border-l-2 pl-3 py-2 border-l-muted"
											>
												<div className="font-medium mb-1">{key}</div>
												<pre className="text-xs mt-1 p-2 bg-muted rounded overflow-x-auto">
													{JSON.stringify(value, null, 2)}
												</pre>
											</div>
										))}
									</div>
								</ScrollArea>
							</>
						)}
					</TabsContent>

					<TabsContent value="errors" className="space-y-2">
						<div className="flex justify-between items-center">
							<p className="text-sm text-muted-foreground">
								最新{errors.length}件のエラー
							</p>
							<Button
								variant="outline"
								size="sm"
								onClick={handleClearErrors}
								disabled={isPending || errors.length === 0}
							>
								<Trash2 className="h-4 w-4 mr-2" />
								クリア
							</Button>
						</div>
						<ScrollArea className="h-[400px] rounded-md border p-4">
							{errors.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-8">
									エラーがありません
								</p>
							) : (
								<div className="space-y-4">
									{errors.map((error, index) => (
										<div
											key={index}
											className="border-l-4 border-l-red-500 pl-4 py-2 bg-red-50 dark:bg-red-950/20 rounded"
										>
											<div className="flex items-center gap-2 mb-2">
												<AlertCircle className="h-4 w-4 text-red-600" />
												<span className="text-sm font-medium text-red-900 dark:text-red-100">
													{error.message}
												</span>
												<span className="text-xs text-muted-foreground">
													{formatTimestamp(error.timestamp)}
												</span>
											</div>
											{error.stack && (
												<pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto font-mono">
													{error.stack}
												</pre>
											)}
										</div>
									))}
								</div>
							)}
						</ScrollArea>
					</TabsContent>
				</Tabs>
			</CardContent>
		</Card>
	);
}
