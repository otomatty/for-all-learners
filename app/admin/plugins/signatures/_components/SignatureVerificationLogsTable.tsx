"use client";

import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { SignatureVerificationLog } from "@/lib/plugins/plugin-signature/types";

interface SignatureVerificationLogsTableProps {
	logs: SignatureVerificationLog[];
}

const resultColors: Record<string, string> = {
	valid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
	invalid: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
	missing:
		"bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
	error:
		"bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const resultLabels: Record<string, string> = {
	valid: "有効",
	invalid: "無効",
	missing: "欠落",
	error: "エラー",
};

export function SignatureVerificationLogsTable({
	logs,
}: SignatureVerificationLogsTableProps) {
	const formatDate = (date: Date) => {
		return date.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
		});
	};

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>検証日時</TableHead>
						<TableHead>プラグインID</TableHead>
						<TableHead>ユーザーID</TableHead>
						<TableHead>検証結果</TableHead>
						<TableHead>エラーメッセージ</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{logs.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={5}
								className="text-center text-muted-foreground"
							>
								検証ログはありません
							</TableCell>
						</TableRow>
					) : (
						logs.map((log) => (
							<TableRow key={log.id}>
								<TableCell className="text-sm">
									{formatDate(log.verifiedAt)}
								</TableCell>
								<TableCell className="font-mono text-sm">
									{log.pluginId}
								</TableCell>
								<TableCell className="font-mono text-sm">
									{log.userId || "-"}
								</TableCell>
								<TableCell>
									<Badge
										className={
											resultColors[log.verificationResult] ||
											"bg-gray-100 text-gray-800"
										}
									>
										{resultLabels[log.verificationResult] ||
											log.verificationResult}
									</Badge>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{log.errorMessage || "-"}
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}
