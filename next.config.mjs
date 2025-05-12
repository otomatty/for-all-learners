import path from "node:path";

const nextConfig = {
	images: {
		domains: [
			"scrapbox.io",
			"gyazo.com",
			"youtube.com",
			"i.ytimg.com",
			"i.gyazo.com",
		],
	},
	webpack(config) {
		config.resolve.alias = {
			...(config.resolve.alias || {}),
			"prosemirror-view": path.resolve(
				process.cwd(),
				"node_modules/prosemirror-view",
			),
			"prosemirror-model": path.resolve(
				process.cwd(),
				"node_modules/prosemirror-model",
			),
			"prosemirror-state": path.resolve(
				process.cwd(),
				"node_modules/prosemirror-state",
			),
		};
		return config;
	},
	serverActions: {
		// Increase request body limit for server actions (default 1MB)
		bodySizeLimit: 20 * 1024 * 1024, // 20MB
	},
};

export default nextConfig;
