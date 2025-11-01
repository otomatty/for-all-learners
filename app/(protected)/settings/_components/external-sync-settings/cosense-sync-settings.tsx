"use client";

import { RefreshCwIcon, TrashIcon } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
	addUserCosenseProject,
	removeUserCosenseProject,
} from "@/app/_actions/cosense";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";

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
	const [projectToSync, setProjectToSync] = useState<CosenseProject | null>(
		null,
	);
	const [showSyncDialog, setShowSyncDialog] = useState<boolean>(false);
	const [syncError, setSyncError] = useState<string | null>(null);
	const [syncingProjectId, setSyncingProjectId] = useState<string | null>(null);

	const cookieId = useId();
	const projectNameId = useId();

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
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
							<label className="text-sm text-gray-600" htmlFor={cookieId}>
								DevTools → Network → 任意の Scrapbox プライベートページ →
								Request Headers → Cookie → connect.sid の値をコピー
							</label>
							<input
								type="text"
								placeholder="Paste connect.sid value here"
								value={scrapboxCookie}
								onChange={(e) => setScrapboxCookie(e.target.value)}
								className="flex-1 p-2 border rounded"
								id={cookieId}
							/>
						</div>
						{/* プロジェクト名入力 */}
						<div className="flex items-center space-x-2">
							<label htmlFor={projectNameId} className="sr-only">
								プロジェクト名
							</label>
							<input
								type="text"
								id={projectNameId}
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
											rawCookieHeader,
										);
										setProjects((prev) => [...prev, newProj]);
										setNewProjName("");
									} catch (err: unknown) {
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
											<TableCell>
												<Link
													href={`https://scrapbox.io/${proj.project_name}`}
													target="_blank"
													className="text-blue-500 hover:text-blue-600"
												>
													{proj.project_name}
												</Link>
											</TableCell>
											<TableCell>{proj.lastSyncedAt}</TableCell>
											<TableCell>{proj.page_count}</TableCell>
											<TableCell>{proj.accessible ? "有効" : "無効"}</TableCell>
											<TableCell>
												<div className="flex space-x-2">
													<Button
														variant="ghost"
														size="icon"
														onClick={() => {
															setProjectToSync(proj);
															setSyncError(null);
															setShowSyncDialog(true);
														}}
													>
														<RefreshCwIcon
															className={`w-4 h-4 ${syncingProjectId === proj.id ? "animate-spin" : ""}`}
														/>
													</Button>
													<Button
														variant="destructive"
														size="icon"
														onClick={() => {
															setSelectedProject(proj);
															setDeleteError(null);
															setShowDeleteDialog(true);
														}}
													>
														<TrashIcon className="w-4 h-4" />
													</Button>
												</div>
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
								<AlertDialogTitle>プロジェクトを削除する</AlertDialogTitle>
								<AlertDialogDescription>
									{selectedProject?.project_name} のリンクを本当に削除しますか？
									<br />
									この操作は取り消せません。
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
					{/* Sync confirmation dialog */}
					<AlertDialog
						open={showSyncDialog}
						onOpenChange={(open) => {
							if (!open) {
								setShowSyncDialog(false);
								setProjectToSync(null);
							}
						}}
					>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>プロジェクトを同期する</AlertDialogTitle>
								<AlertDialogDescription>
									{projectToSync?.project_name} のページ情報を登録しますか？
									<br />
									この操作を行うと、Cosenseに登録されているページ情報を取得し、F.A.L.のページに追加します。
								</AlertDialogDescription>
								{syncError && (
									<div className="text-red-500">エラー: {syncError}</div>
								)}
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel
									onClick={() => {
										setShowSyncDialog(false);
										setProjectToSync(null);
									}}
								>
									キャンセル
								</AlertDialogCancel>
								<AlertDialogAction
									onClick={async () => {
										if (!projectToSync) {
											setSyncError("プロジェクトが選択されていません");
											return;
										}
										setSyncingProjectId(projectToSync.id);
										try {
											const res = await fetch(
												`/api/cosense/sync/list/${projectToSync.id}`,
											);
											if (!res.ok) {
												const text = await res
													.clone()
													.text()
													.catch(() => "");
												throw new Error(`Sync failed: ${res.status} ${text}`);
											}
											const data = await res.json();
											setProjects((prev) =>
												prev.map((p) =>
													p.id === projectToSync.id
														? {
																...p,
																page_count: data.totalCount,
																lastSyncedAt: data.lastSyncedAt,
															}
														: p,
												),
											);
											toast.success(
												`${projectToSync.project_name} の同期が完了しました`,
											);
											setShowSyncDialog(false);
											setProjectToSync(null);
										} catch (err: unknown) {
											setSyncError(
												err instanceof Error ? err.message : "不明なエラー",
											);
										} finally {
											setSyncingProjectId(null);
										}
									}}
								>
									同期
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</>
			)}
		</div>
	);
}
