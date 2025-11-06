/**
 * Security Check Tests
 *
 * Unit tests for the security-check command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/security-check.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import { securityCheck } from "../security-check";

// Mock fs operations
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockReadFileSync = vi.fn();
	const mockReaddirSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		readFileSync: mockReadFileSync,
		readdirSync: mockReaddirSync,
		default: {
			existsSync: mockExistsSync,
			readFileSync: mockReadFileSync,
			readdirSync: mockReaddirSync,
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

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
});

describe("securityCheck", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let mockReaddirSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;
	let warnSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
		mockReaddirSync = vi.mocked(fsModule.readdirSync);
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

			await expect(securityCheck("com.example.test-plugin")).rejects.toThrow(
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
	});

	describe("dangerous API detection", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return true;
				}
				return false;
			});
			mockReaddirSync.mockReturnValue([
				{
					isFile: () => true,
					name: "index.ts",
				},
			]);
		});

		it("should detect document access", async () => {
			mockReadFileSync.mockReturnValue(
				"const element = document.getElementById('test');",
			);
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(securityCheck("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					issues: expect.arrayContaining([
						expect.objectContaining({
							message: expect.stringContaining("Direct DOM access"),
						}),
					]),
				}),
				"Security issues found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should detect eval usage", async () => {
			mockReadFileSync.mockReturnValue("eval('console.log(1)');");
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(securityCheck("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					issues: expect.arrayContaining([
						expect.objectContaining({
							message: expect.stringContaining("eval()"),
						}),
					]),
				}),
				"Security issues found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should detect fetch usage", async () => {
			mockReadFileSync.mockReturnValue("fetch('https://example.com');");
			// Mock exit to prevent actual exit and stop execution
			mockExit.mockImplementation(() => {
				throw new Error("process.exit called");
			});

			await expect(securityCheck("com.example.test-plugin")).rejects.toThrow(
				"process.exit called",
			);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					issues: expect.arrayContaining([
						expect.objectContaining({
							message: expect.stringContaining("fetch()"),
						}),
					]),
				}),
				"Security issues found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should pass if no dangerous APIs found", async () => {
			mockReadFileSync.mockReturnValue("const x = 1;");

			await securityCheck("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("No dangerous API usage detected");
			expect(mockExit).not.toHaveBeenCalled();
		});

		it("should skip if src directory not found", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return false;
				}
				return false;
			});

			await securityCheck("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith("No dangerous API usage detected");
		});

		it("should find plugin using kebab-case directory", async () => {
			// Mock existsSync to return true for kebab-case path
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("com-example-test-plugin")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				if (path.includes("src")) {
					return false;
				}
				return false;
			});

			await securityCheck("com.example.test-plugin");

			// Should not throw error and should complete successfully
			expect(infoSpy).toHaveBeenCalledWith("No dangerous API usage detected");
		});
	});

	describe("dependency vulnerability check", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return false; // No src directory
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			mockReaddirSync.mockReturnValue([]);
		});

		it("should warn about vulnerable lodash version", async () => {
			mockReadFileSync.mockReturnValue(
				JSON.stringify({
					dependencies: {
						lodash: "3.10.1",
					},
				}),
			);

			await securityCheck("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					vulnerabilities: expect.arrayContaining([
						expect.stringContaining("lodash"),
					]),
				}),
				"Potential vulnerabilities found",
			);
		});

		it("should pass if no vulnerabilities found", async () => {
			mockReadFileSync.mockReturnValue(
				JSON.stringify({
					dependencies: {
						lodash: "4.17.21",
					},
				}),
			);

			await securityCheck("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				"No known vulnerabilities in dependencies",
			);
		});

		it("should skip if package.json not found", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return false;
				}
				if (path.includes("package.json")) {
					return false;
				}
				return false;
			});

			await securityCheck("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				"No known vulnerabilities in dependencies",
			);
		});

		it("should handle invalid package.json structure", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return false;
				}
				if (path.includes("package.json")) {
					return true;
				}
				return false;
			});
			// Return invalid JSON (array instead of object)
			mockReadFileSync.mockReturnValue("[]");

			await securityCheck("com.example.test-plugin");

			expect(warnSpy).toHaveBeenCalledWith("Invalid package.json structure");
			expect(infoSpy).toHaveBeenCalledWith(
				"No known vulnerabilities in dependencies",
			);
		});
	});

	describe("file reading error handling", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				if (path.includes("src")) {
					return true;
				}
				return false;
			});
		});

		it("should handle file read errors gracefully", async () => {
			mockReaddirSync.mockReturnValue([
				{
					isFile: () => true,
					name: "index.ts",
				},
			]);
			mockReadFileSync.mockImplementation(() => {
				throw new Error("Permission denied");
			});

			await securityCheck("com.example.test-plugin");

			// Should not crash, but may log warnings
			expect(warnSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					file: expect.any(String),
					error: expect.any(Error),
				}),
				"Failed to read file for security check",
			);
		});
	});
});
