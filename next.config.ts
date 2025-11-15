import type { NextConfig } from "next";
import withPWA from "next-pwa";
import webpack from "webpack";

// PWA plugin options
const pwaOptions = {
	dest: "public",
	register: true,
	skipWaiting: true,
	disable: process.env.NODE_ENV === "development",
};

/** @type {NextConfig} */
const nextConfig: NextConfig = {
	images: {
		domains: [
			"scrapbox.io",
			"gyazo.com",
			"youtube.com",
			"i.ytimg.com",
			"i.gyazo.com",
			"storage.googleapis.com",
		],
	},
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
