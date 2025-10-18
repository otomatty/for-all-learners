/**
 * Editor Mock Helper
 *
 * Provides utilities for creating mock TipTap Editor instances
 * to be used across tests, reducing duplication and ensuring consistency.
 *
 * @example
 * ```typescript
 * import { createMockEditor } from '@/lib/__tests__/helpers';
 *
 * const editor = createMockEditor();
 * ```
 */

import type { Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { vi } from "vitest";

/**
 * Configuration options for creating mock Editor instances
 */
export interface MockEditorOptions {
	/** Mock ProseMirror document */
	doc?: ProseMirrorNode;
	/** Selection range */
	selection?: { from: number; to: number };
	/** User ID for the editor context */
	userId?: string;
	/** Additional commands to mock */
	commands?: Record<string, unknown>;
}

/**
 * Create an empty ProseMirror document mock
 *
 * @returns A minimal mock ProseMirror document
 *
 * @example
 * const doc = createEmptyDoc();
 * expect(doc.type.name).toBe('doc');
 */
export function createEmptyDoc(): ProseMirrorNode {
	return {
		type: { name: "doc" },
		content: {
			size: 0,
			childCount: 0,
			forEach: vi.fn(),
			descendants: vi.fn(),
		},
		nodeSize: 2,
		childCount: 0,
		textContent: "",
	} as unknown as ProseMirrorNode;
}

/**
 * Create a ProseMirror document with text content
 *
 * @param text - The text content to include in the document
 * @returns A mock ProseMirror document containing the text
 *
 * @example
 * const doc = createDocWithText('Hello World');
 * expect(doc.textContent).toBe('Hello World');
 */
export function createDocWithText(text: string): ProseMirrorNode {
	return {
		type: { name: "doc" },
		textContent: text,
		content: {
			size: text.length,
			childCount: 1,
			forEach: vi.fn(),
			descendants: vi.fn((callback) => {
				// Simulate a text node in the document
				callback({ text, type: { name: "text" } }, 0, null, 0);
				return true;
			}),
		},
		nodeSize: text.length + 2,
		childCount: 1,
	} as unknown as ProseMirrorNode;
}

/**
 * Create a mock Editor instance for testing
 *
 * This is a lightweight mock suitable for most unit tests.
 * It provides minimal implementation of the Editor interface.
 *
 * @param options - Optional configuration to customize the editor
 * @returns A mock Editor instance
 *
 * @example
 * // Basic editor
 * const editor = createMockEditor();
 *
 * @example
 * // Editor with text content
 * const doc = createDocWithText('Test content');
 * const editor = createMockEditor({ doc });
 *
 * @example
 * // Editor with selection
 * const editor = createMockEditor({
 *   selection: { from: 0, to: 5 }
 * });
 *
 * @example
 * // Editor with custom commands
 * const editor = createMockEditor({
 *   commands: {
 *     customCommand: vi.fn(),
 *   }
 * });
 */
export function createMockEditor(options: MockEditorOptions = {}): Editor {
	const mockDoc = options.doc ?? createEmptyDoc();
	const from = options.selection?.from ?? 0;
	const to = options.selection?.to ?? 0;

	const mockState = {
		doc: mockDoc,
		selection: {
			from,
			to,
			$from: { pos: from },
			$to: { pos: to },
			empty: from === to,
		},
		tr: {} as Transaction,
	} as unknown as EditorState;

	const mockView = {
		state: mockState,
		dispatch: vi.fn(),
		dom: document.createElement("div"),
	} as unknown as EditorView;

	// Create chainable command mock
	interface ChainableMock {
		focus: ReturnType<typeof vi.fn>;
		setMark: ReturnType<typeof vi.fn>;
		unsetMark: ReturnType<typeof vi.fn>;
		insertContent: ReturnType<typeof vi.fn>;
		setTextSelection: ReturnType<typeof vi.fn>;
		deleteSelection: ReturnType<typeof vi.fn>;
		run: ReturnType<typeof vi.fn>;
	}

	const createChainableMock = (): ChainableMock => {
		const chainMock: ChainableMock = {
			focus: vi.fn(() => chainMock),
			setMark: vi.fn(() => chainMock),
			unsetMark: vi.fn(() => chainMock),
			insertContent: vi.fn(() => chainMock),
			setTextSelection: vi.fn(() => chainMock),
			deleteSelection: vi.fn(() => chainMock),
			run: vi.fn(() => true),
		};
		return chainMock;
	};

	return {
		state: mockState,
		view: mockView,
		chain: vi.fn(() => createChainableMock()),
		commands: {
			insertUnifiedLink: vi.fn(() => true),
			refreshUnifiedLinks: vi.fn(() => true),
			setMark: vi.fn(() => true),
			unsetMark: vi.fn(() => true),
			focus: vi.fn(() => true),
			...options.commands,
		},
		isActive: vi.fn(() => false),
		can: vi.fn(() => ({ run: vi.fn(() => true) })),
		getAttributes: vi.fn(() => ({})),
		isEditable: true,
		isFocused: false,
		isEmpty: mockDoc.childCount === 0,
		destroy: vi.fn(),
		on: vi.fn(),
		off: vi.fn(),
		emit: vi.fn(),
	} as unknown as Editor;
}

/**
 * Create a minimal mock Editor (empty object cast)
 *
 * This is the simplest form of editor mock, equivalent to `{} as Editor`.
 * Use this when you only need to satisfy type requirements and don't
 * actually call any editor methods.
 *
 * @returns A minimal Editor mock
 *
 * @example
 * const editor = createMinimalMockEditor();
 * // Only use when editor methods are not called
 */
export function createMinimalMockEditor(): Editor {
	return {} as Editor;
}

/**
 * Create a mock Editor with a specific document structure
 *
 * @param docContent - The content structure of the document
 * @returns A mock Editor with the specified document
 *
 * @example
 * const editor = createMockEditorWithDoc({
 *   type: 'doc',
 *   content: [
 *     { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }
 *   ]
 * });
 */
export function createMockEditorWithDoc(docContent: ProseMirrorNode): Editor {
	return createMockEditor({
		doc: docContent,
	});
}
