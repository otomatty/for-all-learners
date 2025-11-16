import type { NextConfig } from "next";
import withPWA from "next-pwa";
import webpack from "webpack";

// Detect if running in Tauri environment
const internalHost = process.env.TAURI_DEV_HOST || "localhost";

// PWA plugin options
const pwaOptions = {
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
};

/** @type {NextConfig} */
const nextConfig: NextConfig = {
	// NOTE: Static export (output: "export") is NOT used for now
	// Current app structure uses Server Actions, middleware, and server-side auth
	// Will gradually migrate to client-side in Phase 1-6 of Tauri migration
	// For now, Tauri runs Next.js dev server internally
	images: {
		// Keep image optimization enabled for better performance
		unoptimized: false,
		domains: [
			"scrapbox.io",
			"gyazo.com",
			"youtube.com",
			"i.ytimg.com",
			"i.gyazo.com",
			"storage.googleapis.com",
		],
	},
	// Set assetPrefix for proper asset resolution in Tauri dev environment
	assetPrefix: process.env.TAURI_ENV
		? `http://${internalHost}:3000`
		: undefined,
	experimental: {
		serverActions: {
			bodySizeLimit: "25mb", // PDF処理用に25MBまで拡張
		},
	},
	webpack: (config, { isServer }) => {
		// Handle node: protocol for Node.js built-in modules
		// Webpack doesn't natively support node: protocol in Node.js 20+
		// Use NormalModuleReplacementPlugin to replace node: prefixed imports
		// This allows us to use node: imports in our code while maintaining compatibility
		config.plugins = config.plugins || [];
		config.plugins.push(
			new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
				resource.request = resource.request.replace(/^node:/, "");
			}),
		);

		// Externalize crypto module for client-side builds
		// crypto is a Node.js built-in module and should not be bundled for client
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				crypto: false,
			};
		}

		return config;
	},
};

// Export merged config using PWA plugin
export default withPWA(pwaOptions)(nextConfig);
