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
 *   └─ Web Crypto API (Edge Runtime compatible)
 *
 * Related Documentation:
 *   └─ Issue #96: Plugin System Security Enhancement
 */

/**
 * Generate a cryptographically secure random nonce
 * Uses Web Crypto API for Edge Runtime compatibility
 * @param length - Length of the nonce in bytes (default: 16)
 * @returns Base64-encoded nonce string
 */
export function generateNonce(length = 16): string {
	// Use Web Crypto API for Edge Runtime compatibility
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);

	// Convert Uint8Array to base64 string
	// Edge Runtime compatible: use btoa with binary string conversion
	// Use loop instead of spread operator to avoid stack overflow with large arrays
	let binaryString = "";
	for (let i = 0; i < array.length; i++) {
		binaryString += String.fromCharCode(array[i]);
	}
	return btoa(binaryString);
}

/**
 * Build CSP header string
 * @param _nonce - Nonce value (currently unused, kept for future use)
 * @param requestHost - Optional request host header to detect Tauri dev mode
 * @returns CSP header string
 */
export function buildCSPHeader(
	_nonce: string,
	requestHost?: string | null,
): string {
	// In development, allow unsafe-inline for easier debugging
	// In production, we rely on nonce for custom scripts but allow unsafe-inline for Next.js auto-generated scripts
	const isDevelopment = process.env.NODE_ENV === "development";
	// Detect if running in Tauri development mode
	// Tauri dev mode uses HTTP (http://localhost:3000), so we need to allow HTTP resources
	// Check both environment variable and request host header
	const isTauriDev =
		Boolean(process.env.TAURI_ENV) ||
		Boolean(process.env.TAURI_DEV_HOST) ||
		(requestHost?.includes("localhost") && isDevelopment);

	// Note: When nonce is present, 'unsafe-inline' is ignored by CSP spec
	// For Next.js compatibility, we need to allow 'unsafe-inline' without nonce
	// So we use 'unsafe-inline' for script-src and style-src, and keep nonce for future use
	// In Tauri dev mode, allow HTTP localhost for all resources
	const httpLocalhost = isTauriDev ? " http://localhost:3000" : "";

	const cspDirectives = [
		// Default source: self, and HTTP localhost in Tauri dev mode
		`default-src 'self'${httpLocalhost}`,
		// Script sources: self, blob (for plugin code), and unsafe-inline for Next.js auto-generated scripts
		// Note: Next.js generates inline scripts for hydration that don't have nonces
		// We use 'unsafe-inline' instead of nonce for Next.js compatibility
		`script-src 'self' 'unsafe-inline' blob:${httpLocalhost}${isDevelopment ? " 'unsafe-eval'" : ""}`,
		// Worker sources: self and blob (for plugin Web Workers)
		`worker-src 'self' blob:${httpLocalhost}`,
		// Connect sources: self, Supabase, and GitHub REST API for commit activity
		// In Tauri dev mode, allow HTTP localhost for development server
		`connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co https://api.github.com${httpLocalhost}`,
		// Style sources: self, unsafe-inline for Next.js auto-generated styles, and external CDNs
		// Note: Next.js injects styles dynamically without nonces
		// Also allows style attributes (inline styles) which are commonly used by React/Radix UI
		// In Tauri dev mode, allow HTTP localhost for CSS files
		`style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${httpLocalhost}`,
		// Image sources: self, data URIs, HTTPS, and blob (for plugin-generated images)
		// In Tauri dev mode, allow HTTP localhost for images
		`img-src 'self' data: https: blob:${httpLocalhost}`,
		// Font sources: self, data URIs, Google Fonts (for next/font/google), and jsDelivr (for KaTeX fonts)
		// In Tauri dev mode, allow HTTP localhost for fonts
		`font-src 'self' data: https://fonts.gstatic.com https://cdn.jsdelivr.net${httpLocalhost}`,
		// Frame sources: self only
		`frame-src 'self'${httpLocalhost}`,
		// Object sources: none (prevent Flash/Java)
		"object-src 'none'",
		// Base URI: self only
		`base-uri 'self'${httpLocalhost}`,
		// Form action: self only
		`form-action 'self'${httpLocalhost}`,
		// Frame ancestors: none (prevent clickjacking)
		"frame-ancestors 'none'",
		// Upgrade insecure requests
		// In Tauri dev mode, disable upgrade-insecure-requests to allow HTTP resources
		...(isTauriDev ? [] : ["upgrade-insecure-requests"]),
		// Report CSP violations to our endpoint
		"report-uri /api/csp/report",
	];

	return cspDirectives.join("; ");
}
