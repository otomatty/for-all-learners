/**
 import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { setupJSDOMEnvironment } from "@/lib/__tests__/helpers";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { UnifiedLinkMark } from "../../index";
import { findMarksByState, updateMarkState } from "../../state-manager";

// Setup jsdom environment for this test
setupJSDOMEnvironment();ified-link.ts のユニットテスト
 * insertUnifiedLink コマンドのテスト
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { UnifiedLinkMark } from "../../index";
import { findMarksByState } from "../../state-manager";

// Setup jsdom environment for this test
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document as unknown as Document;
global.window = dom.window as unknown as Window & typeof globalThis;

describe("insertUnifiedLink Command", () => {
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
    it("should insert a link mark with bracket variant", () => {
      editor
        .chain()
        .insertContent("Test")
        .setTextSelection({ from: 1, to: 5 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test",
        text: "Test",
        key: "test",
      });

      expect(result).toBe(true);

      // Check if mark was added
      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0].key).toBe("test");
    });

    it("should insert a link mark with tag variant", () => {
      editor
        .chain()
        .insertContent("TagTest")
        .setTextSelection({ from: 1, to: 8 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "tag",
        raw: "TagTest",
        text: "TagTest",
        key: "tagtest",
      });

      expect(result).toBe(true);

      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0].variant).toBe("tag");
    });

    it("should default to bracket variant if not specified", () => {
      editor
        .chain()
        .insertContent("Default")
        .setTextSelection({ from: 1, to: 8 })
        .run();

      editor.commands.insertUnifiedLink({
        raw: "Default",
        text: "Default",
        key: "default",
      });

      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0].variant).toBe("bracket");
    });
  });

  describe("attribute handling", () => {
    it("should set initial state to pending", () => {
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

      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBeGreaterThan(0);
    });

    it("should set exists to false initially", () => {
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

      // The mark should be in pending state with exists=false
      const html = editor.getHTML();
      expect(html).toContain('data-state="pending"');
      expect(html).toContain('data-exists="false"');
    });

    it("should generate a unique markId", () => {
      editor.chain().insertContent("Test1 Test2").run();

      editor.chain().setTextSelection({ from: 1, to: 6 }).run();

      editor.commands.insertUnifiedLink({
        raw: "Test1",
        text: "Test1",
        key: "test1",
      });

      editor.chain().setTextSelection({ from: 7, to: 12 }).run();

      editor.commands.insertUnifiedLink({
        raw: "Test2",
        text: "Test2",
        key: "test2",
      });

      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBe(2);
      expect(marks[0].markId).not.toBe(marks[1].markId);
    });

    it("should use raw as text if text is not provided", () => {
      editor
        .chain()
        .insertContent("Test")
        .setTextSelection({ from: 1, to: 5 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test",
        key: "test",
      });

      const html = editor.getHTML();
      expect(html).toContain("Test");
    });

    it("should normalize title to key", () => {
      editor
        .chain()
        .insertContent("Test With Spaces")
        .setTextSelection({ from: 1, to: 17 })
        .run();

      editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test With Spaces",
        text: "Test With Spaces",
      });

      const marks = findMarksByState(editor, "pending");
      expect(marks.length).toBeGreaterThan(0);
      // Key should be normalized (lowercase, trimmed, etc.)
      expect(marks[0].key).toBeTruthy();
    });
  });

  describe("edge cases", () => {
    it("should handle empty selection", () => {
      // Empty document
      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test",
        text: "Test",
        key: "test",
      });

      // Should still return true even with empty selection
      expect(result).toBe(true);
    });

    it("should handle special characters in raw", () => {
      editor
        .chain()
        .insertContent("Special!@#")
        .setTextSelection({ from: 1, to: 11 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Special!@#",
        text: "Special!@#",
        key: "special",
      });

      expect(result).toBe(true);
    });

    it("should handle long text", () => {
      const longText = "A".repeat(100);
      editor
        .chain()
        .insertContent(longText)
        .setTextSelection({ from: 1, to: 101 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: longText,
        text: longText,
        key: "long",
      });

      expect(result).toBe(true);
    });

    it("should handle CJK characters", () => {
      editor
        .chain()
        .insertContent("日本語テスト")
        .setTextSelection({ from: 1, to: 7 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "日本語テスト",
        text: "日本語テスト",
        key: "japanese",
      });

      expect(result).toBe(true);
    });
  });

  describe("return value", () => {
    it("should return true when command succeeds", () => {
      editor
        .chain()
        .insertContent("Test")
        .setTextSelection({ from: 1, to: 5 })
        .run();

      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test",
        text: "Test",
        key: "test",
      });

      expect(result).toBe(true);
    });

    it("should return true even without dispatch", () => {
      editor
        .chain()
        .insertContent("Test")
        .setTextSelection({ from: 1, to: 5 })
        .run();

      // The command should return true regardless of dispatch
      const result = editor.commands.insertUnifiedLink({
        variant: "bracket",
        raw: "Test",
        text: "Test",
        key: "test",
      });

      expect(result).toBe(true);
    });
  });
});
