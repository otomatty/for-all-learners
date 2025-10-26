/**
 * Tests for CreatePageCard component
 * @vitest-environment jsdom
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { CreatePageCard } from "../create-page-card";

// Mock modules
vi.mock("@/lib/supabase/client");
vi.mock("next/navigation");
vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

const mockSupabaseClient = {
	from: vi.fn(),
	auth: {
		getUser: vi.fn(),
	},
};

const mockRouter = {
	push: vi.fn(),
	refresh: vi.fn(),
};

describe("CreatePageCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as SupabaseClient,
		);
		vi.mocked(useRouter).mockReturnValue(
			mockRouter as unknown as AppRouterInstance,
		);
	});

	test("should render create button with link text", () => {
		render(
			<CreatePageCard
				displayText="React Hooks"
				linkGroupId="group-1"
				noteSlug={undefined}
			/>,
		);

		expect(screen.getByText("React Hooks")).toBeInTheDocument();
		expect(screen.getByText("新規ページを作成")).toBeInTheDocument();
	});

	test("should render with dashed border styling", () => {
		const { container } = render(
			<CreatePageCard
				displayText="Vue Composition API"
				linkGroupId="group-2"
				noteSlug={undefined}
			/>,
		);

		const button = container.querySelector("button");
		expect(button).toHaveClass("border-dashed");
	});

	test("should create page on click", async () => {
		const user = userEvent.setup();

		// Mock successful page creation
		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: { id: "user-1" },
			},
			error: null,
		});

		const mockInsert = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { id: "new-page-1" },
					error: null,
				}),
			}),
		});

		const mockUpdate = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
					eq: vi.fn().mockReturnThis(),
				};
			}
			return {};
		});

		render(
			<CreatePageCard
				displayText="TypeScript"
				linkGroupId="group-3"
				noteSlug={undefined}
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		await waitFor(() => {
			expect(mockRouter.push).toHaveBeenCalledWith("/pages/new-page-1");
		});
	});

	test("should link to note if noteSlug is provided", async () => {
		const user = userEvent.setup();

		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: { id: "user-1" },
			},
			error: null,
		});

		const mockInsert = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { id: "new-page-2" },
					error: null,
				}),
			}),
		});

		const mockUpdate = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const mockLinkInsert = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
					eq: vi.fn().mockReturnThis(),
				};
			}
			if (table === "page_note_links") {
				return { insert: mockLinkInsert };
			}
			return {};
		});

		render(
			<CreatePageCard
				displayText="Angular"
				linkGroupId="group-4"
				noteSlug="test-note"
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		await waitFor(() => {
			expect(mockLinkInsert).toHaveBeenCalled();
			expect(mockRouter.push).toHaveBeenCalledWith("/pages/new-page-2");
		});
	});

	test("should show error toast on page creation failure", async () => {
		const user = userEvent.setup();
		const { toast } = await import("sonner");

		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: { id: "user-1" },
			},
			error: null,
		});

		const mockInsert = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: null,
					error: new Error("Failed to create page"),
				}),
			}),
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			return {};
		});

		render(
			<CreatePageCard
				displayText="Svelte"
				linkGroupId="group-5"
				noteSlug={undefined}
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("ページの作成に失敗しました");
		});
	});

	test("should show error toast on authentication failure", async () => {
		const user = userEvent.setup();
		const { toast } = await import("sonner");

		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: null,
			},
			error: new Error("Not authenticated"),
		});

		render(
			<CreatePageCard
				displayText="Solid.js"
				linkGroupId="group-6"
				noteSlug={undefined}
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		await waitFor(() => {
			expect(toast.error).toHaveBeenCalledWith("ページの作成に失敗しました");
		});
	});

	test("should disable button while creating", async () => {
		const user = userEvent.setup();

		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: { id: "user-1" },
			},
			error: null,
		});

		// Simulate slow page creation
		const mockInsert = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockImplementation(
					() =>
						new Promise((resolve) => {
							setTimeout(() => {
								resolve({
									data: { id: "new-page-7" },
									error: null,
								});
							}, 100);
						}),
				),
			}),
		});

		const mockUpdate = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
					eq: vi.fn().mockReturnThis(),
				};
			}
			return {};
		});

		render(
			<CreatePageCard
				displayText="Qwik"
				linkGroupId="group-7"
				noteSlug={undefined}
			/>,
		);

		const button = screen.getByRole("button");
		await user.click(button);

		// Button should be disabled immediately after click
		expect(button).toBeDisabled();

		await waitFor(() => {
			expect(mockRouter.push).toHaveBeenCalled();
		});
	});
});
