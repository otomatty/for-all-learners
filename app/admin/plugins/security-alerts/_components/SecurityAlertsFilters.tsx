"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

interface SecurityAlertsFiltersProps {
	initialFilters: {
		searchQuery?: string;
		status?: "open" | "acknowledged" | "resolved" | "dismissed";
		severity?: "low" | "medium" | "high" | "critical";
		alertType?: string;
		pluginId?: string;
	};
}

export function SecurityAlertsFilters({
	initialFilters,
}: SecurityAlertsFiltersProps) {
	const router = useRouter();
	const searchParams = useSearchParams();

	const [searchQuery, setSearchQuery] = useState(
		initialFilters.searchQuery || "",
	);
	const [status, setStatus] = useState<
		"open" | "acknowledged" | "resolved" | "dismissed" | undefined
	>(initialFilters.status);
	const [severity, setSeverity] = useState<
		"low" | "medium" | "high" | "critical" | undefined
	>(initialFilters.severity);
	const [alertType, setAlertType] = useState(
		initialFilters.alertType || undefined,
	);
	const [pluginId, setPluginId] = useState(
		initialFilters.pluginId || undefined,
	);

	const applyFilters = () => {
		const params = new URLSearchParams();
		params.set("page", "1");

		if (searchQuery.trim()) {
			params.set("searchQuery", searchQuery.trim());
		}
		if (status) {
			params.set("status", status);
		}
		if (severity) {
			params.set("severity", severity);
		}
		if (alertType) {
			params.set("alertType", alertType);
		}
		if (pluginId) {
			params.set("pluginId", pluginId);
		}

		router.push(`?${params.toString()}`, { scroll: false });
	};

	const clearFilters = () => {
		setSearchQuery("");
		setStatus(undefined);
		setSeverity(undefined);
		setAlertType(undefined);
		setPluginId(undefined);
		router.push("?", { scroll: false });
	};

	const hasActiveFilters =
		searchQuery.trim() ||
		status !== undefined ||
		severity !== undefined ||
		alertType !== undefined ||
		pluginId !== undefined;

	return (
		<div className="p-4 border rounded-lg bg-card">
			<div className="grid gap-4 grid-cols-1 md:grid-cols-5">
				<div className="space-y-2">
					<Label htmlFor="search">検索</Label>
					<div className="relative">
						<Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							id="search"
							placeholder="タイトル、説明、プラグインID..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									applyFilters();
								}
							}}
							className="pl-8"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="status">ステータス</Label>
					<Select
						value={status === undefined ? "all" : status}
						onValueChange={(value) => {
							if (value === "all") {
								setStatus(undefined);
							} else {
								setStatus(
									value as
										| "open"
										| "acknowledged"
										| "resolved"
										| "dismissed",
								);
							}
						}}
					>
						<SelectTrigger id="status">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							<SelectItem value="open">未対応</SelectItem>
							<SelectItem value="acknowledged">対応中</SelectItem>
							<SelectItem value="resolved">解決済み</SelectItem>
							<SelectItem value="dismissed">却下</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="severity">重要度</Label>
					<Select
						value={severity === undefined ? "all" : severity}
						onValueChange={(value) => {
							if (value === "all") {
								setSeverity(undefined);
							} else {
								setSeverity(
									value as "low" | "medium" | "high" | "critical",
								);
							}
						}}
					>
						<SelectTrigger id="severity">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							<SelectItem value="critical">緊急</SelectItem>
							<SelectItem value="high">高</SelectItem>
							<SelectItem value="medium">中</SelectItem>
							<SelectItem value="low">低</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="alertType">アラートタイプ</Label>
					<Select
						value={alertType === undefined ? "all" : alertType}
						onValueChange={(value) => {
							if (value === "all") {
								setAlertType(undefined);
							} else {
								setAlertType(value);
							}
						}}
					>
						<SelectTrigger id="alertType">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">すべて</SelectItem>
							<SelectItem value="rate_limit_spike">
								レート制限急増
							</SelectItem>
							<SelectItem value="signature_failure_spike">
								署名検証失敗急増
							</SelectItem>
							<SelectItem value="execution_timeout_spike">
								実行タイムアウト急増
							</SelectItem>
							<SelectItem value="storage_quota_spike">
								ストレージクォータ急増
							</SelectItem>
							<SelectItem value="unauthorized_access_spike">
								不正アクセス試行急増
							</SelectItem>
							<SelectItem value="api_call_anomaly">
								API呼び出し異常
							</SelectItem>
							<SelectItem value="plugin_error_spike">
								プラグインエラー急増
							</SelectItem>
							<SelectItem value="critical_severity_event">
								緊急重要度イベント
							</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor="pluginId">プラグインID</Label>
					<Input
						id="pluginId"
						placeholder="プラグインID..."
						value={pluginId || ""}
						onChange={(e) => setPluginId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								applyFilters();
							}
						}}
					/>
				</div>
			</div>

			<div className="flex gap-2 mt-4">
				<Button onClick={applyFilters} size="sm">
					フィルター適用
				</Button>
				{hasActiveFilters && (
					<Button
						onClick={clearFilters}
						variant="outline"
						size="sm"
						className="gap-1"
					>
						<X className="h-3 w-3" />
						クリア
					</Button>
				)}
			</div>
		</div>
	);
}

