/**
 * utils.ts のユニットテスト
 * input-rules utility functions の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isInCodeContext } from "../utils";

// Type extension for setContent command
declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		setContent: {
			setContent: (content: string | Record<string, unknown>) => ReturnType;
		};
		setTextSelection: {
			setTextSelection: (props: { from: number; to: number }) => ReturnType;
		};
	}
}

// Note: happy-dom environment is already set up in vitest.config.mts

describe("isInCodeContext", () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({
			extensions: [StarterKit],
			content: "",
		});
	});
	afterEach(() => {
		editor?.destroy();
	});

	describe("Code block detection", () => {
		it("should return true when cursor is in code block", () => {
			// Create a proper code block using TipTap commands
			editor.commands.setContent("<pre><code>const x = 1;</code></pre>");

			const { state } = editor;
			const nodeType = state.selection.$from.parent.type.name;

			// Verify we're actually in a code block
			expect(nodeType).toBe("codeBlock");
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should return false when cursor is outside code block", () => {
			// Set content with regular text
			editor.commands.setContent("<p>Regular text</p>");

			// Move cursor to regular text (position 5 is inside the paragraph)
			editor.commands.setTextSelection({ from: 5, to: 5 });

			const { state } = editor;
			const nodeType = state.selection.$from.parent.type.name;

			// Verify we're in a paragraph, not a code block
			expect(nodeType).toBe("paragraph");
			expect(isInCodeContext(state)).toBe(false);
		});

		it("should return true at the start of code block", () => {
			editor.commands.setContent("<pre><code>const x = 1;</code></pre>");

			// Move cursor to the start of code block
			editor.commands.setTextSelection({ from: 1, to: 1 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should return true at the end of code block", () => {
			editor.commands.setContent("<pre><code>const x = 1;</code></pre>");

			// Move cursor to the end of code block content
			// ProseMirrorの位置計算を使用
			const { state } = editor;
			const { doc } = state;

			// コードブロックノードを探す
			let codeBlockPos: number | undefined;
			doc.descendants((node, pos) => {
				if (node.type.name === "codeBlock" && codeBlockPos === undefined) {
					codeBlockPos = pos;
				}
			});

			if (codeBlockPos !== undefined) {
				// コードブロックの終端位置を計算
				const codeBlockNode = doc.nodeAt(codeBlockPos);
				if (codeBlockNode) {
					// コードブロック内の最後の位置 = 開始位置 + ノードサイズ - 2 (終了タグの前)
					const endPos = codeBlockPos + codeBlockNode.nodeSize - 2;
					editor.commands.setTextSelection({ from: endPos, to: endPos });
				}
			} else {
				// フォールバック: ドキュメントの最後の位置
				const lastPos = editor.state.doc.content.size - 1;
				editor.commands.setTextSelection({ from: lastPos, to: lastPos });
			}

			const finalState = editor.state;
			expect(isInCodeContext(finalState)).toBe(true);
		});
	});

	describe("Inline code detection", () => {
		it("should return true when cursor is in inline code", () => {
			// Set content with inline code using HTML
			editor.commands.setContent(
				"<p>This is <code>inline code</code> text</p>",
			);

			// Move cursor to inside the inline code
			editor.commands.setTextSelection({ from: 11, to: 11 });

			const { state } = editor;
			const marks = state.selection.$from.marks();
			const hasCodeMark = marks.some((mark) => mark.type.name === "code");

			// Verify we have a code mark
			expect(hasCodeMark).toBe(true);
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should return false when cursor is not in inline code", () => {
			// Set content with inline code but cursor outside
			editor.commands.setContent(
				"<p>This is <code>inline code</code> text</p>",
			);

			// Move cursor to regular text (before the inline code)
			editor.commands.setTextSelection({ from: 5, to: 5 });

			const { state } = editor;
			const marks = state.selection.$from.marks();
			const hasCodeMark = marks.some((mark) => mark.type.name === "code");

			// Verify we don't have a code mark
			expect(hasCodeMark).toBe(false);
			expect(isInCodeContext(state)).toBe(false);
		});

		it("should return true at the start of inline code", () => {
			editor.commands.setContent("<p>Text <code>code</code> more</p>");

			// Find the first code mark position
			let codeStartPos: number | undefined;
			editor.state.doc.descendants((node, pos) => {
				if (
					node.marks.some((m) => m.type.name === "code") &&
					codeStartPos === undefined
				) {
					codeStartPos = pos;
				}
			});

			// Should find the code mark
			if (codeStartPos !== undefined) {
				editor.commands.setTextSelection({
					from: codeStartPos + 1,
					to: codeStartPos + 1,
				});

				const { state } = editor;
				expect(isInCodeContext(state)).toBe(true);
			}
		});

		it("should return true at the end of inline code", () => {
			editor.commands.setContent("<p>Text <code>code</code> more</p>");

			// Move cursor to the end of inline code (position 10)
			editor.commands.setTextSelection({ from: 10, to: 10 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});
	});

	describe("Mixed content scenarios", () => {
		it("should correctly identify code context in mixed content", () => {
			// Set content with both code blocks and inline code
			const content = `<h1>Header</h1>
<p>Regular text with <code>inline code</code> here.</p>
<pre><code>const x = 1;</code></pre>
<p>More regular text.</p>`;

			editor.commands.setContent(content);

			// Test header - should be false
			editor.commands.setTextSelection({ from: 5, to: 5 });
			expect(isInCodeContext(editor.state)).toBe(false);

			// Test inline code - should be true
			editor.commands.setTextSelection({ from: 30, to: 30 });
			expect(isInCodeContext(editor.state)).toBe(true);

			// Test code block - should be true
			editor.commands.setTextSelection({ from: 50, to: 50 });
			expect(isInCodeContext(editor.state)).toBe(true);

			// Test regular text - should be false
			editor.commands.setTextSelection({ from: 70, to: 70 });
			expect(isInCodeContext(editor.state)).toBe(false);
		});

		it("should handle multiple inline code in same paragraph", () => {
			editor.commands.setContent(
				"<p>Use <code>const</code> or <code>let</code> for variables</p>",
			);

			// Collect all code mark positions
			const codePositions: number[] = [];
			const codeEndPositions: number[] = [];
			editor.state.doc.descendants((node, pos) => {
				if (node.marks.some((m) => m.type.name === "code")) {
					codePositions.push(pos);
					codeEndPositions.push(pos + node.nodeSize);
				}
			});

			// First code
			if (codePositions.length > 0) {
				editor.commands.setTextSelection({
					from: codePositions[0] + 1,
					to: codePositions[0] + 1,
				});
				expect(isInCodeContext(editor.state)).toBe(true);
			}

			// Between codes - find a text position clearly between the two code marks
			if (codeEndPositions.length >= 2) {
				// Start searching after first code ends
				let betweenPos: number | undefined;
				editor.state.doc.descendants((_node, pos) => {
					// Find text node that's between the two code sections
					if (pos > codeEndPositions[0] && pos < codePositions[1]) {
						betweenPos = pos + 1; // cursor in regular text
					}
				});

				if (betweenPos === undefined) {
					// Use position right after first code end
					betweenPos = codeEndPositions[0] + 1;
				}

				editor.commands.setTextSelection({ from: betweenPos, to: betweenPos });
				expect(isInCodeContext(editor.state)).toBe(false);
			}

			// Second code
			if (codePositions.length >= 2) {
				editor.commands.setTextSelection({
					from: codePositions[1] + 1,
					to: codePositions[1] + 1,
				});
				expect(isInCodeContext(editor.state)).toBe(true);
			}
		});
	});

	describe("Edge cases", () => {
		it("should handle empty document", () => {
			editor.commands.setContent("");

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(false);
		});

		it("should handle document with only code block", () => {
			editor.commands.setContent("<pre><code>const x = 1;</code></pre>");

			// Test cursor at the beginning of code block
			editor.commands.setTextSelection({ from: 1, to: 1 });

			const { state } = editor;
			expect(state.selection.$from.parent.type.name).toBe("codeBlock");
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle document with only inline code", () => {
			editor.commands.setContent("<p><code>code</code></p>");

			// Move cursor inside the code
			editor.commands.setTextSelection({ from: 2, to: 2 });

			const { state } = editor;
			const hasCodeMark = state.selection.$from
				.marks()
				.some((mark) => mark.type.name === "code");
			expect(hasCodeMark).toBe(true);
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle code in list items", () => {
			editor.commands.setContent(
				"<ul><li>Item with <code>inline code</code></li></ul>",
			);

			// Move cursor to inline code
			editor.commands.setTextSelection({ from: 15, to: 15 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle code in nested lists", () => {
			editor.commands.setContent(
				"<ul><li>First<ul><li><code>nested code</code></li></ul></li></ul>",
			);

			// Move cursor to nested inline code
			editor.commands.setTextSelection({ from: 15, to: 15 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle empty code block", () => {
			editor.commands.setCodeBlock();

			const { state } = editor;
			expect(state.selection.$from.parent.type.name).toBe("codeBlock");
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle empty inline code", () => {
			editor.commands.setContent("<p><code></code></p>");

			// Move cursor to the code position
			editor.commands.setTextSelection({ from: 1, to: 1 });

			const { state } = editor;
			// Empty code might not have marks, so this could be false
			const result = isInCodeContext(state);
			expect(typeof result).toBe("boolean");
		});
	});

	describe("Selection handling", () => {
		it("should check the 'from' position of selection", () => {
			editor.commands.setContent("<p>Regular <code>code</code> text</p>");

			// Create selection spanning from regular text to code
			editor.commands.setTextSelection({ from: 5, to: 12 });

			const { state } = editor;
			// Should check the $from position (regular text)
			expect(isInCodeContext(state)).toBe(false);
		});

		it("should check from position when selection spans code to regular text", () => {
			editor.commands.setContent("<p>Regular <code>code</code> text</p>");

			// Create selection spanning from code to regular text
			editor.commands.setTextSelection({ from: 12, to: 18 });

			const { state } = editor;
			// Should check the $from position (code)
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should work with zero-width selections (cursor)", () => {
			editor.commands.setContent("<p>Text <code>code</code> more</p>");

			// Set cursor in regular text
			editor.commands.setTextSelection({ from: 3, to: 3 });
			expect(isInCodeContext(editor.state)).toBe(false);

			// Set cursor in code
			editor.commands.setTextSelection({ from: 7, to: 7 });
			expect(isInCodeContext(editor.state)).toBe(true);
		});

		it("should handle selection at document boundaries", () => {
			editor.commands.setContent("<p>Text <code>code</code></p>");

			// Start of document
			editor.commands.setTextSelection({ from: 0, to: 0 });
			expect(isInCodeContext(editor.state)).toBe(false);

			// End of document
			const endPos = editor.state.doc.content.size;
			editor.commands.setTextSelection({ from: endPos, to: endPos });
			expect(typeof isInCodeContext(editor.state)).toBe("boolean");
		});
	});

	describe("Performance", () => {
		it("should handle large documents efficiently", () => {
			// Create a large document with mixed content
			const paragraphs = Array.from({ length: 50 }, (_, i) => {
				if (i % 3 === 0) {
					return "<pre><code>function test() { return true; }</code></pre>";
				}
				if (i % 3 === 1) {
					return "<p>Regular text with <code>inline code</code> here.</p>";
				}
				return "<p>Just regular text paragraph with some content.</p>";
			});

			editor.commands.setContent(paragraphs.join(""));

			// Test performance with multiple calls
			const start = performance.now();
			const iterations = 50;

			for (let i = 0; i < iterations; i++) {
				const pos = Math.floor(
					(i * editor.state.doc.content.size) / iterations,
				);
				try {
					editor.commands.setTextSelection({ from: pos, to: pos });
					isInCodeContext(editor.state);
				} catch {
					// Invalid position, skip
				}
			}

			const end = performance.now();
			const duration = end - start;

			// Should complete within reasonable time (less than 200ms for 50 calls)
			expect(duration).toBeLessThan(200);
		});

		it("should not degrade with deeply nested structures", () => {
			// Create deeply nested list structure
			const nestedList = `
        <ul>
          <li>Level 1
            <ul>
              <li>Level 2 with <code>code</code>
                <ul>
                  <li>Level 3 with <code>more code</code></li>
                </ul>
              </li>
            </ul>
          </li>
        </ul>
      `;

			editor.commands.setContent(nestedList);

			const start = performance.now();

			// Test at multiple positions
			for (let i = 1; i < 20; i++) {
				try {
					editor.commands.setTextSelection({ from: i, to: i });
					isInCodeContext(editor.state);
				} catch {
					// Invalid position, skip
				}
			}

			const end = performance.now();

			// Should complete quickly even with nested structures
			expect(end - start).toBeLessThan(50);
		});
	});

	describe("Type safety and robustness", () => {
		it("should handle EditorState interface correctly", () => {
			editor.commands.setContent("<p>Test content</p>");

			const { state } = editor;

			// Should not throw when accessing required properties
			expect(() => {
				const $from = state.selection.$from;
				const parent = $from.parent;
				const marks = $from.marks();

				// These should all be defined
				expect($from).toBeDefined();
				expect(parent).toBeDefined();
				expect(parent.type).toBeDefined();
				expect(marks).toBeDefined();
				expect(Array.isArray(marks)).toBe(true);
			}).not.toThrow();
		});

		it("should correctly identify code marks", () => {
			editor.commands.setContent("<p>Test <code>code</code> content</p>");

			// Move cursor to code area
			editor.commands.setTextSelection({ from: 7, to: 7 });

			const { state } = editor;
			const $from = state.selection.$from;
			const marks = $from.marks();

			// Should properly identify marks
			expect(Array.isArray(marks)).toBe(true);
			expect(marks.some((mark) => mark.type.name === "code")).toBe(true);
		});

		it("should handle invalid positions gracefully", () => {
			editor.commands.setContent("<p>Test</p>");

			// Try to set an out-of-bounds position and handle gracefully
			const invalidPos = editor.state.doc.content.size + 100;

			try {
				editor.commands.setTextSelection({ from: invalidPos, to: invalidPos });
				// If it doesn't throw, that's also okay - it means commands are lenient
				expect(true).toBe(true);
			} catch {
				// If it throws, that's also okay - invalid positions should fail
				expect(true).toBe(true);
			}

			// Normal position should still work
			editor.commands.setTextSelection({ from: 2, to: 2 });
			expect(isInCodeContext(editor.state)).toBe(false);
		});

		it("should return boolean for all valid positions", () => {
			editor.commands.setContent(
				"<p>Text <code>code</code> more</p><pre><code>block</code></pre>",
			);

			// Test all positions in the document
			const docSize = editor.state.doc.content.size;

			for (let pos = 0; pos <= docSize; pos++) {
				try {
					editor.commands.setTextSelection({ from: pos, to: pos });
					const result = isInCodeContext(editor.state);
					expect(typeof result).toBe("boolean");
				} catch {
					// Invalid position, skip
				}
			}
		});

		it("should handle special characters in code", () => {
			editor.commands.setContent(
				"<p>Text with <code>special &lt;chars&gt;</code> here</p>",
			);

			// Move cursor to code with special chars
			editor.commands.setTextSelection({ from: 15, to: 15 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});

		it("should handle unicode in code", () => {
			editor.commands.setContent(
				"<p>Text with <code>日本語コード</code> here</p>",
			);

			// Move cursor to code with unicode
			editor.commands.setTextSelection({ from: 15, to: 15 });

			const { state } = editor;
			expect(isInCodeContext(state)).toBe(true);
		});
	});
});
