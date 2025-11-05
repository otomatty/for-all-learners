/**
 * Test Plugin Tests
 *
 * Unit tests for the test-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/test-plugin.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import { testPlugin } from "../test-plugin";

// Mock fs operations - use direct mock without hoisting
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		default: {
			existsSync: mockExistsSync,
		},
	};
});

// Mock child_process
vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
});

describe("testPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockExecSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
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
		mockExecSync.mockReturnValue(Buffer.from(""));
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("test execution", () => {
		it("should run tests for plugin", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples/com-example-test-plugin")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true; // Test directory exists
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx vitest run",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "inherit",
				}),
			);
			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("Tests completed"),
			);
		});

		it("should find plugin directory with kebab-case ID", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("com-example-test-plugin")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalled();
		});

		it("should log plugin directory", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginDir: expect.stringContaining("plugins/examples"),
				}),
				"Plugin directory",
			);
		});

		it("should log test execution start", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("Running tests with Vitest...");
		});
	});

	describe("error handling", () => {
		it("should exit with error if plugin is not found", async () => {
			mockExistsSync.mockImplementation((_path: string) => {
				// Neither exact match nor kebab-case match exists
				// Return false for all paths to simulate plugin not found
				return false;
			});

			// process.exit is mocked, so we need to catch the error or handle it differently
			// Since process.exit(1) is called, the function will exit before throwing
			// We'll just verify the error log and exit call
			try {
				await testPlugin("com.example.non-existent");
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

		it("should exit with success if test directory does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				// Plugin directory exists
				if (path.includes("plugins/examples") && !path.includes("__tests__")) {
					return true;
				}
				// Test directory doesn't exist
				if (path.includes("__tests__")) {
					return false;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					testDir: expect.stringContaining("__tests__"),
				}),
				"No tests found",
			);
			expect(infoSpy).toHaveBeenCalledWith(
				"Create tests in __tests__ directory to run tests",
			);
			expect(mockExit).toHaveBeenCalledWith(0);
		});

		it("should exit with error if test execution fails", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});
			mockExecSync.mockImplementation(() => {
				throw new Error("Test execution failed");
			});

			await testPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					error: expect.any(Error),
				}),
				"Test execution failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should log error details if test execution fails", async () => {
			const testError = new Error("Test execution failed");
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});
			mockExecSync.mockImplementation(() => {
				throw testError;
			});

			await testPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					message: "Test execution failed",
				}),
				"Error details",
			);
		});
	});

	describe("vitest configuration", () => {
		it("should run vitest with correct command", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx vitest run",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "inherit",
				}),
			);
		});

		it("should set correct working directory", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples/com-example-test-plugin")) {
					return true;
				}
				if (path.includes("__tests__")) {
					return true;
				}
				return false;
			});

			await testPlugin("com.example.test-plugin");

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx vitest run",
				expect.objectContaining({
					cwd: expect.stringContaining("com-example-test-plugin"),
				}),
			);
		});
	});
});
