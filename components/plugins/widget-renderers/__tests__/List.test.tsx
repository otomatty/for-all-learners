/**
 * List Widget Component Tests
 *
 * Tests for the List widget renderer component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { List } from "../List";

describe("List", () => {
	it("should render unordered list by default", () => {
		render(
			<List
				items={[
					{ label: "Item 1", value: 10 },
					{ label: "Item 2", value: 20 },
				]}
			/>,
		);

		const list = screen.getByRole("list");
		expect(list.tagName).toBe("UL");
		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
	});

	it("should render ordered list when ordered is true", () => {
		render(
			<List
				items={[
					{ label: "Item 1", value: 10 },
					{ label: "Item 2", value: 20 },
				]}
				ordered={true}
			/>,
		);

		const list = screen.getByRole("list");
		expect(list.tagName).toBe("OL");
	});

	it("should render items with values", () => {
		render(
			<List
				items={[
					{ label: "Item 1", value: 10 },
					{ label: "Item 2", value: 20 },
				]}
			/>,
		);

		expect(screen.getByText("10")).toBeInTheDocument();
		expect(screen.getByText("20")).toBeInTheDocument();
	});

	it("should render items with icons", () => {
		render(
			<List
				items={[
					{ label: "Item 1", icon: "✅" },
					{ label: "Item 2", icon: "❌" },
				]}
			/>,
		);

		expect(screen.getByText("✅")).toBeInTheDocument();
		expect(screen.getByText("❌")).toBeInTheDocument();
	});

	it("should render items without values", () => {
		render(<List items={[{ label: "Item 1" }, { label: "Item 2" }]} />);

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
	});

	it("should return null when items array is empty", () => {
		const { container } = render(<List items={[]} />);

		expect(container.firstChild).toBeNull();
	});

	it("should return null when items is not an array", () => {
		// @ts-expect-error - Testing invalid input
		const { container } = render(<List items={null} />);

		expect(container.firstChild).toBeNull();
	});
});
