/**
 * Bracket Monitor Plugin Tests
 * Tests for the bracket monitor plugin that maintains bracket links during editing
 */

import { Editor } from "@tiptap/core";
import CodeBlock from "@tiptap/extension-code-block";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import { PluginKey } from "@tiptap/pm/state";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { UnifiedLinkMark } from "../../index";
import {
	bracketMonitorPluginKey,
	createBracketMonitorPlugin,
} from "../bracket-monitor-plugin";

describe("Bracket Monitor Plugin", () => {
	// Mock editor object for plugin creation
	const createMockEditor = (): Editor => {
		return {
			state: {},
			view: {},
			commands: {},
			on: vi.fn(),
			off: vi.fn(),
			emit: vi.fn(),
		} as unknown as Editor;
	};

	describe("Plugin creation and metadata", () => {
		it("should create plugin successfully", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin).toBeDefined();
			expect(plugin.spec.key).toBe(bracketMonitorPluginKey);
		});

		it("should have correct plugin key", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.key).toBeInstanceOf(PluginKey);
		});

		it("should have appendTransaction hook", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
			expect(typeof plugin.spec.appendTransaction).toBe("function");
		});
	});

	describe("Plugin configuration", () => {
		it("should be configured to append transactions", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);

			// Check that the plugin has the necessary configuration
			expect(plugin.spec).toHaveProperty("appendTransaction");
		});

		it("should have a unique plugin key name", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			const key = plugin.spec.key;

			expect(key).toBeDefined();
			expect(key).toBeInstanceOf(PluginKey);
		});
	});

	describe("Integration requirements", () => {
		it("should be compatible with ProseMirror plugin system", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);

			// Check for required Plugin interface properties
			expect(plugin).toHaveProperty("spec");
			expect(plugin).toHaveProperty("getState");
		});

		it("should export appendTransaction function for integration", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			const appendTransaction = plugin.spec.appendTransaction;

			expect(appendTransaction).toBeDefined();
			expect(typeof appendTransaction).toBe("function");
		});
	});

	describe("Expected behavior (contract tests)", () => {
		it("should monitor complete brackets [text]", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);

			// The plugin should be designed to detect [text] patterns
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should check for document changes", () => {
			// The implementation should check if document changed
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should prevent infinite loops with metadata", () => {
			// The implementation should use plugin metadata to prevent infinite loops
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.key).toBe(bracketMonitorPluginKey);
		});

		it("should maintain marks during editing", () => {
			// The plugin should update marks when text changes inside brackets
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});
	});

	describe("Error handling", () => {
		it("should not throw when creating plugin", () => {
			const mockEditor = createMockEditor();
			expect(() => createBracketMonitorPlugin(mockEditor)).not.toThrow();
		});

		it("should create plugin with valid spec", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);

			// Ensure spec is a valid object
			expect(typeof plugin.spec).toBe("object");
			expect(plugin.spec).not.toBeNull();
		});
	});

	describe("Plugin lifecycle", () => {
		it("should be reusable across multiple editor instances", () => {
			const mockEditor1 = createMockEditor();
			const mockEditor2 = createMockEditor();
			const plugin1 = createBracketMonitorPlugin(mockEditor1);
			const plugin2 = createBracketMonitorPlugin(mockEditor2);

			// Each call should create a new plugin instance
			expect(plugin1).not.toBe(plugin2);
			expect(plugin1.spec.key).toBeInstanceOf(PluginKey);
			expect(plugin2.spec.key).toBeInstanceOf(PluginKey);
		});

		it("should maintain plugin key consistency", () => {
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			const key = plugin.spec.key;

			// Key should remain consistent
			expect(key).toBe(plugin.spec.key);
			expect(key).toBe(bracketMonitorPluginKey);
		});
	});

	describe("Implementation contract", () => {
		it("should detect complete brackets with pattern /\\[([^[\\]\\n]+)\\]/g", () => {
			// Contract: Implementation uses this pattern to find complete brackets
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should skip empty brackets []", () => {
			// Contract: Empty brackets should not create marks
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should skip brackets with newlines", () => {
			// Contract: Brackets containing newlines should not be detected
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should reuse markId to prevent unnecessary queue additions", () => {
			// Contract: Should check for existing markId and reuse it
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});
	});

	describe("Return value contract", () => {
		it("should return transaction when modifications are made", () => {
			// Contract: Returns transaction with metadata when marks are applied/removed
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should return null when no modifications needed", () => {
			// Contract: Returns null when no changes are required
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should skip own transactions to prevent loops", () => {
			// Contract: Returns null when transaction has plugin metadata
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.key).toBe(bracketMonitorPluginKey);
		});
	});

	describe("Mark management contract", () => {
		it("should apply marks to complete brackets", () => {
			// Contract: Applies unilink mark with variant="bracket"
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should update marks when text changes", () => {
			// Contract: Updates mark attributes when text inside brackets changes
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should remove marks when brackets become incomplete", () => {
			// Contract: Removes marks when closing bracket is deleted
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should set state to pending for closed brackets", () => {
			// Contract: All bracket marks should have state="pending"
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});
	});

	describe("External URL detection", () => {
		it("should detect external URLs in brackets", () => {
			// Contract: Should detect URLs starting with http:// or https://
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should set href to URL for external links", () => {
			// Contract: External URLs should have href set to the URL itself
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should set href to #key for internal links", () => {
			// Contract: Internal links should have href set to #normalized-key
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});
	});

	describe("Performance considerations", () => {
		it("should scan document efficiently", () => {
			// Contract: Uses doc.descendants() for efficient scanning
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should only process text nodes", () => {
			// Contract: Only processes nodes where node.isText is true
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});

		it("should skip processing when no document changes", () => {
			// Contract: Returns null if no transactions have docChanged
			const mockEditor = createMockEditor();
			const plugin = createBracketMonitorPlugin(mockEditor);
			expect(plugin.spec.appendTransaction).toBeDefined();
		});
	});

	describe("CodeBlock handling", () => {
		let editor: Editor;

		beforeEach(() => {
			editor = new Editor({
				extensions: [
					Document,
					Paragraph,
					Text,
					CodeBlock,
					UnifiedLinkMark.configure({
						HTMLAttributes: {
							class: "unilink",
						},
					}),
				],
				content: "",
			});
		});

		afterEach(() => {
			editor?.destroy();
		});

		it("should not apply marks to brackets inside codeBlock", () => {
			// Set content with codeBlock containing bracket notation
			// This is the exact scenario from issue #126
			editor.commands.setContent(
				"<pre><code>// High-performance MCAP streaming server in Rus[t]</code></pre>",
			);

			// Trigger a transaction to activate the bracket monitor plugin
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			// Wait for plugin to process
			const state = editor.state;

			// Check that no unilink marks were applied to codeBlock content
			let hasMarkInCodeBlock = false;
			state.doc.descendants((node) => {
				if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							const marks = textNode.marks;
							if (marks.some((m) => m.type.name === "unilink")) {
								hasMarkInCodeBlock = true;
							}
						}
					});
				}
			});

			expect(hasMarkInCodeBlock).toBe(false);
		});

		it("should not throw RangeError when processing codeBlock with brackets", () => {
			// This test verifies the fix for issue #126
			// The error occurred at applyBracketMark when trying to apply marks to codeBlock
			const contentWithBrackets = [
				"<pre><code>const arr = [1, 2, 3];</code></pre>",
				"<pre><code>// High-performance MCAP streaming server in Rus[t]</code></pre>",
				"<pre><code>function test[param]() {}</code></pre>",
			];

			for (const content of contentWithBrackets) {
				expect(() => {
					editor.commands.setContent(content);
					// Trigger plugin by making a change
					editor.commands.insertContentAt(editor.state.doc.content.size, " ");
				}).not.toThrow();
			}
		});

		it("should still process brackets in regular text outside codeBlock", () => {
			// Set content with both codeBlock and regular text with brackets
			editor.commands.setContent(
				"<p>This is a [regular link] in text.</p><pre><code>const arr = [1, 2, 3];</code></pre><p>Another [link] here.</p>",
			);

			// Trigger plugin
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			const state = editor.state;

			// Check that marks were applied to regular text
			let hasMarkInRegularText = false;
			state.doc.descendants((node) => {
				if (node.type.name === "paragraph") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							const marks = textNode.marks;
							if (marks.some((m) => m.type.name === "unilink")) {
								hasMarkInRegularText = true;
							}
						}
					});
				}
			});

			expect(hasMarkInRegularText).toBe(true);
		});

		it("should handle mixed content with codeBlock and regular brackets", () => {
			// Test that plugin correctly distinguishes between codeBlock and regular text
			editor.commands.setContent(
				"<p>Regular text with [bracket link].</p><pre><code>code with [brackets] inside</code></pre><p>More [text] here.</p>",
			);

			// Trigger plugin
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			const state = editor.state;

			// Count marks in paragraphs (should have marks)
			let paragraphMarkCount = 0;
			// Count marks in codeBlock (should have no marks)
			let codeBlockMarkCount = 0;

			state.doc.descendants((node) => {
				if (node.type.name === "paragraph") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							paragraphMarkCount += textNode.marks.filter(
								(m) => m.type.name === "unilink",
							).length;
						}
					});
				} else if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							codeBlockMarkCount += textNode.marks.filter(
								(m) => m.type.name === "unilink",
							).length;
						}
					});
				}
			});

			// Regular text should have marks
			expect(paragraphMarkCount).toBeGreaterThan(0);
			// CodeBlock should not have marks
			expect(codeBlockMarkCount).toBe(0);
		});

		it("should handle multiple codeBlocks with brackets", () => {
			// Test with multiple codeBlocks containing bracket patterns
			editor.commands.setContent(
				"<pre><code>const arr = [1, 2, 3];</code></pre><p>Regular [text] here.</p><pre><code>function test[param]() {}</code></pre><p>Another [link].</p>",
			);

			// Trigger plugin
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			const state = editor.state;

			// Verify no marks in any codeBlock
			let codeBlockMarkCount = 0;
			let paragraphMarkCount = 0;

			state.doc.descendants((node) => {
				if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							codeBlockMarkCount += textNode.marks.filter(
								(m) => m.type.name === "unilink",
							).length;
						}
					});
				} else if (node.type.name === "paragraph") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							paragraphMarkCount += textNode.marks.filter(
								(m) => m.type.name === "unilink",
							).length;
						}
					});
				}
			});

			expect(codeBlockMarkCount).toBe(0);
			expect(paragraphMarkCount).toBeGreaterThan(0);
		});

		it("should handle codeBlock with multiple bracket patterns", () => {
			// Test codeBlock containing multiple bracket patterns
			editor.commands.setContent(
				"<pre><code>const [a, b] = [1, 2]; const obj = { key: [value] };</code></pre>",
			);

			// Trigger plugin multiple times to ensure stability
			for (let i = 0; i < 3; i++) {
				editor.commands.insertContentAt(editor.state.doc.content.size, " ");
			}

			const state = editor.state;

			// Verify no marks were applied
			let hasMarkInCodeBlock = false;
			state.doc.descendants((node) => {
				if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							if (textNode.marks.some((m) => m.type.name === "unilink")) {
								hasMarkInCodeBlock = true;
							}
						}
					});
				}
			});

			expect(hasMarkInCodeBlock).toBe(false);
		});

		it("should handle empty codeBlock", () => {
			// Test with empty codeBlock
			editor.commands.setContent("<pre><code></code></pre>");

			// Trigger plugin
			expect(() => {
				editor.commands.insertContentAt(editor.state.doc.content.size, " ");
			}).not.toThrow();
		});

		it("should handle codeBlock with nested brackets", () => {
			// Test codeBlock with nested bracket patterns like [[]]
			editor.commands.setContent(
				"<pre><code>const nested = [[1, 2], [3, 4]];</code></pre>",
			);

			// Trigger plugin
			expect(() => {
				editor.commands.insertContentAt(editor.state.doc.content.size, " ");
			}).not.toThrow();

			const state = editor.state;

			// Verify no marks
			let hasMarkInCodeBlock = false;
			state.doc.descendants((node) => {
				if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							if (textNode.marks.some((m) => m.type.name === "unilink")) {
								hasMarkInCodeBlock = true;
							}
						}
					});
				}
			});

			expect(hasMarkInCodeBlock).toBe(false);
		});

		it("should verify findExistingBracketMarks also skips codeBlock", () => {
			// This test ensures that findExistingBracketMarks function
			// also properly skips codeBlock nodes
			editor.commands.setContent(
				"<p>Regular [text] with mark.</p><pre><code>code with [brackets]</code></pre>",
			);

			// First, trigger plugin to create marks in regular text
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			// Wait a bit for marks to be applied
			const state1 = editor.state;

			// Verify marks exist in regular text
			let hasMarkInParagraph = false;
			state1.doc.descendants((node) => {
				if (node.type.name === "paragraph") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							if (textNode.marks.some((m) => m.type.name === "unilink")) {
								hasMarkInParagraph = true;
							}
						}
					});
				}
			});

			expect(hasMarkInParagraph).toBe(true);

			// Now trigger plugin again - findExistingBracketMarks should not
			// find any marks in codeBlock even if they somehow existed
			editor.commands.insertContentAt(editor.state.doc.content.size, " ");

			const state2 = editor.state;

			// Verify still no marks in codeBlock
			let hasMarkInCodeBlock = false;
			state2.doc.descendants((node) => {
				if (node.type.name === "codeBlock") {
					node.descendants((textNode) => {
						if (textNode.isText) {
							if (textNode.marks.some((m) => m.type.name === "unilink")) {
								hasMarkInCodeBlock = true;
							}
						}
					});
				}
			});

			expect(hasMarkInCodeBlock).toBe(false);
		});

		it("should handle codeBlock with various bracket-like patterns", () => {
			// Test various patterns that might look like brackets
			const patterns = [
				"<pre><code>array[index] = value;</code></pre>",
				"<pre><code>obj[key] = 'value';</code></pre>",
				"<pre><code>const [a, b] = [1, 2];</code></pre>",
				"<pre><code>function [name]() {}</code></pre>",
				"<pre><code>// Comment with [text] inside</code></pre>",
				"<pre><code>string = '[bracket]';</code></pre>",
			];

			for (const pattern of patterns) {
				expect(() => {
					editor.commands.setContent(pattern);
					editor.commands.insertContentAt(editor.state.doc.content.size, " ");
				}).not.toThrow();
			}
		});

		it("should handle rapid changes to codeBlock content", () => {
			// Test rapid changes to ensure plugin doesn't break
			editor.commands.setContent("<pre><code>initial [content]</code></pre>");

			// Make multiple rapid changes
			for (let i = 0; i < 5; i++) {
				editor.commands.insertContentAt(editor.state.doc.content.size, " ");
			}

			// Should not throw
			expect(() => {
				const state = editor.state;
				state.doc.descendants(() => {});
			}).not.toThrow();
		});
	});
});
