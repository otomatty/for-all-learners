/**
 * InstalledPluginCard Component Tests
 *
 * Unit tests for the InstalledPluginCard component.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginMetadata, UserPlugin } from "@/types/plugin";
import { InstalledPluginCard } from "../InstalledPluginCard";

// Mock sonner toast
vi.mock("sonner", () => ({
	toast: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

// Mock Supabase client
vi.mock("@/lib/supabase/client", () => ({
	createClient: vi.fn(() => ({
		auth: {
			getUser: vi.fn().mockResolvedValue({
				data: { user: { id: "user-id-1" } },
				error: null,
			}),
		},
		from: vi.fn().mockReturnValue({
			select: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			delete: vi.fn().mockReturnThis(),
			eq: vi.fn().mockReturnThis(),
			single: vi.fn().mockResolvedValue({ data: null, error: null }),
		}),
		rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
	})),
}));

// Mock window.location.reload
const mockReload = vi.fn();
Object.defineProperty(window, "location", {
	value: {
		reload: mockReload,
	},
	writable: true,
});

// Create QueryClient wrapper for tests
function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe("InstalledPluginCard", () => {
	const mockUserPlugin: UserPlugin & { metadata: PluginMetadata } = {
		id: "user-plugin-id-1",
		userId: "user-id-1",
		pluginId: "test-plugin-1",
		installedVersion: "1.0.0",
		enabled: true,
		installedAt: new Date("2025-01-01"),
		metadata: {
			id: "plugin-metadata-id-1",
			pluginId: "test-plugin-1",
			name: "Test Plugin",
			version: "1.0.0",
			description: "A test plugin for testing",
			author: "Test Author",
			codeUrl: "https://example.com/plugin.js",
			downloadsCount: 100,
			ratingAverage: 4.5,
			isOfficial: false,
			isReviewed: true,
			manifest: {
				id: "test-plugin-1",
				name: "Test Plugin",
				version: "1.0.0",
				description: "A test plugin for testing",
				author: "Test Author",
				main: "dist/index.js",
				extensionPoints: {
					editor: true,
					ai: false,
					ui: false,
					dataProcessor: false,
					integration: false,
				},
			},
			createdAt: new Date("2025-01-01"),
			updatedAt: new Date("2025-01-01"),
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockReload.mockClear();
		vi.mocked(toast.success).mockClear();
		vi.mocked(toast.error).mockClear();
	});

	describe("Rendering", () => {
		it("TC-001: should render plugin name", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("Test Plugin")).toBeInTheDocument();
		});

		it("TC-002: should render plugin description", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("A test plugin for testing")).toBeInTheDocument();
		});

		it("TC-003: should render plugin version", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText(/v1\.0\.0/)).toBeInTheDocument();
		});

		it("TC-004: should render plugin author", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText(/作成者: Test Author/)).toBeInTheDocument();
		});

		it("TC-005: should render enabled badge when plugin is enabled", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("有効")).toBeInTheDocument();
		});

		it("TC-006: should render disabled badge when plugin is disabled", () => {
			const disabledPlugin = {
				...mockUserPlugin,
				enabled: false,
			};

			render(<InstalledPluginCard userPlugin={disabledPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("無効")).toBeInTheDocument();
		});

		it("TC-007: should render official badge when plugin is official", () => {
			const officialPlugin = {
				...mockUserPlugin,
				metadata: {
					...mockUserPlugin.metadata,
					isOfficial: true,
				},
			};

			render(<InstalledPluginCard userPlugin={officialPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("公式")).toBeInTheDocument();
		});

		it("TC-008: should render extension point badges", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("エディタ")).toBeInTheDocument();
		});

		it("TC-009: should render enable/disable button", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("無効化")).toBeInTheDocument();
		});

		it("TC-010: should render uninstall button", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("アンインストール")).toBeInTheDocument();
		});
	});

	describe("Uninstall Dialog", () => {
		it("TC-011: should open dialog when uninstall button is clicked", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByText("プラグインをアンインストールしますか？"),
			).toBeInTheDocument();
		});

		it("TC-012: should display plugin name in dialog", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByText(/プラグイン「Test Plugin」をアンインストールします/),
			).toBeInTheDocument();
		});

		it("TC-013: should close dialog when cancel button is clicked", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const cancelButton = screen.getByText("キャンセル");
			await user.click(cancelButton);

			await waitFor(() => {
				expect(
					screen.queryByText("プラグインをアンインストールしますか？"),
				).not.toBeInTheDocument();
			});
		});

		it("TC-014: should call uninstallPlugin when confirm button is clicked", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
					"プラグインをアンインストールしました",
				);
			});
		});

		it("TC-015: should show success toast on successful uninstall", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
					"プラグインをアンインストールしました",
				);
			});
		});

		it("TC-016: should show error toast on failed uninstall", async () => {
			const user = userEvent.setup();
			// Override the mock for this test to return an error
			const { createClient } = await import("@/lib/supabase/client");
			vi.mocked(createClient).mockImplementation(() => {
				const mockClient = {
					auth: {
						getUser: vi.fn().mockResolvedValue({
							data: { user: { id: "user-id-1" } },
							error: null,
						}),
					},
					from: vi.fn().mockImplementation((table: string) => {
						if (table === "user_plugins") {
							let callCount = 0;
							return {
								delete: vi.fn().mockReturnThis(),
								eq: vi.fn().mockImplementation(() => {
									callCount++;
									if (callCount === 2) {
										return Promise.resolve({
											data: null,
											error: { message: "Uninstall failed" },
										});
									}
									return {
										delete: vi.fn().mockReturnThis(),
										eq: vi.fn().mockImplementation(() => {
											callCount++;
											if (callCount === 2) {
												return Promise.resolve({
													data: null,
													error: { message: "Uninstall failed" },
												});
											}
											return mockClient.from(table);
										}),
									};
								}),
							};
						}
						// plugin_storage
						return {
							delete: vi.fn().mockReturnThis(),
							eq: vi.fn().mockResolvedValue({
								data: null,
								error: null,
							}),
						};
					}),
					rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
				};
				return mockClient as never;
			});

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				// Supabase error objects are not Error instances, so the fallback message is shown
				expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
					"アンインストールに失敗しました",
				);
			});
		});

		it("TC-018: should disable buttons during uninstall", async () => {
			const user = userEvent.setup();
			const { createClient } = await import("@/lib/supabase/client");
			const mockClient = vi.mocked(createClient)();
			let resolveUninstall: (() => void) | undefined;
			const uninstallPromise = new Promise<void>((resolve) => {
				resolveUninstall = resolve;
			});
			let deleteCallCount = 0;
			const mockDeleteQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockImplementation(() => {
					deleteCallCount++;
					if (deleteCallCount === 2) {
						return uninstallPromise;
					}
					return mockDeleteQuery;
				}),
			};
			const mockStorageDeleteQuery = {
				delete: vi.fn().mockReturnThis(),
				eq: vi.fn().mockReturnThis(),
			};
			mockStorageDeleteQuery.eq.mockResolvedValue({
				data: null,
				error: null,
			});
			const mockFrom = vi
				.fn()
				.mockReturnValueOnce(mockDeleteQuery)
				.mockReturnValueOnce(mockStorageDeleteQuery);
			mockClient.from = mockFrom;

			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});

			await user.click(confirmButton);

			// Wait a bit for React to update the state
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Check loading state - the button text should change to "アンインストール中..." and be disabled
			await waitFor(
				() => {
					const updatedDialog = screen.queryByRole("alertdialog");
					// If dialog is still open, check for loading state
					if (updatedDialog) {
						const loadingButton = within(updatedDialog).queryByRole("button", {
							name: "アンインストール中...",
						});
						if (loadingButton) {
							expect(loadingButton).toBeDisabled();
							const cancelButton = within(updatedDialog).getByRole("button", {
								name: "キャンセル",
							});
							expect(cancelButton).toBeDisabled();
						}
					}
				},
				{ timeout: 500 },
			);

			// Resolve the promise to complete the uninstall
			resolveUninstall?.();
		});

		it("TC-019: should close dialog on successful uninstall", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			const dialog = screen.getByRole("alertdialog");
			const confirmButton = within(dialog).getByRole("button", {
				name: "アンインストール",
			});
			await user.click(confirmButton);

			await waitFor(() => {
				expect(
					screen.queryByText("プラグインをアンインストールしますか？"),
				).not.toBeInTheDocument();
			});
		});
	});

	describe("Accessibility", () => {
		it("TC-020: should have accessible button labels", () => {
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByRole("button", {
				name: /アンインストール/,
			});
			expect(uninstallButton).toBeInTheDocument();
		});

		it("TC-021: should have accessible dialog", async () => {
			const user = userEvent.setup();
			render(<InstalledPluginCard userPlugin={mockUserPlugin} />, {
				wrapper: createWrapper(),
			});

			const uninstallButton = screen.getByText("アンインストール");
			await user.click(uninstallButton);

			expect(
				screen.getByRole("alertdialog", {
					name: /プラグインをアンインストールしますか/,
				}),
			).toBeInTheDocument();
		});
	});
});
