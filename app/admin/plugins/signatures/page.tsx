import { Suspense } from "react";
import {
	getPluginSignaturesServer,
	getSignatureVerificationLogsServer,
} from "@/lib/services/pluginSignaturesService";
import { PluginSignaturesPageClient } from "./_components/PluginSignaturesPageClient";
import { PluginSignaturesTable } from "./_components/PluginSignaturesTable";
import { SignatureFilters } from "./_components/SignatureFilters";
import { SignatureStatsCards } from "./_components/SignatureStatsCards";
import { SignatureVerificationLogsTable } from "./_components/SignatureVerificationLogsTable";
import { parseSignatureSearchParams } from "./_utils";

interface PluginSignaturesPageProps {
	searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PluginSignaturesPage({
	searchParams,
}: PluginSignaturesPageProps) {
	// 静的エクスポート時はクライアントコンポーネントを使用
	const isStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);
	if (isStaticExport) {
		return <PluginSignaturesPageClient />;
	}

	const resolvedSearchParams = await searchParams;
	const parsedParams = parseSignatureSearchParams(resolvedSearchParams);

	const [pluginsResult, logsResult] = await Promise.all([
		getPluginSignaturesServer({
			page: parsedParams.page,
			limit: parsedParams.limit,
			sortBy: parsedParams.sortBy,
			sortOrder: parsedParams.sortOrder,
			filters: {
				hasSignature: parsedParams.hasSignature,
				algorithm: parsedParams.algorithm,
				searchQuery: parsedParams.searchQuery,
			},
		}),
		getSignatureVerificationLogsServer({
			page: 1,
			limit: 10,
			sortBy: "verified_at",
			sortOrder: "desc",
		}),
	]);

	if (!pluginsResult.success) {
		return (
			<div className="container mx-auto py-8 px-4 md:px-6">
				<p className="text-destructive text-center py-8">
					{pluginsResult.message || "プラグイン署名情報の取得に失敗しました"}
				</p>
			</div>
		);
	}

	const plugins = pluginsResult.plugins || [];
	const totalCount = pluginsResult.totalCount || 0;
	const _totalPages = Math.ceil(totalCount / parsedParams.limit);
	_totalPages;
	const logs = logsResult.logs || [];

	// Calculate stats
	const signedCount = plugins.filter((p) => p.hasSignature).length;
	const unsignedCount = plugins.length - signedCount;
	const ed25519Count = plugins.filter(
		(p) => p.signatureAlgorithm === "ed25519",
	).length;
	const rsaCount = plugins.filter((p) => p.signatureAlgorithm === "rsa").length;

	const stats = {
		totalPlugins: plugins.length,
		signedPlugins: signedCount,
		unsignedPlugins: unsignedCount,
		ed25519Plugins: ed25519Count,
		rsaPlugins: rsaCount,
	};

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
				<Suspense
					fallback={
						<div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
							{[...Array(5)].map((_, i) => (
								<div
									key={i}
									className="p-4 border rounded-lg bg-card animate-pulse"
								>
									<div className="h-4 bg-muted rounded w-1/2 mb-2" />
									<div className="h-8 bg-muted rounded w-1/4" />
								</div>
							))}
						</div>
					}
				>
					<SignatureStatsCards stats={stats} />
				</Suspense>

				<Suspense
					fallback={
						<div className="p-4 border rounded-lg bg-card text-card-foreground">
							フィルターを読み込み中...
						</div>
					}
				>
					<SignatureFilters initialFilters={initialFilters} />
				</Suspense>

				{plugins.length > 0 ? (
					<>
						<Suspense
							fallback={
								<div className="rounded-md border p-8 text-center">
									テーブルを読み込み中...
								</div>
							}
						>
							<PluginSignaturesTable
								plugins={plugins}
								currentSortBy={parsedParams.sortBy}
								currentSortOrder={parsedParams.sortOrder}
							/>
						</Suspense>
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
