/**
 * Plugins index tests
 */

import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "prosemirror-state";
import { beforeEach, describe, expect, it } from "vitest";
import {
	createMinimalMockEditor,
	createMockOptions,
} from "@/lib/__tests__/helpers";
import type { UnifiedLinkMarkOptions } from "../../types";
import { createPlugins } from "../index";

describe("createPlugins", () => {
	let mockEditor: Editor;
	let mockOptions: UnifiedLinkMarkOptions;

	beforeEach(() => {
		mockEditor = createMinimalMockEditor();
		mockOptions = createMockOptions();
	});

	it("should return exactly 4 plugins", () => {
		const plugins = createPlugins({
			editor: mockEditor,
			options: mockOptions,
		});
		expect(plugins.length).toBe(4);
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

	it("should have auto-bracket first", () => {
		const plugins = createPlugins({
			editor: mockEditor,
			options: mockOptions,
		});
		expect(plugins[0].spec.props?.handleTextInput).toBeDefined();
	});

	it("should have click-handler third", () => {
		const plugins = createPlugins({
			editor: mockEditor,
			options: mockOptions,
		});
		expect(plugins[2].spec.props?.handleClick).toBeDefined();
	});

	it("should have unique plugin keys", () => {
		const plugins = createPlugins({
			editor: mockEditor,
			options: mockOptions,
		});
		const keys = plugins.map((p) => p.spec.key);
		const uniqueKeys = new Set(keys);
		expect(uniqueKeys.size).toBe(plugins.length);
	});
});
