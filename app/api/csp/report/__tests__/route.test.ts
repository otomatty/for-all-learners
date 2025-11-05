/**
 * CSP Violation Report Endpoint Tests
 *
 * Unit tests for CSP violation report endpoint.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import { POST } from "../route";

describe("CSP Violation Report Endpoint", () => {
	let warnSpy: any;
	let errorSpy: any;

	beforeEach(() => {
		warnSpy = vi.spyOn(loggerModule.default, "warn");
		errorSpy = vi.spyOn(loggerModule.default, "error");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("POST /api/csp/report", () => {
		it("should accept valid CSP violation report", async () => {
			const validReport = {
				"csp-report": {
					"document-uri": "https://example.com/page",
					"violated-directive": "script-src",
					"blocked-uri": "https://evil.com/script.js",
					"line-number": 10,
					"column-number": 5,
				},
			};

			const request = new Request("http://localhost/api/csp/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(validReport),
			});

			const response = await POST(request as any);

			expect(response.status).toBe(204);
			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					violatedDirective: "script-src",
					blockedUri: "https://evil.com/script.js",
				}),
				"CSP violation detected",
			);
		});

		it("should handle invalid report format", async () => {
			const invalidReport = {
				invalid: "format",
			};

			const request = new Request("http://localhost/api/csp/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(invalidReport),
			});

			const response = await POST(request as any);

			expect(response.status).toBe(400);
			const json = await response.json();
			expect(json.error).toBe("Invalid CSP violation report format");
		});

		it("should handle JSON parsing errors gracefully", async () => {
			const request = new Request("http://localhost/api/csp/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "invalid json",
			});

			const response = await POST(request as any);

			// Should return 204 even on error to prevent retries
			expect(response.status).toBe(204);
			expect(errorSpy).toHaveBeenCalled();
		});

		it("should log all violation report fields", async () => {
			const fullReport = {
				"csp-report": {
					"document-uri": "https://example.com/page",
					referrer: "https://example.com/",
					"violated-directive": "script-src",
					"effective-directive": "script-src",
					"original-policy": "script-src 'self'",
					"blocked-uri": "https://evil.com/script.js",
					"status-code": 200,
					"source-file": "https://example.com/page",
					"line-number": 10,
					"column-number": 5,
					"script-sample": "alert('xss')",
				},
			};

			const request = new Request("http://localhost/api/csp/report", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(fullReport),
			});

			await POST(request as any);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					violatedDirective: "script-src",
					effectiveDirective: "script-src",
					blockedUri: "https://evil.com/script.js",
					documentUri: "https://example.com/page",
					sourceFile: "https://example.com/page",
					lineNumber: 10,
					columnNumber: 5,
					statusCode: 200,
					scriptSample: "alert('xss')",
				}),
				"CSP violation detected",
			);
		});
	});
});
