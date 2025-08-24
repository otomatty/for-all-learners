"use client";

import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import type { ProcessingStatusDisplayProps } from "@/types/pdf-card-generator";
import { Clock } from "lucide-react";

export function PdfProcessingStatus({
	status,
	processingResult,
	isVisible,
}: ProcessingStatusDisplayProps) {
	if (!isVisible) {
		return null;
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<Label>処理状況</Label>
				{processingResult.processingTimeMs && (
					<div className="flex items-center gap-1 text-sm text-muted-foreground">
						<Clock className="h-3 w-3" />
						{Math.round(processingResult.processingTimeMs / 1000)}秒
					</div>
				)}
			</div>
			<Progress value={status.progress} className="h-2" />
			<p className="text-sm text-muted-foreground">{status.message}</p>
		</div>
	);
}
