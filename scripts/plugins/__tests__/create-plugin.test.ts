/**
 * Create Plugin Tests
 *
 * Unit tests for the create-plugin command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/create-plugin.ts
 *   └─ fs/path utilities (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as loggerModule from "@/lib/logger";
import { createPlugin } from "../create-plugin";

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

describe("createPlugin", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockMkdirSync: ReturnType<typeof vi.fn>;
	let mockReadFileSync: ReturnType<typeof vi.fn>;
	let mockWriteFileSync: ReturnType<typeof vi.fn>;
	let infoSpy: ReturnType<typeof vi.spyOn>;
	let errorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockMkdirSync = vi.mocked(fsModule.mkdirSync);
		mockReadFileSync = vi.mocked(fsModule.readFileSync);
		mockWriteFileSync = vi.mocked(fsModule.writeFileSync);
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
		vi.restoreAllMocks();
	});

	describe("plugin creation", () => {
		it("should create plugin from hello-world template", async () => {
			const templateContent =
				"{{PLUGIN_NAME}} {{PLUGIN_ID}} {{PLUGIN_DESCRIPTION}}";
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates/plugins/hello-world")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false; // Plugin doesn't exist yet
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(templateContent);

			await createPlugin("my-plugin", []);

			expect(mockExistsSync).toHaveBeenCalled();
			expect(mockMkdirSync).toHaveBeenCalled();
			expect(mockReadFileSync).toHaveBeenCalled();
			expect(mockWriteFileSync).toHaveBeenCalled();
			expect(infoSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					pluginName: "my-plugin",
					template: "hello-world",
				}),
				expect.stringContaining("Creating plugin"),
			);
		});

		it("should create plugin with specified template", async () => {
			const templateContent = "{{PLUGIN_NAME}}";
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates/plugins/editor-extension")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(templateContent);

			await createPlugin("my-plugin", ["--template=editor-extension"]);

			expect(mockExistsSync).toHaveBeenCalledWith(
				expect.stringContaining("editor-extension"),
			);
		});

		it("should replace placeholders in template files", async () => {
			const templateContent =
				"Plugin: {{PLUGIN_NAME}}\nID: {{PLUGIN_ID}}\nDescription: {{PLUGIN_DESCRIPTION}}\nAuthor: {{PLUGIN_AUTHOR}}\nVersion: {{PLUGIN_VERSION}}";
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(templateContent);

			await createPlugin("test-plugin", []);

			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining("test-plugin"),
				"utf-8",
			);
			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining("com.example.test-plugin"),
				"utf-8",
			);
		});

		it("should generate plugin ID in kebab-case", async () => {
			const templateContent = "{{PLUGIN_ID}}";
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue(templateContent);

			await createPlugin("My Test Plugin", []);

			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.stringContaining("com.example.my-test-plugin"),
				"utf-8",
			);
		});
	});

	describe("error handling", () => {
		it("should exit with error if template is invalid", async () => {
			await createPlugin("my-plugin", ["--template=invalid-template"]);

			expect(errorSpy).toHaveBeenCalledWith(
				{ template: "invalid-template" },
				"Invalid template",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if template directory does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates/plugins")) {
					return false;
				}
				return true;
			});

			await createPlugin("my-plugin", []);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					templateDir: expect.stringContaining("templates"),
				}),
				"Template not found",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should exit with error if plugin directory already exists", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					return true;
				}
				if (path.includes("plugins/examples/com-example-my-plugin")) {
					return true; // Plugin already exists
				}
				return false;
			});

			await createPlugin("my-plugin", []);

			expect(errorSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					targetDir: expect.stringContaining("com-example-my-plugin"),
				}),
				"Plugin directory already exists",
			);
			expect(mockExit).toHaveBeenCalledWith(1);
		});
	});

	describe("template types", () => {
		const validTemplates = [
			"hello-world",
			"editor-extension",
			"ai-extension",
			"ui-extension",
			"data-processor-extension",
			"integration-extension",
		];

		it.each(validTemplates)(
			"should accept valid template: %s",
			async (template) => {
				mockExistsSync.mockImplementation((path: string) => {
					if (path.includes(`templates/plugins/${template}`)) {
						return true;
					}
					if (path.includes("plugins/examples")) {
						return false;
					}
					return true;
				});
				mockReadFileSync.mockReturnValue("{{PLUGIN_NAME}}");

				await createPlugin("test-plugin", [`--template=${template}`]);

				expect(mockExistsSync).toHaveBeenCalledWith(
					expect.stringContaining(template),
				);
			},
		);
	});

	describe("file operations", () => {
		it("should create target directory if it does not exist", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return false; // Target dir doesn't exist
			});
			mockReadFileSync.mockReturnValue("{{PLUGIN_NAME}}");

			await createPlugin("my-plugin", []);

			expect(mockMkdirSync).toHaveBeenCalledWith(
				expect.stringContaining("plugins/examples"),
				{ recursive: true },
			);
		});

		it("should create subdirectories for nested files", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					return true;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return false;
			});
			mockReadFileSync.mockReturnValue("{{PLUGIN_NAME}}");

			await createPlugin("my-plugin", []);

			// Should create src directory for src/index.ts
			expect(mockMkdirSync).toHaveBeenCalledWith(
				expect.stringContaining("src"),
				{ recursive: true },
			);
		});

		it("should skip files that do not exist in template", async () => {
			mockExistsSync.mockImplementation((path: string) => {
				if (path.includes("templates")) {
					// Only some files exist
					if (path.includes("plugin.json")) {
						return true;
					}
					return false;
				}
				if (path.includes("plugins/examples")) {
					return false;
				}
				return true;
			});
			mockReadFileSync.mockReturnValue("{{PLUGIN_NAME}}");

			await createPlugin("my-plugin", []);

			// Should not throw error
			expect(mockWriteFileSync).toHaveBeenCalled();
		});
	});
});
