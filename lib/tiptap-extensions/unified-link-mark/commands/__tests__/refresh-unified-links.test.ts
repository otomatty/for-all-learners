/**
 * refresh-unified-links.ts のユニットテスト
 * refreshUnifiedLinks コマンドのテスト
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { UnifiedLinkMark } from "../../index";
import { findMarksByState, updateMarkState } from "../../state-manager";

// Setup jsdom environment for this test
setupJSDOMEnvironment();

describe("refreshUnifiedLinks Command", () => {
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

  describe("basic functionality", () => {
    it("should refresh pending links", async () => {
      // Create a pending link
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
      });

      // Verify link is pending
      const pendingBefore = findMarksByState(editor, "pending");
      expect(pendingBefore.length).toBeGreaterThan(0);

      // Refresh links
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);

      // Wait a bit for resolution to potentially complete
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    it("should refresh missing links", async () => {
      // Create a link and mark it as missing
      editor
        .chain()
        .insertContent("Missing")
        .setTextSelection({ from: 1, to: 8 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Missing",
        text: "Missing",
        key: "missing",
      });

      const marks = findMarksByState(editor, "pending");
      const markId = marks[0].markId;

      // Update to missing state
      updateMarkState(editor, markId, {
        state: "missing",
        exists: false,
        href: "#",
      });

      // Verify link is missing
      const missingBefore = findMarksByState(editor, "missing");
      expect(missingBefore.length).toBeGreaterThan(0);

      // Refresh links (should re-queue missing links)
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should refresh error links", async () => {
      // Create a link and mark it as error
      editor
        .chain()
        .insertContent("Error")
        .setTextSelection({ from: 1, to: 6 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Error",
        text: "Error",
        key: "error",
      });

      const marks = findMarksByState(editor, "pending");
      const markId = marks[0].markId;

      // Update to error state
      updateMarkState(editor, markId, {
        state: "error",
      });

      // Verify link is in error state
      const errorBefore = findMarksByState(editor, "error");
      expect(errorBefore.length).toBeGreaterThan(0);

      // Refresh links (should re-queue error links)
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should not refresh exists links", () => {
      // Create a link and mark it as exists
      editor
        .chain()
        .insertContent("Exists")
        .setTextSelection({ from: 1, to: 7 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Exists",
        text: "Exists",
        key: "exists",
      });

      const marks = findMarksByState(editor, "pending");
      const markId = marks[0].markId;

      // Update to exists state
      updateMarkState(editor, markId, {
        state: "exists",
        exists: true,
        pageId: "page-123",
        href: "/pages/page-123",
      });

      // Verify link is exists
      const existsBefore = findMarksByState(editor, "exists");
      expect(existsBefore.length).toBeGreaterThan(0);

      // Refresh links (should not affect exists links)
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);

      // exists links should remain
      const existsAfter = findMarksByState(editor, "exists");
      expect(existsAfter.length).toBe(existsBefore.length);
    });
  });

  describe("multiple links", () => {
    it("should refresh all non-exists links", async () => {
      // Create multiple links with different states
      editor.chain().insertContent("Link1 Link2 Link3 Link4").run();

      // Pending link
      editor.chain().setTextSelection({ from: 1, to: 6 }).run();
      editor.commands.insertUnifiedLink({
        raw: "Link1",
        text: "Link1",
        key: "link1",
      });

      // Missing link
      editor.chain().setTextSelection({ from: 7, to: 12 }).run();
      editor.commands.insertUnifiedLink({
        raw: "Link2",
        text: "Link2",
        key: "link2",
      });
      const marks2 = findMarksByState(editor, "pending");
      const mark2Id = marks2.find((m) => m.key === "link2")?.markId;
      if (mark2Id) {
        updateMarkState(editor, mark2Id, {
          state: "missing",
        });
      }

      // Exists link
      editor.chain().setTextSelection({ from: 13, to: 18 }).run();
      editor.commands.insertUnifiedLink({
        raw: "Link3",
        text: "Link3",
        key: "link3",
      });
      const marks3 = findMarksByState(editor, "pending");
      const mark3Id = marks3.find((m) => m.key === "link3")?.markId;
      if (mark3Id) {
        updateMarkState(editor, mark3Id, {
          state: "exists",
          pageId: "page-123",
        });
      }

      // Error link
      editor.chain().setTextSelection({ from: 19, to: 24 }).run();
      editor.commands.insertUnifiedLink({
        raw: "Link4",
        text: "Link4",
        key: "link4",
      });
      const marks4 = findMarksByState(editor, "pending");
      const mark4Id = marks4.find((m) => m.key === "link4")?.markId;
      if (mark4Id) {
        updateMarkState(editor, mark4Id, {
          state: "error",
        });
      }

      // Refresh all links
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);

      // Wait for resolution
      await new Promise((resolve) => setTimeout(resolve, 100));

      // exists link should remain
      const existsMarks = findMarksByState(editor, "exists");
      expect(existsMarks.length).toBeGreaterThan(0);
    });
  });

  describe("variants", () => {
    it("should handle bracket variant links", () => {
      editor
        .chain()
        .insertContent("Bracket")
        .setTextSelection({ from: 1, to: 8 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Bracket",
        text: "Bracket",
        key: "bracket",
      });

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should handle tag variant links", () => {
      editor
        .chain()
        .insertContent("TagTest")
        .setTextSelection({ from: 1, to: 8 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "tag",
        raw: "TagTest",
        text: "TagTest",
        key: "tagtest",
      });

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should handle mixed variants", () => {
      editor.chain().insertContent("Bracket Tag").run();

      editor.chain().setTextSelection({ from: 1, to: 8 }).run();
      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Bracket",
        text: "Bracket",
        key: "bracket",
      });

      editor.chain().setTextSelection({ from: 9, to: 12 }).run();
      editor.commands.insertUnifiedLink({
        variant: "tag",
        raw: "Tag",
        text: "Tag",
        key: "tag",
      });

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty document", () => {
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should handle document with no links", () => {
      editor.chain().insertContent("Just plain text").run();

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should handle document with only exists links", () => {
      editor
        .chain()
        .insertContent("Exists")
        .setTextSelection({ from: 1, to: 7 })
        .run();

      editor.commands.insertUnifiedLink({
        raw: "Exists",
        text: "Exists",
        key: "exists",
      });

      const marks = findMarksByState(editor, "pending");
      const markId = marks[0].markId;

      updateMarkState(editor, markId, {
        state: "exists",
        pageId: "page-123",
      });

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);

      // Should still have exists link
      const existsMarks = findMarksByState(editor, "exists");
      expect(existsMarks.length).toBe(1);
    });
  });

  describe("return value", () => {
    it("should return true on success", () => {
      editor
        .chain()
        .insertContent("Test")
        .setTextSelection({ from: 1, to: 5 })
        .run();

      editor.commands.insertUnifiedLink({
        raw: "Test",
        text: "Test",
        key: "test",
      });

      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });

    it("should return true even with no links to refresh", () => {
      const result = editor.commands.refreshUnifiedLinks();
      expect(result).toBe(true);
    });
  });
});
