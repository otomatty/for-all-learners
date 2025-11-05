/**
 * Metric Widget Component Tests
 *
 * Tests for the Metric widget renderer component.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Metric } from "../Metric";

describe("Metric", () => {
	it("should render label and value", () => {
		render(<Metric label="Active Users" value={150} />);

		expect(screen.getByText("Active Users")).toBeInTheDocument();
		expect(screen.getByText("150")).toBeInTheDocument();
	});

	it("should render unit when provided", () => {
		render(<Metric label="Active Users" value={150} unit="users" />);

		expect(screen.getByText("users")).toBeInTheDocument();
	});

	it("should apply default color variant", () => {
		const { container } = render(<Metric label="Active Users" value={150} />);

		const metric = container.querySelector(".text-foreground");
		expect(metric).toBeInTheDocument();
	});

	it("should apply primary color variant", () => {
		const { container } = render(
			<Metric label="Active Users" value={150} color="primary" />,
		);

		const metric = container.querySelector(".text-blue-600");
		expect(metric).toBeInTheDocument();
	});

	it("should apply success color variant", () => {
		const { container } = render(
			<Metric label="Active Users" value={150} color="success" />,
		);

		const metric = container.querySelector(".text-green-600");
		expect(metric).toBeInTheDocument();
	});

	it("should apply warning color variant", () => {
		const { container } = render(
			<Metric label="Active Users" value={150} color="warning" />,
		);

		const metric = container.querySelector(".text-yellow-600");
		expect(metric).toBeInTheDocument();
	});

	it("should apply danger color variant", () => {
		const { container } = render(
			<Metric label="Active Users" value={150} color="danger" />,
		);

		const metric = container.querySelector(".text-red-600");
		expect(metric).toBeInTheDocument();
	});

	it("should render string value", () => {
		render(<Metric label="Status" value="Online" />);

		expect(screen.getByText("Online")).toBeInTheDocument();
	});
});
