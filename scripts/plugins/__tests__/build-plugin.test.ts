/**
 * Build Plugin Tests
 *
 * Unit tests for the build-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/build-plugin.ts
 *   ├─ lib/plugins/plugin-loader/manifest-validator.ts
 *   └─ esbuild (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as manifestValidatorModule from "@/lib/plugins/plugin-loader/manifest-validator";
import type { PluginManifest } from "@/types/plugin";
import { buildPlugin } from "../build-plugin";

// Mock fs operations - use direct mock without hoisting
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockMkdirSync = vi.fn();
	const mockReadFileSync = vi.fn();
	const mockWriteFileSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		mkdirSync: mockMkdirSync,
		readFileSync: mockReadFileSync,
		writeFileSync: mockWriteFileSync,
		default: {
			existsSync: mockExistsSync,
			mkdirSync: mockMkdirSync,
			readFileSync: mockReadFileSync,
			writeFileSync: mockWriteFileSync,
		},
	};
});

// Mock child_process
vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

// Mock esbuild
const mockBuild = vi.fn().mockResolvedValue({});
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

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
});

describe("buildPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockMkdirSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let mockWriteFileSync: ReturnType<typeof vi.fn>;
	let mockExecSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;

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
		mockMkdirSync = vi.mocked(fsModule.mkdirSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
		mockWriteFileSync = vi.mocked(fsModule.writeFileSync);
		mockExecSync = vi.mocked(execSync);
		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		warnSpy = vi.spyOn(loggerModule.default, "warn") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		vi.clearAllMocks();
		mockExit.mockClear();
		mockBuild.mockClear();
		mockExecSync.mockReturnValue(Buffer.from(""));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("plugin building", () => {
		it("should build plugin successfully", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples/com-example-test-plugin")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("src/index.ts")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
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

			await buildPlugin("com.example.test-plugin");

			expect(mockReadFileSync).toHaveBeenCalledWith(
				expect.stringContaining("plugin.json"),
				"utf-8",
			);
			expect(mockBuild).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("Build completed successfully"),
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
				if (path.includes("tsconfig.json")) {
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

			await buildPlugin("com.example.test-plugin");

			expect(mockBuild).toHaveBeenCalled();
		});

		it("should create dist directory if it does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists (exact or kebab-case)
				if (
					path.includes("plugins/examples") &&
					(path.includes("com.example.test-plugin") ||
						path.includes("com-example-test-plugin")) &&
					!path.includes("dist") &&
					!path.includes("plugin.json") &&
					!path.includes("src/index.ts") &&
					!path.includes("tsconfig.json")
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
				// tsconfig.json exists
				if (path.includes("tsconfig.json")) {
					return true;
				}
				// dist directory doesn't exist
				if (path.includes("dist")) {
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

			await buildPlugin("com.example.test-plugin");

			expect(mockMkdirSync).toHaveBeenCalledWith(
				expect.stringContaining("dist"),
				{ recursive: true },
			);
		});

		it("should write updated manifest to dist directory", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await buildPlugin("com.example.test-plugin");

			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.stringContaining("dist/plugin.json"),
				expect.stringContaining("dist/index.js"),
				"utf-8",
			);
		});
	});

	describe("manifest validation", () => {
		it("should validate manifest before building", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await buildPlugin("com.example.test-plugin");

			expect(manifestValidatorModule.validateManifest).toHaveBeenCalledWith(
				validManifest,
			);
		});
	});

	describe("type checking", () => {
		it("should run type check if tsconfig.json exists", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await buildPlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx tsc --noEmit",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "inherit",
				}),
			);
		});

		it("should skip type check if tsconfig.json does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists (exact or kebab-case)
				if (
					path.includes("plugins/examples") &&
					(path.includes("com.example.test-plugin") ||
						path.includes("com-example-test-plugin")) &&
					!path.includes("dist") &&
					!path.includes("plugin.json") &&
					!path.includes("src/index.ts") &&
					!path.includes("tsconfig.json")
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
				// dist directory exists
				if (path.includes("dist")) {
					return true;
				}
				// tsconfig.json doesn't exist
				if (path.includes("tsconfig.json")) {
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

			await buildPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				"tsconfig.json not found, skipping type check",
			);
			expect(mockExecSync).not.toHaveBeenCalled();
		});

		it("should exit with error if type check fails", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});
			mockExecSync.mockImplementation(() => {
				throw new Error("Type check failed");
			});

			await buildPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Error),
				}),
				"Type check failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("error handling", () => {
		it("should exit with error if plugin is not found", async () => {
			mockExistsSync.mockReturnValue(false);

			await buildPlugin("com.example.non-existent");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.non-existent",
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

			await buildPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if manifest is invalid JSON", async () => {
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
				// Plugin manifest exists
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue("invalid json {");

			try {
				await buildPlugin("com.example.test-plugin");
			} catch {
				// Expected - error is thrown by readManifest
			}

			// The error is caught in buildPlugin's try-catch and logged
			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Error),
				}),
				"Build failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
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

			await buildPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: ["Missing required field: id"],
				}),
				"Manifest validation errors",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should warn if manifest has validation warnings", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: ["Optional field recommended: homepage"],
			});

			await buildPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					warnings: ["Optional field recommended: homepage"],
				}),
				"Manifest validation warnings",
			);
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

			await buildPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if build fails", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});
			mockBuild.mockRejectedValue(new Error("Build failed"));

			await buildPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Error),
				}),
				"Build failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("esbuild configuration", () => {
		it("should configure esbuild with correct options", async () => {
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
				if (path.includes("tsconfig.json")) {
					return true;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(JSON.stringify(validManifest));
			vi.mocked(manifestValidatorModule.validateManifest).mockReturnValue({
				valid: true,
				errors: [],
				warnings: [],
			});

			await buildPlugin("com.example.test-plugin");

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
				}),
			);
		});
	});
});
