/**
 * CSP Utilities Tests
 *
 * Unit tests for CSP utility functions.
 */

import { describe, expect, it } from "vitest";
import { buildCSPHeader, generateNonce } from "../csp";

describe("CSP Utilities", () => {
	describe("generateNonce", () => {
		it("should generate a nonce string", () => {
			const nonce = generateNonce();
			expect(nonce).toBeTypeOf("string");
			expect(nonce.length).toBeGreaterThan(0);
		});

		it("should generate different nonces each time", () => {
			const nonce1 = generateNonce();
			const nonce2 = generateNonce();
			expect(nonce1).not.toBe(nonce2);
		});

		it("should generate nonce with custom length", () => {
			const nonce = generateNonce(32);
			// Base64 encoding: 32 bytes = ~43 characters
			expect(nonce.length).toBeGreaterThan(20);
		});
	});

	describe("buildCSPHeader", () => {
		it("should build CSP header with nonce", () => {
			const nonce = generateNonce();
			const csp = buildCSPHeader(nonce);

			expect(csp).toContain(`'nonce-${nonce}'`);
			expect(csp).toContain("script-src");
			expect(csp).toContain("style-src");
			expect(csp).toContain("report-uri");
		});

		it("should not include unsafe-inline or unsafe-eval", () => {
			const nonce = generateNonce();
			const csp = buildCSPHeader(nonce);

			expect(csp).not.toContain("unsafe-inline");
			expect(csp).not.toContain("unsafe-eval");
		});

		it("should include required directives", () => {
			const nonce = generateNonce();
			const csp = buildCSPHeader(nonce);

			expect(csp).toContain("default-src 'self'");
			expect(csp).toContain("script-src");
			expect(csp).toContain("worker-src");
			expect(csp).toContain("connect-src");
			expect(csp).toContain("style-src");
			expect(csp).toContain("img-src");
			expect(csp).toContain("font-src");
			expect(csp).toContain("frame-src");
			expect(csp).toContain("object-src 'none'");
			expect(csp).toContain("base-uri 'self'");
			expect(csp).toContain("form-action 'self'");
			expect(csp).toContain("frame-ancestors 'none'");
			expect(csp).toContain("upgrade-insecure-requests");
			expect(csp).toContain("report-uri");
		});

		it("should include blob: for plugin system", () => {
			const nonce = generateNonce();
			const csp = buildCSPHeader(nonce);

			expect(csp).toContain("blob:");
			expect(csp).toMatch(/script-src[^;]*blob:/);
			expect(csp).toMatch(/worker-src[^;]*blob:/);
		});

		it("should include Supabase domains in connect-src", () => {
			const nonce = generateNonce();
			const csp = buildCSPHeader(nonce);

			expect(csp).toContain("https://*.supabase.co");
			expect(csp).toContain("https://*.supabase.io");
			expect(csp).toContain("wss://*.supabase.co");
		});
	});
});
