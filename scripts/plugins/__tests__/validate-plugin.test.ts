/**
 * Validate Plugin Tests
 *
 * Unit tests for the validate-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/validate-plugin.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as manifestValidatorModule from "@/lib/plugins/plugin-loader/manifest-validator";
import { validatePlugin } from "../validate-plugin";

// Mock fs operations
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

// Mock child_process
vi.mock("node:child_process", () => {
	const mockExecSync = vi.fn();
	return {
		execSync: mockExecSync,
		default: {
			execSync: mockExecSync,
		},
	};
});

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

describe("validatePlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let mockExecSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;
	let validateManifestSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
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
		validateManifestSpy = vi.spyOn(
			manifestValidatorModule,
			"validateManifest",
		) as unknown as ReturnType<typeof vi.spyOn>;
		vi.clearAllMocks();
		mockExit.mockClear();
		mockExecSync.mockReturnValue(Buffer.from(""));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("plugin directory", () => {
		it("should exit if plugin not found", async () => {
			mockExistsSync.mockReturnValue(false);
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginId: "com.example.test-plugin",
				}),
				"Plugin not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should find plugin directory with kebab-case", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("com-example-test-plugin")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
					return true;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));

			await validatePlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginDir: expect.stringContaining("com-example-test-plugin"),
				}),
				"Plugin directory",
			);
		});
	});

	describe("manifest validation", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
					return true;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
		});

		it("should validate manifest successfully", async () => {
			mockReadFileSync.mockReturnValue(
				JSON.stringify({
					id: "com.example.test-plugin",
					name: "Test Plugin",
					version: "1.0.0",
					author: "Test Author",
					main: "src/index.ts",
				}),
			);
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));

			await validatePlugin("com.example.test-plugin");

			expect(validateManifestSpy).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalledWith("Manifest validation passed");
		});

		it("should handle manifest JSON parse errors", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return "invalid json {";
				}
				return "{}";
			});
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: expect.arrayContaining([
						expect.stringContaining("Invalid JSON in manifest"),
					]),
				}),
				"Manifest validation failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit if manifest validation fails", async () => {
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: false,
				errors: ["Invalid manifest"],
				warnings: [],
			}));
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ errors: ["Invalid manifest"] }),
				"Manifest validation failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should warn if manifest has warnings", async () => {
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: ["Warning message"],
			}));

			await validatePlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({ warnings: ["Warning message"] }),
				"Manifest warnings",
			);
		});

		it("should exit if manifest file not found", async () => {
			// Reset and override mock from beforeEach
			mockExistsSync.mockReset();
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists
				if (
					path.includes("plugins/examples") &&
					!path.includes("plugin.json")
				) {
					return true;
				}
				// plugin.json does not exist
				if (path.includes("plugin.json")) {
					return false;
				}
				return false;
			});
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalled();
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("type checking", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
					return true;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));
		});

		it("should pass type checking", async () => {
			mockExecSync.mockReturnValue(Buffer.from(""));

			await validatePlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx tsc --noEmit",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "pipe",
				}),
			);
			expect(infoSpy).toHaveBeenCalledWith("Type checking passed");
		});

		it("should exit if type checking fails", async () => {
			mockExecSync.mockImplementation(() => {
				throw new Error("Type error");
			});
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: expect.arrayContaining([
						expect.stringContaining("Type error"),
					]),
				}),
				"Type checking failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit if tsconfig.json not found", async () => {
			// Override mock from beforeEach to ensure tsconfig.json is not found
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists
				if (
					path.includes("plugins/examples") &&
					!path.includes("tsconfig.json")
				) {
					return true;
				}
				// plugin.json exists
				if (path.includes("plugin.json")) {
					return true;
				}
				// tsconfig.json does not exist
				if (path.includes("tsconfig.json")) {
					return false;
				}
				return false;
			});
			// Setup required mocks for manifest validation
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));
			mockExecSync.mockReturnValue(Buffer.from(""));
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: expect.arrayContaining([
						expect.stringContaining("tsconfig.json not found"),
					]),
				}),
				"Type checking failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("dependency checking", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
					return true;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						author: "Test Author",
						main: "src/index.ts",
					});
				}
				if (path.includes("package.json")) {
					return JSON.stringify({
						name: "test-plugin",
						version: "1.0.0",
					});
				}
				return "{}";
			});
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));
			mockExecSync.mockReturnValue(Buffer.from(""));
		});

		it("should pass dependency check", async () => {
			await validatePlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("Dependency check passed");
		});

		it("should warn if forbidden dependency in dependencies", async () => {
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return JSON.stringify({
						id: "com.example.test-plugin",
						name: "Test Plugin",
						version: "1.0.0",
						author: "Test Author",
						main: "src/index.ts",
					});
				}
				if (path.includes("package.json")) {
					return JSON.stringify({
						name: "test-plugin",
						version: "1.0.0",
						dependencies: {
							typescript: "^5.0.0",
						},
					});
				}
				return "{}";
			});

			await validatePlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					warnings: expect.arrayContaining([
						expect.stringContaining("typescript should be in devDependencies"),
					]),
				}),
				"Dependency warnings",
			);
		});

		it("should exit if package.json not found", async () => {
			// Override mock from beforeEach to ensure package.json is not found
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists
				if (
					path.includes("plugins/examples") &&
					!path.includes("package.json")
				) {
					return true;
				}
				// plugin.json exists
				if (path.includes("plugin.json")) {
					return true;
				}
				// tsconfig.json exists
				if (path.includes("tsconfig.json")) {
					return true;
				}
				// package.json does not exist
				if (path.includes("package.json")) {
					return false;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue("{}");
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));
			mockExecSync.mockReturnValue(Buffer.from(""));
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: expect.arrayContaining([
						expect.stringContaining("package.json not found"),
					]),
				}),
				"Dependency check failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle package.json parse errors", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("plugin.json")) {
					return true;
				}
				if (path.includes("tsconfig.json")) {
					return true;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			mockReadFileSync.mockImplementation((path: string) => {
				if (path.includes("plugin.json")) {
					return "{}";
				}
				if (path.includes("package.json")) {
					return "invalid json {";
				}
				return "{}";
			});
			validateManifestSpy.mockImplementation(() => ({
				valid: true,
				errors: [],
				warnings: [],
			}));
			mockExecSync.mockReturnValue(Buffer.from(""));
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(validatePlugin("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					errors: expect.arrayContaining([
						expect.stringContaining("Invalid package.json"),
					]),
				}),
				"Dependency check failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});
});
