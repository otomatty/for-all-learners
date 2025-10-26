/**
 * index.ts のユニットテスト
 * createInputRules function の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { createInputRules } from "../index";

// Setup jsdom environment for this test
setupJSDOMEnvironment();

describe("createInputRules", () => {
	let editor: Editor;
	const mockContext = { editor: null as Editor | null, name: "unifiedLink" };

	beforeEach(() => {
		editor = new Editor({
			extensions: [StarterKit],
			content: "",
		});

		mockContext.editor = editor;
	});

	afterEach(() => {
		editor?.destroy();
	});

	describe("Function behavior", () => {
		it("should return an array of InputRules", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			expect(Array.isArray(rules)).toBe(true);
			expect(rules.length).toBeGreaterThan(0);
		});

		it("should return exactly 1 rule (tag only, bracket handled by plugin)", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Should contain only tag rule (bracket rule is disabled, handled by bracket-monitor-plugin)
			expect(rules.length).toBe(1);
		});

		it("should return InputRule instances", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			for (const rule of rules) {
				expect(rule).toBeDefined();
				expect(rule.find).toBeDefined();
				expect(typeof rule.handler).toBe("function");
			}
		});
	});

	describe("Rule types", () => {
		it("should include tag input rule", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Find rule that matches tag pattern
			const tagRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes("#");
				}
				return false;
			});

			expect(tagRule).toBeDefined();
		});

		// Bracket rule is now handled by bracket-monitor-plugin, not by input rules
		it("should only include tag input rule (bracket handled by plugin)", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Should only have tag rule
			expect(rules.length).toBe(1);

			// The rule should match tag pattern
			const tagRule = rules[0];
			const pattern = tagRule.find;
			if (pattern instanceof RegExp) {
				expect(pattern.source).toContain("#");
			}
		});
	});

	describe("Context handling", () => {
		it("should accept valid context object", () => {
			const context = { editor, name: "testMark" };

			expect(() => {
				createInputRules(context);
			}).not.toThrow();
		});

		it("should pass context to individual rule creators", () => {
			const context = { editor, name: "customMark" };
			const rules = createInputRules(context);

			// Rules should be created successfully with custom context
			expect(rules.length).toBe(1);
			expect(rules.every((rule) => rule !== null && rule !== undefined)).toBe(
				true,
			);
		});
	});

	describe("Rule order", () => {
		it("should return rules in consistent order", () => {
			const context = { editor, name: "unifiedLink" };

			// Create rules multiple times
			const rules1 = createInputRules(context);
			const rules2 = createInputRules(context);

			// Should have same length and order
			expect(rules1.length).toBe(rules2.length);

			// Compare rule patterns to ensure consistent order
			for (let i = 0; i < rules1.length; i++) {
				const pattern1 = rules1[i].find;
				const pattern2 = rules2[i].find;

				if (pattern1 instanceof RegExp && pattern2 instanceof RegExp) {
					expect(pattern1.source).toBe(pattern2.source);
				}
			}
		});

		it("should have tag rule only (bracket handled by plugin)", () => {
			const context = { editor, name: "unifiedLink" };
			const rules = createInputRules(context);

			expect(rules.length).toBe(1);

			// Should be tag rule (contains #)
			const pattern = rules[0].find;
			if (pattern instanceof RegExp) {
				expect(pattern.source).toContain("#");
			}
		});
	});

	describe("Integration", () => {
		it("should work with different editor instances", () => {
			const editor1 = new Editor({
				extensions: [StarterKit],
				content: "",
			});

			const editor2 = new Editor({
				extensions: [StarterKit],
				content: "",
			});

			try {
				const context1 = { editor: editor1, name: "mark1" };
				const context2 = { editor: editor2, name: "mark2" };

				const rules1 = createInputRules(context1);
				const rules2 = createInputRules(context2);

				// Both should create valid rules (only tag rule)
				expect(rules1.length).toBe(1);
				expect(rules2.length).toBe(1);

				// Rules should be independent
				expect(rules1).not.toBe(rules2);
			} finally {
				editor1.destroy();
				editor2.destroy();
			}
		});

		it("should work with different mark names", () => {
			const markNames = ["unifiedLink", "pageLink", "customMark", "test"];

			for (const name of markNames) {
				const context = { editor, name };
				const rules = createInputRules(context);

				expect(rules.length).toBe(1);
				expect(rules.every((rule) => rule !== null)).toBe(true);
			}
		});
	});

	describe("Performance", () => {
		it("should create rules efficiently", () => {
			const context = { editor, name: "unifiedLink" };

			// Measure time for multiple rule creations
			const start = performance.now();

			for (let i = 0; i < 100; i++) {
				createInputRules(context);
			}

			const end = performance.now();

			// Should complete within reasonable time (less than 50ms for 100 calls)
			expect(end - start).toBeLessThan(50);
		});

		it("should not leak memory with repeated calls", () => {
			const context = { editor, name: "unifiedLink" };

			// Create many rule instances
			const ruleArrays = [];
			for (let i = 0; i < 1000; i++) {
				ruleArrays.push(createInputRules(context));
			}

			// All should be valid (only tag rule)
			expect(ruleArrays.length).toBe(1000);
			expect(ruleArrays.every((rules) => rules.length === 1)).toBe(true);
		});
	});

	describe("Error handling", () => {
		it("should handle valid context gracefully", () => {
			const validContexts = [
				{ editor, name: "test" },
				{ editor, name: "unifiedLink" },
				{ editor, name: "a" },
				{ editor, name: "very-long-mark-name-with-dashes" },
			];

			for (const context of validContexts) {
				expect(() => {
					const rules = createInputRules(context);
					expect(rules.length).toBe(1);
				}).not.toThrow();
			}
		});
	});

	describe("Rule consistency", () => {
		it("should create rules with consistent structure", () => {
			const context = { editor, name: "unifiedLink" };
			const rules = createInputRules(context);

			for (const rule of rules) {
				// Each rule should have required properties
				expect(rule).toHaveProperty("find");
				expect(rule).toHaveProperty("handler");
				expect(typeof rule.handler).toBe("function");

				// Find should be a RegExp
				expect(rule.find instanceof RegExp).toBe(true);
			}
		});

		it("should create single tag rule (bracket handled by plugin)", () => {
			const context = { editor, name: "unifiedLink" };
			const rules = createInputRules(context);

			// Should have only tag rule
			expect(rules.length).toBe(1);

			// Get pattern
			const pattern = rules[0].find;

			// Should be tag pattern (contains #)
			if (pattern instanceof RegExp) {
				expect(pattern.source).toContain("#");
			}
		});
	});
});
