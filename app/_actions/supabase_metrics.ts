"use server";
import { Buffer } from "node:buffer";

/**
 * Server action to fetch Supabase privileged metrics in Prometheus text format.
 */
export async function getSupabaseMetrics(): Promise<string> {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		throw new Error("Missing Supabase URL or Service Role Key");
	}

	// Extract project reference (subdomain)
	const projectRef = new URL(url).hostname.split(".")[0];
	const endpoint = `https://${projectRef}.supabase.co/customer/v1/privileged/metrics`;

	// Build Basic Auth header
	const credentials = Buffer.from(`service_role:${key}`).toString("base64");
	const res = await fetch(endpoint, {
		headers: {
			Authorization: `Basic ${credentials}`,
		},
	});
	if (!res.ok) {
		throw new Error(
			`Failed to fetch privileged metrics: ${res.status} ${res.statusText}`,
		);
	}

	return await res.text();
}
