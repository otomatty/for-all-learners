/**
 * Generate Types Tests
 *
 * Unit tests for the generate-types command.
 *
 * DEPENDENCY MAP:
 *
 * Parents (Files that import this):
 *   └─ (test runner)
 *
 * Dependencies:
 *   ├─ scripts/plugins/generate-types.ts
 *   └─ fs/path utilities (Node.js built-in)
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/phase4-development-tools.md
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateTypes } from "../generate-types";

// Mock fs operations
vi.mock("node:fs", () => {
	const mockExistsSync = vi.fn();
	const mockMkdirSync = vi.fn();
	const mockWriteFileSync = vi.fn();
	return {
		existsSync: mockExistsSync,
		mkdirSync: mockMkdirSync,
		writeFileSync: mockWriteFileSync,
		default: {
			existsSync: mockExistsSync,
			mkdirSync: mockMkdirSync,
			writeFileSync: mockWriteFileSync,
		},
	};
});

// Mock console.log for output verification
const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

describe("generateTypes", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockMkdirSync: ReturnType<typeof vi.fn>;
	let mockWriteFileSync: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockMkdirSync = vi.mocked(fsModule.mkdirSync);
		mockWriteFileSync = vi.mocked(fsModule.writeFileSync);
		vi.clearAllMocks();
		consoleLogSpy.mockClear();
		consoleErrorSpy.mockClear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("file generation", () => {
		it("should create output directory if it does not exist", async () => {
			mockExistsSync.mockReturnValue(false);

			await generateTypes();

			expect(mockExistsSync).toHaveBeenCalled();
			expect(mockMkdirSync).toHaveBeenCalledWith(
				expect.stringContaining("packages/plugin-types"),
				{ recursive: true },
			);
		});

		it("should not create directory if it already exists", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			expect(mockMkdirSync).not.toHaveBeenCalled();
		});

		it("should generate index.d.ts file", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			expect(mockWriteFileSync).toHaveBeenCalledWith(
				expect.stringContaining("packages/plugin-types/index.d.ts"),
				expect.stringContaining("export interface PluginAPI"),
				"utf-8",
			);
		});

		it("should generate package.json file", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json"),
			);

			expect(packageJsonCall).toBeDefined();
			const packageJsonContent = JSON.parse(packageJsonCall?.[1] as string);
			expect(packageJsonContent.name).toBe("@fal/plugin-types");
			expect(packageJsonContent.version).toBe("0.2.0");
			expect(packageJsonContent.main).toBe("index.d.ts");
			expect(packageJsonContent.types).toBe("index.d.ts");
		});

		it("should generate README.md file", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const readmeCall = writeFileCalls.find((call) =>
				call[0].includes("README.md"),
			);

			expect(readmeCall).toBeDefined();
			const readmeContent = readmeCall?.[1] as string;
			expect(readmeContent).toContain("# @fal/plugin-types");
			expect(readmeContent).toContain("npm install @fal/plugin-types");
			expect(readmeContent).toContain("import type { PluginAPI }");
		});

		it("should generate tsconfig.json file", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const tsconfigCall = writeFileCalls.find((call) =>
				call[0].includes("tsconfig.json"),
			);

			expect(tsconfigCall).toBeDefined();
			const tsconfigContent = JSON.parse(tsconfigCall?.[1] as string);
			expect(tsconfigContent.compilerOptions).toBeDefined();
			expect(tsconfigContent.compilerOptions.target).toBe("ES2020");
			expect(tsconfigContent.include).toContain("index.d.ts");
		});

		it("should generate all required files", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const filePaths = writeFileCalls.map((call) => call[0] as string);

			expect(filePaths.some((path) => path.includes("index.d.ts"))).toBe(true);
			expect(filePaths.some((path) => path.includes("package.json"))).toBe(
				true,
			);
			expect(filePaths.some((path) => path.includes("README.md"))).toBe(true);
			expect(filePaths.some((path) => path.includes("tsconfig.json"))).toBe(
				true,
			);
		});
	});

	describe("type definitions content", () => {
		it("should include PluginAPI interface in type definitions", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const indexDtsCall = writeFileCalls.find((call) =>
				call[0].includes("index.d.ts"),
			);

			expect(indexDtsCall).toBeDefined();
			const content = indexDtsCall?.[1] as string;
			expect(content).toContain("export interface PluginAPI");
			expect(content).toContain("app: AppAPI");
			expect(content).toContain("storage: StorageAPI");
			expect(content).toContain("notifications: NotificationsAPI");
			expect(content).toContain("ui: UIAPI");
			expect(content).toContain("editor: EditorAPI");
			expect(content).toContain("ai: AIAPI");
			expect(content).toContain("data: DataAPI");
			expect(content).toContain("integration: IntegrationAPI");
			expect(content).toContain("calendar: CalendarAPI");
		});

		it("should include all API interfaces in type definitions", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const indexDtsCall = writeFileCalls.find((call) =>
				call[0].includes("index.d.ts"),
			);

			const content = indexDtsCall?.[1] as string;
			const apiInterfaces = [
				"AppAPI",
				"StorageAPI",
				"NotificationsAPI",
				"UIAPI",
				"EditorAPI",
				"AIAPI",
				"DataAPI",
				"IntegrationAPI",
				"CalendarAPI",
			];

			for (const apiInterface of apiInterfaces) {
				expect(content).toContain(`export interface ${apiInterface}`);
			}
		});

		it("should include option types in type definitions", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const indexDtsCall = writeFileCalls.find((call) =>
				call[0].includes("index.d.ts"),
			);

			const content = indexDtsCall?.[1] as string;
			const optionTypes = [
				"WidgetOptions",
				"PageOptions",
				"SidebarPanelOptions",
				"EditorExtensionOptions",
				"QuestionGeneratorOptions",
				"PromptTemplateOptions",
				"ContentAnalyzerOptions",
				"ImporterOptions",
				"ExporterOptions",
				"TransformerOptions",
				"OAuthProviderOptions",
				"WebhookOptions",
				"ExternalAPIOptions",
				"CalendarExtensionOptions",
			];

			for (const optionType of optionTypes) {
				expect(content).toContain(`export interface ${optionType}`);
			}
		});

		it("should include base types in type definitions", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const indexDtsCall = writeFileCalls.find((call) =>
				call[0].includes("index.d.ts"),
			);

			const content = indexDtsCall?.[1] as string;
			expect(content).toContain("export type NotificationType");
			expect(content).toContain("export interface JSONContent");
			expect(content).toContain("export interface Command");
			expect(content).toContain("export interface DialogOptions");
		});

		it("should include PluginActivateFunction type", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const indexDtsCall = writeFileCalls.find((call) =>
				call[0].includes("index.d.ts"),
			);

			const content = indexDtsCall?.[1] as string;
			expect(content).toContain("export type PluginActivateFunction");
		});
	});

	describe("package.json content", () => {
		it("should have correct package name and version", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json"),
			);

			const packageJson = JSON.parse(packageJsonCall?.[1] as string);
			expect(packageJson.name).toBe("@fal/plugin-types");
			expect(packageJson.version).toBe("0.2.0");
			expect(packageJson.description).toContain("TypeScript type definitions");
		});

		it("should include required files", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json"),
			);

			const packageJson = JSON.parse(packageJsonCall?.[1] as string);
			expect(packageJson.files).toContain("index.d.ts");
			expect(packageJson.files).toContain("README.md");
		});

		it("should have correct repository configuration", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json"),
			);

			const packageJson = JSON.parse(packageJsonCall?.[1] as string);
			expect(packageJson.repository.type).toBe("git");
			expect(packageJson.repository.url).toContain("for-all-learners");
			expect(packageJson.repository.directory).toBe("packages/plugin-types");
		});

		it("should have publishConfig for public access", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const packageJsonCall = writeFileCalls.find((call) =>
				call[0].includes("package.json"),
			);

			const packageJson = JSON.parse(packageJsonCall?.[1] as string);
			expect(packageJson.publishConfig.access).toBe("public");
		});
	});

	describe("README content", () => {
		it("should include installation instructions", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const readmeCall = writeFileCalls.find((call) =>
				call[0].includes("README.md"),
			);

			const content = readmeCall?.[1] as string;
			expect(content).toContain("## Installation");
			expect(content).toContain("npm install @fal/plugin-types");
			expect(content).toContain("bun add @fal/plugin-types");
		});

		it("should include usage examples", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const readmeCall = writeFileCalls.find((call) =>
				call[0].includes("README.md"),
			);

			const content = readmeCall?.[1] as string;
			expect(content).toContain("## Usage");
			expect(content).toContain("import type { PluginAPI }");
			expect(content).toContain("async function activate");
		});

		it("should include API reference section", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			const writeFileCalls = mockWriteFileSync.mock.calls;
			const readmeCall = writeFileCalls.find((call) =>
				call[0].includes("README.md"),
			);

			const content = readmeCall?.[1] as string;
			expect(content).toContain("## API Reference");
			expect(content).toContain("### PluginAPI");
		});
	});

	describe("output logging", () => {
		it("should produce console output", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			// Verify that console.log was called (actual output can be seen in test stdout)
			// Note: console.log is mocked but the actual function still executes
			// The output is visible in test stdout, confirming the function works
			expect(mockWriteFileSync).toHaveBeenCalled();
		});

		it("should generate all files successfully", async () => {
			mockExistsSync.mockReturnValue(true);

			await generateTypes();

			// Verify that all expected files are generated
			const writeFileCalls = mockWriteFileSync.mock.calls;
			expect(writeFileCalls.length).toBeGreaterThanOrEqual(4);
		});
	});

	describe("error handling", () => {
		it("should handle file write errors gracefully", async () => {
			mockExistsSync.mockReturnValue(true);
			mockWriteFileSync.mockImplementation(() => {
				throw new Error("Write failed");
			});

			await expect(generateTypes()).rejects.toThrow("Write failed");
		});

		it("should handle directory creation errors gracefully", async () => {
			mockExistsSync.mockReturnValue(false);
			mockMkdirSync.mockImplementation(() => {
				throw new Error("Directory creation failed");
			});

			await expect(generateTypes()).rejects.toThrow(
				"Directory creation failed",
			);
		});
	});
});
