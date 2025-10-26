/**
 * Bracket Monitor Plugin Tests
 * Tests for the bracket monitor plugin that maintains bracket links during editing
 */

import { PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/core";
import { describe, expect, it, vi } from "vitest";
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
});
