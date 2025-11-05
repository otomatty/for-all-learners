/**
 * Text Widget Component Tests
 *
 * Tests for the Text widget renderer component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "../Text";

describe("Text", () => {
	it("should render text content", () => {
		render(<Text content="Hello, World!" />);

		expect(screen.getByText("Hello, World!")).toBeInTheDocument();
	});

	it("should apply default variant", () => {
		const { container } = render(<Text content="Test" />);

		const text = container.querySelector(".text-foreground");
		expect(text).toBeInTheDocument();
	});

	it("should apply muted variant", () => {
		const { container } = render(<Text content="Test" variant="muted" />);

		const text = container.querySelector(".text-muted-foreground");
		expect(text).toBeInTheDocument();
	});

	it("should apply primary variant", () => {
		const { container } = render(<Text content="Test" variant="primary" />);

		const text = container.querySelector(".text-blue-600");
		expect(text).toBeInTheDocument();
	});

	it("should apply success variant", () => {
		const { container } = render(<Text content="Test" variant="success" />);

		const text = container.querySelector(".text-green-600");
		expect(text).toBeInTheDocument();
	});

	it("should apply warning variant", () => {
		const { container } = render(<Text content="Test" variant="warning" />);

		const text = container.querySelector(".text-yellow-600");
		expect(text).toBeInTheDocument();
	});

	it("should apply danger variant", () => {
		const { container } = render(<Text content="Test" variant="danger" />);

		const text = container.querySelector(".text-red-600");
		expect(text).toBeInTheDocument();
	});

	it("should apply small size", () => {
		const { container } = render(<Text content="Test" size="sm" />);

		const text = container.querySelector(".text-sm");
		expect(text).toBeInTheDocument();
	});

	it("should apply medium size", () => {
		const { container } = render(<Text content="Test" size="md" />);

		const text = container.querySelector(".text-base");
		expect(text).toBeInTheDocument();
	});

	it("should apply large size", () => {
		const { container } = render(<Text content="Test" size="lg" />);

		const text = container.querySelector(".text-lg");
		expect(text).toBeInTheDocument();
	});

	it("should apply left alignment", () => {
		const { container } = render(<Text content="Test" align="left" />);

		const text = container.querySelector(".text-left");
		expect(text).toBeInTheDocument();
	});

	it("should apply center alignment", () => {
		const { container } = render(<Text content="Test" align="center" />);

		const text = container.querySelector(".text-center");
		expect(text).toBeInTheDocument();
	});

	it("should apply right alignment", () => {
		const { container } = render(<Text content="Test" align="right" />);

		const text = container.querySelector(".text-right");
		expect(text).toBeInTheDocument();
	});
});
