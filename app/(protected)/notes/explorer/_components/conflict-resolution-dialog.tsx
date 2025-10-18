"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { ConflictInfo, ConflictResolution } from "../types";
import { ConflictItem } from "./conflict-item";

interface ConflictResolutionDialogProps {
	open: boolean;
	conflicts: ConflictInfo[];
	onResolve: (resolutions: ConflictResolution[]) => void;
	onCancel: () => void;
}

export function ConflictResolutionDialog({
	open,
	conflicts,
	onResolve,
	onCancel,
}: ConflictResolutionDialogProps) {
	const [resolutions, setResolutions] = useState<
		Record<string, ConflictResolution>
	>({});

	const handleResolutionChange = (
		pageId: string,
		resolution: ConflictResolution,
	) => {
		setResolutions((prev) => ({
			...prev,
			[pageId]: resolution,
		}));
	};

	const handleResolve = () => {
		const resolutionArray = Object.values(resolutions);
		onResolve(resolutionArray);
		setResolutions({});
	};

	const handleCancel = () => {
		setResolutions({});
		onCancel();
	};

	const isComplete = conflicts.every(
		(conflict) => resolutions[conflict.pageId]?.action,
	);

	return (
		<Dialog open={open} onOpenChange={handleCancel}>
			<DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						同名ページの競合解決
						<Badge variant="secondary">{conflicts.length}件の競合</Badge>
					</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto space-y-4">
					<p className="text-sm text-muted-foreground">
						移動先のノートに同じタイトルのページが存在します。各ページの処理方法を選択してください。
					</p>

					{conflicts.map((conflict, index) => (
						<div key={conflict.pageId}>
							<ConflictItem
								conflict={conflict}
								resolution={resolutions[conflict.pageId]}
								onResolutionChange={(resolution) =>
									handleResolutionChange(conflict.pageId, resolution)
								}
							/>
							{index < conflicts.length - 1 && <Separator className="my-4" />}
						</div>
					))}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						キャンセル
					</Button>
					<Button onClick={handleResolve} disabled={!isComplete}>
						解決して実行 ({Object.keys(resolutions).length}/{conflicts.length})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
