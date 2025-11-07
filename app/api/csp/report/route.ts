/**
 * CSP Violation Report Endpoint
 *
 * Receives and logs Content Security Policy violation reports.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that use this):
 *   └─ Browser (via CSP report-uri directive)
 *
 * Dependencies:
 *   ├─ lib/logger.ts
 *   └─ types/api.ts (if needed)
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import { type NextRequest, NextResponse } from "next/server";
import logger from "@/lib/logger";

/**
 * CSP Violation Report payload structure
 */
interface CSPViolationReport {
	"csp-report": {
		"document-uri"?: string;
		referrer?: string;
		"violated-directive"?: string;
		"effective-directive"?: string;
		"original-policy"?: string;
		"blocked-uri"?: string;
		"status-code"?: number;
		"source-file"?: string;
		"line-number"?: number;
		"column-number"?: number;
		"script-sample"?: string;
	};
}

/**
 * POST /api/csp/report
 *
 * Receives CSP violation reports from browsers and logs them.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
	try {
		const body = (await request.json()) as CSPViolationReport;

		// Extract violation details
		const report = body["csp-report"];
		if (!report) {
			return NextResponse.json(
				{ error: "Invalid CSP violation report format" },
				{ status: 400 },
			);
		}

		// Log CSP violation with structured logging
		logger.warn(
			{
				violatedDirective: report["violated-directive"],
				effectiveDirective: report["effective-directive"],
				blockedUri: report["blocked-uri"],
				documentUri: report["document-uri"],
				sourceFile: report["source-file"],
				lineNumber: report["line-number"],
				columnNumber: report["column-number"],
				statusCode: report["status-code"],
				scriptSample: report["script-sample"],
				originalPolicy: report["original-policy"],
			},
			"CSP violation detected",
		);

		// Return 204 No Content (standard for CSP report endpoints)
		return new NextResponse(null, { status: 204 });
	} catch (error) {
		// Log error but don't expose internal details
		logger.error(
			{ error: error instanceof Error ? error.message : String(error) },
			"Failed to process CSP violation report",
		);

		// Return 204 to prevent retries (violations are logged but not critical)
		return new NextResponse(null, { status: 204 });
	}
}
