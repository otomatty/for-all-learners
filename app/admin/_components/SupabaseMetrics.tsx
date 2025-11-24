import { parsePrometheusMetrics } from "@/lib/metricsParser";

/**
 * Supabase Admin APIから取得したメトリクスを表示するカードコンポーネント。
 */

// ヘルパー: バイト数をMB/GB表記に変換し、小数第一位以下を切り捨てる
function formatBytes(bytes: number): string {
	const mb = bytes / 1024 / 1024;
	const gb = mb / 1024;
	if (gb >= 1) {
		return `${Math.floor(gb * 10) / 10} GB`;
	}
	return `${Math.floor(mb * 10) / 10} MB`;
}

/**
 * Supabase Admin APIからメトリクスを取得
 */
async function getSupabaseMetrics(): Promise<string> {
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		throw new Error("Missing Supabase URL or Service Role Key");
	}

	// Extract project ref from Supabase URL
	const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
	if (!projectRef) {
		throw new Error("Invalid Supabase URL format");
	}

	// Call Supabase Admin API metrics endpoint
	const response = await fetch(
		`https://api.supabase.com/v1/projects/${projectRef}/metrics`,
		{
			headers: {
				Authorization: `Bearer ${serviceRoleKey}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch metrics: ${response.statusText}`);
	}

	const data = await response.json();
	// Convert JSON response to Prometheus format if needed
	// For now, return empty string if metrics are not in Prometheus format
	return data.metrics || "";
}

export async function SupabaseMetrics() {
	try {
		// Supabase Privileged MetricsをPrometheusフォーマットで取得
		const metricsText = await getSupabaseMetrics();
		const metrics = parsePrometheusMetrics(metricsText);

		const findMetric = (name: string, filters: Record<string, string>) => {
			const m = metrics.find(
				(x) =>
					x.name === name &&
					Object.entries(filters).every(([k, v]) => x.labels[k] === v),
			);
			return m?.value ?? null;
		};

		const dbConn = findMetric("pgbouncer_databases_current_connections", {
			database: "postgres",
		});
		const dbPool = findMetric("pgbouncer_databases_pool_size", {
			database: "postgres",
		});
		const dbWaiting = findMetric("pgbouncer_pools_client_waiting_connections", {
			database: "postgres",
		});
		const cpuLoad = findMetric("node_load1", {});
		const memTotal = findMetric("node_memory_MemTotal_bytes", {});
		const memAvailable = findMetric("node_memory_MemAvailable_bytes", {});
		const fsTotal = findMetric("node_filesystem_size_bytes", {
			mountpoint: "/",
		});
		const fsFree = findMetric("node_filesystem_free_bytes", {
			mountpoint: "/",
		});

		// Supabase DB 使用量とストレージ使用量を取得
		const dbSize = findMetric("pg_database_size_bytes", {
			datname: "postgres",
		});
		const storageUsageMB = findMetric("storage_storage_size_mb", {});

		const memUsage =
			memTotal && memAvailable
				? (((memTotal - memAvailable) / memTotal) * 100).toFixed(1)
				: null;
		const diskUsage =
			fsTotal && fsFree
				? (((fsTotal - fsFree) / fsTotal) * 100).toFixed(1)
				: null;

		return (
			<div className="p-4 bg-white rounded shadow">
				<h3 className="text-lg font-medium">Supabase サービス概要</h3>
				<div className="grid grid-cols-2 gap-4 mt-4">
					<div>
						<h4 className="text-sm font-semibold">DB 接続</h4>
						<p>Active: {dbConn ?? "-"}</p>
						<p>Pool Size: {dbPool ?? "-"}</p>
						<p>Waiting: {dbWaiting ?? "-"}</p>
					</div>
					<div>
						<h4 className="text-sm font-semibold">DB 容量</h4>
						<p>{dbSize != null ? formatBytes(dbSize) : "-"}</p>
					</div>
					<div>
						<h4 className="text-sm font-semibold">CPU Load (1m)</h4>
						<p>{cpuLoad ?? "-"}</p>
					</div>
					<div>
						<h4 className="text-sm font-semibold">Storage 使用量</h4>
						<p>
							{storageUsageMB != null
								? formatBytes(storageUsageMB * 1024 * 1024)
								: "-"}
						</p>
					</div>
					<div>
						<h4 className="text-sm font-semibold">メモリ使用率</h4>
						<p>Total: {memTotal != null ? formatBytes(memTotal) : "-"}</p>
						<p>
							Available:{" "}
							{memAvailable != null ? formatBytes(memAvailable) : "-"}
						</p>
						<p>Usage: {memUsage ? `${memUsage}%` : "-"}</p>
					</div>
					<div>
						<h4 className="text-sm font-semibold">ディスク使用率</h4>
						<p>Total: {fsTotal != null ? formatBytes(fsTotal) : "-"}</p>
						<p>Free: {fsFree != null ? formatBytes(fsFree) : "-"}</p>
						<p>Usage: {diskUsage ? `${diskUsage}%` : "-"}</p>
					</div>
				</div>
			</div>
		);
	} catch (error) {
		return (
			<div className="p-4 bg-white rounded shadow">
				<h3 className="text-lg font-medium">Supabase サービス概要</h3>
				<p className="text-sm text-muted-foreground mt-4">
					メトリクスの取得に失敗しました:{" "}
					{error instanceof Error ? error.message : "Unknown error"}
				</p>
			</div>
		);
	}
}
