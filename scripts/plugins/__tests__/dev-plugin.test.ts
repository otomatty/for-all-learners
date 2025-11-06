/**
 * Dev Plugin Tests
 *
 * Unit tests for the dev-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/dev-plugin.ts
 *   ├─ lib/plugins/plugin-loader/manifest-validator.ts
 *   └─ esbuild (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as manifestValidatorModule from "@/lib/plugins/plugin-loader/manifest-validator";
import type { PluginManifest } from "@/types/plugin";
import { devPlugin } from "../dev-plugin";

// Mock fs operations - use direct mock without hoisting
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockReadFileSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		readFileSync: mockReadFileSync,
		default: {
			existsSync: mockExistsSync,
			readFileSync: mockReadFileSync,
		},
	};
});

// Mock esbuild
const mockBuild = vi.fn().mockResolvedValue({
	dispose: vi.fn().mockResolvedValue(undefined),
});
vi.mock("esbuild", () => ({
	build: mockBuild,
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock manifest validator
vi.mock("@/lib/plugins/plugin-loader/manifest-validator", () => ({
	validateManifest: vi.fn(),
}));

// Mock process.exit and process.on
const mockExit = vi.fn();
const mockOn = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
	on: mockOn,
});

describe("devPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	const validManifest: PluginManifest = {
		id: "com.example.test-plugin",
		name: "Test Plugin",
		version: "1.0.0",
		description: "A test plugin",
		author: "Test Author",
		main: "src/index.ts",
		extensionPoints: {
			editor: false,
			ai: false,
			ui: true,
			dataProcessor: false,
			integration: false,
		},
	};

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		vi.clearAllMocks();
		mockExit.mockClear();
		mockBuild.mockClear();
		mockOn.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("development mode", () => {
		it("should start development mode with watch", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists (exact or kebab-case)
				if (
					path.includes("plugins/examples") &&
					(path.includes("com.example.test-plugin") ||
						path.includes("com-example-test-plugin")) &&
					!path.includes("plugin.json") &&
					!path.includes("src/index.ts")
				) {
					return true;
				}
				// Plugin manifest exists
				if (path.includes("plugin.json")) {
					return true;
				}
				// Entry point exists
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(mockBuild).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					entry: expect.any(String),
					output: expect.any(String),
				}),
				"Starting watch mode build",
			);
		});

		it("should find plugin directory with kebab-case ID", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("com-example-test-plugin")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(mockBuild).toHaveBeenCalled();
		});

		it("should log plugin information", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					name: "Test Plugin",
					version: "1.0.0",
					pluginDir: expect.stringContaining("plugins/examples"),
				}),
				"Plugin info",
			);
		});

		it("should log watch mode instructions", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("Press Ctrl+C to stop");
			expect(infoSpy).toHaveBeenCalledWith("Watching for changes...");
		});

		it("should set up SIGINT handler", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(mockOn).toHaveBeenCalledWith("SIGINT", expect.any(Function));
		});
	});

	describe("error handling", () => {
		it("should exit with error if plugin is not found", async () => {
			mockExistsSync.mockImplementation((_path: string) => {
				// Neither exact match nor kebab-case match exists
				return false;
			});

			try {
				await devPlugin("com.example.non-existent");
			} catch {
				// Expected - process.exit is mocked
			}

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.non-existent",
					searchDir: expect.stringContaining("plugins/examples"),
				}),
				"Plugin not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if manifest file is not found", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists (exact or kebab-case)
				if (
					path.includes("plugins/examples") &&
					(path.includes("com.example.test-plugin") ||
						path.includes("com-example-test-plugin")) &&
					!path.includes("plugin.json")
				) {
					return true;
				}
				// manifest doesn't exist
				if (path.includes("plugin.json")) {
					return false;
				}
				return false;
			});

			// readManifest throws error directly, which propagates
			// Since devPlugin doesn't catch it, the error will be thrown
			await expect(devPlugin("com.example.test-plugin")).rejects.toThrow(
				"Manifest file not found",
			);
		});

		it("should exit with error if manifest validation fails", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: false,
				errors: ["Missing required field: id"],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: ["Missing required field: id"],
				}),
				"Manifest validation errors",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if entry point is not found", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists (exact or kebab-case)
				if (
					path.includes("plugins/examples") &&
					(path.includes("com.example.test-plugin") ||
						path.includes("com-example-test-plugin")) &&
					!path.includes("plugin.json") &&
					!path.includes("src/index.ts")
				) {
					return true;
				}
				// Plugin manifest exists
				if (path.includes("plugin.json")) {
					return true;
				}
				// entry point doesn't exist
				if (path.includes("src/index.ts")) {
					return false;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					entryPoint: expect.stringContaining("src/index.ts"),
				}),
				"Entry point not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("esbuild watch configuration", () => {
		it("should configure esbuild with watch options", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			expect(mockBuild).toHaveBeenCalledWith(
				expect.objectContaining({
					entryPoints: [expect.stringContaining("src/index.ts")],
					bundle: true,
					outfile: expect.stringContaining("dist/index.js"),
					format: "esm",
					platform: "browser",
					target: "es2020",
					sourcemap: true,
					minify: false,
					legalComments: "inline",
					watch: expect.objectContaining({
						onRebuild: expect.any(Function),
					}),
				}),
			);
		});

		it("should log rebuild success", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			// Get the watch callback
			const buildCall = mockBuild.mock.calls[0];
			const watchOptions = buildCall[0] as {
				watch: { onRebuild: (error: unknown) => void };
			};
			const onRebuild = watchOptions.watch.onRebuild;

			// Call rebuild callback with no error
			onRebuild(null);

			expect(infoSpy).toHaveBeenCalledWith("Rebuild completed");
		});

		it("should log rebuild failure", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			// Get the watch callback
			const buildCall = mockBuild.mock.calls[0];
			const watchOptions = buildCall[0] as {
				watch: { onRebuild: (error: unknown) => void };
			};
			const onRebuild = watchOptions.watch.onRebuild;

			// Call rebuild callback with error
			const rebuildError = new Error("Rebuild failed");
			onRebuild(rebuildError);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: rebuildError,
				}),
				"Rebuild failed",
			);
		});
	});

	describe("SIGINT handler", () => {
		it("should dispose build context on SIGINT", async () => {
			const mockDispose = vi.fn().mockResolvedValue(undefined);
			mockBuild.mockResolvedValue({
				dispose: mockDispose,
			} as never);

			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await devPlugin("com.example.test-plugin");

			// Get the SIGINT handler
			const sigintCall = mockOn.mock.calls.find((call) => call[0] === "SIGINT");
			expect(sigintCall).toBeDefined();
			if (!sigintCall) {
				throw new Error("SIGINT handler not found");
			}

			const sigintHandler = sigintCall[1] as () => Promise<void>;
			await sigintHandler();

			expect(infoSpy).toHaveBeenCalledWith("Stopping watch mode...");
			expect(mockDispose).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(0);
		});
	});
});
