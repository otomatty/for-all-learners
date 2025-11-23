import type { NextConfig } from "next";
import withPWA from "next-pwa";
import webpack from "webpack";

// Detect if running in Tauri environment
const _internalHost = process.env.TAURI_DEV_HOST || "localhost";
const isTauriEnv = Boolean(process.env.TAURI_ENV);
const enableStaticExport = Boolean(process.env.ENABLE_STATIC_EXPORT);

// PWA plugin options
// Tauri環境ではService Workerを登録しない（ServiceWorkerProviderで制御）
const pwaOptions = {
	dest: "public",
	register: false, // ServiceWorkerProviderで制御するため無効化
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development" || isTauriEnv,
};

/** @type {NextConfig} */
const nextConfig: NextConfig = {
	// Static export configuration
	// ENABLE_STATIC_EXPORT環境変数が設定されている場合のみ有効化
	// Phase 6: Next.js静的化とTauri統合 (Issue #157)
	...(enableStaticExport && {
		output: "export" as const,
	}),
	images: {
		// Tauri環境では画像最適化を無効化（静的エクスポート時は必須）
		unoptimized: isTauriEnv || enableStaticExport,
		domains: [
			"scrapbox.io",
			"gyazo.com",
			"youtube.com",
			"i.ytimg.com",
			"i.gyazo.com",
			"storage.googleapis.com",
		],
	},
	// Set assetPrefix for proper asset resolution in Tauri production build
	// Note: In development mode, Tauri uses devUrl directly, so assetPrefix is not needed
	// assetPrefix should only be set for static exports (production builds)
	// In dev mode, Next.js dev server handles assets correctly without assetPrefix
	assetPrefix: undefined, // Tauri dev mode uses devUrl, production uses static export
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
