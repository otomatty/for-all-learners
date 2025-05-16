import type { NextConfig } from "next";
import withPWA from "next-pwa";
import path from "node:path";

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
};

// Export merged config using PWA plugin
export default withPWA(pwaOptions)(nextConfig);
