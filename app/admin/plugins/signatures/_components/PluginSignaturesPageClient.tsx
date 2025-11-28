"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import type {
	PluginSignatureInfo,
	SignatureVerificationLog,
} from "@/lib/plugins/plugin-signature/types";
import {
	type ParsedSignatureSearchParams,
	parseSignatureSearchParams,
} from "../_utils";
import { PluginSignaturesTable } from "./PluginSignaturesTable";
import { SignatureFilters } from "./SignatureFilters";
import { SignatureStatsCards } from "./SignatureStatsCards";
import { SignatureVerificationLogsTable } from "./SignatureVerificationLogsTable";

interface SignatureStats {
	totalPlugins: number;
	signedPlugins: number;
	unsignedPlugins: number;
	ed25519Plugins: number;
	rsaPlugins: number;
}

interface PluginSignaturesResponse {
	plugins: PluginSignatureInfo[];
	totalCount: number;
	stats: SignatureStats;
	logs: SignatureVerificationLog[];
}

/**
 * Plugin Signatures Page Client Component
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this file):
 *   └─ app/admin/plugins/signatures/page.tsx
 *
 * Dependencies (External files that this file imports):
 *   ├─ next/navigation (useSearchParams)
 *   ├─ @tanstack/react-query (useQuery)
 *   └─ components/admin/plugins/signatures/* (Signature components)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/tauri-migration/20250124_01_static-export-client-side-auth-implementation-plan.md
 */
export function PluginSignaturesPageClient() {
	const searchParams = useSearchParams();
	const [parsedParams, setParsedParams] = useState<ParsedSignatureSearchParams>(
		{
			page: 1,
			limit: 50,
			sortBy: "name",
			sortOrder: "asc",
		},
	);

	// URLパラメータから値を取得
	useEffect(() => {
		const params: { [key: string]: string | string[] | undefined } = {};
		searchParams.forEach((value, key) => {
			params[key] = value;
		});
		const parsed = parseSignatureSearchParams(params);
		setParsedParams(parsed);
	}, [searchParams]);

	// 検索APIを呼び出し
	const { data, isLoading, error } = useQuery<PluginSignaturesResponse>({
		queryKey: [
			"plugin-signatures",
			parsedParams.page,
			parsedParams.limit,
			parsedParams.sortBy,
			parsedParams.sortOrder,
			parsedParams.searchQuery,
			parsedParams.hasSignature,
			parsedParams.algorithm,
		],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: parsedParams.page.toString(),
				limit: parsedParams.limit.toString(),
				sortBy: parsedParams.sortBy,
				sortOrder: parsedParams.sortOrder,
			});

			if (parsedParams.searchQuery) {
				params.append("searchQuery", parsedParams.searchQuery);
			}
			if (parsedParams.hasSignature !== undefined) {
				params.append(
					"hasSignature",
					parsedParams.hasSignature ? "true" : "false",
				);
			}
			if (parsedParams.algorithm) {
				params.append("algorithm", parsedParams.algorithm);
			}

			const response = await fetch(
				`/api/admin/plugins/signatures?${params.toString()}`,
			);

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(
					errorData.error ?? "プラグイン署名情報の取得に失敗しました",
				);
			}

			return response.json();
		},
	});

	if (isLoading) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
						プラグイン署名管理
					</h1>
				</div>
				<div className="flex items-center justify-center min-h-screen">
					<div className="text-muted-foreground">読み込み中...</div>
				</div>
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<div className="flex items-center justify-between mb-6">
					<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
						プラグイン署名管理
					</h1>
				</div>
				<p className="text-destructive text-center py-8">
					{error instanceof Error
						? error.message
						: "プラグイン署名情報の取得に失敗しました"}
				</p>
			</div>
		);
	}

	const plugins = data.plugins || [];
	const totalCount = data.totalCount || 0;
	const logs = data.logs || [];

	const initialFilters = {
		searchQuery: parsedParams.searchQuery,
		hasSignature: parsedParams.hasSignature,
		algorithm: parsedParams.algorithm,
	};

	return (
		<div className="container mx-auto py-8 px-4 md:px-6">
			<div className="flex items-center justify-between mb-6">
				<h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
					プラグイン署名管理
				</h1>
			</div>

			<div className="space-y-6">
				<SignatureStatsCards stats={data.stats} />

				<SignatureFilters initialFilters={initialFilters} />

				{plugins.length > 0 ? (
					<>
						<PluginSignaturesTable
							plugins={plugins}
							currentSortBy={parsedParams.sortBy}
							currentSortOrder={parsedParams.sortOrder}
						/>
						<div className="text-sm text-muted-foreground">
							全 {totalCount} 件中{" "}
							{plugins.length > 0
								? (parsedParams.page - 1) * parsedParams.limit + 1
								: 0}{" "}
							- {(parsedParams.page - 1) * parsedParams.limit + plugins.length}{" "}
							件表示
						</div>
					</>
				) : (
					<p className="text-center text-muted-foreground py-8">
						{parsedParams.searchQuery ||
						parsedParams.hasSignature !== undefined ||
						parsedParams.algorithm
							? "指定された条件に一致するプラグインはありません。"
							: "プラグインはまだ登録されていません。"}
					</p>
				)}

				{logs.length > 0 && (
					<div className="space-y-4">
						<h2 className="text-xl font-semibold">最近の検証ログ</h2>
						<SignatureVerificationLogsTable logs={logs} />
					</div>
				)}
			</div>
		</div>
	);
}
