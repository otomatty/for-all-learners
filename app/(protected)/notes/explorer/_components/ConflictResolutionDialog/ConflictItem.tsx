"use client";

import { CalendarIcon, EditIcon } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ConflictResolution } from "@/hooks/notes/useBatchMovePages";
import type { ConflictInfo } from "@/hooks/notes/useCheckBatchConflicts";
import { ConflictPreview } from "./ConflictPreview";

interface ConflictItemProps {
	conflict: ConflictInfo;
	resolution?: ConflictResolution;
	onResolutionChange: (resolution: ConflictResolution) => void;
}

export function ConflictItem({
	conflict,
	resolution,
	onResolutionChange,
}: ConflictItemProps) {
	const [customTitle, setCustomTitle] = useState("");

	const handleActionChange = (action: ConflictResolution["action"]) => {
		const newResolution: ConflictResolution = {
			pageId: conflict.pageId,
			action,
			newTitle:
				action === "rename"
					? generateAutoTitle()
					: action === "manual-rename"
						? customTitle
						: undefined,
		};
		onResolutionChange(newResolution);
	};

	const handleCustomTitleChange = (title: string) => {
		setCustomTitle(title);
		if (resolution?.action === "manual-rename") {
			onResolutionChange({
				...resolution,
				newTitle: title,
			});
		}
	};

	const generateAutoTitle = () => {
		return `${conflict.pageTitle} (2)`;
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-lg">
					<EditIcon className="h-4 w-4" />
					{conflict.pageTitle}
					<Badge variant="destructive" className="text-xs">
						{conflict.existingPages.length}件の競合
					</Badge>
				</CardTitle>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* 既存ページの一覧 */}
				<div>
					<h4 className="text-sm font-medium mb-2">
						移動先に存在する同名ページ:
					</h4>
					<div className="space-y-2">
						{conflict.existingPages.map((existingPage) => (
							<div
								key={existingPage.id}
								className="flex items-center justify-between p-2 bg-muted rounded-md"
							>
								<div>
									<p className="font-medium">{existingPage.title}</p>
									<div className="flex items-center gap-4 text-xs text-muted-foreground">
										<span className="flex items-center gap-1">
											<CalendarIcon className="h-3 w-3" />
											作成:{" "}
											{new Date(existingPage.createdAt).toLocaleDateString()}
										</span>
										<span className="flex items-center gap-1">
											<CalendarIcon className="h-3 w-3" />
											更新:{" "}
											{new Date(existingPage.updatedAt).toLocaleDateString()}
										</span>
									</div>
								</div>
								{existingPage.preview && (
									<ConflictPreview content={existingPage.preview} />
								)}
							</div>
						))}
					</div>
				</div>

				{/* 解決方法の選択 */}
				<div>
					<h4 className="text-sm font-medium mb-3">解決方法を選択:</h4>
					<RadioGroup
						value={resolution?.action || ""}
						onValueChange={handleActionChange}
					>
						{/* 自動リネーム */}
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="rename" id={`rename-${conflict.pageId}`} />
							<Label htmlFor={`rename-${conflict.pageId}`} className="flex-1">
								<div>
									<p className="font-medium">自動リネーム</p>
									<p className="text-xs text-muted-foreground">
										「{generateAutoTitle()}」として移動
									</p>
								</div>
							</Label>
						</div>

						{/* 手動リネーム */}
						<div className="space-y-2">
							<div className="flex items-center space-x-2">
								<RadioGroupItem
									value="manual-rename"
									id={`manual-rename-${conflict.pageId}`}
								/>
								<Label
									htmlFor={`manual-rename-${conflict.pageId}`}
									className="flex-1"
								>
									<div>
										<p className="font-medium">手動リネーム</p>
										<p className="text-xs text-muted-foreground">
											新しいタイトルを入力
										</p>
									</div>
								</Label>
							</div>
							{resolution?.action === "manual-rename" && (
								<div className="ml-6">
									<Input
										placeholder="新しいタイトルを入力"
										value={customTitle}
										onChange={(e) => handleCustomTitleChange(e.target.value)}
										className="max-w-md"
									/>
								</div>
							)}
						</div>

						{/* 上書き */}
						<div className="flex items-center space-x-2">
							<RadioGroupItem
								value="replace"
								id={`replace-${conflict.pageId}`}
							/>
							<Label htmlFor={`replace-${conflict.pageId}`} className="flex-1">
								<div>
									<p className="font-medium text-destructive">上書き</p>
									<p className="text-xs text-muted-foreground">
										既存のページを削除して移動（元に戻せません）
									</p>
								</div>
							</Label>
						</div>

						{/* スキップ */}
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="skip" id={`skip-${conflict.pageId}`} />
							<Label htmlFor={`skip-${conflict.pageId}`} className="flex-1">
								<div>
									<p className="font-medium">スキップ</p>
									<p className="text-xs text-muted-foreground">
										このページの移動をキャンセル
									</p>
								</div>
							</Label>
						</div>
					</RadioGroup>
				</div>
			</CardContent>
		</Card>
	);
}
