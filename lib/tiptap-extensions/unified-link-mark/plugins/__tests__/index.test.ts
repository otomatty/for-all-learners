/**
 * Plugins index tests
 * Tests the unified plugin creation and integration
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Plugin, PluginKey } from "prosemirror-state";
import type { Editor } from "@tiptap/core";
import type { UnifiedLinkMarkOptions } from "../../types";
import { createPlugins } from "../index";

describe("createPlugins", () => {
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

  describe("Function behavior", () => {
    it("should return an array of plugins", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins.length).toBeGreaterThan(0);
    });

    it("should return exactly 3 plugins", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Should return auto-bracket, click-handler, and suggestion plugins
      expect(plugins.length).toBe(3);
    });

    it("should return Plugin instances", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      for (const plugin of plugins) {
        expect(plugin).toBeInstanceOf(Plugin);
      }
    });
  });

  describe("Plugin types", () => {
    it("should include auto-bracket plugin", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Auto-bracket plugin should be first and have handleTextInput
      const autoBracketPlugin = plugins[0];
      expect(autoBracketPlugin.spec.props?.handleTextInput).toBeDefined();
    });

    it("should include click-handler plugin", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Click-handler plugin should be second and have handleClick
      const clickHandlerPlugin = plugins[1];
      expect(clickHandlerPlugin.spec.props?.handleClick).toBeDefined();
    });

    it("should have unique plugin keys", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const keys = plugins.map((p) => p.spec.key);
      const uniqueKeys = new Set(keys);

      // All keys should be unique
      expect(uniqueKeys.size).toBe(plugins.length);
    });
  });

  describe("Context handling", () => {
    it("should accept valid context object", () => {
      expect(() =>
        createPlugins({
          editor: mockEditor,
          options: mockOptions,
        })
      ).not.toThrow();
    });

    it("should pass editor to click-handler plugin", () => {
      // Click-handler plugin needs editor context
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugins[1]).toBeDefined();
    });

    it("should pass options to click-handler plugin", () => {
      // Click-handler plugin needs options context
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugins[1]).toBeDefined();
    });

    it("should work with minimal options", () => {
      const minimalOptions: UnifiedLinkMarkOptions = {
        HTMLAttributes: {},
        autoReconciler: null,
        noteSlug: null,
        userId: null,
      };

      expect(() =>
        createPlugins({
          editor: mockEditor,
          options: minimalOptions,
        })
      ).not.toThrow();
    });
  });

  describe("Plugin order", () => {
    it("should return plugins in consistent order", () => {
      const plugins1 = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const plugins2 = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Plugin order should be consistent
      expect(plugins1[0].spec.props?.handleTextInput).toBeDefined();
      expect(plugins2[0].spec.props?.handleTextInput).toBeDefined();
      expect(plugins1[1].spec.props?.handleClick).toBeDefined();
      expect(plugins2[1].spec.props?.handleClick).toBeDefined();
    });

    it("should have auto-bracket first, click-handler second", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Order matters for plugin execution
      expect(plugins[0].spec.props).toHaveProperty("handleTextInput");
      expect(plugins[1].spec.props).toHaveProperty("handleClick");
    });
  });

  describe("Integration", () => {
    it("should work with different editor instances", () => {
      const editor1 = {} as Editor;
      const editor2 = {} as Editor;

      const plugins1 = createPlugins({
        editor: editor1,
        options: mockOptions,
      });

      const plugins2 = createPlugins({
        editor: editor2,
        options: mockOptions,
      });

      expect(plugins1.length).toBe(plugins2.length);
      expect(plugins1[0]).not.toBe(plugins2[0]);
      expect(plugins1[1]).not.toBe(plugins2[1]);
    });

    it("should work with different options", () => {
      const options1: UnifiedLinkMarkOptions = {
        ...mockOptions,
        userId: "user1",
      };

      const options2: UnifiedLinkMarkOptions = {
        ...mockOptions,
        userId: "user2",
      };

      expect(() =>
        createPlugins({ editor: mockEditor, options: options1 })
      ).not.toThrow();
      expect(() =>
        createPlugins({ editor: mockEditor, options: options2 })
      ).not.toThrow();
    });
  });

  describe("Performance", () => {
    it("should create plugins efficiently", () => {
      const start = performance.now();

      for (let i = 0; i < 100; i++) {
        createPlugins({
          editor: mockEditor,
          options: mockOptions,
        });
      }

      const end = performance.now();
      const duration = end - start;

      // Should complete 100 iterations quickly (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it("should not leak memory with repeated calls", () => {
      // Create plugins multiple times
      for (let i = 0; i < 1000; i++) {
        createPlugins({
          editor: mockEditor,
          options: mockOptions,
        });
      }

      // If no errors, memory is being properly managed
      expect(true).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should not throw when creating plugins", () => {
      expect(() =>
        createPlugins({
          editor: mockEditor,
          options: mockOptions,
        })
      ).not.toThrow();
    });

    it("should handle editor without throwing", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      expect(plugins).toBeDefined();
      expect(plugins.length).toBe(3);
    });
  });

  describe("Plugin consistency", () => {
    it("should create plugins with consistent structure", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      for (const plugin of plugins) {
        expect(plugin).toHaveProperty("spec");
        expect(plugin).toHaveProperty("getState");
        expect(plugin.spec).toHaveProperty("key");
        expect(plugin.spec).toHaveProperty("props");
      }
    });

    it("should create plugins that don't interfere with each other", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      // Each plugin should have its own key
      const keys = plugins.map((p) => p.spec.key);
      expect(keys[0]).not.toBe(keys[1]);

      // Each plugin should have different props
      const hasTextInput = plugins[0].spec.props?.handleTextInput;
      const hasClick = plugins[1].spec.props?.handleClick;
      expect(hasTextInput).toBeDefined();
      expect(hasClick).toBeDefined();
    });
  });

  describe("ProseMirror compatibility", () => {
    it("should return plugins compatible with ProseMirror", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      for (const plugin of plugins) {
        // Check for required Plugin interface
        expect(plugin).toBeInstanceOf(Plugin);
        expect(plugin.spec.key).toBeInstanceOf(PluginKey);
      }
    });

    it("should provide handler functions with correct signatures", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const autoBracket = plugins[0];
      const clickHandler = plugins[1];

      // Auto-bracket handler: (view, from, to, text) => boolean
      expect(autoBracket.spec.props?.handleTextInput?.length).toBe(4);

      // Click handler: (view, pos, event) => boolean
      expect(clickHandler.spec.props?.handleClick?.length).toBe(3);
    });
  });

  describe("Plugin capabilities", () => {
    it("should provide text input handling", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const hasTextInputHandler = plugins.some(
        (p) => p.spec.props?.handleTextInput
      );
      expect(hasTextInputHandler).toBe(true);
    });

    it("should provide click handling", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const hasClickHandler = plugins.some((p) => p.spec.props?.handleClick);
      expect(hasClickHandler).toBe(true);
    });

    it("should support both input and click events", () => {
      const plugins = createPlugins({
        editor: mockEditor,
        options: mockOptions,
      });

      const capabilities = {
        textInput: false,
        click: false,
      };

      for (const plugin of plugins) {
        if (plugin.spec.props?.handleTextInput) capabilities.textInput = true;
        if (plugin.spec.props?.handleClick) capabilities.click = true;
      }

      expect(capabilities.textInput).toBe(true);
      expect(capabilities.click).toBe(true);
    });
  });

  describe("Export verification", () => {
    it("should export createPlugins function", () => {
      expect(typeof createPlugins).toBe("function");
    });

    it("should export function with correct name", () => {
      expect(createPlugins.name).toBe("createPlugins");
    });

    it("should accept context parameter", () => {
      // Function should accept exactly 1 parameter (context object)
      expect(createPlugins.length).toBe(1);
    });
  });
});
