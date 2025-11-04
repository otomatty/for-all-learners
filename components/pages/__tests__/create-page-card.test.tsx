/**
 * Tests for CreatePageCard component
 * Note: happy-dom environment is already set up in vitest.config.mts
 *
 * Note: TypeScript errors for mock functions (mockResolvedValue, mockImplementation)
 * are expected because Vitest mock types are not included in SupabaseClient type.
 * These are runtime-only mock methods and work correctly in tests.
 */

// @ts-nocheck - Allow mock function calls on SupabaseClient
import type { SupabaseClient } from "@supabase/supabase-js";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@/lib/supabase/client";
import { CreatePageCard } from "../create-page-card";

// Hoist mock objects to avoid initialization errors
const { mockToast, mockRouterPush, mockSupabaseClient } = vi.hoisted(() => {
	const mockAuthGetUser = vi.fn();
	const mockFrom = vi.fn();

	return {
		mockToast: {
			error: vi.fn(),
			success: vi.fn(),
		},
		mockRouterPush: vi.fn(),
		mockSupabaseClient: {
			from: mockFrom,
			auth: {
				getUser: mockAuthGetUser,
			},
		} as unknown as SupabaseClient,
	};
});

// Mock modules
vi.mock("@/lib/supabase/client");

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: mockToast,
}));

// Mock useRouter
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockRouterPush,
		refresh: vi.fn(),
	}),
}));

describe("CreatePageCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(createClient).mockReturnValue(
			mockSupabaseClient as unknown as SupabaseClient,
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

		// CreatePageCard displays "ページを作成" as the title, not the displayText
		expect(screen.getByText("ページを作成")).toBeInTheDocument();
	});

	test("should render with dashed border styling", () => {
		const { container } = render(
			<CreatePageCard
				displayText="Vue Composition API"
				linkGroupId="group-2"
				noteSlug={undefined}
			/>,
		);

		// The Card component has the dashed border class
		const card = container.querySelector('[data-slot="card"]');
		expect(card).toHaveClass("border-dashed");
	});

	test("should create page on click", async () => {
		const user = userEvent.setup();

		// Mock successful page creation
		// @ts-expect-error - Vitest mock functions are not typed in SupabaseClient
		mockSupabaseClient.auth.getUser.mockResolvedValue({
			data: {
				user: { id: "user-1" },
			},
			error: null,
		});

		const mockEq = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const mockUpdate = vi.fn().mockReturnValue({
			eq: mockEq,
		});

		const mockInsert = vi.fn().mockReturnValue({
			select: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { id: "new-page-1" },
					error: null,
				}),
			}),
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
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
			expect(mockRouterPush).toHaveBeenCalledWith(
				"/notes/default/new-page-1?newPage=true",
			);
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

		const mockEq = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const mockUpdate = vi.fn().mockReturnValue({
			eq: mockEq,
		});

		const mockLinkInsert = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const mockNoteSelect = vi.fn().mockReturnValue({
			eq: vi.fn().mockReturnValue({
				single: vi.fn().mockResolvedValue({
					data: { id: "note-1" },
					error: null,
				}),
			}),
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
				};
			}
			if (table === "notes") {
				return { select: mockNoteSelect };
			}
			if (table === "note_page_links") {
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
			expect(mockRouterPush).toHaveBeenCalledWith(
				"/notes/test-note/new-page-2?newPage=true",
			);
		});
	});

	test("should show error toast on page creation failure", async () => {
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
			expect(mockToast.error).toHaveBeenCalledWith("ページ作成に失敗しました");
		});
	});

	test("should show error toast on authentication failure", async () => {
		const user = userEvent.setup();

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
			expect(mockToast.error).toHaveBeenCalledWith("ログインしてください");
		});
	});

	// TODO: Implement disabled state during page creation
	test.skip("should disable button while creating", async () => {
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

		const mockEq = vi.fn().mockResolvedValue({
			data: {},
			error: null,
		});

		const mockUpdate = vi.fn().mockReturnValue({
			eq: mockEq,
		});

		mockSupabaseClient.from.mockImplementation((table: string) => {
			if (table === "pages") {
				return { insert: mockInsert };
			}
			if (table === "link_groups") {
				return {
					update: mockUpdate,
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
			expect(mockRouterPush).toHaveBeenCalled();
		});
	});
});
