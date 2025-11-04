/**
 * state-manager.ts のユニットテスト
 * Mark の状態更新と ID 生成のテスト
 */

import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UnifiedLinkMark } from "../index";
import {
	findMarksByState,
	generateMarkId,
	updateMarkState,
} from "../state-manager";

// Note: happy-dom environment is already set up in vitest.config.mts

describe("UnifiedLinkMark State Manager", () => {
	let editor: Editor;

	beforeEach(() => {
		editor = new Editor({
			extensions: [StarterKit, UnifiedLinkMark],
			content: "",
		});
	});

	afterEach(() => {
		if (editor) {
			editor.destroy();
		}
	});

	describe("generateMarkId", () => {
		it("should generate unique mark IDs", () => {
			const id1 = generateMarkId();
			const id2 = generateMarkId();

			expect(id1).toBeTruthy();
			expect(id2).toBeTruthy();
			expect(id1).not.toBe(id2);
		});

		it("should generate IDs with correct format", () => {
			const id = generateMarkId();

			expect(id).toMatch(/^unilink-[a-z0-9]+-[a-z0-9]+$/);
		});

		it("should generate IDs starting with 'unilink-'", () => {
			const id = generateMarkId();

			expect(id.startsWith("unilink-")).toBe(true);
		});
	});

	describe("updateMarkState", () => {
		it("should update mark state by markId", () => {
			const markId = generateMarkId();

			// Insert a mark with insertUnifiedLink command
			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "bracket",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			// Update the mark state
			updateMarkState(editor, markId, {
				state: "exists",
				exists: true,
				pageId: "page-123",
				href: "/pages/page-123",
			});

			// Check if the mark was updated
			const marks = findMarksByState(editor, "exists");
			expect(marks.length).toBeGreaterThan(0);
			expect(marks.some((m) => m.markId === markId)).toBe(true);
		});

		it("should sync exists flag with state", () => {
			const markId = generateMarkId();

			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "bracket",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			// Update to exists state
			updateMarkState(editor, markId, {
				state: "exists",
			});

			// The exists flag should be true
			const existsMarks = findMarksByState(editor, "exists");
			expect(existsMarks.length).toBeGreaterThan(0);
			expect(existsMarks.some((m) => m.markId === markId)).toBe(true);
		});

		it("should handle non-existent markId gracefully", () => {
			const nonExistentMarkId = "unilink-nonexistent-123";

			// Should not throw error
			expect(() => {
				updateMarkState(editor, nonExistentMarkId, {
					state: "exists",
				});
			}).not.toThrow();
		});
	});

	describe("findMarksByState", () => {
		it("should find marks with pending state", () => {
			const markId = generateMarkId();

			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "bracket",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			const pendingMarks = findMarksByState(editor, "pending");
			expect(pendingMarks.length).toBeGreaterThan(0);
			expect(pendingMarks.some((m) => m.markId === markId)).toBe(true);
		});

		it("should find marks with exists state", () => {
			const markId = generateMarkId();

			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "bracket",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			updateMarkState(editor, markId, {
				state: "exists",
			});

			const existsMarks = findMarksByState(editor, "exists");
			expect(existsMarks.length).toBeGreaterThan(0);
			expect(existsMarks.some((m) => m.markId === markId)).toBe(true);
		});

		it("should find marks with missing state", () => {
			const markId = generateMarkId();

			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "bracket",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			updateMarkState(editor, markId, {
				state: "missing",
			});

			const missingMarks = findMarksByState(editor, "missing");
			expect(missingMarks.length).toBeGreaterThan(0);
			expect(missingMarks.some((m) => m.markId === markId)).toBe(true);
		});

		it("should return empty array when no marks found", () => {
			const marks = findMarksByState(editor, "exists");
			expect(marks).toEqual([]);
		});

		it("should include variant in result", () => {
			const markId = generateMarkId();

			editor
				.chain()
				.insertContent("Test")
				.setTextSelection({ from: 1, to: 5 })
				.run();

			editor.commands.insertUnifiedLink({
				variant: "tag",
				raw: "Test",
				text: "Test",
				key: "test",
				markId,
			});

			const marks = findMarksByState(editor, "pending");
			const mark = marks.find((m) => m.markId === markId);

			expect(mark).toBeTruthy();
			expect(mark?.variant).toBe("tag");
		});
	});
});
