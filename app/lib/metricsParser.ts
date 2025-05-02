// app/lib/metricsParser.ts

/**
 * Represents a single Prometheus metric datapoint with optional labels.
 */
export interface PrometheusMetric {
	/** Metric name, e.g., 'node_memory_Cached_bytes' */
	name: string;
	/** Key-value labels associated with the metric */
	labels: Record<string, string>;
	/** Numeric value of the metric */
	value: number;
}

/**
 * Parses Prometheus text format into an array of PrometheusMetric objects.
 * @param text Raw metrics string from the Prometheus endpoint.
 * @returns Array of parsed metrics.
 */
export function parsePrometheusMetrics(text: string): PrometheusMetric[] {
	const lines = text.split(/\r?\n/);
	const metrics: PrometheusMetric[] = [];
	const lineRegex = /^([^{\s]+)(?:\{([^}]*)\})?\s+(.*)$/;

	for (const line of lines) {
		// Skip comments and empty lines
		if (!line || line.startsWith("#")) continue;
		const match = line.match(lineRegex);
		if (!match) continue;

		const [, name, rawLabels, rawValue] = match;
		const labels: Record<string, string> = {};

		if (rawLabels) {
			// split by comma not within quotes
			const pairs = rawLabels.split(/,(?=\w+=)/);
			for (const pair of pairs) {
				const [key, val] = pair.split("=");
				// remove surrounding quotes from label value
				labels[key] = val.replace(/^"|"$/g, "");
			}
		}

		const value = Number.parseFloat(rawValue);
		if (!Number.isNaN(value)) {
			metrics.push({ name, labels, value });
		}
	}

	return metrics;
}
