declare module "next-pwa" {
	import type { NextConfig } from "next";

	/** Plugin options for next-pwa */
	interface PWAConfig {
		dest: string;
		register?: boolean;
		skipWaiting?: boolean;
		disable?: boolean;
	}

	/** Returns a Next.js config enhancer for PWA support */
	function withPWA(options: PWAConfig): (config: NextConfig) => NextConfig;
	export default withPWA;
}
