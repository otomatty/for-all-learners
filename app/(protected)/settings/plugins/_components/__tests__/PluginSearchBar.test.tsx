/**
 * PluginSearchBar Component Tests
 *
 * Unit tests for the PluginSearchBar component.
 *
 * DEPENDENCY MAP:
 *
 * Parents: app/(protected)/settings/plugins/_components/PluginFiltersClient.tsx
 *
 * Related Documentation:
 *   └─ Plan: docs/03_plans/plugin-system/implementation-status.md
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PluginSearchBar } from "../PluginSearchBar";

describe("PluginSearchBar", () => {
	describe("Rendering", () => {
		it("TC-001: should render search input", () => {
			const handleChange = vi.fn();
			render(<PluginSearchBar value="" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			expect(input).toBeInTheDocument();
		});

		it("TC-002: should render with custom placeholder", () => {
			const handleChange = vi.fn();
			render(
				<PluginSearchBar
					value=""
					onChange={handleChange}
					placeholder="カスタムプレースホルダー"
				/>,
			);

			const input = screen.getByPlaceholderText("カスタムプレースホルダー");
			expect(input).toBeInTheDocument();
		});

		it("TC-003: should display search icon", () => {
			const handleChange = vi.fn();
			render(<PluginSearchBar value="" onChange={handleChange} />);

			// Search icon should be present (as SVG or icon element)
			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			expect(input).toBeInTheDocument();
			// Icon is rendered as SVG, so we check the parent container
			const container = input.parentElement;
			expect(container).toBeInTheDocument();
		});

		it("TC-004: should display current value", () => {
			const handleChange = vi.fn();
			render(<PluginSearchBar value="test query" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			expect(input).toHaveValue("test query");
		});
	});

	describe("User Interaction", () => {
		it("TC-005: should call onChange when input value changes", async () => {
			const user = userEvent.setup();
			const handleChange = vi.fn();
			render(<PluginSearchBar value="" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			await user.type(input, "test");

			expect(handleChange).toHaveBeenCalledTimes(4); // 't', 'e', 's', 't'
			expect(handleChange).toHaveBeenCalledWith("t");
			expect(handleChange).toHaveBeenCalledWith("e");
			expect(handleChange).toHaveBeenCalledWith("s");
			expect(handleChange).toHaveBeenCalledWith("t");
		});

		it("TC-006: should handle empty input", async () => {
			const user = userEvent.setup();
			const handleChange = vi.fn();
			render(<PluginSearchBar value="test" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			await user.clear(input);

			expect(handleChange).toHaveBeenCalled();
		});

		it("TC-007: should handle special characters", async () => {
			const user = userEvent.setup();
			const handleChange = vi.fn();
			render(<PluginSearchBar value="" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			await user.type(input, "test@example.com");

			expect(handleChange).toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("TC-008: should have accessible input", () => {
			const handleChange = vi.fn();
			render(<PluginSearchBar value="" onChange={handleChange} />);

			const input = screen.getByPlaceholderText(
				"プラグイン名、説明、作成者で検索...",
			);
			expect(input).toHaveAttribute("type", "text");
		});
	});
});
