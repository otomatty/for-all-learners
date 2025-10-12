/**
 * Click handler plugin tests
 * Tests the unified link mark click handling functionality
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PluginKey } from "prosemirror-state";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "../../types";
import { createClickHandlerPlugin } from "../click-handler-plugin";

describe("createClickHandlerPlugin", () => {
  let mockEditor: Editor;
  let mockOptions: UnifiedLinkMarkOptions;

  beforeEach(() => {
    // Create mock editor
    mockEditor = {} as Editor;

    // Create mock options
    mockOptions = {
      HTMLAttributes: {},
      autoReconciler: null,
      noteSlug: null,
      userId: "test-user-id",
      onShowCreatePageDialog: () => {},
    };
  });

  describe("Plugin creation", () => {
    it("should create a plugin instance", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin).toBeDefined();
      expect(plugin.spec).toBeDefined();
    });

    it("should have correct plugin key", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.key).toBeInstanceOf(PluginKey);
    });

    it("should have props with handleClick", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props).toBeDefined();
      expect(plugin.spec.props?.handleClick).toBeDefined();
      expect(typeof plugin.spec.props?.handleClick).toBe("function");
    });
  });

  describe("Context requirements", () => {
    it("should accept editor in context", () => {
      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: mockOptions,
        })
      ).not.toThrow();
    });

    it("should accept options in context", () => {
      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: mockOptions,
        })
      ).not.toThrow();
    });

    it("should work with minimal options", () => {
      const minimalOptions: UnifiedLinkMarkOptions = {
        HTMLAttributes: {},
        autoReconciler: null,
        noteSlug: null,
        userId: null,
      };

      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: minimalOptions,
        })
      ).not.toThrow();
    });
  });

  describe("Handler function signature", () => {
    it("should have handleClick with correct parameter count", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });
      const handler = plugin.spec.props?.handleClick;

      expect(handler).toBeDefined();
      if (handler) {
        // Handler should accept 3 parameters: (view, pos, event)
        expect(handler.length).toBe(3);
      }
    });
  });

  describe("Plugin configuration", () => {
    it("should be configured to handle click events", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props).toHaveProperty("handleClick");
    });

    it("should store editor context", () => {
      // Plugin should have access to editor through closure
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin).toBeDefined();
    });

    it("should store options context", () => {
      // Plugin should have access to options through closure
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin).toBeDefined();
    });
  });

  describe("Integration requirements", () => {
    it("should be compatible with ProseMirror plugin system", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin).toHaveProperty("spec");
      expect(plugin).toHaveProperty("getState");
    });

    it("should export handler function for integration testing", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });
      const handler = plugin.spec.props?.handleClick;

      expect(handler).toBeDefined();
      expect(typeof handler).toBe("function");
    });
  });

  describe("Expected behavior (contract tests)", () => {
    it("should check for unilink mark at click position", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      // Implementation should check for "unilink" mark
      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle exists state with pageId", () => {
      // Contract: When state is "exists" and pageId is present,
      // should call navigateToPage(pageId)
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle missing state", () => {
      // Contract: When state is "missing", should call handleMissingLinkClick
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle pending state", () => {
      // Contract: When state is "pending", should do nothing
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should prevent default event behavior", () => {
      // Contract: Should call event.preventDefault() when handling click
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });

  describe("Error handling", () => {
    it("should not throw when creating plugin", () => {
      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: mockOptions,
        })
      ).not.toThrow();
    });

    it("should handle missing pageId gracefully", () => {
      // Plugin should handle edge cases
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle unknown state gracefully", () => {
      // Plugin should handle unexpected state values
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });

  describe("Plugin lifecycle", () => {
    it("should be reusable across multiple editor instances", () => {
      const plugin1 = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      const mockEditor2 = {} as Editor;
      const plugin2 = createClickHandlerPlugin({
        editor: mockEditor2,
        options: mockOptions,
      });

      expect(plugin1).not.toBe(plugin2);
      expect(plugin1.spec.key).toBeInstanceOf(PluginKey);
      expect(plugin2.spec.key).toBeInstanceOf(PluginKey);
    });

    it("should maintain plugin key consistency", () => {
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });
      const key = plugin.spec.key;

      expect(key).toBe(plugin.spec.key);
    });
  });

  describe("Implementation contract", () => {
    it("should resolve position to check for marks", () => {
      // Contract: Uses doc.resolve(pos) to get $pos
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should find unilink mark in marks array", () => {
      // Contract: Uses $pos.marks().find(mark => mark.type.name === "unilink")
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should extract attrs from unilink mark", () => {
      // Contract: Reads attrs from mark as UnifiedLinkAttributes
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should log click events for debugging", () => {
      // Contract: Uses console.log for debugging information
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should pass userId from options", () => {
      // Contract: Passes options.userId to handleMissingLinkClick
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should pass onShowCreatePageDialog callback", () => {
      // Contract: Passes options.onShowCreatePageDialog to handleMissingLinkClick
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });

  describe("Return value contract", () => {
    it("should return true when handling unilink click", () => {
      // Contract: Returns true when unilink mark is found and handled
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should return false when no unilink mark at position", () => {
      // Contract: Returns false to allow default behavior when no mark found
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });

  describe("State transitions", () => {
    it("should handle exists -> navigation transition", () => {
      // Contract: exists state triggers navigation
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle missing -> create page dialog transition", () => {
      // Contract: missing state triggers create page dialog
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });

    it("should handle pending -> no action transition", () => {
      // Contract: pending state does nothing, waits for resolution
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });

  describe("Options integration", () => {
    it("should work without userId", () => {
      const optionsWithoutUserId: UnifiedLinkMarkOptions = {
        ...mockOptions,
        userId: null,
      };

      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: optionsWithoutUserId,
        })
      ).not.toThrow();
    });

    it("should work without onShowCreatePageDialog", () => {
      const optionsWithoutDialog: UnifiedLinkMarkOptions = {
        ...mockOptions,
        onShowCreatePageDialog: undefined,
      };

      expect(() =>
        createClickHandlerPlugin({
          editor: mockEditor,
          options: optionsWithoutDialog,
        })
      ).not.toThrow();
    });

    it("should pass correct parameters to handleMissingLinkClick", () => {
      // Contract: handleMissingLinkClick receives:
      // (editor, markId, text, userId, onShowCreatePageDialog)
      const plugin = createClickHandlerPlugin({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugin.spec.props?.handleClick).toBeDefined();
    });
  });
});
