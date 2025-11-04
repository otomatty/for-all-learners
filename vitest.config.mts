import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "happy-dom",
		setupFiles: ["./vitest.setup.ts"],
		env: {
			ENCRYPTION_KEY:
				"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
		},
		include: ["**/*.test.ts", "**/*.test.tsx"],
		exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "**/build/**"],
		deps: {
			inline: ["@testing-library/react"],
			external: ["jsdom"],
		},
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/**",
				"**/*.config.*",
				"**/*.test.*",
				"**/dist/**",
				"**/.next/**",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 75,
				statements: 80,
			},
		},
		// Test timeout (for async operations)
		testTimeout: 10000,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
		},
	},
});
