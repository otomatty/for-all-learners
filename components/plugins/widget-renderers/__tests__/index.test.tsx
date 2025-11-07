/**
 * Widget Renderer Index Tests
 *
 * Tests for the main WidgetRenderer component that routes to specific renderers.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WidgetRenderer } from "../index";

describe("WidgetRenderer", () => {
	it("should render StatCard for stat-card type", () => {
		render(
			<WidgetRenderer type="stat-card" props={{ title: "Test", value: 100 }} />,
		);

		expect(screen.getByText("Test")).toBeInTheDocument();
		expect(screen.getByText("100")).toBeInTheDocument();
	});

	it("should render Metric for metric type", () => {
		render(
			<WidgetRenderer type="metric" props={{ label: "Users", value: 50 }} />,
		);

		expect(screen.getByText("Users")).toBeInTheDocument();
		expect(screen.getByText("50")).toBeInTheDocument();
	});

	it("should render List for list type", () => {
		render(
			<WidgetRenderer
				type="list"
				props={{ items: [{ label: "Item 1" }, { label: "Item 2" }] }}
			/>,
		);

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
	});

	it("should render Text for text type", () => {
		render(<WidgetRenderer type="text" props={{ content: "Hello, World!" }} />);

		expect(screen.getByText("Hello, World!")).toBeInTheDocument();
	});

	it("should render custom fallback for unknown type", () => {
		render(
			<WidgetRenderer
				type="custom"
				props={{ key1: "value1", key2: "value2" }}
			/>,
		);

		expect(screen.getByText("key1:")).toBeInTheDocument();
		expect(screen.getByText("value1")).toBeInTheDocument();
		expect(screen.getByText("key2:")).toBeInTheDocument();
		expect(screen.getByText("value2")).toBeInTheDocument();
	});

	it("should render custom fallback when no props provided", () => {
		const { container } = render(
			<WidgetRenderer type="custom" props={undefined} />,
		);

		expect(container.querySelector(".widget-content")).toBeInTheDocument();
	});
});
