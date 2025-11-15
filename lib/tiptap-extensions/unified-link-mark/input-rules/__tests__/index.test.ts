/**
 * index.ts のユニットテスト
 * createInputRules function の動作をテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInputRules } from "../index";

// Note: happy-dom environment is already set up in vitest.config.mts

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

		it("should return exactly 2 rules (comma-to-bracket and tag, bracket handled by plugin)", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Should contain comma-to-bracket rule and tag rule (bracket rule is disabled, handled by bracket-monitor-plugin)
			expect(rules.length).toBe(2);
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

		it("should include comma-to-bracket input rule", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Find rule that matches comma-to-bracket pattern
			const commaRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes(",,,");
				}
				return false;
			});

			expect(commaRule).toBeDefined();
		});

		// Bracket rule is now handled by bracket-monitor-plugin, not by input rules
		it("should include comma-to-bracket and tag input rules (bracket handled by plugin)", () => {
			const rules = createInputRules(
				mockContext as { editor: Editor; name: string },
			);

			// Should have comma-to-bracket rule and tag rule
			expect(rules.length).toBe(2);

			// Find both rules
			const commaRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes(",,,");
				}
				return false;
			});

			const tagRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes("#");
				}
				return false;
			});

			expect(commaRule).toBeDefined();
			expect(tagRule).toBeDefined();
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
			expect(rules.length).toBe(2);
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

		it("should have comma-to-bracket and tag rules (bracket handled by plugin)", () => {
			const context = { editor, name: "unifiedLink" };
			const rules = createInputRules(context);

			expect(rules.length).toBe(2);

			// Should include both comma-to-bracket rule and tag rule
			const hasCommaRule = rules.some((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes(",,,");
				}
				return false;
			});

			const hasTagRule = rules.some((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes("#");
				}
				return false;
			});

			expect(hasCommaRule).toBe(true);
			expect(hasTagRule).toBe(true);
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

				// Both should create valid rules (comma-to-bracket and tag rules)
				expect(rules1.length).toBe(2);
				expect(rules2.length).toBe(2);

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

				expect(rules.length).toBe(2);
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

			// All should be valid (comma-to-bracket and tag rules)
			expect(ruleArrays.length).toBe(1000);
			expect(ruleArrays.every((rules) => rules.length === 2)).toBe(true);
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
					expect(rules.length).toBe(2);
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

		it("should create comma-to-bracket and tag rules (bracket handled by plugin)", () => {
			const context = { editor, name: "unifiedLink" };
			const rules = createInputRules(context);

			// Should have comma-to-bracket rule and tag rule
			expect(rules.length).toBe(2);

			// Find both rules
			const commaRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes(",,,");
				}
				return false;
			});

			const tagRule = rules.find((rule) => {
				const pattern = rule.find;
				if (pattern instanceof RegExp) {
					return pattern.source.includes("#");
				}
				return false;
			});

			expect(commaRule).toBeDefined();
			expect(tagRule).toBeDefined();
		});
	});
});
