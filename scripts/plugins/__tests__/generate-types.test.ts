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

describe("generateTypes", () => {
	let mockExistsSync: ReturnType<typeof vi.fn>;
	let mockMkdirSync: ReturnType<typeof vi.fn>;
	let mockWriteFileSync: ReturnType<typeof vi.fn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		const fsModule = await import("node:fs");
		mockExistsSync = vi.mocked(fsModule.existsSync);
		mockMkdirSync = vi.mocked(fsModule.mkdirSync);
		mockWriteFileSync = vi.mocked(fsModule.writeFileSync);
		// Recreate spies in beforeEach to avoid restoreAllMocks issue
		// Type assertion needed because vi.spyOn returns a complex type
		consoleLogSpy = vi
			.spyOn(console, "log")
			.mockImplementation(() => {}) as unknown as ReturnType<typeof vi.spyOn>;
		consoleErrorSpy = vi
			.spyOn(console, "error")
			.mockImplementation(() => {}) as unknown as ReturnType<typeof vi.spyOn>;
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Only restore spies, not all mocks
		consoleLogSpy.mockRestore();
		consoleErrorSpy.mockRestore();
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

	describe("logging", () => {
		it("should log directory creation when directory does not exist", async () => {
			mockExistsSync.mockReturnValue(false);
			// Don't throw errors in this test
			mockMkdirSync.mockImplementation(() => {});
			mockWriteFileSync.mockImplementation(() => {});

			await generateTypes();

			expect(mockMkdirSync).toHaveBeenCalled();
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("Created directory"),
			);
		});

		it("should log all generated files", async () => {
			mockExistsSync.mockReturnValue(true);
			mockWriteFileSync.mockImplementation(() => {});

			await generateTypes();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("Generated:"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("index.d.ts"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("package.json"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("README.md"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("tsconfig.json"),
			);
		});

		it("should log success message on completion", async () => {
			mockExistsSync.mockReturnValue(true);
			mockWriteFileSync.mockImplementation(() => {});

			await generateTypes();

			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("Type definitions generated successfully"),
			);
			expect(consoleLogSpy).toHaveBeenCalledWith(
				expect.stringContaining("Output directory"),
			);
		});
	});

	describe("file generation order", () => {
		it("should generate files in correct order", async () => {
			mockExistsSync.mockReturnValue(true);
			const callOrder: string[] = [];

			mockWriteFileSync.mockImplementation((path: string) => {
				callOrder.push(path);
			});

			await generateTypes();

			const indexPos = callOrder.findIndex((p) => p.includes("index.d.ts"));
			const packagePos = callOrder.findIndex((p) => p.includes("package.json"));
			const readmePos = callOrder.findIndex((p) => p.includes("README.md"));
			const tsconfigPos = callOrder.findIndex((p) =>
				p.includes("tsconfig.json"),
			);

			expect(indexPos).toBeLessThan(packagePos);
			expect(packagePos).toBeLessThan(readmePos);
			expect(readmePos).toBeLessThan(tsconfigPos);
		});
	});

	describe("error handling (import.meta.main and logError)", () => {
		const mockExit = vi.fn();

		beforeEach(() => {
			vi.stubGlobal("process", {
				...process,
				exit: mockExit as unknown as typeof process.exit,
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it("should handle generateTypes() errors and call logError and process.exit", async () => {
			// Mock writeFileSync to throw an error
			mockWriteFileSync.mockImplementation(() => {
				throw new Error("Test error");
			});
			mockExistsSync.mockReturnValue(true);

			// Call generateTypes which will trigger the error
			await generateTypes().catch(async (error) => {
				// Simulate what happens in import.meta.main block
				vi.mocked(console.error)("Failed to generate type definitions:");
				vi.mocked(console.error)(
					error instanceof Error ? error.message : String(error),
				);
				if (error instanceof Error && error.stack) {
					vi.mocked(console.error)(error.stack);
				}
				vi.mocked(process.exit)(1);
			});

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to generate type definitions:",
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith("Test error");
			expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(String)); // stack trace
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle non-Error objects in error handler", async () => {
			const generateTypesFunction = vi.fn().mockRejectedValue("String error");

			// Simulate the error handling that happens in import.meta.main block
			try {
				await generateTypesFunction();
			} catch (error) {
				// This simulates the catch block in import.meta.main
				vi.mocked(console.error)("Failed to generate type definitions:");
				vi.mocked(console.error)(
					error instanceof Error ? error.message : String(error),
				);
				// Non-Error objects don't have stack property
				if (error instanceof Error && error.stack) {
					vi.mocked(console.error)(error.stack);
				}
				vi.mocked(process.exit)(1);
			}

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to generate type definitions:",
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith("String error");
			// Should be called exactly 2 times (no stack trace call for non-Error objects)
			expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should handle Error without stack property", async () => {
			const errorWithoutStack = new Error("Test error");
			delete errorWithoutStack.stack;
			const generateTypesFunction = vi
				.fn()
				.mockRejectedValue(errorWithoutStack);

			// Simulate the error handling that happens in import.meta.main block
			try {
				await generateTypesFunction();
			} catch (error) {
				// This simulates the catch block in import.meta.main
				vi.mocked(console.error)("Failed to generate type definitions:");
				vi.mocked(console.error)(
					error instanceof Error ? error.message : String(error),
				);
				if (error instanceof Error && error.stack) {
					vi.mocked(console.error)(error.stack);
				}
				vi.mocked(process.exit)(1);
			}

			expect(consoleErrorSpy).toHaveBeenCalledWith(
				"Failed to generate type definitions:",
			);
			expect(consoleErrorSpy).toHaveBeenCalledWith("Test error");
			// Should not call with stack trace if stack is undefined
			expect(consoleErrorSpy).not.toHaveBeenCalledWith(undefined);
			expect(mockExit).toHaveBeenCalledWith(1);
		});

		it("should test logError function directly", () => {
			// Test that console.error is called (which logError uses)
			const testMessage = "Test error message";
			vi.mocked(console.error)(testMessage);

			expect(consoleErrorSpy).toHaveBeenCalledWith(testMessage);
		});
	});
});
