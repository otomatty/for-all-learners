import { getSupabaseMetrics } from "@/app/_actions/supabase_metrics";
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

export async function SupabaseMetrics() {
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
	const fsTotal = findMetric("node_filesystem_size_bytes", { mountpoint: "/" });
	const fsFree = findMetric("node_filesystem_free_bytes", { mountpoint: "/" });

	// Supabase DB 使用量とストレージ使用量を取得
	const dbSize = findMetric("pg_database_size_bytes", { datname: "postgres" });
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
						Available: {memAvailable != null ? formatBytes(memAvailable) : "-"}
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
}
