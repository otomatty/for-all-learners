/**
 * Tests for PageCard component
 * Pure UI component testing
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlusCircle } from "lucide-react";
import { describe, expect, test, vi } from "vitest";
import { PageCard } from "./PageCard";

describe("PageCard", () => {
	// TC-001: Basic Rendering
	test("TC-001: renders card with title", () => {
		render(<PageCard title="Test Page" />);

		expect(screen.getByText("Test Page")).toBeInTheDocument();
	});

	// TC-002: Thumbnail Display
	test("TC-002: displays thumbnail image when URL is provided", () => {
		render(
			<PageCard
				title="Test Page"
				thumbnailUrl="https://example.com/image.jpg"
			/>,
		);

		const image = screen.getByAltText("Test Page");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src");
	});

	// TC-003: Content Preview Display
	test("TC-003: displays content preview when no thumbnail", () => {
		render(
			<PageCard title="Test Page" contentPreview="This is preview text" />,
		);

		expect(screen.getByText("This is preview text")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	// TC-004: Link Navigation
	test("TC-004: wraps card in Link when href is provided", () => {
		render(<PageCard title="Test Page" href="/pages/123" />);

		const link = screen.getByRole("link");
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/pages/123");
	});

	// TC-005: Click Handler
	test("TC-005: calls onClick handler when clicked", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(<PageCard title="Test Page" onClick={handleClick} />);

		const button = screen.getByRole("button");
		await user.click(button);

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	// TC-006: Default Variant
	test("TC-006: applies default variant styling", () => {
		const { container } = render(
			<PageCard title="Test Page" variant="default" />,
		);

		const card = container.querySelector(".h-full");
		expect(card).toBeInTheDocument();
		expect(card).not.toHaveClass("ring-2");
		expect(card).not.toHaveClass("border-dashed");
	});

	// TC-007: Highlighted Variant
	test("TC-007: applies highlighted variant styling", () => {
		const { container } = render(
			<PageCard title="Test Page" variant="highlighted" />,
		);

		const card = container.querySelector(".ring-2");
		expect(card).toBeInTheDocument();
		expect(card).toHaveClass("ring-primary/20");
	});

	// TC-008: Dashed Variant
	test("TC-008: renders dashed variant with icon and centered content", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(
			<PageCard
				title="Create Page"
				variant="dashed"
				icon={<PlusCircle data-testid="plus-icon" />}
				onClick={handleClick}
			/>,
		);

		expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
		expect(screen.getByText("Create Page")).toBeInTheDocument();

		const card = screen.getByRole("button");
		await user.click(card);
		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	// TC-009: Image Security Warning
	test("TC-009: displays security warning for disallowed images", () => {
		render(
			<PageCard
				title="Test Page"
				thumbnailUrl="https://malicious.com/image.jpg"
				isImageAllowed={false}
				showSecurityWarning={true}
			/>,
		);

		expect(
			screen.getByText("この画像のドメインは許可されていません。"),
		).toBeInTheDocument();
		expect(
			screen.getByText("URL: https://malicious.com/image.jpg"),
		).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	// TC-010: Custom Alt Text
	test("TC-010: uses custom alt text for thumbnail", () => {
		render(
			<PageCard
				title="Test Page"
				thumbnailUrl="https://example.com/image.jpg"
				thumbnailAlt="Custom Alt Text"
			/>,
		);

		const image = screen.getByAltText("Custom Alt Text");
		expect(image).toBeInTheDocument();
		expect(screen.queryByAltText("Test Page")).not.toBeInTheDocument();
	});

	// TC-011: Keyboard Accessibility
	test("TC-011: triggers onClick when Enter key is pressed (dashed variant)", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(
			<PageCard
				title="Create Page"
				variant="dashed"
				onClick={handleClick}
				icon={<PlusCircle />}
			/>,
		);

		const card = screen.getByRole("button");
		card.focus();
		await user.keyboard("{Enter}");

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	// TC-012: Custom Children
	test("TC-012: renders custom children content", () => {
		render(
			<PageCard title="Test Page">
				<div data-testid="custom-content">Custom Content</div>
			</PageCard>,
		);

		expect(screen.getByTestId("custom-content")).toBeInTheDocument();
		expect(screen.getByText("Custom Content")).toBeInTheDocument();
	});

	// TC-013: Dashed Variant with Link
	test("TC-013: renders dashed variant with link", () => {
		render(
			<PageCard
				title="Create Page"
				variant="dashed"
				href="/notes/default/new"
				icon={<PlusCircle data-testid="plus-icon" />}
			/>,
		);

		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("href", "/notes/default/new");
		expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
	});

	// TC-014: Combined Thumbnail and Preview
	test("TC-014: thumbnail takes precedence over content preview", () => {
		render(
			<PageCard
				title="Test Page"
				thumbnailUrl="https://example.com/image.jpg"
				contentPreview="This should not show"
			/>,
		);

		expect(screen.getByAltText("Test Page")).toBeInTheDocument();
		expect(screen.queryByText("This should not show")).not.toBeInTheDocument();
	});

	// TC-015: Empty Props
	test("TC-015: renders gracefully with minimal props", () => {
		render(<PageCard title="Test Page" />);

		expect(screen.getByText("Test Page")).toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	// Additional: No security warning when showSecurityWarning is false
	test("does not show security warning when showSecurityWarning is false", () => {
		render(
			<PageCard
				title="Test Page"
				thumbnailUrl="https://malicious.com/image.jpg"
				isImageAllowed={false}
				showSecurityWarning={false}
			/>,
		);

		expect(
			screen.queryByText("この画像のドメインは許可されていません。"),
		).not.toBeInTheDocument();
		expect(screen.queryByRole("img")).not.toBeInTheDocument();
	});

	// Additional: Custom className
	test("applies custom className", () => {
		const { container } = render(
			<PageCard title="Test Page" className="custom-class" />,
		);

		const card = container.querySelector(".custom-class");
		expect(card).toBeInTheDocument();
	});

	// Additional: Keyboard accessibility for Space key (dashed variant)
	test("triggers onClick when Space key is pressed (dashed variant)", async () => {
		const handleClick = vi.fn();
		const user = userEvent.setup();

		render(
			<PageCard
				title="Create Page"
				variant="dashed"
				onClick={handleClick}
				icon={<PlusCircle />}
			/>,
		);

		const card = screen.getByRole("button");
		card.focus();
		await user.keyboard(" ");

		expect(handleClick).toHaveBeenCalledTimes(1);
	});

	// Additional: No onClick or href renders static card
	test("renders static card when no onClick or href", () => {
		const { container } = render(<PageCard title="Test Page" />);

		expect(screen.queryByRole("link")).not.toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(container.querySelector(".h-full")).toBeInTheDocument();
	});
});
