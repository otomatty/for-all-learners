/**
 * Content Security Policy Utilities
 *
 * Utilities for generating nonces and managing CSP headers.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ middleware.ts
 *
 * Dependencies:
 *   └─ crypto (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

import { randomBytes } from "node:crypto";

/**
 * Generate a cryptographically secure random nonce
 * @param length - Length of the nonce in bytes (default: 16)
 * @returns Base64-encoded nonce string
 */
export function generateNonce(length = 16): string {
	return randomBytes(length).toString("base64");
}

/**
 * Build CSP header string with nonce
 * @param nonce - Nonce value for script-src and style-src
 * @returns CSP header string
 */
export function buildCSPHeader(nonce: string): string {
	const cspDirectives = [
		"default-src 'self'",
		// Script sources: self, blob (for plugin code), and nonce for inline scripts
		// Note: Next.js build scripts are served from 'self' (_next/static)
		`script-src 'self' 'nonce-${nonce}' blob:`,
		// Worker sources: self and blob (for plugin Web Workers)
		"worker-src 'self' blob:",
		// Connect sources: self and Supabase
		"connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co",
		// Style sources: self, nonce (for inline styles), and external CDNs
		// Note: Next.js injects styles dynamically, so nonce is needed
		`style-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
		// Image sources: self, data URIs, HTTPS, and blob (for plugin-generated images)
		"img-src 'self' data: https: blob:",
		// Font sources: self and data URIs
		"font-src 'self' data:",
		// Frame sources: self only
		"frame-src 'self'",
		// Object sources: none (prevent Flash/Java)
		"object-src 'none'",
		// Base URI: self only
		"base-uri 'self'",
		// Form action: self only
		"form-action 'self'",
		// Frame ancestors: none (prevent clickjacking)
		"frame-ancestors 'none'",
		// Upgrade insecure requests
		"upgrade-insecure-requests",
		// Report CSP violations to our endpoint
		"report-uri /api/csp/report",
	];

	return cspDirectives.join("; ");
}
