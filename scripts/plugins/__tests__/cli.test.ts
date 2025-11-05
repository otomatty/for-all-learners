/**
 * CLI Tests
 *
 * Unit tests for the plugin development CLI tool.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/cli.ts
 *   ├─ scripts/plugins/create-plugin.ts
 *   ├─ scripts/plugins/build-plugin.ts
 *   ├─ scripts/plugins/test-plugin.ts
 *   └─ scripts/plugins/dev-plugin.ts
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import * as buildPluginModule from "../build-plugin";
import { main } from "../cli";
import * as createPluginModule from "../create-plugin";
import * as devPluginModule from "../dev-plugin";
import * as generateTypesModule from "../generate-types";
import * as testPluginModule from "../test-plugin";

// Mock child process exit
const mockExit = vi.fn();
vi.stubGlobal("process", {
	...process,
	exit: mockExit,
	argv: [],
});

// Mock logger
vi.mock("@/lib/logger", () => ({
	default: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
	},
}));

// Mock plugin commands
vi.mock("../create-plugin", () => ({
	createPlugin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../build-plugin", () => ({
	buildPlugin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../test-plugin", () => ({
	testPlugin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../dev-plugin", () => ({
	devPlugin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../generate-types", () => ({
	generateTypes: vi.fn().mockResolvedValue(undefined),
}));

describe("CLI", () => {
	let originalArgv: string[];
	let originalExit: typeof process.exit;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		originalArgv = process.argv;
		originalExit = process.exit;
		process.exit = mockExit as unknown as typeof process.exit;
		infoSpy = vi.spyOn(loggerModule.default, "info") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		errorSpy = vi.spyOn(loggerModule.default, "error") as unknown as ReturnType<
			typeof vi.spyOn
		>;
		vi.clearAllMocks();
		mockExit.mockClear();
	});

	afterEach(() => {
		process.argv = originalArgv;
		process.exit = originalExit;
		vi.restoreAllMocks();
	});

	describe("create command", () => {
		it("should call createPlugin with plugin name", async () => {
			await main("create", ["my-plugin"]);

			expect(createPluginModule.createPlugin).toHaveBeenCalledWith(
				"my-plugin",
				[],
			);
		});

		it("should handle 'new' alias", async () => {
			await main("new", ["my-plugin"]);

			expect(createPluginModule.createPlugin).toHaveBeenCalledWith(
				"my-plugin",
				[],
			);
		});

		it("should exit with error if plugin name is missing", async () => {
			await main("create", []);

			expect(errorSpy).toHaveBeenCalledWith("Error: Plugin name is required");
			expect(infoSpy).toHaveBeenCalledWith(
				"Usage: bun run plugins:create <plugin-name>",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should pass additional args to createPlugin", async () => {
			await main("create", ["my-plugin", "--template=hello-world"]);

			expect(createPluginModule.createPlugin).toHaveBeenCalledWith(
				"my-plugin",
				["--template=hello-world"],
			);
		});
	});

	describe("build command", () => {
		it("should call buildPlugin with plugin ID", async () => {
			await main("build", ["com.example.my-plugin"]);

			expect(buildPluginModule.buildPlugin).toHaveBeenCalledWith(
				"com.example.my-plugin",
			);
		});

		it("should exit with error if plugin ID is missing", async () => {
			await main("build", []);

			expect(errorSpy).toHaveBeenCalledWith("Error: Plugin ID is required");
			expect(infoSpy).toHaveBeenCalledWith(
				"Usage: bun run plugins:build <plugin-id>",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("test command", () => {
		it("should call testPlugin with plugin ID", async () => {
			await main("test", ["com.example.my-plugin"]);

			expect(testPluginModule.testPlugin).toHaveBeenCalledWith(
				"com.example.my-plugin",
			);
		});

		it("should exit with error if plugin ID is missing", async () => {
			await main("test", []);

			expect(errorSpy).toHaveBeenCalledWith("Error: Plugin ID is required");
			expect(infoSpy).toHaveBeenCalledWith(
				"Usage: bun run plugins:test <plugin-id>",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("dev command", () => {
		it("should call devPlugin with plugin ID", async () => {
			await main("dev", ["com.example.my-plugin"]);

			expect(devPluginModule.devPlugin).toHaveBeenCalledWith(
				"com.example.my-plugin",
			);
		});

		it("should exit with error if plugin ID is missing", async () => {
			await main("dev", []);

			expect(errorSpy).toHaveBeenCalledWith("Error: Plugin ID is required");
			expect(infoSpy).toHaveBeenCalledWith(
				"Usage: bun run plugins:dev <plugin-id>",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("generate-types command", () => {
		it("should call generateTypes", async () => {
			await main("generate-types", []);

			expect(generateTypesModule.generateTypes).toHaveBeenCalled();
		});

		it("should not require arguments", async () => {
			await main("generate-types", []);

			expect(generateTypesModule.generateTypes).toHaveBeenCalled();
			expect(mockExit).not.toHaveBeenCalled();
		});
	});

	describe("help command", () => {
		it("should display help for 'help' command", async () => {
			await main("help");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("F.A.L Plugin Development CLI"),
			);
		});

		it("should display help for '--help' flag", async () => {
			await main("--help");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("F.A.L Plugin Development CLI"),
			);
		});

		it("should display help for '-h' flag", async () => {
			await main("-h");

			expect(infoSpy).toHaveBeenCalledWith(
				expect.stringContaining("F.A.L Plugin Development CLI"),
			);
		});
	});

	describe("error handling", () => {
		it("should exit with error if no command is specified", async () => {
			await main(undefined);

			expect(errorSpy).toHaveBeenCalledWith("Error: No command specified");
			expect(infoSpy).toHaveBeenCalledWith(
				"Run 'bun run plugins:help' for usage information",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error for unknown command", async () => {
			await main("unknown-command");

			expect(errorSpy).toHaveBeenCalledWith(
				'Error: Unknown command "unknown-command"',
			);
			expect(infoSpy).toHaveBeenCalledWith(
				"Run 'bun run plugins:help' for usage information",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle errors from createPlugin", async () => {
			const error = new Error("Create failed");
			vi.mocked(createPluginModule.createPlugin).mockRejectedValue(error);

			await expect(main("create", ["my-plugin"])).rejects.toThrow(
				"Create failed",
			);
		});
	});
});
