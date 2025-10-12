/**
 * lifecycle.ts のユニットテスト
 * ライフサイクルハンドラーのテスト
 *
 * Note: lifecycle 関数は実際の Editor と AutoReconciler を使用するため、
 * ここでは関数の基本的な動作のみをテストします。
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
  onCreateHandler,
  onDestroyHandler,
  getAutoReconciler,
} from "../lifecycle";

// Setup jsdom environment for this test
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.document = dom.window.document as unknown as Document;
global.window = dom.window as unknown as Window & typeof globalThis;

describe("UnifiedLinkMark Lifecycle", () => {
  let editor: Editor;

  beforeEach(() => {
    // Clean up any existing AutoReconciler
    onDestroyHandler();

    // Create a minimal editor for testing
    editor = new Editor({
      extensions: [StarterKit],
      content: "",
    });
  });

  afterEach(() => {
    if (editor) {
      editor.destroy();
    }
    // Clean up AutoReconciler after each test
    onDestroyHandler();
  });

  describe("getAutoReconciler", () => {
    it("should return null before initialization", () => {
      const autoReconciler = getAutoReconciler();
      expect(autoReconciler).toBeNull();
    });
  });

  describe("onCreateHandler", () => {
    it("should accept an editor instance without throwing", () => {
      expect(() => {
        onCreateHandler(editor);
      }).not.toThrow();
    });

    it("should handle null editor gracefully", () => {
      expect(() => {
        onCreateHandler(null as unknown as Editor);
      }).not.toThrow();
    });

    it("should handle undefined editor gracefully", () => {
      expect(() => {
        onCreateHandler(undefined as unknown as Editor);
      }).not.toThrow();
    });
  });

  describe("onDestroyHandler", () => {
    it("should not throw when called without initialization", () => {
      expect(() => {
        onDestroyHandler();
      }).not.toThrow();
    });

    it("should handle multiple destroy calls gracefully", () => {
      onCreateHandler(editor);

      // Call destroy multiple times
      expect(() => {
        onDestroyHandler();
        onDestroyHandler();
        onDestroyHandler();
      }).not.toThrow();
    });

    it("should reset AutoReconciler to null after destroy", () => {
      onCreateHandler(editor);
      onDestroyHandler();

      const autoReconciler = getAutoReconciler();
      expect(autoReconciler).toBeNull();
    });
  });

  describe("lifecycle sequence", () => {
    it("should handle create-destroy-create sequence", () => {
      // First initialization
      onCreateHandler(editor);
      onDestroyHandler();

      // Second initialization (should work without errors)
      expect(() => {
        onCreateHandler(editor);
        onDestroyHandler();
      }).not.toThrow();
    });

    it("should maintain consistent state through lifecycle", () => {
      // Initially null
      expect(getAutoReconciler()).toBeNull();

      // After create
      onCreateHandler(editor);
      // Note: AutoReconciler may not be created immediately due to async initialization

      // After destroy
      onDestroyHandler();
      expect(getAutoReconciler()).toBeNull();
    });
  });
});
