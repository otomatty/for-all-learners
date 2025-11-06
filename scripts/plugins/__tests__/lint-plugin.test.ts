/**
 * Lint Plugin Tests
 *
 * Unit tests for the lint-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/lint-plugin.ts
 *   └─ vitest (runtime dependency)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { execSync } from "node:child_process";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import { lintPlugin } from "../lint-plugin";

// Mock fs operations
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

// Mock process.exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
});

describe("lintPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockExecSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

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

			await lintPlugin("com.example.test-plugin");

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
				if (path.includes("src")) {
					return true;
				}
				return false;
			});

			await lintPlugin("com.example.test-plugin");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({ pluginDir: expect.stringContaining("com-example-test-plugin") }),
				"Plugin directory",
			);
		});
	});

	describe("source directory", () => {
		beforeEach(() => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("plugins/examples")) {
					return true;
				}
				return false;
			});
		});

		it("should exit if src directory not found", async () => {
			await lintPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					srcDir: expect.stringContaining("src"),
				}),
				"Source directory not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("linting", () => {
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

		it("should run linting without fix", async () => {
			await lintPlugin("com.example.test-plugin", false);

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx @biomejs/biome check",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "inherit",
				}),
			);
			expect(infoSpy).toHaveBeenCalledWith("Linting completed");
		});

		it("should run linting with fix", async () => {
			await lintPlugin("com.example.test-plugin", true);

			expect(mockExecSync).toHaveBeenCalledWith(
				"bunx @biomejs/biome check --write",
				expect.objectContaining({
					cwd: expect.stringContaining("plugins/examples"),
					stdio: "inherit",
				}),
			);
			expect(infoSpy).toHaveBeenCalledWith("Code formatting completed");
		});

		it("should exit if linting fails", async () => {
			mockExecSync.mockImplementation(() => {
				throw new Error("Lint error");
			});

			await lintPlugin("com.example.test-plugin");

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({ error: expect.any(Error) }),
				"Linting failed",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});
});

