"use client";

import { XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useState } from "react";
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

const eventTypes = [
	{ value: "api_call", label: "API呼び出し" },
	{ value: "api_call_failed", label: "API呼び出し失敗" },
	{ value: "rate_limit_violation", label: "レート制限違反" },
	{ value: "execution_timeout", label: "実行タイムアウト" },
	{ value: "storage_access", label: "ストレージアクセス" },
	{ value: "storage_quota_exceeded", label: "ストレージクォータ超過" },
	{ value: "plugin_error", label: "プラグインエラー" },
	{ value: "plugin_terminated", label: "プラグイン終了" },
	{ value: "unauthorized_access_attempt", label: "不正アクセス試行" },
];

const severities = [
	{ value: "low", label: "低" },
	{ value: "medium", label: "中" },
	{ value: "high", label: "高" },
	{ value: "critical", label: "緊急" },
];

interface SecurityAuditLogsFiltersProps {
	initialFilters: {
		searchQuery?: string;
		pluginId?: string;
		userId?: string;
		eventType?: string;
		severity?: "low" | "medium" | "high" | "critical";
	};
}

export function SecurityAuditLogsFilters({
	initialFilters,
}: SecurityAuditLogsFiltersProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const [searchQuery, setSearchQuery] = useState(
		initialFilters.searchQuery || "",
	);
	const [pluginId, setPluginId] = useState(initialFilters.pluginId || "");
	const [userId, setUserId] = useState(initialFilters.userId || "");
	const [eventType, setEventType] = useState(initialFilters.eventType || "");
	const [severity, setSeverity] = useState(initialFilters.severity || "");

	const searchId = useId();
	const pluginIdId = useId();
	const userIdId = useId();
	const eventTypeId = useId();
	const severityId = useId();

	const applyFilters = () => {
		const params = new URLSearchParams(searchParams.toString());
		params.set("page", "1"); // Reset to first page when filters change

		if (searchQuery.trim()) {
			params.set("searchQuery", searchQuery.trim());
		} else {
			params.delete("searchQuery");
		}

		if (pluginId.trim()) {
			params.set("pluginId", pluginId.trim());
		} else {
			params.delete("pluginId");
		}

		if (userId.trim()) {
			params.set("userId", userId.trim());
		} else {
			params.delete("userId");
		}

		if (eventType && eventType !== "") {
			params.set("eventType", eventType);
		} else {
			params.delete("eventType");
		}

		if (severity && severity !== "") {
			params.set("severity", severity);
		} else {
			params.delete("severity");
		}

		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const clearFilters = () => {
		setSearchQuery("");
		setPluginId("");
		setUserId("");
		setEventType("");
		setSeverity("");
		const params = new URLSearchParams();
		params.set("page", "1");
		router.push(`${pathname}?${params.toString()}`, { scroll: false });
	};

	const hasActiveFilters =
		searchQuery.trim() ||
		pluginId.trim() ||
		userId.trim() ||
		eventType ||
		severity;

	useEffect(() => {
		// Sync state with URL params on mount
		setSearchQuery(initialFilters.searchQuery || "");
		setPluginId(initialFilters.pluginId || "");
		setUserId(initialFilters.userId || "");
		setEventType(initialFilters.eventType || "");
		setSeverity(initialFilters.severity || "");
	}, [initialFilters]);

	return (
		<div className="space-y-4 p-4 border rounded-lg bg-card text-card-foreground">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">フィルター</h2>
				{hasActiveFilters && (
					<Button variant="ghost" size="sm" onClick={clearFilters}>
						<XIcon className="mr-2 h-4 w-4" />
						すべてクリア
					</Button>
				)}
			</div>

			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				<div className="space-y-2">
					<Label htmlFor={searchId}>検索</Label>
					<Input
						id={searchId}
						placeholder="プラグインID、イベントタイプで検索..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								applyFilters();
							}
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={pluginIdId}>プラグインID</Label>
					<Input
						id={pluginIdId}
						placeholder="プラグインID..."
						value={pluginId}
						onChange={(e) => setPluginId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								applyFilters();
							}
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={userIdId}>ユーザーID</Label>
					<Input
						id={userIdId}
						placeholder="ユーザーID..."
						value={userId}
						onChange={(e) => setUserId(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								applyFilters();
							}
						}}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor={eventTypeId}>イベントタイプ</Label>
					<Select value={eventType || undefined} onValueChange={setEventType}>
						<SelectTrigger id={eventTypeId}>
							<SelectValue placeholder="すべて" />
						</SelectTrigger>
						<SelectContent>
							{eventTypes.map((type) => (
								<SelectItem key={type.value} value={type.value}>
									{type.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label htmlFor={severityId}>重要度</Label>
					<Select value={severity || undefined} onValueChange={setSeverity}>
						<SelectTrigger id={severityId}>
							<SelectValue placeholder="すべて" />
						</SelectTrigger>
						<SelectContent>
							{severities.map((sev) => (
								<SelectItem key={sev.value} value={sev.value}>
									{sev.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex justify-end">
				<Button onClick={applyFilters}>フィルターを適用</Button>
			</div>
		</div>
	);
}
