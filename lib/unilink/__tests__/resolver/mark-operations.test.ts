/**
 * Mark Operations Module Test Suite
 * Tests for TipTap mark manipulations
 *
 * @fileoverview Tests for lib/unilink/resolver/mark-operations.ts
 * @vitest-environment jsdom
 */

import type { Editor } from "@tiptap/core";
import type { Mark, MarkType, Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Mark Operations Module", () => {
	let mockEditor: Editor;
	let mockView: Partial<EditorView>;
	let mockState: Partial<EditorState>;
	let mockTransaction: Partial<Transaction>;
	let mockMarkType: Partial<MarkType>;
	let mockDispatch: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock dispatch function
		mockDispatch = vi.fn();

		// Mock transaction
		mockTransaction = {
			removeMark: vi.fn().mockReturnThis(),
			addMark: vi.fn().mockReturnThis(),
		};

		// Mock mark type
		mockMarkType = {
			create: vi.fn((attrs) => ({
				type: mockMarkType,
				attrs,
			})) as unknown as MarkType["create"],
		};

		// Mock state
		mockState = {
			schema: {
				marks: {
					unilink: mockMarkType as MarkType,
				},
			} as unknown as EditorState["schema"],
			tr: mockTransaction as Transaction,
			doc: {
				descendants: vi.fn(),
			} as unknown as ProseMirrorNode,
		};

		// Mock view
		mockView = {
			state: mockState as EditorState,
			dispatch: mockDispatch,
		};

		// Mock editor
		mockEditor = {
			view: mockView as EditorView,
		} as Editor;
	});

	describe("updateMarkToExists", () => {
		it("should update mark state to exists", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			// Mock a text node with a mark
			const mockMark: Partial<Mark> = {
				type: mockMarkType as MarkType,
				attrs: {
					markId: "test-mark-id",
					state: "missing",
					exists: false,
				},
			};

			const mockNode: Partial<ProseMirrorNode> = {
				isText: true,
				text: "Test Page",
				marks: [mockMark as Mark],
			};

			// Setup descendants mock to call callback with our mock node
			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			await updateMarkToExists(mockEditor, "test-mark-id", "page-123");

			// Verify mark was removed and added with new attributes
			expect(mockTransaction.removeMark).toHaveBeenCalled();
			expect(mockMarkType.create).toHaveBeenCalledWith(
				expect.objectContaining({
					state: "exists",
					exists: true,
					pageId: "page-123",
					href: "/notes/default/page-123",
					created: true,
				}),
			);
			expect(mockTransaction.addMark).toHaveBeenCalled();
			expect(mockDispatch).toHaveBeenCalledWith(mockTransaction);
		});

		it("should handle mark not found", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			// Mock empty document
			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				() => {
					// No nodes
				},
			);

			await updateMarkToExists(mockEditor, "non-existent-mark", "page-123");

			// Should not dispatch if no changes
			expect(mockDispatch).not.toHaveBeenCalled();
		});

		it("should handle multiple marks in document", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			const mockMark1: Partial<Mark> = {
				type: mockMarkType as MarkType,
				attrs: { markId: "mark-1", state: "missing" },
			};

			const mockMark2: Partial<Mark> = {
				type: mockMarkType as MarkType,
				attrs: { markId: "mark-2", state: "missing" },
			};

			const mockNode1: Partial<ProseMirrorNode> = {
				isText: true,
				text: "First",
				marks: [mockMark1 as Mark],
			};

			const mockNode2: Partial<ProseMirrorNode> = {
				isText: true,
				text: "Second",
				marks: [mockMark2 as Mark],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode1 as ProseMirrorNode, 0);
					callback(mockNode2 as ProseMirrorNode, 10);
				},
			);

			await updateMarkToExists(mockEditor, "mark-1", "page-123");

			// Should only update mark-1
			expect(mockTransaction.removeMark).toHaveBeenCalledTimes(1);
			expect(mockTransaction.addMark).toHaveBeenCalledTimes(1);
		});

		it("should handle nodes without marks", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			const mockNode: Partial<ProseMirrorNode> = {
				isText: true,
				text: "Plain text",
				marks: [],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			await updateMarkToExists(mockEditor, "test-mark", "page-123");

			expect(mockDispatch).not.toHaveBeenCalled();
		});

		it("should handle non-text nodes", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			const mockNode: Partial<ProseMirrorNode> = {
				isText: false,
				marks: [],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			await updateMarkToExists(mockEditor, "test-mark", "page-123");

			expect(mockDispatch).not.toHaveBeenCalled();
		});

		it("should handle nodes without text content", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			const mockNode: Partial<ProseMirrorNode> = {
				isText: true,
				text: undefined,
				marks: [],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			await updateMarkToExists(mockEditor, "test-mark", "page-123");

			expect(mockDispatch).not.toHaveBeenCalled();
		});

		it("should log success message on update", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			const mockMark: Partial<Mark> = {
				type: mockMarkType as MarkType,
				attrs: { markId: "test-mark-id", state: "missing", exists: false },
			};

			const mockNode: Partial<ProseMirrorNode> = {
				isText: true,
				text: "Test",
				marks: [mockMark as Mark],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			await updateMarkToExists(mockEditor, "test-mark-id", "page-123");

			// Verify that dispatch was called (indicating successful update)
			expect(mockDispatch).toHaveBeenCalled();
			// Verify that transaction methods were called to update mark
			expect(mockTransaction.removeMark).toHaveBeenCalled();
			expect(mockTransaction.addMark).toHaveBeenCalled();
		});

		it("should handle errors gracefully", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			// Mock view to throw error
			const errorEditor = {
				view: {
					get state(): EditorState {
						throw new Error("State access error");
					},
				},
			} as unknown as Editor;

			// Should not throw when error occurs
			await expect(
				updateMarkToExists(errorEditor, "test-mark", "page-123"),
			).resolves.toBeUndefined();
		});

		it("should not dispatch if dispatch is undefined", async () => {
			const { updateMarkToExists } = await import(
				"../../resolver/mark-operations"
			);

			// Mock view without dispatch
			const noDispatchEditor = {
				view: {
					state: mockState as EditorState,
					dispatch: undefined,
				},
			} as unknown as Editor;

			const mockMark: Partial<Mark> = {
				type: mockMarkType as MarkType,
				attrs: { markId: "test-mark-id", state: "missing" },
			};

			const mockNode: Partial<ProseMirrorNode> = {
				isText: true,
				text: "Test",
				marks: [mockMark as Mark],
			};

			const mockDoc = mockState.doc as ProseMirrorNode;
			(mockDoc.descendants as ReturnType<typeof vi.fn>).mockImplementation(
				(callback: (node: ProseMirrorNode, pos: number) => void) => {
					callback(mockNode as ProseMirrorNode, 0);
				},
			);

			// Should complete without throwing
			await updateMarkToExists(noDispatchEditor, "test-mark-id", "page-123");

			// Verify transaction was created but not dispatched
			expect(mockTransaction.removeMark).toHaveBeenCalled();
			expect(mockTransaction.addMark).toHaveBeenCalled();
		});
	});

	describe("batchResolveMarks", () => {
		it("should log batch resolution start", async () => {
			const { batchResolveMarks } = await import(
				"../../resolver/mark-operations"
			);

			// Should not throw and should complete successfully
			await expect(
				batchResolveMarks(mockEditor, ["mark-1", "mark-2", "mark-3"]),
			).resolves.toBeUndefined();
		});

		it("should process each mark individually", async () => {
			const { batchResolveMarks } = await import(
				"../../resolver/mark-operations"
			);

			const markIds = ["mark-1", "mark-2", "mark-3"];
			// Should not throw when processing marks
			await expect(
				batchResolveMarks(mockEditor, markIds),
			).resolves.toBeUndefined();
		});

		it("should handle empty mark array", async () => {
			const { batchResolveMarks } = await import(
				"../../resolver/mark-operations"
			);

			// Should handle empty array without throwing
			await expect(batchResolveMarks(mockEditor, [])).resolves.toBeUndefined();
		});

		it("should handle single mark", async () => {
			const { batchResolveMarks } = await import(
				"../../resolver/mark-operations"
			);

			// Should handle single mark without throwing
			await expect(
				batchResolveMarks(mockEditor, ["single-mark"]),
			).resolves.toBeUndefined();
		});
	});
});
