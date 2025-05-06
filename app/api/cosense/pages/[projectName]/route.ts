export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	// URL path から dynamic segment を取得
	const segments = request.nextUrl.pathname.split("/");
	const projectName = decodeURIComponent(segments[segments.length - 1]);

	const apiUrl = `https://scrapbox.io/api/pages/${encodeURIComponent(projectName)}`;
	// Extract Scrapbox session cookie from custom header or fallback to browser cookie
	const scrapboxCookieHeader = request.headers.get("x-scrapbox-cookie");
	// Build cookie header: if manual header provided, prefix connect.sid= if not included
	let cookieHeader = request.headers.get("cookie") || "";
	if (scrapboxCookieHeader) {
		cookieHeader = scrapboxCookieHeader.includes("=")
			? scrapboxCookieHeader
			: `connect.sid=${scrapboxCookieHeader}`;
	}
	try {
		const res = await fetch(apiUrl, { headers: { cookie: cookieHeader } });
		if (!res.ok) {
			const text = await res.text().catch(() => "<no body>");
			return NextResponse.json(
				{ error: `Scrapbox API returned status ${res.status}`, details: text },
				{ status: res.status },
			);
		}
		const data = await res.json();
		return NextResponse.json(data);
	} catch (err) {
		return NextResponse.json(
			{
				error: "Failed to fetch Scrapbox API",
				details: err instanceof Error ? err.message : String(err),
			},
			{ status: 500 },
		);
	}
}
