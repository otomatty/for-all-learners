/**
 * サムネイル一括更新管理コンポーネント
 * 管理者向けのサムネイル生成バッチ処理UI
 *
 * @fileoverview 管理者がサムネイル未設定ページを一括更新できるコンポーネント
 * @version 1.0.0
 * @author AI Assistant
 */

"use client";

import {
	type BatchUpdateResult,
	batchUpdateMissingThumbnails,
	batchUpdateUserThumbnails,
	getThumbnailStats,
} from "@/app/_actions/batchUpdateThumbnails";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useCallback, useState } from "react";
import { toast } from "sonner";

/**
 * サムネイル統計情報の型定義
 */
interface ThumbnailStats {
	totalPages: number;
	withThumbnail: number;
	withoutThumbnail: number;
	withImages: number;
}

/**
 * サムネイル一括更新管理コンポーネント
 */
export function ThumbnailBatchUpdate() {
	const [stats, setStats] = useState<ThumbnailStats | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [dryRun, setDryRun] = useState(true);
	const [targetUserId, setTargetUserId] = useState("");
	const [batchLimit, setBatchLimit] = useState(100);
	const [lastResult, setLastResult] = useState<BatchUpdateResult | null>(null);
	const [progress, setProgress] = useState(0);

	/**
	 * 統計情報の取得
	 */
	const loadStats = useCallback(async () => {
		setIsLoading(true);
		try {
			const statsData = await getThumbnailStats(targetUserId || undefined);
			setStats(statsData);
			console.log("Thumbnail stats loaded:", statsData);
		} catch (error) {
			console.error("Failed to load thumbnail stats:", error);
			toast.error("統計情報の取得に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [targetUserId]);

	/**
	 * バッチ更新の実行
	 */
	const executeBatchUpdate = useCallback(async () => {
		if (
			!dryRun &&
			!confirm("実際にサムネイルを更新しますか？この操作は取り消せません。")
		) {
			return;
		}

		setIsUpdating(true);
		setProgress(0);
		setLastResult(null);

		try {
			const result = targetUserId
				? await batchUpdateUserThumbnails(targetUserId, dryRun)
				: await batchUpdateMissingThumbnails(undefined, dryRun, batchLimit);

			setLastResult(result);
			setProgress(100);

			const mode = dryRun ? "テスト実行" : "実際の更新";
			const message = `${mode}完了: 成功 ${result.successCount}件, 失敗 ${result.errorCount}件`;

			if (result.errorCount > 0) {
				toast.warning(message);
			} else {
				toast.success(message);
			}

			// 実際に更新した場合は統計を再読み込み
			if (!dryRun && result.successCount > 0) {
				await loadStats();
			}
		} catch (error) {
			console.error("Batch update failed:", error);
			toast.error("バッチ更新に失敗しました");
		} finally {
			setIsUpdating(false);
		}
	}, [dryRun, targetUserId, batchLimit, loadStats]);

	return (
		<div className="space-y-6">
			{/* 統計情報カード */}
			<Card>
				<CardHeader>
					<CardTitle>サムネイル統計</CardTitle>
					<CardDescription>現在のページ数とサムネイル設定状況</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center gap-4 mb-4">
						<div className="flex-1">
							<Label htmlFor="stats-user-id">
								対象ユーザーID (空白で全ユーザー)
							</Label>
							<Input
								id="stats-user-id"
								placeholder="ユーザーIDを入力..."
								value={targetUserId}
								onChange={(e) => setTargetUserId(e.target.value)}
								className="mt-1"
							/>
						</div>
						<Button onClick={loadStats} disabled={isLoading} className="mt-6">
							{isLoading ? "読み込み中..." : "統計を取得"}
						</Button>
					</div>

					{stats && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center p-3 bg-blue-50 rounded-lg">
								<div className="text-2xl font-bold text-blue-600">
									{stats.totalPages}
								</div>
								<div className="text-sm text-blue-600">総ページ数</div>
							</div>
							<div className="text-center p-3 bg-green-50 rounded-lg">
								<div className="text-2xl font-bold text-green-600">
									{stats.withThumbnail}
								</div>
								<div className="text-sm text-green-600">サムネイル設定済み</div>
							</div>
							<div className="text-center p-3 bg-orange-50 rounded-lg">
								<div className="text-2xl font-bold text-orange-600">
									{stats.withoutThumbnail}
								</div>
								<div className="text-sm text-orange-600">サムネイル未設定</div>
							</div>
							<div className="text-center p-3 bg-purple-50 rounded-lg">
								<div className="text-2xl font-bold text-purple-600">
									{stats.withImages}
								</div>
								<div className="text-sm text-purple-600">画像を含む可能性</div>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			<Separator />

			{/* バッチ更新設定カード */}
			<Card>
				<CardHeader>
					<CardTitle>一括更新設定</CardTitle>
					<CardDescription>
						サムネイル未設定ページの一括更新を実行
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* テスト実行モード */}
					<div className="flex items-center space-x-2">
						<Switch id="dry-run" checked={dryRun} onCheckedChange={setDryRun} />
						<Label htmlFor="dry-run">
							テスト実行モード (実際には更新しない)
						</Label>
					</div>

					{/* 処理件数制限 */}
					<div>
						<Label htmlFor="batch-limit">処理対象の最大件数</Label>
						<Input
							id="batch-limit"
							type="number"
							min="1"
							max="1000"
							value={batchLimit}
							onChange={(e) => setBatchLimit(Number(e.target.value))}
							className="mt-1 w-32"
						/>
					</div>

					{/* 実行ボタン */}
					<div className="flex gap-2">
						<Button
							onClick={executeBatchUpdate}
							disabled={isUpdating}
							variant={dryRun ? "outline" : "default"}
							className="flex-1"
						>
							{isUpdating
								? "処理中..."
								: dryRun
									? "テスト実行"
									: "一括更新実行"}
						</Button>
					</div>

					{/* プログレスバー */}
					{isUpdating && (
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span>処理中...</span>
								<span>{progress}%</span>
							</div>
							<Progress value={progress} className="w-full" />
						</div>
					)}
				</CardContent>
			</Card>

			{/* 実行結果カード */}
			{lastResult && (
				<Card>
					<CardHeader>
						<CardTitle>実行結果</CardTitle>
						<CardDescription>最後に実行したバッチ更新の結果</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
							<div className="text-center p-3 bg-blue-50 rounded-lg">
								<div className="text-xl font-bold text-blue-600">
									{lastResult.totalProcessed}
								</div>
								<div className="text-sm text-blue-600">処理対象</div>
							</div>
							<div className="text-center p-3 bg-green-50 rounded-lg">
								<div className="text-xl font-bold text-green-600">
									{lastResult.successCount}
								</div>
								<div className="text-sm text-green-600">成功</div>
							</div>
							<div className="text-center p-3 bg-red-50 rounded-lg">
								<div className="text-xl font-bold text-red-600">
									{lastResult.errorCount}
								</div>
								<div className="text-sm text-red-600">失敗</div>
							</div>
							<div className="text-center p-3 bg-gray-50 rounded-lg">
								<div className="text-xl font-bold text-gray-600">
									{lastResult.processingTimeMs}ms
								</div>
								<div className="text-sm text-gray-600">処理時間</div>
							</div>
						</div>

						{/* 詳細結果（最初の10件） */}
						{lastResult.details.length > 0 && (
							<div className="space-y-2">
								<h4 className="font-semibold">詳細結果 (最初の10件)</h4>
								<div className="max-h-64 overflow-y-auto space-y-1">
									{lastResult.details.slice(0, 10).map((detail) => (
										<div
											key={detail.pageId}
											className={`p-2 rounded text-sm ${
												detail.success
													? "bg-green-50 text-green-800"
													: "bg-red-50 text-red-800"
											}`}
										>
											<div className="font-medium">{detail.title}</div>
											<div className="text-xs">
												{detail.success
													? `✓ ${detail.thumbnailUrl}`
													: `✗ ${detail.error}`}
											</div>
										</div>
									))}
								</div>
								{lastResult.details.length > 10 && (
									<div className="text-sm text-gray-500">
										...他 {lastResult.details.length - 10} 件
									</div>
								)}
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}
