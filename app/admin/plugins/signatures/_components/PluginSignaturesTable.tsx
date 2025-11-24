"use client";

import {
	ArrowUpDown,
	CheckCircle2,
	Key,
	PenSquare,
	XCircle,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { PluginSignatureInfo } from "@/lib/plugins/plugin-signature/types";
import { SignPluginDialog } from "./SignPluginDialog";

interface PluginSignaturesTableProps {
	plugins: PluginSignatureInfo[];
	currentSortBy: string;
	currentSortOrder: "asc" | "desc";
}

export function PluginSignaturesTable({
	plugins,
	currentSortBy,
	currentSortOrder,
}: PluginSignaturesTableProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const handleSort = (columnKey: string) => {
		const params = new URLSearchParams(searchParams.toString());
		if (currentSortBy === columnKey) {
			params.set("sortOrder", currentSortOrder === "asc" ? "desc" : "asc");
		} else {
			params.set("sortBy", columnKey);
			params.set("sortOrder", "asc");
		}
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const _formatDate = (date: Date | null) => {
		if (!date) return "-";
		return date.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => handleSort("name")}
								className="h-8 px-2 lg:px-3"
							>
								プラグイン名
								{currentSortBy === "name" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>プラグインID</TableHead>
						<TableHead>バージョン</TableHead>
						<TableHead>作者</TableHead>
						<TableHead>署名状態</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => handleSort("signature_algorithm")}
								className="h-8 px-2 lg:px-3"
							>
								アルゴリズム
								{currentSortBy === "signature_algorithm" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>
							<Button
								variant="ghost"
								onClick={() => handleSort("signed_at")}
								className="h-8 px-2 lg:px-3"
							>
								署名日時
								{currentSortBy === "signed_at" && (
									<ArrowUpDown className="ml-2 h-4 w-4" />
								)}
							</Button>
						</TableHead>
						<TableHead>状態</TableHead>
						<TableHead>操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{plugins.length === 0 ? (
						<TableRow>
							<TableCell
								colSpan={9}
								className="text-center text-muted-foreground"
							>
								プラグインが見つかりませんでした
							</TableCell>
						</TableRow>
					) : (
						plugins.map((plugin) => (
							<PluginSignatureRow key={plugin.pluginId} plugin={plugin} />
						))
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function PluginSignatureRow({ plugin }: { plugin: PluginSignatureInfo }) {
	const [dialogOpen, setDialogOpen] = useState(false);

	const formatDate = (date: Date | null) => {
		if (!date) return "-";
		return date.toLocaleString("ja-JP", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	return (
		<>
			<TableRow>
				<TableCell className="font-medium">{plugin.name}</TableCell>
				<TableCell className="font-mono text-sm">{plugin.pluginId}</TableCell>
				<TableCell>{plugin.version}</TableCell>
				<TableCell>{plugin.author}</TableCell>
				<TableCell>
					{plugin.hasSignature ? (
						<Badge
							variant="outline"
							className="bg-green-50 text-green-700 border-green-200"
						>
							<CheckCircle2 className="mr-1 h-3 w-3" />
							署名済み
						</Badge>
					) : (
						<Badge
							variant="outline"
							className="bg-red-50 text-red-700 border-red-200"
						>
							<XCircle className="mr-1 h-3 w-3" />
							未署名
						</Badge>
					)}
				</TableCell>
				<TableCell>
					{plugin.signatureAlgorithm ? (
						<Badge variant="outline" className="gap-1">
							<Key className="h-3 w-3" />
							{plugin.signatureAlgorithm.toUpperCase()}
						</Badge>
					) : (
						<span className="text-muted-foreground">-</span>
					)}
				</TableCell>
				<TableCell className="text-sm text-muted-foreground">
					{formatDate(plugin.signedAt)}
				</TableCell>
				<TableCell>
					<div className="flex gap-1">
						{plugin.isOfficial && (
							<Badge variant="secondary" className="text-xs">
								公式
							</Badge>
						)}
						{plugin.isReviewed && (
							<Badge variant="secondary" className="text-xs">
								レビュー済み
							</Badge>
						)}
					</div>
				</TableCell>
				<TableCell>
					{!plugin.hasSignature && (
						<Button
							variant="outline"
							size="sm"
							onClick={() => setDialogOpen(true)}
						>
							<PenSquare className="mr-1 h-4 w-4" />
							署名生成
						</Button>
					)}
				</TableCell>
			</TableRow>
			<SignPluginDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				pluginId={plugin.pluginId}
				pluginName={plugin.name}
			/>
		</>
	);
}
