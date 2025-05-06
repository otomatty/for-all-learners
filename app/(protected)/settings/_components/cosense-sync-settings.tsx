"use client";

import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableHeader,
	TableBody,
	TableRow,
	TableHead,
	TableCell,
} from "@/components/ui/table";
import {
	addUserCosenseProject,
	removeUserCosenseProject,
} from "@/app/_actions/cosense";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogAction,
	AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export interface CosenseProject {
	id: string;
	project_name: string;
	lastSyncedAt: string;
	page_count: number;
	accessible: boolean;
}

interface CosenseSyncSettingsProps {
	initialProjects: CosenseProject[];
	initialEnabled: boolean;
	onEnabledChange?: (enabled: boolean) => void;
}

export default function CosenseSyncSettings({
	initialProjects,
	initialEnabled,
	onEnabledChange,
}: CosenseSyncSettingsProps) {
	const [enabled, setEnabled] = useState<boolean>(initialEnabled);
	const [projects, setProjects] = useState<CosenseProject[]>(initialProjects);
	const [newProjName, setNewProjName] = useState<string>("");
	const [scrapboxCookie, setScrapboxCookie] = useState<string>("");
	const [addError, setAddError] = useState<string | null>(null);
	const [selectedProject, setSelectedProject] = useState<CosenseProject | null>(
		null,
	);
	const [showDeleteDialog, setShowDeleteDialog] = useState<boolean>(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<span className="font-medium">Cosense 同期</span>
				<Switch
					checked={enabled}
					onCheckedChange={(value) => {
						setEnabled(value);
						onEnabledChange?.(value);
					}}
				/>
			</div>
			{enabled && (
				<>
					<div className="mt-4 space-y-4">
						{/* Scrapbox privateプロジェクト用 connect.sid — DevToolsで 'connect.sid' の値を取得 */}
						<div className="flex flex-col space-y-1">
							<label className="text-sm text-gray-600" htmlFor="scrapboxCookie">
								DevTools → Network → 任意の Scrapbox プライベートページ →
								Request Headers → Cookie → connect.sid の値をコピー
							</label>
							<input
								type="text"
								placeholder="Paste connect.sid value here"
								value={scrapboxCookie}
								onChange={(e) => setScrapboxCookie(e.target.value)}
								className="flex-1 p-2 border rounded"
								id="scrapboxCookie"
							/>
						</div>
						{/* プロジェクト名入力 */}
						<div className="flex items-center space-x-2">
							<input
								type="text"
								placeholder="プロジェクト名"
								value={newProjName}
								onChange={(e) => setNewProjName(e.target.value)}
								className="flex-1 p-2 border rounded"
							/>
							<Button
								onClick={async () => {
									setAddError(null);
									try {
										// サーバーサイドのプロキシ経由で Scrapbox API を呼び出す
										const apiUrl = `/api/cosense/pages/${encodeURIComponent(newProjName)}`;
										// Cookie ヘッダー全体をそのまま送信
										const rawCookieHeader = scrapboxCookie.trim();
										const headersToSend = {
											"x-scrapbox-cookie": rawCookieHeader,
										};
										const res = await fetch(apiUrl, {
											method: "GET",
											headers: headersToSend,
										});
										if (!res.ok) {
											// Extract error details for debugging
											let detail: unknown;
											try {
												detail = await res.clone().json();
											} catch {
												detail = await res.text().catch(() => "<no body>");
											}
											throw new Error(
												`Scrapbox API returned status ${res.status}: ${
													typeof detail === "string"
														? detail
														: JSON.stringify(detail)
												}`,
											);
										}
										const dataScrap = await res.json();
										const pageCount =
											typeof dataScrap.count === "number"
												? dataScrap.count
												: Array.isArray(dataScrap.pages)
													? dataScrap.pages.length
													: 0;
										// サーバーアクションに pageCount を渡す
										const newProj = await addUserCosenseProject(
											newProjName,
											pageCount,
										);
										setProjects((prev) => [...prev, newProj]);
										setNewProjName("");
									} catch (err: unknown) {
										console.error("Error in Cosense sync:", err);
										setAddError(
											err instanceof Error ? err.message : "不明なエラー",
										);
									}
								}}
								disabled={!newProjName}
							>
								登録
							</Button>
						</div>
						{addError && <div className="text-red-500">エラー: {addError}</div>}
						{/* プロジェクト一覧 */}
						{projects.length === 0 ? (
							<div>連携されたプロジェクトがありません</div>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>プロジェクト名</TableHead>
										<TableHead>最終同期日時</TableHead>
										<TableHead>ページ数</TableHead>
										<TableHead>状態</TableHead>
										<TableHead>操作</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{projects.map((proj) => (
										<TableRow key={proj.id}>
											<TableCell>{proj.project_name}</TableCell>
											<TableCell>{proj.lastSyncedAt}</TableCell>
											<TableCell>{proj.page_count}</TableCell>
											<TableCell>{proj.accessible ? "有効" : "無効"}</TableCell>
											<TableCell>
												<Button
													variant="destructive"
													size="sm"
													onClick={() => {
														setSelectedProject(proj);
														setDeleteError(null);
														setShowDeleteDialog(true);
													}}
												>
													削除
												</Button>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</div>
					{/* Deletion confirmation dialog */}
					<AlertDialog
						open={showDeleteDialog}
						onOpenChange={(open) => {
							if (!open) {
								setShowDeleteDialog(false);
								setSelectedProject(null);
							}
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>
									プロジェクトを削除しますか？
								</AlertDialogTitle>
								<AlertDialogDescription>
									{selectedProject?.project_name}{" "}
									のリンクを本当に削除しますか？この操作は取り消せません。
								</AlertDialogDescription>
								{deleteError && (
									<div className="text-red-500">エラー: {deleteError}</div>
								)}
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel
									onClick={() => {
										setShowDeleteDialog(false);
										setSelectedProject(null);
									}}
								>
									キャンセル
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={async () => {
										if (selectedProject) {
											try {
												await removeUserCosenseProject(selectedProject.id);
												setProjects((prev) =>
													prev.filter((p) => p.id !== selectedProject.id),
												);
												setShowDeleteDialog(false);
												setSelectedProject(null);
											} catch (err: unknown) {
												console.error(err);
												setDeleteError(
													err instanceof Error ? err.message : "不明なエラー",
												);
											}
										}
									}}
								>
									削除
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			)}
		</div>
	);
}
