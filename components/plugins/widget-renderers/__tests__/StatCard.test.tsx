/**
 * StatCard Widget Component Tests
 *
 * Tests for the StatCard widget renderer component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatCard } from "../StatCard";

describe("StatCard", () => {
	it("should render title and value", () => {
		render(<StatCard title="Total Commits" value={42} />);

		expect(screen.getByText("Total Commits")).toBeInTheDocument();
		expect(screen.getByText("42")).toBeInTheDocument();
	});

	it("should render description when provided", () => {
		render(
			<StatCard title="Total Commits" value={42} description="This month" />,
		);

		expect(screen.getByText("This month")).toBeInTheDocument();
	});

	it("should render trend with up indicator", () => {
		render(
			<StatCard
				title="Total Commits"
				value={42}
				trend="up"
				trendValue="+12%"
			/>,
		);

		expect(screen.getByText("↑ +12%")).toBeInTheDocument();
	});

	it("should render trend with down indicator", () => {
		render(
			<StatCard
				title="Total Commits"
				value={42}
				trend="down"
				trendValue="-5%"
			/>,
		);

		expect(screen.getByText("↓ -5%")).toBeInTheDocument();
	});

	it("should render trend with neutral indicator", () => {
		render(
			<StatCard
				title="Total Commits"
				value={42}
				trend="neutral"
				trendValue="0%"
			/>,
		);

		expect(screen.getByText("→ 0%")).toBeInTheDocument();
	});

	it("should render icon when provided", () => {
		const { container } = render(
			<StatCard title="Total Commits" value={42} icon="📊" />,
		);

		expect(container.textContent).toContain("📊");
	});

	it("should render string value", () => {
		render(<StatCard title="Status" value="Active" />);

		expect(screen.getByText("Active")).toBeInTheDocument();
	});

	it("should not render trend when trendValue is not provided", () => {
		render(<StatCard title="Total Commits" value={42} trend="up" />);

		expect(screen.queryByText("↑")).not.toBeInTheDocument();
	});
});
