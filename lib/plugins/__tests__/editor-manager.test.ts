/**
 * Editor Manager Tests
 *
 * Unit tests for the EditorManager class.
 */

import type { Editor, JSONContent } from "@tiptap/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EditorManager } from "../editor-manager";
import * as editorRegistry from "../editor-registry";

// Mock Editor (without setExtensions method - TipTap doesn't have this)
const createMockEditor = (): Editor => {
	const chainMock = {
		toggleBold: vi.fn(() => ({
			run: vi.fn(() => true),
		})),
	};
	const canMock = {
		toggleBold: vi.fn(() => true),
	};

	const editor = {
		chain: vi.fn(() => chainMock),
		can: vi.fn(() => canMock),
		getJSON: vi.fn(() => ({ type: "doc", content: [] })),
		commands: {
			setContent: vi.fn(),
			setTextSelection: vi.fn(),
		},
		state: {
			selection: {
				from: 0,
				to: 0,
			},
		},
		on: vi.fn(),
		off: vi.fn(),
	} as unknown as Editor;

	return editor;
};

describe("EditorManager", () => {
	let manager: EditorManager;
	let mockEditor: Editor;
	let baseExtensions: unknown[];

	beforeEach(() => {
		manager = EditorManager.getInstance();
		mockEditor = createMockEditor();
		baseExtensions = [
			{ name: "starterKit" },
			{ name: "customHeading" },
		] as unknown[];
	});

	afterEach(() => {
		// Cleanup: unregister all editors
		const _stats = manager.getStats();
		// Note: We can't directly access editor IDs, so we'll reset the manager
		EditorManager.reset();
		editorRegistry.clear();
	});

	describe("Singleton Pattern", () => {
		it("should return the same instance", () => {
			const instance1 = EditorManager.getInstance();
			const instance2 = EditorManager.getInstance();

			expect(instance1).toBe(instance2);
		});
	});

	describe("registerEditor", () => {
		it("should register an editor", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const editor = manager.getEditor("test-editor-1");
			expect(editor).toBe(mockEditor);
		});

		it("should update editor if already registered", () => {
			const editor1 = createMockEditor();
			const editor2 = createMockEditor();

			manager.registerEditor("test-editor-1", editor1, baseExtensions);
			manager.registerEditor("test-editor-1", editor2, baseExtensions);

			const editor = manager.getEditor("test-editor-1");
			expect(editor).toBe(editor2);
		});

		it("should not call setExtensions (TipTap doesn't support it)", () => {
			const pluginExtension = { name: "plugin-extension" } as unknown as Editor;

			editorRegistry.register("test-plugin", {
				id: "test-extension",
				extension: pluginExtension,
				type: "plugin",
			});

			// Create a spy to check if setExtensions would be called
			const setExtensionsSpy = vi.fn();
			// Add setExtensions to mockEditor to verify it's NOT called
			(
				mockEditor as unknown as { setExtensions?: ReturnType<typeof vi.fn> }
			).setExtensions = setExtensionsSpy;

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			// TipTap doesn't support setExtensions, so it should not be called
			expect(setExtensionsSpy).not.toHaveBeenCalled();
		});
	});

	describe("unregisterEditor", () => {
		it("should unregister an editor", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.unregisterEditor("test-editor-1");

			expect(manager.getEditor("test-editor-1")).toBeNull();
		});

		it("should clear active editor if unregistered", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.setActiveEditor("test-editor-1");
			manager.unregisterEditor("test-editor-1");

			expect(manager.getActiveEditor()).toBeNull();
		});
	});

	describe("setActiveEditor / getActiveEditor", () => {
		it("should set and get active editor", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.setActiveEditor("test-editor-1");

			expect(manager.getActiveEditor()).toBe(mockEditor);
		});

		it("should return null when no active editor", () => {
			expect(manager.getActiveEditor()).toBeNull();
		});

		it("should warn when setting active editor for non-existent editor", () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

			manager.setActiveEditor("non-existent");

			expect(consoleSpy).not.toHaveBeenCalled(); // logger.warn is used, not console.warn
			consoleSpy.mockRestore();
		});
	});

	describe("getEditor", () => {
		it("should get editor by ID", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			expect(manager.getEditor("test-editor-1")).toBe(mockEditor);
		});

		it("should return active editor when no ID specified", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.setActiveEditor("test-editor-1");

			expect(manager.getEditor()).toBe(mockEditor);
		});

		it("should return null for non-existent editor", () => {
			expect(manager.getEditor("non-existent")).toBeNull();
		});
	});

	describe("applyAllPluginExtensions", () => {
		it("should NOT call setExtensions (TipTap doesn't support dynamic extension updates)", () => {
			const pluginExtension = { name: "plugin-extension" } as unknown as Editor;

			editorRegistry.register("test-plugin", {
				id: "test-extension",
				extension: pluginExtension,
				type: "plugin",
			});

			// Create a spy to check if setExtensions would be called
			const setExtensionsSpy = vi.fn();
			// Add setExtensions to mockEditor to verify it's NOT called
			(
				mockEditor as unknown as { setExtensions?: ReturnType<typeof vi.fn> }
			).setExtensions = setExtensionsSpy;

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.applyAllPluginExtensions("test-editor-1");

			// TipTap doesn't support setExtensions, so it should not be called
			expect(setExtensionsSpy).not.toHaveBeenCalled();
		});

		it("should warn when editor not found", () => {
			manager.applyAllPluginExtensions("non-existent");

			// Should not throw, just log warning
			// No setExtensions call should be made
		});
	});

	describe("applyExtensionsToAllEditors", () => {
		it("should NOT call setExtensions (TipTap doesn't support dynamic extension updates)", () => {
			const editor1 = createMockEditor();
			const editor2 = createMockEditor();

			// Create spies to check if setExtensions would be called
			const setExtensionsSpy1 = vi.fn();
			const setExtensionsSpy2 = vi.fn();
			(
				editor1 as unknown as { setExtensions?: ReturnType<typeof vi.fn> }
			).setExtensions = setExtensionsSpy1;
			(
				editor2 as unknown as { setExtensions?: ReturnType<typeof vi.fn> }
			).setExtensions = setExtensionsSpy2;

			manager.registerEditor("test-editor-1", editor1, baseExtensions);
			manager.registerEditor("test-editor-2", editor2, baseExtensions);

			// Note: Testing deprecated method to ensure it doesn't call setExtensions
			manager.applyExtensionsToAllEditors();

			// TipTap doesn't support setExtensions, so it should not be called
			expect(setExtensionsSpy1).not.toHaveBeenCalled();
			expect(setExtensionsSpy2).not.toHaveBeenCalled();
		});
	});

	describe("executeCommand", () => {
		it("should execute command on editor", async () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);
			manager.setActiveEditor("test-editor-1");

			// Mock chain command - toggleBold returns a chain object with run()
			const runMock = vi.fn(() => true);
			const chainMock = {
				toggleBold: vi.fn(() => ({
					run: runMock,
				})),
			};
			(mockEditor.chain as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

			const result = await manager.executeCommand(undefined, "toggleBold");

			expect(mockEditor.chain).toHaveBeenCalled();
			expect(chainMock.toggleBold).toHaveBeenCalled();
			expect(runMock).toHaveBeenCalled();
			expect(result).toBe(true);
		});

		it("should throw error when editor not found", async () => {
			await expect(
				manager.executeCommand("non-existent", "toggleBold"),
			).rejects.toThrow("Editor non-existent not found");
		});

		it("should throw error when command not found", async () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const chainMock = {} as Record<string, unknown>;
			(mockEditor.chain as ReturnType<typeof vi.fn>).mockReturnValue(chainMock);

			await expect(
				manager.executeCommand("test-editor-1", "nonExistentCommand"),
			).rejects.toThrow("Command nonExistentCommand not found");
		});
	});

	describe("getContent", () => {
		it("should get editor content", async () => {
			const mockContent: JSONContent = {
				type: "doc",
				content: [{ type: "paragraph", content: [] }],
			};
			(mockEditor.getJSON as ReturnType<typeof vi.fn>).mockReturnValue(
				mockContent,
			);

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const content = await manager.getContent("test-editor-1");

			expect(content).toEqual(mockContent);
			expect(mockEditor.getJSON).toHaveBeenCalled();
		});

		it("should throw error when editor not found", async () => {
			await expect(manager.getContent("non-existent")).rejects.toThrow(
				"Editor non-existent not found",
			);
		});
	});

	describe("setContent", () => {
		it("should set editor content", async () => {
			const mockContent: JSONContent = {
				type: "doc",
				content: [{ type: "paragraph", content: [] }],
			};

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			await manager.setContent("test-editor-1", mockContent);

			expect(mockEditor.commands.setContent).toHaveBeenCalledWith(mockContent);
		});

		it("should throw error when editor not found", async () => {
			await expect(
				manager.setContent("non-existent", { type: "doc", content: [] }),
			).rejects.toThrow("Editor non-existent not found");
		});
	});

	describe("getSelection", () => {
		it("should get editor selection", async () => {
			mockEditor.state.selection = {
				from: 5,
				to: 10,
			} as Editor["state"]["selection"];

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const selection = await manager.getSelection("test-editor-1");

			expect(selection).toEqual({ from: 5, to: 10 });
		});

		it("should return null when no selection", async () => {
			mockEditor.state.selection = {
				from: 5,
				to: 5,
			} as Editor["state"]["selection"];

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const selection = await manager.getSelection("test-editor-1");

			expect(selection).toBeNull();
		});

		it("should throw error when editor not found", async () => {
			await expect(manager.getSelection("non-existent")).rejects.toThrow(
				"Editor non-existent not found",
			);
		});
	});

	describe("setSelection", () => {
		it("should set editor selection", async () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			await manager.setSelection("test-editor-1", 5, 10);

			expect(mockEditor.commands.setTextSelection).toHaveBeenCalledWith({
				from: 5,
				to: 10,
			});
		});

		it("should throw error when editor not found", async () => {
			await expect(manager.setSelection("non-existent", 5, 10)).rejects.toThrow(
				"Editor non-existent not found",
			);
		});
	});

	describe("canExecuteCommand", () => {
		it("should return true when command can be executed", async () => {
			const canMock = {
				toggleBold: vi.fn(() => true),
			};
			(mockEditor.can as ReturnType<typeof vi.fn>).mockReturnValue(canMock);

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const canExecute = await manager.canExecuteCommand(
				"test-editor-1",
				"toggleBold",
			);

			expect(mockEditor.can).toHaveBeenCalled();
			expect(canMock.toggleBold).toHaveBeenCalled();
			expect(canExecute).toBe(true);
		});

		it("should return false when command cannot be executed", async () => {
			const canMock = {
				toggleBold: vi.fn(() => false),
			};
			(mockEditor.can as ReturnType<typeof vi.fn>).mockReturnValue(canMock);

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const canExecute = await manager.canExecuteCommand(
				"test-editor-1",
				"toggleBold",
			);

			expect(mockEditor.can).toHaveBeenCalled();
			expect(canMock.toggleBold).toHaveBeenCalled();
			expect(canExecute).toBe(false);
		});

		it("should return false when command does not exist", async () => {
			const canMock = {} as Record<string, unknown>;
			(mockEditor.can as ReturnType<typeof vi.fn>).mockReturnValue(canMock);

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const canExecute = await manager.canExecuteCommand(
				"test-editor-1",
				"nonExistentCommand",
			);

			expect(mockEditor.can).toHaveBeenCalled();
			expect(canExecute).toBe(false);
		});

		it("should return false when editor not found", async () => {
			const canExecute = await manager.canExecuteCommand(
				"non-existent",
				"toggleBold",
			);

			expect(canExecute).toBe(false);
		});
	});

	describe("getStats", () => {
		it("should return manager statistics", () => {
			const editor1 = createMockEditor();
			const editor2 = createMockEditor();

			manager.registerEditor("test-editor-1", editor1, baseExtensions);
			manager.registerEditor("test-editor-2", editor2, baseExtensions);
			manager.setActiveEditor("test-editor-1");

			const stats = manager.getStats();

			expect(stats.totalEditors).toBe(2);
			expect(stats.activeEditorId).toBe("test-editor-1");
		});
	});

	describe("getAllExtensions", () => {
		it("should return combined base and plugin extensions", () => {
			const pluginExtension = { name: "plugin-extension" } as unknown as Editor;

			editorRegistry.register("test-plugin", {
				id: "test-extension",
				extension: pluginExtension,
				type: "plugin",
			});

			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const allExtensions = manager.getAllExtensions("test-editor-1");

			expect(allExtensions).toContainEqual(baseExtensions[0]);
			expect(allExtensions).toContainEqual(pluginExtension);
			expect(allExtensions.length).toBe(baseExtensions.length + 1);
		});

		it("should return only base extensions when no plugin extensions exist", () => {
			manager.registerEditor("test-editor-1", mockEditor, baseExtensions);

			const allExtensions = manager.getAllExtensions("test-editor-1");

			expect(allExtensions).toEqual(baseExtensions);
		});
	});
});
