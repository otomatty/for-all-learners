import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";
import {
	type GetPluginSignaturesOptions,
	getPluginSignaturesServer,
	getSignatureVerificationLogsServer,
} from "@/lib/services/pluginSignaturesService";

/**
 * プラグイン署名情報取得APIエンドポイント
 * GET /api/admin/plugins/signatures
 */
export async function GET(request: NextRequest) {
	try {
		const url = new URL(request.url);
		const page = Number(url.searchParams.get("page")) || 1;
		const limit = Number(url.searchParams.get("limit")) || 50;
		const sortBy =
			(url.searchParams.get("sortBy") as
				| "name"
				| "signature_algorithm"
				| "signed_at") || "name";
		const sortOrder =
			(url.searchParams.get("sortOrder") as "asc" | "desc") || "asc";
		const searchQuery = url.searchParams.get("searchQuery") || undefined;
		const hasSignatureParam = url.searchParams.get("hasSignature");
		const hasSignature =
			hasSignatureParam === "true"
				? true
				: hasSignatureParam === "false"
					? false
					: undefined;
		const algorithm =
			(url.searchParams.get("algorithm") as "ed25519" | "rsa") || undefined;

		const options: GetPluginSignaturesOptions = {
			page,
			limit,
			sortBy,
			sortOrder,
			filters: {
				hasSignature,
				algorithm,
				searchQuery,
			},
		};

		const [pluginsResult, logsResult] = await Promise.all([
			getPluginSignaturesServer(options),
			getSignatureVerificationLogsServer({
				page: 1,
				limit: 10,
				sortBy: "verified_at",
				sortOrder: "desc",
			}),
		]);

		if (!pluginsResult.success) {
			return NextResponse.json(
				{
					error:
						pluginsResult.message || "プラグイン署名情報の取得に失敗しました",
				},
				{ status: 500 },
			);
		}

		const plugins = pluginsResult.plugins || [];
		const totalCount = pluginsResult.totalCount || 0;

		// Calculate stats
		const signedCount = plugins.filter((p) => p.hasSignature).length;
		const unsignedCount = plugins.length - signedCount;
		const ed25519Count = plugins.filter(
			(p) => p.signatureAlgorithm === "ed25519",
		).length;
		const rsaCount = plugins.filter(
			(p) => p.signatureAlgorithm === "rsa",
		).length;

		const stats = {
			totalPlugins: plugins.length,
			signedPlugins: signedCount,
			unsignedPlugins: unsignedCount,
			ed25519Plugins: ed25519Count,
			rsaPlugins: rsaCount,
		};

		return NextResponse.json({
			plugins,
			totalCount,
			stats,
			logs: logsResult.logs || [],
		});
	} catch (error) {
		logger.error({ error }, "Plugin signatures API error");
		return NextResponse.json(
			{ error: "プラグイン署名情報の取得に失敗しました" },
			{ status: 500 },
		);
	}
}
